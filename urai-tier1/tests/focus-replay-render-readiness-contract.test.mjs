import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const proof = fs.readFileSync(new URL('../../scripts/capture-focus-gold-master-proof.mjs', import.meta.url), 'utf8')

test('Focus journey waits for rendered Replay before arrival capture or ESC unwind', () => {
  assert.match(proof, /data-replay-render-ready/)
  assert.match(proof, /node\?\.getAttribute\('data-replay-render-ready'\) === 'true'/)
  assert.match(proof, /canvas instanceof HTMLCanvasElement/)
  assert.match(proof, /canvasRect\.width > 100 && canvasRect\.height > 100/)
  assert.match(proof, /await waitFrames\(page, 4\)[\s\S]*await shot\('replay-arrival'\)[\s\S]*await page\.keyboard\.press\('Escape'\)/)
})

test('required Replay model and canonical manifests are never journey-abort waivers', () => {
  const allowlist = proof.match(/const JOURNEY_SOURCE_VISUAL_ABORTS = new Set\(\[([\s\S]*?)\]\)/)?.[1] ?? ''
  assert.doesNotMatch(allowlist, /replay-memory-environment-v1\.glb/)
  assert.doesNotMatch(allowlist, /v2-asset-factory-spatial-handoff\.json/)
  assert.doesNotMatch(allowlist, /v3-asset-factory-spatial-handoff\.json/)
  assert.match(proof, /Required Replay GLB and[\s\S]*canonical asset manifests are never waived/)
})
