from pathlib import Path

path = Path('urai-tier1/src/spatial/layout/HomeWorldProductionFinal.tsx')
source = path.read_text()
old = """const SANCTUARY_REQUIRED_OBJECTS = [
  'home-authored-terrain', 'home-authored-embodied-self', 'home-orb-sanctuary',
  'home-ground-environmental-threshold', 'home-life-map-sky-lookout', 'home-life-map-physical-portal',
  'home-mountain-horizon', 'home-living-vegetation', 'home-sanctuary-pavilion',
] as const"""
new = """const SANCTUARY_REQUIRED_OBJECTS = [
  'home-authored-terrain', 'home-authored-embodied-self', 'home-orb-sanctuary',
  'home-ground-environmental-threshold', 'home-life-map-sky-lookout', 'home-life-map-physical-portal',
  'home-sanctuary-pavilion', 'home-v30-rear-apse', 'home-v30-side-enclosure',
  'home-v30-load-bearing-vault', 'home-v30-orb-apse-architecture', 'home-orb-engineered-cradle',
] as const"""
assert old in source, 'expected V29 readiness authority not found'
source = source.replace(old, new, 1)
assert "'home-mountain-horizon'" not in source.split('] as const', 1)[0]
assert "'home-living-vegetation'" not in source.split('] as const', 1)[0]
for marker in ['home-v30-rear-apse','home-v30-side-enclosure','home-v30-load-bearing-vault','home-v30-orb-apse-architecture','home-orb-engineered-cradle']:
    assert marker in source
path.write_text(source)
