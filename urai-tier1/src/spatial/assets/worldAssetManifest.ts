import { resolveUraiSpatialAssetPath } from './assetManifest'

export type WorldAssetStatus = 'fallback' | 'candidate' | 'ready' | 'missing'

export type WorldAssetSlot = {
  slotId: string
  label: string
  finalModel: string
  status: WorldAssetStatus
  notes: string
}

function resolved(assetId: string): string {
  return resolveUraiSpatialAssetPath(assetId) ?? ''
}

export const worldAssetManifest = {
  home: {
    overlookPlatform: {
      slotId: 'home.overlookPlatform',
      label: 'URAI Home Entry Chamber',
      finalModel: resolved('home-entry-chamber-model-v1'),
      status: 'ready',
      notes: 'Reviewed Home sanctuary is selected; deterministic proof geometry remains available through the load-failure boundary.',
    },
    skylineCore: {
      slotId: 'home.skylineCore',
      label: 'Home Environment Extension',
      finalModel: resolved('home-entry-chamber-model-v1'),
      status: 'ready',
      notes: 'No independent /assets/models skyline authority remains. Future skyline work must enter the selected generated namespace.',
    },
    groundAperture: {
      slotId: 'home.groundAperture',
      label: 'Ground Descent Aperture',
      finalModel: resolved('ground-descent-hatch-proof-fallback'),
      status: 'fallback',
      notes: 'Explicit supporting fallback for the physical descent path from Home into Ground.',
    },
    lifeMapAperture: {
      slotId: 'home.lifeMapAperture',
      label: 'Life Map Portal',
      finalModel: resolved('portal-ring-master-glb-v1'),
      status: 'fallback',
      notes: 'Canonical portal selection with deterministic portal-ring fallback.',
    },
  },
  ground: {
    lowerWorldLayer: {
      slotId: 'ground.lowerWorldLayer',
      label: 'Ground Lower World Layer',
      finalModel: resolved('ground-world-terrain-glb-v1'),
      status: 'fallback',
      notes: 'Canonical Ground selection with explicit proof-room fallback.',
    },
    actionNodes: {
      slotId: 'ground.actionNodes',
      label: 'Ground Action Nodes',
      finalModel: resolved('agent-source-station-proof-fallback'),
      status: 'fallback',
      notes: 'Supporting deterministic action-node geometry until selected assets are promoted.',
    },
  },
  lifeMap: {
    galaxyDome: {
      slotId: 'lifeMap.galaxyDome',
      label: 'Life Map Galaxy Environment',
      finalModel: resolved('life-map-sky-dome-proof-fallback'),
      status: 'fallback',
      notes: 'The selected HDR environment is handled separately; this slot exposes the explicit model fallback.',
    },
    memoryStars: {
      slotId: 'lifeMap.memoryStars',
      label: 'Memory Star Set',
      finalModel: resolved('life-map-memory-star-glb-v1'),
      status: 'fallback',
      notes: 'Canonical selected memory-star model with deterministic proof fallback.',
    },
    constellationLines: {
      slotId: 'lifeMap.constellationLines',
      label: 'Constellation Line System',
      finalModel: '',
      status: 'missing',
      notes: 'Shader/runtime system; no independent model namespace is authorized.',
    },
  },
  focus: {
    starPortalShell: {
      slotId: 'focus.starPortalShell',
      label: 'Focus Memory Chamber',
      finalModel: resolved('focus-memory-chamber-glb-v1'),
      status: 'fallback',
      notes: 'Canonical Focus selection with deterministic tunnel fallback.',
    },
    memoryDiorama: {
      slotId: 'focus.memoryDiorama',
      label: 'Focus Memory Diorama',
      finalModel: resolved('life-map-memory-star-glb-v1'),
      status: 'fallback',
      notes: 'Uses the canonical memory-star resolution until a separate reviewed diorama asset exists.',
    },
  },
  replay: {
    memoryThreadTunnel: {
      slotId: 'replay.memoryThreadTunnel',
      label: 'Replay Memory Environment',
      finalModel: resolved('replay-memory-environment-glb-v1'),
      status: 'fallback',
      notes: 'Canonical Replay selection with deterministic film-portal fallback.',
    },
    beatMarkers: {
      slotId: 'replay.beatMarkers',
      label: 'Replay Beat Markers',
      finalModel: '',
      status: 'missing',
      notes: 'Runtime timeline system; no independent model namespace is authorized.',
    },
  },
  passport: {
    identityVault: {
      slotId: 'passport.identityVault',
      label: 'Passport Identity Vault',
      finalModel: resolved('passport-status-room-glb-v1'),
      status: 'fallback',
      notes: 'Selected room is not yet available; deterministic identity-plinth fallback remains explicit.',
    },
  },
  status: {
    beaconTower: {
      slotId: 'status.beaconTower',
      label: 'Status Control Surface',
      finalModel: resolved('status-control-board-proof-fallback'),
      status: 'fallback',
      notes: 'Explicit deterministic status fallback; no competing /assets/models path remains.',
    },
  },
} as const

export type WorldAssetSurface = keyof typeof worldAssetManifest

export function listWorldAssetSlots(): WorldAssetSlot[] {
  return Object.values(worldAssetManifest).flatMap((surface) => Object.values(surface)) as WorldAssetSlot[]
}
