import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const scene = fs.readFileSync('src/components/lifemap/AdaptiveLifeMapScene.tsx', 'utf8')
const controls = fs.readFileSync('src/spatial/lifemap/LifeMapDeepLinkControls.tsx', 'utf8')
const interactionCss = fs.readFileSync('src/spatial/world/lifeMapIndependentInteraction.css', 'utf8')
const proofCss = fs.readFileSync('src/app/continuous-spatial-proof-defects.css', 'utf8')

test('pending memory textures cannot render default white planes', () => {
  assert.match(scene, /const textureKey = texture\?\.uuid/)
  assert.match(scene, /key=\{\`\$\{textureKey\}-main\`\}/)
  assert.match(scene, /color=\{texture \? \"#ffffff\" : \"#071425\"\}/)
  assert.match(scene, /opacity=\{texture \? selected \? 1/)
  assert.match(scene, /key=\{\`\$\{textureKey\}-left\`\}/)
  assert.match(scene, /key=\{\`\$\{textureKey\}-right\`\}/)
  assert.doesNotMatch(scene, /<meshBasicMaterial map=\{texture \?\? undefined\} transparent opacity=/)
})

test('selected memory closes semantic drawers and owns a cinematic surface', () => {
  assert.match(scene, /querySelectorAll<HTMLDetailsElement>\(\"\.life-map-accessibility-menu\"\)/)
  assert.match(controls, /requestAnimationFrame\(closeSemanticDrawers\)/)
  assert.doesNotMatch(controls, /MutationObserver|observer\.observe|document\.body/, 'Selected-memory controls must not install a body-wide DOM observer')
  assert.match(controls, /data-life-map-selected-visual=\"authored-memory-surface\"/)
  assert.match(controls, /data-selected-memory-panel=\"diegetic\"/)
  assert.match(interactionCss, /\.life-map-accessibility-menu:not\(\[open\]\) > div/)
  assert.match(proofCss, /\.urai-lifemap-selected-visual__frame/)
  assert.match(proofCss, /@media \(max-width: 760px\)/)
})

test('Life Map atmosphere cannot use viewport-scale translucent planes', () => {
  assert.doesNotMatch(scene, /<planeGeometry args=\{\[2\.6, 4\.5\]\}/, 'Continuity Nexus must not mount a rectangular glow sheet')
  assert.doesNotMatch(scene, /<planeGeometry args=\{\[(?:9\.2, 4\.8|10\.8, 5\.6|8\.4, 3\.2)\]\}/, 'Emotional weather must not use viewport-scale additive planes')
  assert.match(scene, /name="life-map-emotional-weather"/)
  assert.match(scene, /color="#4fdfff" intensity=\{0\.24\} distance=\{13\}/)
  assert.match(scene, /color="#b177ff" intensity=\{0\.2\} distance=\{15\}/)
  assert.match(scene, /color="#fff1bd" intensity=\{0\.12\} distance=\{11\}/)
})

test('Life Map suppresses retired global body atmosphere overlays', () => {
  assert.match(proofCss, /html\.urai-route-life-map body::before,\s*html\.urai-route-life-map body::after/)
  assert.match(proofCss, /content:\s*none !important/)
  assert.match(proofCss, /display:\s*none !important/)
  assert.match(proofCss, /background:\s*none !important/)
  assert.match(proofCss, /mix-blend-mode:\s*normal !important/)
})

test('Life Map removes the retired multi-overlay finishing stack', () => {
  assert.match(proofCss, /html\.urai-route-life-map \[data-testid="urai-r3f-canonical-lifemap"\] \{[\s\S]*background:\s*transparent !important/)
  assert.match(proofCss, /\[data-testid="urai-r3f-canonical-lifemap"\]::before,[\s\S]*\[data-testid="urai-r3f-canonical-lifemap"\]::after/)
  assert.match(proofCss, /html\.urai-route-life-map \.life-map-cosmic-wash,[\s\S]*html\.urai-route-life-map \.life-map-depth-vignette/)
  assert.match(proofCss, /display:\s*none !important/)
  assert.match(proofCss, /background:\s*none !important/)
})
