export const uraiPromotedAssetIds = new Set<string>([
  'portal-ring-master-glb-v1',
  'urai-orb-avatar-glb-v1',
  'home-entry-chamber-model-v1',
  'ground-world-terrain-glb-v1',
  'life-map-memory-star-glb-v1',
  'focus-memory-chamber-glb-v1',
  'replay-memory-environment-glb-v1',
])

export const uraiPromotedAssetPathOverrides: Readonly<Record<string, string>> = {
  'ground-world-terrain-glb-v1': '/assets/urai/generated/models/ground-world-terrain-v1.gltf',
  'life-map-memory-star-glb-v1': '/assets/urai/generated/models/life-map-memory-star-v1.gltf',
  'focus-memory-chamber-glb-v1': '/assets/urai/generated/models/focus-memory-chamber-v1.gltf',
  'replay-memory-environment-glb-v1': '/assets/urai/generated/models/replay-memory-environment-v1.gltf',
}

export function isUraiAssetPromoted(assetId: string): boolean {
  return uraiPromotedAssetIds.has(assetId)
}
