"use client"

import { create } from "zustand"
import * as THREE from "three"

type MemoryTargetState = {

  selected: string | null
  target: THREE.Vector3 | null
  cameraLocked: boolean

  select: (id: string, pos: THREE.Vector3) => void
  lockCamera: () => void
  clear: () => void
}

export const useMemoryTarget = create<MemoryTargetState>((set) => ({

  selected: null,
  target: null,
  cameraLocked: false,

  select: (id, pos) =>
    set({
      selected: id,
      target: pos.clone(),
      cameraLocked: false
    }),

  lockCamera: () =>
    set({
      cameraLocked: true
    }),

  clear: () =>
    set({
      selected: null,
      target: null,
      cameraLocked: false
    })

}))