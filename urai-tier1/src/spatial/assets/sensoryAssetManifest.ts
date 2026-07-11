export type UraiSensoryAssetStatus = 'ready' | 'candidate' | 'fallback'

export type UraiSensoryAssetEntry = {
  readonly id: string
  readonly path: string
  readonly status: UraiSensoryAssetStatus
  readonly routes: readonly string[]
  readonly fallback: string
  readonly license: string
}

export const uraiSensoryAssetManifest = {
  materials: {
    id: 'global-cinematic-material-pack-v1',
    path: '/assets/urai/generated/textures/global-cinematic-material-pack-v1.json',
    status: 'ready',
    routes: ['/', '/home', '/ground', '/life-map', '/focus', '/replay'],
    fallback: 'runtime-default-materials',
    license: 'URAI Labs internal production asset',
  },
  particles: {
    id: 'spatial-particle-atlas-v1',
    path: '/assets/urai/generated/textures/spatial-particle-atlas-v1.svg',
    status: 'ready',
    routes: ['/', '/home', '/ground', '/life-map', '/focus', '/replay'],
    fallback: 'shader-point-particles',
    license: 'URAI Labs internal production asset',
  },
  loading: {
    id: 'urai-loading-sequence-v1',
    path: '/assets/urai/generated/loading/urai-loading-sequence-v1.json',
    status: 'ready',
    routes: ['/', '/home', '/life-map', '/focus', '/replay'],
    fallback: 'accessible-static-loading-state',
    license: 'URAI Labs internal production asset',
  },
  skybox: {
    id: 'life-map-galaxy-skybox-v1',
    path: '/assets/urai/generated/skyboxes/life-map-galaxy-skybox-v1.hdr',
    status: 'candidate',
    routes: ['/life-map', '/focus', '/replay'],
    fallback: 'life-map-sky-dome-proof-fallback',
    license: 'URAI Labs internal production asset; not promoted without rendered-route proof',
  },
  ambientAudio: {
    id: 'urai-ambient-bed-v1',
    path: '/assets/urai/generated/audio/urai-ambient-bed-v1.opus',
    status: 'candidate',
    routes: ['/home', '/life-map', '/focus', '/replay'],
    fallback: 'silent-audio-with-user-controlled-enable',
    license: 'URAI Labs internal production asset; not promoted without rendered-route proof',
  },
} as const satisfies Record<string, UraiSensoryAssetEntry>

export function resolveReadyUraiSensoryAssetPath(key: keyof typeof uraiSensoryAssetManifest): string | null {
  const asset = uraiSensoryAssetManifest[key]
  return asset.status === 'ready' ? asset.path : null
}
