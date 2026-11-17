"""Cuts the sheet of the German convoy (4 vehicles by 3 states, on flat magenta) into twelve transparent sprites for the ground attack.

Usage: python3 -I tools/make-convoy-sprites.py <sheet> <output directory>
The sheet holds four rows (truck, armored car, tanker, light tank) of three sprites (intact, damaged, destroyed). Each sprite is cut out of the magenta as
tools/cut-out-sprites.py does and scaled down to the same width limit; the smoke of a destroyed vehicle, which the sheet cuts off flat at the top of its cell,
fades out there so that no straight edge shows in the game.
"""
import importlib.util
import sys
from pathlib import Path

import numpy
from PIL import Image

VEHICLES = ['truck', 'armored-car', 'tanker', 'light-tank']
STATES = ['intact', 'damaged', 'destroyed']
MAX_WIDTH_PIXELS = 256
SMOKE_FADE_PIXELS = 60

cutter_path = Path(__file__).with_name('cut-out-sprites.py')
specification = importlib.util.spec_from_file_location('cut_out_sprites', cutter_path)
cutter = importlib.util.module_from_spec(specification)
specification.loader.exec_module(cutter)


def main(sheet_path, output_directory):
    output_directory.mkdir(parents=True, exist_ok=True)
    rgba = cutter.cut_out(numpy.array(Image.open(sheet_path).convert('RGB')).astype(float))
    regions = cutter.sprite_regions(rgba[..., 3] / 255.0)
    names = [f'{vehicle}-{state}' for vehicle in VEHICLES for state in STATES]
    assert len(regions) == len(names), (len(regions), len(names))
    for name, (mask, top, bottom, left, right) in zip(names, regions):
        sprite = rgba.copy()
        sprite[..., 3] *= mask
        top, left = max(0, top - cutter.PADDING_PIXELS), max(0, left - cutter.PADDING_PIXELS)
        bottom, right = min(sprite.shape[0], bottom + cutter.PADDING_PIXELS + 1), min(sprite.shape[1], right + cutter.PADDING_PIXELS + 1)
        cropped = sprite[top:bottom, left:right].copy()
        if name.endswith('destroyed'):
            fade = numpy.clip(numpy.arange(cropped.shape[0]) / SMOKE_FADE_PIXELS, 0.0, 1.0)
            cropped[..., 3] *= fade[:, None]
        image = Image.fromarray(numpy.round(cropped).astype('uint8'), 'RGBA')
        scale = min(1.0, MAX_WIDTH_PIXELS / image.width)
        image = image.resize((max(1, round(image.width * scale)), max(1, round(image.height * scale))), Image.LANCZOS)
        image.save(output_directory / f'{name}.png', optimize=True)
        print(name, image.width, 'x', image.height)


if __name__ == '__main__':
    main(Path(sys.argv[1]), Path(sys.argv[2]))
