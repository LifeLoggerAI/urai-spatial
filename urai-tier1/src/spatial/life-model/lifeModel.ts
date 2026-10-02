export const LIFE_MODEL_SCHEMA_VERSION = 'urai-life-model-v1' as const

export type EvidenceClass =
  | 'SOURCE_CAPTURED'
  | 'SOURCE_DERIVED'
  | 'DIRECT_SUBJECT_TESTIMONY'
  | 'ATTRIBUTED_TESTIMONY'
  | 'CORROBORATED_INFERENCE'
  | 'CONTEXTUAL_RESEARCH'
  | 'UNKNOWN'

export type PresentationClass =
  | 'ARCHIVAL'
  | 'RECONSTRUCTED'
  | 'INTERPRETIVE'
  | 'SIMULATED'
  | 'COUNTERFACTUAL'

export type EntityKind =
  | 'person'
  | 'place'
  | 'object'
  | 'event'
  | 'relationship'
  | 'organization'
  | 'media'
  | 'statement'

export type ConfidenceLevel = 'confirmed' | 'probable' | 'approximate' | 'unknown'
export type ReviewState = 'NOT_REVIEWED' | 'REJECTED' | 'ACCEPTED' | 'BLOCKED_INSUFFICIENT_EVIDENCE'
export type SceneDecision = 'READY' | 'READY_WITH_OCCLUSION' | 'READY_INTERPRETIVE' | 'BLOCKED'

export type TemporalInterval = {
  from?: string
  to?: string
  precision: 'exact' | 'day' | 'month' | 'year' | 'range' | 'unknown'
}

export type LifeEntity = {
  id: string
  ownerId: string
  kind: EntityKind
  canonicalLabel: string
  aliases: string[]
  createdFromSourceIds: string[]
  revoked: boolean
}

export type LifeClaim = {
  id: string
  ownerId: string
  subjectEntityId: string
  predicate: string
  value: unknown
  validDuring?: TemporalInterval
  evidenceClass: EvidenceClass
  sourceIds: string[]
  confidence: ConfidenceLevel
  status: 'accepted' | 'disputed' | 'superseded'
  synthetic: boolean
}

export type NegativeConstraint = {
  id: string
  subjectEntityId: string
  rule: string
  validDuring?: TemporalInterval
  sourceIds: string[]
}

export type LifeEntityState = {
  id: string
  ownerId: string
  entityId: string
  asOf: string
  claimIds: string[]
  negativeConstraints: NegativeConstraint[]
  knowledgeCutoff?: string
  relationshipContextIds: string[]
  sourceIds: string[]
}

export type PersonModelBundle = {
  schemaVersion: typeof LIFE_MODEL_SCHEMA_VERSION
  ownerId: string
  personId: string
  stateId: string
  asOf: string
  knowledgeCutoff?: string
  relationshipContextIds: string[]
  acceptedClaimIds: string[]
  negativeConstraints: NegativeConstraint[]
  sourceIds: string[]
  consentPurposes: string[]
  evidenceCoverage: {
    acceptedClaims: number
    unknownClaims: number
    disputedClaims: number
  }
  synthetic: false
}

export type SceneTruthPacket = {
  schemaVersion: typeof LIFE_MODEL_SCHEMA_VERSION
  ownerId: string
  sceneId: string
  presentationClass: PresentationClass
  participantBundleRefs: string[]
  sourceIds: string[]
  knownClaimIds: string[]
  unknowns: string[]
  contradictions: string[]
  negativeConstraints: NegativeConstraint[]
  forbiddenAssertions: string[]
  decision: SceneDecision
  syntheticOutputMayBecomeHistoricalSource: false
}

export type DerivedArtifact = {
  id: string
  dependencyIds: string[]
  state: 'current' | 'invalidated' | 'revoked'
  invalidatedBy?: string
}

function unique(values: string[]) {
  return [...new Set(values.filter(Boolean))]
}

export function assertHistoricalSourceAuthority(input: {
  synthetic: boolean
  evidenceClass: EvidenceClass
  presentationClass?: PresentationClass
}) {
  if (input.synthetic && input.evidenceClass !== 'UNKNOWN') {
    throw new Error('SYNTHETIC_OUTPUT_CANNOT_BECOME_HISTORICAL_EVIDENCE')
  }
  if (
    input.synthetic
    && (input.presentationClass === 'SIMULATED' || input.presentationClass === 'COUNTERFACTUAL')
    && input.evidenceClass !== 'UNKNOWN'
  ) {
    throw new Error('SIMULATION_CANNOT_CREATE_HISTORICAL_EVIDENCE')
  }
}

export function compilePersonModel(input: {
  ownerId: string
  person: LifeEntity
  state: LifeEntityState
  claims: LifeClaim[]
  consentPurposes: string[]
}): PersonModelBundle {
  if (input.person.ownerId !== input.ownerId || input.state.ownerId !== input.ownerId) {
    throw new Error('OWNER_BOUNDARY_VIOLATION')
  }
  if (input.person.kind !== 'person' || input.state.entityId !== input.person.id) {
    throw new Error('PERSON_STATE_IDENTITY_MISMATCH')
  }
  if (input.person.revoked) throw new Error('PERSON_AUTHORITY_REVOKED')
  if (!input.consentPurposes.includes('identity-model')) throw new Error('IDENTITY_MODEL_CONSENT_REQUIRED')

  const selected = input.claims.filter((claim) =>
    input.state.claimIds.includes(claim.id)
    && claim.ownerId === input.ownerId
    && claim.subjectEntityId === input.person.id
  )

  for (const claim of selected) {
    assertHistoricalSourceAuthority({
      synthetic: claim.synthetic,
      evidenceClass: claim.evidenceClass,
    })
  }

  const accepted = selected.filter((claim) => claim.status === 'accepted')
  const disputed = selected.filter((claim) => claim.status === 'disputed')
  const unknown = accepted.filter((claim) => claim.evidenceClass === 'UNKNOWN')

  return {
    schemaVersion: LIFE_MODEL_SCHEMA_VERSION,
    ownerId: input.ownerId,
    personId: input.person.id,
    stateId: input.state.id,
    asOf: input.state.asOf,
    ...(input.state.knowledgeCutoff ? { knowledgeCutoff: input.state.knowledgeCutoff } : {}),
    relationshipContextIds: unique(input.state.relationshipContextIds),
    acceptedClaimIds: accepted.filter((claim) => claim.evidenceClass !== 'UNKNOWN').map((claim) => claim.id),
    negativeConstraints: input.state.negativeConstraints,
    sourceIds: unique([...input.state.sourceIds, ...accepted.flatMap((claim) => claim.sourceIds)]),
    consentPurposes: unique(input.consentPurposes),
    evidenceCoverage: {
      acceptedClaims: accepted.filter((claim) => claim.evidenceClass !== 'UNKNOWN').length,
      unknownClaims: unknown.length,
      disputedClaims: disputed.length,
    },
    synthetic: false,
  }
}

export function compileSceneTruth(input: {
  ownerId: string
  sceneId: string
  presentationClass: PresentationClass
  participantBundleRefs: string[]
  sourceIds: string[]
  knownClaimIds: string[]
  unknowns: string[]
  contradictions: string[]
  negativeConstraints: NegativeConstraint[]
  forbiddenAssertions?: string[]
  criticalUnknowns?: string[]
}): SceneTruthPacket {
  const criticalUnknowns = unique(input.criticalUnknowns ?? [])
  const contradictions = unique(input.contradictions)
  const unknowns = unique(input.unknowns)

  let decision: SceneDecision
  if (contradictions.length > 0 || criticalUnknowns.length > 0) {
    decision = 'BLOCKED'
  } else if (input.presentationClass === 'INTERPRETIVE') {
    decision = 'READY_INTERPRETIVE'
  } else if (unknowns.length > 0) {
    decision = 'READY_WITH_OCCLUSION'
  } else {
    decision = 'READY'
  }

  return {
    schemaVersion: LIFE_MODEL_SCHEMA_VERSION,
    ownerId: input.ownerId,
    sceneId: input.sceneId,
    presentationClass: input.presentationClass,
    participantBundleRefs: unique(input.participantBundleRefs),
    sourceIds: unique(input.sourceIds),
    knownClaimIds: unique(input.knownClaimIds),
    unknowns,
    contradictions,
    negativeConstraints: input.negativeConstraints,
    forbiddenAssertions: unique(input.forbiddenAssertions ?? []),
    decision,
    syntheticOutputMayBecomeHistoricalSource: false,
  }
}

export function invalidateDerivedArtifacts(input: {
  artifacts: DerivedArtifact[]
  changedDependencyIds: string[]
  reasonId: string
  revoke?: boolean
}) {
  const changed = new Set(input.changedDependencyIds)
  return input.artifacts.map((artifact) => {
    if (!artifact.dependencyIds.some((dependencyId) => changed.has(dependencyId))) return artifact
    return {
      ...artifact,
      state: input.revoke ? 'revoked' as const : 'invalidated' as const,
      invalidatedBy: input.reasonId,
    }
  })
}
