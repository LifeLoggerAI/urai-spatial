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
  const emotionAnchor = model.match(/id: `\$\{memory\.id\}:emotion`[\s\S]*?segmentId: 'emotion'/)?.[0] ?? ''
  assert.match(emotionAnchor, /evidenceLevel: 'inferred'/)
  assert.doesNotMatch(emotionAnchor, /evidenceLevel: 'confirmed'/)
})

test('people remain abstract unless a future consent record explicitly authorizes likeness use', () => {
  const personAnchor = model.match(/id: `\$\{memory\.id\}:person:[\s\S]*?segmentId: 'memory'/)?.[0] ?? ''
  assert.match(personAnchor, /consentState: 'abstract-only'/)
  assert.match(model, /Current memory records do not contain likeness or voice consent/)
  assert.match(client, /No likeness or voice is being synthesized/)
})

test('Replay has bounded embodied movement, recovery, and WebGL fallback', () => {
  assert.match(world, /stepEmbodiedMotion/)
  assert.match(world, /bounds: model\.bounds/)
  assert.match(world, /data-replay-spatial-renderer="webgl-r3f"/)
  assert.match(world, /data-testid="replay-webgl-fallback"/)
  assert.match(recovery, /Sample Replay uses demonstration data only/)
})

test('Replay owns movement help copy without widening the shared navigation API', () => {
  assert.match(world, /function ReplayMovementHelp/)
  assert.match(world, /Move through Replay/)
  assert.doesNotMatch(world, /MovementHelp realm="Life Map"/)
})

test('Replay truth modes are enforced in both policy and the rendered anchor graph', () => {
  assert.match(model, /ReplayTruthMode/)
  for (const mode of ["'evidence'", "'reflection'", "'cinematic'", "'private-journal'"]) assert.match(model, new RegExp(mode))
  assert.match(model, /filterReplayAnchorsForTruthMode/)
  assert.match(model, /mode === 'evidence'/)
  assert.match(model, /anchor\.evidenceLevel === 'confirmed'/)
  assert.match(model, /mode === 'reflection'/)
  assert.match(model, /replayTruthModeDescription/)
  assert.match(world, /filterReplayAnchorsForTruthMode/)
  assert.match(world, /data-replay-truth-mode=/)
  assert.match(world, /MutationObserver/)
  assert.match(client, /data-replay-truth-mode=\{truthMode\}/)
  assert.match(client, /visibleAnchors/)
})

test('Replay requires a visible non-autoplay preflight before entering the world', () => {
  assert.match(client, /data-replay-entered=\{entered \? 'true' : 'false'\}/)
  assert.match(client, /data-testid="replay-preflight"/)
  assert.match(client, /Replay preflight/)
  assert.match(client, /will not autoplay/)
  assert.match(client, /Truth mode/)
  assert.match(client, /Enter Replay/)
  assert.match(client, /Return to Focus/)
  assert.match(client, /Verified provider evidence preview/)
  assert.match(client, /evidence preview only/)
  assert.match(client, /Source ledger/)
  assert.match(client, /data-sensitive-topic-count/)
})

test('Replay preflight detects possible sensitive topics conservatively', () => {
  assert.match(model, /ReplaySensitiveTopic/)
  assert.match(model, /detectSensitiveTopics/)
  assert.match(model, /Possible sensitive material detected from user-approved Replay text/)
  assert.match(model, /People remain abstract unless a future consent record explicitly permits likeness or voice use/)
  assert.match(model, /sensitiveTopics: detectSensitiveTopics\(memory\)/)
  assert.doesNotMatch(model, /diagnoses the user|diagnostic conclusion|medical determination/i)
})
