'use client'

import { Html } from '@react-three/drei'
import { useEffect, useRef, useState } from 'react'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'
import { requestUraiWorldTravel } from '@/spatial/world/worldEvents'
import { HOME_PASSPORT_ORIGIN_CAPTURE_EVENT } from '@/spatial/home/homeExperienceState'
import { HomeGlobalEmotionalFieldEarth } from '@/spatial/home/HomeGlobalEmotionalFieldEarth'
import type { GlobalFieldState } from '@/spatial/lived-world/globalEmotionalField'

function capturePassportOrigin() {
  window.dispatchEvent(new Event(HOME_PASSPORT_ORIGIN_CAPTURE_EVENT))
}

function commitPassportTravel() {
  requestUraiWorldTravel({
    destination: 'passport',
    href: '/passport',
    entryPortal: 'home-passport-ownership-object',
    cameraCheckpoint: 'home-first-person-passport-origin',
  })
}

type PassportArtifactState = 'dormant' | 'focused' | 'selected' | 'opening'
const PASSPORT_REVIEW_STATES = new Set<PassportArtifactState>(['dormant', 'focused', 'selected', 'opening'])

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
  const [artifactState, setArtifactState] = useState<PassportArtifactState>('dormant')
  const [reviewPinned, setReviewPinned] = useState(false)
  const leftCover = useRef<THREE.Group>(null)
  const rightCover = useRef<THREE.Group>(null)
  const timers = useRef<number[]>([])

  useEffect(() => {
    timers.current.forEach((timer) => window.clearTimeout(timer))
    timers.current = []
    if (!visible) {
      setArtifactState('dormant')
      setReviewPinned(false)
      return
    }
    const params = new URLSearchParams(window.location.search)
    const requested = params.get('homePassportReviewState') as PassportArtifactState | null
    const pinned = params.get('homeAssetReview') === '1' && requested !== null && PASSPORT_REVIEW_STATES.has(requested)
    setReviewPinned(pinned)
    setArtifactState(pinned ? requested : 'dormant')
    return () => {
      timers.current.forEach((timer) => window.clearTimeout(timer))
      timers.current = []
    }
  }, [visible])

  useFrame((_, delta) => {
    const targetAngle = artifactState === 'opening' ? 0.72 : artifactState === 'selected' ? 0.12 : artifactState === 'focused' ? 0.035 : 0
    if (leftCover.current) leftCover.current.rotation.y = THREE.MathUtils.damp(leftCover.current.rotation.y, targetAngle, 7.5, delta)
    if (rightCover.current) rightCover.current.rotation.y = THREE.MathUtils.damp(rightCover.current.rotation.y, -targetAngle, 7.5, delta)
  })

  if (!visible) return null

  const beginOpen = (event?: ThreeEvent<MouseEvent>) => {
    event?.stopPropagation()
    if (reviewPinned || artifactState === 'opening') return
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    capturePassportOrigin()
    setArtifactState('selected')
    timers.current.push(window.setTimeout(() => setArtifactState('opening'), reducedMotion ? 45 : 220))
    timers.current.push(window.setTimeout(commitPassportTravel, reducedMotion ? 140 : 700))
  }

  const focus = () => {
    if (!reviewPinned && artifactState === 'dormant') setArtifactState('focused')
  }
  const blur = () => {
    if (!reviewPinned && artifactState === 'focused') setArtifactState('dormant')
  }

  const active = artifactState !== 'dormant'
  const opening = artifactState === 'opening'
  const markIntensity = artifactState === 'opening' ? 0.42 : artifactState === 'selected' ? 0.28 : artifactState === 'focused' ? 0.16 : 0.025

  return (
    <group
      name="home-first-person-passport-ownership-object"
      position={[3.15, 0.68, 1.85]}
      rotation={[0, -0.34, -0.045]}
      onPointerOver={(event) => { event.stopPropagation(); focus() }}
      onPointerOut={(event) => { event.stopPropagation(); blur() }}
      onClick={beginOpen}
      userData={{
        semanticOwner: 'passport-physical-home-presence',
        realm: 'home',
        visibility: 'first-person-only',
        portal: false,
        backendAuthority: 'existing-passport-vault',
        visualForm: 'rigid-ownership-folio-v1',
        visualStatus: 'candidate-requires-literal-pixel-acceptance',
        dimensionsMm: [185, 260, 18],
        interactionState: artifactState,
      }}
    >
      <mesh name="passport-integrated-architectural-ledge" position={[0, -0.16, -0.025]} receiveShadow>
        <boxGeometry args={[0.31, 0.035, 0.22]} />
        <meshStandardMaterial color="#18201d" roughness={0.84} metalness={0.02} />
      </mesh>

      <group ref={leftCover} name="passport-folio-left-cover">
        <mesh position={[-0.04625, 0, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.0925, 0.26, 0.018]} />
          <meshStandardMaterial color="#252d29" roughness={0.68} metalness={0.035} />
        </mesh>
        <mesh position={[-0.04625, 0, 0.0115]}>
          <boxGeometry args={[0.085, 0.238, 0.004]} />
          <meshStandardMaterial color="#343c37" roughness={0.76} metalness={0.01} />
        </mesh>
      </group>

      <group ref={rightCover} name="passport-folio-right-cover">
        <mesh position={[0.04625, 0, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.0925, 0.26, 0.018]} />
          <meshStandardMaterial color="#222b27" roughness={0.66} metalness={0.04} />
        </mesh>
        <mesh position={[0.04625, 0, 0.0115]}>
          <boxGeometry args={[0.085, 0.238, 0.004]} />
          <meshStandardMaterial color="#313a35" roughness={0.74} metalness={0.01} />
        </mesh>
      </group>

      <mesh name="passport-folio-spine" position={[0, 0, -0.002]} castShadow receiveShadow>
        <boxGeometry args={[0.018, 0.26, 0.024]} />
        <meshStandardMaterial color="#111816" roughness={0.46} metalness={0.075} />
      </mesh>

      <mesh name="passport-folio-clasp" position={[0.083, 0, 0.014]} castShadow>
        <boxGeometry args={[0.018, 0.052, 0.012]} />
        <meshStandardMaterial color="#303a36" roughness={0.42} metalness={0.07} />
      </mesh>

      <mesh name="passport-ownership-mark" position={[0.047, 0.045, 0.021]}>
        <boxGeometry args={[0.045, 0.012, 0.0035]} />
        <meshStandardMaterial
          color="#798f87"
          emissive="#76978b"
          emissiveIntensity={markIntensity}
          roughness={0.52}
          metalness={0.025}
        />
      </mesh>

      {active && !opening && <>
        <mesh name="passport-focus-frame-top" position={[0, 0.145, 0.008]}>
          <boxGeometry args={[0.205, 0.006, 0.006]} />
          <meshBasicMaterial color="#dce9e4" toneMapped={false} />
        </mesh>
        <mesh name="passport-focus-frame-bottom" position={[0, -0.145, 0.008]}>
          <boxGeometry args={[0.205, 0.006, 0.006]} />
          <meshBasicMaterial color="#dce9e4" toneMapped={false} />
        </mesh>
        <mesh name="passport-focus-frame-left" position={[-0.1025, 0, 0.008]}>
          <boxGeometry args={[0.006, 0.284, 0.006]} />
          <meshBasicMaterial color="#dce9e4" toneMapped={false} />
        </mesh>
        <mesh name="passport-focus-frame-right" position={[0.1025, 0, 0.008]}>
          <boxGeometry args={[0.006, 0.284, 0.006]} />
          <meshBasicMaterial color="#dce9e4" toneMapped={false} />
        </mesh>
      </>}

      <Html center transform distanceFactor={8} position={[0, -0.205, 0.05]}>
        <button
          type="button"
          className="sr-only"
          data-testid="home-passport-physical-control"
          data-home-passport-artifact-state={artifactState}
          data-home-passport-dimensions-mm="185x260x18"
          onFocus={focus}
          onBlur={blur}
          onClick={() => beginOpen()}
          aria-label="Passport — open ownership and consent vault"
        >
          Passport — ownership and consent
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
 * Passport is a first-person-only physical ownership folio that reuses the existing
 * Passport vault and world-travel stack; it is not a portal. The current candidate
 * follows the written 260 mm × 185 mm × 18 mm rigid-folio authority with restrained
 * mineral/fiber material language, bounded focus/selection/opening states and no
 * visible sensitive records. Before travel it asks the Home
 * controller to persist the exact live FP origin so semantic return restores the
 * prior camera/state rather than generic Home.
 *
 * Global Emotional Field Earth is mounted as a separate first-person physical
 * candidate and currently receives only the truthful fail-closed `unavailable`
 * state. It does not reuse private map terrain, invent aggregate activity, expose
 * individual dots, or claim an active publication provider.
 */
export function HomeAAAVisualRepair() {
  const [globalFieldState, setGlobalFieldState] = useState<GlobalFieldState>('unavailable')

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const review = params.get('homeAssetReview') === '1' ? params.get('homeGlobalFieldReview') : null
    setGlobalFieldState(review === 'suppressed' ? 'suppressed' : 'unavailable')
  }, [])

  return (
    <>
      <HomePassportOwnershipObject />
      <HomeGlobalEmotionalFieldEarth state={globalFieldState} />
    </>
  )
}
