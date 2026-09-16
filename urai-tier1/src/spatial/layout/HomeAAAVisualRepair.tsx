'use client'

import { Html, RoundedBox } from '@react-three/drei'
import { useEffect, useState } from 'react'
import type { ThreeEvent } from '@react-three/fiber'
import { HomeOrbGroundedV288 } from '@/spatial/assets/HomeOrbGroundedV288'
import { requestUraiWorldTravel } from '@/spatial/world/worldEvents'

function openPassport() {
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
        visualStatus: 'candidate-requires-literal-pixel-acceptance',
      }}
    >
      <RoundedBox args={[0.82, 0.9, 0.12]} radius={0.055} smoothness={5} onClick={activate} castShadow receiveShadow>
        <meshPhysicalMaterial
          color="#202a2a"
          roughness={0.54}
          metalness={0.24}
          clearcoat={0.2}
          clearcoatRoughness={0.62}
          envMapIntensity={0.42}
        />
      </RoundedBox>
      <RoundedBox args={[0.64, 0.72, 0.025]} radius={0.035} smoothness={4} position={[0, 0, 0.073]} onClick={activate}>
        <meshPhysicalMaterial
          color="#3b4744"
          roughness={0.66}
          metalness={0.12}
          clearcoat={0.12}
          emissive="#8ca89e"
          emissiveIntensity={0.035}
        />
      </RoundedBox>
      <mesh position={[0, -0.515, -0.005]} castShadow receiveShadow>
        <cylinderGeometry args={[0.32, 0.4, 0.12, 32]} />
        <meshStandardMaterial color="#303936" roughness={0.92} metalness={0.04} />
      </mesh>
      <Html center transform distanceFactor={8} position={[0, 0, 0.1]}>
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
 * Historical V281 localized Ground/ascent overlays remain retired. V288 remains
 * the visual Orb repair while the V223 Orb owner keeps semantic/speech/pointer
 * ownership. Passport is a first-person-only physical ownership artifact that
 * reuses the existing Passport vault and world-travel stack; it is not a portal
 * and remains a visual candidate until literal desktop/mobile pixels are accepted.
 */
export function HomeAAAVisualRepair() {
  return <>
    <HomeOrbGroundedV288 />
    <HomePassportOwnershipObject />
  </>
}
