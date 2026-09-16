'use client'

import { Html } from '@react-three/drei'
import { useEffect, useState } from 'react'
import type { ThreeEvent } from '@react-three/fiber'
import { requestUraiWorldTravel } from '@/spatial/world/worldEvents'
import { HOME_PASSPORT_ORIGIN_CAPTURE_EVENT } from '@/spatial/home/homeExperienceState'

function openPassport() {
  window.dispatchEvent(new Event(HOME_PASSPORT_ORIGIN_CAPTURE_EVENT))
  requestUraiWorldTravel({
    destination: 'passport',
    href: '/passport',
    entryPortal: 'home-passport-ownership-object',
    cameraCheckpoint: 'home-first-person-passport-origin',
  })
}

function useFirstPersonHomePresence() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const owner = document.querySelector<HTMLElement>('.urai-asset-home-world[data-home-primary-owner="asset-driven"]')
      ?? document.querySelector<HTMLElement>('.urai-asset-home-world')
    if (!owner) return

    const sync = () => setVisible(
      owner.getAttribute('data-home-stable-state') === 'AVATAR_HOME_FIRST_PERSON'
      && owner.getAttribute('data-home-input-locked') !== 'true',
    )
    sync()
    const observer = new MutationObserver(sync)
    observer.observe(owner, { attributes: true, attributeFilter: ['data-home-stable-state', 'data-home-input-locked'] })
    return () => observer.disconnect()
  }, [])

  return visible
}

function HomePassportOwnershipObject() {
  const visible = useFirstPersonHomePresence()
  if (!visible) return null

  const activate = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation()
    openPassport()
  }

  return (
    <group
      name="home-first-person-passport-ownership-object"
      position={[3.15, 0.62, 1.85]}
      rotation={[0, -0.34, 0]}
      userData={{
        semanticOwner: 'passport-physical-home-presence',
        realm: 'home',
        visibility: 'first-person-only',
        portal: false,
        backendAuthority: 'existing-passport-vault',
        visualForm: 'protected-custody-stone-v2',
        visualStatus: 'candidate-requires-literal-pixel-acceptance',
      }}
    >
      <mesh
        name="passport-ownership-shell-primary"
        scale={[0.46, 0.55, 0.18]}
        rotation={[0.035, 0.1, -0.075]}
        onClick={activate}
        castShadow
        receiveShadow
      >
        <icosahedronGeometry args={[1, 4]} />
        <meshPhysicalMaterial
          color="#202925"
          roughness={0.72}
          metalness={0.08}
          clearcoat={0.08}
          clearcoatRoughness={0.78}
          envMapIntensity={0.38}
        />
      </mesh>

      <mesh
        name="passport-ownership-shell-protected-face"
        position={[0.055, 0.018, 0.165]}
        scale={[0.29, 0.39, 0.055]}
        rotation={[0.015, -0.025, 0.045]}
        onClick={activate}
        castShadow
        receiveShadow
      >
        <icosahedronGeometry args={[1, 3]} />
        <meshPhysicalMaterial
          color="#3d4a44"
          roughness={0.61}
          metalness={0.15}
          clearcoat={0.11}
          clearcoatRoughness={0.68}
          envMapIntensity={0.5}
        />
      </mesh>

      <mesh
        name="passport-custody-seam"
        position={[0.03, 0.012, 0.217]}
        scale={[0.032, 0.255, 0.017]}
        rotation={[0, 0, -0.08]}
        onClick={activate}
      >
        <sphereGeometry args={[1, 32, 24]} />
        <meshPhysicalMaterial
          color="#92a8a0"
          emissive="#7f9d94"
          emissiveIntensity={0.07}
          roughness={0.42}
          metalness={0.17}
          clearcoat={0.16}
          clearcoatRoughness={0.52}
          envMapIntensity={0.62}
        />
      </mesh>

      <mesh
        name="passport-custody-memory-inclusion"
        position={[-0.16, 0.21, 0.19]}
        scale={[0.052, 0.075, 0.026]}
        rotation={[0.18, 0.3, -0.22]}
        onClick={activate}
        castShadow
      >
        <octahedronGeometry args={[1, 2]} />
        <meshPhysicalMaterial
          color="#718078"
          emissive="#5d7e73"
          emissiveIntensity={0.025}
          roughness={0.53}
          metalness={0.19}
          clearcoat={0.14}
          clearcoatRoughness={0.56}
        />
      </mesh>

      <Html center transform distanceFactor={8} position={[0, 0, 0.24]}>
        <button
          type="button"
          className="sr-only"
          onClick={openPassport}
          aria-label="Open Passport ownership and permissions"
        >
          Open Passport ownership and permissions
        </button>
      </Html>
    </group>
  )
}

/**
 * Current Home visual convergence extension point.
 *
 * Historical V281 localized Ground/ascent overlays and the predecessor V288 Orb
 * overlay remain retired. The authored living-memory Orb in HomeWorldProductionV223
 * keeps current Orb pixels, semantics, speech/VAD timing and pointer/touch ownership.
 * Passport is a first-person-only physical ownership artifact that reuses the
 * existing Passport vault and world-travel stack; it is not a portal. The current
 * visual candidate is a protected-custody stone: layered tactile mineral shells and
 * a restrained ownership seam, deliberately rejecting tablet, kiosk, settings-panel,
 * passport-book, portal and pedestal language. Before travel it asks the Home
 * controller to persist the exact live FP origin so semantic return restores the
 * prior camera/state rather than generic Home.
 */
export function HomeAAAVisualRepair() {
  return <HomePassportOwnershipObject />
}
