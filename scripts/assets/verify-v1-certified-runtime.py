#!/usr/bin/env python3
from __future__ import annotations
import hashlib, json, re
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
PUBLIC = ROOT / 'urai-tier1/public'
REGISTRY = ROOT / 'urai-tier1/src/spatial/assets/uraiAssets.ts'
LEDGER = ROOT / 'operations/assets/ledgers/v1-certified-runtime-ledger.json'
REPORT = ROOT / 'artifacts/assets/v1-runtime-certification.json'


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
    ledger = json.loads(LEDGER.read_text(encoding='utf-8'))
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
        'sourceArtifactId': ledger['authority']['sourceArtifactId'],
        'expected': len(rows),
        'accepted': sum(row['accepted'] for row in rows),
        'rejected': sum(not row['accepted'] for row in rows),
        'missing': sum(not row['exists'] for row in rows),
        'pixelMatches': sum(row.get('pixelMatch', False) for row in rows),
        'byteMatches': sum(row.get('byteMatch', False) for row in rows),
        'assets': rows,
    }
    REPORT.parent.mkdir(parents=True, exist_ok=True)
    REPORT.write_text(json.dumps(report, indent=2, sort_keys=True) + '\n', encoding='utf-8')
    print(json.dumps({key: report[key] for key in (
        'expected', 'accepted', 'rejected', 'missing', 'pixelMatches', 'byteMatches'
    )}, indent=2))
    return 0 if report['accepted'] == report['expected'] else 1


if __name__ == '__main__':
    raise SystemExit(main())
