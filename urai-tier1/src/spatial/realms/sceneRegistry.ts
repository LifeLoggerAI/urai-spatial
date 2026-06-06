export type SpatialSceneId = 'home' | 'life-map' | 'location-map' | 'mirror' | 'legacy' | 'passport' | 'council' | 'dream' | 'ground'

export type SpatialSceneDefinition = {
  id: SpatialSceneId
  title: string
  route: string
  cameraPreset: 'home' | 'orbit' | 'wide' | 'close'
  lightingPreset: 'soft' | 'bright' | 'dim' | 'vault'
  privacyLevel: 'safe' | 'private'
  exitRoute: string
  fallbackRoute: string
}

export const SCENE_REGISTRY: Record<SpatialSceneId, SpatialSceneDefinition> = {
  home: { id: 'home', title: 'Home', route: '/', cameraPreset: 'home', lightingPreset: 'soft', privacyLevel: 'safe', exitRoute: '/', fallbackRoute: '/spatial-fallback' },
  'life-map': { id: 'life-map', title: 'LifeMap', route: '/life-map', cameraPreset: 'orbit', lightingPreset: 'soft', privacyLevel: 'private', exitRoute: '/', fallbackRoute: '/' },
  'location-map': { id: 'location-map', title: 'Location Map', route: '/location-map', cameraPreset: 'wide', lightingPreset: 'soft', privacyLevel: 'private', exitRoute: '/', fallbackRoute: '/' },
  mirror: { id: 'mirror', title: 'Mirror', route: '/mirror', cameraPreset: 'close', lightingPreset: 'bright', privacyLevel: 'private', exitRoute: '/', fallbackRoute: '/' },
  legacy: { id: 'legacy', title: 'Legacy', route: '/legacy', cameraPreset: 'wide', lightingPreset: 'soft', privacyLevel: 'private', exitRoute: '/', fallbackRoute: '/' },
  passport: { id: 'passport', title: 'Passport', route: '/passport', cameraPreset: 'wide', lightingPreset: 'vault', privacyLevel: 'private', exitRoute: '/', fallbackRoute: '/' },
  council: { id: 'council', title: 'Council', route: '/council', cameraPreset: 'orbit', lightingPreset: 'soft', privacyLevel: 'private', exitRoute: '/', fallbackRoute: '/' },
  dream: { id: 'dream', title: 'Dream', route: '/dream', cameraPreset: 'orbit', lightingPreset: 'dim', privacyLevel: 'private', exitRoute: '/', fallbackRoute: '/' },
  ground: { id: 'ground', title: 'Ground', route: '/ground', cameraPreset: 'home', lightingPreset: 'soft', privacyLevel: 'safe', exitRoute: '/', fallbackRoute: '/' },
}

export function getSceneDefinition(id: SpatialSceneId) {
  return SCENE_REGISTRY[id]
}
