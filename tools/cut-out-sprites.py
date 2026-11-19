"""Cuts sprites out of a sheet drawn on a flat magenta (#FF00FF) background, one transparent PNG per sprite.

Usage: python3 -I tools/cut-out-sprites.py [--width <pixels>] <sheet> <output directory> <name> [<name> ...]
The names are given in reading order (rows from the top, then from the left). The magenta of the edge pixels is taken
out of their color and turned into transparency, and what is left of the magenta cast is turned to gray.
With --width, each sprite is then scaled to that many pixels wide.
"""
import argparse
from pathlib import Path

import numpy
from PIL import Image
from scipy import ndimage

MAGENTA = numpy.array([255.0, 0.0, 255.0])
OPAQUE_BELOW = 30.0
TRANSPARENT_ABOVE = 215.0
MERGE_PIXELS = 8
MIN_SPRITE_PIXELS = 10000
EDGE_PIXELS = 2
PADDING_PIXELS = 4
ROW_GAP_PIXELS = 100


def magenta_share(pixels):
    """How much magenta each pixel holds: the least of red and blue that exceeds green."""
    return numpy.maximum(0.0, numpy.minimum(pixels[..., 0], pixels[..., 2]) - pixels[..., 1])


def cut_out(pixels):
    share = magenta_share(pixels)
    alpha = numpy.clip((TRANSPARENT_ABOVE - share) / (TRANSPARENT_ABOVE - OPAQUE_BELOW), 0.0, 1.0)
    # the color of a half-transparent pixel is a mix of the sprite and the magenta: take the magenta out
    unmixed = (pixels - (1.0 - alpha[..., None]) * MAGENTA) / numpy.maximum(alpha[..., None], 1e-3)
    colors = numpy.clip(unmixed, 0.0, 255.0)
    left_over = magenta_share(colors)
    colors[..., 0] -= left_over
    colors[..., 2] -= left_over
    # take off the outer pixel of every edge, where the mix is least sure
    eroded = ndimage.grey_erosion(alpha, size=3)
    return numpy.dstack([colors, 255.0 * numpy.minimum(alpha, eroded)])


def sprite_regions(alpha):
    """One region per sprite; the small pieces near a sprite (an antenna, a barrel) go to the nearest big one."""
    solid = alpha > 0.5
    labels, count = ndimage.label(ndimage.binary_dilation(solid, iterations=MERGE_PIXELS))
    big_labels = [index for index in range(1, count + 1) if ((labels == index) & solid).sum() >= MIN_SPRITE_PIXELS]
    big = numpy.isin(labels, big_labels) & solid
    nearest = ndimage.distance_transform_edt(~big, return_distances=False, return_indices=True)
    owner = labels[nearest[0], nearest[1]]
    regions = []
    for index in big_labels:
        mask = ndimage.binary_dilation((owner == index) & solid, iterations=EDGE_PIXELS)
        ys, xs = numpy.nonzero((owner == index) & solid)
        regions.append((mask, ys.min(), ys.max(), xs.min(), xs.max()))
    return in_reading_order(regions)


def in_reading_order(regions):
    """Rows from the top, a new row starting where the tops of two sprites are far apart; each row from the left."""
    by_top = sorted(regions, key=lambda region: region[1])
    rows = []
    for region in by_top:
        if rows and region[1] - rows[-1][-1][1] <= ROW_GAP_PIXELS:
            rows[-1].append(region)
        else:
            rows.append([region])
    return [region for row in rows for region in sorted(row, key=lambda region: region[3] + region[4])]


def scaled_to_width(sprite, width):
    """The sprite scaled to this width, with its color weighed by its opacity so that no color bleeds in from the transparent pixels."""
    height = round(sprite.height * width / sprite.width)
    return sprite.convert("RGBa").resize((width, height), Image.LANCZOS).convert("RGBA")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--width", type=int)
    parser.add_argument("sheet", type=Path)
    parser.add_argument("output_directory", type=Path)
    parser.add_argument("names", nargs="+")
    arguments = parser.parse_args()
    sheet, output_directory, names = arguments.sheet, arguments.output_directory, arguments.names
    output_directory.mkdir(parents=True, exist_ok=True)
    rgba = cut_out(numpy.array(Image.open(sheet).convert("RGB")).astype(float))
    regions = sprite_regions(rgba[..., 3] / 255.0)
    assert len(regions) == len(names), (len(regions), len(names))
    for name, (mask, top, bottom, left, right) in zip(names, regions):
        sprite = rgba.copy()
        sprite[..., 3] *= mask
        top, left = max(0, top - PADDING_PIXELS), max(0, left - PADDING_PIXELS)
        bottom, right = min(sprite.shape[0], bottom + PADDING_PIXELS + 1), min(sprite.shape[1], right + PADDING_PIXELS + 1)
        cropped = Image.fromarray(numpy.round(sprite[top:bottom, left:right]).astype("uint8"), "RGBA")
        if arguments.width is not None:
            cropped = scaled_to_width(cropped, arguments.width)
        cropped.save(output_directory / f"{name}.png", optimize=True)
        print(name, cropped.width, "x", cropped.height)


if __name__ == '__main__':
    main()
