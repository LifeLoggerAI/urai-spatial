export type UraiSpatialAssetType = 'model' | 'texture' | 'skybox' | 'portal' | 'world' | 'ui' | 'audio' | 'fallback'
export type UraiSpatialAssetStatus = 'ready' | 'candidate' | 'fallback' | 'missing' | 'future'
export type UraiSpatialTargetSurface = 'home' | 'ground' | 'life-map' | 'focus' | 'replay' | 'passport' | 'status' | 'council' | 'ar-vr' | 'global'

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
const updatedAt = '2026-08-05'

const finalGlb = (
  id: string,
  name: string,
  fileName: string,
  type: UraiSpatialAssetType,
  targetSurface: UraiSpatialTargetSurface,
  priority: UraiSpatialAssetManifestEntry['priority'],
  fallbackAssetId: string,
  generationPromptId: string,
): UraiSpatialAssetManifestEntry => ({
  id,
  name,
  type,
  path: `${generatedRoot}/models/${fileName}`,
  status: 'candidate',
  targetSurface,
  priority,
  notes: 'Deterministic URAI Labs GLB candidate. Binary integrity, named scene structure, PBR material extensions, animation clips, and triangle budget are build-verified; runtime selection remains fallback-first until canonical promotion and exact-head visual acceptance.',
  createdAt,
  updatedAt,
  fallbackAssetId,
  generationPromptId,
})

const pendingHuman = (
  id: string,
  name: string,
  fileName: string,
  targetSurface: UraiSpatialTargetSurface,
): UraiSpatialAssetManifestEntry => ({
  id,
  name,
  type: 'model',
  path: `${generatedRoot}/human-makehuman-v4/${fileName}`,
  status: 'candidate',
  targetSurface,
  priority: 'high',
  notes: 'Pending governed human binary. Runtime uses a semantic no-model fallback until exact-binary visual approval and promotion.',
  createdAt,
  updatedAt,
})

export const uraiSpatialAssetManifest: readonly UraiSpatialAssetManifestEntry[] = [
  pendingHuman('home-human-makehuman-v4', 'Home MakeHuman Presence', 'home-human-makehuman-v4.glb', 'home'),
  pendingHuman('council-guide-human-makehuman-v4', 'Council Guide MakeHuman', 'council-guide-human-makehuman-v4.glb', 'council'),
  pendingHuman('council-archivist-human-makehuman-v4', 'Council Archivist MakeHuman', 'council-archivist-human-makehuman-v4.glb', 'council'),
  pendingHuman('council-guardian-human-makehuman-v4', 'Council Guardian MakeHuman', 'council-guardian-human-makehuman-v4.glb', 'council'),
  pendingHuman('council-builder-human-makehuman-v4', 'Council Builder MakeHuman', 'council-builder-human-makehuman-v4.glb', 'council'),
  pendingHuman('council-mirror-human-makehuman-v4', 'Council Mirror MakeHuman', 'council-mirror-human-makehuman-v4.glb', 'council'),
  pendingHuman('council-trickster-human-makehuman-v4', 'Council Trickster MakeHuman', 'council-trickster-human-makehuman-v4.glb', 'council'),
  finalGlb('home-entry-chamber-model-v1', 'Home Entry Chamber GLB', 'home-entry-chamber-v1.glb', 'model', 'home', 'critical', 'home-entry-chamber-proof-fallback', 'home-world-assets'),
  finalGlb('portal-ring-master-glb-v1', 'Portal Ring Master GLB', 'portal-ring-master-v1.glb', 'portal', 'global', 'critical', 'portal-ring-proof-fallback', 'home-world-assets'),
  finalGlb('ground-world-terrain-glb-v1', 'Ground World Terrain GLB', 'ground-world-terrain-v1.glb', 'world', 'ground', 'critical', 'ground-room-shell-proof-fallback', 'ground-world-assets'),
  {
    id: 'life-map-galaxy-skybox-v1',
    name: 'Life Map Galaxy Skybox',
    type: 'skybox',
    path: `${generatedRoot}/skyboxes/life-map-galaxy-skybox-v1.hdr`,
    status: 'future',
    targetSurface: 'life-map',
    priority: 'critical',
    notes: 'HDR environment remains separately governed; the final memory-star GLB is ready.',
    createdAt,
    updatedAt,
    fallbackAssetId: 'life-map-sky-dome-proof-fallback',
    generationPromptId: 'life-map-galaxy-assets',
  },
  finalGlb('life-map-memory-star-glb-v1', 'Life Map Memory Star GLB', 'life-map-memory-star-v1.glb', 'model', 'life-map', 'critical', 'life-map-memory-star-proof-fallback', 'life-map-galaxy-assets'),
  finalGlb('focus-memory-chamber-glb-v1', 'Focus Memory Chamber GLB', 'focus-memory-chamber-v1.glb', 'model', 'focus', 'high', 'focus-star-tunnel-proof-fallback', 'focus-star-assets'),
  finalGlb('replay-memory-environment-glb-v1', 'Replay Memory Environment GLB', 'replay-memory-environment-v1.glb', 'model', 'replay', 'high', 'replay-film-portal-proof-fallback', 'replay-memory-assets'),
  finalGlb('urai-orb-avatar-glb-v1', 'URAI Orb Avatar GLB', 'urai-orb-avatar-v1.glb', 'model', 'global', 'critical', 'urai-orb-proof-fallback', 'home-world-assets'),
  finalGlb('passport-status-room-glb-v1', 'Passport and Status Room GLB', 'passport-status-room-v1.glb', 'model', 'passport', 'medium', 'passport-identity-plinth-proof-fallback', 'passport-status-room-assets'),
  {
    id: 'global-cinematic-material-pack-v1',
    name: 'Global Cinematic Material Pack',
    type: 'texture',
    path: `${generatedRoot}/textures/global-cinematic-material-pack-v1.json`,
    status: 'future',
    targetSurface: 'global',
    priority: 'high',
    notes: 'Standalone texture definitions remain separate; final GLBs embed production PBR material definitions.',
    createdAt,
    updatedAt,
    generationPromptId: 'texture-style-guide',
  },
  {
    id: 'home-entry-chamber-proof-fallback', name: 'Home Entry Chamber Proof Fallback', type: 'fallback',
    path: `${proofFallbackRoot}/entry-chamber/models/entry-chamber-shell-v1.gltf`, status: 'fallback', targetSurface: 'home', priority: 'critical',
    notes: 'Emergency degraded geometry only.', createdAt, updatedAt,
  },
  {
    id: 'home-entry-floor-ring-proof-fallback', name: 'Home Entry Floor Ring Proof Fallback', type: 'fallback',
    path: `${proofFallbackRoot}/entry-chamber/models/entry-floor-ring-v1.gltf`, status: 'fallback', targetSurface: 'home', priority: 'high',
    notes: 'Emergency degraded geometry only.', createdAt, updatedAt,
  },
  {
    id: 'ground-descent-hatch-proof-fallback', name: 'Ground Descent Hatch Proof Fallback', type: 'fallback',
    path: `${proofFallbackRoot}/entry-chamber/models/ground-descent-hatch-v1.gltf`, status: 'fallback', targetSurface: 'home', priority: 'high',
    notes: 'Emergency degraded geometry only.', createdAt, updatedAt,
  },
  {
    id: 'portal-ring-proof-fallback', name: 'Portal Ring Proof Fallback', type: 'fallback',
    path: `${proofFallbackRoot}/shared/models/universal-portal-ring-v1.gltf`, status: 'fallback', targetSurface: 'global', priority: 'critical',
    notes: 'Emergency degraded geometry only.', createdAt, updatedAt,
  },
  {
    id: 'ground-room-shell-proof-fallback', name: 'Ground Room Shell Proof Fallback', type: 'fallback',
    path: `${proofFallbackRoot}/ground-room/models/ground-room-shell-v1.gltf`, status: 'fallback', targetSurface: 'ground', priority: 'critical',
    notes: 'Emergency degraded geometry only.', createdAt, updatedAt,
  },
  {
    id: 'ground-terminal-proof-fallback', name: 'Ground Terminal Proof Fallback', type: 'fallback',
    path: `${proofFallbackRoot}/ground-room/models/ground-terminal-v1.gltf`, status: 'fallback', targetSurface: 'ground', priority: 'high',
    notes: 'Emergency degraded geometry only.', createdAt, updatedAt,
  },
  {
    id: 'agent-source-station-proof-fallback', name: 'Agent Source Station Proof Fallback', type: 'fallback',
    path: `${proofFallbackRoot}/ground-room/models/agent-source-station-v1.gltf`, status: 'fallback', targetSurface: 'ground', priority: 'high',
    notes: 'Emergency degraded geometry only.', createdAt, updatedAt,
  },
  {
    id: 'life-map-sky-dome-proof-fallback', name: 'Life Map Sky Dome Proof Fallback', type: 'fallback',
    path: `${proofFallbackRoot}/life-map/models/life-map-sky-dome-v1.gltf`, status: 'fallback', targetSurface: 'life-map', priority: 'critical',
    notes: 'Emergency degraded sky geometry only.', createdAt, updatedAt,
  },
  {
    id: 'life-map-memory-star-proof-fallback', name: 'Life Map Memory Star Proof Fallback', type: 'fallback',
    path: `${proofFallbackRoot}/life-map/models/star-memory-node-v1.gltf`, status: 'fallback', targetSurface: 'life-map', priority: 'critical',
    notes: 'Emergency degraded geometry only.', createdAt, updatedAt,
  },
  {
    id: 'focus-star-tunnel-proof-fallback', name: 'Focus Star Tunnel Proof Fallback', type: 'fallback',
    path: `${proofFallbackRoot}/focus-star/models/focus-star-tunnel-v1.gltf`, status: 'fallback', targetSurface: 'focus', priority: 'high',
    notes: 'Emergency degraded geometry only.', createdAt, updatedAt,
  },
  {
    id: 'replay-film-portal-proof-fallback', name: 'Replay Film Portal Proof Fallback', type: 'fallback',
    path: `${proofFallbackRoot}/replay-portal/models/replay-film-portal-v1.gltf`, status: 'fallback', targetSurface: 'replay', priority: 'high',
    notes: 'Emergency degraded geometry only.', createdAt, updatedAt,
  },
  {
    id: 'urai-orb-proof-fallback', name: 'URAI Orb Proof Fallback', type: 'fallback',
    path: `${proofFallbackRoot}/entry-chamber/models/central-orb-v1.gltf`, status: 'fallback', targetSurface: 'global', priority: 'critical',
    notes: 'Emergency degraded geometry only.', createdAt, updatedAt,
  },
  {
    id: 'passport-identity-plinth-proof-fallback', name: 'Passport Identity Plinth Proof Fallback', type: 'fallback',
    path: `${proofFallbackRoot}/passport-room/models/passport-identity-plinth-v1.gltf`, status: 'fallback', targetSurface: 'passport', priority: 'medium',
    notes: 'Emergency degraded geometry only.', createdAt, updatedAt,
  },
  {
    id: 'status-control-board-proof-fallback', name: 'Status Control Board Proof Fallback', type: 'fallback',
    path: `${proofFallbackRoot}/status-room/models/status-control-board-v1.gltf`, status: 'fallback', targetSurface: 'status', priority: 'medium',
    notes: 'Emergency degraded geometry only.', createdAt, updatedAt,
  },
]

export type UraiSpatialAssetId = (typeof uraiSpatialAssetManifest)[number]['id']
export const criticalUraiSpatialAssetIds = uraiSpatialAssetManifest.filter((asset) => asset.priority === 'critical').map((asset) => asset.id)
export function getUraiSpatialAsset(assetId: string): UraiSpatialAssetManifestEntry | null { return uraiSpatialAssetManifest.find((asset) => asset.id === assetId) ?? null }
export function getUraiSpatialFallbackAsset(assetId: string): UraiSpatialAssetManifestEntry | null { const asset = getUraiSpatialAsset(assetId); return asset?.fallbackAssetId ? getUraiSpatialAsset(asset.fallbackAssetId) : null }
export function getUraiSpatialAssetsForSurface(surface: UraiSpatialTargetSurface): readonly UraiSpatialAssetManifestEntry[] { return uraiSpatialAssetManifest.filter((asset) => asset.targetSurface === surface || asset.targetSurface === 'global') }
export function isUraiSpatialAssetReady(assetId: string): boolean { return getUraiSpatialAsset(assetId)?.status === 'ready' }
export function resolveUraiSpatialAsset(assetId: string): UraiSpatialAssetResolution {
  const selectedAsset = getUraiSpatialAsset(assetId)
  if (!selectedAsset) return { requestedAssetId: assetId, source: 'unavailable', path: null, selectedAsset: null, fallbackAsset: null }
  if (selectedAsset.status === 'fallback') return { requestedAssetId: assetId, source: 'fallback', path: selectedAsset.path, selectedAsset: null, fallbackAsset: selectedAsset }
  const fallbackAsset = getUraiSpatialFallbackAsset(assetId)
  if (selectedAsset.status === 'ready') return { requestedAssetId: assetId, source: 'selected', path: selectedAsset.path, selectedAsset, fallbackAsset }
  if (fallbackAsset?.status === 'fallback') return { requestedAssetId: assetId, source: 'fallback', path: fallbackAsset.path, selectedAsset, fallbackAsset }
  return { requestedAssetId: assetId, source: 'unavailable', path: null, selectedAsset, fallbackAsset }
}
export function resolveUraiSpatialAssetPath(assetId: string): string | null { return resolveUraiSpatialAsset(assetId).path }
