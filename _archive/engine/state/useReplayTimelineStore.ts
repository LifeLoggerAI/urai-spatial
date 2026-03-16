'use client'

import { create } from 'zustand'

interface ReplayTimelineState {
  progress: number
  playing: boolean
  speed: number

  tick: (delta: number) => void

  setPlaying: (value: boolean) => void
  setSpeed: (value: number) => void

  reset: () => void
  pause: () => void
  play: () => void
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

  setSpeed: (value: number) => set({ speed: value }),

  pause: () => set({ playing: false }),

  play: () => set({ playing: true }),

  reset: () =>
    set({
      progress: 0,
      playing: false,
    }),
}))