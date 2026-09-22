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
const FALLBACK_INTERACTION_OWNER_NAMES = [FALLBACK_INTERACTION_OWNER, 'home-living-memory-orb'] as const

function findInteractionOwner(scene: THREE.Scene): THREE.Object3D | null {
  for (const name of FALLBACK_INTERACTION_OWNER_NAMES) {
    const object = scene.getObjectByName(name)
    if (!object) continue
    if (object.userData?.interactionOwner === false) continue
    if (object.userData?.semanticOwner !== 'orb') continue
    return object
  }
  return null
}

/**
 * V288 integration adapter.
 *
 * Home's current active runtime owns Orb semantics, speech/VAD timing and pointer
 * interaction. Those mechanics are retained, but their fallback sphere/rings/
 * fragments are interaction-only and must never become canonical pixels.
 * V286 remains the accepted grounded biomorphic reliquary visual authority.
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
    const rootState = new Map<THREE.Object3D, { name: string; position: THREE.Vector3; visible: boolean }>()

    const reconcile = () => {
      const reliquary = scene.getObjectByName(GROUNDED_RELIQUARY_NAME)
        ?? scene.getObjectByName(RETIRED_RELIQUARY_NAME)
      if (reliquary) {
        if (!rootState.has(reliquary)) rootState.set(reliquary, {
          name: reliquary.name,
          position: reliquary.position.clone(),
          visible: reliquary.visible,
        })
        reliquary.name = GROUNDED_RELIQUARY_NAME
        reliquary.visible = true
        reliquary.position.set(
          V287_COMPANION_X - ORB.x,
          companionY - legacyY,
          V287_COMPANION_Z - ORB.z,
        )
        reliquary.userData = {
          ...reliquary.userData,
          artRevision: 'v288-grounded-biomorphic-memory-reliquary',
          integrationAuthority: 'current-home-interaction-plus-v286-reliquary',
          visualOnly: true,
          interactionOwner: false,
        }
      }

      const fallback = findInteractionOwner(scene)
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
    const timers = [40, 120, 280, 520, 720].map((delay) => window.setTimeout(reconcile, delay))

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
        object.visible = state.visible
      })
    }
  }, [scene])

  return <group
    name="home-orb-v288-visible-authority"
    userData={{ semanticOwner: 'orb-visual', interactionOwner: false, visualAuthority: GROUNDED_RELIQUARY_NAME }}
  >
    <HomeOrbReliquaryV286 />
  </group>
}