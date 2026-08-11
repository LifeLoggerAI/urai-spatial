#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import json
import math
from pathlib import Path
import numpy as np
import trimesh
from trimesh.visual.material import PBRMaterial
from trimesh.visual.texture import TextureVisuals
from trimesh.transformations import rotation_matrix, translation_matrix

REPO_ROOT = Path(__file__).resolve().parents[1]
OUT_ROOT = REPO_ROOT / 'urai-tier1' / 'public' / 'assets' / 'urai' / 'generated' / 'real-world-v1'
RECEIPT = REPO_ROOT / 'operations' / 'assets' / 'generated-receipts' / 'urai-real-world-extension-v1.json'
OUT_ROOT.mkdir(parents=True, exist_ok=True)
RECEIPT.parent.mkdir(parents=True, exist_ok=True)


def rgba(hex_color: str, alpha=255):
    h = hex_color.lstrip('#')
    return [int(h[i:i+2], 16) for i in (0, 2, 4)] + [alpha]


def material(name, color, rough=.7, metal=.0, alpha=1.0):
    return PBRMaterial(name=name, baseColorFactor=rgba(color, round(alpha * 255)), metallicFactor=float(metal), roughnessFactor=float(rough), alphaMode='BLEND' if alpha < .999 else 'OPAQUE')


M = {
    'skin_warm': material('skin-warm', '#b8795e', .56),
    'skin_deep': material('skin-deep', '#704837', .56),
    'skin_brown': material('skin-brown', '#925d46', .56),
    'skin_light': material('skin-light', '#d0a183', .56),
    'skin_olive': material('skin-olive', '#aa765c', .56),
    'hair_dark': material('hair-dark', '#211814', .96),
    'hair_black': material('hair-black', '#111111', .96),
    'hair_gray': material('hair-gray', '#67615b', .96),
    'hair_brown': material('hair-brown', '#4b3327', .96),
    'eye_white': material('eye-white', '#f3f1eb', .25),
    'eye_dark': material('eye-dark', '#263431', .2),
    'lip': material('lip', '#7c4842', .68),
    'cloth_navy': material('cloth-navy', '#293b50', .9),
    'cloth_slate': material('cloth-slate', '#555c63', .92),
    'cloth_earth': material('cloth-earth', '#66574a', .92),
    'cloth_cream': material('cloth-cream', '#b7ad9d', .93),
    'cloth_charcoal': material('cloth-charcoal', '#303033', .93),
    'trouser': material('trouser', '#25292e', .94),
    'shoe': material('shoe', '#171717', .78, .02),
    'stone': material('stone', '#716e67', .96, .01),
    'stone_dark': material('stone-dark', '#393837', .97, .01),
    'stone_warm': material('stone-warm', '#85786a', .93, .01),
    'wood': material('wood', '#513a2b', .86, .01),
    'wood_dark': material('wood-dark', '#36261d', .9, .01),
    'bronze': material('bronze', '#6b5338', .48, .52),
    'iron': material('iron', '#3c3e40', .42, .62),
    'glass': material('glass', '#879eaa', .08, .0, .30),
    'mirror': material('mirror', '#b7c3c9', .05, .76, .65),
    'water': material('water', '#507f8f', .08, .03, .55),
    'paper': material('paper', '#b9aa8e', .92),
    'book': material('book', '#49362e', .9),
    'accent': material('accent', '#7360a9', .34, .18, .75),
}


def apply(mesh, mat):
    mesh.visual = TextureVisuals(material=mat)
    return mesh


def T(x=0, y=0, z=0):
    return translation_matrix([x, y, z])


def R(angle, axis):
    return rotation_matrix(angle, axis)


def S(x=1, y=None, z=None):
    y = x if y is None else y
    z = x if z is None else z
    return np.diag([x, y, z, 1.0])


def mesh_box(extents, mat):
    return apply(trimesh.creation.box(extents=extents), mat)


def mesh_cyl(radius, height, mat, sections=28):
    return apply(trimesh.creation.cylinder(radius=radius, height=height, sections=sections), mat)


def mesh_sphere(radius, mat, sub=2):
    return apply(trimesh.creation.icosphere(subdivisions=sub, radius=radius), mat)


def mesh_capsule(radius, height, mat, sections=16):
    mesh = trimesh.creation.capsule(height=height, radius=radius, count=[sections, sections])
    mesh.apply_transform(R(math.pi / 2, [1, 0, 0]))
    return apply(mesh, mat)


def ellipsoid(scale, mat, sub=3):
    mesh = mesh_sphere(1, mat, sub)
    mesh.apply_scale(scale)
    return mesh


def arch_tube(width=3.4, height=3.8, depth=.20, mat=None, segments=24):
    mat = M['stone'] if mat is None else mat
    points = []
    for i in range(segments):
        t = i / (segments - 1)
        x = (t - .5) * width
        u = abs(x) / (width / 2)
        y = height * (1 - u ** 1.8) ** .55
        points.append([x, y, 0])
    parts = []
    for a, b in zip(points[:-1], points[1:]):
        a = np.array(a)
        b = np.array(b)
        direction = b - a
        length = np.linalg.norm(direction)
        mid = (a + b) / 2
        cylinder = mesh_cyl(depth, length, mat, 14)
        z_axis = np.array([0, 0, 1.0])
        vector = direction / length
        axis = np.cross(z_axis, vector)
        dot = float(np.clip(np.dot(z_axis, vector), -1, 1))
        if np.linalg.norm(axis) > 1e-8:
            cylinder.apply_transform(R(math.acos(dot), axis / np.linalg.norm(axis)))
        elif dot < 0:
            cylinder.apply_transform(R(math.pi, [1, 0, 0]))
        cylinder.apply_translation(mid)
        parts.append(cylinder)
    return trimesh.util.concatenate(parts)


def add(scene, mesh, name, transform=None):
    scene.add_geometry(mesh, geom_name=name, node_name=name, transform=np.eye(4) if transform is None else transform)


def build_human(role, skin, hair, cloth, stature=1.0, shoulder=1.0, hair_style='short'):
    scene = trimesh.Scene()
    sk, hr, cl = M[skin], M[hair], M[cloth]

    def at(mesh, name, pos=(0, 0, 0), rot=None):
        transform = T(*pos)
        if rot:
            transform = transform @ R(rot[0], rot[1])
        add(scene, mesh, name, transform)

    at(mesh_box((.115, .075, .245), M['shoe']), f'{role}-shoe-left', (-.092, .06, .06))
    at(mesh_box((.115, .075, .245), M['shoe']), f'{role}-shoe-right', (.092, .06, .06))
    at(mesh_capsule(.054, .32, M['trouser']), f'{role}-calf-left', (-.086, .30, 0))
    at(mesh_capsule(.054, .32, M['trouser']), f'{role}-calf-right', (.086, .30, 0))
    at(mesh_capsule(.071, .38, M['trouser']), f'{role}-thigh-left', (-.09, .66, 0))
    at(mesh_capsule(.071, .38, M['trouser']), f'{role}-thigh-right', (.09, .66, 0))
    at(ellipsoid((.21, .16, .135), M['trouser'], 2), f'{role}-pelvis', (0, .91, 0))
    at(ellipsoid((.25 * shoulder, .33, .15), cl, 3), f'{role}-torso', (0, 1.20, 0))
    at(mesh_capsule(.052, .27, cl), f'{role}-upper-arm-left', (-.29 * shoulder, 1.25, 0), (-.08, [0, 0, 1]))
    at(mesh_capsule(.052, .27, cl), f'{role}-upper-arm-right', (.29 * shoulder, 1.25, 0), (.08, [0, 0, 1]))
    at(mesh_capsule(.043, .245, sk), f'{role}-forearm-left', (-.31 * shoulder, 1.01, .015))
    at(mesh_capsule(.043, .245, sk), f'{role}-forearm-right', (.31 * shoulder, 1.01, .015))
    at(ellipsoid((.052, .078, .038), sk, 2), f'{role}-hand-left', (-.31 * shoulder, .82, .035))
    at(ellipsoid((.052, .078, .038), sk, 2), f'{role}-hand-right', (.31 * shoulder, .82, .035))
    at(mesh_cyl(.06, .12, sk, 20), f'{role}-neck', (0, 1.48, 0), (math.pi / 2, [1, 0, 0]))
    at(ellipsoid((.112, .143, .105), sk, 4), f'{role}-head', (0, 1.67, 0))
    at(ellipsoid((.088, .065, .092), sk, 3), f'{role}-jaw', (0, 1.59, .005))
    at(ellipsoid((.015, .032, .018), sk, 2), f'{role}-ear-left', (-.114, 1.67, 0))
    at(ellipsoid((.015, .032, .018), sk, 2), f'{role}-ear-right', (.114, 1.67, 0))
    nose = apply(trimesh.creation.cone(radius=.014, height=.048, sections=16), sk)
    nose.apply_transform(R(math.pi / 2, [1, 0, 0]))
    at(nose, f'{role}-nose', (0, 1.66, .108))
    for side, x in [('left', -.041), ('right', .041)]:
        at(ellipsoid((.019, .010, .007), M['eye_white'], 2), f'{role}-eye-{side}', (x, 1.697, .101))
        at(ellipsoid((.0065, .0065, .0045), M['eye_dark'], 2), f'{role}-iris-{side}', (x, 1.697, .109))
    at(ellipsoid((.034, .0065, .006), M['lip'], 2), f'{role}-mouth', (0, 1.615, .100))

    if hair_style == 'bun':
        at(ellipsoid((.112, .098, .105), hr, 3), f'{role}-hair-cap', (0, 1.735, -.025))
        at(mesh_sphere(.075, hr, 2), f'{role}-hair-bun', (0, 1.80, -.06))
    elif hair_style == 'shoulder':
        at(ellipsoid((.118, .110, .11), hr, 3), f'{role}-hair-cap', (0, 1.73, -.035))
        at(mesh_capsule(.032, .18, hr), f'{role}-hair-left', (-.105, 1.58, -.035))
        at(mesh_capsule(.032, .18, hr), f'{role}-hair-right', (.105, 1.58, -.035))
    elif hair_style == 'crop':
        at(ellipsoid((.108, .070, .103), hr, 3), f'{role}-hair-cap', (0, 1.745, -.025))
    else:
        at(ellipsoid((.115, .090, .108), hr, 3), f'{role}-hair-cap', (0, 1.74, -.025))

    at(mesh_box((.028, .28, .012), M['bronze']), f'{role}-lapel-detail', (-.105, 1.25, .153))
    if stature != 1:
        scene.apply_transform(S(stature))
    scene.metadata = {'urai': {'assetType': 'human', 'role': role, 'units': 'meters', 'axis': 'Y-up', 'cameraAspect': '5:4', 'humanHeightMeters': round(1.82 * stature, 3), 'status': 'production-candidate-static-mesh', 'riggingGate': 'pending'}}
    return scene


def rough_floor(size_x, size_z, mat, seed=1, n=28):
    xs = np.linspace(-size_x / 2, size_x / 2, n)
    zs = np.linspace(-size_z / 2, size_z / 2, n)
    xx, zz = np.meshgrid(xs, zs)
    yy = .025 * np.sin(xx * 1.7) + .018 * np.cos(zz * 2.1) + .012 * np.sin((xx + zz) * 3.2)
    verts = np.column_stack([xx.ravel(), yy.ravel(), zz.ravel()])
    faces = []
    for j in range(n - 1):
        for i in range(n - 1):
            a = j * n + i
            b, c, d = a + 1, a + n, a + n + 1
            faces.extend([[a, c, b], [b, c, d]])
    return apply(trimesh.Trimesh(vertices=verts, faces=np.array(faces), process=False), mat)


def build_council_chamber():
    scene = trimesh.Scene()
    add(scene, rough_floor(13.2, 13.2, M['stone_warm'], 7, 34), 'council-weathered-floor')
    add(scene, mesh_box((11.6, 5.2, .34), M['stone_warm']), 'council-back-wall', T(0, 2.6, -5.5))
    add(scene, mesh_box((.34, 5.2, 10.4), M['stone']), 'council-left-wall', T(-5.65, 2.6, -.5))
    add(scene, mesh_box((.34, 5.2, 10.4), M['stone']), 'council-right-wall', T(5.65, 2.6, -.5))
    for i, x in enumerate([-4.6, -2.3, 0, 2.3, 4.6]):
        add(scene, mesh_cyl(.24, 4.7, M['stone_dark'], 28), f'council-column-{i}', T(x, 2.35, -5.15) @ R(math.pi / 2, [1, 0, 0]))
    add(scene, arch_tube(3.5, 2.8, .16, M['stone_dark'], 28), 'council-window-arch', T(0, 1.0, -5.28))
    add(scene, mesh_box((3.15, 2.4, .035), M['glass']), 'council-window-glass', T(0, 3.0, -5.31))
    add(scene, mesh_cyl(1.55, .12, M['wood'], 72), 'council-table-top', T(0, .76, -.55) @ R(math.pi / 2, [1, 0, 0]))
    add(scene, mesh_cyl(.48, .70, M['wood_dark'], 48), 'council-table-base', T(0, .38, -.55) @ R(math.pi / 2, [1, 0, 0]))
    positions = [(-2.8, -1.0), (-1.55, -2.7), (0, -3.25), (1.55, -2.7), (2.8, -1.0), (3.35, 1.0)]
    for i, (x, z) in enumerate(positions):
        add(scene, mesh_box((.66, .15, .60), M['cloth_charcoal']), f'council-chair-seat-{i}', T(x, .43, z))
        add(scene, mesh_box((.64, .82, .14), M['cloth_charcoal']), f'council-chair-back-{i}', T(x, .89, z + .25))
        for dx in (-.26, .26):
            add(scene, mesh_cyl(.035, .70, M['iron'], 12), f'council-chair-leg-{i}-{dx}', T(x + dx, .35, z) @ R(math.pi / 2, [1, 0, 0]))
    for i, x in enumerate((-3.9, 3.9)):
        add(scene, mesh_cyl(.055, 1.5, M['iron'], 14), f'council-lamp-stem-{i}', T(x, .75, -4.0) @ R(math.pi / 2, [1, 0, 0]))
        add(scene, mesh_cyl(.27, .31, M['paper'], 24), f'council-lamp-shade-{i}', T(x, 1.52, -4.0) @ R(math.pi / 2, [1, 0, 0]))
    scene.metadata = {'urai': {'assetType': 'environment', 'realm': 'Council', 'units': 'meters', 'axis': 'Y-up', 'cameraAspect': '5:4', 'status': 'production-candidate', 'humanScale': True}}
    return scene


def build_shadow():
    scene = trimesh.Scene()
    add(scene, rough_floor(10.6, 14.0, M['stone_dark'], 19, 30), 'shadow-weathered-floor')
    add(scene, mesh_box((.32, 5.2, 14.0), M['stone_dark']), 'shadow-left-wall', T(-5.2, 2.6, -1.5))
    add(scene, mesh_box((.32, 5.2, 14.0), M['stone_dark']), 'shadow-right-wall', T(5.2, 2.6, -1.5))
    add(scene, mesh_box((10.6, 5.2, .32), M['stone']), 'shadow-back-wall', T(0, 2.6, -8.35))
    for i in range(18):
        z = 5.2 - i * .66
        add(scene, mesh_box((1.05, .055, .48), M['stone_warm']), f'shadow-path-{i}', T(0, .04, z) @ R((i % 3 - 1) * .02, [0, 1, 0]))
    add(scene, mesh_cyl(1.7, .22, M['stone'], 64), 'shadow-basin', T(0, .11, -5.2) @ R(math.pi / 2, [1, 0, 0]))
    add(scene, mesh_cyl(1.36, .025, M['water'], 64), 'shadow-water', T(0, .235, -5.2) @ R(math.pi / 2, [1, 0, 0]))
    for i, (x, z) in enumerate([(-3.4, 1.7), (3.4, .4), (-3.4, -1.2), (3.4, -2.7), (-3.4, -4.2)]):
        rot = .14 if x < 0 else -.14
        add(scene, mesh_box((1.72, 2.82, .045), M['glass']), f'shadow-memory-glass-{i}', T(x, 1.75, z) @ R(rot, [0, 1, 0]))
        add(scene, arch_tube(1.95, 2.85, .055, M['bronze'], 18), f'shadow-frame-{i}', T(x, .25, z + .02) @ R(rot, [0, 1, 0]))
    scene.metadata = {'urai': {'assetType': 'environment', 'realm': 'Shadow', 'units': 'meters', 'axis': 'Y-up', 'cameraAspect': '5:4', 'status': 'production-candidate', 'governance': 'visual-substrate-only'}}
    return scene


def build_mirror():
    scene = trimesh.Scene()
    add(scene, rough_floor(11.0, 11.0, M['stone_warm'], 23, 32), 'mirror-stone-floor')
    add(scene, mesh_box((5.0, 3.4, .05), M['mirror']), 'mirror-primary-surface', T(0, 2.05, -4.3))
    add(scene, arch_tube(5.6, 4.2, .20, M['bronze'], 32), 'mirror-primary-frame', T(0, .12, -4.15))
    add(scene, mesh_cyl(2.1, .16, M['stone'], 72), 'mirror-basin-rim', T(0, .08, -.6) @ R(math.pi / 2, [1, 0, 0]))
    add(scene, mesh_cyl(1.78, .022, M['water'], 72), 'mirror-basin-water', T(0, .18, -.6) @ R(math.pi / 2, [1, 0, 0]))
    for i in range(11):
        add(scene, mesh_box((.82, .055, .48), M['stone_warm']), f'mirror-path-{i}', T(0, .04, 4.5 - i * .55))
    for x in (-4.6, 4.6):
        add(scene, mesh_cyl(.22, 4.5, M['stone_dark'], 24), f'mirror-column-{x}', T(x, 2.25, -3.7) @ R(math.pi / 2, [1, 0, 0]))
    scene.metadata = {'urai': {'assetType': 'environment', 'realm': 'Mirror', 'units': 'meters', 'axis': 'Y-up', 'cameraAspect': '5:4', 'status': 'production-candidate', 'reflectionSurface': 'runtime-material-override'}}
    return scene


def build_legacy():
    scene = trimesh.Scene()
    add(scene, rough_floor(12.0, 16.0, M['stone_warm'], 31, 34), 'legacy-floor')
    add(scene, mesh_box((12.0, 5.0, .32), M['stone_warm']), 'legacy-back-wall', T(0, 2.5, -7.7))
    add(scene, mesh_box((.32, 5.0, 16.0), M['stone']), 'legacy-left-wall', T(-5.85, 2.5, 0))
    add(scene, mesh_box((.32, 5.0, 16.0), M['stone']), 'legacy-right-wall', T(5.85, 2.5, 0))
    for side, x in [('left', -4.7), ('right', 4.7)]:
        for row, z in enumerate(np.linspace(-5.5, 4.8, 5)):
            add(scene, mesh_box((1.3, 2.7, .45), M['wood_dark']), f'legacy-shelf-{side}-{row}', T(x, 1.45, float(z)))
            for book in range(7):
                add(scene, mesh_box((.10, .65, .28), M['book']), f'legacy-book-{side}-{row}-{book}', T(x - .48 + book * .16, 1.45, float(z) - .26))
    add(scene, mesh_cyl(.18, 2.8, M['bronze'], 20), 'legacy-lineage-trunk', T(0, 1.4, -2.0) @ R(math.pi / 2, [1, 0, 0]))
    for i, angle in enumerate(np.linspace(-1.0, 1.0, 7)):
        branch = mesh_cyl(.045, 1.55, M['bronze'], 12)
        branch.apply_transform(R(math.pi / 2, [1, 0, 0]))
        branch.apply_transform(R(float(angle), [0, 0, 1]))
        branch.apply_translation([0, 2.5, -2.0])
        add(scene, branch, f'legacy-lineage-branch-{i}')
        add(scene, mesh_sphere(.11, M['accent'], 2), f'legacy-lineage-node-{i}', T(math.sin(angle) * 1.25, 2.7 + math.cos(angle) * .55, -2.0))
    add(scene, mesh_box((3.1, .12, 1.1), M['wood']), 'legacy-reading-table', T(0, .82, 2.0))
    add(scene, mesh_box((.55, .72, .55), M['wood_dark']), 'legacy-table-base', T(0, .42, 2.0))
    scene.metadata = {'urai': {'assetType': 'environment', 'realm': 'Legacy', 'units': 'meters', 'axis': 'Y-up', 'cameraAspect': '5:4', 'status': 'production-candidate', 'archiveScale': 'human'}}
    return scene


def export_scene(scene, filename):
    path = OUT_ROOT / filename
    data = scene.export(file_type='glb')
    path.write_bytes(data)
    loaded = trimesh.load(path, force='scene')
    vertices = sum(len(g.vertices) for g in loaded.geometry.values() if hasattr(g, 'vertices'))
    faces = sum(len(g.faces) for g in loaded.geometry.values() if hasattr(g, 'faces'))
    bounds = np.asarray(loaded.bounds).round(4).tolist()
    return {'fileName': filename, 'path': '/' + str(path.relative_to(REPO_ROOT / 'urai-tier1' / 'public')).replace('\\', '/'), 'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest(), 'vertices': vertices, 'faces': faces, 'geometries': len(loaded.geometry), 'bounds': bounds}


def main():
    people = [
        ('council-guide-human-v1.glb', 'guide', 'skin_warm', 'hair_brown', 'cloth_navy', 1.01, 1.02, 'short'),
        ('council-mirror-human-v1.glb', 'mirror', 'skin_deep', 'hair_black', 'cloth_slate', .97, .98, 'shoulder'),
        ('council-guardian-human-v1.glb', 'guardian', 'skin_brown', 'hair_black', 'cloth_navy', 1.05, 1.08, 'crop'),
        ('council-archivist-human-v1.glb', 'archivist', 'skin_light', 'hair_gray', 'cloth_cream', .96, .96, 'bun'),
        ('council-builder-human-v1.glb', 'builder', 'skin_olive', 'hair_brown', 'cloth_earth', 1.03, 1.06, 'short'),
        ('council-trickster-human-v1.glb', 'trickster', 'skin_brown', 'hair_black', 'cloth_charcoal', .99, .96, 'crop'),
    ]
    assets = []
    for filename, role, skin, hair, cloth, stature, shoulder, style in people:
        assets.append(export_scene(build_human(role, skin, hair, cloth, stature, shoulder, style), filename))
    assets.extend([
        export_scene(build_council_chamber(), 'council-chamber-real-v1.glb'),
        export_scene(build_shadow(), 'shadow-hall-real-v1.glb'),
        export_scene(build_mirror(), 'mirror-chamber-real-v1.glb'),
        export_scene(build_legacy(), 'legacy-archive-real-v1.glb'),
    ])
    receipt = {
        'schemaVersion': '1.0.0',
        'packId': 'urai-real-world-extension-v1',
        'generator': 'URAI real-world extension forge v1',
        'generatedBy': 'scripts/generate-urai-real-world-extension-v1.py',
        'cameraAspect': '5:4',
        'units': 'meters',
        'authority': {
            'namespace': 'urai-tier1/public/assets/urai/generated/real-world-v1',
            'selectedProduction': False,
            'promotionRequires': ['runtime-render-proof', 'multi-device-performance', 'accessibility', 'human-rigging-and-animation', 'provenance-review'],
        },
        'modelCount': len(assets),
        'totalVertices': sum(asset['vertices'] for asset in assets),
        'totalFaces': sum(asset['faces'] for asset in assets),
        'assets': assets,
    }
    RECEIPT.write_text(json.dumps(receipt, indent=2) + '\n')
    print(json.dumps(receipt, indent=2))


if __name__ == '__main__':
    main()
