'use client'

import { useLayoutEffect } from 'react'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { HomeOrbReliquaryV286 } from './HomeOrbReliquaryV286'
import { HomeOrbSurfacePolishV290 } from './HomeOrbSurfacePolishV290'
import { ORB, height } from '../layout/HomeWorldProductionV223Geometry'

const V287_COMPANION_X = 1.02
const V287_COMPANION_Z = .72
const RETIRED_RELIQUARY_NAME = 'home-v286-biomorphic-memory-reliquary'
const GROUNDED_RELIQUARY_NAME = 'home-v288-grounded-biomorphic-memory-reliquary'
const FALLBACK_INTERACTION_OWNER = 'home-gold-companion'
const V290_VISIBLE_SHELL_OWNER = 'home-v290-biomorphic-shell-authority'

/**
 * V288 integration adapter carrying the V290 Orb visual authority.
 *
 * V286 remains the distributed internal memory-world owner and Ground-trace
 * owner. V290 replaces only the coarse shell pixels with a smooth, materially
 * richer fractured-mineral surface. The invisible V287 companion remains the
 * sole pointer/touch owner. This keeps art, memory-state behavior, and semantic
 * interaction independently governed.
 */
export function HomeOrbGroundedV288() {
  const { scene, size } = useThree()
  const portrait = size.height > size.width

  useLayoutEffect(() => {
    const legacyY = height(ORB.x, ORB.z)
    const companionY = height(V287_COMPANION_X, V287_COMPANION_Z)
    const materialState = new Map<THREE.Material, {
      colorWrite: boolean
      depthWrite: boolean
      transparent: boolean
      opacity: number
    }>()
    const lightState = new Map<THREE.Light, boolean>()
    const rootState = new Map<THREE.Object3D, { name: string; position: THREE.Vector3; scale: THREE.Vector3 }>()

    const rememberObject = (object: THREE.Object3D) => {
      if (!rootState.has(object)) rootState.set(object, {
        name: object.name,
        position: object.position.clone(),
        scale: object.scale.clone(),
      })
    }

    const hideMaterial = (material: THREE.Material) => {
      if (!materialState.has(material)) materialState.set(material, {
        colorWrite: material.colorWrite,
        depthWrite: material.depthWrite,
        transparent: material.transparent,
        opacity: material.opacity,
      })
      material.colorWrite = false
      material.depthWrite = false
      material.transparent = true
      material.opacity = 0
    }

    const reconcile = () => {
      const reliquary = scene.getObjectByName(GROUNDED_RELIQUARY_NAME)
        ?? scene.getObjectByName(RETIRED_RELIQUARY_NAME)
      if (reliquary) {
        rememberObject(reliquary)
        reliquary.name = GROUNDED_RELIQUARY_NAME
        reliquary.position.set(
          V287_COMPANION_X - ORB.x,
          companionY - legacyY,
          V287_COMPANION_Z - ORB.z,
        )
        reliquary.userData = {
          ...reliquary.userData,
          artRevision: 'v290-grounded-biomorphic-memory-reliquary-shell-polish',
          integrationAuthority: 'v287-cinematic-home-plus-v288-grounding-plus-v290-shell-polish',
          visibleShellAuthority: V290_VISIBLE_SHELL_OWNER,
          visualOnly: true,
          interactionOwner: false,
        }

        // Keep V286's internal memory world aligned with the slightly tighter
        // V290 hero silhouette while its original coarse shell is suppressed.
        reliquary.traverse((object) => {
          if (object.name.startsWith('home-v286-reliquary-state-')) {
            rememberObject(object)
            object.position.y = legacyY + (portrait ? 1.15 : 1.12)
            if (portrait) object.scale.set(1.38, 1.44, 1.30)
            else object.scale.set(1.18, 1.24, 1.10)
          }
          if (object instanceof THREE.Mesh && object.name.startsWith('home-v286-weathered-shell-plate-')) {
            const materials = Array.isArray(object.material) ? object.material : [object.material]
            materials.forEach(hideMaterial)
            object.castShadow = false
            object.receiveShadow = false
          }
        })
      }

      const fallback = scene.getObjectByName(FALLBACK_INTERACTION_OWNER)
      if (!fallback) return
      fallback.userData = {
        ...fallback.userData,
        semanticOwner: 'orb',
        groundedCompanion: true,
        interactionOwner: true,
        fallbackVisualOwner: false,
        visualAuthority: V290_VISIBLE_SHELL_OWNER,
      }
      fallback.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          const materials = Array.isArray(object.material) ? object.material : [object.material]
          materials.forEach(hideMaterial)
        } else if (object instanceof THREE.Light) {
          if (!lightState.has(object)) lightState.set(object, object.visible)
          object.visible = false
        }
      })
    }

    reconcile()
    const timers = [40, 120, 280, 520].map((delay) => window.setTimeout(reconcile, delay))

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer))
      materialState.forEach((state, material) => {
        material.colorWrite = state.colorWrite
        material.depthWrite = state.depthWrite
        material.transparent = state.transparent
        material.opacity = state.opacity
      })
      lightState.forEach((visible, light) => { light.visible = visible })
      rootState.forEach((state, object) => {
        object.name = state.name
        object.position.copy(state.position)
        object.scale.copy(state.scale)
      })
    }
  }, [portrait, scene])

  return <>
    <HomeOrbReliquaryV286 />
    <HomeOrbSurfacePolishV290 />
  </>
}
