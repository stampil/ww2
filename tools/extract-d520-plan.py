"""Builds the D.520 textures and the data of its 3D model from the generated top views.

Usage: python3 -I tools/extract-d520-plan.py <french top view> <german top view>
Both images are nose-up D.520 top views on a flat #FF00FF background.
"""
import sys
from pathlib import Path

import numpy
import scipy.ndimage as ndimage
from PIL import Image

WINGSPAN_METERS = 10.2
LENGTH_METERS = 8.6
TEXTURE_WIDTH_PIXELS = 1024
BACKGROUND_COLOR = (255, 0, 255)
OPAQUE_DISTANCE = 200
TRANSPARENT_DISTANCE = 40
MASK_DISTANCE = 110
WING_ROOT_HALF_WIDTH_METERS = 0.6
WING_SAMPLE_STEP_METERS = 0.1

# Cross-sections A to E read on the three-view plan, at 3x zoom: station measured from the tail tip.
PLAN_METERS_PER_PIXEL = 0.0149
SIDE_VIEW_METERS_PER_PIXEL = LENGTH_METERS / 584
SIDE_VIEW_TAIL_TIP_X = 267
# Each row: label, tick x on the side view, half width, height above and below the thrust axis (plan pixels).
SECTIONS_ON_PLAN = [
    ("E", 408, 23.3, 35.7, 39.3),
    ("D", 531, 30.0, 50.0, 58.3),
    ("C", 664, 39.0, 26.7, 75.0),
    ("B", 727, 33.3, 26.7, 56.7),
    ("A", 800, 26.7, 20.0, 38.3),
]
END_POINT_HALF_SIZE_METERS = 0.05

PROJECT_ROOT = Path(__file__).resolve().parent.parent
TEXTURE_DIRECTORY = PROJECT_ROOT / "public" / "textures"
PLAN_MODULE = PROJECT_ROOT / "src" / "three" / "d520Plan.ts"


def keyed_texture(image_path):
    """Returns the aircraft as an RGBA array cropped to its silhouette, background made transparent."""
    pixels = numpy.asarray(Image.open(image_path).convert("RGB")).astype(float)
    distance = numpy.abs(pixels[:, :, 0] - BACKGROUND_COLOR[0]) + pixels[:, :, 1] + numpy.abs(pixels[:, :, 2] - BACKGROUND_COLOR[2])
    foreground = ndimage.binary_opening(distance >= MASK_DISTANCE, iterations=1)
    labels, count = ndimage.label(foreground)
    sizes = ndimage.sum(foreground, labels, range(1, count + 1))
    aircraft = ndimage.binary_dilation(labels == 1 + int(numpy.argmax(sizes)), iterations=3)

    alpha = numpy.clip((distance - TRANSPARENT_DISTANCE) / (OPAQUE_DISTANCE - TRANSPARENT_DISTANCE), 0, 1)
    alpha[~aircraft] = 0
    background = numpy.array(BACKGROUND_COLOR, dtype=float)
    safe_alpha = numpy.maximum(alpha, 0.05)[:, :, None]
    color = numpy.clip((pixels - (1 - alpha[:, :, None]) * background) / safe_alpha, 0, 255)

    rows = numpy.where(aircraft.any(axis=1))[0]
    columns = numpy.where(aircraft.any(axis=0))[0]
    rgba = numpy.dstack([color, alpha * 255]).astype("uint8")
    return rgba[rows[0]:rows[-1] + 1, columns[0]:columns[-1] + 1]


def save_texture(rgba, height_pixels, output_path):
    image = Image.fromarray(rgba, "RGBA").resize((TEXTURE_WIDTH_PIXELS, height_pixels), Image.LANCZOS)
    image.save(output_path)
    return numpy.asarray(image)


def wing_edges(alpha, meters_per_pixel):
    """Leading and trailing edge of the wing, for each distance from the axis, from the longest run of each column."""
    height_pixels, width_pixels = alpha.shape
    solid = alpha > 128
    edges = []
    distance = WING_ROOT_HALF_WIDTH_METERS
    while distance <= WINGSPAN_METERS / 2 - WING_SAMPLE_STEP_METERS:
        leading_values = []
        trailing_values = []
        for side in (-1, 1):
            column = int(round((WINGSPAN_METERS / 2 + side * distance) / meters_per_pixel))
            column = min(max(column, 0), width_pixels - 1)
            labels, count = ndimage.label(solid[:, column])
            if count == 0:
                continue
            sizes = ndimage.sum(solid[:, column], labels, range(1, count + 1))
            run_rows = numpy.where(labels == 1 + int(numpy.argmax(sizes)))[0]
            leading_values.append((height_pixels / 2 - run_rows[0]) * meters_per_pixel)
            trailing_values.append((height_pixels / 2 - run_rows[-1]) * meters_per_pixel)
        if leading_values:
            edges.append((distance, sum(trailing_values) / len(trailing_values), sum(leading_values) / len(leading_values)))
        distance += WING_SAMPLE_STEP_METERS
    return edges


def fuselage_sections():
    sections = [(-LENGTH_METERS / 2, END_POINT_HALF_SIZE_METERS, END_POINT_HALF_SIZE_METERS, -END_POINT_HALF_SIZE_METERS)]
    for _label, tick_x, half_width, above, below in SECTIONS_ON_PLAN:
        station = (tick_x - SIDE_VIEW_TAIL_TIP_X) * SIDE_VIEW_METERS_PER_PIXEL - LENGTH_METERS / 2
        sections.append((station, half_width * PLAN_METERS_PER_PIXEL, above * PLAN_METERS_PER_PIXEL, -below * PLAN_METERS_PER_PIXEL))
    sections.append((LENGTH_METERS / 2, END_POINT_HALF_SIZE_METERS, END_POINT_HALF_SIZE_METERS, -END_POINT_HALF_SIZE_METERS))
    return sorted(sections)


def write_plan_module(wing_edge_rows, section_rows):
    wing_lines = ",\n".join(f"  {{ x: {x:.2f}, trailing: {trailing:.3f}, leading: {leading:.3f} }}" for x, trailing, leading in wing_edge_rows)
    section_lines = ",\n".join(f"  {{ y: {y:.3f}, halfWidth: {half_width:.3f}, top: {top:.3f}, bottom: {bottom:.3f} }}" for y, half_width, top, bottom in section_rows)
    PLAN_MODULE.parent.mkdir(parents=True, exist_ok=True)
    PLAN_MODULE.write_text(f"""// Generated by tools/extract-d520-plan.py: do not edit by hand.
// Meters, x to the right wing, y to the nose, z up, origin at the middle of the silhouette.

export const WINGSPAN_METERS = {WINGSPAN_METERS}
export const LENGTH_METERS = {LENGTH_METERS}

export type WingEdge = {{ x: number; trailing: number; leading: number }}
export type FuselageSection = {{ y: number; halfWidth: number; top: number; bottom: number }}

// Wing edges per distance from the axis, taken from the silhouette of the generated top view.
export const WING_EDGES: ReadonlyArray<WingEdge> = [
{wing_lines},
]

// Fuselage sections A to E read on the three-view plan, with a point at the tail and at the nose.
export const FUSELAGE_SECTIONS: ReadonlyArray<FuselageSection> = [
{section_lines},
]
""", encoding="utf-8")


def main():
    french_path, german_path = sys.argv[1], sys.argv[2]
    TEXTURE_DIRECTORY.mkdir(parents=True, exist_ok=True)

    french = keyed_texture(french_path)
    german = keyed_texture(german_path)
    height_pixels = round(TEXTURE_WIDTH_PIXELS * french.shape[0] / french.shape[1])
    french_resized = save_texture(french, height_pixels, TEXTURE_DIRECTORY / "d520-francais.png")
    save_texture(german, height_pixels, TEXTURE_DIRECTORY / "d520-allemand.png")

    meters_per_pixel = WINGSPAN_METERS / TEXTURE_WIDTH_PIXELS
    print("texture", TEXTURE_WIDTH_PIXELS, "x", height_pixels, "longueur", round(height_pixels * meters_per_pixel, 3), "m (réel", LENGTH_METERS, ")")
    write_plan_module(wing_edges(french_resized[:, :, 3], meters_per_pixel), fuselage_sections())
    print("écrit", PLAN_MODULE)


main()
