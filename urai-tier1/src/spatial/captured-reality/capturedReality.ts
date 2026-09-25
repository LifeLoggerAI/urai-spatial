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
export type CapturedRealityArchiveFormat = 'ply-3dgs' | 'compressed-ply-3dgs' | 'spz' | 'sog'
export type CapturedRealityCollisionFormat = 'glb' | 'navmesh-json'

export type CapturedRealitySourceEvidence = {
  sourceId: string
  sourceType: 'video' | 'photo-set' | 'scan'
  capturedAt?: string
  sha256?: string
  originalByteSize?: number
  frameManifestRef?: string
}

export type CapturedRealityArtifactRef<TFormat extends string> = {
  artifactId: string
  format: TFormat
  sha256?: string
  byteSize?: number
}

export type CapturedRealityAsset = {
  schemaVersion: typeof CAPTURED_REALITY_SCHEMA_VERSION
  id: string
  label: string
  ownerId: string
  anchorEntityId: string
  truthClass: CapturedRealityTruthClass
  sourceIds: readonly string[]
  sourceEvidence: readonly CapturedRealitySourceEvidence[]
  reconstruction: {
    method: CapturedRealityMethod
    inputFormats: readonly CapturedRealityInputFormat[]
    cameraSolve?: {
      engine: string
      version?: string
      registeredImages: number
      totalInputImages: number
      coordinateSystem: 'right-handed-y-up' | 'right-handed-z-up' | 'unknown'
      receiptRef: string
    }
    training?: {
      engine: string
      version?: string
      configurationHash?: string
      startedAt?: string
      completedAt?: string
      receiptRef: string
    }
    archival?: CapturedRealityArtifactRef<CapturedRealityArchiveFormat>
    runtime: CapturedRealityArtifactRef<CapturedRealityRuntimeFormat> & {
      delivery: 'server-authorized'
    }
    fallbackMesh?: CapturedRealityArtifactRef<'glb'>
    collisionProxy?: CapturedRealityArtifactRef<CapturedRealityCollisionFormat>
  }
  privacy: {
    visibility: 'private' | 'user-approved'
    requiredPurposes: readonly string[]
    exactLocationEmbedded: boolean
    thirdPartyPresent: boolean
    biometricOrLikenessPresent: boolean
  }
  qa: {
    sourceVsReconstructionReviewed: boolean
    heldOutViewCount: number
    knownArtifactCount: number
    reviewState: 'unreviewed' | 'rejected' | 'accepted'
    reviewedAt?: string
    receiptRef?: string
  }
  performance?: {
    profile: 'desktop' | 'mobile' | 'xr'
    firstVisibleMs?: number
    sustainedFps?: number
    peakGpuMemoryMb?: number
    peakCpuMemoryMb?: number
    measuredAt?: string
    receiptRef?: string
  }
  provenance: {
    sourcePackageRef?: string
    transformations: readonly string[]
    toolchain: readonly string[]
    exactSourceHead?: string
    userCorrectionRevision: number
    createdAt: string
    mustShowTruthLabel: true
  }
  release: {
    state: 'hard-off' | 'private-pilot' | 'private-beta' | 'launch-enabled'
    browserCertified: boolean
    mobileCertified: boolean
    xrCertified: boolean
  }
}

export type CapturedRealityRenderMode =
  | 'disabled'
  | 'awaiting-authorized-delivery'
  | 'gaussian-splat'
  | 'mesh-fallback'
  | 'generic-fallback'
  | 'suppressed'

export type CapturedRealityRenderDecision = {
  mode: CapturedRealityRenderMode
  reasons: readonly string[]
  truthLabel: string
  assetUrl: string | null
  fallbackMeshArtifactId: string | null
  collisionArtifactId: string | null
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

function safeAuthorizedRuntimeUrl(url: string | undefined) {
  if (!url) return false
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'https:'
  } catch {
    return false
  }
}

function validSha256(value: string | undefined) {
  return value === undefined || /^[a-f0-9]{64}$/i.test(value)
}

export function validateCapturedRealityAsset(asset: CapturedRealityAsset, graph: LivedWorldGraph): readonly string[] {
  const errors: string[] = []

  if (asset.schemaVersion !== CAPTURED_REALITY_SCHEMA_VERSION) errors.push('UNSUPPORTED_CAPTURED_REALITY_SCHEMA')
  if (!asset.id) errors.push('ASSET_ID_REQUIRED')
  if (!asset.ownerId || asset.ownerId !== graph.ownerId) errors.push('OWNER_MISMATCH')
  if (!asset.anchorEntityId) errors.push('ANCHOR_ENTITY_REQUIRED')
  if (!asset.sourceIds.length) errors.push('SOURCE_IDS_REQUIRED')
  if (asset.sourceEvidence.length !== asset.sourceIds.length) errors.push('SOURCE_EVIDENCE_CARDINALITY_MISMATCH')
  if (!asset.privacy.requiredPurposes.includes('location.context')) errors.push('C3_LOCATION_PURPOSE_REQUIRED')
  if (asset.privacy.visibility !== 'private' && asset.privacy.visibility !== 'user-approved') errors.push('INVALID_VISIBILITY')
  if (!asset.provenance.mustShowTruthLabel) errors.push('TRUTH_LABEL_REQUIRED')
  if (!asset.provenance.transformations.length) errors.push('TRANSFORMATION_CHAIN_REQUIRED')
  if (!asset.provenance.toolchain.length) errors.push('TOOLCHAIN_REQUIRED')
  if (asset.provenance.userCorrectionRevision < 0) errors.push('INVALID_USER_CORRECTION_REVISION')
  if (asset.reconstruction.runtime.delivery !== 'server-authorized') errors.push('PRIVATE_RUNTIME_DELIVERY_REQUIRED')
  if (!asset.reconstruction.runtime.artifactId) errors.push('RUNTIME_ARTIFACT_ID_REQUIRED')
  if (!validSha256(asset.reconstruction.runtime.sha256)) errors.push('INVALID_RUNTIME_SHA256')
  if (asset.reconstruction.archival && !validSha256(asset.reconstruction.archival.sha256)) errors.push('INVALID_ARCHIVAL_SHA256')
  if (asset.reconstruction.fallbackMesh && !validSha256(asset.reconstruction.fallbackMesh.sha256)) errors.push('INVALID_FALLBACK_SHA256')
  if (asset.reconstruction.collisionProxy && !validSha256(asset.reconstruction.collisionProxy.sha256)) errors.push('INVALID_COLLISION_SHA256')

  const evidenceIds = new Set(asset.sourceEvidence.map((source) => source.sourceId))
  for (const sourceId of asset.sourceIds) {
    if (!graph.sources[sourceId]) errors.push(`MISSING_CAPTURE_SOURCE:${sourceId}`)
    if (!evidenceIds.has(sourceId)) errors.push(`MISSING_SOURCE_EVIDENCE:${sourceId}`)
  }

  const anchor = graph.entities[asset.anchorEntityId]
  if (!anchor) {
    errors.push('ANCHOR_ENTITY_MISSING')
  } else if (!locationKinds.has(anchor.kind)) {
    errors.push('ANCHOR_ENTITY_NOT_SPATIAL')
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

  if (asset.privacy.biometricOrLikenessPresent && !asset.privacy.requiredPurposes.includes('biometric.identity')) {
    errors.push('LIKENESS_REQUIRES_BIOMETRIC_AUTHORITY')
  }

  if (asset.qa.reviewState === 'accepted' && !asset.qa.sourceVsReconstructionReviewed) {
    errors.push('ACCEPTED_WITHOUT_SOURCE_REVIEW')
  }

  if (asset.release.browserCertified && asset.qa.reviewState !== 'accepted') {
    errors.push('BROWSER_CERTIFIED_WITHOUT_ACCEPTED_QA')
  }

  if (asset.release.xrCertified && !asset.release.browserCertified) {
    errors.push('XR_CERTIFIED_WITHOUT_BROWSER_BASELINE')
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
  authorizedRuntimeUrl?: string
}): CapturedRealityRenderDecision {
  const { asset, graph, consent, releaseEnabled, authorizedRuntimeUrl } = args
  const reasons = [...validateCapturedRealityAsset(asset, graph)]
  const label = truthLabel(asset)
  const fallbackMeshArtifactId = asset.reconstruction.fallbackMesh?.artifactId ?? null
  const collisionArtifactId = asset.reconstruction.collisionProxy?.artifactId ?? null

  if (!releaseEnabled || asset.release.state === 'hard-off') {
    return {
      mode: 'disabled',
      reasons: [...reasons, 'CAPTURED_REALITY_RELEASE_DISABLED'],
      truthLabel: label,
      assetUrl: null,
      fallbackMeshArtifactId,
      collisionArtifactId,
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
      fallbackMeshArtifactId,
      collisionArtifactId,
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
      fallbackMeshArtifactId,
      collisionArtifactId,
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
      fallbackMeshArtifactId,
      collisionArtifactId,
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
      fallbackMeshArtifactId,
      collisionArtifactId,
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
      fallbackMeshArtifactId,
      collisionArtifactId,
      allowedSourceIds: [],
      autobiographical: false,
    }
  }

  if (asset.truthClass === 'interpretive') {
    return {
      mode: fallbackMeshArtifactId ? 'mesh-fallback' : 'generic-fallback',
      reasons: ['INTERPRETIVE_RECONSTRUCTION_MUST_REMAIN_VISIBLY_BOUNDED'],
      truthLabel: label,
      assetUrl: null,
      fallbackMeshArtifactId,
      collisionArtifactId,
      allowedSourceIds: reconstructionDecision.allowedSourceIds,
      autobiographical: false,
    }
  }

  if (!safeAuthorizedRuntimeUrl(authorizedRuntimeUrl)) {
    return {
      mode: 'awaiting-authorized-delivery',
      reasons: ['AUTHORIZED_RUNTIME_URL_REQUIRED'],
      truthLabel: label,
      assetUrl: null,
      fallbackMeshArtifactId,
      collisionArtifactId,
      allowedSourceIds: reconstructionDecision.allowedSourceIds,
      autobiographical: true,
    }
  }

  return {
    mode: 'gaussian-splat',
    reasons: reconstructionDecision.reasons,
    truthLabel: label,
    assetUrl: authorizedRuntimeUrl ?? null,
    fallbackMeshArtifactId,
    collisionArtifactId,
    allowedSourceIds: reconstructionDecision.allowedSourceIds,
    autobiographical: true,
  }
}
