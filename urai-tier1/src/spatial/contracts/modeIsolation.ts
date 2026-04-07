import type { CanonMode } from '@/spatial/contracts/sceneAuthority'

export type ModeVisibility = {
  showHomeLayer: boolean
  showLifeMapLayer: boolean
  showFocusLayer: boolean
  showReplayLayer: boolean

  showOrb: boolean
  showGround: boolean
  showSky: boolean
  showStarfield: boolean
  showFocusStar: boolean
  showReplayChamber: boolean

  allowOrbInteraction: boolean
  allowGroundInteraction: boolean
  allowSkyInteraction: boolean
  allowStarInteraction: boolean

  sceneTag: 'home' | 'lifemap' | 'focus' | 'replay'
}

export function getModeVisibility(mode: CanonMode): ModeVisibility {
  if (mode === 'home') {
    return {
      showHomeLayer: true,
      showLifeMapLayer: false,
      showFocusLayer: false,
      showReplayLayer: false,

      showOrb: true,
      showGround: true,
      showSky: true,
      showStarfield: false,
      showFocusStar: false,
      showReplayChamber: false,

      allowOrbInteraction: true,
      allowGroundInteraction: true,
      allowSkyInteraction: true,
      allowStarInteraction: false,

      sceneTag: 'home',
    }
  }

  if (mode === 'lifemap') {
    return {
      showHomeLayer: false,
      showLifeMapLayer: true,
      showFocusLayer: false,
      showReplayLayer: false,

      showOrb: false,
      showGround: false,
      showSky: false,
      showStarfield: true,
      showFocusStar: false,
      showReplayChamber: false,

      allowOrbInteraction: false,
      allowGroundInteraction: false,
      allowSkyInteraction: false,
      allowStarInteraction: true,

      sceneTag: 'lifemap',
    }
  }

  if (mode === 'focus') {
    return {
      showHomeLayer: false,
      showLifeMapLayer: false,
      showFocusLayer: true,
      showReplayLayer: false,

      showOrb: false,
      showGround: false,
      showSky: false,
      showStarfield: true,
      showFocusStar: true,
      showReplayChamber: false,

      allowOrbInteraction: false,
      allowGroundInteraction: false,
      allowSkyInteraction: false,
      allowStarInteraction: true,

      sceneTag: 'focus',
    }
  }

  return {
    showHomeLayer: false,
    showLifeMapLayer: false,
    showFocusLayer: false,
    showReplayLayer: true,

    showOrb: false,
    showGround: false,
    showSky: false,
    showStarfield: false,
    showFocusStar: false,
    showReplayChamber: true,

    allowOrbInteraction: false,
    allowGroundInteraction: false,
    allowSkyInteraction: false,
    allowStarInteraction: false,

    sceneTag: 'replay',
  }
}
