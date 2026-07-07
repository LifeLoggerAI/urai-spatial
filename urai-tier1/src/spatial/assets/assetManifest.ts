export type UraiSpatialAssetType = 'model' | 'texture' | 'skybox' | 'portal' | 'world' | 'ui' | 'audio' | 'fallback'

export type UraiSpatialAssetStatus = 'ready' | 'placeholder' | 'missing' | 'future'

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

const generatedRoot = '/assets/urai/generated'
const fallbackRoot = '/assets/urai/fallbacks'

export const uraiSpatialAssetManifest = [
  {
    id: 'home-entry-chamber-model-v1',
    name: 'Home Entry Chamber GLB',
    type: 'model',
    path: `${generatedRoot}/models/home-entry-chamber-v1.glb`,
    status: 'future',
    targetSurface: 'home',
    priority: 'critical',
    notes: 'Primary navigable home chamber model. Must feel cinematic, spatial, walkable, and non-dashboard.',
    createdAt: '2026-07-07',
    updatedAt: '2026-07-07',
    fallbackAssetId: 'home-entry-chamber-procedural-fallback',
    generationPromptId: 'home-world-assets',
  },
  {
    id: 'home-entry-chamber-procedural-fallback',
    name: 'Home Entry Chamber Procedural Fallback',
    type: 'fallback',
    path: `${fallbackRoot}/models/home-entry-chamber-procedural.json`,
    status: 'placeholder',
    targetSurface: 'home',
    priority: 'critical',
    notes: 'Runtime procedural fallback rendered with Three.js geometry until final GLB is imported.',
    createdAt: '2026-07-07',
    updatedAt: '2026-07-07',
  },
  {
    id: 'portal-ring-master-glb-v1',
    name: 'Portal Ring Master GLB',
    type: 'portal',
    path: `${generatedRoot}/models/portal-ring-master-v1.glb`,
    status: 'future',
    targetSurface: 'global',
    priority: 'critical',
    notes: 'Reusable premium portal geometry for home to ground, home to Life Map, focus, and replay transitions.',
    createdAt: '2026-07-07',
    updatedAt: '2026-07-07',
    fallbackAssetId: 'portal-ring-procedural-fallback',
    generationPromptId: 'home-world-assets',
  },
  {
    id: 'portal-ring-procedural-fallback',
    name: 'Portal Ring Procedural Fallback',
    type: 'fallback',
    path: `${fallbackRoot}/portals/portal-ring-procedural.json`,
    status: 'placeholder',
    targetSurface: 'global',
    priority: 'critical',
    notes: 'Runtime torus/ring fallback. Should look intentional, luminous, and spatial.',
    createdAt: '2026-07-07',
    updatedAt: '2026-07-07',
  },
  {
    id: 'ground-world-terrain-glb-v1',
    name: 'Ground World Terrain GLB',
    type: 'world',
    path: `${generatedRoot}/models/ground-world-terrain-v1.glb`,
    status: 'future',
    targetSurface: 'ground',
    priority: 'critical',
    notes: 'Walkable reachable ground below the default world. Must not feel like a separate 2D page.',
    createdAt: '2026-07-07',
    updatedAt: '2026-07-07',
    fallbackAssetId: 'ground-world-procedural-fallback',
    generationPromptId: 'ground-world-assets',
  },
  {
    id: 'ground-world-procedural-fallback',
    name: 'Ground World Procedural Fallback',
    type: 'fallback',
    path: `${fallbackRoot}/worlds/ground-world-procedural.json`,
    status: 'placeholder',
    targetSurface: 'ground',
    priority: 'critical',
    notes: 'Runtime terrain/floor fallback rendered before final terrain GLB exists.',
    createdAt: '2026-07-07',
    updatedAt: '2026-07-07',
  },
  {
    id: 'life-map-galaxy-skybox-v1',
    name: 'Life Map Galaxy Skybox',
    type: 'skybox',
    path: `${generatedRoot}/skyboxes/life-map-galaxy-skybox-v1.hdr`,
    status: 'future',
    targetSurface: 'life-map',
    priority: 'critical',
    notes: 'The Life Map should feel like looking up into a living galaxy rather than opening a flat overlay.',
    createdAt: '2026-07-07',
    updatedAt: '2026-07-07',
    fallbackAssetId: 'life-map-procedural-starfield-fallback',
    generationPromptId: 'life-map-galaxy-assets',
  },
  {
    id: 'life-map-procedural-starfield-fallback',
    name: 'Life Map Procedural Starfield Fallback',
    type: 'fallback',
    path: `${fallbackRoot}/skyboxes/life-map-procedural-starfield.json`,
    status: 'placeholder',
    targetSurface: 'life-map',
    priority: 'critical',
    notes: 'Runtime point-cloud fallback for galaxy depth and star hover/tap feedback.',
    createdAt: '2026-07-07',
    updatedAt: '2026-07-07',
  },
  {
    id: 'focus-star-flight-glb-v1',
    name: 'Focus Star Flight GLB',
    type: 'model',
    path: `${generatedRoot}/models/focus-star-flight-v1.glb`,
    status: 'future',
    targetSurface: 'focus',
    priority: 'high',
    notes: 'Focus should feel like flying into a selected star, not opening a normal route.',
    createdAt: '2026-07-07',
    updatedAt: '2026-07-07',
    fallbackAssetId: 'focus-star-procedural-fallback',
    generationPromptId: 'focus-star-assets',
  },
  {
    id: 'focus-star-procedural-fallback',
    name: 'Focus Star Procedural Fallback',
    type: 'fallback',
    path: `${fallbackRoot}/models/focus-star-procedural.json`,
    status: 'placeholder',
    targetSurface: 'focus',
    priority: 'high',
    notes: 'Runtime star tunnel/focus object fallback.',
    createdAt: '2026-07-07',
    updatedAt: '2026-07-07',
  },
  {
    id: 'replay-memory-film-glb-v1',
    name: 'Replay Memory Film GLB',
    type: 'model',
    path: `${generatedRoot}/models/replay-memory-film-v1.glb`,
    status: 'future',
    targetSurface: 'replay',
    priority: 'high',
    notes: 'Replay should feel like opening a memory film-world from a star.',
    createdAt: '2026-07-07',
    updatedAt: '2026-07-07',
    fallbackAssetId: 'replay-memory-film-procedural-fallback',
    generationPromptId: 'replay-memory-assets',
  },
  {
    id: 'replay-memory-film-procedural-fallback',
    name: 'Replay Memory Film Procedural Fallback',
    type: 'fallback',
    path: `${fallbackRoot}/models/replay-memory-film-procedural.json`,
    status: 'placeholder',
    targetSurface: 'replay',
    priority: 'high',
    notes: 'Runtime film-strip/world-window fallback for replay.',
    createdAt: '2026-07-07',
    updatedAt: '2026-07-07',
  },
  {
    id: 'passport-status-room-glb-v1',
    name: 'Passport Status Spatial Room GLB',
    type: 'model',
    path: `${generatedRoot}/models/passport-status-room-v1.glb`,
    status: 'future',
    targetSurface: 'passport',
    priority: 'medium',
    notes: 'Passport and status should feel like rooms/control layers inside the world, not admin pages.',
    createdAt: '2026-07-07',
    updatedAt: '2026-07-07',
    fallbackAssetId: 'passport-status-terminal-procedural-fallback',
    generationPromptId: 'passport-status-room-assets',
  },
  {
    id: 'passport-status-terminal-procedural-fallback',
    name: 'Passport Status Terminal Procedural Fallback',
    type: 'fallback',
    path: `${fallbackRoot}/models/passport-status-terminal-procedural.json`,
    status: 'placeholder',
    targetSurface: 'status',
    priority: 'medium',
    notes: 'Runtime terminal/room fallback for passport and status surfaces.',
    createdAt: '2026-07-07',
    updatedAt: '2026-07-07',
  },
  {
    id: 'global-cinematic-material-pack-v1',
    name: 'Global Cinematic Material Pack',
    type: 'texture',
    path: `${generatedRoot}/textures/global-cinematic-material-pack-v1.json`,
    status: 'future',
    targetSurface: 'global',
    priority: 'high',
    notes: 'Shared PBR texture/material map definitions for glass, dark metal, volumetric glow, floor, portal energy, and star dust.',
    createdAt: '2026-07-07',
    updatedAt: '2026-07-07',
    generationPromptId: 'texture-style-guide',
  },
] as const satisfies readonly UraiSpatialAssetManifestEntry[]

export type UraiSpatialAssetId = (typeof uraiSpatialAssetManifest)[number]['id']

export const criticalUraiSpatialAssetIds = uraiSpatialAssetManifest
  .filter((asset) => asset.priority === 'critical')
  .map((asset) => asset.id)

export function getUraiSpatialAsset(assetId: string) {
  return uraiSpatialAssetManifest.find((asset) => asset.id === assetId) ?? null
}

export function getUraiSpatialFallbackAsset(assetId: string) {
  const asset = getUraiSpatialAsset(assetId)
  return asset?.fallbackAssetId ? getUraiSpatialAsset(asset.fallbackAssetId) : null
}

export function getUraiSpatialAssetsForSurface(surface: UraiSpatialTargetSurface) {
  return uraiSpatialAssetManifest.filter((asset) => asset.targetSurface === surface || asset.targetSurface === 'global')
}

export function isUraiSpatialAssetReady(assetId: string) {
  const asset = getUraiSpatialAsset(assetId)
  return asset?.status === 'ready' || asset?.status === 'placeholder'
}
