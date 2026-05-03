
import { useMemo } from 'react'
import type { LifeMapStar } from '@/lib/uraiCanon/lifemapStar'
import type { CanonMode } from '@/spatial/contracts/sceneAuthority'
import { getReplayLayerState } from '@/spatial/contracts/replayMode'

export function useReplayMode(args: {
  mode: CanonMode
  selectedStar: LifeMapStar | null
}) {
  return useMemo(
    () =>
      getReplayLayerState({
        mode: args.mode,
        selectedStar: args.selectedStar,
      }),
    [args.mode, args.selectedStar]
  )
}
