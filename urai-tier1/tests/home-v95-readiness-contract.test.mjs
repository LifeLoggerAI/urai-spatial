import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const runtime = readFileSync(new URL('../src/spatial/layout/HomeWorldProductionV223.tsx', import.meta.url), 'utf8')
const homeProof = readFileSync(new URL('../../scripts/run-home-state-proof-v224.mjs', import.meta.url), 'utf8')
const journeyProof = readFileSync(new URL('../../scripts/capture-canonical-journey-proof.mjs', import.meta.url), 'utf8')

test('current Home keeps visual asset and physical interaction readiness fail closed together', () => {
  assert.match(runtime, /const ready = canvasReady && sceneReady/)
  assert.match(runtime, /const inputReady = ready && !homeState\.inputLocked/)
  assert.match(runtime, /data-home-assets-ready=\{ready \? 'true' : 'false'\}/)
  assert.match(runtime, /data-home-scene-assets-ready=\{sceneReady \? 'true' : 'false'\}/)
  assert.match(runtime, /data-home-ready=\{ready \? 'true' : 'warming'\}/)
  assert.match(runtime, /data-home-input-ready=\{inputReady \? 'true' : 'false'\}/)
  assert.match(runtime, /<Suspense fallback=\{null\}>[\s\S]*<SceneAssetReadySignal onReady=\{onReady\} \/>[\s\S]*<\/Suspense>/)
  assert.equal((runtime.match(/<Canvas/g) ?? []).length, 1)
  assert.doesNotMatch(runtime, /renderedFrames\.current\s*>=/)
})

test('Home proofs bind current living-memory authority and never capture a forming world', () => {
  assert.match(homeProof, /authority\.orbVisualAuthority !== 'living-memory-translucent-heart'/)
  assert.match(homeProof, /authority\.currentRuntimeCandidate\?\.orbVisualAuthority !== 'living-memory-translucent-heart'/)
  assert.doesNotMatch(homeProof, /currentRuntimeCandidate\?\.orbVisualAuthority !== 'v288-grounded-biomorphic-reliquary'/)
  assert.match(journeyProof, /await waitAttr\(home, 'data-home-assets-ready', 'true', 90_000\)[\s\S]*await waitAttr\(home, 'data-home-input-ready', 'true', 90_000\)[\s\S]*await capture\(page, journey, 'return-home'\)/)
})

test('current Home remains fail closed pending literal retained-pixel acceptance', () => {
  assert.match(runtime, /data-home-art-certification="fresh-exact-head-pixels-required"/)
  assert.match(runtime, /data-home-visual-grade="current-literal-pixel-candidate-not-certified"/)
  assert.doesNotMatch(runtime, /PRODUCTION CERTIFIED|retained-pixel-pass|pixel-certified/)
})
