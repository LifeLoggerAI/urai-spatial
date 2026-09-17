'use client'

import { useLayoutEffect } from 'react'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { HomeOrbReliquaryV286 } from './HomeOrbReliquaryV286'
import { ORB, height } from '../layout/HomeWorldProductionV223Geometry'

const V287_COMPANION_X = 1.02
const V287_COMPANION_Z = .72
const RETIRED_RELIQUARY_NAME = 'home-v286-biomorphic-memory-reliquary'
const GROUNDED_RELIQUARY_NAME = 'home-v288-grounded-biomorphic-memory-reliquary'
const FALLBACK_INTERACTION_OWNER = 'home-gold-companion'

/**
 * V288 integration adapter.
 *
 * V287 legitimately moved Home to a cinematic third-person composition with a
 * grounded companion interaction owner. That rewrite accidentally retired the
 * accepted V286 reliquary pixels and exposed a three-sphere fallback instead.
 * This adapter preserves V287 camera / Ground / broad-sky ownership while
 * moving the existing V286 visual authority to the new companion anchor.
 *
 * The fallback group remains the sole pointer/touch owner. Its meshes keep
 * their raycasts but stop writing pixels or depth; its point lights are hidden.
 * The V286 reliquary remains visual-only/raycast-disabled.
 */
export function HomeOrbGroundedV288() {
  const { scene } = useThree()

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
    const rootState = new Map<THREE.Object3D, { name: string; position: THREE.Vector3 }>()

    const reconcile = () => {
      const reliquary = scene.getObjectByName(GROUNDED_RELIQUARY_NAME)
        ?? scene.getObjectByName(RETIRED_RELIQUARY_NAME)
      if (reliquary) {
        if (!rootState.has(reliquary)) rootState.set(reliquary, { name: reliquary.name, position: reliquary.position.clone() })
        reliquary.name = GROUNDED_RELIQUARY_NAME
        reliquary.position.set(
          V287_COMPANION_X - ORB.x,
          companionY - legacyY,
          V287_COMPANION_Z - ORB.z,
        )
        reliquary.userData = {
          ...reliquary.userData,
          artRevision: 'v288-grounded-biomorphic-memory-reliquary',
          integrationAuthority: 'v287-cinematic-home-plus-v286-reliquary',
          visualOnly: true,
          interactionOwner: false,
        }
      }

      const fallback = scene.getObjectByName(FALLBACK_INTERACTION_OWNER)
      if (!fallback) return
      fallback.userData = {
        ...fallback.userData,
        semanticOwner: 'orb',
        groundedCompanion: true,
        interactionOwner: true,
        fallbackVisualOwner: false,
        visualAuthority: GROUNDED_RELIQUARY_NAME,
      }
      fallback.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          const materials = Array.isArray(object.material) ? object.material : [object.material]
          for (const material of materials) {
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
      })
    }
  }, [scene])

  return <HomeOrbReliquaryV286 />
}
