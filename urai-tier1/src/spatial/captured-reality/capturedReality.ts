import type { LivedWorldEntity, LivedWorldGraph } from '@/spatial/lived-world/livedWorldGraph'
import type { ConsentDecisionMap } from '@/spatial/lived-world/reconstructionPolicy'
import { decideReconstructionMount } from '@/spatial/lived-world/reconstructionPolicy'

export const CAPTURED_REALITY_SCHEMA_VERSION = 'urai-captured-reality-1' as const

export type CapturedRealityTruthClass =
  | 'recorded-source-truth'
  | 'spatially-reconstructable'
  | 'interpretive'
  | 'unknown'

export type CapturedRealityMethod =
  | '3dgs'
  | 'photogrammetry'
  | 'nerf-derived'
  | 'hybrid'

export type CapturedRealityInputFormat =
  | 'video'
  | 'photo-set'
  | 'colmap'
  | 'ply-3dgs'
  | 'compressed-ply-3dgs'
  | 'spz'
  | 'sog'
  | 'splat'
  | 'ksplat'

export type CapturedRealityRuntimeFormat = 'splat'

export type CapturedRealityAsset = {
  schemaVersion: typeof CAPTURED_REALITY_SCHEMA_VERSION
  id: string
  label: string
  ownerId: string
  anchorEntityId: string
  truthClass: CapturedRealityTruthClass
  sourceIds: readonly string[]
  reconstruction: {
    method: CapturedRealityMethod
    inputFormats: readonly CapturedRealityInputFormat[]
    runtime: {
      format: CapturedRealityRuntimeFormat
      url: string
      sha256?: string
      byteSize?: number
    }
    fallbackMesh?: {
      format: 'glb'
      url: string
    }
  }
  privacy: {
    visibility: 'private' | 'user-approved'
    requiredPurposes: readonly string[]
    exactLocationEmbedded: boolean
    thirdPartyPresent: boolean
  }
  provenance: {
    sourcePackageRef?: string
    transformations: readonly string[]
    toolchain: readonly string[]
    createdAt: string
    mustShowTruthLabel: true
  }
}

export type CapturedRealityRenderMode =
  | 'disabled'
  | 'gaussian-splat'
  | 'mesh-fallback'
  | 'generic-fallback'
  | 'suppressed'

export type CapturedRealityRenderDecision = {
  mode: CapturedRealityRenderMode
  reasons: readonly string[]
  truthLabel: string
  assetUrl: string | null
  fallbackMeshUrl: string | null
  allowedSourceIds: readonly string[]
  autobiographical: boolean
}

const locationKinds = new Set<LivedWorldEntity['kind']>([
  'place',
  'building',
  'room',
  'vehicle-place',
  'route',
])

function truthLabel(asset: CapturedRealityAsset) {
  if (asset.truthClass === 'spatially-reconstructable') {
    return 'Spatial reconstruction from recorded sources'
  }
  if (asset.truthClass === 'interpretive') {
    return 'Interpretive reconstruction — not camera-recorded history'
  }
  if (asset.truthClass === 'recorded-source-truth') {
    return 'Recorded source truth'
  }
  return 'Unknown / unresolved reconstruction'
}

function safeAssetUrl(url: string) {
  if (!url) return false
  if (url.startsWith('/')) return true
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'https:'
  } catch {
    return false
  }
}

export function validateCapturedRealityAsset(asset: CapturedRealityAsset, graph: LivedWorldGraph): readonly string[] {
  const errors: string[] = []

  if (asset.schemaVersion !== CAPTURED_REALITY_SCHEMA_VERSION) errors.push('UNSUPPORTED_CAPTURED_REALITY_SCHEMA')
  if (!asset.id) errors.push('ASSET_ID_REQUIRED')
  if (!asset.ownerId || asset.ownerId !== graph.ownerId) errors.push('OWNER_MISMATCH')
  if (!asset.anchorEntityId) errors.push('ANCHOR_ENTITY_REQUIRED')
  if (!asset.sourceIds.length) errors.push('SOURCE_IDS_REQUIRED')
  if (!asset.privacy.requiredPurposes.includes('location.context')) errors.push('C3_LOCATION_PURPOSE_REQUIRED')
  if (asset.privacy.visibility !== 'private' && asset.privacy.visibility !== 'user-approved') errors.push('INVALID_VISIBILITY')
  if (!asset.provenance.mustShowTruthLabel) errors.push('TRUTH_LABEL_REQUIRED')
  if (!asset.provenance.transformations.length) errors.push('TRANSFORMATION_CHAIN_REQUIRED')
  if (!asset.provenance.toolchain.length) errors.push('TOOLCHAIN_REQUIRED')
  if (!safeAssetUrl(asset.reconstruction.runtime.url)) errors.push('UNSAFE_RUNTIME_URL')
  if (asset.reconstruction.fallbackMesh && !safeAssetUrl(asset.reconstruction.fallbackMesh.url)) errors.push('UNSAFE_FALLBACK_URL')

  const anchor = graph.entities[asset.anchorEntityId]
  if (!anchor) {
    errors.push('ANCHOR_ENTITY_MISSING')
  } else if (!locationKinds.has(anchor.kind)) {
    errors.push('ANCHOR_ENTITY_NOT_SPATIAL')
  }

  for (const sourceId of asset.sourceIds) {
    if (!graph.sources[sourceId]) errors.push(`MISSING_CAPTURE_SOURCE:${sourceId}`)
  }

  const existingSources = asset.sourceIds.map((id) => graph.sources[id]).filter(Boolean)
  if (asset.truthClass === 'spatially-reconstructable' && existingSources.length > 0) {
    if (existingSources.every((source) => source.provenance === 'generated-context')) {
      errors.push('SPATIAL_RECONSTRUCTION_REQUIRES_REAL_SOURCE')
    }
  }

  // A Gaussian splat is a reconstruction derived from recorded evidence. The
  // splat itself must never be mislabeled as the original camera recording.
  if (asset.truthClass === 'recorded-source-truth') {
    errors.push('RECONSTRUCTION_CANNOT_BE_RECORDED_SOURCE_TRUTH')
  }

  if (asset.privacy.exactLocationEmbedded && !asset.privacy.requiredPurposes.includes('location.context')) {
    errors.push('EXACT_LOCATION_WITHOUT_C3_PURPOSE')
  }

  return errors
}

export function capturedRealityReleaseEnabled(
  env: Record<string, string | undefined> = process.env,
) {
  return env.URAI_ENABLE_CAPTURED_REALITY === 'true'
}

export function decideCapturedRealityRender(args: {
  asset: CapturedRealityAsset
  graph: LivedWorldGraph
  consent: ConsentDecisionMap
  releaseEnabled: boolean
}): CapturedRealityRenderDecision {
  const { asset, graph, consent, releaseEnabled } = args
  const reasons = [...validateCapturedRealityAsset(asset, graph)]
  const label = truthLabel(asset)

  if (!releaseEnabled) {
    return {
      mode: 'disabled',
      reasons: [...reasons, 'CAPTURED_REALITY_RELEASE_DISABLED'],
      truthLabel: label,
      assetUrl: null,
      fallbackMeshUrl: null,
      allowedSourceIds: [],
      autobiographical: false,
    }
  }

  if (reasons.length > 0) {
    return {
      mode: 'suppressed',
      reasons,
      truthLabel: label,
      assetUrl: null,
      fallbackMeshUrl: null,
      allowedSourceIds: [],
      autobiographical: false,
    }
  }

  const anchor = graph.entities[asset.anchorEntityId]
  if (!anchor) {
    return {
      mode: 'suppressed',
      reasons: ['ANCHOR_ENTITY_MISSING'],
      truthLabel: label,
      assetUrl: null,
      fallbackMeshUrl: null,
      allowedSourceIds: [],
      autobiographical: false,
    }
  }

  const reconstructionDecision = decideReconstructionMount({
    entity: anchor,
    graph,
    consent,
  })

  if (reconstructionDecision.mount === 'suppressed') {
    return {
      mode: 'suppressed',
      reasons: reconstructionDecision.reasons,
      truthLabel: label,
      assetUrl: null,
      fallbackMeshUrl: null,
      allowedSourceIds: [],
      autobiographical: false,
    }
  }

  if (reconstructionDecision.mount === 'generic-fallback') {
    return {
      mode: 'generic-fallback',
      reasons: reconstructionDecision.reasons,
      truthLabel: label,
      assetUrl: null,
      fallbackMeshUrl: null,
      allowedSourceIds: [],
      autobiographical: false,
    }
  }

  if (asset.truthClass === 'unknown') {
    return {
      mode: 'generic-fallback',
      reasons: ['UNKNOWN_RECONSTRUCTION_MUST_NOT_PRESENT_AS_MEMORY'],
      truthLabel: label,
      assetUrl: null,
      fallbackMeshUrl: null,
      allowedSourceIds: [],
      autobiographical: false,
    }
  }

  if (asset.truthClass === 'interpretive') {
    return {
      mode: asset.reconstruction.fallbackMesh ? 'mesh-fallback' : 'generic-fallback',
      reasons: ['INTERPRETIVE_RECONSTRUCTION_MUST_REMAIN_VISIBLY_BOUNDED'],
      truthLabel: label,
      assetUrl: null,
      fallbackMeshUrl: asset.reconstruction.fallbackMesh?.url ?? null,
      allowedSourceIds: reconstructionDecision.allowedSourceIds,
      autobiographical: false,
    }
  }

  return {
    mode: 'gaussian-splat',
    reasons: reconstructionDecision.reasons,
    truthLabel: label,
    assetUrl: asset.reconstruction.runtime.url,
    fallbackMeshUrl: asset.reconstruction.fallbackMesh?.url ?? null,
    allowedSourceIds: reconstructionDecision.allowedSourceIds,
    autobiographical: true,
  }
}
