"use client"

import { create } from 'zustand'

export type OtherUser = {
  id: string,
  position: [number, number, number],
  rotation: [number, number, number],
}

type PresenceState = {
  others: OtherUser[],
  setOthers: (others: OtherUser[]) => void,
}

export const usePresenceStore = create<PresenceState>((set) => ({
  others: [],
  setOthers: (others) => set({ others }),
}))
