import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
import ts from 'typescript'
import * as THREE from 'three'

const scene = fs.readFileSync(new URL('../src/components/lifemap/ComposedLifeMapScene.tsx', import.meta.url), 'utf8')
const canvasProof = fs.readFileSync(new URL('../../scripts/verify-lifemap-canvas-proof.mjs', import.meta.url), 'utf8')
const workflow = fs.readFileSync(new URL('../../.github/workflows/lifemap-founder-visual-proof.yml', import.meta.url), 'utf8')

test('selected camera goals use the same indexed world transform as rendered memories', () => {
  assert.match(scene, /lifeMapWorldPoint\(node, selectedIndex, portrait\)/)
  assert.match(scene, /goalForNode\(selected, phase, portrait, selectedIndex\)/)
  const world = fs.readFileSync(new URL('../src/components/lifemap/LifeMapProductionWorld.tsx', import.meta.url), 'utf8')
  assert.match(world, /lifeMapLocalPoint as celestialNodePosition, lifeMapStage/)
  assert.match(world, /lifeMapStage\(Boolean\(selected\), portrait\)/)
  assert.match(world, /celestialNodePosition\(selected, selectedIndex\)/)
})

test('desktop and portrait cameras target the transformed memory, including its depth offset', () => {
  const layoutSource = fs.readFileSync(new URL('../src/components/lifemap/lifeMapSpatialLayout.ts', import.meta.url), 'utf8')
  const layout = {}
  new Function('exports', ts.transpile(layoutSource, { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }))(layout)
  const cameraFunction = scene.slice(scene.indexOf('function selectedStagePoint('), scene.indexOf('\nfunction goalForNode('))
  const targetFor = new Function('THREE', 'lifeMapWorldPoint', ts.transpile(cameraFunction, { target: ts.ScriptTarget.ES2022 }) + '\nreturn selectedStagePoint;')(THREE, layout.lifeMapWorldPoint)
  const node = { position: [3, 2, -8] }
  for (const [portrait, expected] of [[false, [2.9808, 1.4152, -14.3784]], [true, [2.8704, 1.3888, -13.9592]]]) {
    const actual = targetFor(node, portrait, 0).toArray()
    expected.forEach((value, axis) => assert.ok(Math.abs(actual[axis] - value) < 1e-6))
    assert.ok(targetFor(node, portrait, 4).distanceTo(targetFor(node, portrait, 0)) > .5, 'indexed vertical placement must reach the camera target')
  }
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
