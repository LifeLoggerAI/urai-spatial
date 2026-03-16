'use client'

import { create } from 'zustand'
import * as THREE from 'three'

interface FocusState {
  selectedId: string | null
  hoverId: string | null
  focusPosition: THREE.Vector3 | null

  selectAnchor: (id: string, position: THREE.Vector3) => void
  clearSelection: () => void
  setHover: (id: string | null) => void
  resetFocus: () => void
}

export const useFocusStore = create<FocusState>((set) => ({
  // currently selected anchor
  selectedId: null,
  // currently hovered anchor
  hoverId: null,
  // world position of focus / camera target
  focusPosition: null,

  selectAnchor: (id, position) =>
    set({
      selectedId: id,
      focusPosition: position.clone(), // clone to prevent shared refs
    }),

  clearSelection: () =>
    set({
      selectedId: null,
      focusPosition: null,
    }),

  setHover: (id) =>
    set({
      hoverId: id,
    }),

  resetFocus: () =>
    set({
      selectedId: null,
      hoverId: null,
      focusPosition: null,
    }),
}))