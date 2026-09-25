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
      status: 'fallback',
      notes: 'Canonical manifest selects the reviewed Home model only when ready; otherwise it resolves deterministic proof geometry.',
    },
    skylineCore: {
      slotId: 'home.skylineCore',
      label: 'Home Environment Extension',
      finalModel: resolved('home-entry-chamber-model-v1'),
      status: 'fallback',
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
      label: 'Life Map Sky Threshold (legacy compatibility slot)',
      finalModel: '',
      status: 'missing',
      notes: 'Compatibility slot only. Current canon is broad-sky Life Map ascent; portal/ring geometry is quarantined as historical provenance and must not resolve into runtime authority.',
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
      finalModel: '',
      status: 'missing',
      notes: 'Runtime stellar system; current visible authority is procedural point/photosphere plus layered corona. Historical generated Memory Star GLBs are supporting provenance only.',
    },
    constellationLines: {
      slotId: 'lifeMap.constellationLines',
      label: 'Retired Relationship-Line Compatibility Slot',
      finalModel: '',
      status: 'missing',
      notes: 'Legacy graph-edge compatibility metadata only. Current Life Map authority is the layered galaxy with data-derived regions and stellar Memory Stars; no visible constellation-line system is authorized.',
    },
  },
  focus: {
    starPortalShell: {
      slotId: 'focus.starPortalShell',
      label: 'Focus Selected Memory Compatibility Geometry',
      finalModel: '',
      status: 'missing',
      notes: 'Compatibility slot only. Focus authority is the selected Memory Star resolving into contained memory; tunnel/chamber geometry must not resolve into runtime authority.',
    },
    memoryDiorama: {
      slotId: 'focus.memoryDiorama',
      label: 'Focus Memory Diorama',
      finalModel: '',
      status: 'missing',
      notes: 'Runtime selected-memory system; Focus authority is V395 selected stellar photosphere/corona with contained memory, not a generated Memory Star GLB.',
    },
  },
  replay: {
    memoryThreadTunnel: {
      slotId: 'replay.memoryThreadTunnel',
      label: 'Replay Memory Interior Compatibility Geometry',
      finalModel: '',
      status: 'missing',
      notes: 'Compatibility slot only. Replay authority is an immersive memory interior with truthful source grammar; film portal/theater/player geometry must not resolve into runtime authority.',
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
      finalModel: '',
      status: 'missing',
      notes: 'Runtime ownership-vault surface and Home physical Passport own current product authority; the historical Passport room GLB is supporting reference only.',
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
