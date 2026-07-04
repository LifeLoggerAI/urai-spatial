import * as THREE from 'three'

export function isolateAnimatedMaterials(rings: THREE.Mesh[]) {
  rings.forEach((ring) => {
    const material = ring.material as THREE.Material
    ring.material = material.clone()
  })
}

export function shareStaticMaterial(rings: THREE.Mesh[]) {
  const first = rings[0]?.material
  if (!first) return
  rings.forEach((ring) => {
    if (ring.material !== first) {
      const material = ring.material as THREE.Material
      material.dispose()
      ring.material = first
    }
  })
}

export function normalizeTransmission(scene: THREE.Scene, mobile: boolean) {
  scene.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return
    const material = object.material
    if (!(material instanceof THREE.MeshPhysicalMaterial)) return
    if (material.transmission <= 0) return
    material.transparent = mobile
    material.opacity = mobile ? 0.9 : 1
    material.needsUpdate = true
  })
}
