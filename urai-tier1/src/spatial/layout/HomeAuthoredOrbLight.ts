import * as THREE from 'three'

// Keep the governed GLB's named nodes and transforms as animation owners. Its
// decorative solid geometry is replaced only on this local clone: soft light
// descendants make every authored scale/rotation clip visibly meaningful.
export function createAuthoredOrbLightPresentation(source: THREE.Object3D, texture: THREE.Texture): THREE.Object3D {
  const clone = source.clone(true)
  const emptyGeometry = new THREE.BufferGeometry()
  const emptyMaterial = new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false })
  const owners: THREE.Object3D[] = []
  clone.traverse((object) => {
    if (object instanceof THREE.Mesh) {
      object.geometry = emptyGeometry
      object.material = emptyMaterial
      object.castShadow = object.receiveShadow = false
      object.raycast = () => {}
    }
    if (/^orb-(aura|core|heart|orbit-[abc])$/.test(object.name)) owners.push(object)
  })

  const addLight = (owner: THREE.Object3D, position: [number, number, number], size: [number, number], color: string, opacity: number) => {
    const light = new THREE.Sprite(new THREE.SpriteMaterial({
      map: texture, color, opacity, transparent: true, depthWrite: false,
      blending: THREE.AdditiveBlending, toneMapped: false,
    }))
    light.name = `${owner.name}-living-light-${owner.children.length}`
    light.position.set(...position)
    light.scale.set(size[0], size[1], 1)
    light.userData.authoredOrbLight = true
    light.userData.restOpacity = opacity
    light.raycast = () => {}
    owner.add(light)
  }
  for (const owner of owners) {
    if (owner.name === 'orb-aura') {
      addLight(owner, [-.18, .05, -.10], [1.05, 1.35], '#6cae9c', .27)
    } else if (owner.name === 'orb-core') {
      addLight(owner, [-.16, .12, .04], [.78, .98], '#a2d9c4', .48)
      addLight(owner, [.23, -.17, -.18], [.48, .68], '#649dce', .30)
    } else if (owner.name === 'orb-heart') {
      addLight(owner, [-.07, .01, .16], [.40, .49], '#ffe4af', .70)
      addLight(owner, [-.26, .22, -.04], [.23, .30], '#beece4', .40)
    } else {
      const layer = owner.name.charCodeAt(owner.name.length - 1) - 97
      for (let index = 0; index < 5; index++) {
        const angle = index * 2.39996323 + layer * .71
        const radius = .31 + index * .046
        addLight(owner, [Math.cos(angle) * radius - .10, Math.sin(angle * 1.7) * .35, Math.sin(angle) * radius],
          [.065 + index * .006, .082 + index * .008], layer === 1 ? '#b6b9e8' : '#b2e5d8', .52)
      }
    }
  }
  return clone
}

export function disposeAuthoredOrbLightPresentation(presentation: THREE.Object3D) {
  const geometries = new Set<THREE.BufferGeometry>()
  const materials = new Set<THREE.Material>()
  presentation.traverse((object) => {
    if (object instanceof THREE.Mesh) {
      geometries.add(object.geometry)
      for (const material of Array.isArray(object.material) ? object.material : [object.material]) materials.add(material)
    } else if (object instanceof THREE.Sprite) materials.add(object.material)
  })
  geometries.forEach((geometry) => geometry.dispose())
  materials.forEach((material) => material.dispose())
  // The caller owns the shared alpha texture; never dispose the cached GLB.
}
