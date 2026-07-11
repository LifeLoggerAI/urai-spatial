export const uraiPromotedAssetIds = new Set<string>([])

export function isUraiAssetPromoted(assetId: string): boolean {
  return uraiPromotedAssetIds.has(assetId)
}
