export type WorldAssetStatus = 'placeholder' | 'draft-model' | 'final-model' | 'missing'

export type WorldAssetSlot = {
  slotId: string
  label: string
  finalModel: string
  status: WorldAssetStatus
  notes: string
}

export const worldAssetManifest = {
  home: {
    overlookPlatform: {
      slotId: 'home.overlookPlatform',
      label: 'URAI Overlook Platform',
      finalModel: '/assets/models/home/overlook-platform.glb',
      status: 'placeholder',
      notes: 'Current platform geometry is layout proof only. Replace with final Home hub platform GLB.',
    },
    skylineCore: {
      slotId: 'home.skylineCore',
      label: 'Modular City Skyline Core',
      finalModel: '/assets/models/home/modular-city-skyline.glb',
      status: 'placeholder',
      notes: 'Current skyline blocks are placeholder depth markers, not final art.',
    },
    groundAperture: {
      slotId: 'home.groundAperture',
      label: 'Ground Descent Aperture',
      finalModel: '/assets/models/home/ground-descent-aperture.glb',
      status: 'placeholder',
      notes: 'Marks the physical descent path from Home into Ground.',
    },
    lifeMapAperture: {
      slotId: 'home.lifeMapAperture',
      label: 'Life Map Sky Aperture',
      finalModel: '/assets/models/home/life-map-sky-aperture.glb',
      status: 'placeholder',
      notes: 'Marks the upper sky opening from Home into Life Map.',
    },
  },
  ground: {
    lowerWorldLayer: {
      slotId: 'ground.lowerWorldLayer',
      label: 'Ground Lower World Layer',
      finalModel: '/assets/models/ground/lower-world-layer.glb',
      status: 'placeholder',
      notes: 'Ground must become the lower physical layer beneath Home.',
    },
    actionNodes: {
      slotId: 'ground.actionNodes',
      label: 'Ground Action Nodes',
      finalModel: '/assets/models/ground/action-nodes.glb',
      status: 'placeholder',
      notes: 'Ground signals, tasks, and consent points become model-ready action nodes.',
    },
  },
  lifeMap: {
    galaxyDome: {
      slotId: 'lifeMap.galaxyDome',
      label: 'Life Map Galaxy Dome',
      finalModel: '/assets/models/life-map/galaxy-dome.glb',
      status: 'placeholder',
      notes: 'Life Map must physically live above Home as the memory sky.',
    },
    memoryStars: {
      slotId: 'lifeMap.memoryStars',
      label: 'Memory Star Set',
      finalModel: '/assets/models/life-map/memory-stars.glb',
      status: 'placeholder',
      notes: 'Stars are memory nodes and selected-star Focus entry points.',
    },
    constellationLines: {
      slotId: 'lifeMap.constellationLines',
      label: 'Constellation Line System',
      finalModel: '/assets/models/life-map/constellation-lines.glb',
      status: 'placeholder',
      notes: 'Constellation lines connect memory nodes in the sky layer.',
    },
  },
  focus: {
    starPortalShell: {
      slotId: 'focus.starPortalShell',
      label: 'Memory Star Portal Shell',
      finalModel: '/assets/models/focus/star-portal-shell.glb',
      status: 'placeholder',
      notes: 'Focus must open from selected Life Map star, not a disconnected page.',
    },
    memoryDiorama: {
      slotId: 'focus.memoryDiorama',
      label: 'Memory Diorama Container',
      finalModel: '/assets/models/focus/memory-diorama.glb',
      status: 'placeholder',
      notes: 'First memory layer inside the selected star.',
    },
  },
  replay: {
    memoryThreadTunnel: {
      slotId: 'replay.memoryThreadTunnel',
      label: 'Replay Memory Thread Tunnel',
      finalModel: '/assets/models/replay/memory-thread-tunnel.glb',
      status: 'placeholder',
      notes: 'Replay is the deeper layer inside Focus.',
    },
    beatMarkers: {
      slotId: 'replay.beatMarkers',
      label: 'Replay Beat Markers',
      finalModel: '/assets/models/replay/beat-markers.glb',
      status: 'placeholder',
      notes: 'Spatial beat markers for the Replay sequence.',
    },
  },
  passport: {
    identityVault: {
      slotId: 'passport.identityVault',
      label: 'Passport Identity Vault',
      finalModel: '/assets/models/passport/identity-vault.glb',
      status: 'placeholder',
      notes: 'Passport becomes a spatial identity vault room inside the world.',
    },
  },
  status: {
    beaconTower: {
      slotId: 'status.beaconTower',
      label: 'Status Beacon Tower',
      finalModel: '/assets/models/status/beacon-tower.glb',
      status: 'placeholder',
      notes: 'Status becomes a command beacon/tower with readiness signals.',
    },
  },
} as const

export type WorldAssetSurface = keyof typeof worldAssetManifest

export function listWorldAssetSlots(): WorldAssetSlot[] {
  return Object.values(worldAssetManifest).flatMap((surface) => Object.values(surface)) as WorldAssetSlot[]
}
