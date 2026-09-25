'use client'

import { useLayoutEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { HomeOrbReliquaryV286 } from './HomeOrbReliquaryV286'
import { ORB, height } from '../layout/HomeWorldProductionV223Geometry'
import { HOME_ORB_GROUND_ANCHOR } from '../home/homeOrbPlacement'

const RETIRED_RELIQUARY_NAME = 'home-v286-biomorphic-memory-reliquary'
const GROUNDED_RELIQUARY_NAME = 'home-v288-grounded-biomorphic-memory-reliquary'
const FALLBACK_INTERACTION_OWNER = 'home-gold-companion'
const FALLBACK_INTERACTION_OWNER_NAMES = [FALLBACK_INTERACTION_OWNER, 'home-living-memory-orb'] as const

function findInteractionOwner(scene: THREE.Object3D): THREE.Object3D | null {
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
  const visualRoot = useRef<THREE.Group>(null)
  const reconcileFrame = useRef<(() => void) | null>(null)
  useFrame(() => reconcileFrame.current?.())

  useLayoutEffect(() => {
    const legacyY = height(ORB.x, ORB.z)
    const companionY = height(HOME_ORB_GROUND_ANCHOR.x, HOME_ORB_GROUND_ANCHOR.z)
    const materialState = new Map<THREE.Material, {
      colorWrite: boolean
      depthWrite: boolean
      transparent: boolean
      opacity: number
    }>()
    const lightState = new Map<THREE.Light, boolean>()
    const rootState = new Map<THREE.Object3D, { name: string; position: THREE.Vector3; visible: boolean }>()
    let fallback = findInteractionOwner(scene)

    const attachedToScene = (object: THREE.Object3D) => {
      for (let parent: THREE.Object3D | null = object; parent; parent = parent.parent) {
        if (parent === scene) return true
      }
      return false
    }

    const reconcile = () => {
      // Only this adapter's visible subtree may be relocated.
      const reliquary = visualRoot.current?.getObjectByName(GROUNDED_RELIQUARY_NAME)
        ?? visualRoot.current?.getObjectByName(RETIRED_RELIQUARY_NAME)
      if (reliquary) {
        if (!rootState.has(reliquary)) rootState.set(reliquary, {
          name: reliquary.name,
          position: reliquary.position.clone(),
          visible: reliquary.visible,
        })
        if (reliquary.name !== GROUNDED_RELIQUARY_NAME || !reliquary.visible
          || reliquary.position.x !== HOME_ORB_GROUND_ANCHOR.x - ORB.x
          || reliquary.position.y !== companionY - legacyY
          || reliquary.position.z !== HOME_ORB_GROUND_ANCHOR.z - ORB.z) {
          reliquary.name = GROUNDED_RELIQUARY_NAME
          reliquary.visible = true
          reliquary.position.set(
            HOME_ORB_GROUND_ANCHOR.x - ORB.x,
            companionY - legacyY,
            HOME_ORB_GROUND_ANCHOR.z - ORB.z,
          )
          reliquary.userData = {
            ...reliquary.userData,
            artRevision: 'v288-grounded-biomorphic-memory-reliquary',
            integrationAuthority: 'current-home-interaction-plus-v286-reliquary',
            visualOnly: true,
            interactionOwner: false,
          }
        }
      }

      if (fallback && !attachedToScene(fallback)) fallback = null
      if (!fallback) return
      if (fallback.userData.fallbackVisualOwner !== false || fallback.userData.visualAuthority !== GROUNDED_RELIQUARY_NAME) fallback.userData = {
        ...fallback.userData,
        semanticOwner: 'orb',
        groundedCompanion: true,
        interactionOwner: true,
        fallbackVisualOwner: false,
        visualAuthority: GROUNDED_RELIQUARY_NAME,
      }
      fallback.traverse((object) => {
        if (object instanceof THREE.Mesh || object instanceof THREE.Points || object instanceof THREE.Line) {
          const materials = Array.isArray(object.material) ? object.material : [object.material]
          for (const material of materials) {
            if (!materialState.has(material)) materialState.set(material, {
              colorWrite: material.colorWrite,
              depthWrite: material.depthWrite,
              transparent: material.transparent,
              opacity: material.opacity,
            })
            if (!material.colorWrite && !material.depthWrite && material.transparent && material.opacity === 0) continue
            material.colorWrite = false
            material.depthWrite = false
            material.transparent = true
            material.opacity = 0
          }
        } else if (object instanceof THREE.Light) {
          if (!lightState.has(object)) lightState.set(object, object.visible)
          if (object.visible) object.visible = false
        }
      })
    }

    // OrbCompanion is a direct Scene child. Discover later mounts from that
    // insertion event, then inspect only its small subtree on rendering frames.
    const childAdded = ({ child }: { child: THREE.Object3D }) => {
      if (!fallback || !attachedToScene(fallback)) fallback = findInteractionOwner(child)
      reconcile()
    }
    scene.addEventListener('childadded', childAdded)
    reconcileFrame.current = reconcile
    reconcile()

    return () => {
      reconcileFrame.current = null
      scene.removeEventListener('childadded', childAdded)
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
    ref={visualRoot}
    name="home-orb-v288-visible-authority"
    userData={{ semanticOwner: 'orb-visual', interactionOwner: false, visualAuthority: GROUNDED_RELIQUARY_NAME }}
  >
    <HomeOrbReliquaryV286 />
  </group>
}
