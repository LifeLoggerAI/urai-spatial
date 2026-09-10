#!/usr/bin/env python3
"""Deterministically replace only the emergency Ground fallback with semantic route proxies.

This script is not promotion authority. It runs after the legacy fallback forge and rewrites
only ground-room-shell-v1.gltf plus that model's generated receipt metrics.
"""
from __future__ import annotations

import json
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
FALLBACK_PATH = REPO_ROOT / 'urai-tier1/public/assets/urai/spatial/ground-room/models/ground-room-shell-v1.gltf'
RECEIPT_PATH = REPO_ROOT / 'docs/generated/spatial-models-v1-receipt.json'

DESTINATIONS = [
    ('reception', [-6.6, 0, -5.1]),
    ('privacy', [6.8, 0.15, -5.8]),
    ('council', [0, 0.7, -10.2]),
    ('logistics', [-9.4, 0.45, -14.5]),
    ('wellness', [9.4, 0.35, -15]),
    ('archive', [0, 1.15, -19.4]),
    ('mirror', [-7.2, 2.45, -23]),
    ('passport', [7.2, 2.45, -23]),
    ('consent', [-9.8, 3.6, -28.5]),
    ('atlas', [-3.4, 4.25, -30.2]),
    ('focus', [3.4, 4.25, -30.2]),
    ('replay', [9.8, 3.6, -28.5]),
]

FALLBACK = {
    'asset': {
        'version': '2.0',
        'generator': 'URAI governed degraded fallback repair',
        'extras': {
            'uraiAuthority': 'emergency-degraded-fallback-only',
            'promotionAuthority': False,
        },
    },
    'scene': 0,
    'scenes': [{'name': 'ground-degraded-fallback-scene', 'nodes': list(range(len(DESTINATIONS)))}],
    'nodes': [
        {
            'name': f'ground-destination-{destination_id}',
            'mesh': 0,
            'translation': position,
            'extras': {
                'uraiDegradedFallback': True,
                'promotionAuthority': False,
                'destinationId': destination_id,
            },
        }
        for destination_id, position in DESTINATIONS
    ],
    'meshes': [{
        'name': 'ground-degraded-destination-proxy',
        'primitives': [{'attributes': {'POSITION': 0}, 'indices': 1, 'material': 0}],
    }],
    'materials': [{
        'name': 'ground-degraded-proxy-material',
        'pbrMetallicRoughness': {
            'baseColorFactor': [0.08, 0.24, 0.3, 0.65],
            'metallicFactor': 0.05,
            'roughnessFactor': 0.8,
        },
        'alphaMode': 'BLEND',
        'doubleSided': True,
        'extras': {
            'uraiAuthority': 'degraded-geometry-only',
            'promotionAuthority': False,
        },
    }],
    'buffers': [{
        'uri': 'data:application/octet-stream;base64,mpkZvwAAAACamRm/mpkZPwAAAACamRm/mpkZP5qZmT+amRm/mpkZv5qZmT+amRm/mpkZvwAAAACamRk/mpkZPwAAAACamRk/mpkZP5qZmT+amRk/mpkZv5qZmT+amRk/AAABAAIAAAACAAMAAQAFAAYAAQAGAAIABQAEAAcABQAHAAYABAAAAAMABAADAAcAAwACAAYAAwAGAAcABAAFAAEABAABAAAA',
        'byteLength': 168,
    }],
    'bufferViews': [
        {'buffer': 0, 'byteOffset': 0, 'byteLength': 96, 'target': 34962},
        {'buffer': 0, 'byteOffset': 96, 'byteLength': 72, 'target': 34963},
    ],
    'accessors': [
        {
            'bufferView': 0,
            'byteOffset': 0,
            'componentType': 5126,
            'count': 8,
            'type': 'VEC3',
            'min': [-0.6, 0, -0.6],
            'max': [0.6, 1.2, 0.6],
        },
        {
            'bufferView': 1,
            'byteOffset': 0,
            'componentType': 5123,
            'count': 36,
            'type': 'SCALAR',
            'min': [0],
            'max': [7],
        },
    ],
    'extras': {
        'uraiPurpose': 'Structurally compatible emergency Ground fallback. Provides destination geometry only when canonical candidate is not promoted.',
        'promotionAuthority': False,
    },
}

encoded = json.dumps(FALLBACK, separators=(',', ':'))
FALLBACK_PATH.write_text(encoded, encoding='utf-8')

receipt = json.loads(RECEIPT_PATH.read_text(encoding='utf-8'))
model = next(item for item in receipt['models'] if item['id'] == 'ground-room-shell-v1')
old_vertices = int(model['vertices'])
old_faces = int(model['faces'])
model.update({
    'bytes': FALLBACK_PATH.stat().st_size,
    'geometryCount': 1,
    'vertices': 8,
    'faces': 12,
})
receipt['totalVertices'] = int(receipt['totalVertices']) - old_vertices + 8
receipt['totalFaces'] = int(receipt['totalFaces']) - old_faces + 12
RECEIPT_PATH.write_text(json.dumps(receipt, indent=2) + '\n', encoding='utf-8')

print(json.dumps({
    'ok': True,
    'fallback': str(FALLBACK_PATH.relative_to(REPO_ROOT)),
    'bytes': FALLBACK_PATH.stat().st_size,
    'destinations': [item[0] for item in DESTINATIONS],
    'promotionAuthority': False,
}, indent=2))
