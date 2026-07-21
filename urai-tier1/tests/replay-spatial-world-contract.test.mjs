import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const model = fs.readFileSync(new URL('../src/spatial/replay/replaySpatialModel.ts', import.meta.url), 'utf8')
const world = fs.readFileSync(new URL('../src/app/replay/ReplaySpatialWorld.tsx', import.meta.url), 'utf8')
const recovery = fs.readFileSync(new URL('../src/app/replay/ReplayRecoveryState.tsx', import.meta.url), 'utf8')
const client = fs.readFileSync(new URL('../src/app/replay/CinematicReplayClient.tsx', import.meta.url), 'utf8')

test('Replay reconstruction separates evidence from inference', () => {
  assert.match(model, /ReplayEvidenceLevel/)
  assert.match(model, /evidenceLevel: 'confirmed'/)
  assert.match(model, /evidenceLevel: 'inferred'/)
  assert.match(model, /evidenceLevel: memory\.emotionalArc\.length \? 'inferred' : 'unknown'/)
  assert.match(model, /replayEvidenceDescription/)
  assert.doesNotMatch(model, /evidenceLevel: 'confirmed'.*emotionalState/s)
})

test('people remain abstract unless a future consent record explicitly authorizes likeness use', () => {
  assert.match(model, /consentState: 'abstract-only'/)
  assert.match(model, /do not contain likeness or voice consent/i)
  assert.match(client, /No likeness or voice is being synthesized/)
})

test('active Replay owner is a real bounded R3F world', () => {
  assert.match(world, /<Canvas/)
  assert.match(world, /stepEmbodiedMotion/)
  assert.match(world, /bounds: model\.bounds/)
  assert.match(world, /ReplayCamera/)
  assert.match(world, /ReplayFloor/)
  assert.match(world, /data-replay-spatial-renderer="webgl-r3f"/)
  assert.match(world, /shell\.dataset\.replayCameraX/)
  assert.match(world, /shell\.dataset\.replayCameraZ/)
  assert.match(world, /guided.*explore/s)
})

test('WebGL loss is honest and still permits a safe exit', () => {
  assert.match(world, /data-testid="replay-webgl-fallback"/)
  assert.match(world, /instead of pretending this is an explorable world/)
  assert.match(world, /onClick=\{onExit\}/)
})

test('direct Replay entry provides useful recovery instead of one dead-end action', () => {
  assert.match(recovery, /Choose a memory/)
  assert.match(recovery, /Return to Focus/)
  assert.match(recovery, /Open sample Replay/)
  assert.match(recovery, /Go back/)
  assert.match(recovery, /\/life-map\?from=replay-recovery/)
  assert.match(recovery, /demo:sample-replay/)
  assert.match(recovery, /does not reveal private-memory details/)
})

test('valid Replay privacy and correction controls remain mounted', () => {
  assert.match(client, /ReplayProductControls memory=\{memory\}/)
  assert.match(client, /memory\.replayManifest\.transcript/)
  assert.match(client, /Reduce sensory/)
  assert.match(client, /requestUraiWorldReturn/)
})

test('flat wallpaper and CSS portal are removed from the active owner', () => {
  assert.doesNotMatch(client, /replayBackdrop/)
  assert.doesNotMatch(client, /replayPortal/)
  assert.doesNotMatch(client, /--replay-media/)
  assert.doesNotMatch(client, /background-image:.*replayAssets/s)
})
