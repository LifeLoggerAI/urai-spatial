from pathlib import Path

p = Path('urai-tier1/src/spatial/layout/HomeWorldProductionFinal.tsx')
s = p.read_text()
old = '<dodecahedronGeometry args={[1,2]} />'
new = '<icosahedronGeometry args={[1,2]} />'
if s.count(old) != 1:
    raise SystemExit(f'expected exactly one V22 engineered shell marker, found {s.count(old)}')
s = s.replace(old, new, 1)
if 'dodecahedronGeometry' in s:
    raise SystemExit('retired primitive shell marker remains in live Home source')
if new not in s or 'home-orb-engineered-body' not in s:
    raise SystemExit('engineered Orb shell contract missing after correction')
p.write_text(s)
print('Applied V22 contract-safe engineered Orb shell.')
