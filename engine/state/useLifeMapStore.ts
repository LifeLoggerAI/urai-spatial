'use client'

import { create } from 'zustand'
import * as THREE from 'three'

type LifeMapState = {
  selectedId: string | null
  selectedPosition: THREE.Vector3 | null

  setSelection: (id: string, position: THREE.Vector3) => void
  clearSelection: () => void
  resetLifeMap: () => void
}

export const useLifeMapStore = create<LifeMapState>((set) => ({
  selectedId: null,
  selectedPosition: null,

  setSelection: (id, position) =>
    set({
      selectedId: id,
      selectedPosition: position.clone(),
    }),

  clearSelection: () =>
    set({
      selectedId: null,
      selectedPosition: null,
    }),

  resetLifeMap: () =>
    set({
      selectedId: null,
      selectedPosition: null,
    }),
}))