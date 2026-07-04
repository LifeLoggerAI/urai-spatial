import * as THREE from 'three'

export function isolateAnimatedMaterials(rings: THREE.Mesh[]) {
  rings.forEach((ring) => {
    const material = ring.material as THREE.Material
    ring.material = material.clone()
  })
}
