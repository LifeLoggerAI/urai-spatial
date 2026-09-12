from pathlib import Path

path = Path('urai-tier1/src/spatial/layout/HomeWorldProductionFinal.tsx')
source = path.read_text()

marker = 'v38-integrated-machine-sanctuary-production-candidate'
broken = 'function ReliquaryWing\n\nfunction ReliquaryWing('

if marker not in source:
    raise SystemExit('V38 repair requires the integrated-machine candidate marker')

count = source.count(broken)
if count == 0:
    print('HOME_V38_GENERATED_SOURCE_ALREADY_CLEAN')
    raise SystemExit(0)
if count != 1:
    raise SystemExit(f'V38 repair expected one malformed ReliquaryWing boundary, found {count}')

source = source.replace(broken, 'function ReliquaryWing(', 1)

if 'function ReliquaryWing\n\n' in source:
    raise SystemExit('V38 repair left a dangling ReliquaryWing declaration')

path.write_text(source)
print('HOME_V38_GENERATED_SOURCE_REPAIRED')
