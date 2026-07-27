import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const scene = fs.readFileSync(new URL('../src/components/lifemap/ComposedLifeMapScene.tsx', import.meta.url), 'utf8')
const canvasProof = fs.readFileSync(new URL('../../scripts/verify-lifemap-canvas-proof.mjs', import.meta.url), 'utf8')
const workflow = fs.readFileSync(new URL('../../.github/workflows/lifemap-founder-visual-proof.yml', import.meta.url), 'utf8')

test('selected camera goals use the rendered selected-stage transform', () => {
  assert.match(scene, /function selectedStagePoint\(node: LifeMapNode, portrait: boolean\)/)
  assert.match(scene, /new THREE\.Vector3\(0\.92, 0\.96, 0\.92\)/)
  assert.match(scene, /new THREE\.Vector3\(1\.12, 1\.12, 1\.08\)/)
  assert.match(scene, /new THREE\.Vector3\(0, -0\.08, 0\.9\)/)
  assert.match(scene, /new THREE\.Vector3\(0, -0\.16, 0\.62\)/)
  assert.match(scene, /goalForNode\(selected, phase, portrait\)/)
  assert.doesNotMatch(scene, /goalForNode\(selected, phase\)/)
})

test('reduced motion forces an in-flight selected journey to arrival', () => {
  assert.match(scene, /if \(profile\.reducedMotion\) \{\s*journeyToken\.current \+= 1;\s*setPhase\("arrival"\);\s*return;/s)
})

test('Founder proof samples retained WebGL canvas pixels only', () => {
  assert.match(canvasProof, /canvas\.screenshot\(/)
  assert.match(canvasProof, /sampleCount !== 3456/)
  assert.match(canvasProof, /retained-webgl-canvas-png/)
  assert.match(canvasProof, /distributed-grid-24x16-3x3/)
  assert.match(canvasProof, /receipt\.captures\.length === 4/)
  assert.match(workflow, /scripts\/verify-lifemap-canvas-proof\.mjs/)
  assert.match(workflow, /lifemap-review-repair-contract\.test\.mjs/)
})
