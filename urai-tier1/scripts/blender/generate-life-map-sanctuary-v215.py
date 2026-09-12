"""Generate the V215 single-surface Life Map sanctuary.

Every shelf, bluff, erosion channel, and distant history rise is authored into
one continuous height field with one world-space texture. No external assets.
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

base.SEED = 1177215
base.RUNTIME_DIR = base.ROOT / "public/assets/urai/life-map-production/authored-v215"
base.MASTER_DIR = base.ROOT.parent / "source-masters/07_3D_SOURCE_MODELS/PR-1177/life-map-v215"
base.GLB_PATH = base.RUNTIME_DIR / "life-map-memory-sanctuary-v215.glb"
base.BLEND_PATH = base.MASTER_DIR / "life-map-memory-sanctuary-v215.blend"
base.PREVIEW_PATH = base.MASTER_DIR / "life-map-memory-sanctuary-v215-preview.png"

_material = base.material
def versioned_material(name, *args, **kwargs):
    return _material(name.replace("v212", "v215"), *args, **kwargs)
base.material = versioned_material


def sanctuary_height(x, z):
    depth = max(0.0, min(1.0, (16.0 - z) / 76.0))
    center = 1.8 * math.sin(depth * 5.4) + 0.72 * math.sin(depth * 13.0 + 0.5)
    lateral = abs(x - center)
    floor = -2.05 + depth * 2.15
    shoulder = max(0.0, min(1.0, (lateral - 7.0) / 22.0))
    wall = shoulder ** 1.7 * (4.6 + 6.8 * depth)
    weather = (0.24 * math.sin(x * 0.34 + z * 0.17) + 0.13 * math.sin(x * 0.91 - z * 0.43) + 0.055 * math.cos(x * 2.35 + z * 1.41)) * (0.55 + shoulder * 1.25)
    trace = -0.20 * math.exp(-((x - center - 0.35 * math.sin(z * 0.16)) / 1.05) ** 4)
    def relief(cx, cz, rx, rz, rise, phase):
        q = ((x - cx) / rx) ** 2 + ((z - cz) / rz) ** 2
        envelope = max(0.0, 1.0 - q) ** 1.75
        folds = 0.74 + 0.18 * math.sin((x - cx) * 0.88 + (z - cz) * 0.31 + phase) + 0.08 * math.cos((z - cz) * 1.15 - phase)
        return rise * envelope * max(0.32, folds)
    geology = relief(-10.0, -4.0, 7.8, 8.4, 3.2, 0.7)
    geology += relief(9.6, -15.5, 7.0, 9.8, 4.6, 2.1)
    geology += relief(-7.0, -30.0, 9.5, 11.5, 5.8, 4.2)
    geology += relief(10.5, -46.0, 10.0, 10.5, 7.0, 5.6)
    scar = -0.58 * math.exp(-(((x - 8.5) / 1.5) ** 2 + ((z + 15.5) / 6.2) ** 2))
    scar += -0.42 * math.exp(-(((x + 7.8) / 1.25) ** 2 + ((z + 30.0) / 7.8) ** 2))
    return floor + wall + weather + trace + geology + scar


def packed_geology(mat, name="v215_single_surface_geology", size=1024):
    image = bpy.data.images.new(name, width=size, height=size, alpha=True)
    pixels = [0.0] * (size * size * 4)
    for py in range(size):
        v = py / (size - 1)
        z = 16.0 - v * 76.0
        for px in range(size):
            u = px / (size - 1)
            x = -34.0 + u * 68.0
            center = 1.8 * math.sin(v * 5.4) + 0.72 * math.sin(v * 13.0 + 0.5)
            lateral = abs(x - center)
            macro = 0.5 + 0.5 * math.sin(x * 0.18 - z * 0.13 + math.sin(z * 0.07) * 1.8)
            strata = 0.5 + 0.5 * math.sin(z * 0.68 + x * 0.12 + math.sin(x * 0.19) * 1.3)
            grain = 0.5 + 0.5 * math.sin(x * 2.7 - z * 1.9) * math.sin(x * 1.2 + z * 2.4)
            path = math.exp(-((x - center - 0.35 * math.sin(z * 0.16)) / 1.2) ** 4)
            bank = max(0.0, min(1.0, (lateral - 7.0) / 22.0))
            deep, moss, stone, ochre = (0.115,0.225,0.205), (0.18,0.34,0.245), (0.33,0.39,0.36), (0.43,0.31,0.20)
            moss_mix = (1.0-bank) * (0.18+macro*0.24)
            stone_mix = bank * (0.28+strata*0.28)
            warm_mix = min(0.30, (0.08+grain*0.12)*(0.35+bank)+path*0.12)
            r = deep[0]*(1-moss_mix)+moss[0]*moss_mix
            g = deep[1]*(1-moss_mix)+moss[1]*moss_mix
            b = deep[2]*(1-moss_mix)+moss[2]*moss_mix
            r, g, b = r*(1-stone_mix)+stone[0]*stone_mix, g*(1-stone_mix)+stone[1]*stone_mix, b*(1-stone_mix)+stone[2]*stone_mix
            r, g, b = r*(1-warm_mix)+ochre[0]*warm_mix, g*(1-warm_mix)+ochre[1]*warm_mix, b*(1-warm_mix)+ochre[2]*warm_mix
            value = 0.82+macro*0.10+strata*0.06+grain*0.035
            i = (py*size+px)*4
            pixels[i:i+4] = (r*value,g*value,b*value,1.0)
    image.pixels.foreach_set(pixels)
    image.pack()
    nodes = mat.node_tree.nodes
    texture = nodes.new("ShaderNodeTexImage")
    texture.name = "V215 original single-surface geology"
    texture.image = image
    texture.interpolation = "Linear"
    mat.node_tree.links.new(texture.outputs["Color"], nodes["Principled BSDF"].inputs["Base Color"])
    mat["texture_provenance"] = "Original deterministic V215 generator seed 1177215; no external source"


def build_runtime():
    terrain = base.terrain()
    terrain.name = "life-map-v215-single-surface-eroded-memory-sanctuary"
    terrain.data.name = "life-map-v215-single-surface-terrain-mesh"
    terrain["authored_role"] = "one continuous camera-safe sanctuary with embedded path, scarps, shelves, and history rises"

base.height = sanctuary_height
base.apply_packed_strata_texture = packed_geology
base.build_runtime = build_runtime
base.main()
