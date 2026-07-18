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
