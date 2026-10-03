import type { MemoryTruthClass, MemoryWorld, MemoryWorldAsset, MemoryWorldLayer } from './memoryWorld'

export type MemoryWorldCorrection = {
  correctionId: string
  targetSemanticTag: string
  replacementAssetId: string
  sourceId: string
  confirmedAt: string
  note?: string
}

const personalTruth = new Set<MemoryTruthClass>([
  'T0_SOURCE_CAPTURED',
  'T1_SOURCE_DERIVED',
  'T2_SPATIALLY_RECONSTRUCTED',
  'T3_EVIDENCE_INFERRED',
])

function kindForAsset(asset: MemoryWorldAsset): MemoryWorldLayer['kind'] {
  if (asset.assetType === 'capture') return 'captured-reality'
  if (asset.assetType === 'material') return 'materials'
  if (asset.assetType === 'vegetation') return 'terrain-vegetation'
  if (asset.assetType === 'person') return 'people'
  if (asset.assetType === 'animal') return 'animals'
  if (asset.assetType === 'event') return 'events'
  if (asset.assetType === 'audio') return 'spatial-audio'
  if (asset.assetType === 'architecture') return 'structural-environment'
  return 'objects'
}

export function applyMemoryWorldCorrection(world: MemoryWorld, correction: MemoryWorldCorrection): MemoryWorld {
  const source = world.sourceRegistry[correction.sourceId]
  if (!source) throw new Error('CORRECTION_SOURCE_MISSING')
  if (source.authority !== 'user-owned') throw new Error('CORRECTION_SOURCE_NOT_USER_AUTHORITY')

  const replacement = world.assetRegistry[correction.replacementAssetId]
  if (!replacement) throw new Error('CORRECTION_ASSET_MISSING')
  if (!replacement.semanticTags.includes(correction.targetSemanticTag)) throw new Error('CORRECTION_SEMANTIC_TARGET_MISMATCH')
  if (!replacement.sourceIds.includes(correction.sourceId)) throw new Error('CORRECTION_ASSET_SOURCE_MISMATCH')
  if (!personalTruth.has(replacement.truthClass)) throw new Error('CORRECTION_REPLACEMENT_NOT_EVIDENTIARY')

  const replacedAssetIds = new Set(
    Object.values(world.assetRegistry)
      .filter((asset) => asset.semanticTags.includes(correction.targetSemanticTag))
      .map((asset) => asset.assetId),
  )

  const retainedLayers = world.layers
    .map((layer) => ({
      ...layer,
      assetIds: layer.assetIds.filter((assetId) => !replacedAssetIds.has(assetId)),
    }))
    .filter((layer) => layer.assetIds.length > 0)

  const correctionLayer: MemoryWorldLayer = {
    id: `correction:${correction.correctionId}`,
    kind: kindForAsset(replacement),
    truthClass: replacement.truthClass,
    sourceIds: replacement.sourceIds,
    assetIds: [replacement.assetId],
    representation: replacement.representation,
    confidence: replacement.confidence,
    visible: true,
    autobiographical: true,
    notes: [`user-confirmed:${correction.confirmedAt}`, correction.note ?? 'user correction'],
  }

  return {
    ...world,
    layers: [...retainedLayers, correctionLayer],
    provenance: {
      ...world.provenance,
      userCorrectionRevision: world.provenance.userCorrectionRevision + 1,
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
