'use client'

import { useMemo } from 'react'
import type { UraiCommand, UraiRuntimeState } from '@/lib/uraiCanon/types'

export function useCanonInteractionLock(args: {
  state: UraiRuntimeState | null | undefined
  dispatch?: (command: UraiCommand | { type: string; [k: string]: unknown }) => void
}) {
  return useMemo(() => {
    const locked = Boolean(
      args.state?.inputLocked ||
      args.state?.isTransitioning ||
      args.state?.transitioning ||
      args.state?.transitionLock ||
      (args.state?.transitionState && args.state.transitionState !== 'idle')
    )

    return {
      locked,
      canInteract: !locked,
      dispatch: args.dispatch,
    }
  }, [
    args.dispatch,
    args.state?.inputLocked,
    args.state?.isTransitioning,
    args.state?.transitioning,
    args.state?.transitionLock,
    args.state?.transitionState,
  ])
}

export default useCanonInteractionLock
