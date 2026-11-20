"""Measures the bust of the cockpit pilot on the sheet of its three views (back, left side, front, on a grey background) and cuts the three photos.

Usage: python3 -I tools/make-pilot-sections.py <sheet> <output directory>
Writes back.jpg, side.jpg and front.jpg, and sections.json: for the head and for the body, one ring every few rows of the photos, each with the middle and the half width
seen from behind, and the middle and the half depth seen from the side, all in pixels of the photos. The game builds the shapes from these rings and paints the photos on them.
"""
import json
import sys
from pathlib import Path

import numpy
from PIL import Image
from scipy import ndimage

PANELS = {'back': (0, 466), 'side': (472, 935), 'front': (941, 1408)}
ROW_STEP = 4
CROWN_ROW = 62
NECK_ROW = 335
CHIN_ROW = 402
HEAD_SILHOUETTE_LAST_ROW = 300
BODY_FIRST_ROW = 300
BODY_LAST_ROW = 620
# The head turns about the neck: its axis is this many pixels from the left edge of the side photo.
NECK_AXIS_SIDE_X = 255
NEUTRAL_SPREAD = 12
BACKGROUND_LUMINANCE = (105, 175)
SMOOTHING_ROWS = 9
# Below the helmet the head is only a jaw, which the photos cannot give, as the collar and the neck hide it: these are its half width, and how far back it reaches, by row.
JAW_ROWS = [300, 335, 370, 395, CHIN_ROW]
JAW_HALF_WIDTHS = [118, 98, 72, 38, 4]
JAW_BACK_EDGES = [352, 262, 222, 198, 150]
# The body leaves the throat free, under the chin, to the head.
THROAT_X = 178
# The shapes are drawn this many pixels inside the silhouettes, so that the grey of the background never shows at their edges.
EDGE_INSET = 3
THROAT_LAST_ROW = 430
THROAT_FADE_ROWS = 70


def silhouette_of(pixels):
    spread = pixels.max(axis=2) - pixels.min(axis=2)
    luminance = pixels.mean(axis=2)
    neutral = (spread < NEUTRAL_SPREAD) & (luminance > BACKGROUND_LUMINANCE[0]) & (luminance < BACKGROUND_LUMINANCE[1])
    labels, _ = ndimage.label(neutral)
    border = numpy.concatenate([labels[0], labels[:, 0], labels[:, -1], labels[-1]])
    background = numpy.isin(labels, [label for label in numpy.unique(border) if label != 0])
    silhouette = ndimage.binary_fill_holes(ndimage.binary_closing(ndimage.binary_opening(~background, iterations=2), iterations=3))
    labels, count = ndimage.label(silhouette)
    sizes = ndimage.sum(silhouette, labels, range(1, count + 1))
    return labels == 1 + int(numpy.argmax(sizes))


def extents(silhouette):
    """The first and last column of the silhouette on every row, smoothed over a few rows."""
    first = numpy.full(silhouette.shape[0], numpy.nan)
    last = numpy.full(silhouette.shape[0], numpy.nan)
    for row in range(silhouette.shape[0]):
        columns = numpy.nonzero(silhouette[row])[0]
        if len(columns) > 0:
            first[row], last[row] = columns[0], columns[-1]
    return ndimage.median_filter(first, SMOOTHING_ROWS, mode='nearest'), ndimage.median_filter(last, SMOOTHING_ROWS, mode='nearest')


def main(sheet_path, output_directory):
    output_directory.mkdir(parents=True, exist_ok=True)
    sheet = Image.open(sheet_path).convert('RGB')
    pixels = numpy.array(sheet).astype(float)
    silhouettes = {}
    ends = {}
    for name, (left, right) in PANELS.items():
        sheet.crop((left, 0, right, sheet.height)).save(output_directory / f'{name}.jpg', quality=88)
        silhouettes[name] = silhouette_of(pixels[:, left:right])
        ends[name] = extents(silhouettes[name])
    back_first, back_last = ends['back']
    front_first, front_last = ends['front']
    side_first, side_last = ends['side']
    head_rows = numpy.arange(CROWN_ROW + 2, HEAD_SILHOUETTE_LAST_ROW)
    back_center = float(numpy.mean((back_first[head_rows] + back_last[head_rows]) / 2))
    front_center = float(numpy.mean((front_first[head_rows] + front_last[head_rows]) / 2))

    def rings(rows, half_width, middle_x, front_edge, back_edge):
        return [
            {
                'row': int(row),
                'middleX': round(float(middle_x(row)), 1),
                'halfWidth': round(float(max(half_width(row) - EDGE_INSET, 1.0)), 1),
                'middleY': round(float((front_edge(row) + back_edge(row)) / 2), 1),
                'halfDepth': round(float(max((back_edge(row) - front_edge(row)) / 2 - EDGE_INSET, 1.0)), 1),
            }
            for row in rows
        ]

    silhouette_half_width = lambda row: ((back_last[row] - back_first[row]) + (front_last[row] - front_first[row])) / 4
    silhouette_middle = lambda row: (back_first[row] + back_last[row]) / 2
    jaw_half_width = lambda row: numpy.interp(row, JAW_ROWS, JAW_HALF_WIDTHS)
    jaw_back = lambda row: numpy.interp(row, JAW_ROWS, JAW_BACK_EDGES)

    head = rings(
        range(CROWN_ROW + 1, CHIN_ROW + 1, ROW_STEP),
        lambda row: silhouette_half_width(row) if row <= HEAD_SILHOUETTE_LAST_ROW else jaw_half_width(row),
        lambda row: back_center,
        lambda row: side_first[min(row, CHIN_ROW)],
        lambda row: side_last[row] if row <= HEAD_SILHOUETTE_LAST_ROW else jaw_back(row),
    )

    def body_front(row):
        free = THROAT_X * numpy.clip(1 - (row - THROAT_LAST_ROW) / THROAT_FADE_ROWS, 0, 1)
        return max(side_first[row], free)

    body = rings(
        range(BODY_FIRST_ROW, BODY_LAST_ROW + 1, ROW_STEP),
        silhouette_half_width,
        silhouette_middle,
        body_front,
        lambda row: side_last[row],
    )
    description = {
        'rows': {'crown': CROWN_ROW, 'neck': NECK_ROW, 'chin': CHIN_ROW},
        'photos': {
            'back': {'width': PANELS['back'][1] - PANELS['back'][0], 'centerX': round(back_center, 1)},
            'front': {'width': PANELS['front'][1] - PANELS['front'][0], 'centerX': round(front_center, 1)},
            'side': {'width': PANELS['side'][1] - PANELS['side'][0], 'axisX': NECK_AXIS_SIDE_X},
            'height': int(sheet.height),
        },
        'head': head,
        'body': body,
    }
    (output_directory / 'sections.json').write_text(json.dumps(description, separators=(',', ':')))
    print('head rings', len(head), 'body rings', len(body), 'back center', round(back_center, 1), 'front center', round(front_center, 1))


if __name__ == '__main__':
    main(Path(sys.argv[1]), Path(sys.argv[2]))
