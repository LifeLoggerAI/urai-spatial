import type { MemoryTruthClass, MemoryWorldAsset, MemoryWorldSourceRef } from './memoryWorld'

export const MEMORY_WORLD_ASSET_REGISTRY_VERSION = 'urai-memory-world-asset-registry-1' as const

export type MemoryWorldAssetRegistryManifest = {
  schemaVersion: typeof MEMORY_WORLD_ASSET_REGISTRY_VERSION
  assets: readonly MemoryWorldAsset[]
  sources: readonly MemoryWorldSourceRef[]
}

const SOURCE_BACKED_TRUTH = new Set<MemoryTruthClass>([
  'T0_SOURCE_CAPTURED',
  'T1_SOURCE_DERIVED',
  'T2_SPATIALLY_RECONSTRUCTED',
  'T3_EVIDENCE_INFERRED',
])

const PRODUCTION_STATES = new Set<MemoryWorldAsset['status']>(['silver','gold','gold-master'])

function sha256(value: string | undefined) {
  return value === undefined || /^[a-f0-9]{64}$/i.test(value)
}

export function validateMemoryWorldAssetRegistry(manifest: MemoryWorldAssetRegistryManifest) {
  const errors: string[] = []
  if (manifest.schemaVersion !== MEMORY_WORLD_ASSET_REGISTRY_VERSION) errors.push('UNSUPPORTED_ASSET_REGISTRY_SCHEMA')

  const sourceIds = new Set<string>()
  for (const source of manifest.sources) {
    if (!source.sourceId || sourceIds.has(source.sourceId)) errors.push(`DUPLICATE_OR_MISSING_SOURCE_ID:${source.sourceId || 'missing'}`)
    sourceIds.add(source.sourceId)
    if (source.authority === 'unknown') errors.push(`SOURCE_AUTHORITY_UNKNOWN:${source.sourceId}`)
    if (source.permissions.referenceOnly && source.permissions.productionAssetPermitted === true) errors.push(`REFERENCE_ONLY_SOURCE_CANNOT_BE_PRODUCTION:${source.sourceId}`)
    if (source.permissions.productionAssetPermitted === true && source.permissions.reviewRequired && source.authority !== 'user-owned' && !source.licenseId) {
      errors.push(`PRODUCTION_LICENSE_EVIDENCE_REQUIRED:${source.sourceId}`)
    }
  }

  const assetIds = new Set<string>()
  for (const asset of manifest.assets) {
    if (!asset.assetId || assetIds.has(asset.assetId)) errors.push(`DUPLICATE_OR_MISSING_ASSET_ID:${asset.assetId || 'missing'}`)
    assetIds.add(asset.assetId)
    if (!sha256(asset.checksum)) errors.push(`INVALID_ASSET_CHECKSUM:${asset.assetId}`)
    if (SOURCE_BACKED_TRUTH.has(asset.truthClass) && asset.sourceIds.length === 0) errors.push(`SOURCE_BACKED_ASSET_HAS_NO_SOURCES:${asset.assetId}`)
    for (const sourceId of asset.sourceIds) if (!sourceIds.has(sourceId)) errors.push(`ASSET_SOURCE_MISSING:${asset.assetId}:${sourceId}`)
  }

  for (const asset of manifest.assets) {
    for (const dependency of asset.dependencies) if (!assetIds.has(dependency)) errors.push(`ASSET_DEPENDENCY_MISSING:${asset.assetId}:${dependency}`)
    if (!PRODUCTION_STATES.has(asset.status)) continue
    for (const sourceId of asset.sourceIds) {
      const source = manifest.sources.find((candidate) => candidate.sourceId === sourceId)
      if (!source) continue
      if (source.permissions.referenceOnly) errors.push(`REFERENCE_ONLY_SOURCE_PROMOTED:${asset.assetId}:${sourceId}`)
      if (source.permissions.productionAssetPermitted !== true && source.authority !== 'user-owned') {
        errors.push(`PRODUCTION_PERMISSION_NOT_PROVEN:${asset.assetId}:${sourceId}`)
      }
    }
  }

  return errors
}
