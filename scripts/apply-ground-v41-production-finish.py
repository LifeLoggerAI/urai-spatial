#!/usr/bin/env python3
from pathlib import Path

GROUND = Path('urai-tier1/src/app/GroundSpatialWorldClean.tsx')
ATMOSPHERE = Path('urai-tier1/src/spatial/world/persistentRealmAtmosphere.css')
ART_BIBLE = Path('urai-tier1/tests/home-ground-lifemap-art-bible-contract.test.mjs')

ground = GROUND.read_text()
atmosphere = ATMOSPHERE.read_text()
test = ART_BIBLE.read_text()

if 'v41-depth-fog-continuity-no-horizontal-band' in ground:
    raise SystemExit('Ground V41 already materialized')
if 'v40-continuous-floor-hdr-fog-no-screen-space-band' not in ground:
    raise SystemExit('Expected Ground V40 marker before V41 repair')

replacements = {
    'clone.color.multiplyScalar(0.82);': 'clone.color.multiplyScalar(1.06);',
    'clone.emissive.set("#030807");': 'clone.emissive.set("#07110f");',
    'clone.emissiveIntensity = Math.min(clone.emissiveIntensity, 0.035);': 'clone.emissiveIntensity = Math.max(Math.min(clone.emissiveIntensity, 0.08), 0.035);',
    '<color attach="background" args={["#202d2d"]} />': '<color attach="background" args={["#263937"]} />',
    '<fogExp2 attach="fog" args={["#202d2d", 0.018]} />': '<fogExp2 attach="fog" args={["#263937", 0.026]} />',
    'environmentIntensity={0.82}': 'environmentIntensity={1.12}',
    '<ambientLight intensity={0.78} color="#e2f4ef" />': '<ambientLight intensity={1.08} color="#eaf8f3" />',
    '<hemisphereLight args={["#f0faf5", "#283b38", 1.34]} />': '<hemisphereLight args={["#f5fff9", "#324b46", 1.72]} />',
    'intensity={4.35} color="#ffe0b1"': 'intensity={5.15} color="#ffe6bd"',
    'intensity={0.9} color="#9edcff"': 'intensity={1.2} color="#a9e4ff"',
    'position={[0, 4.2, -1]} intensity={3.2}': 'position={[0, 4.6, -2]} intensity={4.1}',
    'position={[7.5, 3.1, -15]} intensity={1.6}': 'position={[7.5, 3.4, -15]} intensity={2.15}',
    'position={[-8.2, 3.4, -23]} intensity={1.4}': 'position={[-8.2, 3.8, -23]} intensity={1.95}',
    'name="ground-v40-continuous-architectural-underfloor" userData={{treatment:"v40-continuous-floor-removes-floating-island-edge"}}': 'name="ground-v41-continuous-architectural-underfloor" userData={{treatment:"v41-depth-fog-continuity-no-horizontal-band"}}',
    'color="#202822" roughness={0.9} metalness={0.025} clearcoat={0.025} clearcoatRoughness={0.88} envMapIntensity={0.72}': 'color="#27332f" roughness={0.82} metalness={0.03} clearcoat={0.035} clearcoatRoughness={0.78} envMapIntensity={0.94}',
    '<Bloom intensity={0.17} luminanceThreshold={0.82} luminanceSmoothing={0.18} mipmapBlur />': '<Bloom intensity={0.14} luminanceThreshold={0.86} luminanceSmoothing={0.2} mipmapBlur />',
    '<Vignette eskil={false} offset={0.12} darkness={0.018} />': '<Vignette eskil={false} offset={0.08} darkness={0.004} />',
    'const distance = portrait ? 8.6 : 8.8;': 'const distance = portrait ? 7.45 : 7.8;',
    'const height = portrait ? 2.18 : 2.72;': 'const height = portrait ? 2.08 : 2.34;',
    'lookAt.current.y = 1.25 + pitch.current;': 'lookAt.current.y = 1.48 + pitch.current;',
    'data-ground-compositing-treatment="v40-continuous-floor-hdr-fog-no-screen-space-band"': 'data-ground-compositing-treatment="v41-depth-fog-continuity-no-horizontal-band"',
    'camera={{ position: [0, 8.8, 25], fov: 52, near: 0.08, far: 180 }}': 'camera={{ position: [0, 7.2, 22], fov: 56, near: 0.08, far: 180 }}',
    'gl.toneMappingExposure = 1.72;': 'gl.toneMappingExposure = 1.96;',
    'filter:saturate(1.04) contrast(1.01) brightness(1.06)': 'filter:saturate(1.06) contrast(1.015) brightness(1.14)',
}
for old, new in replacements.items():
    if old not in ground:
        raise SystemExit(f'Missing expected Ground V40 source fragment: {old}')
    ground = ground.replace(old, new, 1)

infra_rule = """

/* V41 Ground owns physical fog and depth. Shared screen-space layers must never create a retained-pixel horizon band. */
.urai-world-atmosphere[data-realm='infrastructure-hub'] .urai-world-atmosphere__horizon,
.urai-world-atmosphere[data-realm='infrastructure-hub'] .urai-world-atmosphere__threshold {
  display: none !important;
  opacity: 0 !important;
  box-shadow: none !important;
}
.urai-world-atmosphere[data-realm='infrastructure-hub'] .urai-world-atmosphere__sky {
  opacity: .12;
  mix-blend-mode: screen;
}
.urai-world-atmosphere[data-realm='infrastructure-hub'] .urai-world-atmosphere__weather {
  opacity: .18;
}
.urai-world-atmosphere[data-realm='infrastructure-hub'] .urai-world-atmosphere__depth {
  box-shadow: inset 0 0 72px rgba(0,0,0,.12), inset 0 -8vh 62px rgba(0,0,0,.08);
}
"""
if "V41 Ground owns physical fog and depth" not in atmosphere:
    atmosphere += infra_rule

# Move the art-bible from stale V40 values to exact V41 invariants while preserving the bar.
test_replacements = {
    "const lifeMap = read('src/spatial/lifemap/SpatialLifeMapCanonical.tsx')": "const atmosphereCss = read('src/spatial/world/persistentRealmAtmosphere.css')\nconst lifeMap = read('src/spatial/lifemap/SpatialLifeMapCanonical.tsx')",
    "const groundGraph = `${groundOwner}\\n${groundModel}`": "const groundGraph = `${groundOwner}\\n${groundModel}\\n${atmosphereCss}`",
    "'data-ground-compositing-treatment=\"v40-continuous-floor-hdr-fog-no-screen-space-band\"'": "'data-ground-compositing-treatment=\"v41-depth-fog-continuity-no-horizontal-band\"'",
    "'ground-v40-continuous-architectural-underfloor'": "'ground-v41-continuous-architectural-underfloor'",
    "'v40-continuous-floor-removes-floating-island-edge'": "'v41-depth-fog-continuity-no-horizontal-band'",
    '/<color attach="background" args=\\{\\["#202d2d"\\]\\} \\/>/': '/<color attach="background" args=\\{\\["#263937"\\]\\} \\/>/',
    '/<fogExp2 attach="fog" args=\\{\\["#202d2d", 0\\.018\\]\\}/': '/<fogExp2 attach="fog" args=\\{\\["#263937", 0\\.026\\]\\}/',
    'environmentIntensity=\\{0\\.82\\}': 'environmentIntensity=\\{1\\.12\\}',
    '/gl\\.toneMappingExposure = 1\\.72/': '/gl\\.toneMappingExposure = 1\\.96/',
    '/<ambientLight intensity=\\{0\\.78\\}/': '/<ambientLight intensity=\\{1\\.08\\}/',
    '/<hemisphereLight args=\\{\\["#f0faf5", "#283b38", 1\\.34\\]\\}/': '/<hemisphereLight args=\\{\\["#f5fff9", "#324b46", 1\\.72\\]\\}/',
    '/<directionalLight position=\\{\\[9, 18, 12\\]\\} intensity=\\{4\\.35\\}/': '/<directionalLight position=\\{\\[9, 18, 12\\]\\} intensity=\\{5\\.15\\}/',
    '/<Vignette eskil=\\{false\\} offset=\\{0\\.12\\} darkness=\\{0\\.018\\}/': '/<Vignette eskil=\\{false\\} offset=\\{0\\.08\\} darkness=\\{0\\.004\\}/',
    '/brightness\\(1\\.06\\)/': '/brightness\\(1\\.14\\)/',
    '/camera=\\{\\{ position: \\[0, 8\\.8, 25\\], fov: 52/': '/camera=\\{\\{ position: \\[0, 7\\.2, 22\\], fov: 56/',
}
for old, new in test_replacements.items():
    if old not in test:
        raise SystemExit(f'Missing expected Ground art-bible assertion: {old}')
    test = test.replace(old, new, 1)

needle = "  assert.match(groundOwner, /infrastructure-hub[^\\n]*__horizon[^\\n]*opacity:0!important/)"
if needle not in test:
    raise SystemExit('Missing prior Ground atmosphere assertion')
test = test.replace(needle, "  assert.match(groundOwner, /infrastructure-hub[^\\n]*__horizon[^\\n]*opacity:0!important/)\n  assert.match(atmosphereCss, /V41 Ground owns physical fog and depth/)\n  assert.match(atmosphereCss, /infrastructure-hub[^}]*__horizon,[\\s\\S]*display: none !important/)\n  assert.match(groundOwner, /clone\\.color\\.multiplyScalar\\(1\\.06\\)/)", 1)

for marker in [
    'v41-depth-fog-continuity-no-horizontal-band',
    'gl.toneMappingExposure = 1.96',
    'brightness(1.14)',
    'camera={{ position: [0, 7.2, 22], fov: 56',
]:
    if marker not in ground:
        raise SystemExit(f'Missing Ground V41 marker after transform: {marker}')

GROUND.write_text(ground)
ATMOSPHERE.write_text(atmosphere)
ART_BIBLE.write_text(test)
print('Materialized Ground V41 seam/readability repair')
