import { useMemo } from 'react'
import type { CanonMode } from '@/spatial/contracts/sceneAuthority'
import { getModeVisibility } from '@/spatial/contracts/modeIsolation'

export function useModeIsolation(mode: CanonMode) {
  return useMemo(() => getModeVisibility(mode), [mode])
}
