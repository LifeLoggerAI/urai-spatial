export const uraiPromotedAssetIds = new Set<string>()

export const uraiPromotedAssetPathOverrides: Readonly<Record<string, string>> = {}

export function isUraiAssetPromoted(assetId: string): boolean {
  return uraiPromotedAssetIds.has(assetId)
}
