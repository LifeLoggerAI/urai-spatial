import * as THREE from 'three'

export const WALK_SPEED = 3.25
export const TURN_SPEED = 1.75
export const SPAWN_Z = 8.4
const LIMIT = 14.5
const RADIUS = 0.38
const DAIS_Z = -1.4

export function controllerRay(controller: THREE.Group, raycaster: THREE.Raycaster) {
  const rotation = new THREE.Matrix4().extractRotation(controller.matrixWorld)
  raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld)
  raycaster.ray.direction.set(0, 0, -1).applyMatrix4(rotation).normalize()
}

export function safeMove(position: THREE.Vector3, nextX: number, nextZ: number) {
  const x = THREE.MathUtils.clamp(nextX, -LIMIT + RADIUS, LIMIT - RADIUS)
  const z = THREE.MathUtils.clamp(nextZ, -LIMIT + RADIUS, LIMIT - RADIUS)
  const relativeZ = z - DAIS_Z
  const daisRadius = 2.9
  if (x * x + relativeZ * relativeZ < daisRadius * daisRadius) {
    const angle = Math.atan2(relativeZ, x)
    position.set(Math.cos(angle) * daisRadius, position.y, Math.sin(angle) * daisRadius + DAIS_Z)
    return
  }
  position.set(x, position.y, z)
}

export function controllerLine() {
  const geometry = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(0, 0, -10)])
  return new THREE.Line(geometry, new THREE.LineBasicMaterial({ color: 0xc8fbff, transparent: true, opacity: 0.78 }))
}
