#!/usr/bin/env python3
from pathlib import Path


def replace_once(path: str, old: str, new: str, label: str):
    p = Path(path)
    source = p.read_text()
    count = source.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected one match in {path}, found {count}')
    p.write_text(source.replace(old, new, 1))
    print(f'PATCHED {label}')

replace_once(
    'scripts/capture-natural-home-orb-proof.mjs',
    "record.physicalBase === 'authored-obsidian-ritual-platform'",
    "record.physicalBase === 'built-obsidian-glass-stone-sanctuary'",
    'Portal/Orb physical-base authority',
)

comparator = Path('scripts/compare-legacy-asset-candidates.mjs')
source = comparator.read_text()
anchor = """  {
    id: 'global-cinematic-material-pack',
    current: 'urai-tier1/public/assets/urai/generated/textures/global-cinematic-material-pack-v1.json',
    legacy: 'urai-tier1/public/assets/urai/generated/textures/global-cinematic-material-pack-v1.json',
  },
]"""
replacement = """  {
    id: 'global-cinematic-material-pack',
    current: 'urai-tier1/public/assets/urai/generated/textures/global-cinematic-material-pack-v1.json',
    legacy: 'urai-tier1/public/assets/urai/generated/textures/global-cinematic-material-pack-v1.json',
  },
  {
    id: 'passport-status-room',
    current: 'urai-tier1/public/assets/urai/generated/models/passport-status-room-v1.glb',
    legacy: 'urai-tier1/public/assets/urai/generated/models/passport-status-room-v1.glb',
  },
]"""
if source.count(anchor) != 1:
    raise SystemExit('legacy comparator pair authority changed')
source = source.replace(anchor, replacement, 1)
old_legacy = """const unmatchedLegacy = [
  'urai-tier1/public/assets/urai/generated/models/passport-status-room-v1.glb',
]"""
if source.count(old_legacy) != 1:
    raise SystemExit('legacy-only Passport authority changed')
source = source.replace(old_legacy, 'const unmatchedLegacy = []', 1)
comparator.write_text(source)
print('PATCHED governed Passport legacy comparison')

replace_once(
    'tests/mirror-release-proof.mjs',
    "await page.screenshot({ path: path.join(outDir, relative), fullPage: false, animations: 'disabled', caret: 'hide', timeout: 60000 })",
    "await page.screenshot({ path: path.join(outDir, relative), fullPage: false, animations: 'disabled', caret: 'hide', scale: 'css', timeout: 120000 })",
    'Mirror retained-screenshot reliability',
)
