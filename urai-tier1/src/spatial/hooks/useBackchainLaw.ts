import { useMemo } from 'react'
import type { CanonMode } from '@/spatial/contracts/sceneAuthority'
import { getEscTargetMode, isCanonicalEscStep } from '@/spatial/contracts/backchainLaw'

export function useBackchainLaw(mode: CanonMode) {
  return useMemo(() => {
    const escTargetMode = getEscTargetMode(mode)
    return {
      currentMode: mode,
      escTargetMode,
      isCanonical: isCanonicalEscStep(mode, escTargetMode),
      chain:
        mode === 'replay'
          ? ['replay', 'focus', 'lifemap', 'home']
          : mode === 'focus'
          ? ['focus', 'lifemap', 'home']
          : mode === 'lifemap'
          ? ['lifemap', 'home']
          : ['home'],
    }
  }, [mode])
}
