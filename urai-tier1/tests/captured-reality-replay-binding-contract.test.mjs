import assert from 'node:assert/strict'
import test from 'node:test'
import { buildCapturedRealityReplayPlan, validateCapturedRealityReplayBinding } from '../src/spatial/captured-reality/capturedRealityReplay.ts'

const source = { id: 'video-a', provenance: 'recorded', sourceType: 'video', transformations: [] }
const place = {
  id: 'place-1', kind: 'place', label: 'Private place', eraIds: [], sourceIds: ['video-a'],
  reconstruction: { fidelity: 'confirmed', confidence: 1, sourceIds: ['video-a'], privacy: { requiredPurposes: ['location.context'], consentTiers: ['C3'], thirdPartyPresent: false, exactLocationAllowed: true, biometricIdentityAllowed: false, sensitiveInferenceAllowed: false, publicContributionAllowed: false }, visibility: 'private', userCorrectionRevision: 0 },
  semanticImportance: 1, placeType: 'family-home', geographicPrecision: 'exact-private', buildingIds: [], routeIds: [],
}
const memory = {
  id: 'memory-1', kind: 'memory', label: 'Known memory', eraIds: [], sourceIds: ['video-a'],
  reconstruction: { fidelity: 'confirmed', confidence: 1, sourceIds: ['video-a'], privacy: { requiredPurposes: [], consentTiers: [], thirdPartyPresent: false, exactLocationAllowed: false, biometricIdentityAllowed: false, sensitiveInferenceAllowed: false, publicContributionAllowed: false }, visibility: 'private', userCorrectionRevision: 0 },
  semanticImportance: 1, placeIds: ['place-1'], personPresenceIds: [], objectIds: [], eventIds: [], replaySourceIds: ['video-a'],
}
const graph = { schemaVersion: 'urai-lived-world-1', ownerId: 'owner-1', generatedAt: '2026-09-25T00:00:00Z', sourcePolicyVersion: 'test', sources: { 'video-a': source }, entities: { 'place-1': place, 'memory-1': memory }, edges: [] }
const asset = {
  id: 'capture-1', ownerId: 'owner-1', anchorEntityId: 'place-1', truthClass: 'spatially-reconstructable',
  qa: { reviewState: 'accepted' },
}
const binding = {
  schemaVersion: 'urai-captured-reality-replay-binding-1',
  ownerId: 'owner-1',
  memoryId: 'memory-1',
  placeEntityId: 'place-1',
  capturedRealityAssetId: 'capture-1',
  memoryStarId: 'star-memory-1',
  anchors: [{ id: 'anchor-1', kind: 'video', sourceId: 'video-a', position: [0, 1.4, -2] }],
  returnContract: { focusMemoryId: 'memory-1', returnTo: 'focus', preserveSelectedMemory: true },
}

test('captured place binds only to the same source-backed memory place and preserves Focus return identity', () => {
  assert.deepEqual(validateCapturedRealityReplayBinding({ graph, asset, binding }), [])
  const plan = buildCapturedRealityReplayPlan({ graph, asset, binding, capturedRealityAvailable: true })
  assert.equal(plan.mode, 'captured-place')
  assert.equal(plan.focusMemoryId, 'memory-1')
  assert.equal(plan.returnTo, 'focus')
  assert.equal(plan.anchors.length, 1)
})

test('captured-place absence degrades to existing standard Replay instead of blocking the memory', () => {
  const plan = buildCapturedRealityReplayPlan({ graph, asset, binding, capturedRealityAvailable: false })
  assert.equal(plan.mode, 'standard-replay')
  assert.equal(plan.reason, 'CAPTURED_REALITY_UNAVAILABLE')
})

test('memory cannot be mounted into an unrelated captured place', () => {
  const bad = { ...binding, placeEntityId: 'place-other' }
  const errors = validateCapturedRealityReplayBinding({ graph, asset, binding: bad })
  assert.ok(errors.includes('PLACE_ASSET_ANCHOR_MISMATCH'))
  assert.ok(errors.includes('MEMORY_PLACE_MISMATCH'))
})

test('missing source anchor never becomes fabricated spatial memory evidence', () => {
  const bad = { ...binding, anchors: [{ id: 'anchor-x', kind: 'audio', sourceId: 'missing', position: [0, 0, 0] }] }
  const errors = validateCapturedRealityReplayBinding({ graph, asset, binding: bad })
  assert.ok(errors.includes('ANCHOR_SOURCE_MISSING:missing'))
})
