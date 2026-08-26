import * as THREE from 'three'

const values = new WeakMap<THREE.Object3D, Record<string, unknown>>()
const prototype = THREE.Object3D.prototype as THREE.Object3D & { data?: Record<string, unknown> }

if (!Object.getOwnPropertyDescriptor(prototype, 'data')) {
  Object.defineProperty(prototype, 'data', {
    configurable: true,
    get(this: THREE.Object3D) {
      let value = values.get(this)
      if (!value) {
        value = {}
        values.set(this, value)
      }
      return value
    },
    set(this: THREE.Object3D, value: Record<string, unknown> | undefined) {
      values.set(this, value && typeof value === 'object' ? value : {})
    },
  })
}

// Render-proof telemetry is owned by the mounted R3F scene. This module exists only
// to supply the Object3D data compatibility property required by the Life Map scene;
// it deliberately does not observe or rewrite scene-owned object/anchor/call values.
