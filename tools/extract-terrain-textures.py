"""Cuts a seamless grass texture and a seamless concrete texture out of the generated tile sheet.

Usage: python3 -I tools/extract-terrain-textures.py <tile sheet>
Both textures are 192 px squares, half the size of a tile image, so every tile image starts on a repeat.
"""
import sys
from pathlib import Path

import numpy
from PIL import Image

TEXTURE_PIXELS = 192
# Boxes (left, top, right, bottom) on the sheet: the plain grass tile and the inside of the apron slab.
GRASS_BOX = (20, 25, 228, 233)
CONCRETE_BOX = (548, 64, 688, 204)

TEXTURE_DIRECTORY = Path(__file__).resolve().parent.parent / "public" / "textures"


def seamless(pixels):
    """Blends the image with a copy shifted by half its size, so opposite edges continue each other."""
    height, width = pixels.shape[:2]
    fade_x = numpy.sin(numpy.pi * (numpy.arange(width) + 0.5) / width) ** 2
    fade_y = numpy.sin(numpy.pi * (numpy.arange(height) + 0.5) / height) ** 2
    weight = numpy.outer(fade_y, fade_x)[:, :, None]
    shifted = numpy.roll(pixels, (height // 2, width // 2), axis=(0, 1))
    return pixels * weight + shifted * (1 - weight)


def save_texture(sheet, box, output_name):
    left, top, right, bottom = box
    crop = sheet[top:bottom, left:right]
    side = min(crop.shape[0], crop.shape[1])
    blended = seamless(crop[:side, :side])
    image = Image.fromarray(numpy.clip(blended, 0, 255).astype("uint8"))
    image.resize((TEXTURE_PIXELS, TEXTURE_PIXELS), Image.LANCZOS).save(TEXTURE_DIRECTORY / output_name)
    print("écrit", output_name, "depuis", side, "px")


def main():
    sheet = numpy.asarray(Image.open(sys.argv[1]).convert("RGB")).astype(float)
    TEXTURE_DIRECTORY.mkdir(parents=True, exist_ok=True)
    save_texture(sheet, GRASS_BOX, "herbe.png")
    save_texture(sheet, CONCRETE_BOX, "beton.png")


main()
