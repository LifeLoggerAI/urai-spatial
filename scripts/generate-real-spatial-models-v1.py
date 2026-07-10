#!/usr/bin/env python3
"""Generate real, self-contained glTF 2.0 models for the canonical URAI runtime.

The models are deterministic modular first-pass assets: valid geometry, normals, indices,
materials, embedded buffers, and no external provider dependency.
"""
from __future__ import annotations

import json
from pathlib import Path
import numpy as np
import trimesh
from trimesh.transformations import rotation_matrix, translation_matrix

REPO_ROOT = Path(__file__).resolve().parents[1]
OUT_ROOT = REPO_ROOT / 'urai-tier1' / 'public' / 'assets' / 'urai' / 'spatial'
RECEIPT_PATH = REPO_ROOT / 'docs' / 'generated' / 'spatial-models-v1-receipt.json'
MODEL_PATHS = {
    'entry-chamber-shell-v1': 'entry-chamber/models/entry-chamber-shell-v1.gltf',
    'entry-floor-ring-v1': 'entry-chamber/models/entry-floor-ring-v1.gltf',
    'central-orb-v1': 'entry-chamber/models/central-orb-v1.gltf',
    'universal-portal-ring-v1': 'shared/models/universal-portal-ring-v1.gltf',
    'ground-descent-hatch-v1': 'entry-chamber/models/ground-descent-hatch-v1.gltf',
    'ground-room-shell-v1': 'ground-room/models/ground-room-shell-v1.gltf',
    'ground-terminal-v1': 'ground-room/models/ground-terminal-v1.gltf',
    'agent-source-station-v1': 'ground-room/models/agent-source-station-v1.gltf',
    'life-map-sky-dome-v1': 'life-map/models/life-map-sky-dome-v1.gltf',
    'star-memory-node-v1': 'life-map/models/star-memory-node-v1.gltf',
    'focus-star-tunnel-v1': 'focus-star/models/focus-star-tunnel-v1.gltf',
    'replay-film-portal-v1': 'replay-portal/models/replay-film-portal-v1.gltf',
    'passport-identity-plinth-v1': 'passport-room/models/passport-identity-plinth-v1.gltf',
    'status-control-board-v1': 'status-room/models/status-control-board-v1.gltf',
}
OUT_ROOT.mkdir(parents=True, exist_ok=True)
RECEIPT_PATH.parent.mkdir(parents=True, exist_ok=True)

COLORS = {
    'obsidian': [9, 15, 28, 255],
    'blue': [69, 178, 255, 255],
    'violet': [154, 102, 255, 255],
    'cyan': [90, 244, 255, 255],
    'white': [230, 247, 255, 255],
    'gold': [255, 199, 84, 255],
    'slate': [53, 72, 96, 255],
    'glass': [110, 210, 255, 170],
}

def paint(mesh: trimesh.Trimesh, color):
    mesh.visual.vertex_colors = np.tile(np.array(color, dtype=np.uint8), (len(mesh.vertices), 1))
    return mesh

def xform(mesh, matrix):
    mesh = mesh.copy()
    mesh.apply_transform(matrix)
    return mesh

def T(x=0, y=0, z=0): return translation_matrix([x, y, z])
def R(angle, axis): return rotation_matrix(angle, axis)
def S(x=1, y=None, z=None):
    if y is None: y = x
    if z is None: z = x
    return np.diag([x, y, z, 1.0])

def box(extents, pos=(0,0,0), color='slate'):
    return paint(xform(trimesh.creation.box(extents=extents), T(*pos)), COLORS[color])

def cyl(radius, height, pos=(0,0,0), color='slate', sections=32):
    return paint(xform(trimesh.creation.cylinder(radius=radius, height=height, sections=sections), T(*pos)), COLORS[color])

def torus(major, minor, pos=(0,0,0), color='blue', major_sections=48, minor_sections=12, rotation=None):
    mesh = trimesh.creation.torus(major_radius=major, minor_radius=minor, major_sections=major_sections, minor_sections=minor_sections)
    matrix = T(*pos)
    if rotation is not None: matrix = T(*pos) @ rotation
    return paint(xform(mesh, matrix), COLORS[color])

def sphere(radius, pos=(0,0,0), color='cyan', subdivisions=2):
    return paint(xform(trimesh.creation.icosphere(subdivisions=subdivisions, radius=radius), T(*pos)), COLORS[color])

def cone(radius, height, pos=(0,0,0), color='blue', sections=24, rotation=None):
    mesh = trimesh.creation.cone(radius=radius, height=height, sections=sections)
    matrix = T(*pos)
    if rotation is not None: matrix = T(*pos) @ rotation
    return paint(xform(mesh, matrix), COLORS[color])

def scene_export(name, meshes):
    scene = trimesh.Scene()
    for index, mesh in enumerate(meshes):
        scene.add_geometry(mesh, node_name=f'{name}-{index:02d}', geom_name=f'{name}-mesh-{index:02d}')
    files = trimesh.exchange.gltf.export_gltf(scene, include_normals=True, merge_buffers=True, embed_buffers=True)
    gltf_name = next(key for key in files if key.endswith('.gltf'))
    raw = files[gltf_name]
    data = json.loads(raw.decode('utf-8') if isinstance(raw, bytes) else raw)
    data.setdefault('asset', {})['generator'] = 'URAI deterministic spatial model forge v1'
    data['asset']['copyright'] = 'URAI Labs'
    data['extras'] = {
        'uraiModelId': name,
        'productionClass': 'modular-first-pass',
        'generatedBy': 'scripts/generate-real-spatial-models-v1.py',
        'units': 'meters',
    }
    relative_path = MODEL_PATHS[name]
    path = OUT_ROOT / relative_path
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, separators=(',', ':')) + '\n', encoding='utf-8')
    loaded = trimesh.load(path, force='scene')
    faces = sum(len(g.faces) for g in loaded.geometry.values() if hasattr(g, 'faces'))
    vertices = sum(len(g.vertices) for g in loaded.geometry.values() if hasattr(g, 'vertices'))
    if vertices == 0 or faces == 0:
        raise RuntimeError(f'{name} generated empty geometry')
    print(f'{name}: {vertices} vertices, {faces} faces, {path.stat().st_size} bytes')

meshes = [cyl(4.6, 0.18, (0,-0.12,0), 'obsidian', 64), torus(4.25,0.11,(0,0.02,0),'blue',64,12), torus(3.55,0.06,(0,0.04,0),'violet',64,10)]
for i in range(10):
    angle = 2*np.pi*i/10
    x, z = 3.9*np.cos(angle), 3.9*np.sin(angle)
    meshes += [box((0.22,2.6,0.22),(x,1.3,z),'slate'), sphere(0.16,(x,2.62,z),'cyan',1)]
meshes += [torus(3.9,0.12,(0,2.65,0),'blue',64,12)]
scene_export('entry-chamber-shell-v1', meshes)

meshes=[cyl(3.2,0.12,(0,0,0),'obsidian',64), torus(2.8,0.10,(0,0.08,0),'cyan',64,12), torus(1.8,0.06,(0,0.09,0),'violet',64,10)]
for i in range(12):
    angle=2*np.pi*i/12
    spoke=box((0.12,0.06,0.75),(2.25*np.cos(angle),0.10,2.25*np.sin(angle)),'blue')
    spoke.apply_transform(R(-angle,[0,1,0]))
    meshes.append(spoke)
scene_export('entry-floor-ring-v1',meshes)

meshes=[sphere(0.72,color='glass',subdivisions=3),sphere(0.31,color='white',subdivisions=2),torus(0.78,0.035,color='cyan',major_sections=64,minor_sections=10),torus(0.62,0.025,color='violet',major_sections=64,minor_sections=8,rotation=R(np.pi/2,[1,0,0])),torus(0.53,0.02,color='blue',major_sections=64,minor_sections=8,rotation=R(np.pi/2,[0,0,1]))]
for y in (-0.38,0.38): meshes.append(sphere(0.055,(0,y,0),'gold',1))
scene_export('central-orb-v1',meshes)

meshes=[torus(1.65,0.18,color='obsidian',major_sections=64,minor_sections=16),torus(1.62,0.08,color='cyan',major_sections=64,minor_sections=12),torus(1.33,0.035,color='violet',major_sections=64,minor_sections=8)]
for i in range(8):
    angle=2*np.pi*i/8
    meshes.append(sphere(0.095,(1.62*np.cos(angle),1.62*np.sin(angle),0),'white',1))
meshes += [box((1.2,0.18,0.7),(0,-1.78,0),'obsidian'), box((0.7,0.08,0.4),(0,-1.63,0),'blue')]
scene_export('universal-portal-ring-v1',meshes)

meshes=[cyl(1.7,0.22,color='obsidian',sections=64),torus(1.45,0.10,(0,0.14,0),'gold',64,12),cyl(1.05,0.12,(0,0.10,0),'slate',48)]
for i in range(8):
    angle=2*np.pi*i/8
    segment=box((0.10,0.08,0.72),(0,0.19,0.58),'blue')
    segment.apply_transform(R(angle,[0,1,0]))
    meshes.append(segment)
scene_export('ground-descent-hatch-v1',meshes)

meshes=[box((9,0.18,7),(0,-0.1,0),'obsidian'),box((9,3.4,0.18),(0,1.7,-3.4),'slate'),box((0.18,3.4,7),(-4.4,1.7,0),'slate'),box((0.18,3.4,7),(4.4,1.7,0),'slate')]
for x in (-3,-1.5,0,1.5,3): meshes.append(box((0.06,2.8,0.08),(x,1.5,-3.28),'cyan'))
for z in (-2.4,0,2.4): meshes.append(box((8.6,0.08,0.08),(0,3.2,z),'blue'))
scene_export('ground-room-shell-v1',meshes)

meshes=[box((1.15,1.1,0.75),(0,0.55,0),'obsidian'),box((1.35,0.82,0.12),(0,1.35,-0.25),'blue'),box((1.14,0.62,0.08),(0,1.35,-0.33),'cyan'),box((0.9,0.09,0.48),(0,0.85,0.45),'slate')]
for x in (-0.3,0,0.3): meshes.append(sphere(0.06,(x,0.91,0.22),'white',1))
scene_export('ground-terminal-v1',meshes)

meshes=[cyl(0.72,0.45,(0,0.22,0),'obsidian',48),torus(0.64,0.06,(0,0.46,0),'violet',48,10),sphere(0.34,(0,0.98,0),'glass',2),sphere(0.12,(0,0.98,0),'white',1),torus(0.48,0.025,(0,0.98,0),'cyan',48,8,rotation=R(np.pi/2,[1,0,0]))]
scene_export('agent-source-station-v1',meshes)

shell=trimesh.creation.icosphere(subdivisions=3,radius=6.0)
shell.invert()
paint(shell,COLORS['obsidian'])
meshes=[shell]
for radius,color in [(4.8,'blue'),(3.8,'violet'),(2.8,'cyan')]: meshes.append(torus(radius,0.025,color=color,major_sections=72,minor_sections=6,rotation=R(np.pi/2,[1,0,0])))
for i in range(36):
    angle=2*np.pi*i/36
    meshes.append(sphere(0.045+0.02*(i%3),(4.5*np.cos(angle),1.2*np.sin(i*1.7),4.5*np.sin(angle)),'white',1))
scene_export('life-map-sky-dome-v1',meshes)

meshes=[sphere(0.32,color='white',subdivisions=2),sphere(0.46,color='glass',subdivisions=2),torus(0.62,0.025,color='cyan',major_sections=48,minor_sections=8),torus(0.47,0.018,color='violet',major_sections=48,minor_sections=8,rotation=R(np.pi/2,[1,0,0]))]
for i in range(8):
    angle=2*np.pi*i/8
    ray=cone(0.06,0.42,color='blue',sections=12)
    ray.apply_transform(R(np.pi/2,[1,0,0]) @ R(angle,[0,0,1]) @ T(0,0.48,0))
    meshes.append(ray)
scene_export('star-memory-node-v1',meshes)

meshes=[]
for i in range(10):
    meshes.append(torus(1.65-i*0.07,0.045,(0,0,-i*0.65),'cyan' if i%2==0 else 'violet',48,8))
meshes += [sphere(0.38,(0,0,-6.6),'white',2),sphere(0.62,(0,0,-6.6),'glass',2)]
scene_export('focus-star-tunnel-v1',meshes)

meshes=[torus(1.65,0.12,color='violet',major_sections=64,minor_sections=12),torus(1.38,0.035,color='cyan',major_sections=64,minor_sections=8),box((2.1,1.15,0.10),(0,0,-0.06),'obsidian'),box((1.9,0.95,0.06),(0,0,-0.13),'blue')]
for x in (-0.82,0.82):
    for y in (-0.36,-0.12,0.12,0.36): meshes.append(box((0.12,0.10,0.05),(x,y,-0.19),'white'))
scene_export('replay-film-portal-v1',meshes)

meshes=[cyl(0.92,0.28,(0,0.14,0),'obsidian',48),cyl(0.58,0.62,(0,0.58,0),'slate',40),torus(0.62,0.05,(0,0.92,0),'gold',48,10)]
crystal=trimesh.creation.icosphere(subdivisions=1,radius=0.48)
crystal.apply_transform(S(0.7,1.25,0.7))
crystal.apply_transform(T(0,1.36,0))
paint(crystal,COLORS['glass'])
meshes.append(crystal)
scene_export('passport-identity-plinth-v1',meshes)

meshes=[box((2.8,1.65,0.18),(0,1.1,0),'obsidian'),box((2.55,1.4,0.08),(0,1.1,-0.13),'blue'),box((0.9,0.22,0.55),(0,0.2,0.15),'slate')]
for row in range(3):
    for column in range(5):
        x=-0.95+column*0.48
        y=0.65+row*0.38
        meshes.append(sphere(0.075,(x,y,-0.20),'white' if (row+column)%2==0 else 'cyan',1))
meshes += [box((0.12,0.9,0.12),(1.15,1.1,-0.19),'violet'),sphere(0.12,(1.15,1.62,-0.19),'gold',1)]
scene_export('status-control-board-v1',meshes)

receipt=[]
for name, relative_path in sorted(MODEL_PATHS.items()):
    path = OUT_ROOT / relative_path
    scene = trimesh.load(path, force='scene')
    receipt.append({
        'id': name,
        'file': '/assets/urai/spatial/' + relative_path,
        'bytes': path.stat().st_size,
        'geometryCount': len(scene.geometry),
        'vertices': sum(len(g.vertices) for g in scene.geometry.values()),
        'faces': sum(len(g.faces) for g in scene.geometry.values()),
    })
RECEIPT_PATH.write_text(json.dumps({
    'schemaVersion':'urai.spatial.real-model-receipt.v1',
    'generator':'URAI deterministic spatial model forge v1',
    'productionClass':'modular-first-pass',
    'modelCount':len(receipt),
    'totalVertices':sum(item['vertices'] for item in receipt),
    'totalFaces':sum(item['faces'] for item in receipt),
    'models':receipt,
}, indent=2) + '\n', encoding='utf-8')
