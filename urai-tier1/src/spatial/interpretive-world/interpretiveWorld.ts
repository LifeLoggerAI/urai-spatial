export const INTERPRETIVE_WORLD_SCHEMA_VERSION = 'urai-interpretive-world-1' as const

export const INTERPRETIVE_WORLD_QA_THRESHOLDS = {
  registrationHardFloor: 0.70,
  meanReprojectionErrorPxMax: 1.5,
  fixedLensFocalSpreadMax: 0.05,
  heldOutPsnrDbMin: 24,
  heldOutSsimMin: 0.85,
  heldOutLpipsMax: 0.25,
} as const

export type InterpretiveWorldAsset = {
  schemaVersion: typeof INTERPRETIVE_WORLD_SCHEMA_VERSION
  id: string
  label: string
  truthClass: 'interpretive'
  truthLabel: string
  autobiographical: false
  generatedOnly: true
  sourceTruthEligible: false
  sourceIds: readonly []
  exactPrivateLocationEmbedded: false
  generation: {
    provider: string
    taskIds: readonly string[]
    visualAcceptance: 'pending' | 'rejected' | 'accepted'
    receiptRef?: string
  }
  reconstruction: {
    method: '3dgs'
    cameraSolve?: {
      engine: string
      registeredImages: number
      totalInputImages: number
      meanReprojectionErrorPx: number
      fixedLensFocalSpread: number
      receiptRef: string
    }
    training?: {
      engine: string
      state: 'not-started' | 'training' | 'failed' | 'complete'
      receiptRef?: string
    }
    archival?: {
      artifactId: string
      format: 'ply-3dgs' | 'spz'
      sha256?: string
      byteSize?: number
    }
    runtime?: {
      artifactId: string
      format: 'splat' | 'spz'
      delivery: 'server-authorized'
      sha256?: string
      byteSize?: number
    }
    collisionProxy?: {
      artifactId: string
      format: 'glb' | 'navmesh-json'
      sha256?: string
    }
  }
  qa: {
    reviewState: 'unreviewed' | 'rejected' | 'accepted'
    heldOutViewCount: number
    psnrDb?: number
    ssim?: number
    lpips?: number
    knownArtifactCount: number
    reviewedAt?: string
    receiptRef?: string
  }
  release: {
    state: 'hard-off' | 'private-pilot' | 'private-beta' | 'launch-enabled'
    browserCertified: boolean
    mobileCertified: boolean
    xrCertified: boolean
  }
}

export type InterpretiveWorldRenderMode =
  | 'disabled'
  | 'awaiting-acceptance'
  | 'awaiting-reconstruction'
  | 'awaiting-authorized-delivery'
  | 'interpretive-gaussian-splat'
  | 'suppressed'

export type InterpretiveWorldRenderDecision = {
  mode: InterpretiveWorldRenderMode
  reasons: readonly string[]
  truthLabel: string
  assetUrl: string | null
  collisionArtifactId: string | null
  autobiographical: false
  allowedSourceIds: readonly []
  embodiedMovementAllowed: boolean
}

function safeAuthorizedRuntimeUrl(url: string | undefined) {
  if (!url) return false
  try {
    return new URL(url).protocol === 'https:'
  } catch {
    return false
  }
}

function validSha256(value: string | undefined) {
  return value === undefined || /^[a-f0-9]{64}$/i.test(value)
}

export function validateInterpretiveWorldAsset(asset: InterpretiveWorldAsset): readonly string[] {
  const errors: string[] = []
  if (asset.schemaVersion !== INTERPRETIVE_WORLD_SCHEMA_VERSION) errors.push('UNSUPPORTED_INTERPRETIVE_WORLD_SCHEMA')
  if (!asset.id) errors.push('ASSET_ID_REQUIRED')
  if (asset.truthClass !== 'interpretive') errors.push('INTERPRETIVE_TRUTH_CLASS_REQUIRED')
  if (asset.autobiographical !== false) errors.push('INTERPRETIVE_WORLD_CANNOT_BE_AUTOBIOGRAPHICAL')
  if (asset.generatedOnly !== true) errors.push('GENERATED_ONLY_REQUIRED')
  if (asset.sourceTruthEligible !== false) errors.push('SOURCE_TRUTH_MUST_BE_FALSE')
  if (asset.sourceIds.length !== 0) errors.push('GENERATED_WORLD_SOURCE_IDS_FORBIDDEN')
  if (asset.exactPrivateLocationEmbedded !== false) errors.push('EXACT_PRIVATE_LOCATION_FORBIDDEN')
  if (!asset.truthLabel || !/interpretive|generated/i.test(asset.truthLabel)) errors.push('INTERPRETIVE_TRUTH_LABEL_REQUIRED')
  if (!asset.generation.provider.trim()) errors.push('GENERATION_PROVIDER_REQUIRED')
  if (!asset.generation.taskIds.length) errors.push('GENERATION_TASK_IDS_REQUIRED')

  const camera = asset.reconstruction.cameraSolve
  if (camera) {
    if (!Number.isSafeInteger(camera.totalInputImages) || camera.totalInputImages <= 0) errors.push('CAMERA_SOLVE_INPUT_COUNT_INVALID')
    if (!Number.isSafeInteger(camera.registeredImages) || camera.registeredImages <= 0 || camera.registeredImages > camera.totalInputImages) {
      errors.push('CAMERA_SOLVE_REGISTERED_COUNT_INVALID')
    }
    const ratio = camera.totalInputImages > 0 ? camera.registeredImages / camera.totalInputImages : 0
    if (ratio < INTERPRETIVE_WORLD_QA_THRESHOLDS.registrationHardFloor) errors.push('CAMERA_SOLVE_REGISTRATION_BELOW_FLOOR')
    if (!Number.isFinite(camera.meanReprojectionErrorPx) || camera.meanReprojectionErrorPx > INTERPRETIVE_WORLD_QA_THRESHOLDS.meanReprojectionErrorPxMax) {
      errors.push('CAMERA_SOLVE_REPROJECTION_ERROR_TOO_HIGH')
    }
    if (!Number.isFinite(camera.fixedLensFocalSpread) || camera.fixedLensFocalSpread > INTERPRETIVE_WORLD_QA_THRESHOLDS.fixedLensFocalSpreadMax) {
      errors.push('CAMERA_SOLVE_FOCAL_SPREAD_TOO_HIGH')
    }
  }

  if (asset.reconstruction.runtime) {
    if (asset.reconstruction.runtime.delivery !== 'server-authorized') errors.push('SERVER_AUTHORIZED_DELIVERY_REQUIRED')
    if (!asset.reconstruction.runtime.artifactId) errors.push('RUNTIME_ARTIFACT_ID_REQUIRED')
    if (!validSha256(asset.reconstruction.runtime.sha256)) errors.push('INVALID_RUNTIME_SHA256')
  }
  if (asset.reconstruction.archival && !validSha256(asset.reconstruction.archival.sha256)) errors.push('INVALID_ARCHIVAL_SHA256')
  if (asset.reconstruction.collisionProxy && !validSha256(asset.reconstruction.collisionProxy.sha256)) errors.push('INVALID_COLLISION_SHA256')

  if (asset.qa.reviewState === 'accepted') {
    if (asset.generation.visualAcceptance !== 'accepted') errors.push('QA_ACCEPTED_WITHOUT_VISUAL_ACCEPTANCE')
    if (!camera) errors.push('QA_ACCEPTED_WITHOUT_CAMERA_SOLVE')
    if (asset.reconstruction.training?.state !== 'complete') errors.push('QA_ACCEPTED_WITHOUT_TRAINING')
    if (asset.qa.heldOutViewCount <= 0) errors.push('QA_ACCEPTED_WITHOUT_HELD_OUT_VIEWS')
    if (!Number.isFinite(asset.qa.psnrDb) || (asset.qa.psnrDb ?? -Infinity) < INTERPRETIVE_WORLD_QA_THRESHOLDS.heldOutPsnrDbMin) errors.push('HELD_OUT_PSNR_BELOW_FLOOR')
    if (!Number.isFinite(asset.qa.ssim) || (asset.qa.ssim ?? -Infinity) < INTERPRETIVE_WORLD_QA_THRESHOLDS.heldOutSsimMin) errors.push('HELD_OUT_SSIM_BELOW_FLOOR')
    if (!Number.isFinite(asset.qa.lpips) || (asset.qa.lpips ?? Infinity) > INTERPRETIVE_WORLD_QA_THRESHOLDS.heldOutLpipsMax) errors.push('HELD_OUT_LPIPS_ABOVE_CEILING')
  }

  if (asset.release.browserCertified && asset.qa.reviewState !== 'accepted') errors.push('BROWSER_CERTIFIED_WITHOUT_ACCEPTED_QA')
  if (asset.release.mobileCertified && !asset.release.browserCertified) errors.push('MOBILE_CERTIFIED_WITHOUT_BROWSER_BASELINE')
  if (asset.release.xrCertified && !asset.release.browserCertified) errors.push('XR_CERTIFIED_WITHOUT_BROWSER_BASELINE')

  return errors
}

export function interpretiveWorldReleaseEnabled(env: Record<string, string | undefined> = process.env) {
  return env.URAI_ENABLE_INTERPRETIVE_WORLDS === 'true'
}

export function decideInterpretiveWorldRender(args: {
  asset: InterpretiveWorldAsset
  releaseEnabled: boolean
  authorizedRuntimeUrl?: string
}): InterpretiveWorldRenderDecision {
  const { asset, releaseEnabled, authorizedRuntimeUrl } = args
  const reasons = [...validateInterpretiveWorldAsset(asset)]
  const collisionArtifactId = asset.reconstruction.collisionProxy?.artifactId ?? null
  const base = {
    truthLabel: asset.truthLabel,
    collisionArtifactId,
    autobiographical: false as const,
    allowedSourceIds: [] as const,
    embodiedMovementAllowed: collisionArtifactId !== null,
  }

  if (!releaseEnabled || asset.release.state === 'hard-off') {
    return { ...base, mode: 'disabled', reasons: [...reasons, 'INTERPRETIVE_WORLD_RELEASE_DISABLED'], assetUrl: null }
  }
  if (reasons.length) return { ...base, mode: 'suppressed', reasons, assetUrl: null }

  if (asset.generation.visualAcceptance !== 'accepted' || asset.qa.reviewState !== 'accepted') {
    return { ...base, mode: 'awaiting-acceptance', reasons: ['INTERPRETIVE_WORLD_LITERAL_ACCEPTANCE_REQUIRED'], assetUrl: null }
  }
  if (!asset.reconstruction.cameraSolve || asset.reconstruction.training?.state !== 'complete' || !asset.reconstruction.runtime) {
    return { ...base, mode: 'awaiting-reconstruction', reasons: ['INTERPRETIVE_WORLD_RECONSTRUCTION_INCOMPLETE'], assetUrl: null }
  }
  if (!safeAuthorizedRuntimeUrl(authorizedRuntimeUrl)) {
    return { ...base, mode: 'awaiting-authorized-delivery', reasons: ['AUTHORIZED_RUNTIME_URL_REQUIRED'], assetUrl: null }
  }
  return {
    ...base,
    mode: 'interpretive-gaussian-splat',
    reasons: [],
    assetUrl: authorizedRuntimeUrl ?? null,
  }
}
