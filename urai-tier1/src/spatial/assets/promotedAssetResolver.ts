import {
  getUraiSpatialAsset,
  getUraiSpatialFallbackAsset,
  resolveUraiSpatialAssetPath,
  type UraiSpatialAssetResolution,
} from './assetManifest'
import {
  isUraiAssetPromoted,
  uraiPromotedAssetPathOverrides,
} from './assetPromotionState'

export function resolvePromotedUraiSpatialAsset(assetId: string): UraiSpatialAssetResolution {
  const selectedAsset = getUraiSpatialAsset(assetId)
  if (!selectedAsset || !isUraiAssetPromoted(assetId)) {
    const path = resolveUraiSpatialAssetPath(assetId)
    const fallbackAsset = selectedAsset ? getUraiSpatialFallbackAsset(assetId) : null
    return {
      requestedAssetId: assetId,
      source: path && fallbackAsset ? 'fallback' : 'unavailable',
      path,
      selectedAsset,
      fallbackAsset,
    }
  }

  return {
    requestedAssetId: assetId,
    source: 'selected',
    path: uraiPromotedAssetPathOverrides[assetId] ?? selectedAsset.path,
    selectedAsset,
    fallbackAsset: getUraiSpatialFallbackAsset(assetId),
  }
}

export function resolvePromotedUraiSpatialAssetPath(assetId: string): string | null {
  return resolvePromotedUraiSpatialAsset(assetId).path
}

/** Resolve selected bytes only for an explicitly disclosed pre-promotion review. */
export function resolveDisclosedReviewUraiSpatialAssetPath(
  assetId: string,
  disclosedReview: boolean,
): string | null {
  if (!disclosedReview) return resolvePromotedUraiSpatialAssetPath(assetId)
  return getUraiSpatialAsset(assetId)?.path ?? resolvePromotedUraiSpatialAssetPath(assetId)
}
