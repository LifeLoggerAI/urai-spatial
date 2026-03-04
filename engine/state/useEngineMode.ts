'use client'

import { create } from 'zustand'

type Mode = 'home' | 'lifemap' | 'replay'

interface EngineState {
  mode: Mode
  setMode: (mode: Mode) => void
}

export const useEngineMode = create<EngineState>((set) => ({
  mode: 'home',
  setMode: (mode) => set({ mode })
}))
