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

test('Replay truth modes are policy-enforced rather than cosmetic', () => {
  assert.match(model, /ReplayTruthMode/)
  assert.match(model, /'evidence'/)
  assert.match(model, /'reflection'/)
  assert.match(model, /'cinematic'/)
  assert.match(model, /'private-journal'/)
  assert.match(model, /filterReplayAnchorsForTruthMode/)
  assert.match(model, /mode === 'evidence'/)
  assert.match(model, /anchor\.evidenceLevel === 'confirmed'/)
  assert.match(model, /mode === 'reflection'/)
  assert.match(model, /replayTruthModeDescription/)
})

test('Replay preflight detects possible sensitive topics conservatively', () => {
  assert.match(model, /ReplaySensitiveTopic/)
  assert.match(model, /detectSensitiveTopics/)
  assert.match(model, /Possible sensitive material detected from user-approved Replay text/)
  assert.match(model, /People remain abstract unless a future consent record explicitly permits likeness or voice use/)
  assert.match(model, /sensitiveTopics: detectSensitiveTopics\(memory\)/)
  assert.doesNotMatch(model, /diagnoses the user|diagnostic conclusion|medical determination/i)
})
