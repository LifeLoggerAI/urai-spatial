import * as THREE from 'three'

// Authored, non-admitted grove geometry: physically curved tapered wood rather
// than identical straight capped cylinders. One shared primitive per tree part;
// no change to the canonical 24-tree placement or collision authority.
export function makeHomePerimeterBranchGeometry(kind: 'trunk' | 'bough'): THREE.CylinderGeometry {
  const trunk = kind === 'trunk'
  const geometry = new THREE.CylinderGeometry(
    trunk ? .082 : .045, trunk ? .19 : .125, 1,
    trunk ? 12 : 10, 8,
  )
  const position = geometry.getAttribute('position') as THREE.BufferAttribute
  for (let index = 0; index < position.count; index++) {
    const x = position.getX(index)
    const y = position.getY(index)
    const z = position.getZ(index)
    const t = THREE.MathUtils.clamp(y + .5, 0, 1)
    // Shared taper retains each authored world matrix, while the centerline
    // bends toward daylight and twists gently instead of forming a rigid pole.
    const sway = (trunk ? .19 : .18) * t * t
    const bow = (trunk ? -.075 : .08) * Math.sin(Math.PI * t)
    const twist = (trunk ? .027 : .042) * Math.sin(t * Math.PI * 1.6)
    position.setXYZ(index, x + sway + twist, y, z + bow)
  }
  position.needsUpdate = true
  geometry.computeVertexNormals()
  geometry.computeBoundingBox()
  geometry.computeBoundingSphere()
  return geometry
}
