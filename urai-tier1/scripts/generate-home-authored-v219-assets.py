#!/usr/bin/env python3
import hashlib
import json
import math
from pathlib import Path

import numpy as np
import trimesh

ROOT = Path('urai-tier1/public/assets/urai/home-production/authored-v219')
ROOT.mkdir(parents=True, exist_ok=True)


def rgba(value, alpha=255):
    h = value.lstrip('#')
    return np.array([int(h[i:i + 2], 16) for i in (0, 2, 4)] + [alpha], dtype=np.uint8)


def grid_mesh(name, xs, zs, xlim, zlim, height_fn, color_fn):
    xv = np.linspace(xlim[0], xlim[1], xs + 1)
    zv = np.linspace(zlim[0], zlim[1], zs + 1)
    vertices, colors, faces = [], [], []
    for z in zv:
        for x in xv:
            y = height_fn(float(x), float(z))
            vertices.append((x, y, z))
            colors.append(color_fn(float(x), float(y), float(z)))
    for zi in range(zs):
        for xi in range(xs):
            a = zi * (xs + 1) + xi
            b, c, d = a + 1, a + xs + 1, a + xs + 2
            faces.extend(((a, b, d), (a, d, c)) if (xi + zi) & 1 else ((a, b, c), (b, d, c)))
    mesh = trimesh.Trimesh(vertices=np.asarray(vertices), faces=np.asarray(faces), process=False)
    mesh.visual.vertex_colors = np.asarray(colors, dtype=np.uint8)
    mesh.metadata['name'] = name
    mesh.fix_normals()
    return mesh


def noise(x, z):
    return (math.sin(x * .61 + z * .37) * .52 + math.sin(x * 1.47 - z * .83) * .22 +
            math.cos(x * 2.71 + z * 1.91) * .10 + math.sin((x + z) * 4.3) * .045)


def terrain_height(x, z):
    depth = np.clip((5.8 - z) / 24.0, 0, 1)
    lateral = abs(x) / 9.8
    channel = math.exp(-(x / 3.1) ** 4)
    side = lateral ** 2.35 * (.35 + depth * 2.8)
    shoulder = (
        math.exp(-(((x + 6.4) / 2.4) ** 2 + ((z + 4.0) / 5.8) ** 2)) * 1.45 +
        math.exp(-(((x - 6.7) / 2.2) ** 2 + ((z + 7.2) / 5.4) ** 2)) * 1.62 +
        math.exp(-(((x + 5.1) / 2.9) ** 2 + ((z + 13.5) / 4.2) ** 2)) * 1.72 +
        math.exp(-(((x - 4.1) / 3.1) ** 2 + ((z + 15.0) / 4.1) ** 2)) * 1.35
    )
    far = depth ** 3.0 * (3.4 + .55 * math.sin(x * .32 + .4) + .28 * math.cos(x * .71))
    erosion = noise(x, z) * (.16 + .50 * lateral) * (1 - .35 * channel)
    rills = abs(math.sin(x * .83 + z * 1.61)) ** 3 * .16 * (.25 + .75 * depth) * lateral ** .65
    trail = -.10 * math.exp(-(x / 1.45) ** 4) * (.4 + .6 * depth)
    return -.52 + .06 * depth + side + shoulder + far + erosion - rills + trail


def terrain_color(x, y, z):
    depth = np.clip((5.8 - z) / 24.0, 0, 1)
    lateral = np.clip(abs(x) / 9.8, 0, 1)
    band = .5 + .5 * math.sin(y * 6.7 + x * .48 - z * .29)
    base = np.array([30, 54, 45], float)
    moss = np.array([70, 91, 70], float)
    mineral = np.array([115, 94, 73], float)
    cool = np.array([52, 77, 78], float)
    amount = .28 + .28 * (1 - lateral)
    c = base * (1 - amount) + moss * amount
    c = c * (1 - .18 * band) + mineral * (.18 * band)
    c = c * (1 - .08 * depth) + cool * (.08 * depth)
    return np.r_[np.clip(c, 0, 255), 255].astype(np.uint8)


def deformed_icosphere(scale, seed, subdivisions, color_hex):
    mesh = trimesh.creation.icosphere(subdivisions=subdivisions, radius=1.0)
    vertices = mesh.vertices.copy()
    radial = (1 + .10 * np.sin(vertices[:, 0] * 7.3 + seed) +
              .07 * np.cos(vertices[:, 1] * 9.1 - seed * .4) +
              .045 * np.sin(vertices[:, 2] * 13.7 + seed * 1.3))
    mesh.vertices = vertices * radial[:, None] * np.array(scale)
    mesh.fix_normals()
    colors = np.tile(rgba(color_hex), (len(mesh.vertices), 1))
    light = np.clip((mesh.vertex_normals[:, 1] + 1) * .5, 0, 1)
    colors[:, :3] = (colors[:, :3] * (.78 + .22 * light[:, None])).astype(np.uint8)
    mesh.visual.vertex_colors = colors
    return mesh


def make_landscape():
    scene = trimesh.Scene()
    ground = grid_mesh('home-v219-continuous-weathered-sanctuary', 84, 112, (-9.8, 9.8), (5.8, -18.2), terrain_height, terrain_color)
    scene.add_geometry(ground, node_name=ground.metadata['name'])
    formations = [
        (-8.4, .15, -4.2, (3.6, 1.9, 3.3), .20, '#40594b'),
        (-9.1, .75, -10.0, (4.2, 2.8, 4.1), -.12, '#384e44'),
        (-7.4, 2.15, -16.2, (5.1, 3.8, 4.2), .25, '#32483f'),
        (8.5, .25, -5.4, (3.8, 2.1, 3.4), -.18, '#425d50'),
        (9.0, 1.0, -11.2, (4.4, 3.0, 4.0), .16, '#395047'),
        (7.2, 2.35, -16.8, (5.2, 4.0, 4.3), -.24, '#334940'),
    ]
    for index, (x, y, z, scale, yaw, tone) in enumerate(formations):
        rock = deformed_icosphere(scale, 21 + index, 3, tone)
        transform = trimesh.transformations.rotation_matrix(yaw, [0, 1, 0])
        transform[:3, 3] = [x, y, z]
        rock.apply_transform(transform)
        rock.metadata['name'] = f'home-v219-integrated-ridge-{index + 1}'
        scene.add_geometry(rock, node_name=rock.metadata['name'])
    ledges = [(-7.8, -8.0, 5.0, 1.5, .18), (7.7, -9.2, 4.8, 1.35, -.20),
              (-5.7, -14.5, 5.6, 1.55, .26), (5.2, -15.6, 5.8, 1.45, -.22)]
    for index, (x, z, width, depth, yaw) in enumerate(ledges):
        def height_fn(xx, zz, i=index):
            return -.05 + .18 * math.sin(xx * .55 + i) + .10 * math.cos(zz * .8 - i) + .08 * noise(xx, zz)
        def color_fn(xx, yy, zz, i=index):
            return rgba('#6c5a47') if math.sin((xx + zz) * 1.7 + i) > .1 else rgba('#3b5045')
        ledge = grid_mesh(f'home-v219-eroded-strata-{index + 1}', 40, 18, (-width / 2, width / 2), (-depth / 2, depth / 2), height_fn, color_fn)
        transform = trimesh.transformations.rotation_matrix(yaw, [0, 1, 0])
        transform[:3, 3] = [x, terrain_height(x, z) + .34, z]
        ledge.apply_transform(transform)
        scene.add_geometry(ledge, node_name=ledge.metadata['name'])
    return scene


def make_ground_place():
    scene = trimesh.Scene()
    items = [
        ('ground-v219-rooted-weathered-shelf', (2.5, .55, 2.15), 31, '#536f60', (0, -.30, 0)),
        ('ground-v219-eroded-shelter', (2.65, 1.45, .72), 44, '#40594c', (-.35, .42, -1.55)),
        ('ground-v219-embedded-memory-hearth', (.74, .17, .62), 63, '#9b7855', (-.38, -.03, -.18)),
        ('ground-v219-integrated-shoulder-1', (1.2, .42, 1.0), 70, '#476253', (-1.65, -.18, .35)),
        ('ground-v219-integrated-shoulder-2', (1.15, .50, 1.15), 71, '#476253', (1.45, -.18, -.15)),
    ]
    for name, scale, seed, tone, translation in items:
        mesh = deformed_icosphere(scale, seed, 3 if 'hearth' not in name else 4, tone)
        mesh.apply_translation(translation)
        mesh.metadata['name'] = name
        scene.add_geometry(mesh, node_name=name)
    return scene


def make_life_map_place():
    scene = trimesh.Scene()
    spine = deformed_icosphere((1.15, 2.35, .92), 91, 4, '#4d5368')
    transform = trimesh.transformations.rotation_matrix(-.22, [0, 0, 1]); transform[:3, 3] = [.15, .95, -.45]
    spine.apply_transform(transform); spine.metadata['name'] = 'lifemap-v219-ascending-memory-spine'; scene.add_geometry(spine, node_name=spine.metadata['name'])
    base = deformed_icosphere((2.25, .45, 1.85), 103, 3, '#4b5260')
    base.apply_translation([0, -.28, .15]); base.metadata['name'] = 'lifemap-v219-rooted-observatory-foundation'; scene.add_geometry(base, node_name=base.metadata['name'])
    shelves = [(-1.0, .40, -.10, (1.25, .18, .62), .22, '#6b617b'), (.82, .78, -.18, (1.35, .16, .58), -.18, '#625a75'),
               (-.58, 1.18, -.34, (1.05, .15, .52), .28, '#76698b'), (.48, 1.55, -.48, (.92, .14, .46), -.24, '#706685')]
    for index, (x, y, z, scale, roll, tone) in enumerate(shelves):
        mesh = deformed_icosphere(scale, 120 + index, 3, tone)
        transform = trimesh.transformations.rotation_matrix(roll, [0, 0, 1]); transform[:3, 3] = [x, y, z]
        mesh.apply_transform(transform); mesh.metadata['name'] = f'lifemap-v219-memory-stratum-{index + 1}'
        scene.add_geometry(mesh, node_name=mesh.metadata['name'])
    return scene


def make_orb():
    nu, nv = 64, 36
    vertices, colors, faces = [], [], []
    for j in range(nv + 1):
        v = j / nv; phi = math.pi * v
        for i in range(nu):
            u = i / nu; theta = 2 * math.pi * u
            lobes = .16 * math.sin(3 * theta + phi * .7) + .10 * math.sin(5 * theta - phi * 1.3) + .07 * math.cos(2 * theta + phi * 2.1)
            bias = .15 * math.cos(theta - .6) * math.sin(phi) ** 2 + .08 * math.sin(theta * 2 + .8) * math.sin(phi)
            radius = .72 * (1 + lobes + bias)
            x = radius * math.sin(phi) * math.cos(theta) * (.88 + .12 * math.cos(phi))
            z = radius * math.sin(phi) * math.sin(theta) * (.72 + .12 * math.sin(theta + .5))
            y = .98 * math.cos(phi) + .16 * math.sin(2 * phi + theta * .8) + .08 * math.cos(3 * phi - theta)
            x += .12 * (1 - v) * math.sin(phi) - .10 * v * math.sin(theta)
            z += .06 * math.cos(theta * 2 + phi)
            vertices.append((x, y, z))
            layer = .5 + .5 * math.sin(phi * 9 + theta * 2.4)
            c = np.array([42, 96, 79], float) * (1 - .35 * layer) + np.array([106, 169, 143], float) * (.35 * layer)
            warm = max(0, math.cos(theta - .8)) * math.sin(phi) ** 3
            c = c * (1 - .16 * warm) + np.array([196, 146, 94], float) * (.16 * warm)
            colors.append(np.r_[np.clip(c, 0, 255), 255].astype(np.uint8))
    for j in range(nv):
        for i in range(nu):
            ni = (i + 1) % nu
            a, b = j * nu + i, j * nu + ni
            c, d = (j + 1) * nu + i, (j + 1) * nu + ni
            faces.extend(((a, b, c), (b, d, c)))
    outer = trimesh.Trimesh(vertices=np.asarray(vertices), faces=np.asarray(faces), process=False)
    outer.visual.vertex_colors = np.asarray(colors, dtype=np.uint8); outer.fix_normals(); outer.metadata['name'] = 'orb-v219-connected-asymmetric-memory-mantle'
    inner = outer.copy(); inner.apply_scale(.78); inner.apply_translation([.03, -.02, -.04]); inner.visual.vertex_colors = np.tile(rgba('#173b32', 220), (len(inner.vertices), 1)); inner.metadata['name'] = 'orb-v219-inner-memory-depth'
    scene = trimesh.Scene(); scene.add_geometry(outer, node_name=outer.metadata['name']); scene.add_geometry(inner, node_name=inner.metadata['name'])
    return scene


def export(scene, filename):
    path = ROOT / filename
    data = scene.export(file_type='glb')
    path.write_bytes(data)
    return {'file': filename, 'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest()}


assets = [
    export(make_landscape(), 'home-continuous-landscape-v219.glb'),
    export(make_ground_place(), 'home-ground-place-v219.glb'),
    export(make_life_map_place(), 'home-life-map-place-v219.glb'),
    export(make_orb(), 'urai-living-memory-presence-v219.glb'),
]
(ROOT / 'provenance.json').write_text(json.dumps({
    'schemaVersion': 'urai-authored-home-v219-1',
    'revision': 'v219',
    'generator': 'urai-tier1/scripts/generate-home-authored-v219-assets.py',
    'intent': 'replace literally rejected V191 low-poly basin/place/orb art without weakening visual gates',
    'assets': assets,
}, indent=2) + '\n')
print(json.dumps(assets, indent=2))
