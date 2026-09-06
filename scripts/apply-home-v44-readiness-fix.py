#!/usr/bin/env python3
from pathlib import Path

path = Path('urai-tier1/src/spatial/layout/HomeWorldProductionFinal.tsx')
source = path.read_text()
old = """const SANCTUARY_REQUIRED_OBJECTS = [
  'home-authored-terrain', 'home-authored-embodied-self', 'home-orb-sanctuary',
  'home-ground-environmental-threshold', 'home-life-map-sky-lookout', 'home-life-map-physical-portal',
  'home-sanctuary-pavilion', 'home-v30-rear-apse', 'home-v30-side-enclosure',
  'home-v30-load-bearing-vault', 'home-v30-orb-apse-architecture', 'home-orb-engineered-cradle',
] as const
"""
new = """const SANCTUARY_REQUIRED_OBJECTS = [
  'home-authored-terrain', 'home-authored-embodied-self', 'home-orb-sanctuary',
  'home-ground-environmental-threshold', 'home-life-map-sky-lookout', 'home-life-map-physical-portal',
  'home-sanctuary-pavilion', 'home-v44-monolithic-reliquary-apse', 'home-v44-reliquary-cavity',
  'home-v44-depth-practicals', 'home-v44-left-foundation-yoke', 'home-v44-right-foundation-yoke',
  'home-orb-engineered-cradle',
] as const
"""
if new in source:
    raise SystemExit('V44 readiness contract already repaired')
if old not in source:
    raise SystemExit('Expected stale V30 readiness contract not found on exact V44 source')
source = source.replace(old, new, 1)
start = source.index('const SANCTUARY_REQUIRED_OBJECTS')
end = source.index('] as const', start)
readiness = source[start:end]
for retired in ['home-v30-rear-apse', 'home-v30-side-enclosure', 'home-v30-load-bearing-vault', 'home-v30-orb-apse-architecture']:
    if retired in readiness:
        raise SystemExit(f'Retired readiness object remains: {retired}')
for required in ['home-v44-monolithic-reliquary-apse','home-v44-reliquary-cavity','home-v44-depth-practicals','home-v44-left-foundation-yoke','home-v44-right-foundation-yoke','home-orb-engineered-cradle']:
    if required not in source:
        raise SystemExit(f'V44 production object missing from source: {required}')
path.write_text(source)
print('Repaired V44 scene readiness to require current production objects')
