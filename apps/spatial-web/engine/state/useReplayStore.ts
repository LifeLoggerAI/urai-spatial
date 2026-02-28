import { create } from 'zustand'
import * as THREE from 'three'

interface ReplayState {
  selectedIndex: number | null
  focusPosition: THREE.Vector3 | null
  setSelection: (index: number | null, pos: THREE.Vector3 | null) => void
}

export const useReplayStore = create<ReplayState>((set) => ({
  selectedIndex: null,
  focusPosition: null,
  setSelection: (index, pos) =>
    set({ selectedIndex: index, focusPosition: pos }),
}))
