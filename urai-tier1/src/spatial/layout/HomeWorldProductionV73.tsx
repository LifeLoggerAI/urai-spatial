'use client'

import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'

const STONE = '#26352f'
const STEEL = '#26332f'

function Mass({ name, position, rotation = [0, 0, 0], scale, color = STONE, metalness = 0.08, roughness = 0.72 }: { name: string; position: [number, number, number]; rotation?: [number, number, number]; scale: [number, number, number]; color?: string; metalness?: number; roughness?: number }) {
  return <mesh name={name} position={position} rotation={rotation} scale={scale} castShadow receiveShadow><boxGeometry args={[1, 1, 1, 4, 4, 4]} /><meshPhysicalMaterial color={color} metalness={metalness} roughness={roughness} clearcoat={0.08} clearcoatRoughness={0.78} envMapIntensity={0.62} /></mesh>
}

function Arch({ name, position, rotation = [0, 0, 0], scale, color = STONE }: { name: string; position: [number, number, number]; rotation?: [number, number, number]; scale: [number, number, number]; color?: string }) {
  const geometry = useMemo(() => {
    const outer = new THREE.Shape(); outer.moveTo(-1.28, -1.18); outer.lineTo(1.28, -1.18); outer.lineTo(1.28, 0.74); outer.absarc(0, 0.74, 1.28, 0, Math.PI, false); outer.lineTo(-1.28, -1.18)
    const inner = new THREE.Path(); inner.moveTo(-0.68, -1.04); inner.lineTo(-0.68, 0.58); inner.absarc(0, 0.58, 0.68, Math.PI, 0, true); inner.lineTo(0.68, -1.04); inner.closePath(); outer.holes.push(inner)
    const result = new THREE.ExtrudeGeometry(outer, { depth: 0.28, bevelEnabled: true, bevelSegments: 5, bevelSize: 0.06, bevelThickness: 0.08, curveSegments: 40 }); result.center(); return result
  }, [])
  return <mesh name={name} geometry={geometry} position={position} rotation={rotation} scale={scale} castShadow receiveShadow><meshPhysicalMaterial color={color} metalness={0.10} roughness={0.84} clearcoat={0.06} envMapIntensity={0.54} /></mesh>
}

function RuntimeCameraSync({ reducedMotion }: { reducedMotion: boolean }) {
  const { camera, size } = useThree()
  const yaw = useRef(0)
  const pitch = useRef(0.06)
  const dragging = useRef(false)
  const last = useRef({ x: 0, y: 0 })

  useEffect(() => {
    const down = (event: PointerEvent) => { if (event.button === 0 || event.pointerType === 'touch') { dragging.current = true; last.current = { x: event.clientX, y: event.clientY } } }
    const move = (event: PointerEvent) => {
      if (!dragging.current || reducedMotion) return
      const dx = event.clientX - last.current.x; const dy = event.clientY - last.current.y; last.current = { x: event.clientX, y: event.clientY }
      yaw.current += dx * 0.003; pitch.current = THREE.MathUtils.clamp(pitch.current + dy * 0.003, -0.46, 0.50)
    }
    const up = () => { dragging.current = false }
    window.addEventListener('pointerdown', down, true); window.addEventListener('pointermove', move, true); window.addEventListener('pointerup', up, true); window.addEventListener('pointercancel', up, true)
    return () => { window.removeEventListener('pointerdown', down, true); window.removeEventListener('pointermove', move, true); window.removeEventListener('pointerup', up, true); window.removeEventListener('pointercancel', up, true) }
  }, [reducedMotion])

  useFrame(() => {
    const world = document.querySelector<HTMLElement>('[data-urai-home-production]')
    const x = Number.parseFloat(world?.dataset.homePlayerX ?? '0'); const z = Number.parseFloat(world?.dataset.homePlayerZ ?? '4.6')
    const portrait = size.height > size.width
    if (camera instanceof THREE.PerspectiveCamera) { const fov = portrait ? 70 : 46; if (camera.fov !== fov) { camera.fov = fov; camera.updateProjectionMatrix() } }
    camera.position.set(Number.isFinite(x) ? x : 0, portrait ? 1.54 : 1.59, Number.isFinite(z) ? z : 4.6)
    camera.lookAt(camera.position.clone().add(new THREE.Vector3(-Math.sin(yaw.current) * 10.5, pitch.current * 0.5, -Math.cos(yaw.current) * 10.5)))
  })
  return null
}

function VaultRib({ index, z, warm }: { index: number; z: number; warm: boolean }) {
  return <group name={`home-v73-vault-rib-${index}`} position={[0, 2.84 + index * 0.04, z]}><Mass name={`home-v73-rib-${index}-port`} position={[-0.92, -1.42, 0]} scale={[0.16, 2.42, 0.24]} color={STEEL} metalness={0.38} roughness={0.56} /><Mass name={`home-v73-rib-${index}-starboard`} position={[0.92, -1.42, 0]} scale={[0.16, 2.42, 0.24]} color={STEEL} metalness={0.38} roughness={0.56} /><mesh name={`home-v73-rib-${index}-arch`} rotation={[Math.PI / 2, 0, 0]} castShadow receiveShadow><torusGeometry args={[0.92, 0.055, 10, 32, Math.PI]} /><meshPhysicalMaterial color={warm ? '#3b3227' : STEEL} metalness={0.42} roughness={0.52} /></mesh><pointLight position={[0, -0.12, 0.10]} color={warm ? '#d6a86a' : '#91b8aa'} intensity={0.24} distance={3.2} decay={2} /></group>
}

function ArmoredOrb() {
  return <group name="home-v73-integrated-armored-orb-machine" position={[0, 1.92, -3.82]}>
    <mesh name="home-v73-continuous-armored-ovoid-read" scale={[0.54, 0.92, 0.44]} castShadow receiveShadow><sphereGeometry args={[1, 40, 32]} /><meshPhysicalMaterial color="#152a24" emissive="#23473d" emissiveIntensity={0.12} metalness={0.42} roughness={0.56} clearcoat={0.12} clearcoatRoughness={0.66} /></mesh>
    <Mass name="home-v73-orb-port-shoulder-armor" position={[-0.50, 0.28, 0.03]} rotation={[0.10, 0.18, -0.20]} scale={[0.34, 0.58, 0.26]} color="#344a41" metalness={0.46} roughness={0.52} />
    <Mass name="home-v73-orb-starboard-shoulder-armor" position={[0.50, 0.18, 0.02]} rotation={[-0.08, -0.18, 0.18]} scale={[0.34, 0.54, 0.26]} color="#2d433b" metalness={0.46} roughness={0.52} />
    <Mass name="home-v73-orb-port-keel-armor" position={[-0.36, -0.58, 0.02]} rotation={[-0.10, 0.12, -0.12]} scale={[0.30, 0.48, 0.24]} color="#263d35" metalness={0.44} roughness={0.56} />
    <Mass name="home-v73-orb-starboard-keel-armor" position={[0.34, -0.62, 0.01]} rotation={[0.10, -0.12, 0.12]} scale={[0.28, 0.46, 0.24]} color="#31473f" metalness={0.44} roughness={0.56} />
    <Mass name="home-v73-orb-crown-armor" position={[0.02, 0.72, -0.02]} rotation={[0.04, 0.02, 0.03]} scale={[0.48, 0.24, 0.28]} color="#3b4b43" metalness={0.48} roughness={0.50} />
    <mesh name="home-v73-vertical-orb-aperture" position={[0, 0, 0.45]} scale={[0.055, 0.78, 0.04]}><boxGeometry args={[1, 1, 1]} /><meshBasicMaterial color="#f4d091" toneMapped={false} /></mesh>
  </group>
}

function Scene({ reducedMotion }: { reducedMotion: boolean }) {
  const root = useRef<THREE.Group>(null)
  useFrame(({ clock }) => { if (root.current) root.current.rotation.y = reducedMotion ? 0 : Math.sin(clock.elapsedTime * 0.18) * 0.004 })
  return <><RuntimeCameraSync reducedMotion={reducedMotion} /><group ref={root} name="home-v73-retained-pixel-depth-compositor" userData={{ retainedPixelRepair: 'v73-depth-industrial-sanctuary-compositor', runtimeOwner: 'HomeWorldProductionV70' }}>
    <ambientLight intensity={0.18} /><directionalLight position={[-3.8, 5.4, 4.6]} intensity={1.05} color="#d9c09b" castShadow /><directionalLight position={[3.2, 3.4, 2.4]} intensity={0.34} color="#8eb6a8" /><pointLight position={[0, 1.4, -3.0]} color="#d9a764" intensity={0.75} distance={5.8} decay={2} /><pointLight position={[0, 1.8, -5.2]} color="#8bb6a8" intensity={0.64} distance={5.2} decay={2} />
    <Arch name="home-v73-deep-aperture-stone-frame" position={[0, 1.68, -9.82]} scale={[2.08, 1.64, 1]} color="#1f2f2a" /><Arch name="home-v73-inner-service-apse-frame" position={[0, 1.58, -10.34]} scale={[1.38, 1.14, 1]} color="#2c3d36" />
    <Arch name="home-v73-foreground-threshold-left" position={[-4.48, 1.24, -9.96]} rotation={[0.02, 0.12, 0]} scale={[0.84, 0.96, 1]} color="#202d29" /><Arch name="home-v73-foreground-threshold-right" position={[4.48, 1.24, -9.96]} rotation={[0.02, -0.12, 0]} scale={[0.84, 0.96, 1]} color="#202d29" />
    {[0, 1, 2, 3, 4].map((index) => <VaultRib key={index} index={index} z={-6.6 - index * 0.76} warm={index % 2 === 0} />)}
    <Mass name="home-v73-port-load-bearing-wall-mass" position={[-5.15, 1.46, -7.55]} rotation={[0, 0.12, 0.02]} scale={[0.82, 3.22, 3.20]} color="#1a2824" /><Mass name="home-v73-starboard-load-bearing-wall-mass" position={[5.15, 1.46, -7.55]} rotation={[0, -0.12, -0.02]} scale={[0.82, 3.22, 3.20]} color="#1a2824" />
    <Mass name="home-v73-port-service-pier" position={[-2.32, 1.48, -10.10]} rotation={[0, -0.08, 0.06]} scale={[0.34, 2.88, 0.38]} color="#31423b" metalness={0.28} roughness={0.58} /><Mass name="home-v73-starboard-service-pier" position={[2.32, 1.48, -10.10]} rotation={[0, 0.08, -0.06]} scale={[0.34, 2.88, 0.38]} color="#31423b" metalness={0.28} roughness={0.58} />
    <Mass name="home-v73-orb-integrated-rear-spine" position={[0, 2.02, -10.42]} scale={[0.38, 3.25, 0.40]} color="#273a34" metalness={0.42} roughness={0.48} /><Mass name="home-v73-orb-upper-crosshead" position={[0, 3.46, -9.86]} scale={[2.62, 0.20, 0.32]} color="#3c4c44" metalness={0.52} roughness={0.44} /><Mass name="home-v73-orb-lower-cradle" position={[0, 0.72, -9.76]} scale={[2.18, 0.18, 0.28]} color="#2a3a34" metalness={0.46} roughness={0.52} /><Mass name="home-v73-orb-port-jaw" position={[-1.12, 2.04, -9.72]} rotation={[0, 0, -0.18]} scale={[0.15, 2.22, 0.28]} color="#3a4a42" metalness={0.48} roughness={0.46} /><Mass name="home-v73-orb-starboard-jaw" position={[1.12, 2.04, -9.72]} rotation={[0, 0, 0.18]} scale={[0.15, 2.22, 0.28]} color="#3a4a42" metalness={0.48} roughness={0.46} />
    <ArmoredOrb />
    {[-2.20, -1.18, 1.18, 2.20].map((x, index) => <group key={x} name={`home-v73-floor-conduit-bank-${index}`} position={[x, 0.02, -6.0 - index * 0.20]} rotation={[-0.04, x > 0 ? -0.10 : 0.10, 0]}><Mass name={`home-v73-floor-conduit-${index}-a`} position={[0, 0, 0]} scale={[0.18, 0.08, 3.6]} color="#1c2825" metalness={0.34} roughness={0.54} /><Mass name={`home-v73-floor-conduit-${index}-b`} position={[x > 0 ? 0.24 : -0.24, 0.04, 0.12]} scale={[0.09, 0.06, 3.1]} color="#34443d" metalness={0.42} roughness={0.50} /></group>)}
  </group></>
}

export function HomeV73RetainedPixelOverlay() {
  const [reducedMotion, setReducedMotion] = useState(false)
  useEffect(() => { const mq = window.matchMedia('(prefers-reduced-motion: reduce)'); const apply = () => setReducedMotion(mq.matches); apply(); mq.addEventListener?.('change', apply); return () => mq.removeEventListener?.('change', apply) }, [])
  return <div aria-hidden="true" data-home-v73-retained-pixel-overlay="depth-industrial-sanctuary" data-home-v73-reduced-motion={reducedMotion ? 'true' : 'false'} style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 4 }}><Canvas dpr={1} shadows camera={{ position: [0, 1.59, 4.6], fov: 46, near: 0.1, far: 110 }} gl={{ alpha: true, antialias: true, powerPreference: 'high-performance' }} onCreated={({ gl }) => { gl.setClearColor(0x000000, 0); gl.outputColorSpace = THREE.SRGBColorSpace; gl.toneMapping = THREE.ACESFilmicToneMapping; gl.toneMappingExposure = 1.28; gl.shadowMap.type = THREE.PCFSoftShadowMap }}><Scene reducedMotion={reducedMotion} /></Canvas></div>
}
