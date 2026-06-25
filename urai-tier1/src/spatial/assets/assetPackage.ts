import type { SpatialAssetManifest } from './manifestTypes'
import { isSpatialAssetManifest } from './manifestTypes'

export type SpatialPackageScope = 'public-demo' | 'private-user' | 'team' | 'system'
export type SpatialPackageReviewState = 'approved' | 'pending' | 'fallback-only'
export type SpatialPackageSurface =
  | 'home-sky'
  | 'ground'
  | 'orb'
  | 'avatar-body'
  | 'lifemap-star'
  | 'replay-scene'
  | 'focus-artifact'
  | 'mirror'
  | 'passport'
  | 'privacy-controls'
  | 'location-map'
  | 'status'

export type UraiSpatialAssetPackage = {
  packageId: string
  packageVersion: '1.0'
  scope: SpatialPackageScope
  ownerId: string
  sourceJobId: string
  sourcePromptPreview: string
  createdAt: string
  manifest: SpatialAssetManifest
  previewUrl?: string
  storagePaths: string[]
  contentTypes: string[]
  checksum?: string
  license: 'urai-demo' | 'user-owned' | 'licensed' | 'unknown'
  reviewState: SpatialPackageReviewState
  packageScope: SpatialPackageScope
  surfaces: SpatialPackageSurface[]
  fallbackManifestId?: string
}

function isStringArray(value: unknown) {
  return Array.isArray(value) && value.every((item) => typeof item === 'string')
}

export function isUraiSpatialAssetPackage(value: unknown): value is UraiSpatialAssetPackage {
  const candidate = value as Partial<UraiSpatialAssetPackage> | null
  return Boolean(
    candidate &&
      typeof candidate.packageId === 'string' &&
      candidate.packageVersion === '1.0' &&
      typeof candidate.scope === 'string' &&
      typeof candidate.ownerId === 'string' &&
      typeof candidate.sourceJobId === 'string' &&
      typeof candidate.sourcePromptPreview === 'string' &&
      typeof candidate.createdAt === 'string' &&
      isSpatialAssetManifest(candidate.manifest) &&
      isStringArray(candidate.storagePaths) &&
      isStringArray(candidate.contentTypes) &&
      typeof candidate.license === 'string' &&
      typeof candidate.reviewState === 'string' &&
      typeof candidate.packageScope === 'string' &&
      isStringArray(candidate.surfaces),
  )
}

export function createSpatialAssetPackageFromManifest(
  manifest: SpatialAssetManifest,
  options: {
    scope?: SpatialPackageScope
    createdAt?: string
    reviewState?: SpatialPackageReviewState
    surfaces?: SpatialPackageSurface[]
    license?: UraiSpatialAssetPackage['license']
    fallbackManifestId?: string
  } = {},
): UraiSpatialAssetPackage {
  const storagePaths = manifest.artifacts.map((artifact) => artifact.storageUri)
  const contentTypes = [...new Set(manifest.artifacts.map((artifact) => artifact.mimeType))]
  const scope = options.scope ?? (manifest.ownerId === 'launch-demo' ? 'public-demo' : 'private-user')

  return {
    packageId: `pkg:${manifest.manifestId}`,
    packageVersion: '1.0',
    scope,
    ownerId: manifest.ownerId,
    sourceJobId: manifest.jobId,
    sourcePromptPreview: manifest.promptPreview,
    createdAt: options.createdAt ?? new Date().toISOString(),
    manifest,
    previewUrl: manifest.artifacts[0]?.url,
    storagePaths,
    contentTypes,
    checksum: manifest.artifacts.find((artifact) => artifact.checksum)?.checksum,
    license: options.license ?? (manifest.ownerId === 'launch-demo' ? 'urai-demo' : 'unknown'),
    reviewState: options.reviewState ?? (manifest.ownerId === 'launch-demo' ? 'approved' : 'pending'),
    packageScope: scope,
    surfaces: options.surfaces ?? ['focus-artifact'],
    fallbackManifestId: options.fallbackManifestId,
  }
}

export function canRenderSpatialAssetPackage(pkg: UraiSpatialAssetPackage, context: { publicSurface?: boolean } = {}) {
  if (context.publicSurface && pkg.packageScope !== 'public-demo') return false
  if (!pkg.manifest.spatialCompatibility.supported) return false
  if (pkg.reviewState === 'fallback-only') return Boolean(pkg.fallbackManifestId)
  return pkg.manifest.artifacts.length > 0
}
