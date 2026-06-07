export const STUDIO_SPATIAL_HANDOFF_CONTRACT_VERSION = '0.1.0' as const

export type UraiSpatialRuntimeTarget =
  | 'web-spatial'
  | 'webxr-disabled'
  | 'quest-vr-disabled'
  | 'visionos-disabled'
  | 'ar-handheld-disabled'

export type UraiSpatialAssetKind =
  | 'texture'
  | 'mesh'
  | 'audio'
  | 'subtitle'
  | 'scene-json'
  | 'shader'
  | 'sprite'
  | 'particle-config'

export type UraiSpatialAssetScope = 'public-demo' | 'tenant-scoped' | 'user-scoped'

export type UraiSpatialRequiredLanguage = 'none' | 'uncertainty' | 'pattern_support_not_diagnosis'

export type UraiSpatialWorldType = 'genesis-home' | 'life-map' | 'memory-theater' | 'mirror' | 'legacy-scroll'

export type UraiSpatialSceneManifest = {
  sceneId: string
  title: string
  worldType: UraiSpatialWorldType | string
  cameraRig: Record<string, unknown>
  lightingProfile: Record<string, unknown>
  groundLayer: Record<string, unknown>
  skyLayer: Record<string, unknown>
  orbLayer: Record<string, unknown>
  weatherLayer: Record<string, unknown>
  memoryStarLayers: unknown[]
  fallbackState: Record<string, unknown>
}

export type UraiSpatialAssetManifestItem = {
  assetId: string
  kind: UraiSpatialAssetKind
  uri: string
  mimeType: string
  checksum: string
  scope: UraiSpatialAssetScope
  fallbackUri?: string
}

export type UraiSpatialConsentReceipt = {
  receiptId: string
  tenantId: string
  userId: string
  purpose: string
  grantedCategories: string[]
  createdAt: string
  retentionPolicyId: string
}

export type UraiSpatialSafetyBoundary = {
  layer: string
  requiredLanguage: UraiSpatialRequiredLanguage
  humanReviewRequired?: boolean
}

export type StudioSpatialExport = {
  contractVersion: typeof STUDIO_SPATIAL_HANDOFF_CONTRACT_VERSION
  producer: 'urai-studio'
  consumer: 'urai-spatial'
  exportId: string
  projectId: string
  tenantId: string
  createdAt: string
  sceneManifest: UraiSpatialSceneManifest
  assetManifest: UraiSpatialAssetManifestItem[]
  consentReceipt: UraiSpatialConsentReceipt
  safetyBoundaries: UraiSpatialSafetyBoundary[]
  runtimeTargets: UraiSpatialRuntimeTarget[]
}

export type UraiSpatialHandoffValidation = {
  ok: boolean
  acceptedRuntimeTargets: UraiSpatialRuntimeTarget[]
  rejectedRuntimeTargets: string[]
  warnings: string[]
  errors: string[]
}

const allowedRuntimeTargets = new Set<UraiSpatialRuntimeTarget>([
  'web-spatial',
  'webxr-disabled',
  'quest-vr-disabled',
  'visionos-disabled',
  'ar-handheld-disabled',
])

const allowedAssetKinds = new Set<UraiSpatialAssetKind>([
  'texture',
  'mesh',
  'audio',
  'subtitle',
  'scene-json',
  'shader',
  'sprite',
  'particle-config',
])

const allowedAssetScopes = new Set<UraiSpatialAssetScope>(['public-demo', 'tenant-scoped', 'user-scoped'])

const allowedUriProtocols = ['https:', 'ipfs:', 'gs:']
const allowedMimePrefixes = ['image/', 'audio/', 'video/', 'text/', 'application/json']

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function hasRecordField(record: Record<string, unknown>, key: string) {
  return isRecord(record[key])
}

function uriIsSafe(uri: string) {
  if (uri.startsWith('gs://')) return true
  try {
    const parsed = new URL(uri)
    return allowedUriProtocols.includes(parsed.protocol)
  } catch {
    return false
  }
}

function mimeTypeIsSafe(mimeType: string) {
  return allowedMimePrefixes.some((prefix) => mimeType === prefix || mimeType.startsWith(prefix))
}

export function validateStudioSpatialExport(input: unknown): UraiSpatialHandoffValidation {
  const errors: string[] = []
  const warnings: string[] = []
  const acceptedRuntimeTargets: UraiSpatialRuntimeTarget[] = []
  const rejectedRuntimeTargets: string[] = []

  if (!isRecord(input)) {
    return {
      ok: false,
      acceptedRuntimeTargets,
      rejectedRuntimeTargets,
      warnings,
      errors: ['handoff payload must be an object'],
    }
  }

  if (input.contractVersion !== STUDIO_SPATIAL_HANDOFF_CONTRACT_VERSION) {
    errors.push(`unsupported contractVersion: ${String(input.contractVersion)}`)
  }
  if (input.producer !== 'urai-studio') errors.push('producer must be urai-studio')
  if (input.consumer !== 'urai-spatial') errors.push('consumer must be urai-spatial')

  for (const key of ['exportId', 'projectId', 'tenantId', 'createdAt']) {
    if (!isNonEmptyString(input[key])) errors.push(`${key} is required`)
  }

  const runtimeTargets = Array.isArray(input.runtimeTargets) ? input.runtimeTargets : []
  if (runtimeTargets.length === 0) errors.push('runtimeTargets must include web-spatial')
  for (const target of runtimeTargets) {
    if (typeof target !== 'string' || !allowedRuntimeTargets.has(target as UraiSpatialRuntimeTarget)) {
      rejectedRuntimeTargets.push(String(target))
      continue
    }
    acceptedRuntimeTargets.push(target as UraiSpatialRuntimeTarget)
  }
  if (!acceptedRuntimeTargets.includes('web-spatial')) errors.push('runtimeTargets must include web-spatial')
  for (const forbiddenTarget of ['webxr', 'quest-vr', 'visionos', 'ar-handheld']) {
    if (runtimeTargets.includes(forbiddenTarget)) {
      rejectedRuntimeTargets.push(forbiddenTarget)
      errors.push(`${forbiddenTarget} must be represented as disabled until release evidence validates it`)
    }
  }

  if (!isRecord(input.sceneManifest)) {
    errors.push('sceneManifest is required')
  } else {
    const scene = input.sceneManifest
    for (const key of ['sceneId', 'title', 'worldType']) {
      if (!isNonEmptyString(scene[key])) errors.push(`sceneManifest.${key} is required`)
    }
    for (const key of ['cameraRig', 'lightingProfile', 'groundLayer', 'skyLayer', 'orbLayer', 'weatherLayer', 'fallbackState']) {
      if (!hasRecordField(scene, key)) errors.push(`sceneManifest.${key} is required`)
    }
    if (!Array.isArray(scene.memoryStarLayers)) errors.push('sceneManifest.memoryStarLayers must be an array')
  }

  if (!Array.isArray(input.assetManifest)) {
    errors.push('assetManifest must be an array')
  } else {
    input.assetManifest.forEach((asset, index) => {
      if (!isRecord(asset)) {
        errors.push(`assetManifest[${index}] must be an object`)
        return
      }
      for (const key of ['assetId', 'kind', 'uri', 'mimeType', 'checksum', 'scope']) {
        if (!isNonEmptyString(asset[key])) errors.push(`assetManifest[${index}].${key} is required`)
      }
      if (isNonEmptyString(asset.kind) && !allowedAssetKinds.has(asset.kind as UraiSpatialAssetKind)) {
        errors.push(`assetManifest[${index}].kind is not allowed`)
      }
      if (isNonEmptyString(asset.scope) && !allowedAssetScopes.has(asset.scope as UraiSpatialAssetScope)) {
        errors.push(`assetManifest[${index}].scope is not allowed`)
      }
      if (isNonEmptyString(asset.uri) && !uriIsSafe(asset.uri)) {
        errors.push(`assetManifest[${index}].uri must use https, ipfs, or gs`)
      }
      if (isNonEmptyString(asset.fallbackUri) && !uriIsSafe(asset.fallbackUri)) {
        errors.push(`assetManifest[${index}].fallbackUri must use https, ipfs, or gs`)
      }
      if (isNonEmptyString(asset.mimeType) && !mimeTypeIsSafe(asset.mimeType)) {
        errors.push(`assetManifest[${index}].mimeType is not allowed`)
      }
      if (asset.scope === 'user-scoped') {
        warnings.push(`assetManifest[${index}] is user-scoped; renderer must require authenticated user context`)
      }
    })
  }

  if (!isRecord(input.consentReceipt)) {
    errors.push('consentReceipt is required')
  } else {
    const receipt = input.consentReceipt
    for (const key of ['receiptId', 'tenantId', 'userId', 'purpose', 'createdAt', 'retentionPolicyId']) {
      if (!isNonEmptyString(receipt[key])) errors.push(`consentReceipt.${key} is required`)
    }
    if (!Array.isArray(receipt.grantedCategories) || receipt.grantedCategories.length === 0) {
      errors.push('consentReceipt.grantedCategories must be a non-empty array')
    }
  }

  if (!Array.isArray(input.safetyBoundaries)) {
    errors.push('safetyBoundaries must be an array')
  } else {
    input.safetyBoundaries.forEach((boundary, index) => {
      if (!isRecord(boundary)) {
        errors.push(`safetyBoundaries[${index}] must be an object`)
        return
      }
      if (!isNonEmptyString(boundary.layer)) errors.push(`safetyBoundaries[${index}].layer is required`)
      if (
        boundary.requiredLanguage !== 'none' &&
        boundary.requiredLanguage !== 'uncertainty' &&
        boundary.requiredLanguage !== 'pattern_support_not_diagnosis'
      ) {
        errors.push(`safetyBoundaries[${index}].requiredLanguage is invalid`)
      }
    })
  }

  return {
    ok: errors.length === 0,
    acceptedRuntimeTargets,
    rejectedRuntimeTargets,
    warnings,
    errors,
  }
}
