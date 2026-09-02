'use client'

import { Canvas, useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'

const STONE = '#26352f'
const STEEL = '#26332f'

function Mass({ name, position, rotation = [0, 0, 0], scale, color = STONE, metalness = 0.08, roughness = 0.72 }: { name: string; position: [number, number, number]; rotation?: [number, number, number]; scale: [number, number, number]; color?: string; metalness?: number; roughness?: number }) {
  return <mesh name={name} position={position} rotation={rotation} scale={scale} castShadow receiveShadow><boxGeometry args={[1, 1, 1, 4, 4, 4]} /><meshPhysicalMaterial color={color} metalness={metalness} roughness={roughness} clearcoat={0.08} clearcoatRoughness={0.78} envMapIntensity={0.62} /></mesh>
}

function Arch({ name, position, rotation = [0, 0, 0], scale, color = STONE }: { name: string; position: [number, number, number]; rotation?: [number, number, number]; scale: [number, number, number]; color?: string }) {
  const geometry = useMemo(() => {
    const outer = new THREE.Shape()
    outer.moveTo(-1.28, -1.18); outer.lineTo(1.28, -1.18); outer.lineTo(1.28, 0.74); outer.absarc(0, 0.74, 1.28, 0, Math.PI, false); outer.lineTo(-1.28, -1.18)
    const inner = new THREE.Path()
    inner.moveTo(-0.68, -1.04); inner.lineTo(-0.68, 0.58); inner.absarc(0, 0.58, 0.68, Math.PI, 0, true); inner.lineTo(0.68, -1.04); inner.closePath()
    outer.holes.push(inner)
    const result = new THREE.ExtrudeGeometry(outer, { depth: 0.28, bevelEnabled: true, bevelSegments: 5, bevelSize: 0.06, bevelThickness: 0.08, curveSegments: 40 })
    result.center(); return result
  }, [])
  return <mesh name={name} geometry={geometry} position={position} rotation={rotation} scale={scale} castShadow receiveShadow><meshPhysicalMaterial color={color} metalness={0.10} roughness={0.84} clearcoat={0.06} envMapIntensity={0.54} /></mesh>
}

function VaultRib({ index, z, warm }: { index: number; z: number; warm: boolean }) {
  return <group name={`home-v73-vault-rib-${index}`} position={[0, 2.84 + index * 0.04, z]}>
    <Mass name={`home-v73-rib-${index}-port`} position={[-0.92, -1.42, 0]} scale={[0.16, 2.42, 0.24]} color={STEEL} metalness={0.38} roughness={0.56} />
    <Mass name={`home-v73-rib-${index}-starboard`} position={[0.92, -1.42, 0]} scale={[0.16, 2.42, 0.24]} color={STEEL} metalness={0.38} roughness={0.56} />
    <mesh name={`home-v73-rib-${index}-arch`} rotation={[Math.PI / 2, 0, 0]} castShadow receiveShadow><torusGeometry args={[0.92, 0.055, 10, 32, Math.PI]} /><meshPhysicalMaterial color={warm ? '#3b3227' : STEEL} metalness={0.42} roughness={0.52} /></mesh>
    <pointLight position={[0, -0.12, 0.10]} color={warm ? '#d6a86a' : '#91b8aa'} intensity={0.24} distance={3.2} decay={2} />
  </group>
}

function Scene() {
  const root = useRef<THREE.Group>(null)
  useFrame(({ clock }) => { if (root.current) root.current.rotation.y = Math.sin(clock.elapsedTime * 0.18) * 0.006 })
  return <group ref={root} name="home-v73-retained-pixel-depth-compositor" position={[0, 0.04, -0.2]} userData={{ retainedPixelRepair: 'v73-depth-industrial-sanctuary-compositor', runtimeOwner: 'HomeWorldProductionV70' }}>
    <ambientLight intensity={0.18} />
    <directionalLight position={[-3.8, 5.4, 4.6]} intensity={1.05} color="#d9c09b" castShadow />
    <directionalLight position={[3.2, 3.4, 2.4]} intensity={0.34} color="#8eb6a8" />
    <pointLight position={[0, 1.4, -3.0]} color="#d9a764" intensity={0.75} distance={5.8} decay={2} />
    <pointLight position={[0, 1.8, -5.2]} color="#8bb6a8" intensity={0.64} distance={5.2} decay={2} />
    <Arch name="home-v73-deep-aperture-stone-frame" position={[0, 1.68, -4.82]} scale={[1.88, 1.54, 1]} color="#1f2f2a" />
    <Arch name="home-v73-inner-service-apse-frame" position={[0, 1.58, -5.22]} scale={[1.26, 1.08, 1]} color="#2c3d36" />
    <Arch name="home-v73-foreground-threshold-left" position={[-2.95, 1.05, -1.92]} rotation={[0.02, 0.24, 0]} scale={[0.72, 0.82, 1]} color="#202d29" />
    <Arch name="home-v73-foreground-threshold-right" position={[2.95, 1.05, -1.92]} rotation={[0.02, -0.24, 0]} scale={[0.72, 0.82, 1]} color="#202d29" />
    {[0, 1, 2, 3, 4].map((index) => <VaultRib key={index} index={index} z={-2.52 - index * 0.52} warm={index % 2 === 0} />)}
    <Mass name="home-v73-port-load-bearing-wall-mass" position={[-3.75, 1.10, -3.25]} rotation={[0, 0.16, 0.02]} scale={[0.74, 2.72, 2.24]} color="#1a2824" />
    <Mass name="home-v73-starboard-load-bearing-wall-mass" position={[3.75, 1.10, -3.25]} rotation={[0, -0.16, -0.02]} scale={[0.74, 2.72, 2.24]} color="#1a2824" />
    <Mass name="home-v73-port-service-pier" position={[-2.12, 1.38, -4.72]} rotation={[0, -0.08, 0.06]} scale={[0.30, 2.68, 0.34]} color="#31423b" metalness={0.28} roughness={0.58} />
    <Mass name="home-v73-starboard-service-pier" position={[2.12, 1.38, -4.72]} rotation={[0, 0.08, -0.06]} scale={[0.30, 2.68, 0.34]} color="#31423b" metalness={0.28} roughness={0.58} />
    <Mass name="home-v73-orb-integrated-rear-spine" position={[0, 1.95, -4.56]} scale={[0.34, 2.95, 0.34]} color="#273a34" metalness={0.42} roughness={0.48} />
    <Mass name="home-v73-orb-upper-crosshead" position={[0, 2.94, -4.24]} scale={[2.24, 0.18, 0.28]} color="#3c4c44" metalness={0.52} roughness={0.44} />
    <Mass name="home-v73-orb-lower-cradle" position={[0, 0.92, -4.14]} scale={[1.86, 0.16, 0.24]} color="#2a3a34" metalness={0.46} roughness={0.52} />
    <Mass name="home-v73-orb-port-jaw" position={[-0.92, 1.88, -4.06]} rotation={[0, 0, -0.18]} scale={[0.13, 1.92, 0.24]} color="#3a4a42" metalness={0.48} roughness={0.46} />
    <Mass name="home-v73-orb-starboard-jaw" position={[0.92, 1.88, -4.06]} rotation={[0, 0, 0.18]} scale={[0.13, 1.92, 0.24]} color="#3a4a42" metalness={0.48} roughness={0.46} />
    <mesh name="home-v73-continuous-armored-ovoid-read" position={[0, 1.92, -3.82]} scale={[0.54, 0.92, 0.44]} castShadow receiveShadow><sphereGeometry args={[1, 40, 32]} /><meshPhysicalMaterial color="#203d35" emissive="#264d42" emissiveIntensity={0.17} metalness={0.36} roughness={0.52} clearcoat={0.18} clearcoatRoughness={0.62} /></mesh>
    <mesh name="home-v73-vertical-orb-aperture" position={[0, 1.92, -3.38]} scale={[0.055, 0.78, 0.04]}><boxGeometry args={[1, 1, 1]} /><meshBasicMaterial color="#f4d091" toneMapped={false} /></mesh>
    {[-1.86, -0.98, 0.98, 1.86].map((x, index) => <group key={x} name={`home-v73-floor-conduit-bank-${index}`} position={[x, 0.02, -2.4 - index * 0.22]} rotation={[-0.04, x > 0 ? -0.16 : 0.16, 0]}><Mass name={`home-v73-floor-conduit-${index}-a`} position={[0, 0, 0]} scale={[0.16, 0.08, 1.92]} color="#1c2825" metalness={0.34} roughness={0.54} /><Mass name={`home-v73-floor-conduit-${index}-b`} position={[x > 0 ? 0.22 : -0.22, 0.04, 0.12]} scale={[0.08, 0.06, 1.62]} color="#34443d" metalness={0.42} roughness={0.50} /></group>)}
  </group>
}

export function HomeV73RetainedPixelOverlay() {
  return <div aria-hidden="true" data-home-v73-retained-pixel-overlay="depth-industrial-sanctuary" style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 4 }}><Canvas dpr={1} shadows camera={{ position: [0, 1.55, 4.85], fov: 42, near: 0.1, far: 28 }} gl={{ alpha: true, antialias: true, powerPreference: 'high-performance' }} onCreated={({ gl }) => { gl.setClearColor(0x000000, 0); gl.outputColorSpace = THREE.SRGBColorSpace; gl.toneMapping = THREE.ACESFilmicToneMapping; gl.toneMappingExposure = 1.28; gl.shadowMap.type = THREE.PCFSoftShadowMap }}><Scene /></Canvas></div>
}
