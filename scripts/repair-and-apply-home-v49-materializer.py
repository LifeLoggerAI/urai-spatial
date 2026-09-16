from pathlib import Path
import runpy

materializer = Path('scripts/apply-home-v49-authored-reliquary.py')
text = materializer.read_text()
old = '''source = replace_once(
    source,
    "    if (!(object instanceof THREE.Mesh)) return\\n",
    "    if (object.name.startsWith('orb-petal-')) {\\n      object.visible = true\\n      object.scale.multiplyScalar(0.78)\\n      object.userData.uraiIntegratedVisualRole = 'v49-governed-faceted-armor-shell'\\n    }\\n    if (!(object instanceof THREE.Mesh)) return\\n",
    'Orb faceted shell',
)
'''
new = '''orb_model_start = source.index('function cloneOrbModel(source: THREE.Object3D)')
orb_model_end = source.index('\\n\\nfunction PouredStone(', orb_model_start)
orb_model = source[orb_model_start:orb_model_end]
orb_model = replace_once(
    orb_model,
    "    if (!(object instanceof THREE.Mesh)) return\\n",
    "    if (object.name.startsWith('orb-petal-')) {\\n      object.visible = true\\n      object.scale.multiplyScalar(0.78)\\n      object.userData.uraiIntegratedVisualRole = 'v49-governed-faceted-armor-shell'\\n    }\\n    if (!(object instanceof THREE.Mesh)) return\\n",
    'Orb faceted shell',
)
source = source[:orb_model_start] + orb_model + source[orb_model_end:]
'''
if old in text:
    materializer.write_text(text.replace(old, new, 1))
elif 'orb_model_start = source.index' not in text:
    raise RuntimeError('V49 materializer repair target is neither original nor repaired')
runpy.run_path(str(materializer), run_name='__main__')
