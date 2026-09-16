import type {
  ConsentDecisionSnapshot,
  LivedWorldEntity,
  LivedWorldGraph,
  PersonPresenceMode,
  ReconstructionFidelity,
} from './livedWorldGraph'

export type LivedWorldMountMode = 'personalized' | 'partial' | 'generic-fallback' | 'suppressed'

export type ReconstructionMountDecision = {
  mount: LivedWorldMountMode
  fidelity: ReconstructionFidelity
  reasons: readonly string[]
  allowedSourceIds: readonly string[]
  personMode?: PersonPresenceMode
  emotionalAssociationAllowed: boolean
}

export type ConsentDecisionMap = Readonly<Record<string, ConsentDecisionSnapshot | undefined>>

const granted = (decisions: ConsentDecisionMap, purpose: string) => decisions[purpose]?.status === 'granted'

function allPurposesGranted(entity: LivedWorldEntity, decisions: ConsentDecisionMap) {
  return entity.reconstruction.privacy.requiredPurposes.every((purpose) => granted(decisions, purpose))
}

function sourceBacked(entity: LivedWorldEntity, graph: LivedWorldGraph) {
  return entity.reconstruction.sourceIds.length > 0
    && entity.reconstruction.sourceIds.every((sourceId) => Boolean(graph.sources[sourceId]))
}

function boundedPersonMode(entity: LivedWorldEntity, decisions: ConsentDecisionMap): PersonPresenceMode | undefined {
  if (entity.kind !== 'person-presence') return undefined
  const biometricGranted = granted(decisions, 'biometric.identity')
  const relationshipSensitive = entity.thirdParty || entity.minorOrDependent || entity.griefOrLegacySensitive
  if (entity.likenessAuthority === 'none' || entity.likenessAuthority === 'restricted') return 'unavailable'
  if (!biometricGranted || !entity.reconstruction.privacy.biometricIdentityAllowed) {
    return relationshipSensitive ? 'environmental-trace' : 'silhouette'
  }
  if (entity.renderingMode === 'voice-only' && entity.voiceAuthority !== 'explicit' && entity.voiceAuthority !== 'recorded-source-only') return 'environmental-trace'
  if (entity.thirdParty && entity.likenessAuthority !== 'explicit') return 'partial'
  return entity.renderingMode
}

/**
 * Fail-closed rendering decision for autobiographical geometry.
 *
 * Generic fallback is explicitly non-autobiographical. It may keep navigation
 * viable but must never be styled or described as a remembered real place.
 */
export function decideReconstructionMount(args: {
  entity: LivedWorldEntity
  graph: LivedWorldGraph
  consent: ConsentDecisionMap
}): ReconstructionMountDecision {
  const { entity, graph, consent } = args
  const reasons: string[] = []
  const requiredGranted = allPurposesGranted(entity, consent)
  const hasSources = sourceBacked(entity, graph)
  const locationSensitive = entity.kind === 'place' || entity.kind === 'building' || entity.kind === 'room' || entity.kind === 'vehicle-place' || entity.kind === 'route'
  const emotionalSensitive = entity.kind === 'emotional-association'

  if (entity.reconstruction.visibility === 'suppressed') {
    return { mount: 'suppressed', fidelity: entity.reconstruction.fidelity, reasons: ['VISIBILITY_SUPPRESSED'], allowedSourceIds: [], personMode: boundedPersonMode(entity, consent), emotionalAssociationAllowed: false }
  }

  if (!requiredGranted) reasons.push('REQUIRED_PURPOSE_NOT_GRANTED')
  if (locationSensitive && !granted(consent, 'location.context')) reasons.push('C3_LOCATION_NOT_GRANTED')
  if (emotionalSensitive && !granted(consent, 'inference.sensitive')) reasons.push('C4_SENSITIVE_INFERENCE_NOT_GRANTED')

  const personMode = boundedPersonMode(entity, consent)
  if (entity.kind === 'person-presence' && personMode === 'unavailable') reasons.push('PERSON_PRESENCE_AUTHORITY_UNAVAILABLE')

  if (!requiredGranted || (locationSensitive && !granted(consent, 'location.context'))) {
    return {
      mount: locationSensitive ? 'generic-fallback' : 'suppressed',
      fidelity: entity.reconstruction.fidelity,
      reasons,
      allowedSourceIds: [],
      personMode,
      emotionalAssociationAllowed: false,
    }
  }

  if (emotionalSensitive && !granted(consent, 'inference.sensitive')) {
    return { mount: 'suppressed', fidelity: entity.reconstruction.fidelity, reasons, allowedSourceIds: [], personMode, emotionalAssociationAllowed: false }
  }

  if (entity.reconstruction.fidelity === 'unknown') {
    reasons.push('UNKNOWN_AUTOBIOGRAPHICAL_FIDELITY')
    return {
      mount: 'generic-fallback',
      fidelity: 'unknown',
      reasons,
      allowedSourceIds: [],
      personMode,
      emotionalAssociationAllowed: false,
    }
  }

  if (!hasSources) {
    reasons.push('NO_AUTHORIZED_SOURCE_BACKING')
    return {
      mount: 'generic-fallback',
      fidelity: entity.reconstruction.fidelity,
      reasons,
      allowedSourceIds: [],
      personMode,
      emotionalAssociationAllowed: false,
    }
  }

  if (entity.kind === 'person-presence' && personMode === 'unavailable') {
    return { mount: 'suppressed', fidelity: entity.reconstruction.fidelity, reasons, allowedSourceIds: [], personMode, emotionalAssociationAllowed: false }
  }

  if (entity.reconstruction.fidelity === 'partial') {
    reasons.push('PARTIAL_RECONSTRUCTION_MUST_REMAIN_VISIBLY_BOUNDED')
    return {
      mount: 'partial',
      fidelity: 'partial',
      reasons,
      allowedSourceIds: entity.reconstruction.sourceIds,
      personMode,
      emotionalAssociationAllowed: emotionalSensitive ? granted(consent, 'inference.sensitive') : true,
    }
  }

  return {
    mount: 'personalized',
    fidelity: 'confirmed',
    reasons,
    allowedSourceIds: entity.reconstruction.sourceIds,
    personMode,
    emotionalAssociationAllowed: emotionalSensitive ? granted(consent, 'inference.sensitive') : true,
  }
}

export function revokeDependentPersonalization(args: {
  graph: LivedWorldGraph
  consent: ConsentDecisionMap
}) {
  return Object.values(args.graph.entities).reduce<Record<string, ReconstructionMountDecision>>((result, entity) => {
    result[entity.id] = decideReconstructionMount({ entity, graph: args.graph, consent: args.consent })
    return result
  }, {})
}
