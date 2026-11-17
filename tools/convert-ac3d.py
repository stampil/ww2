"""Converts the FlightGear D520 models (AC3D) into the binary files the site loads.

Usage: python3 -I tools/convert-ac3d.py <ref directory> <output directory>
The models are by Emmanuel Baranger, under the GPL v2 (see public/models/d520/ATTRIBUTION.txt). This script keeps the parts
the site shows, turns the axes (AC3D: x aft, y up, z left) into ours (x right, y nose, z up, origin on the thrust axis),
and writes d520.json and cockpit.json (parts, groups, materials, buffer offsets, part origins) beside d520.bin and
cockpit.bin (positions, normals, uvs, indices). The cockpit files carry the offsets that FlightGear applies to the panel,
the seat and the instruments; an instrument part is named after its folder, like airspeed/needle.
"""
import json
import sys
from pathlib import Path

import numpy

EXTERIOR_PARTS = [
    "fuselage", "ailes", "ailes2", "direction", "profondeur", "aileronG", "aileronD", "voletG", "voletD",
    "bol", "helice", "propblur", "canopy", "tourcanopy", "vitres", "tourvitres", "air", "priseair", "ailettes",
    "cachesguns", "echappements", "roueG", "roueD", "roueA", "axeG", "axeD", "axeA", "porteG", "porteD",
]
INTERIOR_PARTS = [
    "interieur", "inttour", "inttourvitres", "inttourcanopy", "armature", "structure", "fond", "renfort", "planchet",
    "bloc1", "intvitres", "intcanopy",
]
NO_OFFSET = (0.0, 0.0, 0.0)
PANEL_OFFSET = (-0.662, 0.0, 0.367)
SEAT_OFFSET = (0.250, 0.0, 0.260)
COLLIMATOR_OFFSET = (-0.427, 0.0, 0.823)
# Where panel.xml puts each instrument on the panel (x aft, y right, z up, in meters).
INSTRUMENT_OFFSETS = {
    "airspeed": (-0.009, 0.000, 0.201),
    "alt": (-0.007, 0.107, 0.155),
    "vsi": (-0.007, 0.107, 0.260),
    "clock": (-0.007, 0.189, 0.258),
    "compass": (-0.002, 0.000, 0.301),
    "oiltemp": (-0.007, -0.171, 0.235),
    "temp": (-0.007, -0.244, 0.235),
    "oilpress": (-0.007, -0.171, 0.163),
    "press": (-0.007, -0.244, 0.163),
    "tach": (-0.007, -0.301, 0.079),
    "mano": (-0.007, -0.318, 0.163),
}
EXTERIOR_FILE = "flightgear-d520/d520.ac"
INSTRUMENTS_DIRECTORY = "flightgear-d520-interior/Panel/Instruments"
ALL_PARTS = None


def plus(first, second):
    return tuple(a + b for a, b in zip(first, second))


# Each file: path, FlightGear offset, kept parts (None keeps every part), prefix of the part names.
INSTRUMENT_FILES = [
    (f"{INSTRUMENTS_DIRECTORY}/{name}/{name}.ac", plus(PANEL_OFFSET, offset), ALL_PARTS, f"{name}/")
    for name, offset in INSTRUMENT_OFFSETS.items()
]
MODELS = {
    "d520": [(EXTERIOR_FILE, NO_OFFSET, EXTERIOR_PARTS, "")],
    "cockpit": [
        ("flightgear-d520-interior/interior.ac", NO_OFFSET, INTERIOR_PARTS, ""),
        ("flightgear-d520-interior/Panel/panel.ac", PANEL_OFFSET, ["panel"], ""),
        ("flightgear-d520-interior/Seat/seat.ac", SEAT_OFFSET, ["seat"], ""),
        *INSTRUMENT_FILES,
        (f"{INSTRUMENTS_DIRECTORY}/collimator/collimator.ac", COLLIMATOR_OFFSET, ALL_PARTS, "collimator/"),
    ],
}
HUB_PART = "bol"
SMOOTH_FLAG = "0x10"


def read_materials_and_objects(path):
    lines = Path(path).read_text(encoding="latin-1").split("\n")
    materials = []
    objects = []
    position = 0

    def next_line():
        nonlocal position
        line = lines[position]
        position += 1
        return line

    def parse_object():
        record = {"name": "", "loc": (0.0, 0.0, 0.0), "texture": None, "vertices": [], "surfaces": []}
        next_line()
        while True:
            line = next_line()
            word = line.split()[0] if line.strip() else ""
            if word == "name":
                record["name"] = line.split('"')[1]
            elif word == "texture":
                record["texture"] = line.split('"')[1]
            elif word == "loc":
                record["loc"] = tuple(float(value) for value in line.split()[1:4])
            elif word == "numvert":
                count = int(line.split()[1])
                record["vertices"] = [tuple(float(value) for value in next_line().split()[:3]) for _ in range(count)]
            elif word == "numsurf":
                for _ in range(int(line.split()[1])):
                    flags = next_line().split()[1]
                    material = int(next_line().split()[1])
                    count = int(next_line().split()[1])
                    references = []
                    for _ in range(count):
                        index, u, v = next_line().split()[:3]
                        references.append((int(index), float(u), float(v)))
                    record["surfaces"].append((flags, material, references))
            elif word == "kids":
                objects.append(record)
                for _ in range(int(line.split()[1])):
                    parse_object()
                return

    while position < len(lines):
        line = lines[position]
        if line.startswith("MATERIAL"):
            fields = line.split()
            name = line.split('"')[1]
            opacity = 1.0 - float(fields[fields.index("trans") + 1])
            materials.append({"name": name, "opacity": round(opacity, 3)})
            position += 1
        elif line.startswith("OBJECT"):
            parse_object()
            break
        else:
            position += 1
    return materials, objects


def to_our_frame(vertex, location, offset, hub_y):
    """The vertex plus the FlightGear offset (x aft, y right, z up), in our frame."""
    x = vertex[0] + location[0] + offset[0]
    y = vertex[1] + location[1] + offset[2]
    z = vertex[2] + location[2] - offset[1]
    return (-z, -x, y - hub_y)


def build_part(record, offset, hub_y):
    """One part as indexed triangles grouped by material; smooth faces share normals, flat faces keep their own."""
    positions = [to_our_frame(vertex, record["loc"], offset, hub_y) for vertex in record["vertices"]]
    output_positions, output_uvs, output_sources = [], [], []
    keys = {}
    triangles_by_material = {}
    smooth_normals = numpy.zeros((len(positions), 3))

    def vertex_for(index, u, v, flat_face):
        key = (index, round(u, 5), round(v, 5), flat_face)
        if key not in keys:
            keys[key] = len(output_positions)
            output_positions.append(positions[index])
            output_uvs.append((u, v))
            output_sources.append((index, flat_face))
        return keys[key]

    for face_number, (flags, material, references) in enumerate(record["surfaces"]):
        if len(references) < 3:
            continue
        flat_face = None if flags == SMOOTH_FLAG else face_number
        first = references[0]
        for offset_in_fan in range(1, len(references) - 1):
            corners = [first, references[offset_in_fan], references[offset_in_fan + 1]]
            points = [numpy.array(positions[corner[0]]) for corner in corners]
            normal = numpy.cross(points[1] - points[0], points[2] - points[0])
            triangle = [vertex_for(corner[0], corner[1], corner[2], flat_face) for corner in corners]
            triangles_by_material.setdefault(material, []).append((triangle, normal, flat_face))
            if flat_face is None:
                for corner in corners:
                    smooth_normals[corner[0]] += normal

    flat_normals = {}
    for triangles in triangles_by_material.values():
        for _, normal, flat_face in triangles:
            if flat_face is not None:
                flat_normals[flat_face] = normal
    output_normals = []
    for index, flat_face in output_sources:
        normal = flat_normals[flat_face] if flat_face is not None else smooth_normals[index]
        length = numpy.linalg.norm(normal)
        output_normals.append(tuple(normal / length) if length > 0 else (0.0, 0.0, 1.0))

    indices, groups = [], []
    for material in sorted(triangles_by_material):
        start = len(indices)
        for triangle, _, _ in triangles_by_material[material]:
            indices.extend(triangle)
        groups.append({"material": material, "start": start, "count": len(indices) - start})
    return {"positions": output_positions, "normals": output_normals, "uvs": output_uvs, "indices": indices, "groups": groups}


def convert_model(name, files, ref_directory, output_directory, hub_y):
    """Writes <name>.json and <name>.bin from the kept parts of every AC3D file, with their FlightGear offsets."""
    chunks = []
    parts = []
    materials = []
    offset_in_buffer = 0
    for relative_path, offset, kept_parts, prefix in files:
        file_materials, objects = read_materials_and_objects(ref_directory / relative_path)
        by_name = {record["name"]: record for record in objects if record["name"]}
        part_names = list(by_name) if kept_parts is None else kept_parts
        textures = {by_name[part_name]["texture"] for part_name in part_names} - {None}
        assert len(textures) == 1, (relative_path, textures)
        texture = textures.pop()
        material_shift = len(materials)
        materials.extend({**material, "texture": texture} for material in file_materials)
        untextured_materials = {}
        for part_name in part_names:
            record = by_name[part_name]
            part = build_part(record, offset, hub_y)
            arrays = [
                ("positions", numpy.array(part["positions"], dtype="<f4")),
                ("normals", numpy.array(part["normals"], dtype="<f4")),
                ("uvs", numpy.array(part["uvs"], dtype="<f4")),
                ("indices", numpy.array(part["indices"], dtype="<u4")),
            ]
            groups = []
            for group in part["groups"]:
                material = group["material"] + material_shift
                if record["texture"] is None:
                    # a part without a texture, like a glass, gets its own copy of the material, with no map
                    if material not in untextured_materials:
                        untextured_materials[material] = len(materials)
                        materials.append({**materials[material], "texture": None})
                    material = untextured_materials[material]
                groups.append({**group, "material": material})
            origin = to_our_frame((0.0, 0.0, 0.0), record["loc"], offset, hub_y)
            entry = {
                "name": prefix + part_name,
                "origin": [round(value, 5) for value in origin],
                "vertexCount": len(part["positions"]),
                "indexCount": len(part["indices"]),
                "groups": groups,
            }
            for key, array in arrays:
                entry[key + "Offset"] = offset_in_buffer
                chunks.append(array.tobytes())
                offset_in_buffer += array.nbytes
            parts.append((entry, part["positions"]))

    (output_directory / f"{name}.bin").write_bytes(b"".join(chunks))
    manifest = {
        "license": "GPL-2.0",
        "source": "FlightGear FGAddon, Aircraft/D520, Emmanuel Baranger, converted by tools/convert-ac3d.py",
        "materials": materials,
        "parts": [entry for entry, _ in parts],
    }
    (output_directory / f"{name}.json").write_text(json.dumps(manifest, indent=1), encoding="utf-8")

    all_positions = numpy.vstack([numpy.array(positions) for _, positions in parts])
    low, high = all_positions.min(axis=0), all_positions.max(axis=0)
    print(name, "pièces", len(parts), "sommets", sum(entry["vertexCount"] for entry, _ in parts), "triangles", sum(entry["indexCount"] for entry, _ in parts) // 3)
    print(name, "boîte (x droite, y nez, z haut):", [round(float(v), 2) for v in low], [round(float(v), 2) for v in high])


def main():
    ref_directory, output_directory = Path(sys.argv[1]), Path(sys.argv[2])
    output_directory.mkdir(parents=True, exist_ok=True)
    _, exterior_objects = read_materials_and_objects(ref_directory / EXTERIOR_FILE)
    hub_vertices = numpy.array({record["name"]: record for record in exterior_objects}[HUB_PART]["vertices"])
    hub_y = float((hub_vertices[:, 1].min() + hub_vertices[:, 1].max()) / 2)
    print("axe de poussée (y AC3D du cône d'hélice):", round(hub_y, 3))
    for name, files in MODELS.items():
        convert_model(name, files, ref_directory, output_directory, hub_y)


main()
