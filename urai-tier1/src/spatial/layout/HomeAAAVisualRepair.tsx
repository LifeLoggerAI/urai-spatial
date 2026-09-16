'use client'

import { Html, RoundedBox } from '@react-three/drei'
import { useEffect, useRef, useState } from 'react'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'
import { HomeOrbGroundedV288 } from '@/spatial/assets/HomeOrbGroundedV288'
import { requestUraiWorldTravel } from '@/spatial/world/worldEvents'
import { HOME_PASSPORT_ORIGIN_CAPTURE_EVENT } from '@/spatial/home/homeExperienceState'
import { getGlobalEmotionalFieldSnapshot } from '@/lib/privacy/operationalPrivacyClient'

function openPassport() { window.dispatchEvent(new Event(HOME_PASSPORT_ORIGIN_CAPTURE_EVENT)); requestUraiWorldTravel({ destination: 'passport', href: '/passport', entryPortal: 'home-passport-ownership-object', cameraCheckpoint: 'home-first-person-passport-origin' }) }
function useFirstPersonHomePresence() {
  const [visible, setVisible] = useState(false)
  useEffect(() => { const owner = document.querySelector<HTMLElement>('.urai-asset-home-world[data-home-primary-owner="asset-driven"]') ?? document.querySelector<HTMLElement>('.urai-asset-home-world'); if (!owner) return; const sync = () => setVisible(owner.getAttribute('data-home-stable-state') === 'AVATAR_HOME_FIRST_PERSON' && owner.getAttribute('data-home-input-locked') !== 'true'); sync(); const observer = new MutationObserver(sync); observer.observe(owner, { attributes: true, attributeFilter: ['data-home-stable-state','data-home-input-locked'] }); return () => observer.disconnect() }, [])
  return visible
}
function HomePassportOwnershipObject() {
  const visible = useFirstPersonHomePresence(); if (!visible) return null
  const activate = (event: ThreeEvent<MouseEvent>) => { event.stopPropagation(); openPassport() }
  return <group name="home-first-person-passport-ownership-object" position={[3.15,.62,1.85]} rotation={[0,-.34,0]} userData={{ semanticOwner:'passport-physical-home-presence', realm:'home', visibility:'first-person-only', portal:false, backendAuthority:'existing-passport-vault', visualStatus:'candidate-requires-literal-pixel-acceptance' }}>
    <RoundedBox args={[.82,.9,.12]} radius={.055} smoothness={5} onClick={activate} castShadow receiveShadow><meshPhysicalMaterial color="#202a2a" roughness={.54} metalness={.24} clearcoat={.2} clearcoatRoughness={.62} envMapIntensity={.42} /></RoundedBox>
    <RoundedBox args={[.64,.72,.025]} radius={.035} smoothness={4} position={[0,0,.073]} onClick={activate}><meshPhysicalMaterial color="#3b4744" roughness={.66} metalness={.12} clearcoat={.12} emissive="#8ca89e" emissiveIntensity={.035} /></RoundedBox>
    <mesh position={[0,-.515,-.005]} castShadow receiveShadow><cylinderGeometry args={[.32,.4,.12,32]} /><meshStandardMaterial color="#303936" roughness={.92} metalness={.04} /></mesh>
    <Html center transform distanceFactor={8} position={[0,0,.1]}><button type="button" className="sr-only" onClick={openPassport} aria-label="Open Passport ownership and permissions">Open Passport ownership and permissions</button></Html>
  </group>
}

type FieldViewState = 'unavailable' | 'suppressed' | 'aggregate'
function HomeGlobalEmotionalFieldEarth() {
  const visible = useFirstPersonHomePresence()
  const [state, setState] = useState<FieldViewState>('unavailable')
  const earth = useRef<THREE.Group>(null)
  useEffect(() => {
    if (!visible) return
    let active = true
    const country = document.documentElement.dataset.uraiCountryCode
    if (!country) { setState('unavailable'); return }
    getGlobalEmotionalFieldSnapshot({ country }).then((result) => { if (!active) return; const next = result.state; setState(next === 'aggregate' || next === 'suppressed' ? next : 'unavailable') }).catch(() => { if (active) setState('unavailable') })
    return () => { active = false }
  }, [visible])
  useFrame((_, delta) => { if (earth.current && state === 'aggregate') earth.current.rotation.y += Math.min(delta * .055, .003) })
  if (!visible) return null
  const activate = (event: ThreeEvent<MouseEvent>) => { event.stopPropagation(); window.dispatchEvent(new CustomEvent('urai:global-emotional-field-inspect', { detail: { state } })) }
  const label = state === 'aggregate' ? 'Global emotional field aggregate' : state === 'suppressed' ? 'Not enough safely aggregated data' : 'Global field unavailable'
  return <group ref={earth} name="home-global-emotional-field-earth" position={[-3.15,1.28,1.85]} userData={{ semanticOwner:'global-emotional-field-public-view', realm:'home', visibility:'first-person-only', portal:false, contributionConsentRequiredForViewing:false, precision:'country', visualStatus:'source-candidate-requires-literal-pixel-acceptance', state }}>
    <mesh onClick={activate} castShadow><sphereGeometry args={[.62,64,64]} /><meshPhysicalMaterial color={state === 'aggregate' ? '#23464b' : '#233239'} roughness={.72} metalness={.02} clearcoat={.16} emissive={state === 'aggregate' ? '#2a6b70' : '#16262b'} emissiveIntensity={state === 'aggregate' ? .16 : .035} /></mesh>
    <mesh scale={1.026} onClick={activate}><sphereGeometry args={[.62,48,48]} /><meshPhysicalMaterial color={state === 'suppressed' ? '#aeb9b6' : '#8fc5c9'} transparent opacity={state === 'suppressed' ? .08 : state === 'aggregate' ? .045 : .025} depthWrite={false} roughness={1} /></mesh>
    <mesh position={[0,-.78,0]} castShadow receiveShadow><cylinderGeometry args={[.31,.42,.18,36]} /><meshStandardMaterial color="#242d2c" roughness={.94} /></mesh>
    <pointLight position={[0,1.1,1.2]} color="#cfe8e5" intensity={state === 'aggregate' ? .55 : .28} distance={4} />
    <Html center transform distanceFactor={8} position={[0,-1.02,0]}><button type="button" className="sr-only" onClick={() => window.dispatchEvent(new CustomEvent('urai:global-emotional-field-inspect', { detail:{ state } }))} aria-label={label}>{label}</button></Html>
  </group>
}

export function HomeAAAVisualRepair() { return <><HomeOrbGroundedV288 /><HomePassportOwnershipObject /><HomeGlobalEmotionalFieldEarth /></> }
