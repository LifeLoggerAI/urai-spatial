
import type { LifeMapStar } from '@/lib/uraiCanon/lifemapStar'
import type { CanonMode } from '@/spatial/contracts/sceneAuthority'

export type FocusPriority = 'none' | 'hovered' | 'selected'

export type FocusModeState = {
  mode: CanonMode
  selectedStarId: string | null
  hoveredStarId: string | null
  subjectStarId: string | null
  subjectLabel: string | null
  priority: FocusPriority
  dimNonSelectedStars: boolean
  suppressHoverNoise: boolean
  canEnterReplay: boolean
  focusLocked: boolean
  visibleStarIds: string[]
  mutedStarIds: string[]
}

export function getFocusModeState(args: {
  mode: CanonMode
  stars: LifeMapStar[]
  selectedStar: LifeMapStar | null
  hoveredStar: LifeMapStar | null
}): FocusModeState {
  if (args.mode !== 'FOCUS') {
    return {
      mode: args.mode,
      selectedStarId: args.selectedStar?.id ?? null,
      hoveredStarId: args.hoveredStar?.id ?? null,
      subjectStarId: null,
      subjectLabel: null,
      priority: 'none',
      dimNonSelectedStars: false,
      suppressHoverNoise: false,
      canEnterReplay: false,
      focusLocked: false,
      visibleStarIds: args.stars.map((s) => s.id),
      mutedStarIds: [],
    }
  }

  const subject = args.selectedStar
  const visibleStarIds = args.stars.map((s) => s.id)
  const mutedStarIds = args.stars
    .filter((s) => s.id !== subject?.id)
    .map((s) => s.id)

  return {
    mode: args.mode,
    selectedStarId: args.selectedStar?.id ?? null,
    hoveredStarId: args.hoveredStar?.id ?? null,
    subjectStarId: subject?.id ?? null,
    subjectLabel: subject?.label ?? null,
    priority: subject ? 'selected' : args.hoveredStar ? 'hovered' : 'none',
    dimNonSelectedStars: !!subject,
    suppressHoverNoise: !!subject,
    canEnterReplay: !!subject,
    focusLocked: !!subject,
    visibleStarIds,
    mutedStarIds,
  }
}
