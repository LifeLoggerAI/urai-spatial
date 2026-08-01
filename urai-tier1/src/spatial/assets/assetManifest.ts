export type UraiSpatialAssetType = 'model' | 'texture' | 'skybox' | 'portal' | 'world' | 'ui' | 'audio' | 'fallback'

export type UraiSpatialAssetStatus = 'ready' | 'candidate' | 'fallback' | 'missing' | 'future'

export type UraiSpatialTargetSurface =
  | 'home'
  | 'ground'
  | 'life-map'
  | 'focus'
  | 'replay'
  | 'passport'
  | 'status'
  | 'ar-vr'
  | 'global'

export interface UraiSpatialAssetManifestEntry {
  readonly id: string
  readonly name: string
  readonly type: UraiSpatialAssetType
  readonly path: string
  readonly status: UraiSpatialAssetStatus
  readonly targetSurface: UraiSpatialTargetSurface
  readonly priority: 'critical' | 'high' | 'medium' | 'low'
  readonly notes: string
  readonly createdAt: string
  readonly updatedAt: string
  readonly fallbackAssetId?: string
  readonly generationPromptId?: string
}

export type UraiSpatialAssetResolutionSource = 'selected' | 'fallback' | 'unavailable'

export interface UraiSpatialAssetResolution {
  readonly requestedAssetId: string
  readonly source: UraiSpatialAssetResolutionSource
  readonly path: string | null
  readonly selectedAsset: UraiSpatialAssetManifestEntry | null
  readonly fallbackAsset: UraiSpatialAssetManifestEntry | null
}

const generatedRoot = '/assets/urai/generated'
const proofFallbackRoot = '/assets/urai/spatial'

const createdAt = '2026-07-07'
const updatedAt = '2026-07-10'

export const uraiSpatialAssetManifest: readonly UraiSpatialAssetManifestEntry[] = [
  {
    id: 'home-entry-chamber-model-v1',
    name: 'Home Entry Chamber GLB',
    type: 'model',
    path: `${generatedRoot}/models/home-entry-chamber-v1.glb`,
    status: 'ready',
    targetSurface: 'home',
    priority: 'critical',
    notes: 'Reviewed Meshopt Home sanctuary promoted from immutable accepted evidence; canonical proof geometry remains the load-failure fallback.',
    createdAt,
    updatedAt,
    fallbackAssetId: 'home-entry-chamber-proof-fallback',
    generationPromptId: 'home-world-assets',
  },
  {
    id: 'portal-ring-master-glb-v1',
    name: 'Portal Ring Master GLB',
    type: 'portal',
    path: `${generatedRoot}/models/portal-ring-master-v1.glb`,
    status: 'future',
    targetSurface: 'global',
    priority: 'critical',
    notes: 'Selected reusable portal geometry for spatial transitions.',
    createdAt,
    updatedAt,
    fallbackAssetId: 'portal-ring-proof-fallback',
    generationPromptId: 'home-world-assets',
  },
  {
    id: 'ground-world-terrain-glb-v1',
    name: 'Ground World Terrain GLB',
    type: 'world',
    path: `${generatedRoot}/models/ground-world-terrain-v1.glb`,
    status: 'future',
    targetSurface: 'ground',
    priority: 'critical',
    notes: 'Selected lower-world environment beneath Home.',
    createdAt,
    updatedAt,
    fallbackAssetId: 'ground-room-shell-proof-fallback',
    generationPromptId: 'ground-world-assets',
  },
  {
    id: 'life-map-galaxy-skybox-v1',
    name: 'Life Map Galaxy Skybox',
    type: 'skybox',
    path: `${generatedRoot}/skyboxes/life-map-galaxy-skybox-v1.hdr`,
    status: 'future',
    targetSurface: 'life-map',
    priority: 'critical',
    notes: 'Selected Life Map sky environment. The proof dome remains the explicit fallback.',
    createdAt,
    updatedAt,
    fallbackAssetId: 'life-map-sky-dome-proof-fallback',
    generationPromptId: 'life-map-galaxy-assets',
  },
  {
    id: 'life-map-memory-star-glb-v1',
    name: 'Life Map Memory Star GLB',
    type: 'model',
    path: `${generatedRoot}/models/life-map-memory-star-v1.glb`,
    status: 'future',
    targetSurface: 'life-map',
    priority: 'critical',
    notes: 'Selected reusable memory-star model for Life Map and Focus.',
    createdAt,
    updatedAt,
    fallbackAssetId: 'life-map-memory-star-proof-fallback',
    generationPromptId: 'life-map-galaxy-assets',
  },
  {
    id: 'focus-memory-chamber-glb-v1',
    name: 'Focus Memory Chamber GLB',
    type: 'model',
    path: `${generatedRoot}/models/focus-memory-chamber-v1.glb`,
    status: 'future',
    targetSurface: 'focus',
    priority: 'high',
    notes: 'Selected Focus environment entered from a Life Map memory star.',
    createdAt,
    updatedAt,
    fallbackAssetId: 'focus-star-tunnel-proof-fallback',
    generationPromptId: 'focus-star-assets',
  },
  {
    id: 'replay-memory-environment-glb-v1',
    name: 'Replay Memory Environment GLB',
    type: 'model',
    path: `${generatedRoot}/models/replay-memory-environment-v1.glb`,
    status: 'future',
    targetSurface: 'replay',
    priority: 'high',
    notes: 'Selected Replay film-world environment.',
    createdAt,
    updatedAt,
    fallbackAssetId: 'replay-film-portal-proof-fallback',
    generationPromptId: 'replay-memory-assets',
  },
  {
    id: 'urai-orb-avatar-glb-v1',
    name: 'URAI Orb Avatar GLB',
    type: 'model',
    path: `${generatedRoot}/models/urai-orb-avatar-v1.glb`,
    status: 'future',
    targetSurface: 'global',
    priority: 'critical',
    notes: 'Selected spatial companion orb/avatar.',
    createdAt,
    updatedAt,
    fallbackAssetId: 'urai-orb-proof-fallback',
    generationPromptId: 'home-world-assets',
  },
  {
    id: 'passport-status-room-glb-v1',
    name: 'Passport and Status Room GLB',
    type: 'model',
    path: `${generatedRoot}/models/passport-status-room-v1.glb`,
    status: 'missing',
    targetSurface: 'passport',
    priority: 'medium',
    notes: 'Not part of the current selected launch-critical promotion set. Passport uses its explicit proof fallback.',
    createdAt,
    updatedAt,
    fallbackAssetId: 'passport-identity-plinth-proof-fallback',
    generationPromptId: 'passport-status-room-assets',
  },
  {
    id: 'global-cinematic-material-pack-v1',
    name: 'Global Cinematic Material Pack',
    type: 'texture',
    path: `${generatedRoot}/textures/global-cinematic-material-pack-v1.json`,
    status: 'future',
    targetSurface: 'global',
    priority: 'high',
    notes: 'Selected material definitions. Runtime defaults remain active until this asset is ready.',
    createdAt,
    updatedAt,
    generationPromptId: 'texture-style-guide',
  },
  {
    id: 'home-entry-chamber-proof-fallback',
    name: 'Home Entry Chamber Proof Fallback',
    type: 'fallback',
    path: `${proofFallbackRoot}/entry-chamber/models/entry-chamber-shell-v1.gltf`,
    status: 'fallback',
    targetSurface: 'home',
    priority: 'critical',
    notes: 'Deterministic proof geometry used until the selected Home chamber is ready.',
    createdAt,
    updatedAt,
  },
  {
    id: 'home-entry-floor-ring-proof-fallback',
    name: 'Home Entry Floor Ring Proof Fallback',
    type: 'fallback',
    path: `${proofFallbackRoot}/entry-chamber/models/entry-floor-ring-v1.gltf`,
    status: 'fallback',
    targetSurface: 'home',
    priority: 'high',
    notes: 'Supporting proof geometry retained alongside the selected Home environment.',
    createdAt,
    updatedAt,
  },
  {
    id: 'ground-descent-hatch-proof-fallback',
    name: 'Ground Descent Hatch Proof Fallback',
    type: 'fallback',
    path: `${proofFallbackRoot}/entry-chamber/models/ground-descent-hatch-v1.gltf`,
    status: 'fallback',
    targetSurface: 'home',
    priority: 'high',
    notes: 'Supporting proof geometry for the Home-to-Ground transition.',
    createdAt,
    updatedAt,
  },
  {
    id: 'portal-ring-proof-fallback',
    name: 'Portal Ring Proof Fallback',
    type: 'fallback',
    path: `${proofFallbackRoot}/shared/models/universal-portal-ring-v1.gltf`,
    status: 'fallback',
    targetSurface: 'global',
    priority: 'critical',
    notes: 'Deterministic portal geometry used until the selected portal is ready.',
    createdAt,
    updatedAt,
  },
  {
    id: 'ground-room-shell-proof-fallback',
    name: 'Ground Room Shell Proof Fallback',
    type: 'fallback',
    path: `${proofFallbackRoot}/ground-room/models/ground-room-shell-v1.gltf`,
    status: 'fallback',
    targetSurface: 'ground',
    priority: 'critical',
    notes: 'Deterministic Ground environment fallback.',
    createdAt,
    updatedAt,
  },
  {
    id: 'ground-terminal-proof-fallback',
    name: 'Ground Terminal Proof Fallback',
    type: 'fallback',
    path: `${proofFallbackRoot}/ground-room/models/ground-terminal-v1.gltf`,
    status: 'fallback',
    targetSurface: 'ground',
    priority: 'high',
    notes: 'Supporting deterministic Ground terminal geometry.',
    createdAt,
    updatedAt,
  },
  {
    id: 'agent-source-station-proof-fallback',
    name: 'Agent Source Station Proof Fallback',
    type: 'fallback',
    path: `${proofFallbackRoot}/ground-room/models/agent-source-station-v1.gltf`,
    status: 'fallback',
    targetSurface: 'ground',
    priority: 'high',
    notes: 'Supporting deterministic Ground source-station geometry.',
    createdAt,
    updatedAt,
  },
  {
    id: 'life-map-sky-dome-proof-fallback',
    name: 'Life Map Sky Dome Proof Fallback',
    type: 'fallback',
    path: `${proofFallbackRoot}/life-map/models/life-map-sky-dome-v1.gltf`,
    status: 'fallback',
    targetSurface: 'life-map',
    priority: 'critical',
    notes: 'Deterministic Life Map sky geometry used until the selected HDR environment is ready.',
    createdAt,
    updatedAt,
  },
  {
    id: 'life-map-memory-star-proof-fallback',
    name: 'Life Map Memory Star Proof Fallback',
    type: 'fallback',
    path: `${proofFallbackRoot}/life-map/models/star-memory-node-v1.gltf`,
    status: 'fallback',
    targetSurface: 'life-map',
    priority: 'critical',
    notes: 'Deterministic memory-star geometry.',
    createdAt,
    updatedAt,
  },
  {
    id: 'focus-star-tunnel-proof-fallback',
    name: 'Focus Star Tunnel Proof Fallback',
    type: 'fallback',
    path: `${proofFallbackRoot}/focus-star/models/focus-star-tunnel-v1.gltf`,
    status: 'fallback',
    targetSurface: 'focus',
    priority: 'high',
    notes: 'Deterministic Focus fallback geometry.',
    createdAt,
    updatedAt,
  },
  {
    id: 'replay-film-portal-proof-fallback',
    name: 'Replay Film Portal Proof Fallback',
    type: 'fallback',
    path: `${proofFallbackRoot}/replay-portal/models/replay-film-portal-v1.gltf`,
    status: 'fallback',
    targetSurface: 'replay',
    priority: 'high',
    notes: 'Deterministic Replay fallback geometry.',
    createdAt,
    updatedAt,
  },
  {
    id: 'urai-orb-proof-fallback',
    name: 'URAI Orb Proof Fallback',
    type: 'fallback',
    path: `${proofFallbackRoot}/entry-chamber/models/central-orb-v1.gltf`,
    status: 'fallback',
    targetSurface: 'global',
    priority: 'critical',
    notes: 'Deterministic companion orb geometry.',
    createdAt,
    updatedAt,
  },
  {
    id: 'passport-identity-plinth-proof-fallback',
    name: 'Passport Identity Plinth Proof Fallback',
    type: 'fallback',
    path: `${proofFallbackRoot}/passport-room/models/passport-identity-plinth-v1.gltf`,
    status: 'fallback',
    targetSurface: 'passport',
    priority: 'medium',
    notes: 'Deterministic Passport room fallback.',
    createdAt,
    updatedAt,
  },
  {
    id: 'status-control-board-proof-fallback',
    name: 'Status Control Board Proof Fallback',
    type: 'fallback',
    path: `${proofFallbackRoot}/status-room/models/status-control-board-v1.gltf`,
    status: 'fallback',
    targetSurface: 'status',
    priority: 'medium',
    notes: 'Deterministic Status room fallback.',
    createdAt,
    updatedAt,
  },
]

export type UraiSpatialAssetId = (typeof uraiSpatialAssetManifest)[number]['id']

export const criticalUraiSpatialAssetIds = uraiSpatialAssetManifest
  .filter((asset) => asset.priority === 'critical')
  .map((asset) => asset.id)

export function getUraiSpatialAsset(assetId: string): UraiSpatialAssetManifestEntry | null {
  return uraiSpatialAssetManifest.find((asset) => asset.id === assetId) ?? null
}

export function getUraiSpatialFallbackAsset(assetId: string): UraiSpatialAssetManifestEntry | null {
  const asset = getUraiSpatialAsset(assetId)
  return asset?.fallbackAssetId ? getUraiSpatialAsset(asset.fallbackAssetId) : null
}

export function getUraiSpatialAssetsForSurface(surface: UraiSpatialTargetSurface): readonly UraiSpatialAssetManifestEntry[] {
  return uraiSpatialAssetManifest.filter((asset) => asset.targetSurface === surface || asset.targetSurface === 'global')
}

export function isUraiSpatialAssetReady(assetId: string): boolean {
  return getUraiSpatialAsset(assetId)?.status === 'ready'
}

export function resolveUraiSpatialAsset(assetId: string): UraiSpatialAssetResolution {
  const selectedAsset = getUraiSpatialAsset(assetId)

  if (!selectedAsset) {
    return { requestedAssetId: assetId, source: 'unavailable', path: null, selectedAsset: null, fallbackAsset: null }
  }

  if (selectedAsset.status === 'fallback') {
    return {
      requestedAssetId: assetId,
      source: 'fallback',
      path: selectedAsset.path,
      selectedAsset: null,
      fallbackAsset: selectedAsset,
    }
  }

  if (selectedAsset.status === 'ready') {
    return {
      requestedAssetId: assetId,
      source: 'selected',
      path: selectedAsset.path,
      selectedAsset,
      fallbackAsset: getUraiSpatialFallbackAsset(assetId),
    }
  }

  const fallbackAsset = getUraiSpatialFallbackAsset(assetId)
  if (fallbackAsset?.status === 'fallback') {
    return {
      requestedAssetId: assetId,
      source: 'fallback',
      path: fallbackAsset.path,
      selectedAsset,
      fallbackAsset,
    }
  }

  return { requestedAssetId: assetId, source: 'unavailable', path: null, selectedAsset, fallbackAsset }
}

export function resolveUraiSpatialAssetPath(assetId: string): string | null {
  return resolveUraiSpatialAsset(assetId).path
}
