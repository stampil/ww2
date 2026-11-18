"""Makes a small copy of the texture of each aircraft, for the places where the aircraft is drawn small; the full-size textures stay as they are.

Usage: python3 -I tools/make-low-textures.py <public directory>
For each texture named below, `<name>-low.jpg` is written beside it: the same picture reduced to LOW_PIXELS on a side and saved as a JPEG.
The site loads the small copy for the aircraft that are far or small on the screen, and the full-size one when the aircraft fills the view.
"""
import sys
from pathlib import Path

from PIL import Image

LOW_PIXELS = 512
JPEG_QUALITY = 85
TEXTURES = [
    'models/d520/texture-francais.png',
    'models/d520/texture-vichy.png',
    'models/bf109/bf109g.png',
    'models/he111/texture.png',
    'models/ju87/texture.png',
    'models/ms406/texture.png',
]


def main(public_directory):
    for name in TEXTURES:
        source = public_directory / name
        target = source.with_name(source.stem + '-low.jpg')
        with Image.open(source) as image:
            image.convert('RGB').resize((LOW_PIXELS, LOW_PIXELS), Image.LANCZOS).save(target, 'JPEG', quality=JPEG_QUALITY, optimize=True)
        print(target.relative_to(public_directory), round(target.stat().st_size / 1000), 'KB, from', round(source.stat().st_size / 1000), 'KB')


if __name__ == '__main__':
    main(Path(sys.argv[1]))
