import { routeAssets, avatarAssets, uiAssets } from './uraiAssets'
import { v2Assets } from './v2Assets'
import { xrAssets } from './xrAssets'

export const v1AssetContract = {
  label: 'V1 public route world final',
  routes: routeAssets,
  avatars: avatarAssets,
  ui: uiAssets,
} as const

export const v2AssetContract = {
  label: 'V2 living system states',
  assets: v2Assets,
} as const

export const v3Graphics = xrAssets.filter((asset) =>
  asset.path.endsWith('.webp') && !asset.path.includes('/proof/'),
)

export const v3RuntimeAndPhysicalProof = xrAssets.filter((asset) =>
  !v3Graphics.includes(asset),
)

export const v3AssetContract = {
  label: 'V3 spatial XR',
  graphics: v3Graphics,
  runtimeAndPhysicalProof: v3RuntimeAndPhysicalProof,
  truthBoundary:
    'Generated XR graphics are not hardware proof. GLB, audio, haptics, performance files, device screenshots, navigation video, and device receipts must be validated separately.',
} as const

export const v123AssetContract = {
  v1: v1AssetContract,
  v2: v2AssetContract,
  v3: v3AssetContract,
} as const
