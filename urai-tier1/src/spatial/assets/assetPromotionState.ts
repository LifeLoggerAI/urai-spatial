export const uraiPromotedAssetIds = new Set<string>([
  'portal-ring-master-glb-v1',
  'urai-orb-avatar-glb-v1',
  'home-entry-chamber-model-v1',
])

export const uraiPromotedAssetPathOverrides: Readonly<Record<string, string>> = {
  'urai-orb-avatar-glb-v1': '/assets/urai/generated/models/urai-orb-avatar-v1.gltf',
  'home-entry-chamber-model-v1': '/assets/urai/generated/models/home-entry-chamber-v1.gltf',
}

export function isUraiAssetPromoted(assetId: string): boolean {
  return uraiPromotedAssetIds.has(assetId)
}
