"""Generate the V214 authored Life Map sanctuary from the editable V212 master recipe.

V214 fixes the V212 export omission: broad reliefs, scarps, and the braided route
are exported as terrain-integrated meshes instead of leaving only the base field.
All geometry and textures are original, deterministic, and reproducible.
"""

from __future__ import annotations

import importlib.util
import math
from pathlib import Path

import bpy


HERE = Path(__file__).resolve().parent
SPEC = importlib.util.spec_from_file_location("urai_lifemap_v212", HERE / "generate-life-map-sanctuary-v212.py")
base = importlib.util.module_from_spec(SPEC)
assert SPEC.loader
SPEC.loader.exec_module(base)

base.SEED = 1177214
base.RUNTIME_DIR = base.ROOT / "public/assets/urai/life-map-production/authored-v214"
base.MASTER_DIR = base.ROOT.parent / "source-masters/07_3D_SOURCE_MODELS/PR-1177/life-map-v214"
base.GLB_PATH = base.RUNTIME_DIR / "life-map-memory-sanctuary-v214.glb"
base.BLEND_PATH = base.MASTER_DIR / "life-map-memory-sanctuary-v214.blend"
base.PREVIEW_PATH = base.MASTER_DIR / "life-map-memory-sanctuary-v214-preview.png"

_material = base.material
def versioned_material(name, *args, **kwargs):
    return _material(name.replace("v212", "v214"), *args, **kwargs)
base.material = versioned_material


def packed_strata(mat, name="v214_packed_authored_strata", size=768):
    image = bpy.data.images.new(name, width=size, height=size, alpha=True)
    pixels = [0.0] * (size * size * 4)
    for py in range(size):
        v = py / (size - 1)
        for px in range(size):
            u = px / (size - 1)
            x = -34.0 + u * 68.0
            z = 16.0 - v * 76.0
            depth = v
            meander = 2.8 * math.sin(depth * 5.0) + 1.15 * math.sin(depth * 11.0 + 0.7)
            lateral = abs(x - meander)
            warp = 0.034 * math.sin(u * 11.0 + v * 7.0) + 0.016 * math.sin(u * 47.0 - v * 31.0)
            strata = 0.5 + 0.5 * math.sin((v + warp) * 92.0 + 2.8 * math.sin(u * 13.0))
            fine = 0.5 + 0.5 * math.sin(u * 311.0 + v * 173.0 + math.sin(v * 29.0) * 3.0)
            pitted = 0.5 + 0.5 * math.sin(u * 157.0 - v * 223.0) * math.sin(u * 83.0 + v * 101.0)
            path = math.exp(-((x - meander) / (2.0 + 0.5 * math.sin(v * 9.0))) ** 4)
            ledge = max(0.0, min(1.0, (lateral - 7.0) / 18.0))
            ochre = max(0.0, math.sin(x * 0.22 - z * 0.19) * 0.36 + 0.23) * (0.35 + ledge * 0.65)
            deep = (0.20, 0.36, 0.34)
            moss = (0.24, 0.52, 0.38)
            stone = (0.42, 0.53, 0.55)
            warm = (0.62, 0.45, 0.25)
            mix_moss = path * (0.42 + 0.18 * fine)
            mix_stone = ledge * (0.42 + 0.32 * strata)
            r = deep[0] * (1 - mix_moss) + moss[0] * mix_moss
            g = deep[1] * (1 - mix_moss) + moss[1] * mix_moss
            b = deep[2] * (1 - mix_moss) + moss[2] * mix_moss
            r = r * (1 - mix_stone) + stone[0] * mix_stone
            g = g * (1 - mix_stone) + stone[1] * mix_stone
            b = b * (1 - mix_stone) + stone[2] * mix_stone
            warm_mix = min(0.48, ochre * (0.20 + 0.28 * pitted))
            value = 0.78 + 0.16 * strata + 0.10 * fine + 0.08 * pitted
            r = (r * (1 - warm_mix) + warm[0] * warm_mix) * value
            g = (g * (1 - warm_mix) + warm[1] * warm_mix) * value
            b = (b * (1 - warm_mix) + warm[2] * warm_mix) * value
            index = (py * size + px) * 4
            pixels[index:index + 4] = (min(1.0, r), min(1.0, g), min(1.0, b), 1.0)
    image.pixels.foreach_set(pixels)
    image.pack()
    nodes = mat.node_tree.nodes
    texture = nodes.new("ShaderNodeTexImage")
    texture.name = "V214 original packed erosion and strata"
    texture.image = image
    texture.interpolation = "Linear"
    mat.node_tree.links.new(texture.outputs["Color"], nodes["Principled BSDF"].inputs["Base Color"])
    mat["texture_provenance"] = "Original deterministic V214 generator seed 1177214; no external source"


def surface(name, cols, rows, point, mat, role):
    vertices = []
    faces = []
    for row in range(rows + 1):
        v = row / rows
        for col in range(cols + 1):
            u = col / cols
            vertices.append(base.blender_point(*point(u, v)))
    for row in range(rows):
        for col in range(cols):
            a = row * (cols + 1) + col
            b, c, d = a + 1, a + cols + 1, a + cols + 2
            faces.extend(((a, b, c), (b, d, c)))
    mesh = bpy.data.meshes.new(name + "-mesh")
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    uv_layer = mesh.uv_layers.new(name="UVMap")
    for polygon in mesh.polygons:
        for loop_index in polygon.loop_indices:
            vertex_index = mesh.loops[loop_index].vertex_index
            uv_layer.data[loop_index].uv = (
                (vertex_index % (cols + 1)) / cols,
                (vertex_index // (cols + 1)) / rows,
            )
    for poly in mesh.polygons:
        poly.use_smooth = True
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    mesh.materials.append(mat)
    obj["authored_role"] = role
    return obj


def integrated_relief(name, cx, cz, rx, rz, rise, seed, mat):
    def point(u, v):
        x = cx + (u - 0.5) * rx * 2
        z = cz + (v - 0.5) * rz * 2
        radial = ((x - cx) / rx) ** 2 + ((z - cz) / rz) ** 2
        envelope = max(0.0, 1.0 - radial) ** 1.65
        folds = 0.72 + 0.20 * math.sin((x - cx) * 1.14 + (z - cz) * 0.52 + seed) + 0.10 * math.cos((z - cz) * 1.9)
        raw = rise * envelope * max(0.08, folds)
        terrace = math.floor(raw * 4.2) / 4.2
        y = base.height(x, z) + terrace + 0.055
        return x, y, z
    return surface(name, 36, 30, point, mat, "terrain-stitched localized history relief with eroded terraces")


def braided_channel(name, seed, mat):
    def point(u, v):
        z = 8.0 - v * 57.0
        depth = v
        center = 2.8 * math.sin(depth * 5.0) + 1.15 * math.sin(depth * 11.0 + 0.7)
        width = 0.42 + 0.30 * math.sin(v * 13.0 + seed) ** 2
        x = center + (u - 0.5) * width * 2.0 + 0.22 * math.sin(v * 31.0 + u * 7.0)
        y = base.height(x, z) + 0.075 + 0.035 * math.sin(v * 73.0 + u * 11.0)
        return x, y, z
    return surface(name, 12, 110, point, mat, "continuous reversible braided footpath worn into sanctuary geology")


def scarp(name, side, z_start, length, seed, mat):
    def point(u, v):
        z = z_start - v * length
        inner = side * (7.8 + 1.5 * math.sin(v * 5.0 + seed) + 0.7 * math.sin(v * 17.0))
        x = inner + side * u * (4.2 + 1.8 * math.sin(v * math.pi))
        shelf = math.sin(math.pi * u) ** 0.62
        y = base.height(x, z) + shelf * (1.4 + 2.4 * math.sin(v * math.pi) ** 0.7)
        y += 0.16 * math.sin(u * 17.0 + v * 23.0 + seed)
        return x, y + 0.04, z
    return surface(name, 24, 72, point, mat, "continuous eroded side scarp with close readable strata")


def build_runtime():
    terrain = base.terrain()
    terrain.name = "life-map-v214-continuous-eroded-memory-sanctuary"
    terrain.data.name = "life-map-v214-continuous-terrain-mesh"
    braided_channel("life-map-v214-narrow-worn-memory-trace", 4, base.DEEP)
    scarp("life-map-v214-west-lineage-scarp", -1, 7.0, 48.0, 2, base.DEEP)
    scarp("life-map-v214-east-archive-scarp", 1, 4.0, 52.0, 7, base.DEEP)
    integrated_relief("life-map-v214-foreground-witness-terrace", -7.2, 1.0, 4.2, 4.0, 1.8, 3, base.DEEP)
    integrated_relief("life-map-v214-midground-recovery-terrace", 7.8, -9.5, 4.9, 5.0, 2.7, 5, base.DEEP)
    integrated_relief("life-map-v214-deep-history-terrace", -5.0, -23.0, 6.2, 6.0, 3.6, 9, base.DEEP)
    integrated_relief("life-map-v214-future-weathering-terrace", 7.0, -37.0, 6.8, 6.6, 4.2, 13, base.DEEP)


base.apply_packed_strata_texture = packed_strata
base.build_runtime = build_runtime
base.main()
