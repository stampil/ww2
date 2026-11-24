"""Turns the notebook cut out of its sheet into the three images the journal is built from, with the paper given the color of the paper of the game.

Usage: python3 -I tools/make-journal-notebook.py <notebook sprite> <output directory>
The sprite is the notebook cut out of ref/carnet.jpeg by tools/cut-out-sprites.py, at its own size. The three images are the band of the spiral rings, the body of
the page, which the journal stretches to the height of its text, and the edges of the sheets underneath. The paper is multiplied by the color of $paper in src/styles/_game.scss.
"""
import re
import sys
from pathlib import Path

import numpy
from PIL import Image

SCSS_FILE = Path(__file__).resolve().parent.parent / 'src' / 'styles' / '_game.scss'
# The rows, in the sprite, where the band of the rings ends (below the holes of the rings) and where the body ends (above the outline of the page foot).
RINGS_BOTTOM_ROW = 110
BODY_BOTTOM_ROW = 720
# The pixels brighter than the first luminance are paper, the ones darker than it are not; the paper takes its color in full from the second.
PAPER_FROM_LUMINANCE = 190.0
PAPER_FULL_LUMINANCE = 205.0
WHITE_FROM_LUMINANCE = 235.0


def luminance(pixels):
    return 0.299 * pixels[..., 0] + 0.587 * pixels[..., 1] + 0.114 * pixels[..., 2]


def paper_color():
    match = re.search(r'\$paper:\s*#([0-9a-fA-F]{6});', SCSS_FILE.read_text())
    assert match is not None, 'no $paper in ' + str(SCSS_FILE)
    hexadecimal = match.group(1)
    return numpy.array([int(hexadecimal[index:index + 2], 16) for index in (0, 2, 4)], dtype=float)


def tinted(sprite):
    pixels = numpy.asarray(sprite).astype(float)
    brightness = luminance(pixels[..., :3])
    paper_share = numpy.clip((brightness - PAPER_FROM_LUMINANCE) / (PAPER_FULL_LUMINANCE - PAPER_FROM_LUMINANCE), 0.0, 1.0)
    white = numpy.median(pixels[..., :3][(brightness > WHITE_FROM_LUMINANCE) & (pixels[..., 3] > 250)], axis=0)
    factor = paper_color() / white
    pixels[..., :3] *= 1.0 - paper_share[..., None] * (1.0 - factor)
    return Image.fromarray(numpy.clip(numpy.round(pixels), 0, 255).astype('uint8'), 'RGBA'), white, factor


def main():
    sprite_path, output_directory = Path(sys.argv[1]), Path(sys.argv[2])
    output_directory.mkdir(parents=True, exist_ok=True)
    notebook, white, factor = tinted(Image.open(sprite_path).convert('RGBA'))
    print('paper white', white, 'factor', factor.round(3))
    width, height = notebook.size
    bands = {
        'journal-rings': (0, RINGS_BOTTOM_ROW),
        'journal-paper': (RINGS_BOTTOM_ROW, BODY_BOTTOM_ROW),
        'journal-stack': (BODY_BOTTOM_ROW, height),
    }
    for name, (top, bottom) in bands.items():
        band = notebook.crop((0, top, width, bottom))
        band.save(output_directory / f'{name}.png', optimize=True)
        print(name, band.width, 'x', band.height)


if __name__ == '__main__':
    main()
