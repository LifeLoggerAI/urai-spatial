'use client'

import { useEffect } from 'react'
import type { UraiCommand } from '@/lib/uraiCanon/types'

type EscHandler = () => void
type EscDispatch = (command: UraiCommand) => void
type EscRuntime = { inputLocked?: boolean }
type EscController = {
  inputLocked?: boolean
  dispatch?: EscDispatch
  esc?: () => void
}

export function useCanonEsc(handler: EscHandler): void
export function useCanonEsc(runtime: EscRuntime, dispatch: EscDispatch): void
export function useCanonEsc(controller: EscController): void
export function useCanonEsc(
  arg1: EscHandler | EscRuntime | EscController,
  arg2?: EscDispatch
) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return

      if (typeof arg1 === 'function') {
        arg1()
        return
      }

      const locked = Boolean(arg1.inputLocked)
      if (locked) return

      if ('esc' in arg1 && typeof arg1.esc === 'function') {
        arg1.esc()
        return
      }

      if ('dispatch' in arg1 && typeof arg1.dispatch === 'function') {
        arg1.dispatch({ type: 'ESCAPE' })
        return
      }

      if (arg2) {
        arg2({ type: 'ESCAPE' })
      }
    }

    window.addEventListener('keydown', onKey, { capture: true })
    return () => window.removeEventListener('keydown', onKey, { capture: true })
  }, [arg1, arg2])
}

export default useCanonEsc
