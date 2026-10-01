import type { MemoryWorldSourceRef } from './memoryWorld'

export const MEMORY_WORLD_REFERENCE_AUTHORITY_VERSION = 'urai-memory-world-reference-authority-1' as const

export type MemoryWorldReferenceUse =
  | 'research-reference'
  | 'model-training'
  | 'derivative-authoring'
  | 'production-runtime'
  | 'commercial-distribution'

export type ReferenceUseDecision = {
  allowed: boolean
  reasons: readonly string[]
  attributionRequired: boolean
  reviewRequired: boolean
}

export function decideReferenceUse(source: MemoryWorldSourceRef, use: MemoryWorldReferenceUse): ReferenceUseDecision {
  const reasons: string[] = []
  if (source.authority === 'unknown') reasons.push('SOURCE_AUTHORITY_UNKNOWN')

  if (use === 'research-reference') {
    if (!source.permissions.referenceOnly && source.authority === 'unknown') reasons.push('REFERENCE_RIGHTS_UNRESOLVED')
  }
  if (use === 'model-training' && source.permissions.trainingPermitted !== true) reasons.push('TRAINING_PERMISSION_NOT_PROVEN')
  if (use === 'derivative-authoring' && source.permissions.derivativeWorkPermitted !== true) reasons.push('DERIVATIVE_PERMISSION_NOT_PROVEN')
  if (use === 'production-runtime') {
    if (source.permissions.referenceOnly) reasons.push('REFERENCE_ONLY_SOURCE')
    if (source.permissions.productionAssetPermitted !== true && source.authority !== 'user-owned') reasons.push('PRODUCTION_PERMISSION_NOT_PROVEN')
  }
  if (use === 'commercial-distribution') {
    if (source.permissions.referenceOnly) reasons.push('REFERENCE_ONLY_SOURCE')
    if (source.permissions.productionAssetPermitted !== true && source.authority !== 'user-owned') reasons.push('PRODUCTION_PERMISSION_NOT_PROVEN')
    if (source.permissions.commercialUsePermitted !== true && source.authority !== 'user-owned') reasons.push('COMMERCIAL_PERMISSION_NOT_PROVEN')
    if (source.permissions.redistributionPermitted !== true && source.authority !== 'user-owned') reasons.push('REDISTRIBUTION_PERMISSION_NOT_PROVEN')
  }

  if (source.permissions.reviewRequired && source.authority !== 'user-owned' && !source.licenseId) reasons.push('REVIEW_EVIDENCE_MISSING')

  return {
    allowed: reasons.length === 0,
    reasons,
    attributionRequired: source.permissions.attributionRequired === true,
    reviewRequired: source.permissions.reviewRequired,
  }
}
