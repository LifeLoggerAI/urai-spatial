#!/usr/bin/env python3
from __future__ import annotations
import base64
import hashlib
import json
import re
import zlib
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
PUBLIC = ROOT / 'urai-tier1/public'
REGISTRY = ROOT / 'urai-tier1/src/spatial/assets/uraiAssets.ts'
REPORT_ROOT = ROOT / 'artifacts/assets'
REPORT = REPORT_ROOT / 'v1-runtime-certification.json'
LEDGER_COPY = REPORT_ROOT / 'v1-certified-runtime-ledger.json'

LEDGER_ZLIB_B64 = '''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'''


def load_ledger() -> dict:
    raw = zlib.decompress(base64.b64decode(LEDGER_ZLIB_B64))
    ledger = json.loads(raw)
    if ledger['authority'] != {
        'consumer': 'LifeLoggerAI/urai-spatial',
        'expectedOutputs': 53,
        'missing': 0,
        'pixelVerified': 53,
        'producer': 'LifeLoggerAI/asset-factory',
        'providerCallsDuringRecertification': 0,
        'ready': 53,
        'sourceArtifactId': 8742902079,
        'sourceArtifactSha256': 'd42a4549fd5ebd90a761ced87a72d6765de6bb56403055af5c9cec8bda6ed731',
        'sourceManifestSha256': '71591486803582a7468d375f05b341538c7fd5bd232bb330c16d6ce2ec5b155a',
    }:
        raise ValueError('embedded V1 authority mismatch')
    if len(ledger['assets']) != 53:
        raise ValueError('embedded V1 ledger must contain 53 assets')
    return ledger


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open('rb') as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b''):
            digest.update(chunk)
    return digest.hexdigest()


def pixel_sha(path: Path) -> tuple[str, int, int, bool]:
    with Image.open(path) as image:
        image.load()
        rgba = image.convert('RGBA')
        alpha = rgba.getchannel('A')
        has_transparency = alpha.getextrema() != (255, 255)
        digest = hashlib.sha256()
        digest.update(f'{rgba.width}x{rgba.height}:RGBA\n'.encode())
        digest.update(rgba.tobytes())
        return digest.hexdigest(), rgba.width, rgba.height, has_transparency


def main() -> int:
    ledger = load_ledger()
    registry = REGISTRY.read_text(encoding='utf-8')
    registered = {
        f'assets/urai{match}'
        for match in re.findall(r'\bwebp\(\s*[\"\']([^\"\'\n]+)[\"\']\s*\)', registry)
    }
    rows = []
    social = {
        'assets/urai/social/open-graph-launch.webp',
        'assets/urai/social/open-graph-life-map.webp',
    }
    for asset in ledger['assets']:
        relative = asset['p']
        path = PUBLIC / relative
        row = {
            'name': asset['n'],
            'canonicalPath': relative,
            'exists': path.is_file(),
            'registryRequired': relative not in social,
            'registered': relative in registered,
        }
        if path.is_file():
            decoded_sha, width, height, has_transparency = pixel_sha(path)
            row.update({
                'runtimeSha256': sha256(path),
                'runtimePixelSha256': decoded_sha,
                'width': width,
                'height': height,
                'hasTransparency': has_transparency,
                'expectedSha256': asset['s'],
                'expectedPixelSha256': asset['x'],
                'expectedWidth': asset['w'],
                'expectedHeight': asset['h'],
                'expectedAlpha': asset['a'],
                'renderer': asset['r'],
                'providerRequestId': asset['q'],
            })
            row['byteMatch'] = row['runtimeSha256'] == row['expectedSha256']
            row['pixelMatch'] = row['runtimePixelSha256'] == row['expectedPixelSha256']
            row['dimensionMatch'] = (width, height) == (asset['w'], asset['h'])
            row['alphaMatch'] = has_transparency == bool(asset['a'])
        else:
            row.update({
                'byteMatch': False,
                'pixelMatch': False,
                'dimensionMatch': False,
                'alphaMatch': False,
            })
        row['accepted'] = (
            row['exists']
            and row['pixelMatch']
            and row['dimensionMatch']
            and row['alphaMatch']
            and (row['registered'] or not row['registryRequired'])
        )
        rows.append(row)

    report = {
        'schemaVersion': '1.0.0',
        'authority': ledger['authority'],
        'expected': len(rows),
        'accepted': sum(row['accepted'] for row in rows),
        'rejected': sum(not row['accepted'] for row in rows),
        'missing': sum(not row['exists'] for row in rows),
        'pixelMatches': sum(row.get('pixelMatch', False) for row in rows),
        'byteMatches': sum(row.get('byteMatch', False) for row in rows),
        'assets': rows,
    }
    REPORT_ROOT.mkdir(parents=True, exist_ok=True)
    LEDGER_COPY.write_text(json.dumps(ledger, indent=2, sort_keys=True) + '\n', encoding='utf-8')
    REPORT.write_text(json.dumps(report, indent=2, sort_keys=True) + '\n', encoding='utf-8')
    print(json.dumps({key: report[key] for key in (
        'expected', 'accepted', 'rejected', 'missing', 'pixelMatches', 'byteMatches'
    )}, indent=2))
    return 0 if report['accepted'] == report['expected'] else 1


if __name__ == '__main__':
    raise SystemExit(main())
