'use client'

import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import {
  resolveOrbSensoryOutput,
  URAI_ORB_STATE_EVENT,
  type OrbState,
  type OrbStateEventDetail,
} from '@/app/home/orbStateController'

export const GROUND_ORB_TOGGLE_EVENT = 'urai:ground-orb-toggle'

type Props = {
  playerPosition: React.MutableRefObject<THREE.Vector3>
  yaw: React.MutableRefObject<number>
  heightAt: (x: number, z: number) => number
  reducedMotion: boolean
  disabled?: boolean
}

const palettes: Record<OrbState, { mineral: string; warm: string; cool: string; field: string }> = {
  dormant: { mineral: '#4b4b43', warm: '#9a7656', cool: '#687e7b', field: '#8d826e' },
  idle: { mineral: '#555248', warm: '#d39a61', cool: '#789391', field: '#c2a070' },
  attention: { mineral: '#5c574c', warm: '#e0a461', cool: '#8ba7a0', field: '#d5aa70' },
  listening: { mineral: '#4b5753', warm: '#8db9ad', cool: '#6f8f9d', field: '#82a9a3' },
  thinking: { mineral: '#514b55', warm: '#a28aac', cool: '#7696a4', field: '#9289a3' },
  speaking: { mineral: '#615447', warm: '#e3aa68', cool: '#c98559', field: '#d9a066' },
  guiding: { mineral: '#5c5848', warm: '#c6ad72', cool: '#7ea08c', field: '#a6ab76' },
  reflecting: { mineral: '#514e55', warm: '#9d8fa9', cool: '#748d9c', field: '#8e879e' },
  calming: { mineral: '#4d554c', warm: '#9fb49d', cool: '#789a93', field: '#91a793' },
  privacy: { mineral: '#48545b', warm: '#7ca1ae', cool: '#6e8199', field: '#7d98a5' },
  warning: { mineral: '#5d4940', warm: '#d77e59', cool: '#aa6853', field: '#bb7659' },
  transition: { mineral: '#504c56', warm: '#aa94b1', cool: '#7898a1', field: '#918ba7' },
}

function makeTraceGeometry(index: number) {
  const angle = -.8 + index * .77
  const reach = .42 + (index % 3) * .13
  const points = [
    new THREE.Vector3(0, .012, 0),
    new THREE.Vector3(Math.cos(angle) * reach * .48, .009, Math.sin(angle) * reach * .42),
    new THREE.Vector3(Math.cos(angle + (index % 2 ? .09 : -.06)) * reach, .004, Math.sin(angle) * reach * .72),
  ]
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points, false, 'centripetal', .42), 22, .005 + (index % 2) * .0015, 5, false)
}

function GroundOrbVisual({ state, reducedMotion, onDismiss }: { state: OrbState; reducedMotion: boolean; onDismiss: () => void }) {
  const root = useRef<THREE.Group>(null)
  const palette = palettes[state]
  const sensory = resolveOrbSensoryOutput(state, reducedMotion, true)
  const traces = useMemo(() => Array.from({ length: 6 }, (_, index) => makeTraceGeometry(index)), [])

  useEffect(() => () => traces.forEach((geometry) => geometry.dispose()), [traces])

  useFrame(({ clock }) => {
    if (!root.current || reducedMotion) return
    const t = clock.elapsedTime
    root.current.rotation.y = .16 + Math.sin(t * .19) * .018
    root.current.scale.setScalar(1 + Math.sin(t * .71) * .004)
  })

  return <group ref={root} name="ground-summoned-physical-orb" userData={{ semanticOwner: 'orb', physicalGroundPresence: true, animation: sensory.animation }}>
    <group position={[0, .63, 0]} onClick={(event) => { event.stopPropagation(); onDismiss() }}>
      <mesh position={[-.19, .04, .01]} scale={[.52, .82, .43]} rotation={[.06, -.22, .19]} castShadow receiveShadow>
        <icosahedronGeometry args={[.68, 3]} />
        <meshStandardMaterial color={palette.mineral} emissive={palette.warm} emissiveIntensity={state === 'dormant' ? .025 : .10} roughness={.78} metalness={.015} />
      </mesh>
      <mesh position={[.21, .08, -.04]} scale={[.46, .72, .39]} rotation={[-.05, .26, -.21]} castShadow receiveShadow>
        <icosahedronGeometry args={[.68, 3]} />
        <meshStandardMaterial color={palette.mineral} emissive={palette.cool} emissiveIntensity={state === 'dormant' ? .02 : .08} roughness={.80} metalness={.01} />
      </mesh>
      <mesh position={[0, -.35, .025]} scale={[.30, .38, .28]} castShadow receiveShadow>
        <icosahedronGeometry args={[.64, 2]} />
        <meshStandardMaterial color={palette.mineral} emissive={palette.warm} emissiveIntensity={.055} roughness={.86} />
      </mesh>
      <pointLight position={[0, .18, .18]} color={palette.warm} intensity={state === 'warning' ? .72 : .25} distance={2.3} decay={2} />
    </group>
    <group name="ground-orb-contact-field" raycast={() => null}>
      {traces.map((geometry, index) => <mesh key={index} geometry={geometry} rotation={[-Math.PI / 2, 0, 0]}>
        <meshStandardMaterial color={index % 2 ? '#343d38' : '#5e4b3b'} emissive={palette.field} emissiveIntensity={state === 'idle' ? .012 : .035} roughness={.93} />
      </mesh>)}
      <mesh position={[0, .006, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[1.15, .82, 1]}>
        <circleGeometry args={[.72, 48]} />
        <meshBasicMaterial color="#151b18" transparent opacity={.16} depthWrite={false} />
      </mesh>
    </group>
  </group>
}

export default function GroundOrbPresence({ playerPosition, yaw, heightAt, reducedMotion, disabled = false }: Props) {
  const [visible, setVisible] = useState(false)
  const [state, setState] = useState<OrbState>('idle')
  const [anchor, setAnchor] = useState(() => new THREE.Vector3())

  const placeOrb = () => {
    const player = playerPosition.current
    const side = .55
    const forward = new THREE.Vector3(-Math.sin(yaw.current), 0, -Math.cos(yaw.current))
    const right = new THREE.Vector3(Math.cos(yaw.current), 0, -Math.sin(yaw.current))
    const next = player.clone().addScaledVector(forward, 1.65).addScaledVector(right, side)
    next.y = heightAt(next.x, next.z)
    setAnchor(next)
  }

  const toggle = () => {
    if (disabled) return
    if (!visible) placeOrb()
    setVisible((current) => !current)
  }

  useEffect(() => {
    const toggleListener = () => toggle()
    const stateListener = (event: CustomEvent<OrbStateEventDetail>) => setState(event.detail.state)
    window.addEventListener(GROUND_ORB_TOGGLE_EVENT, toggleListener)
    window.addEventListener(URAI_ORB_STATE_EVENT, stateListener)
    return () => {
      window.removeEventListener(GROUND_ORB_TOGGLE_EVENT, toggleListener)
      window.removeEventListener(URAI_ORB_STATE_EVENT, stateListener)
    }
  })

  useEffect(() => {
    if (disabled && visible) setVisible(false)
  }, [disabled, visible])

  if (!visible) return null
  return <group position={[anchor.x, anchor.y, anchor.z]}>
    <GroundOrbVisual state={state} reducedMotion={reducedMotion} onDismiss={() => setVisible(false)} />
  </group>
}

export function requestGroundOrbToggle() {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new Event(GROUND_ORB_TOGGLE_EVENT))
}
