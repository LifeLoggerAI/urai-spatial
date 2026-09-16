'use client'

import { useFrame } from '@react-three/fiber'
import { useEffect, useRef } from 'react'

/**
 * Current Home composition repair.
 *
 * The retired V281 overlays remain gone: this component does not restore a
 * Ground ravine, portal, celestial ribbon, or second interaction owner.
 *
 * Literal retained pixels showed the governed Avatar casting a foreground
 * shadow while its body sat outside the readable idle composition because the
 * canonical camera was too tight to the unchanged Avatar/eye anchor. We solve
 * that as a camera-composition defect rather than moving the Avatar, preserving
 * the physical Avatar-eye position used by Home -> Ground embodiment and the
 * reverse Ground -> Home return.
 */
export function HomeAAAVisualRepair() {
  const homeRoot = useRef<HTMLElement | null>(null)

  useEffect(() => {
    homeRoot.current = document.querySelector<HTMLElement>('[data-testid="home-visible-navigable-sanctuary-world"]')
  }, [])

  useFrame(({ camera }) => {
    const root = homeRoot.current
    if (!root || root.dataset.homeScenePhase !== 'HOME_IDLE') return
    // CameraRig remains the authoritative look/orbit owner. This restrained
    // pullback runs after the authored camera calculation and changes only
    // distance, leaving the Avatar world/eye anchor and camera orientation intact.
    camera.position.z += 1.35
  }, 1)

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
