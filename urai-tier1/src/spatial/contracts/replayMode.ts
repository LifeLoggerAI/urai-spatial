
import type { LifeMapStar } from '@/lib/uraiCanon/lifemapStar'
import type { CanonMode } from '@/spatial/contracts/sceneAuthority'

export type ReplayLayerState = {
  mode: CanonMode
  active: boolean
  selectedStarId: string | null
  selectedStarLabel: string | null
  chamberVisible: boolean
  memoryAnchorVisible: boolean
  starfieldVisible: boolean
  focusLayerVisible: boolean
  homeLayerVisible: boolean
  canExitReplayToFocus: boolean
  replayLocked: boolean
  atmosphere: 'none' | 'descent' | 'chamber'
}

export function getReplayLayerState(args: {
  mode: CanonMode
  selectedStar: LifeMapStar | null
}): ReplayLayerState {
  if (args.mode !== 'replay') {
    return {
      mode: args.mode,
      active: false,
      selectedStarId: args.selectedStar?.id ?? null,
      selectedStarLabel: args.selectedStar?.label ?? null,
      chamberVisible: false,
      memoryAnchorVisible: false,
      starfieldVisible: false,
      focusLayerVisible: false,
      homeLayerVisible: false,
      canExitReplayToFocus: false,
      replayLocked: false,
      atmosphere: 'none',
    }
  }

  return {
    mode: args.mode,
    active: true,
    selectedStarId: args.selectedStar?.id ?? null,
    selectedStarLabel: args.selectedStar?.label ?? null,
    chamberVisible: true,
    memoryAnchorVisible: !!args.selectedStar,
    starfieldVisible: false,
    focusLayerVisible: false,
    homeLayerVisible: false,
    canExitReplayToFocus: true,
    replayLocked: !!args.selectedStar,
    atmosphere: 'chamber',
  }
}
