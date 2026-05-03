import type { CanonMode } from '@/spatial/contracts/sceneAuthority'

export type TransitionLayerState = {
  fromMode: CanonMode | null
  toMode: CanonMode
  progress: number
  isTransitioning: boolean

  interactionSuppressed: boolean
  showOverlayVeil: boolean
  veilOpacity: number
}

export function getTransitionLayerState(args: {
  fromMode: CanonMode | null
  toMode: CanonMode
  progress: number
  isTransitioning: boolean
}): TransitionLayerState {
  const p = Math.max(0, Math.min(1, args.progress))

  if (!args.isTransitioning) {
    return {
      fromMode: args.fromMode,
      toMode: args.toMode,
      progress: 1,
      isTransitioning: false,
      interactionSuppressed: false,
      showOverlayVeil: false,
      veilOpacity: 0,
    }
  }

  return {
    fromMode: args.fromMode,
    toMode: args.toMode,
    progress: p,
    isTransitioning: true,
    interactionSuppressed: false,
    showOverlayVeil: true,
    veilOpacity: p < 0.5 ? p : 1 - p,
  }
}
