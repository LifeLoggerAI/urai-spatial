'use client'

import { create } from 'zustand'

export type EngineMode =
  | 'home'
  | 'lifemap'
  | 'replay'

interface EngineState {

  mode: EngineMode

  setMode: (mode: EngineMode) => void

  setHome: () => void
  setLifeMap: () => void
  setReplay: () => void

  resetMode: () => void
}

export const useEngineMode = create<EngineState>((set) => ({

  mode: 'home',

  setMode: (mode) =>
    set({ mode }),

  setHome: () =>
    set({ mode: 'home' }),

  setLifeMap: () =>
    set({ mode: 'lifemap' }),

  setReplay: () =>
    set({ mode: 'replay' }),

  resetMode: () =>
    set({ mode: 'home' })

}))