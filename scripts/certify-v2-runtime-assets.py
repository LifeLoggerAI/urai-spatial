#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import json
import math
import re
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1] / 'urai-tier1'
REGISTRY = ROOT / 'src/spatial/assets/uraiV2Assets.ts'
PUBLIC = ROOT / 'public/assets/urai/v2'
OUT = ROOT / 'artifacts/v2-certification'
GROUPS = {
    'helperSpecs': 'helpers',
    'objectSpecs': 'objects',
    'starSpecs': 'stars',
    'focusSpecs': 'focus',
    'replaySpecs': 'replay',
    'mirrorSpecs': 'mirror',
    'passportSpecs': 'passport',
    'onboardingSpecs': 'onboarding',
    'accessibilitySpecs': 'accessibility',
}
GEOMETRY = {
    'helpers': {'ratio': 2 / 3, 'longEdge': 1024, 'alpha': True},
    'objects': {'ratio': 1.0, 'longEdge': 768, 'alpha': True},
    'stars': {'ratio': 1.0, 'longEdge': 768, 'alpha': True},
    'focus': {'ratio': 16 / 9, 'longEdge': 1400, 'alpha': False},
    'replay': {'ratio': 16 / 9, 'longEdge': 1400, 'alpha': False},
    'mirror': {'ratio': 1.0, 'longEdge': 768, 'alpha': True},
    'passport': {'ratio': 4 / 3, 'longEdge': 1200, 'alpha': False},
    'onboarding': {'ratio': 4 / 3, 'longEdge': 1200, 'alpha': False},
    'accessibility': {'ratio': 4 / 3, 'longEdge': 1200, 'alpha': False},
}


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open('rb') as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b''):
            digest.update(chunk)
    return digest.hexdigest()


def composite_for_analysis(image: Image.Image) -> Image.Image:
    rgba = image.convert('RGBA')
    background = Image.new('RGBA', rgba.size, (18, 22, 32, 255))
    background.alpha_composite(rgba)
    return background.convert('RGB')


def phash(image: Image.Image) -> str:
    gray = composite_for_analysis(image).convert('L').resize((8, 8), Image.Resampling.LANCZOS)
    values = list(gray.getdata())
    average = sum(values) / len(values)
    return ''.join('1' if value >= average else '0' for value in values)


def hamming(left: str, right: str) -> int:
    return sum(a != b for a, b in zip(left, right))


def alpha_weighted_luminance(rgba: Image.Image) -> dict[str, float | int]:
    total_weight = 0.0
    weighted_sum = 0.0
    weighted_square_sum = 0.0
    visible_pixels = 0
    for red, green, blue, alpha in rgba.getdata():
        if alpha <= 0:
            continue
        visible_pixels += 1
        weight = alpha / 255.0
        luminance = 0.2126 * red + 0.7152 * green + 0.0722 * blue
        total_weight += weight
        weighted_sum += luminance * weight
        weighted_square_sum += luminance * luminance * weight
    if total_weight == 0:
        return {'visiblePixels': 0, 'visibleWeight': 0.0, 'visibleMean': 0.0, 'visibleStdDev': 0.0}
    mean = weighted_sum / total_weight
    variance = max(0.0, weighted_square_sum / total_weight - mean * mean)
    return {
        'visiblePixels': visible_pixels,
        'visibleWeight': total_weight,
        'visibleMean': mean,
        'visibleStdDev': math.sqrt(variance),
    }


def parse_registry(source: str) -> list[tuple[str, str]]:
    expected: list[tuple[str, str]] = []
    for variable, folder in GROUPS.items():
        match = re.search(rf'const {variable} = \[([\s\S]*?)\] as const', source)
        if not match:
            raise ValueError(f'missing registry group {variable}')
        binding = re.search(rf"makeGroup\(\s*['\"]{re.escape(folder)}['\"]\s*,\s*{variable}\s*\)", source)
        if not binding:
            raise ValueError(f'missing runtime binding for {variable} -> {folder}')
        expected.extend((folder, slug) for slug in re.findall(r"^\s*\['([^']+)'", match.group(1), re.M))
    if len(expected) != 80:
        raise ValueError(f'expected 80 registry assets, found {len(expected)}')
    if len(set(expected)) != len(expected):
        duplicates = sorted({f'{folder}/{slug}' for folder, slug in expected if expected.count((folder, slug)) > 1})
        raise ValueError(f'duplicate registry asset paths: {duplicates}')
    return expected


def inspect_image(path: Path, spec: dict[str, float | int | bool]) -> tuple[dict[str, object], Image.Image | None]:
    try:
        with Image.open(path) as image:
            image.load()
            rgba = image.convert('RGBA')
            alpha = rgba.getchannel('A')
            alpha_min, alpha_max = alpha.getextrema()
            visible = alpha_weighted_luminance(rgba)
            visible_pixels = int(visible['visiblePixels'])
            actual_ratio = image.width / image.height
            target_ratio = float(spec['ratio'])
            ratio_error = abs(actual_ratio - target_ratio) / target_ratio
            geometry_valid = ratio_error <= 0.025 and max(image.width, image.height) >= int(float(spec['longEdge']) * 0.95)
            alpha_required = bool(spec['alpha'])
            alpha_valid = (alpha_min < 255 and alpha_max > 0 and visible_pixels > 0) if alpha_required else alpha_min == 255
            near_empty = (
                path.stat().st_size < 256
                or visible_pixels == 0
                or (float(visible['visibleMean']) < 2.0 and float(visible['visibleStdDev']) < 2.0)
            )
            issues: list[str] = []
            if image.format != 'WEBP':
                issues.append('format-not-webp')
            if not geometry_valid:
                issues.append('manifest-geometry-mismatch')
            if not alpha_valid:
                issues.append('alpha-mode-mismatch')
            if near_empty:
                issues.append('near-empty-or-corrupt')
            details: dict[str, object] = {
                'readable': True,
                'format': image.format,
                'width': image.width,
                'height': image.height,
                'actualAspectRatio': actual_ratio,
                'aspectRatioError': ratio_error,
                'geometryValid': geometry_valid,
                'mode': image.mode,
                'bytes': path.stat().st_size,
                'sha256': sha256(path),
                'alphaMin': alpha_min,
                'alphaMax': alpha_max,
                'alphaValid': alpha_valid,
                **visible,
                'nearEmpty': near_empty,
                'issues': issues,
                'technicalStatus': 'passed' if not issues else 'noncompliant',
            }
            return details, rgba.copy()
    except Exception as error:
        return {
            'readable': False,
            'technicalStatus': 'noncompliant',
            'issues': ['decode-failure'],
            'error': str(error),
        }, None


def main() -> int:
    OUT.mkdir(parents=True, exist_ok=True)
    source = REGISTRY.read_text(encoding='utf-8')
    try:
        expected = parse_registry(source)
    except ValueError as error:
        (OUT / 'v2-certification-error.json').write_text(
            json.dumps({'status': 'failed', 'error': str(error)}, indent=2, sort_keys=True) + '\n',
            encoding='utf-8',
        )
        raise SystemExit(str(error))

    records: list[dict[str, object]] = []
    hashes: dict[str, str] = {}
    perceptual: dict[str, str] = {}
    thumbs: list[tuple[str, Image.Image]] = []
    by_sha: dict[str, list[str]] = {}
    for folder, slug in expected:
        relative = f'{folder}/{slug}.webp'
        path = PUBLIC / relative
        spec = GEOMETRY[folder]
        record: dict[str, object] = {
            'name': f'v2_{slug.replace("-", "_")}',
            'family': folder,
            'canonicalPath': f'assets/urai/v2/{relative}',
            'exists': path.is_file(),
            'sourceIdentity': 'repository-existing',
            'provider': 'unknown',
            'costUsd': None,
            'rightsStatus': 'incomplete',
            'provenanceStatus': 'incomplete',
            'runtimeReferenced': True,
            'expectedAspectRatio': spec['ratio'],
            'expectedLongEdge': spec['longEdge'],
            'alphaRequired': spec['alpha'],
            'issues': [],
        }
        if path.is_file():
            details, rgba = inspect_image(path, spec)
            record.update(details)
            if rgba is not None:
                file_sha = str(record['sha256'])
                hashes[relative] = file_sha
                perceptual[relative] = phash(rgba)
                by_sha.setdefault(file_sha, []).append(relative)
                preview = composite_for_analysis(rgba)
                preview.thumbnail((220, 180), Image.Resampling.LANCZOS)
                card = Image.new('RGB', (240, 220), (8, 10, 16))
                card.paste(preview, ((240 - preview.width) // 2, 10))
                ImageDraw.Draw(card).text((8, 194), slug[:34], fill='white', font=ImageFont.load_default())
                thumbs.append((folder, card))
        else:
            record.update({
                'readable': False,
                'technicalStatus': 'missing',
                'issues': ['missing-runtime-file'],
            })
        records.append(record)

    record_by_path = {record['canonicalPath'].removeprefix('assets/urai/v2/'): record for record in records}
    exact_duplicates = []
    for file_sha, paths in sorted(by_sha.items()):
        if len(paths) > 1:
            exact_duplicates.append({'sha256': file_sha, 'paths': sorted(paths)})
            for path in paths:
                record = record_by_path[path]
                issues = record['issues']
                if 'exact-duplicate-output' not in issues:
                    issues.append('exact-duplicate-output')
                record['technicalStatus'] = 'noncompliant'

    near_duplicates = []
    keys = sorted(perceptual)
    for index, left in enumerate(keys):
        for right in keys[index + 1:]:
            distance = hamming(perceptual[left], perceptual[right])
            if distance <= 3:
                near_duplicates.append({'a': left, 'b': right, 'distance': distance})

    for record in records:
        record['classification'] = (
            'provenance-incomplete'
            if record.get('technicalStatus') == 'passed'
            else 'technically-noncompliant'
        )

    summary = {
        'schemaVersion': '1.2.0',
        'version': 'v2',
        'manifestAuthority': {
            'repository': 'LifeLoggerAI/asset-factory',
            'file': 'image_asset_generator/build_version_manifests.py',
            'geometry': GEOMETRY,
        },
        'expected': 80,
        'present': sum(bool(record['exists']) for record in records),
        'technicallyPassed': sum(record.get('technicalStatus') == 'passed' for record in records),
        'accepted': 0,
        'rejected': sum(record.get('technicalStatus') != 'passed' for record in records),
        'provenanceIncomplete': sum(record['classification'] == 'provenance-incomplete' for record in records),
        'technicallyNoncompliant': sum(record['classification'] == 'technically-noncompliant' for record in records),
        'providerCalls': 0,
        'spendUsd': '0.00',
        'promotionAuthorized': False,
        'deploymentAuthorized': False,
        'exactDuplicateGroups': exact_duplicates,
        'nearDuplicatePairs': near_duplicates,
        'assets': records,
    }
    (OUT / 'v2-certification.json').write_text(
        json.dumps(summary, indent=2, sort_keys=True) + '\n', encoding='utf-8'
    )
    (OUT / 'v2-sha256-inventory.json').write_text(
        json.dumps(hashes, indent=2, sort_keys=True) + '\n', encoding='utf-8'
    )
    for family in GROUPS.values():
        cards = [card for candidate_family, card in thumbs if candidate_family == family]
        if not cards:
            continue
        columns = 4
        rows = (len(cards) + columns - 1) // columns
        sheet = Image.new('RGB', (columns * 240, rows * 220), (4, 6, 10))
        for index, card in enumerate(cards):
            sheet.paste(card, ((index % columns) * 240, (index // columns) * 220))
        sheet.save(OUT / f'contact-sheet-{family}.png', 'PNG', optimize=True)

    print(json.dumps({key: summary[key] for key in (
        'expected', 'present', 'technicallyPassed', 'accepted', 'rejected',
        'provenanceIncomplete', 'technicallyNoncompliant', 'providerCalls', 'spendUsd'
    )}, sort_keys=True))
    return 2 if summary['present'] != 80 or summary['technicallyNoncompliant'] != 0 else 0


if __name__ == '__main__':
    raise SystemExit(main())
