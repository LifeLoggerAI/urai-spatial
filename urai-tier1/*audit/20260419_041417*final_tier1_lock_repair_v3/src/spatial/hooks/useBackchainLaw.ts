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
        mode === 'REPLAY'
          ? ['REPLAY', 'FOCUS', 'LIFEMAP', 'HOME']
          : mode === 'FOCUS'
          ? ['FOCUS', 'LIFEMAP', 'HOME']
          : mode === 'LIFEMAP'
          ? ['LIFEMAP', 'HOME']
          : ['HOME'],
    }
  }, [mode])
}
