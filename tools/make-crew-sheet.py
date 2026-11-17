"""Turns a sheet of 16 figures drawn on a flat magenta background into one transparent sprite sheet with frames of equal size.

Usage: python3 -I tools/make-crew-sheet.py <sheet> <output png>
The sheet holds 4 rows of 4 figures: the rows are the walk toward the viewer, to the right, away from the viewer, and the repair on one knee.
Each figure is cut out of the magenta (as tools/cut-out-sprites.py does), scaled by one factor for all of them, and put in a frame with its
feet on the bottom edge and its torso in the middle, so the frames of one row line up when they are played one after the other.
"""
import importlib.util
import sys
from pathlib import Path

import numpy
from PIL import Image

COLUMNS = 4
ROWS = 4
ALPHA_SOLID = 127
TALLEST_FRAME_PIXELS = 136
PADDING_PIXELS = 2
TORSO_SHARE = 0.6
MIN_GAP_PIXELS = 4

cutter_path = Path(__file__).with_name('cut-out-sprites.py')
specification = importlib.util.spec_from_file_location('cut_out_sprites', cutter_path)
cutter = importlib.util.module_from_spec(specification)
specification.loader.exec_module(cutter)


def runs_of(flags):
    """The stretches of consecutive true flags, as (first, last) pairs, ignoring the specks."""
    found = []
    start = None
    for index, flag in enumerate(flags):
        if flag and start is None:
            start = index
        if not flag and start is not None:
            found.append((start, index - 1))
            start = None
    if start is not None:
        found.append((start, len(flags) - 1))
    return [run for run in found if run[1] - run[0] >= MIN_GAP_PIXELS * 5]


def main(sheet_path, output_path):
    pixels = numpy.asarray(Image.open(sheet_path).convert('RGB')).astype(float)
    rgba = cutter.cut_out(pixels)
    solid = rgba[..., 3] > ALPHA_SOLID
    column_runs = runs_of(solid.any(axis=0))
    row_runs = runs_of(solid.any(axis=1))
    assert len(column_runs) == COLUMNS and len(row_runs) == ROWS, (column_runs, row_runs)

    figures = []
    for row_first, row_last in row_runs:
        row_figures = []
        for column_first, column_last in column_runs:
            region = rgba[row_first:row_last + 1, column_first:column_last + 1]
            ys, xs = numpy.nonzero(region[..., 3] > ALPHA_SOLID)
            top, bottom, left, right = ys.min(), ys.max(), xs.min(), xs.max()
            figure = region[top:bottom + 1, left:right + 1].copy()
            alpha = figure[..., 3]
            torso_rows = max(1, int(figure.shape[0] * TORSO_SHARE))
            weights = alpha[:torso_rows]
            torso_x = (weights.sum(axis=0) * numpy.arange(figure.shape[1])).sum() / weights.sum()
            row_figures.append((figure, torso_x))
        figures.append(row_figures)

    tallest = max(figure.shape[0] for row in figures for figure, _ in row)
    scale = TALLEST_FRAME_PIXELS / tallest
    scaled = []
    for row in figures:
        scaled_row = []
        for figure, torso_x in row:
            image = Image.fromarray(figure.astype(numpy.uint8), 'RGBA')
            size = (max(1, round(image.width * scale)), max(1, round(image.height * scale)))
            scaled_row.append((image.resize(size, Image.LANCZOS), torso_x * scale))
        scaled.append(scaled_row)

    left_reach = max(torso_x for row in scaled for _, torso_x in row)
    right_reach = max(image.width - torso_x for row in scaled for image, torso_x in row)
    frame_width = int(numpy.ceil(left_reach + right_reach)) + 2 * PADDING_PIXELS
    frame_height = TALLEST_FRAME_PIXELS + 2 * PADDING_PIXELS
    sheet = Image.new('RGBA', (frame_width * COLUMNS, frame_height * ROWS), (0, 0, 0, 0))
    for row_index, row in enumerate(scaled):
        for column_index, (image, torso_x) in enumerate(row):
            x = column_index * frame_width + PADDING_PIXELS + round(left_reach - torso_x)
            y = row_index * frame_height + frame_height - PADDING_PIXELS - image.height
            sheet.alpha_composite(image, (x, y))
    sheet.save(output_path, optimize=True)
    print(f'frames of {frame_width} x {frame_height} pixels, {COLUMNS} columns, {ROWS} rows, sheet {sheet.width} x {sheet.height}, scale {scale:.3f}')


main(sys.argv[1], sys.argv[2])
