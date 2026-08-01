#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TIER = ROOT / 'urai-tier1'
LEDGER = TIER / 'src/spatial/assets/v2-provenance-ledger.json'
TECH = TIER / 'artifacts/v2-certification/v2-certification.json'
V1_HANDOFF = TIER / 'public/assets/urai/final/manifests/asset-factory-spatial-handoff.json'
REGISTRY = TIER / 'src/spatial/assets/uraiV2Assets.ts'
OUT = TIER / 'artifacts/v2-provenance-certification/v2-provenance-certification.json'


def load(path: Path):
    return json.loads(path.read_text(encoding='utf-8'))


def require(value: object, message: str) -> None:
    if not value:
        raise ValueError(message)


def target_digest(names: list[str]) -> str:
    return hashlib.sha256(('\n'.join(sorted(names)) + '\n').encode()).hexdigest()


def main() -> int:
    ledger = load(LEDGER)
    tech = load(TECH)
    v1 = load(V1_HANDOFF)
    registry = REGISTRY.read_text(encoding='utf-8')

    paid = ledger.get('paidGenerationReceipt') or {}
    generated_names = paid.get('targetNames') or []
    preserved = ledger.get('preservedSourceBindings') or []
    require(len(generated_names) == 71, f'expected 71 paid target names, found {len(generated_names)}')
    require(len(set(generated_names)) == 71, 'paid target names must be unique')
    require(target_digest(generated_names) == paid.get('targetNamesSha256'), 'paid target-name digest mismatch')
    require(paid.get('artifactId') == 8763143473, 'unexpected paid artifact ID')
    require(paid.get('runId') == 30543824770, 'unexpected paid run ID')
    require(paid.get('provider') == 'openai', 'unexpected paid provider')
    require(paid.get('providerCalls') == 71, 'provider call count drift')
    for key in ('artifactDigest', 'receiptSha256', 'targetNamesSha256'):
        require(paid.get(key), f'missing paid receipt {key}')

    require(len(preserved) == 9, f'expected 9 preserved source bindings, found {len(preserved)}')
    preserved_names = [r.get('name') for r in preserved]
    require(len(set(preserved_names)) == 9, 'preserved names must be unique')
    require(set(generated_names).isdisjoint(preserved_names), 'paid and preserved name sets overlap')

    tech_assets = {r['name']: r for r in tech.get('assets', [])}
    all_names = set(generated_names) | set(preserved_names)
    require(len(all_names) == 80, 'combined provenance set must contain 80 names')
    require(tech.get('expected') == 80, 'technical certification expected count drift')
    require(tech.get('present') == 80, 'technical certification present count drift')
    require(tech.get('technicallyPassed') == 80, 'technical certification pass count drift')
    require(tech.get('technicallyNoncompliant') == 0, 'technical certification contains noncompliant assets')
    require(set(tech_assets) == all_names, 'technical certification and provenance name sets differ')

    v1_assets = {r['name']: r for r in v1.get('assets', [])}
    issues: list[dict[str, object]] = []
    assets: list[dict[str, object]] = []

    for name in sorted(generated_names):
        technical = tech_assets[name]
        local: list[str] = []
        if technical.get('technicalStatus') != 'passed':
            local.append('technical-status-not-passed')
        if not technical.get('sha256'):
            local.append('missing-runtime-sha256')
        assets.append({
            'name': name,
            'canonicalPath': technical.get('canonicalPath'),
            'runtimeSha256': technical.get('sha256'),
            'derivationType': 'provider-generated-v2',
            'sourceRunId': paid.get('runId'),
            'sourceArtifactId': paid.get('artifactId'),
            'sourceArtifactDigest': paid.get('artifactDigest'),
            'generationReceiptSha256': paid.get('receiptSha256'),
            'provider': paid.get('provider'),
            'status': 'provenance-bound' if not local else 'failed',
            'issues': local,
        })
        if local:
            issues.append({'name': name, 'issues': local})

    for binding in sorted(preserved, key=lambda r: r['name']):
        name = binding['name']
        technical = tech_assets[name]
        source = v1_assets.get(binding.get('sourceAssetName'))
        local: list[str] = []
        if technical.get('technicalStatus') != 'passed':
            local.append('technical-status-not-passed')
        if technical.get('sha256') != binding.get('runtimeSha256'):
            local.append('runtime-sha256-mismatch')
        if technical.get('canonicalPath') != binding.get('canonicalPath'):
            local.append('canonical-path-mismatch')
        if not source:
            local.append('missing-v1-source-record')
        else:
            for key in ('providerRequestId', 'providerModel', 'sourceSha256', 'metadataSha256'):
                if not source.get(key):
                    local.append(f'v1-source-missing-{key}')
            derivative = source.get('runtimeDerivative') or {}
            if derivative.get('sourceArtifactId') != binding.get('sourceArtifactId'):
                local.append('v1-source-artifact-mismatch')
            fallback = str(source.get('canonicalPath', '')).removeprefix('assets/urai')
            if fallback not in registry:
                local.append('v1-source-not-bound-as-v2-fallback')
        assets.append({
            'name': name,
            'canonicalPath': binding.get('canonicalPath'),
            'runtimeSha256': binding.get('runtimeSha256'),
            'derivationType': 'preserved-v2-derivative-of-certified-v1-avatar',
            'sourceAssetName': binding.get('sourceAssetName'),
            'sourceArtifactId': binding.get('sourceArtifactId'),
            'sourceProviderRequestId': source.get('providerRequestId') if source else None,
            'sourceProviderModel': source.get('providerModel') if source else None,
            'sourceSha256': source.get('sourceSha256') if source else None,
            'sourceMetadataSha256': source.get('metadataSha256') if source else None,
            'status': 'provenance-bound' if not local else 'failed',
            'issues': local,
        })
        if local:
            issues.append({'name': name, 'issues': local})

    result = {
        'schemaVersion': '1.0.0',
        'version': 'v2',
        'expected': 80,
        'technicalPassed': tech.get('technicallyPassed'),
        'providerGeneratedReceiptBound': 71,
        'preservedV1SourceBound': 9,
        'provenanceBound': sum(r['status'] == 'provenance-bound' for r in assets),
        'provenanceFailed': len(issues),
        'rightsStatus': ledger.get('rightsStatus'),
        'fullyRightsAccepted': 0,
        'providerCalls': paid.get('providerCalls'),
        'reservedEstimatedCostUsd': paid.get('reservedEstimatedCostUsd'),
        'newProviderCalls': 0,
        'newSpendUsd': '0.00',
        'promotionAuthorized': False,
        'deploymentAuthorized': False,
        'rightsBoundary': ledger.get('rightsBoundary'),
        'issues': issues,
        'assets': sorted(assets, key=lambda r: r['name']),
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(result, indent=2, sort_keys=True) + '\n', encoding='utf-8')
    print(json.dumps({k: result[k] for k in (
        'expected', 'technicalPassed', 'providerGeneratedReceiptBound',
        'preservedV1SourceBound', 'provenanceBound', 'provenanceFailed',
        'rightsStatus', 'newProviderCalls', 'newSpendUsd'
    )}, sort_keys=True))
    return 0 if result['provenanceBound'] == 80 and result['provenanceFailed'] == 0 else 2


if __name__ == '__main__':
    raise SystemExit(main())
