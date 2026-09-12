'use client'

import { useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'

function hasAncestor(object: THREE.Object3D, name: string) {
  for (let current = object.parent; current; current = current.parent) {
    if (current.name === name) return true
  }
  return false
}

function isTransparentInteractionSurface(object: THREE.Object3D) {
  if (!(object instanceof THREE.Mesh)) return false
  const materials = Array.isArray(object.material) ? object.material : [object.material]
  return materials.some((material) => material instanceof THREE.MeshBasicMaterial && material.transparent && material.opacity === 0)
}

function hasColorTexture(object: THREE.Object3D) {
  if (!(object instanceof THREE.Mesh)) return false
  const materials = Array.isArray(object.material) ? object.material : [object.material]
  return materials.some((material) => material instanceof THREE.MeshStandardMaterial && Boolean(material.map))
}

/**
 * Final Home visual ownership guard.
 *
 * Interaction remains on the established V226 destination groups while their
 * superseded rendered shells are removed. Hidden predecessor meshes also lose
 * raycast authority so invisible geometry cannot steal pointer/touch hits.
 * V234 scan sheets are suppressed while their sculpted support geometry,
 * apertures and authored lighting remain.
 */
export function HomeVisualAuthority() {
  const { scene } = useThree()

  useEffect(() => {
    const changed = new Set<THREE.Object3D>()
    const previousRaycast = new Map<THREE.Object3D, THREE.Object3D['raycast']>()

    const disableRaycast = (object: THREE.Object3D) => {
      if (!(object instanceof THREE.Mesh) || isTransparentInteractionSurface(object) || previousRaycast.has(object)) return
      previousRaycast.set(object, object.raycast)
      object.raycast = () => {}
    }

    const setOff = (object: THREE.Object3D) => {
      if (!object.visible) return
      object.visible = false
      disableRaycast(object)
      changed.add(object)
    }

    const setSubtreeOff = (object: THREE.Object3D) => {
      setOff(object)
      object.traverse((child) => disableRaycast(child))
    }

    const apply = () => scene.traverse((object) => {
      if (object.name === 'home-v226-root-cradle') {
        setSubtreeOff(object)
        return
      }

      if (hasAncestor(object, 'home-v226-ground-inhabited-hearth')) {
        if (object.type !== 'Group' && object.name !== 'home-ground-deep-traversable-entrance') setOff(object)
        return
      }

      if (hasAncestor(object, 'home-v226-life-map-lineage-observatory')) {
        if (object.type !== 'Group' && object.name !== 'home-life-map-deep-celestial-aperture') setOff(object)
        return
      }

      if (hasAncestor(object, 'home-v226-rooted-single-living-memory-presence')) {
        if (object.type !== 'Group' && !isTransparentInteractionSurface(object)) setOff(object)
        return
      }

      if ((hasAncestor(object, 'home-v234-ground-scanned-stone-threshold') || hasAncestor(object, 'home-v234-life-map-rooted-observatory')) && hasColorTexture(object)) {
        setOff(object)
      }
    })

    apply()
    const timer = window.setInterval(apply, 120)
    const settle = window.setTimeout(() => window.clearInterval(timer), 3200)

    return () => {
      window.clearInterval(timer)
      window.clearTimeout(settle)
      previousRaycast.forEach((raycast, object) => { object.raycast = raycast })
      changed.forEach((object) => { object.visible = true })
    }
  }, [scene])

  return null
}
