"""Cuts the sheet of the pilot dossier, cut out of ref/dossier-pilote.jpeg, into the three images the pilot sheet is built from.

Usage: python3 -I tools/make-pilot-dossier.py <dossier sprite> <output directory>
The three images are the top of the sheet, with the paper clip and the empty frame of the photo, which keeps its proportions; the body of the paper, which the sheet
stretches to the height of its text; and the foot of the paper. The rows are those of the sprite cut by tools/cut-out-sprites.py from that sheet.
"""
import sys
from pathlib import Path

from PIL import Image

# The row, in the sprite, where the top ends (under the frame of the photo) and the row where the body ends (above the torn foot of the paper).
TOP_BOTTOM_ROW = 430
BODY_BOTTOM_ROW = 1100


def main():
    sprite_path, output_directory = Path(sys.argv[1]), Path(sys.argv[2])
    output_directory.mkdir(parents=True, exist_ok=True)
    sprite = Image.open(sprite_path).convert('RGBA')
    width, height = sprite.size
    bands = {
        'dossier-top': (0, TOP_BOTTOM_ROW),
        'dossier-body': (TOP_BOTTOM_ROW, BODY_BOTTOM_ROW),
        'dossier-foot': (BODY_BOTTOM_ROW, height),
    }
    for name, (top, bottom) in bands.items():
        band = sprite.crop((0, top, width, bottom))
        band.save(output_directory / f'{name}.png', optimize=True)
        print(name, band.width, 'x', band.height)


if __name__ == '__main__':
    main()
