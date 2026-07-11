export const uraiPromotedAssetIds = new Set<string>([
  'portal-ring-master-glb-v1',
  'urai-orb-avatar-glb-v1',
])

export function isUraiAssetPromoted(assetId: string): boolean {
  return uraiPromotedAssetIds.has(assetId)
}
