"""Generate the PR #1177 Life Map sanctuary master and optimized runtime GLB.

Blender 4.x, deterministic, no external assets. The .blend master retains source
geometry, collision, camera, lighting, materials, and provenance metadata. The
runtime export contains only the camera-native sanctuary meshes.
"""

from __future__ import annotations

import math
import os
import random
from pathlib import Path

import bpy
from mathutils import Vector


SEED = 1177210
random.seed(SEED)
ROOT = Path(__file__).resolve().parents[2]
RUNTIME_DIR = ROOT / "public/assets/urai/life-map-production/authored-v210"
MASTER_DIR = ROOT.parent / "source-masters/07_3D_SOURCE_MODELS/PR-1177/life-map-v210"
GLB_PATH = RUNTIME_DIR / "life-map-memory-sanctuary-v210.glb"
BLEND_PATH = MASTER_DIR / "life-map-memory-sanctuary-v210.blend"
PREVIEW_PATH = MASTER_DIR / "life-map-memory-sanctuary-v210-preview.png"


def reset_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for datablocks in (bpy.data.meshes, bpy.data.curves, bpy.data.materials, bpy.data.cameras, bpy.data.lights):
        pass


def material(name, color, roughness=0.92, emission=None, emission_strength=0.0):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*color, 1.0)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (*color, 1.0)
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["Metallic"].default_value = 0.0
    if emission:
        bsdf.inputs["Emission Color"].default_value = (*emission, 1.0)
        bsdf.inputs["Emission Strength"].default_value = emission_strength
    return mat


def apply_packed_strata_texture(mat, name="v210_packed_authored_strata", size=384):
    image = bpy.data.images.new(name, width=size, height=size, alpha=True)
    pixels = [0.0] * (size * size * 4)
    for py in range(size):
        v = py / (size - 1)
        for px in range(size):
            u = px / (size - 1)
            warp = 0.045 * math.sin(u * 17.0 + v * 8.0) + 0.018 * math.sin(u * 51.0 - v * 29.0)
            band = 0.5 + 0.5 * math.sin((v + warp) * 72.0 + 4.2 * math.sin(u * 9.0))
            erosion = 0.5 + 0.5 * math.sin(u * 31.0 + v * 19.0) * math.sin(u * 7.0 - v * 37.0)
            mineral = max(0.0, min(1.0, (band - 0.62) * 2.3))
            r = 0.12 + 0.10 * erosion + 0.15 * mineral
            g = 0.22 + 0.13 * erosion + 0.10 * mineral
            b = 0.23 + 0.14 * erosion + 0.07 * mineral
            index = (py * size + px) * 4
            pixels[index:index + 4] = (r, g, b, 1.0)
    image.pixels.foreach_set(pixels)
    image.pack()
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    texture = nodes.new("ShaderNodeTexImage")
    texture.name = "packed original procedural strata texture"
    texture.image = image
    texture.interpolation = "Linear"
    links.new(texture.outputs["Color"], nodes["Principled BSDF"].inputs["Base Color"])
    mat["texture_provenance"] = "Original deterministic generator seed 1177210; no external source"


STONE = None
MINERAL = None
MOSS = None
WARM = None
VIOLET = None
CYAN = None
GOLD = None
DEEP = None


def blender_point(x, y, z):
    """Convert Three.js Y-up coordinates to Blender Z-up coordinates."""
    return (x, -z, y)


def height(x, z):
    depth = max(0.0, min(1.0, (6.0 - z) / 50.0))
    meander = 1.15 * math.sin(depth * 7.1) + 0.42 * math.sin(depth * 17.0)
    lateral = abs(x - meander) / 19.0
    broad = 0.38 * lateral ** 1.7 + 0.44 * lateral ** 3.7
    ascent = 0.0
    descent = -0.058 * (6.0 - z)
    erosion = (
        0.32 * math.sin(x * 0.34 + z * 0.23)
        + 0.13 * math.sin(x * 1.18 - z * 0.41)
        + 0.055 * math.cos(x * 2.9 + z * 1.7)
    )
    path = -0.32 * math.exp(-((x - meander) / 2.4) ** 4)
    terraces = math.floor((broad + ascent) * 1.55) / 1.55
    return -1.18 + descent + terraces + erosion * (0.35 + lateral * 0.9) + path


def add_uv(mesh, vertices):
    uv = mesh.uv_layers.new(name="UVMap")
    for poly in mesh.polygons:
        for loop_index in poly.loop_indices:
            vertex = vertices[mesh.loops[loop_index].vertex_index]
            uv.data[loop_index].uv = ((vertex[0] + 20.0) / 40.0, (6.0 + vertex[1]) / 50.0)


def terrain():
    cols, rows = 64, 88
    vertices, faces = [], []
    for row in range(rows + 1):
        v = row / rows
        z = 6.0 - v * 50.0
        for col in range(cols + 1):
            u = col / cols
            x = -20.0 + u * 40.0
            vertices.append(blender_point(x, height(x, z), z))
    for row in range(rows):
        for col in range(cols):
            a = row * (cols + 1) + col
            b, c, d = a + 1, a + cols + 1, a + cols + 2
            faces.extend(((a, b, c), (b, d, c)))
    mesh = bpy.data.meshes.new("life-map-v210-continuous-terrain-mesh")
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    add_uv(mesh, vertices)
    obj = bpy.data.objects.new("life-map-v210-continuous-eroded-memory-sanctuary", mesh)
    bpy.context.collection.objects.link(obj)
    for mat in (DEEP, STONE, MOSS, MINERAL):
        mesh.materials.append(mat)
    for poly in mesh.polygons:
        poly.material_index = 0
    for poly in mesh.polygons:
        poly.use_smooth = True
    obj["authored_role"] = "continuous foreground-midground-background geology and traversable erosion path"
    return obj


def ridge(name, side, z0, length, width, lift, seed, mat):
    rng = random.Random(seed)
    sections = 18
    vertices, faces = [], []
    for i in range(sections + 1):
        t = i / sections
        z = z0 - t * length
        x = side * (10.2 + width * (0.35 + 0.48 * math.sin(t * math.pi)) + 0.55 * math.sin(t * 7.0 + seed))
        base = height(x, z) - 0.75
        crown = base + lift * (0.26 + 0.62 * math.sin(t * math.pi) ** 0.58) + rng.uniform(-0.16, 0.16)
        thickness = width * (0.7 + 0.22 * math.sin(t * 5.0 + seed))
        vertices.extend([
            (x - side * thickness, base, z + 0.65),
            (x - side * thickness * 0.46, crown * 0.73 + base * 0.27, z + 0.18),
            (x, crown, z),
            (x + side * thickness * 0.56, crown * 0.62 + base * 0.38, z - 0.28),
            (x + side * thickness, base, z - 0.62),
        ])
    for i in range(sections):
        for j in range(4):
            a = i * 5 + j
            b = a + 1
            c = (i + 1) * 5 + j
            d = c + 1
            faces.extend(((a, b, c), (b, d, c)))
    mesh = bpy.data.meshes.new(name + "-mesh")
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    add_uv(mesh, vertices)
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    mesh.materials.append(mat)
    bevel = obj.modifiers.new("weathered-softened-edges", "BEVEL")
    bevel.width, bevel.segments = 0.12, 2
    for poly in mesh.polygons:
        poly.use_smooth = True
    return obj


def organic_outcrop(name, location, scale, seed, mat):
    x, y, z = location
    sx, sy, sz = scale
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=3, radius=1.0, location=blender_point(x, y, z))
    obj = bpy.context.object
    obj.name = name
    obj.scale = (sx, sz, sy)
    mesh = obj.data
    for vertex in mesh.vertices:
        co = vertex.co
        n = 1.0 + 0.16 * math.sin(co.x * (4.3 + seed * 0.03) + co.y * 3.1) + 0.09 * math.cos(co.z * 5.7 - co.x * 2.4)
        co.x *= n
        co.y *= n
        co.z *= 0.9 + 0.2 * math.sin(co.x * 4.0 + seed)
    mesh.materials.append(mat)
    uv = obj.modifiers.new("authored-triplanar-uv", "UV_PROJECT")
    obj["seed"] = seed
    return obj


def integrated_relief(name, center, radii, rise, seed, primary, accent):
    """Create one authored landform continuously stitched to the terrain height."""
    cx, cz = center
    rx, rz = radii
    cols, rows = 28, 24
    vertices, faces = [], []
    for row in range(rows + 1):
        v = row / rows
        z = cz + (v - 0.5) * rz * 2.0
        for col in range(cols + 1):
            u = col / cols
            x = cx + (u - 0.5) * rx * 2.0
            radial = ((x - cx) / rx) ** 2 + ((z - cz) / rz) ** 2
            envelope = max(0.0, 1.0 - radial) ** 1.55
            folds = (
                0.70
                + 0.20 * math.sin((x - cx) * (1.15 + seed * 0.013) + (z - cz) * 0.54)
                + 0.11 * math.cos((z - cz) * 1.82 - seed)
            )
            scar = 0.30 * math.exp(-((x - cx - 0.35 * math.sin((z - cz) * 0.9 + seed)) / (rx * 0.18)) ** 2)
            lean = 0.16 * ((x - cx) / rx) + 0.08 * ((z - cz) / rz)
            authored_rise = rise * envelope * max(0.12, folds + lean - scar)
            terraced_rise = math.floor(authored_rise * 3.2) / 3.2
            y = height(x, z) + terraced_rise + 0.035 * math.sin((x + z) * 4.7 + seed)
            vertices.append(blender_point(x, y, z))
    for row in range(rows):
        for col in range(cols):
            a = row * (cols + 1) + col
            b, c, d = a + 1, a + cols + 1, a + cols + 2
            if (row + col + seed) % 2:
                faces.extend(((a, b, d), (a, d, c)))
            else:
                faces.extend(((a, b, c), (b, d, c)))
    mesh = bpy.data.meshes.new(name + "-mesh")
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    add_uv(mesh, vertices)
    mesh.materials.append(primary)
    for poly in mesh.polygons:
        poly.material_index = 0
        poly.use_smooth = True
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    bevel = obj.modifiers.new("weathered-relief-edges", "BEVEL")
    bevel.width, bevel.segments = 0.06, 2
    obj["authored_role"] = "terrain-integrated individually authored memory geology"
    return obj


def ribbon_surface(name, center, width, height_value, turns, seed, mat):
    columns, rows = 26, 10
    vertices, faces = [], []
    cx, cy, cz = center
    for row in range(rows + 1):
        v = row / rows
        for col in range(columns + 1):
            u = col / columns
            x = cx + (u - 0.5) * width
            y = cy + v * height_value + 0.22 * math.sin(u * math.pi * 3.0 + seed) * math.sin(v * math.pi)
            z = cz + math.sin(u * turns * math.pi + v * 2.6 + seed) * (0.3 + 0.48 * v) - 0.7 * v
            x += math.sin(v * 4.2 + u * 2.0 + seed) * 0.18
            vertices.append((x, y, z))
    for row in range(rows):
        for col in range(columns):
            a = row * (columns + 1) + col
            b, c, d = a + 1, a + columns + 1, a + columns + 2
            faces.extend(((a, b, c), (b, d, c)))
    mesh = bpy.data.meshes.new(name + "-mesh")
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    add_uv(mesh, vertices)
    mesh.materials.append(mat)
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    solid = obj.modifiers.new("folded-memory-thickness", "SOLIDIFY")
    solid.thickness = 0.11
    bevel = obj.modifiers.new("eroded-fold-edges", "BEVEL")
    bevel.width, bevel.segments = 0.055, 2
    for poly in mesh.polygons:
        poly.use_smooth = True
    return obj


def curve_trace(name, points, radius, mat):
    curve = bpy.data.curves.new(name + "-curve", "CURVE")
    curve.dimensions = "3D"
    curve.resolution_u = 2
    curve.bevel_depth = radius
    curve.bevel_resolution = 3
    spline = curve.splines.new("BEZIER")
    spline.bezier_points.add(len(points) - 1)
    for bp, point in zip(spline.bezier_points, points):
        bp.co = blender_point(*point)
        bp.handle_left_type = "AUTO"
        bp.handle_right_type = "AUTO"
    obj = bpy.data.objects.new(name, curve)
    bpy.context.collection.objects.link(obj)
    curve.materials.append(mat)
    return obj


def sculpted_memory_spine(name, origin, scale, seed, mat):
    """A grounded, open, asymmetric memory form with one continuous body."""
    ox, oy, oz = origin
    points = []
    count = 13
    for i in range(count):
        t = i / (count - 1)
        angle = -1.2 + t * (4.1 + 0.17 * math.sin(seed))
        radius = scale * (0.46 + 0.22 * math.sin(t * math.pi) + 0.09 * math.sin(t * 5.0 + seed))
        x = ox + math.cos(angle) * radius + scale * 0.24 * t
        y = oy + scale * (-0.16 + 1.46 * t + 0.18 * math.sin(t * 4.0 + seed))
        z = oz + math.sin(angle) * radius * 0.58 - scale * 0.34 * t
        points.append((x, y, z))
    obj = curve_trace(name, points, scale * 0.16, mat)
    obj.data.bevel_resolution = 2
    obj["authored_role"] = "grounded single-connected non-repetitive memory manifestation"
    return obj


def build_runtime():
    terrain()

    outcrops = [
        (-8.7, height(-8.7, 2.0), 2.0, (2.4, 1.15, 2.8), 11, MOSS),
        (8.2, height(8.2, -1.8), -1.8, (1.8, 1.7, 2.1), 23, STONE),
        (-9.8, height(-9.8, -7.8), -7.8, (2.8, 1.5, 2.0), 37, MINERAL),
        (9.6, height(9.6, -11.2), -11.2, (2.1, 2.2, 2.9), 43, MOSS),
        (-7.4, height(-7.4, -16.5), -16.5, (2.2, 2.8, 2.3), 59, STONE),
        (7.7, height(7.7, -20.2), -20.2, (3.0, 2.0, 2.6), 83, MINERAL),
    ]
    for i, (x, y, z, scale, seed, mat) in enumerate(outcrops, 1):
        organic_outcrop(f"life-map-v210-integrated-geologic-landmark-{i}", (x, y, z), scale, seed, mat)

    integrated_relief("life-map-v210-lineage-eroded-relief", (-5.1, -4.3), (2.8, 3.2), 1.9, 17, MOSS, WARM)
    integrated_relief("life-map-v210-lived-history-fold", (4.5, -7.8), (3.0, 3.7), 2.1, 31, STONE, VIOLET)
    integrated_relief("life-map-v210-relationship-weathering", (-2.6, -12.5), (3.4, 3.1), 1.7, 47, MINERAL, MOSS)
    integrated_relief("life-map-v210-accumulated-ascent", (3.0, -17.2), (3.7, 4.1), 2.8, 73, STONE, CYAN)
    integrated_relief("life-map-v210-distant-history-landmark", (-1.2, -24.0), (4.2, 3.8), 3.2, 101, MINERAL, VIOLET)

    # Small emissive mineral seams are embedded directly into major authored forms.
    for i, (x, z, mat) in enumerate([(-8.9, -4.8, CYAN), (8.7, -7.5, GOLD), (-7.9, -13.6, VIOLET), (7.2, -17.0, CYAN)], 1):
        points = []
        for j in range(6):
            px = x + (j - 2.5) * 0.28
            pz = z - 0.14 * math.sin(j * 1.7 + i)
            points.append((px, height(px, pz) + 0.16 + 0.06 * math.sin(j), pz))
        curve_trace(f"life-map-v210-localized-memory-emission-{i}", points, 0.035, mat)


def source_authority():
    collision_collection = bpy.data.collections.new("SOURCE_COLLISION_AND_TRAVERSAL")
    bpy.context.scene.collection.children.link(collision_collection)
    bpy.ops.mesh.primitive_cube_add(location=blender_point(0, -1.95, -18), scale=(5.2, 24.0, 0.24))
    proxy = bpy.context.object
    proxy.name = "life-map-v210-camera-safe-traversal-collision-proxy"
    for collection in list(proxy.users_collection):
        collection.objects.unlink(proxy)
    collision_collection.objects.link(proxy)
    proxy.hide_render = True
    proxy.hide_viewport = True
    collision_collection.hide_render = True
    collision_collection.hide_viewport = True
    proxy["source_only"] = True
    proxy["navigation"] = "continuous reversible overview-to-destination corridor"


def preview_setup():
    world = bpy.context.scene.world or bpy.data.worlds.new("Life Map Atmosphere")
    bpy.context.scene.world = world
    world.use_nodes = True
    world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.008, 0.025, 0.052, 1)
    world.node_tree.nodes["Background"].inputs["Strength"].default_value = 0.52
    bpy.ops.object.light_add(type="AREA", location=blender_point(7, 14, 10))
    key = bpy.context.object
    key.name, key.data.energy, key.data.shape, key.data.size = "SOURCE_preview_key", 2350, "DISK", 8
    key.data.color = (0.70, 0.90, 1.0)
    key.rotation_euler = (Vector(blender_point(0, -1.0, -8.0)) - key.location).to_track_quat("-Z", "Y").to_euler()
    bpy.ops.object.light_add(type="AREA", location=blender_point(-11, 8, -7))
    fill = bpy.context.object
    fill.name, fill.data.energy, fill.data.size = "SOURCE_preview_violet_fill", 1450, 10
    fill.data.color = (0.53, 0.38, 0.82)
    fill.rotation_euler = (Vector(blender_point(0, -1.5, -14.0)) - fill.location).to_track_quat("-Z", "Y").to_euler()
    bpy.ops.object.camera_add(location=blender_point(0, 1.55, 13.4))
    camera = bpy.context.object
    camera.name = "SOURCE_runtime-overview-camera"
    direction = Vector(blender_point(0, 0.12, -4.5)) - camera.location
    camera.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()
    camera.data.lens = 52
    bpy.context.scene.camera = camera
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE"
    scene.eevee.taa_render_samples = 32
    scene.render.resolution_x, scene.render.resolution_y, scene.render.resolution_percentage = 1280, 720, 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.filepath = str(PREVIEW_PATH)
    scene.render.film_transparent = False
    scene.view_settings.look = "AgX - Medium High Contrast"


def main():
    global STONE, MINERAL, MOSS, WARM, VIOLET, CYAN, GOLD, DEEP
    reset_scene()
    STONE = material("v210 weathered blue stone", (0.30, 0.41, 0.44))
    MINERAL = material("v210 warm mineral strata", (0.48, 0.42, 0.34))
    MOSS = material("v210 deep sanctuary moss", (0.20, 0.39, 0.33))
    WARM = material("v210 lived ochre memory", (0.52, 0.38, 0.26), emission=(0.55, 0.30, 0.14), emission_strength=0.12)
    VIOLET = material("v210 violet accumulated life", (0.36, 0.30, 0.48), emission=(0.40, 0.22, 0.62), emission_strength=0.18)
    CYAN = material("v210 cyan spatial trace", (0.22, 0.48, 0.50), emission=(0.18, 0.78, 0.82), emission_strength=0.55)
    GOLD = material("v210 lineage emission", (0.52, 0.39, 0.20), emission=(1.0, 0.58, 0.18), emission_strength=0.75)
    DEEP = material("v210 deep eroded ground", (0.25, 0.34, 0.35))
    apply_packed_strata_texture(DEEP)
    build_runtime()
    source_authority()
    preview_setup()
    scene = bpy.context.scene
    scene["asset_authority"] = "LifeLoggerAI/urai-spatial PR #1177"
    scene["generator_seed"] = SEED
    scene["license"] = "Original work for private LifeLoggerAI repository; no third-party assets"
    scene["design_bans"] = "no bowls, runways, slabs, gates, rings, repeated crystals, floating tokens, diagrams, or hidden test geometry"
    RUNTIME_DIR.mkdir(parents=True, exist_ok=True)
    MASTER_DIR.mkdir(parents=True, exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=str(BLEND_PATH), compress=True)
    bpy.ops.render.render(write_still=True)
    bpy.ops.export_scene.gltf(
        filepath=str(GLB_PATH),
        export_format="GLB",
        use_visible=True,
        export_cameras=False,
        export_lights=False,
        export_apply=True,
        export_texcoords=True,
        export_normals=True,
        export_materials="EXPORT",
        export_yup=True,
    )
    print(f"MASTER={BLEND_PATH}")
    print(f"PREVIEW={PREVIEW_PATH}")
    print(f"RUNTIME={GLB_PATH}")
    print(f"RUNTIME_BYTES={GLB_PATH.stat().st_size}")


if __name__ == "__main__":
    main()
