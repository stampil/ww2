"""Turns the grey-blue body of the German vehicles of a sheet into the khaki of the French ones, and leaves everything else as it is.

Usage: python3 -I tools/recolor-body.py <sheet> <output sheet>
The body greys are the pixels whose hue is blue-green and whose saturation is low; their hue is moved to a khaki green, their saturation is raised and their value lowered,
so that they match the khaki of the French vehicles drawn for the game (measured on the truck of ref/convoi-francais-sans-feu.jpeg: hue 63.5, saturation 0.30, value 0.35).
The red of a cross, the white, the black, the browns and the magenta of the background are not blue-green, so they stay.
"""
import sys

import numpy
from PIL import Image

DEGREES = 360.0
BYTE = 255.0
BODY_HUE_DEGREES = (140.0, 235.0)
BODY_SATURATION = (0.04, 0.5)
BODY_MIN_VALUE = 0.12
KHAKI_HUE_DEGREES = 64.0
SATURATION_FACTOR = 2.1
VALUE_FACTOR = 0.8


def recolor(image):
    hsv = numpy.asarray(image.convert('RGB').convert('HSV')).copy()
    hue = hsv[..., 0].astype(float) * DEGREES / BYTE
    saturation = hsv[..., 1].astype(float) / BYTE
    value = hsv[..., 2].astype(float) / BYTE
    body = (
        (hue > BODY_HUE_DEGREES[0])
        & (hue < BODY_HUE_DEGREES[1])
        & (saturation > BODY_SATURATION[0])
        & (saturation < BODY_SATURATION[1])
        & (value > BODY_MIN_VALUE)
    )
    hsv[..., 0][body] = round(KHAKI_HUE_DEGREES * BYTE / DEGREES)
    hsv[..., 1][body] = numpy.clip(hsv[..., 1][body].astype(float) * SATURATION_FACTOR, 0, 255).astype(numpy.uint8)
    hsv[..., 2][body] = (hsv[..., 2][body].astype(float) * VALUE_FACTOR).astype(numpy.uint8)
    return Image.fromarray(hsv, 'HSV').convert('RGB'), int(body.sum())


def main():
    recolored, body_pixels = recolor(Image.open(sys.argv[1]))
    recolored.save(sys.argv[2], quality=95)
    print('body pixels recolored:', body_pixels)


main()
