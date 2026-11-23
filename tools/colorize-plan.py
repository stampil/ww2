"""Colors the line drawing of an aircraft seen from above, nose up, into a camouflaged sprite with French roundels on transparent background.

Usage: python3 -I tools/colorize-plan.py [--width <pixels>] [--seed <number>] <line drawing> <output png>
The shape is the one of the drawing, never redrawn: the outline is filled, the camouflage is two soft-edged blotch colors drawn from a seeded noise,
the closed regions of the drawing that are small and on the axis of the aircraft are glass, the small ones ahead of the wings and off the axis are propeller blades,
and a roundel (red, white, blue at the center) is put on the middle of each wing, as wide as ROUNDEL_SPAN_SHARE of the span.
"""
import argparse
from pathlib import Path

import numpy
from PIL import Image
from scipy import ndimage

LINE_BELOW = 128
SEAL_PIXELS = 8
LINE_THIN_PIXELS = 1
LINE_SOFT_SIGMA = 2.0
LINE_EDGE = (0.25, 0.55)
ALPHA_EDGE = (0.35, 0.65)
OLIVE = numpy.array([75, 90, 58])
BROWN = numpy.array([94, 74, 54])
GLASS = numpy.array([160, 180, 196])
BLADES = numpy.array([60, 62, 64])
ROUNDEL_RED = numpy.array([200, 28, 28])
ROUNDEL_WHITE = numpy.array([250, 250, 250])
ROUNDEL_BLUE = numpy.array([16, 74, 160])
BLOTCH_SIGMA_SHARE = 0.026
EDGE_SIGMA = 3.0
ROUNDEL_SPAN_SHARE = 0.08
ROUNDEL_FROM_FUSELAGE_SHARE = 0.5
AXIS_BAND_SHARE = 0.03
GLASS_MAX_PIXELS = 3000
BLADES_MAX_PIXELS = 400
BLADES_ABOVE_HEIGHT_SHARE = 0.17
WING_MIN_SPAN_SQUARE_SHARE = 0.025
WING_MIN_WIDTH_SPAN_SHARE = 0.25
WINGS_ABOVE_LENGTH_SHARE = 0.55
ANTI_ALIAS_SIGMA = 3.0


def silhouette_of(lines):
    """Everything the outline encloses, with the lines themselves: the background is the white that touches the border once the small gaps of the lines are sealed."""
    sealed = ndimage.binary_dilation(lines, iterations=SEAL_PIXELS)
    labels, _ = ndimage.label(~sealed)
    outside = labels == labels[0, 0]
    return ndimage.binary_erosion(~outside, iterations=SEAL_PIXELS) | lines


def camouflage(shape, seed, span):
    random = numpy.random.default_rng(seed)
    field = ndimage.gaussian_filter(random.standard_normal(shape), span * BLOTCH_SIGMA_SHARE)
    brown_share = ndimage.gaussian_filter((field > numpy.median(field)).astype(float), EDGE_SIGMA)
    return OLIVE[None, None, :] * (1 - brown_share[..., None]) + BROWN[None, None, :] * brown_share[..., None]


def paint_regions(colors, regions, center_x, span, top, length):
    """Glass for the small regions on the axis, propeller blades for the small ones off the axis and ahead of the wings."""
    for index, box in enumerate(ndimage.find_objects(regions), start=1):
        mask = regions == index
        area = int(mask.sum())
        center_y, center_x_of_region = ndimage.center_of_mass(mask)
        on_axis = abs(center_x_of_region - center_x) < span * AXIS_BAND_SHARE
        if on_axis and area < GLASS_MAX_PIXELS and center_y < top + length * 0.5 + 400:
            colors[mask] = GLASS
        elif not on_axis and area < BLADES_MAX_PIXELS and center_y < top + length * BLADES_ABOVE_HEIGHT_SHARE:
            colors[mask] = BLADES


def paint_roundels(colors, regions, center_x, span, top, length):
    wing_labels = []
    for index, box in enumerate(ndimage.find_objects(regions), start=1):
        width = box[1].stop - box[1].start
        center_y = ndimage.center_of_mass(regions == index)[0]
        is_ahead = center_y < top + length * WINGS_ABOVE_LENGTH_SHARE
        if is_ahead and (regions == index).sum() > span * span * WING_MIN_SPAN_SQUARE_SHARE and width > span * WING_MIN_WIDTH_SPAN_SHARE:
            wing_labels.append(index)
    radius = span * ROUNDEL_SPAN_SHARE / 2
    for index in wing_labels:
        ys, xs = numpy.nonzero(regions == index)
        side = 1 if xs.mean() > center_x else -1
        inner, outer = (xs.min(), xs.max())
        fuselage_edge = inner if side > 0 else outer
        tip = outer if side > 0 else inner
        x = fuselage_edge + (tip - fuselage_edge) * ROUNDEL_FROM_FUSELAGE_SHARE
        column = ys[numpy.abs(xs - x) < 2]
        y = (column.min() + column.max()) / 2
        rows, columns = numpy.ogrid[: colors.shape[0], : colors.shape[1]]
        distance = numpy.hypot(columns - x, rows - y)
        colors[distance < radius] = ROUNDEL_RED
        colors[distance < radius * 2 / 3] = ROUNDEL_WHITE
        colors[distance < radius / 3] = ROUNDEL_BLUE


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--width', type=int, default=None)
    parser.add_argument('--seed', type=int, default=1940)
    parser.add_argument('drawing')
    parser.add_argument('output')
    arguments = parser.parse_args()

    lines = numpy.asarray(Image.open(arguments.drawing).convert('L')) < LINE_BELOW
    aircraft = silhouette_of(lines)
    ys, xs = numpy.nonzero(aircraft)
    span, length = xs.max() - xs.min() + 1, ys.max() - ys.min() + 1
    center_x = (xs.max() + xs.min()) / 2
    print('span', span, 'length', length, 'length over span', round(length / span, 3))

    colors = camouflage(lines.shape, arguments.seed, span)
    regions, _ = ndimage.label(aircraft & ~lines)
    paint_regions(colors, regions, center_x, span, ys.min(), length)
    paint_roundels(colors, regions, center_x, span, ys.min(), length)
    thin_lines = ndimage.gaussian_filter(ndimage.binary_erosion(lines, iterations=LINE_THIN_PIXELS).astype(float), LINE_SOFT_SIGMA)
    line_weight = numpy.clip((thin_lines - LINE_EDGE[0]) / (LINE_EDGE[1] - LINE_EDGE[0]), 0, 1)
    colors *= (1 - line_weight)[..., None]

    alpha = numpy.clip((ndimage.gaussian_filter(aircraft.astype(float), ANTI_ALIAS_SIGMA) - ALPHA_EDGE[0]) / (ALPHA_EDGE[1] - ALPHA_EDGE[0]), 0, 1)
    sprite = Image.fromarray(numpy.dstack([numpy.clip(colors, 0, 255).astype(numpy.uint8), (alpha * 255).astype(numpy.uint8)]), 'RGBA')
    sprite = sprite.crop((int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1))
    if arguments.width is not None:
        sprite = sprite.resize((arguments.width, round(sprite.height * arguments.width / sprite.width)), Image.LANCZOS)
    sprite.save(Path(arguments.output))
    print('saved', arguments.output, sprite.size)


main()
