#!/usr/bin/env python3
from pathlib import Path

original = Path('scripts/apply-home-v45-integrated-reliquary.py')
program = original.read_text()
old_machine = 'source, n = re.subn(r"function MachineCavityLiner\\(\\)\\{.*?\\n\\}", new_cavity, source, count=1, flags=re.S)'
new_machine = 'source, n = re.subn(r"function MachineCavityLiner\\(\\)\\{.*?(?=\\n\\nfunction SanctuaryArchitecture)", new_cavity, source, count=1, flags=re.S)'
old_wing = 'source, n = re.subn(r"function ReliquaryWing\\(\\{side\\}:\\{side:-1\\|1\\}\\)\\{.*?\\n\\}", new_wing, source, count=1, flags=re.S)'
new_wing = 'source, n = re.subn(r"function ReliquaryWing\\(\\{side\\}:\\{side:-1\\|1\\}\\)\\{.*?(?=\\n\\nfunction CrownBridge)", new_wing, source, count=1, flags=re.S)'
if old_machine not in program or old_wing not in program:
    raise SystemExit('Expected V45 authoring regexes not found')
program = program.replace(old_machine, new_machine, 1).replace(old_wing, new_wing, 1)
compile(program, str(original), 'exec')
exec(program, {'__name__': '__main__', '__file__': str(original)})
