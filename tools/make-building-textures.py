"""Cuts the sheet of the sixteen materials of the buildings (four rows of four cells) and makes each of them tile without a seam.

Usage: python3 -I tools/make-building-textures.py <sheet> <output directory>
Writes one JPEG per material, and prints for each how far its opposite edges were from each other before and after (1 = as close as two neighbouring rows).
A material is made to tile by joining, on each axis where its edges do not already meet, its last rows to its first ones: faded into them over a narrow band, or cut along the path where they differ least.
"""
import sys
from pathlib import Path

import numpy
from PIL import Image
from scipy import ndimage

GRID = 4
CELL_PIXELS = 256
NAMES = [
    'wall', 'plaster', 'concrete', 'corrugated',
    'tile', 'olive', 'tan', 'camo',
    'wood', 'steel', 'darkSteel', 'sandbag',
    'crate', 'truck', 'barrel', 'rubber',
]
# The barrel is round, dark at its sides and light in the middle, so it is flattened before it is faded.
FLATTENED = {'barrel'}
FLATTEN_SIGMA_PIXELS = 24
# An axis is only faded if its two edges differ by more than this many times what two neighbouring rows do: those that already meet are left alone.
GAP_LIMIT = 1.5
# How wide the band is where the end of an axis is joined to its start.
# The camouflage is made of flat patches with sharp edges, which a fade turns to mud: its edges are joined along a cut instead, between the patches.
CUT = {'camo'}
OVERLAP_PIXELS = 48
# The barrel is wrapped around a cylinder: its hoops stay where they are, so it only has to tile along its width.
WIDTH_ONLY = {'barrel'}
# The barrels take their color from the material, so their picture keeps only the light and the dark of it, as bright as the 85th percent of its pixels.
GREY = {'barrel'}
BRIGHT_PERCENTILE = 85
JPEG_QUALITY = 90
LUMINANCE_WEIGHTS = numpy.array([0.2126, 0.7152, 0.0722])


def flattened(image):
    """The image without its slow changes of light, which no fade can hide where the edges meet."""
    slow = ndimage.gaussian_filter(image, sigma=(FLATTEN_SIGMA_PIXELS, FLATTEN_SIGMA_PIXELS, 0), mode='nearest')
    return numpy.clip(image - slow + image.mean(axis=(0, 1)), 0, 255)


def cut_overlap(image, axis):
    """The image made shorter along an axis by joining its last rows (or columns) to its first ones along the path where the two differ least: nothing is mixed, each side keeps its own pixels."""
    moved = numpy.moveaxis(image, axis, 1)
    length = moved.shape[1]
    kept = length - OVERLAP_PIXELS
    head = moved[:, :OVERLAP_PIXELS]
    tail = moved[:, kept:]
    cost = ((head - tail) ** 2).sum(axis=2)
    # The cheapest way down the band, one step to the left, straight on or to the right at each row, never on its first column: the first pixel must come from the tail.
    for row in range(1, cost.shape[0]):
        for place in range(1, OVERLAP_PIXELS):
            cost[row, place] += cost[row - 1, max(place - 1, 1) : place + 2].min()
    path = numpy.zeros(cost.shape[0], dtype=int)
    path[-1] = 1 + int(numpy.argmin(cost[-1, 1:]))
    for row in range(cost.shape[0] - 2, -1, -1):
        below = path[row + 1]
        first = max(below - 1, 1)
        path[row] = first + int(numpy.argmin(cost[row, first : min(below + 2, OVERLAP_PIXELS)]))
    from_tail = numpy.arange(OVERLAP_PIXELS)[None, :] < path[:, None]
    band = numpy.where(from_tail[:, :, None], tail, head)
    joined = numpy.concatenate([band, moved[:, OVERLAP_PIXELS:kept]], axis=1)
    return numpy.moveaxis(joined, 1, axis)


def faded_overlap(image, axis):
    """The image made shorter along an axis by letting its last rows (or columns) fade into its first ones: only that narrow band is mixed, the rest is the picture as it was."""
    size = image.shape[axis]
    kept = size - OVERLAP_PIXELS
    head = numpy.take(image, range(OVERLAP_PIXELS), axis=axis)
    tail = numpy.take(image, range(kept, size), axis=axis)
    shape = [1, 1, 1]
    shape[axis] = OVERLAP_PIXELS
    weight = (0.5 - 0.5 * numpy.cos(numpy.pi * (numpy.arange(OVERLAP_PIXELS) + 0.5) / OVERLAP_PIXELS)).reshape(shape)
    mean = image.mean(axis=(0, 1), keepdims=True)
    blended = mean + (head * weight + tail * (1 - weight) - mean) / numpy.sqrt(weight**2 + (1 - weight) ** 2)
    return numpy.concatenate([blended, numpy.take(image, range(OVERLAP_PIXELS, kept), axis=axis)], axis=axis)


def edge_gaps(image):
    """How far the first and the last column, and the first and the last row, are from each other, in times the gap between two neighbouring ones."""
    columns = numpy.abs(image[:, 0] - image[:, -1]).mean() / numpy.abs(image[:, 1:] - image[:, :-1]).mean()
    rows = numpy.abs(image[0] - image[-1]).mean() / numpy.abs(image[1:] - image[:-1]).mean()
    return columns, rows


def grey_of(image):
    luminance = image @ LUMINANCE_WEIGHTS
    luminance = luminance * 255 / numpy.percentile(luminance, BRIGHT_PERCENTILE)
    return numpy.repeat(numpy.clip(luminance, 0, 255)[:, :, None], 3, axis=2)


def main(sheet_path, output_directory):
    output_directory.mkdir(parents=True, exist_ok=True)
    sheet = Image.open(sheet_path).convert('RGB')
    if sheet.size != (GRID * CELL_PIXELS, GRID * CELL_PIXELS):
        raise SystemExit(f'The sheet is {sheet.size}, not {GRID * CELL_PIXELS} pixels square')
    for index, name in enumerate(NAMES):
        row, column = divmod(index, GRID)
        cell = sheet.crop((column * CELL_PIXELS, row * CELL_PIXELS, (column + 1) * CELL_PIXELS, (row + 1) * CELL_PIXELS))
        image = numpy.array(cell).astype(float)
        if name in GREY:
            image = grey_of(image)
        if name in FLATTENED:
            image = flattened(image)
        before = edge_gaps(image)
        tile = image
        for axis, gap in ((1, before[0]), (0, before[1])):
            if gap > GAP_LIMIT and not (name in WIDTH_ONLY and axis == 0):
                tile = cut_overlap(tile, axis) if name in CUT else faded_overlap(tile, axis)
        if tile.shape != image.shape:
            tile = numpy.array(Image.fromarray(numpy.clip(tile, 0, 255).astype(numpy.uint8)).resize((CELL_PIXELS, CELL_PIXELS), Image.LANCZOS)).astype(float)
        after = edge_gaps(tile)
        Image.fromarray(numpy.clip(tile, 0, 255).astype(numpy.uint8)).save(output_directory / f'{name}.jpg', quality=JPEG_QUALITY)
        print(f'{name:10s} size {tile.shape[1]:3d}  width gap {before[0]:5.2f} -> {after[0]:4.2f}  height gap {before[1]:5.2f} -> {after[1]:4.2f}')


if __name__ == '__main__':
    main(Path(sys.argv[1]), Path(sys.argv[2]))
