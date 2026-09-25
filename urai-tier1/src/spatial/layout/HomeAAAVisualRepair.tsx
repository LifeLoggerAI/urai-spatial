'use client'

import { Html } from '@react-three/drei'
import { useEffect, useRef, useState } from 'react'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'
import { requestUraiWorldTravel } from '@/spatial/world/worldEvents'
import { HOME_PASSPORT_ORIGIN_CAPTURE_EVENT } from '@/spatial/home/homeExperienceState'
import { HomeGlobalEmotionalFieldEarth } from '@/spatial/home/HomeGlobalEmotionalFieldEarth'
import type { GlobalFieldState } from '@/spatial/lived-world/globalEmotionalField'
import RitualPlatform from '@/scene/RitualPlatform'

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


type PassportReferenceMode = 'neutral-model-sheet' | 'human-scale'

function PassportReferenceFolio({ position, rotation = [0, 0, 0] }: { position: [number, number, number]; rotation?: [number, number, number] }) {
  return (
    <group position={position} rotation={rotation} userData={{ dimensionsMm: [185, 260, 18], nonPersonalReference: true }}>
      <mesh position={[-0.04625, 0, 0]} castShadow receiveShadow><boxGeometry args={[0.0925, 0.26, 0.018]} /><meshStandardMaterial color="#252d29" roughness={0.68} metalness={0.035} /></mesh>
      <mesh position={[0.04625, 0, 0]} castShadow receiveShadow><boxGeometry args={[0.0925, 0.26, 0.018]} /><meshStandardMaterial color="#222b27" roughness={0.66} metalness={0.04} /></mesh>
      <mesh position={[0, 0, -0.002]} castShadow receiveShadow><boxGeometry args={[0.018, 0.26, 0.024]} /><meshStandardMaterial color="#111816" roughness={0.46} metalness={0.075} /></mesh>
      <mesh position={[0.083, 0, 0.014]} castShadow><boxGeometry args={[0.018, 0.052, 0.012]} /><meshStandardMaterial color="#303a36" roughness={0.42} metalness={0.07} /></mesh>
      <mesh position={[0.047, 0.045, 0.021]}><boxGeometry args={[0.045, 0.012, 0.0035]} /><meshStandardMaterial color="#798f87" emissive="#76978b" emissiveIntensity={0.025} roughness={0.52} metalness={0.025} /></mesh>
    </group>
  )
}

function PassportScaleReference() {
  return (
    <group name="passport-non-likeness-human-scale-reference" position={[0.34, 0, 0]} userData={{ heightM: 1.7, likeness: false }}>
      <mesh position={[0, 1.56, 0]}><sphereGeometry args={[0.13, 28, 28]} /><meshStandardMaterial color="#69736f" roughness={0.9} /></mesh>
      <mesh position={[0, 1.02, 0]}><boxGeometry args={[0.32, 0.82, 0.16]} /><meshStandardMaterial color="#5d6763" roughness={0.92} /></mesh>
      <mesh position={[-0.09, 0.36, 0]}><boxGeometry args={[0.11, 0.72, 0.13]} /><meshStandardMaterial color="#525c58" roughness={0.94} /></mesh>
      <mesh position={[0.09, 0.36, 0]}><boxGeometry args={[0.11, 0.72, 0.13]} /><meshStandardMaterial color="#525c58" roughness={0.94} /></mesh>
      <mesh position={[0.26, 0.85, 0]}><boxGeometry args={[0.014, 1.7, 0.014]} /><meshBasicMaterial color="#c7d4ce" toneMapped={false} /></mesh>
      <mesh position={[0.26, 1.7, 0]}><boxGeometry args={[0.12, 0.014, 0.014]} /><meshBasicMaterial color="#c7d4ce" toneMapped={false} /></mesh>
      <mesh position={[0.26, 0, 0]}><boxGeometry args={[0.12, 0.014, 0.014]} /><meshBasicMaterial color="#c7d4ce" toneMapped={false} /></mesh>
    </group>
  )
}

function PassportPhysicalReferenceSheet() {
  const visible = useFirstPersonHomePresence()
  const [mode, setMode] = useState<PassportReferenceMode | null>(null)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('homeAssetReview') !== '1') return setMode(null)
    const requested = params.get('homePassportReference')
    setMode(requested === 'neutral-model-sheet' || requested === 'human-scale' ? requested : null)
  }, [])
  if (!visible || !mode) return null
  if (mode === 'neutral-model-sheet') return (
    <group name="passport-physical-reference-neutral-sheet" position={[-0.72, 1.58, 4.58]}>
      <mesh position={[0, 0, -0.08]}><planeGeometry args={[1.22, 0.62]} /><meshStandardMaterial color="#101816" roughness={1} /></mesh>
      <PassportReferenceFolio position={[-0.42, 0, 0]} />
      <PassportReferenceFolio position={[-0.14, 0, 0]} rotation={[0, Math.PI, 0]} />
      <PassportReferenceFolio position={[0.14, 0, 0]} rotation={[0, Math.PI / 2, 0]} />
      <PassportReferenceFolio position={[0.42, 0, 0]} rotation={[0, -0.58, 0]} />
      <Html center transform distanceFactor={1.4} position={[0, 0.245, 0.02]}><div data-testid="home-passport-reference-sheet" data-home-passport-reference="neutral-model-sheet" data-home-passport-dimensions-mm="185x260x18" style={{minWidth:340,textAlign:'center',color:'#edf5f1',background:'rgba(8,18,16,.88)',border:'1px solid rgba(220,233,228,.28)',borderRadius:12,padding:'10px 14px',font:'600 13px/1.35 system-ui'}}>Physical Home Passport · closed neutral model sheet · 185 × 260 × 18 mm</div></Html>
    </group>
  )
  return (
    <group name="passport-physical-reference-human-scale" position={[-0.72, 0, 2.9]}>
      <mesh position={[0, 0.88, -0.1]}><planeGeometry args={[1.55, 2.08]} /><meshStandardMaterial color="#101816" roughness={1} /></mesh>
      <PassportReferenceFolio position={[-0.42, 1.34, 0]} />
      <PassportScaleReference />
      <Html center transform distanceFactor={2.8} position={[0, 1.92, 0.03]}><div data-testid="home-passport-reference-sheet" data-home-passport-reference="human-scale" data-home-passport-dimensions-mm="185x260x18" data-home-passport-scale-reference-m="1.7" style={{minWidth:360,textAlign:'center',color:'#edf5f1',background:'rgba(8,18,16,.9)',border:'1px solid rgba(220,233,228,.28)',borderRadius:12,padding:'10px 14px',font:'600 13px/1.35 system-ui'}}>Physical Home Passport · true dimensions beside 1.7 m non-likeness scale reference</div></Html>
    </group>
  )
}

type RitualReferenceState = 'neutral'|'invitation'|'anniversary-start'|'anniversary-action'|'anniversary-complete'|'return-moment'|'threshold-small-map'|'cancelled'|'reduced-motion'|'reduced-stimulation'|'mobile'|'semantic-fallback'
const RITUAL_REFERENCE_STATES = new Set<RitualReferenceState>(['neutral','invitation','anniversary-start','anniversary-action','anniversary-complete','return-moment','threshold-small-map','cancelled','reduced-motion','reduced-stimulation','mobile','semantic-fallback'])
const RITUAL_REFERENCE_COPY: Record<RitualReferenceState,{title:string;detail:string}> = {
  neutral:{title:'Shared ritual platform',detail:'Neutral physical locus · no ritual active'},
  invitation:{title:'Return Day',detail:'Optional invitation · Mark this return'},
  'anniversary-start':{title:'Return Day',detail:'Silence-before interval · about 2400 ms · voice permitted'},
  'anniversary-action':{title:'Return Day',detail:'Single bounded action · Mark this return · restrained visual bloom permitted'},
  'anniversary-complete':{title:'Return Day complete',detail:'Silence-after interval · about 1800 ms · return remains available'},
  'return-moment':{title:'Return Moment',detail:'Hold this pattern · source-backed signal fixture · unranked'},
  'threshold-small-map':{title:'Small Map Ritual',detail:'Keep the map small · voice off · visual bloom off'},
  cancelled:{title:'Ritual interrupted',detail:'Cancelled safely · prior world state remains available'},
  'reduced-motion':{title:'Reduced motion',detail:'Rune rotation and pulse stopped · ritual meaning preserved'},
  'reduced-stimulation':{title:'Reduced stimulation',detail:'Glow and reflection density lowered · no flash or alarm treatment'},
  mobile:{title:'Mobile ritual reference',detail:'Same ritual identity · touch-safe presentation'},
  'semantic-fallback':{title:'Ritual semantic fallback',detail:'Optional symbolic moment · text carries all essential meaning without visual bloom'},
}
function HomeRitualReferenceReview() {
  const [reviewState,setReviewState]=useState<RitualReferenceState|null>(null)
  useEffect(()=>{const p=new URLSearchParams(window.location.search); if(p.get('homeAssetReview')!=='1') return setReviewState(null); const r=p.get('homeRitualReview') as RitualReferenceState|null; setReviewState(r&&RITUAL_REFERENCE_STATES.has(r)?r:null)},[])
  if(!reviewState) return null
  const reducedMotion=reviewState==='reduced-motion'||reviewState==='semantic-fallback'
  const reducedStimulation=reviewState==='reduced-stimulation'||reviewState==='semantic-fallback'
  const copy=RITUAL_REFERENCE_COPY[reviewState]
  return <group name="home-ritual-reference-review" userData={{reviewState,personalData:false,supernaturalClaim:false}}>
    {reviewState!=='semantic-fallback'?<RitualPlatform reducedMotion={reducedMotion} reducedStimulation={reducedStimulation}/>:null}
    <Html center transform distanceFactor={8} position={[0,0.9,-1.2]}><div data-testid="home-ritual-reference" data-home-ritual-reference-state={reviewState} data-home-ritual-fixture="disclosed-synthetic-no-personal-data" data-home-ritual-reduced-motion={reducedMotion?'true':'false'} data-home-ritual-reduced-stimulation={reducedStimulation?'true':'false'} style={{width:360,maxWidth:'72vw',color:'#edf5f1',background:'rgba(7,15,19,.88)',border:'1px solid rgba(214,225,219,.24)',borderRadius:16,padding:'14px 16px',font:'500 13px/1.45 system-ui',boxShadow:'0 18px 48px rgba(0,0,0,.26)'}}><div style={{fontWeight:700,letterSpacing:'.04em'}}>{copy.title}</div><div style={{marginTop:6,opacity:.88}}>{copy.detail}</div><div style={{marginTop:9,fontSize:11,opacity:.68}}>REFERENCE REVIEW · disclosed synthetic fixture · no personal memory or supernatural certainty</div></div></Html>
  </group>
}

function HomePassportOwnershipObject() {
  const visible = useFirstPersonHomePresence()
  const [artifactState, setArtifactState] = useState<PassportArtifactState>('dormant')
  const [reviewPinned, setReviewPinned] = useState(false)
  const [reducedStimulation, setReducedStimulation] = useState(false)
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
    const reviewMode = params.get('homeAssetReview') === '1'
    const pinned = reviewMode && requested !== null && PASSPORT_REVIEW_STATES.has(requested)
    setReviewPinned(pinned)
    setReducedStimulation(reviewMode && params.get('homeReducedStimulation') === '1')
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
  const baseMarkIntensity = artifactState === 'opening' ? 0.42 : artifactState === 'selected' ? 0.28 : artifactState === 'focused' ? 0.16 : 0.025
  const markIntensity = reducedStimulation ? Math.min(baseMarkIntensity, 0.055) : baseMarkIntensity

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

      {active && !opening && !reducedStimulation && <>
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
          data-home-passport-reduced-stimulation={reducedStimulation ? 'true' : 'false'}
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
 * Historical V281 localized Ground/ascent overlays remain retired. The current
 * Home runtime keeps Orb semantics, speech/VAD timing and pointer/touch ownership,
 * while HomeVisualAuthority mounts the V288 grounded biomorphic reliquary as the
 * visible Orb morphology pending fresh exact-head literal-pixel acceptance.
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
      <PassportPhysicalReferenceSheet />
      <HomeRitualReferenceReview />
      <HomeGlobalEmotionalFieldEarth state={globalFieldState} />
    </>
  )
}
