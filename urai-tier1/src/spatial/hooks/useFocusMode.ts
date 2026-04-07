
import { useMemo } from 'react'
import type { LifeMapStar } from '@/lib/uraiCanon/lifemapStar'
import type { CanonMode } from '@/spatial/contracts/sceneAuthority'
import { getFocusModeState } from '@/spatial/contracts/focusMode'

export function useFocusMode(args: {
  mode: CanonMode
  stars: LifeMapStar[]
  selectedStar: LifeMapStar | null
  hoveredStar: LifeMapStar | null
}) {
  return useMemo(
    () =>
      getFocusModeState({
        mode: args.mode,
        stars: args.stars,
        selectedStar: args.selectedStar,
        hoveredStar: args.hoveredStar,
      }),
    [args.mode, args.stars, args.selectedStar, args.hoveredStar]
  )
}
