import { create } from "zustand"

type Vec3 = {
  x: number
  y: number
  z: number
}

type SceneState = {

  cameraTarget: Vec3 | null
  isCameraMoving: boolean

  setCameraTarget: (pos: Vec3 | null) => void
  setCameraMoving: (moving: boolean) => void

  clearCameraTarget: () => void
  resetSceneState: () => void
}

export const useSceneStore = create<SceneState>((set) => ({

  cameraTarget: null,
  isCameraMoving: false,

  setCameraTarget: (pos) =>
    set({
      cameraTarget: pos ? { ...pos } : null
    }),

  setCameraMoving: (moving) =>
    set({
      isCameraMoving: moving
    }),

  clearCameraTarget: () =>
    set({
      cameraTarget: null
    }),

  resetSceneState: () =>
    set({
      cameraTarget: null,
      isCameraMoving: false
    })

}))