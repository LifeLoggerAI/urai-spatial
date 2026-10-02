import type { MemoryWorld, MemoryWorldAsset, MemoryWorldLayer, MemoryWorldSourceRef } from './memoryWorld'

export type MemoryWorldOwnerCorrectionAction = 'describe' | 'absent' | 'present' | 'replace'

export type MemoryWorldOwnerCorrection = {
  correctionId: string
  targetSemanticTag: string
  action: MemoryWorldOwnerCorrectionAction
  value: string
  confirmedAt: string
  sourceId: string
}

function ownerStatementSource(correction: MemoryWorldOwnerCorrection): MemoryWorldSourceRef {
  return {
    sourceId: correction.sourceId,
    authority: 'user-owned',
    representedAt: correction.confirmedAt,
    consentRef: 'owner-authenticated-replay-correction',
    permissions: {
      referenceOnly: false,
      trainingPermitted: false,
      derivativeWorkPermitted: true,
      productionAssetPermitted: true,
      commercialUsePermitted: null,
      redistributionPermitted: false,
      attributionRequired: false,
      reviewRequired: false,
    },
  }
}

function correctionAsset(correction: MemoryWorldOwnerCorrection): MemoryWorldAsset {
  return {
    assetId: `owner-correction:${correction.correctionId}`,
    assetType: 'scene',
    name: `Owner correction · ${correction.targetSemanticTag}`,
    version: '1',
    semanticTags: [correction.targetSemanticTag, 'owner-correction'],
    representation: ['metadata'],
    truthClass: 'T3_EVIDENCE_INFERRED',
    confidence: 1,
    sourceIds: [correction.sourceId],
    dependencies: [],
    optimizationTier: 'multi',
    status: 'silver',
    metadata: {
      correctionAction: correction.action,
      correctionValue: correction.value,
      confirmedAt: correction.confirmedAt,
      targetSemanticTag: correction.targetSemanticTag,
    },
  }
}

export function applyMemoryWorldOwnerCorrection(world: MemoryWorld, correction: MemoryWorldOwnerCorrection): MemoryWorld {
  if (!correction.correctionId) throw new Error('CORRECTION_ID_REQUIRED')
  if (!correction.targetSemanticTag) throw new Error('CORRECTION_TARGET_REQUIRED')
  if (!correction.sourceId) throw new Error('CORRECTION_SOURCE_REQUIRED')
  if (correction.action !== 'absent' && correction.value.trim().length < 1) throw new Error('CORRECTION_VALUE_REQUIRED')

  const source = ownerStatementSource(correction)
  const asset = correctionAsset(correction)
  const targetNote = `target:${correction.targetSemanticTag}`

  const correctionLayer: MemoryWorldLayer = {
    id: `layer:owner-correction:${correction.correctionId}`,
    kind: 'personal-memory-overlay',
    truthClass: 'T3_EVIDENCE_INFERRED',
    sourceIds: [correction.sourceId],
    assetIds: [asset.assetId],
    representation: ['metadata'],
    confidence: 1,
    visible: false,
    autobiographical: true,
    notes: [
      targetNote,
      `action:${correction.action}`,
      `value:${correction.value}`,
      `confirmed-at:${correction.confirmedAt}`,
    ],
  }

  return {
    ...world,
    layers: [
      ...world.layers.filter((layer) => !(layer.kind === 'personal-memory-overlay' && layer.notes?.includes(targetNote))),
      correctionLayer,
    ],
    sourceRegistry: { ...world.sourceRegistry, [source.sourceId]: source },
    assetRegistry: { ...world.assetRegistry, [asset.assetId]: asset },
    provenance: {
      ...world.provenance,
      userCorrectionRevision: world.provenance.userCorrectionRevision + 1,
      sourceLineageComplete: true,
    },
    release: {
      ...world.release,
      state: 'draft',
      desktopVerified: false,
      mobileVerified: false,
      xrVerified: false,
    },
  }
}
