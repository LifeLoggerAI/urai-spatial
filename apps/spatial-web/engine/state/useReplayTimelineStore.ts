'use client'

import { create } from 'zustand'

interface ReplayTimelineState {
  progress: number
  playing: boolean
  speed: number
  tick: (delta: number) => void
  setPlaying: (value: boolean) => void
  reset: () => void
}

export const useReplayTimelineStore = create<ReplayTimelineState>((set, get) => ({
  progress: 0,
  playing: true,
  speed: 0.08,

  tick: (delta: number) => {
    const { playing, progress, speed } = get()
    if (!playing) return

    let next = progress + delta * speed
    if (next > 1) next = 0

    set({ progress: next })
  },

  setPlaying: (value: boolean) => set({ playing: value }),

  reset: () => set({ progress: 0 })
}))
