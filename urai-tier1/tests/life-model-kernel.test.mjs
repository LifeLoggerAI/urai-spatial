import assert from 'node:assert/strict'
import test from 'node:test'
import {
  assertHistoricalSourceAuthority,
  compilePersonModel,
  compileSceneTruth,
  invalidateDerivedArtifacts,
} from '../src/spatial/life-model/lifeModel.ts'

const person = {
  id: 'person:fixture',
  ownerId: 'owner:fixture',
  kind: 'person',
  canonicalLabel: 'Private fixture person',
  aliases: [],
  createdFromSourceIds: ['source:1'],
  revoked: false,
}

const state = {
  id: 'person-state:fixture:1975',
  ownerId: 'owner:fixture',
  entityId: 'person:fixture',
  asOf: '1975-06-01',
  claimIds: ['claim:role', 'claim:unknown', 'claim:disputed'],
  negativeConstraints: [{
    id: 'constraint:not-role',
    subjectEntityId: 'person:fixture',
    rule: 'NOT_UNSUPPORTED_ROLE',
    sourceIds: ['source:1'],
  }],
  knowledgeCutoff: '1975-06-01',
  relationshipContextIds: ['relationship:fixture'],
  sourceIds: ['source:1'],
}

const claims = [
  {
    id: 'claim:role',
    ownerId: 'owner:fixture',
    subjectEntityId: 'person:fixture',
    predicate: 'role',
    value: 'source-supported-role',
    evidenceClass: 'DIRECT_SUBJECT_TESTIMONY',
    sourceIds: ['source:1'],
    confidence: 'confirmed',
    status: 'accepted',
    synthetic: false,
  },
  {
    id: 'claim:unknown',
    ownerId: 'owner:fixture',
    subjectEntityId: 'person:fixture',
    predicate: 'vehicle',
    value: null,
    evidenceClass: 'UNKNOWN',
    sourceIds: [],
    confidence: 'unknown',
    status: 'accepted',
    synthetic: false,
  },
  {
    id: 'claim:disputed',
    ownerId: 'owner:fixture',
    subjectEntityId: 'person:fixture',
    predicate: 'year',
    value: '1974',
    evidenceClass: 'ATTRIBUTED_TESTIMONY',
    sourceIds: ['source:2'],
    confidence: 'approximate',
    status: 'disputed',
    synthetic: false,
  },
]

test('person compiler preserves time, knowledge, negative constraints and evidence coverage', () => {
  const bundle = compilePersonModel({
    ownerId: 'owner:fixture',
    person,
    state,
    claims,
    consentPurposes: ['archive', 'identity-model'],
  })
  assert.equal(bundle.personId, 'person:fixture')
  assert.equal(bundle.knowledgeCutoff, '1975-06-01')
  assert.deepEqual(bundle.acceptedClaimIds, ['claim:role'])
  assert.equal(bundle.evidenceCoverage.unknownClaims, 1)
  assert.equal(bundle.evidenceCoverage.disputedClaims, 1)
  assert.equal(bundle.negativeConstraints[0].rule, 'NOT_UNSUPPORTED_ROLE')
  assert.equal(bundle.synthetic, false)
})

test('synthetic output cannot be promoted to recorded historical source authority', () => {
  assert.throws(
    () => assertHistoricalSourceAuthority({ synthetic: true, evidenceClass: 'SOURCE_CAPTURED' }),
    /SYNTHETIC_OUTPUT_CANNOT_BE_SOURCE_CAPTURED/,
  )
  assert.throws(
    () => assertHistoricalSourceAuthority({
      synthetic: true,
      evidenceClass: 'CORROBORATED_INFERENCE',
      presentationClass: 'SIMULATED',
    }),
    /SIMULATION_CANNOT_CREATE_HISTORICAL_EVIDENCE/,
  )
  assert.throws(
    () => assertHistoricalSourceAuthority({
      synthetic: true,
      evidenceClass: 'DIRECT_SUBJECT_TESTIMONY',
    }),
    /SYNTHETIC_OUTPUT_CANNOT_BECOME_HISTORICAL_EVIDENCE/,
  )
})

test('unknown noncritical detail becomes occlusion, contradiction becomes block', () => {
  const occluded = compileSceneTruth({
    ownerId: 'owner:fixture',
    sceneId: 'scene:1',
    presentationClass: 'RECONSTRUCTED',
    participantBundleRefs: ['bundle:1'],
    sourceIds: ['source:1'],
    knownClaimIds: ['claim:role'],
    unknowns: ['exact-vehicle'],
    contradictions: [],
    negativeConstraints: state.negativeConstraints,
  })
  assert.equal(occluded.decision, 'READY_WITH_OCCLUSION')

  const blocked = compileSceneTruth({
    ownerId: 'owner:fixture',
    sceneId: 'scene:2',
    presentationClass: 'RECONSTRUCTED',
    participantBundleRefs: ['bundle:1'],
    sourceIds: ['source:1', 'source:2'],
    knownClaimIds: ['claim:role'],
    unknowns: [],
    contradictions: ['role-conflict'],
    negativeConstraints: state.negativeConstraints,
  })
  assert.equal(blocked.decision, 'BLOCKED')
})

test('correction and consent dependency changes invalidate downstream derivatives', () => {
  const result = invalidateDerivedArtifacts({
    artifacts: [
      { id: 'movie:1', dependencyIds: ['claim:role'], state: 'current' },
      { id: 'world:1', dependencyIds: ['place:1'], state: 'current' },
    ],
    changedDependencyIds: ['claim:role'],
    reasonId: 'correction:1',
  })
  assert.equal(result[0].state, 'invalidated')
  assert.equal(result[0].invalidatedBy, 'correction:1')
  assert.equal(result[1].state, 'current')

  const revoked = invalidateDerivedArtifacts({
    artifacts: result,
    changedDependencyIds: ['place:1'],
    reasonId: 'consent-revocation:1',
    revoke: true,
  })
  assert.equal(revoked[1].state, 'revoked')
})

test('owner boundary fails closed', () => {
  assert.throws(() => compilePersonModel({
    ownerId: 'other-owner',
    person,
    state,
    claims,
    consentPurposes: [],
  }), /OWNER_BOUNDARY_VIOLATION/)
})

test('person compilation requires explicit identity-model consent', () => {
  assert.throws(() => compilePersonModel({
    ownerId: 'owner:fixture',
    person,
    state,
    claims,
    consentPurposes: ['archive'],
  }), /IDENTITY_MODEL_CONSENT_REQUIRED/)
})
