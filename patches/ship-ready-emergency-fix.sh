#!/usr/bin/env bash
set -euo pipefail
python3 - <<'PY'
from pathlib import Path
layout = Path('urai-tier1/src/app/layout.tsx')
text = layout.read_text()
text = text.replace("import './accessibility.css'\n", "")
if "import './ship-ready-visual-pass.css'" not in text:
    text = text.replace("import './urai-v1.css'\n", "import './urai-v1.css'\nimport './ship-ready-visual-pass.css'\n")
layout.write_text(text)

exp = Path('urai-tier1/src/spatial/layout/TierOneExperience.tsx')
text = exp.read_text()
text = text.replace('<HomeCohesionLayer enabled={routeMode === "home"} />', '<HomeCohesionLayer enabled={mode === "home"} />')
exp.write_text(text)
PY
