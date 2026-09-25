#!/usr/bin/env python3
import hashlib
import json
import math
from pathlib import Path

import numpy as np
import trimesh

# V224 topology intentionally retains the governed authored-v191 transport path;
# runtime authority is V223+ and this generator is the current editable source.
OUT = Path('urai-tier1/public/assets/urai/home-production/authored-v191')
OUT.mkdir(parents=True, exist_ok=True)


def rgba(h, a=255):
    h = h.lstrip('#')
    return np.array([int(h[i:i + 2], 16) for i in (0, 2, 4)] + [a], dtype=np.uint8)


def color_mix(a, b, t):
    return np.clip(np.array(a, float) * (1 - t) + np.array(b, float) * t, 0, 255).astype(np.uint8)


def named(mesh, name):
    mesh.metadata['name'] = name
    return mesh


def floor_height(x, z):
    depth = np.clip((5.8 - z) / 24.0, 0, 1)
    lateral = abs(x) / 8.6
    bowl = 0.48 * (lateral ** 2.35) * (0.35 + 0.8 * depth)
    und = (0.055 * math.sin(x * 0.65 + z * 0.28) +
           0.035 * math.sin(x * 1.7 - z * 0.43) +
           0.018 * math.cos(x * 3.1 + z * 1.1))
    meander = -0.09 * math.exp(-((x - 0.35 * math.sin((z + 4) * 0.22)) / 1.55) ** 4)
    g = -0.20 * math.exp(-(((x + 4.85) / 1.7) ** 2 + ((z + 8.25) / 2.1) ** 2))
    l = -0.18 * math.exp(-(((x - 4.85) / 1.7) ** 2 + ((z + 8.25) / 2.1) ** 2))
    return -0.58 + 0.08 * depth + bowl + und + meander + g + l


def make_floor(nx=100, nz=100):
    xs = np.linspace(-8.6, 8.6, nx + 1)
    zs = np.linspace(5.8, -18.2, nz + 1)
    verts, faces, cols = [], [], []
    dark, moss, mineral, cool = rgba('#172d29'), rgba('#4f6959'), rgba('#806d55'), rgba('#3d6265')
    for z in zs:
        for x in xs:
            xx = x + 0.07 * math.sin(z * 0.53 + x * 0.19) * (abs(x) / 8.6) ** 1.4
            zz = z + 0.045 * math.sin(x * 0.72 - z * 0.17)
            y = floor_height(xx, zz)
            verts.append((xx, y, zz))
            lateral = min(1, abs(xx) / 8.6)
            depth = np.clip((5.8 - zz) / 24, 0, 1)
            t = 0.28 + 0.38 * (1 - lateral) + 0.08 * math.sin(xx * 0.8 - zz * 0.22)
            c = color_mix(dark, moss, np.clip(t, 0, 1))
            c = color_mix(c, mineral, 0.10 + 0.09 * (0.5 + 0.5 * math.sin(y * 8 + xx * 0.4)))
            c = color_mix(c, cool, 0.06 * depth)
            cols.append(c)
    for j in range(nz):
        for i in range(nx):
            a = j * (nx + 1) + i
            b, c, d = a + 1, a + nx + 1, a + nx + 2
            faces.extend(((a, b, d), (a, d, c)) if (i + j) & 1 else ((a, b, c), (b, d, c)))
    mesh = trimesh.Trimesh(np.asarray(verts), np.asarray(faces), process=False)
    mesh.visual.vertex_colors = np.asarray(cols, dtype=np.uint8)
    mesh.fix_normals()
    return named(mesh, 'home-v224-sculpted-sanctuary-floor')


def cliff_ribbon(side, z0, z1, seed, layer):
    ns, nv = 34, 9
    verts, faces, cols = [], [], []
    base, lit, warm = rgba('#263d35'), rgba('#67745d'), rgba('#7b654e')
    for j in range(ns + 1):
        s = j / ns
        z = z0 + (z1 - z0) * s
        depth = np.clip((5.8 - z) / 24, 0, 1)
        base_x = side * (5.35 + 0.55 * math.sin(z * 0.24 + seed) + 0.18 * math.sin(z * 0.77 - seed))
        base_y = floor_height(base_x * 0.92, z) - 0.05
        height = 1.8 + 2.15 * depth + 0.35 * math.sin(z * 0.31 + seed)
        for k in range(nv + 1):
            t = k / nv
            overhang = (0.15 + 0.72 * math.sin(t * math.pi) ** 1.7) * (0.55 + 0.45 * depth)
            x = base_x - side * overhang + side * 0.08 * math.sin(t * 8 + z * 0.3 + layer)
            y = base_y + t * height + 0.10 * math.sin(t * 9 + z * 0.45 + seed)
            zz = z + 0.10 * math.sin(t * math.pi * 2 + seed + s * 4)
            verts.append((x, y, zz))
            band = 0.5 + 0.5 * math.sin(y * 5.4 + z * 0.7 + layer)
            c = color_mix(base, lit, 0.18 + 0.42 * t)
            cols.append(color_mix(c, warm, 0.12 * band))
    row = nv + 1
    for j in range(ns):
        for k in range(nv):
            a, b, c, d = j * row + k, j * row + k + 1, (j + 1) * row + k, (j + 1) * row + k + 1
            faces.extend(((a, b, c), (b, d, c)))
    mesh = trimesh.Trimesh(np.asarray(verts), np.asarray(faces), process=False)
    mesh.visual.vertex_colors = np.asarray(cols, dtype=np.uint8)
    mesh.fix_normals()
    return named(mesh, f'home-v224-{"port" if side < 0 else "starboard"}-weathered-strata-{layer}')


def tube_mesh(points, radii, segments=10, name='tube', tone='#405c50', accent='#80684e'):
    pts = np.asarray(points, float)
    verts, faces, cols = [], [], []
    base, hi = rgba(tone), rgba(accent)
    for i, p in enumerate(pts):
        tangent = pts[1] - p if i == 0 else p - pts[i - 1] if i == len(pts) - 1 else pts[i + 1] - pts[i - 1]
        tangent /= np.linalg.norm(tangent) + 1e-9
        ref = np.array([0, 1, 0], float)
        if abs(np.dot(ref, tangent)) > .9:
            ref = np.array([1, 0, 0], float)
        normal = np.cross(tangent, ref); normal /= np.linalg.norm(normal) + 1e-9
        binormal = np.cross(tangent, normal); binormal /= np.linalg.norm(binormal) + 1e-9
        for j in range(segments):
            a = 2 * math.pi * j / segments
            wobble = 1 + 0.10 * math.sin(a * 3 + i * 0.73) + 0.04 * math.sin(a * 5 - i * 0.31)
            verts.append(p + (normal * math.cos(a) + binormal * math.sin(a)) * radii[i] * wobble)
            cols.append(color_mix(base, hi, 0.10 + 0.18 * (0.5 + 0.5 * math.sin(a + i * 0.4))))
    for i in range(len(pts) - 1):
        for j in range(segments):
            nj = (j + 1) % segments
            a, b, c, d = i * segments + j, i * segments + nj, (i + 1) * segments + j, (i + 1) * segments + nj
            faces.extend(((a, b, c), (b, d, c)))
    mesh = trimesh.Trimesh(np.asarray(verts), np.asarray(faces), process=False)
    mesh.visual.vertex_colors = np.asarray(cols, dtype=np.uint8)
    mesh.fix_normals()
    return named(mesh, name)


def wall_rib(side, index):
    z0 = 2.3 - index * 2.45
    pts, radii = [], []
    for i in range(18):
        t = i / 17
        z = z0 - 3.9 * t + 0.18 * math.sin(t * math.pi * 2 + index)
        edge = side * (5.25 - 0.45 * math.sin(t * math.pi) + 0.18 * math.sin(index * 1.7))
        y = floor_height(edge * 0.95, z) + 0.15 + 2.8 * math.sin(t * math.pi) ** 1.15
        x = edge - side * (0.45 + 0.45 * math.sin(t * math.pi))
        pts.append((x, y, z)); radii.append(0.28 * (1 - 0.38 * t) + 0.05 * math.sin(t * math.pi))
    return tube_mesh(pts, radii, 9, f'home-v224-rooted-memory-rib-{index + 1}', '#334c41', '#816c52')


def distant_rib(side, index):
    z = -11.0 - index * 1.7
    pts, radii = [], []
    for i in range(17):
        t = i / 16
        pts.append((side * (7.0 - 2.0 * math.sin(t * math.pi) ** 1.3),
                    0.45 + 4.5 * math.sin(t * math.pi) ** 1.1 + index * 0.18,
                    z - 1.25 * t + 0.22 * math.sin(t * math.pi * 2 + index)))
        radii.append(0.33 * (1 - 0.45 * t) + 0.04)
    return tube_mesh(pts, radii, 10, f'home-v224-distant-strata-buttress-{side}_{index + 1}', '#2b433a', '#6d5f4b')


def make_landscape():
    scene = trimesh.Scene()
    floor = make_floor(); scene.add_geometry(floor, node_name=floor.metadata['name'])
    segments = [(3.2, -2.4), (-2.0, -7.8), (-7.4, -13.2), (-12.8, -18.2)]
    layer = 1
    for side in (-1, 1):
        for idx, (a, b) in enumerate(segments):
            mesh = cliff_ribbon(side, a, b, 10 + idx + side * 2, layer); layer += 1
            scene.add_geometry(mesh, node_name=mesh.metadata['name'])
    for i in range(8):
        mesh = wall_rib(-1 if i % 2 == 0 else 1, i)
        scene.add_geometry(mesh, node_name=mesh.metadata['name'])
    for i in range(8):
        mesh = distant_rib(-1 if i % 2 == 0 else 1, i // 2)
        scene.add_geometry(mesh, node_name=mesh.metadata['name'])
    assert len(scene.geometry) == 25
    return scene


def patch_mesh(name, w=5.2, d=5.4, nx=40, nz=32, kind='ground'):
    xs, zs = np.linspace(-w / 2, w / 2, nx + 1), np.linspace(-d / 2, d / 2, nz + 1)
    verts, faces, cols = [], [], []
    base = rgba('#3d5a4c' if kind == 'ground' else '#4c4b60')
    hi = rgba('#7a8d72' if kind == 'ground' else '#77708c')
    for z in zs:
        for x in xs:
            r = (x / (w / 2)) ** 2 + (z / (d / 2)) ** 2
            y = -0.18 + 0.15 * math.cos(x * 0.9) * math.cos(z * 0.7) - 0.28 * max(0, r - 0.35) + 0.06 * math.sin(x * 2.5 + z)
            y -= 0.16 * max(0, z / (d / 2))
            verts.append((x, y, z)); cols.append(color_mix(base, hi, 0.20 + 0.33 * (1 - min(1, r))))
    for j in range(nz):
        for i in range(nx):
            a, b, c, q = j * (nx + 1) + i, j * (nx + 1) + i + 1, (j + 1) * (nx + 1) + i, (j + 1) * (nx + 1) + i + 1
            faces.extend(((a, b, c), (b, q, c)))
    mesh = trimesh.Trimesh(np.asarray(verts), np.asarray(faces), process=False)
    mesh.visual.vertex_colors = np.asarray(cols); mesh.fix_normals(); return named(mesh, name)


def curved_shelter(name, kind='ground'):
    nu, nv = 52, 15
    verts, faces, cols = [], [], []
    base = rgba('#365345' if kind == 'ground' else '#4a465d'); hi = rgba('#88735c' if kind == 'ground' else '#87779c')
    for i in range(nu + 1):
        u = i / nu; angle = math.radians(205 + 130 * u); radius = 2.15 + 0.22 * math.sin(u * math.pi * 3)
        bx, bz = radius * math.cos(angle), -0.7 + radius * math.sin(angle)
        for j in range(nv + 1):
            v = j / nv; h = (1.55 + 0.45 * math.sin(u * math.pi)) * v
            x = bx + 0.18 * math.cos(angle) * v + 0.05 * math.sin(v * 8 + u * 10)
            z = bz + 0.18 * math.sin(angle) * v
            y = -0.10 + h + 0.06 * math.sin(u * 13 + v * 5) - 0.22 * (v ** 5) * (0.5 + 0.5 * math.sin(u * 17))
            verts.append((x, y, z)); cols.append(color_mix(base, hi, 0.16 + 0.32 * v))
    row = nv + 1
    for i in range(nu):
        for j in range(nv):
            a, b, c, d = i * row + j, i * row + j + 1, (i + 1) * row + j, (i + 1) * row + j + 1
            faces.extend(((a, b, c), (b, d, c)))
    mesh = trimesh.Trimesh(np.asarray(verts), np.asarray(faces), process=False)
    mesh.visual.vertex_colors = np.asarray(cols); mesh.fix_normals(); return named(mesh, name)


def ribbon_path(name, kind='ground'):
    n, cross = 48, 7
    verts, faces, cols, centers = [], [], [], []
    base = rgba('#6d6858' if kind == 'ground' else '#69657f'); hi = rgba('#a58964' if kind == 'ground' else '#9a88b2')
    for i in range(n + 1):
        t = i / n
        centers.append(np.array([(0.25 if kind == 'ground' else -0.2) + 0.5 * math.sin(t * math.pi * 1.6) * (1 - t * .3),
                                 -0.13 + 0.16 * t + (0.02 if kind == 'ground' else 0.09 * t),
                                 2.6 - 4.8 * t]))
    for i, center in enumerate(centers):
        tangent = centers[min(i + 1, n)] - centers[max(0, i - 1)]; tangent /= np.linalg.norm(tangent) + 1e-9
        side = np.array([tangent[2], 0, -tangent[0]]); side /= np.linalg.norm(side) + 1e-9
        for j in range(cross):
            s = j / (cross - 1) - .5; width = (0.78 if kind == 'ground' else 0.72) * (0.85 + 0.15 * math.sin(i * .25))
            p = center + side * s * width; p[1] += 0.035 * math.cos(s * math.pi * 2)
            verts.append(p); cols.append(color_mix(base, hi, 0.18 + 0.28 * (1 - abs(s) * 2)))
    for i in range(n):
        for j in range(cross - 1):
            a, b, c, d = i * cross + j, i * cross + j + 1, (i + 1) * cross + j, (i + 1) * cross + j + 1
            faces.extend(((a, b, c), (b, d, c)))
    mesh = trimesh.Trimesh(np.asarray(verts), np.asarray(faces), process=False)
    mesh.visual.vertex_colors = np.asarray(cols); mesh.fix_normals(); return named(mesh, name)


def organic_mound(name):
    mesh = trimesh.creation.icosphere(subdivisions=4, radius=1)
    v = mesh.vertices.copy(); r = 1 + 0.08 * np.sin(v[:, 0] * 7.1 + v[:, 2] * 5.3) + 0.04 * np.cos(v[:, 1] * 13)
    mesh.vertices = v * r[:, None] * np.array((.7, .2, .6)); mesh.vertices[:, 1] -= .03; mesh.fix_normals()
    base, amber = rgba('#9e7952'), rgba('#e3b071'); t = np.clip((mesh.vertices[:, 1] / .2 + .8) / 1.6, 0, 1)
    mesh.visual.vertex_colors = np.array([color_mix(base, amber, 0.12 + 0.30 * float(x)) for x in t])
    return named(mesh, name)


def make_ground():
    scene = trimesh.Scene()
    items = [patch_mesh('home-v197-ground-integrated-weathered-foundation', kind='ground'),
             curved_shelter('home-v197-ground-continuous-sheltering-memory-wall', 'ground'),
             ribbon_path('home-v197-ground-grown-in-place-memory-path', 'ground'),
             organic_mound('home-v203-ground-embedded-weathered-hearth')]
    items[-1].apply_translation([-.55, -.02, -.75])
    for mesh in items: scene.add_geometry(mesh, node_name=mesh.metadata['name'])
    assert len(scene.geometry) == 4
    return scene


def life_wall():
    nu, nv = 60, 18
    verts, faces, cols = [], [], []
    base, hi = rgba('#403d52'), rgba('#806f94')
    for i in range(nu + 1):
        u = i / nu; x = -2.3 + 4.6 * u
        peaks = (1.1 * math.exp(-((x + 1.2) / .7) ** 2) + 1.65 * math.exp(-((x - .05) / .75) ** 2) + 1.25 * math.exp(-((x - 1.4) / .65) ** 2))
        maxh = 0.55 + peaks
        for j in range(nv + 1):
            v = j / nv; y = -.05 + v * maxh
            z = -1.55 - 0.40 * v + 0.22 * math.sin(x * 1.35) + 0.06 * math.sin(v * 9 + x * 4)
            y -= 0.18 * (v ** 5) * (0.5 + 0.5 * math.sin(x * 5.7))
            verts.append((x, y, z)); cols.append(color_mix(base, hi, 0.12 + 0.42 * v))
    row = nv + 1
    for i in range(nu):
        for j in range(nv):
            a, b, c, d = i * row + j, i * row + j + 1, (i + 1) * row + j, (i + 1) * row + j + 1
            faces.extend(((a, b, c), (b, d, c)))
    mesh = trimesh.Trimesh(np.asarray(verts), np.asarray(faces), process=False)
    mesh.visual.vertex_colors = np.asarray(cols); mesh.fix_normals(); return named(mesh, 'home-v200-life-map-integrated-weathered-memory-ledger-1')


def make_lifemap():
    scene = trimesh.Scene()
    for mesh in [patch_mesh('home-v197-life-map-integrated-memory-observatory-foundation', w=5.6, d=5.0, kind='life'),
                 life_wall(), ribbon_path('home-v197-life-map-ascending-observatory-path', 'life')]:
        scene.add_geometry(mesh, node_name=mesh.metadata['name'])
    for k in range(4):
        pts, radii = [], []
        for i in range(22):
            t = i / 21
            pts.append((-1.7 + k * 1.05 + 0.22 * math.sin(t * math.pi * 2 + k),
                        0.02 + 0.18 * t + 0.10 * k * t,
                        1.6 - 3.2 * t + 0.12 * math.sin(t * math.pi * 3 + k)))
            radii.append(0.025 + 0.008 * math.sin(t * math.pi))
        mesh = tube_mesh(pts, radii, 6, f'home-v203-life-map-embedded-lineage-trace-{k + 1}', '#6f688a', '#b7a1cb')
        scene.add_geometry(mesh, node_name=mesh.metadata['name'])
    assert len(scene.geometry) == 7
    return scene


def make_orb():
    nu, nv = 96, 64
    verts, faces, cols = [], [], []
    deep, teal, warm, pale = rgba('#193a35'), rgba('#5aa88f'), rgba('#c08c66'), rgba('#9cc8b6')
    for j in range(nv + 1):
        v = j / nv; phi = math.pi * v; sy, s = math.cos(phi), math.sin(phi)
        for i in range(nu):
            theta = 2 * math.pi * i / nu
            upper = 0.18 * max(0, sy) ** 1.4
            width = (0.66 + 0.28 * upper + 0.10 * math.sin(theta * 3 + phi * 1.3)) * s
            depth = (0.54 + 0.07 * math.sin(theta * 2.2 - phi)) * s
            x, z, y = width * math.cos(theta), depth * math.sin(theta), 0.92 * sy
            crown = max(0, sy) ** 2
            y += 0.16 * crown * (abs(math.cos(theta)) ** 1.6) - 0.11 * crown * math.exp(-(math.cos(theta) / .24) ** 2)
            taper = 0.72 + 0.28 * (v < 0.55) + 0.12 * math.cos(theta - .55) * s * s
            x *= taper; z *= 0.90 + 0.08 * math.sin(theta + .4) * s
            x += 0.09 * s * s * math.cos(theta - .7) - 0.05 * v; z += 0.045 * math.sin(theta * 2 + phi * 1.7) * s
            ang = ((theta - 0.55 + math.pi) % (2 * math.pi)) - math.pi
            dimple = math.exp(-(ang / .48) ** 2 - ((phi - 1.15) / .48) ** 2)
            x *= 1 - 0.14 * dimple; z *= 1 - 0.19 * dimple; y -= 0.06 * dimple
            ripple = 1 + 0.018 * math.sin(phi * 13 + theta * 2.5) + 0.010 * math.sin(phi * 21 - theta * 4)
            x *= ripple; z *= ripple; y *= 1 + 0.009 * math.sin(theta * 5 + phi * 7)
            verts.append((x, y, z))
            band = 0.5 + 0.5 * math.sin(phi * 8.5 + theta * 2.2)
            c = color_mix(deep, teal, 0.28 + 0.34 * band)
            c = color_mix(c, pale, 0.10 * max(0, math.cos(theta - .6)) * s)
            cols.append(color_mix(c, warm, 0.14 * max(0, math.cos(theta + 1.0)) * s ** 2))
    for j in range(nv):
        for i in range(nu):
            ni = (i + 1) % nu
            a, b, c, d = j * nu + i, j * nu + ni, (j + 1) * nu + i, (j + 1) * nu + ni
            faces.extend(((a, b, c), (b, d, c)))
    mesh = trimesh.Trimesh(np.asarray(verts), np.asarray(faces), process=False)
    mesh.visual.vertex_colors = np.asarray(cols); mesh.fix_normals()
    return named(mesh, 'home-v201-single-connected-folded-living-memory-mantle')


def export(scene, filename):
    data = scene.export(file_type='glb')
    path = OUT / filename; path.write_bytes(data)
    return {'file': filename, 'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest()}


assets = [
    export(make_landscape(), 'home-continuous-landscape-v191.glb'),
    export(make_ground(), 'home-ground-place-v191.glb'),
    export(make_lifemap(), 'home-life-map-place-v191.glb'),
    export(trimesh.Scene(make_orb()), 'urai-living-memory-heart-v191.glb'),
]
print(json.dumps(assets, indent=2))
