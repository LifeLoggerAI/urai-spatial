import assert from 'node:assert/strict'
import test from 'node:test'
import {
  isSourceBacked,
  normalizeReconstructionAuthority,
  validateLivedWorldGraph,
} from '../src/spatial/lived-world/livedWorldGraph.ts'
import {
  decideReconstructionMount,
  revokeDependentPersonalization,
} from '../src/spatial/lived-world/reconstructionPolicy.ts'

const privacy = (overrides = {}) => ({
  requiredPurposes: [],
  consentTiers: [],
  thirdPartyPresent: false,
  exactLocationAllowed: false,
  biometricIdentityAllowed: false,
  sensitiveInferenceAllowed: false,
  publicContributionAllowed: false,
  ...overrides,
})

const reconstruction = (overrides = {}) => ({
  fidelity: 'unknown',
  confidence: 0,
  sourceIds: [],
  privacy: privacy(),
  visibility: 'private',
  userCorrectionRevision: 0,
  ...overrides,
})

const graph = (entities, sources = {}, edges = []) => ({
  schemaVersion: 'urai-lived-world-1',
  ownerId: 'user',
  generatedAt: '2026-09-16T00:00:00Z',
  sourcePolicyVersion: 'test',
  sources,
  entities,
  edges,
})

test('confirmed autobiography cannot validate without source backing', () => {
  const place = {
    id: 'place-1',
    kind: 'place',
    label: 'Known place',
    eraIds: [],
    sourceIds: [],
    reconstruction: reconstruction({ fidelity: 'confirmed', confidence: 1 }),
    semanticImportance: 1,
    placeType: 'other',
    geographicPrecision: 'none',
    buildingIds: [],
    routeIds: [],
  }
  const errors = validateLivedWorldGraph(graph({ 'place-1': place }))
  assert.ok(errors.includes('CONFIRMED_WITHOUT_SOURCE:place-1'))
  assert.equal(isSourceBacked(place, graph({ 'place-1': place })), false)
})

test('generated context can never qualify a confirmed entity as source-backed autobiography', () => {
  const source = { id: 'generated-1', provenance: 'generated-context', sourceType: 'system-derived', transformations: [] }
  const place = {
    id: 'place-1', kind: 'place', label: 'Generic context', eraIds: [], sourceIds: ['generated-1'],
    reconstruction: reconstruction({ fidelity: 'confirmed', confidence: 1, sourceIds: ['generated-1'] }),
    semanticImportance: 1, placeType: 'other', geographicPrecision: 'none', buildingIds: [], routeIds: [],
  }
  assert.equal(isSourceBacked(place, graph({ 'place-1': place }, { 'generated-1': source })), false)
})

test('location reconstruction fails closed to explicitly generic fallback without C3 location consent', () => {
  const source = { id: 'pin-1', provenance: 'recorded', sourceType: 'device-location', transformations: [] }
  const place = {
    id: 'place-1', kind: 'place', label: 'Private place', eraIds: [], sourceIds: ['pin-1'],
    reconstruction: reconstruction({
      fidelity: 'partial', confidence: .6, sourceIds: ['pin-1'],
      privacy: privacy({ requiredPurposes: ['location.context'], consentTiers: ['C3'], exactLocationAllowed: true }),
    }),
    semanticImportance: 1, placeType: 'other', geographicPrecision: 'exact-private', buildingIds: [], routeIds: [],
  }
  const g = graph({ 'place-1': place }, { 'pin-1': source })
  const decision = decideReconstructionMount({ entity: place, graph: g, consent: {} })
  assert.equal(decision.mount, 'generic-fallback')
  assert.equal(decision.allowedSourceIds.length, 0)
  assert.ok(decision.reasons.includes('C3_LOCATION_NOT_GRANTED'))
})

test('partial location source can mount only as partial after explicit C3 consent', () => {
  const source = { id: 'pin-1', provenance: 'recorded', sourceType: 'device-location', transformations: [] }
  const place = {
    id: 'place-1', kind: 'place', label: 'Private place', eraIds: [], sourceIds: ['pin-1'],
    reconstruction: reconstruction({
      fidelity: 'partial', confidence: .6, sourceIds: ['pin-1'],
      privacy: privacy({ requiredPurposes: ['location.context'], consentTiers: ['C3'], exactLocationAllowed: true }),
    }),
    semanticImportance: 1, placeType: 'other', geographicPrecision: 'exact-private', buildingIds: [], routeIds: [],
  }
  const g = graph({ 'place-1': place }, { 'pin-1': source })
  const consent = { 'location.context': { purpose: 'location.context', tier: 'C3', status: 'granted' } }
  const decision = decideReconstructionMount({ entity: place, graph: g, consent })
  assert.equal(decision.mount, 'partial')
  assert.deepEqual(decision.allowedSourceIds, ['pin-1'])
  assert.ok(decision.reasons.includes('PARTIAL_RECONSTRUCTION_MUST_REMAIN_VISIBLY_BOUNDED'))
})

test('sensitive emotional association is suppressed without explicit C4 consent', () => {
  const source = { id: 'signal-1', provenance: 'derived', sourceType: 'system-derived', transformations: [] }
  const emotion = {
    id: 'emotion-1', kind: 'emotional-association', label: 'Possible signal', eraIds: [], sourceIds: ['signal-1'],
    reconstruction: reconstruction({
      fidelity: 'partial', confidence: .4, sourceIds: ['signal-1'],
      privacy: privacy({ requiredPurposes: ['inference.sensitive'], consentTiers: ['C4'], sensitiveInferenceAllowed: true }),
    }),
    semanticImportance: .5, targetEntityIds: [], language: 'possible-signal', inferencePurpose: 'inference.sensitive',
  }
  const g = graph({ 'emotion-1': emotion }, { 'signal-1': source })
  const decision = decideReconstructionMount({ entity: emotion, graph: g, consent: {} })
  assert.equal(decision.mount, 'suppressed')
  assert.equal(decision.emotionalAssociationAllowed, false)
  assert.ok(decision.reasons.includes('C4_SENSITIVE_INFERENCE_NOT_GRANTED'))
})

test('third-party person presence degrades to an environmental trace when biometric authority is absent', () => {
  const source = { id: 'memory-1', provenance: 'recorded', sourceType: 'photo', transformations: [] }
  const person = {
    id: 'person-1', kind: 'person-presence', label: 'Remembered person', eraIds: [], sourceIds: ['memory-1'],
    reconstruction: reconstruction({ fidelity: 'partial', confidence: .5, sourceIds: ['memory-1'], privacy: privacy({ thirdPartyPresent: true }) }),
    semanticImportance: .8, relationship: 'known person', associatedEntityIds: [], memoryIds: [], renderingMode: 'recognizable',
    likenessAuthority: 'memory-context-only', voiceAuthority: 'none', thirdParty: true, minorOrDependent: false,
    griefOrLegacySensitive: false, autonomousDialogueAllowed: false,
  }
  const g = graph({ 'person-1': person }, { 'memory-1': source })
  const decision = decideReconstructionMount({ entity: person, graph: g, consent: {} })
  assert.equal(decision.personMode, 'environmental-trace')
})

test('normalization clamps confidence, deduplicates sources and nonnegative revision', () => {
  const result = normalizeReconstructionAuthority(reconstruction({ confidence: 4, sourceIds: ['a', 'a'], userCorrectionRevision: -3 }))
  assert.equal(result.confidence, 1)
  assert.deepEqual(result.sourceIds, ['a'])
  assert.equal(result.userCorrectionRevision, 0)
})

test('revocation recomputes every entity through the same fail-closed policy', () => {
  const place = {
    id: 'place-1', kind: 'place', label: 'Private place', eraIds: [], sourceIds: [],
    reconstruction: reconstruction({ fidelity: 'unknown', privacy: privacy({ requiredPurposes: ['location.context'], consentTiers: ['C3'] }) }),
    semanticImportance: 1, placeType: 'other', geographicPrecision: 'none', buildingIds: [], routeIds: [],
  }
  const result = revokeDependentPersonalization({ graph: graph({ 'place-1': place }), consent: {} })
  assert.equal(result['place-1'].mount, 'generic-fallback')
})
