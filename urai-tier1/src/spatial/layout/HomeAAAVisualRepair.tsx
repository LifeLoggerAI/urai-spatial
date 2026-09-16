'use client'

import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import * as THREE from 'three'

const avatarWorld = new THREE.Vector3()
const avatarCenter = new THREE.Vector3()

/**
 * Current Home visual repair.
 *
 * Historical V281 overlays remain retired: this component does not restore a
 * Ground ravine, portal, celestial ribbon, or second interaction owner.
 *
 * Exact-head retained pixels proved the governed Avatar asset loaded and cast a
 * physical shadow while the visible body sat outside the readable composition.
 * The Avatar group itself is the authored Ground embodiment/return anchor, so we
 * do not move that group or the camera here. Instead, once the loaded model is
 * present, align the model root to the group's physical ground/center anchor from
 * its real world bounds. This preserves the Avatar-eye transition coordinate and
 * fixes model-origin drift without creating a duplicate body or visual proxy.
 */
export function HomeAAAVisualRepair() {
  const aligned = useRef(false)

  useFrame(({ scene }) => {
    if (aligned.current) return
    const avatar = scene.getObjectByName('home-visible-user-avatar')
    const modelRoot = avatar?.children[0]
    if (!avatar || !modelRoot) return

    avatar.updateWorldMatrix(true, true)
    const bounds = new THREE.Box3().setFromObject(modelRoot)
    if (bounds.isEmpty()) return
    const size = bounds.getSize(new THREE.Vector3())
    if (!Number.isFinite(size.y) || size.y < 0.25 || size.y > 5) return

    avatar.getWorldPosition(avatarWorld)
    bounds.getCenter(avatarCenter)
    modelRoot.position.x += avatarWorld.x - avatarCenter.x
    modelRoot.position.y += avatarWorld.y - bounds.min.y
    modelRoot.position.z += avatarWorld.z - avatarCenter.z
    modelRoot.updateWorldMatrix(true, true)
    avatar.userData.modelBoundsAlignedToEmbodimentAnchor = true
    avatar.userData.modelMeasuredHeightM = Number(size.y.toFixed(3))
    aligned.current = true
  })

  return <pointLight
    name="home-visible-avatar-readable-fill"
    position={[-1.1, 2.35, 4.7]}
    intensity={0.5}
    distance={5.5}
    decay={2}
    color="#e4cfb3"
    userData={{ semanticOwner: 'home-avatar-composition', purpose: 'readable-physical-avatar-not-glow' }}
  />
}
