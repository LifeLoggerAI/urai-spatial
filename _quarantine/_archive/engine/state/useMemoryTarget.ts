"use client"

import { create } from "zustand"
import * as THREE from "three"

interface MemoryTargetState {
  selected: string | null
  target: THREE.Vector3 | null
  cameraLocked: boolean

  select: (id: string, pos: THREE.Vector3) => void
  lockCamera: () => void
  clear: () => void
}

export const useMemoryTarget = create<MemoryTargetState>((set) => ({
  // currently selected memory ID
  selected: null,
  // world position for camera focus
  target: null,
  // whether camera is locked onto target
  cameraLocked: false,

  // select a memory, update target, unlock camera
  select: (id, pos) =>
    set({
      selected: id,
      target: pos.clone(), // clone to avoid shared references
      cameraLocked: false,
    }),

  // lock camera on current target
  lockCamera: () =>
    set({
      cameraLocked: true,
    }),

  // clear selection and unlock camera
  clear: () =>
    set({
      selected: null,
      target: null,
      cameraLocked: false,
    }),
}))