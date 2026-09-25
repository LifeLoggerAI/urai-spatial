import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const runtime = readFileSync(new URL('../src/spatial/layout/HomeWorldProductionV223.tsx', import.meta.url), 'utf8')

test('current Home keeps visual asset readiness fail closed while interaction-critical runtime can progress', () => {
  assert.match(runtime, /const ready = canvasReady && sceneReady/)
  assert.match(runtime, /const inputReady = canvasReady && !homeState\.inputLocked/)
  assert.match(runtime, /data-home-assets-ready=\{ready \? 'true' : 'false'\}/)
  assert.match(runtime, /data-home-scene-assets-ready=\{sceneReady \? 'true' : 'false'\}/)
  assert.match(runtime, /data-home-ready=\{ready \? 'true' : 'warming'\}/)
  assert.match(runtime, /data-home-input-ready=\{inputReady \? 'true' : 'false'\}/)
  assert.match(runtime, /<Suspense fallback=\{null\}>[\s\S]*<SceneAssetReadySignal onReady=\{onReady\} \/>[\s\S]*<\/Suspense>/)
  assert.equal((runtime.match(/<Canvas/g) ?? []).length, 1)
  assert.doesNotMatch(runtime, /renderedFrames\.current\s*>=/)
})

test('current Home remains fail closed pending literal retained-pixel acceptance', () => {
  assert.match(runtime, /data-home-art-certification="fresh-exact-head-pixels-required"/)
  assert.match(runtime, /data-home-visual-grade="current-literal-pixel-candidate-not-certified"/)
  assert.doesNotMatch(runtime, /PRODUCTION CERTIFIED|retained-pixel-pass|pixel-certified/)
})
