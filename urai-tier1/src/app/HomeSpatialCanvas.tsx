'use client'

import { Html, OrbitControls, Stars } from '@react-three/drei'
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'

type PortalSpec = {
  id: 'ground' | 'life-map' | 'mirror' | 'passport' | 'xr'
  label: string
  detail: string
  href: string
  position: [number, number, number]
  rotationY: number
  color: string
}

type HomeSpatialCanvasProps = {
  onOrbOpen: () => void
  webglAvailable: true
}

const portals: readonly PortalSpec[] = [
  { id: 'ground', label: 'Ground', detail: 'Private workforce', href: '/ground?from=home-spatial', position: [-4.6, 0.08, -4.4], rotationY: 0.28, color: '#70e1bd' },
  { id: 'life-map', label: 'Life Map', detail: 'Memory sky', href: '/life-map?from=home-sky', position: [4.6, 0.08, -4.4], rotationY: -0.28, color: '#b49bff' },
  { id: 'mirror', label: 'Mirror', detail: 'Pattern realm', href: '/mirror', position: [-7.2, 0.08, 0.8], rotationY: 0.9, color: '#82ddff' },
  { id: 'passport', label: 'Passport', detail: 'Ownership vault', href: '/passport', position: [7.2, 0.08, 0.8], rotationY: -0.9, color: '#f1ca72' },
  { id: 'xr', label: 'XR', detail: 'Enter the world', href: '/spatial/ar-vr', position: [0, 0.08, -9], rotationY: 0, color: '#62e6f2' },
]

const TREES: readonly [number, number, number, number][] = [
  [-8.5, 0, -7.4, 1.1], [-5.8, 0, -9.6, 0.92], [-1.4, 0, -11.4, 1],
  [3.2, 0, -11.2, 0.94], [8, 0, -8.2, 1.08], [10.4, 0, -2.8, 0.92],
  [-10.5, 0, -2.2, 1], [-9.8, 0, 5, 0.9], [9.8, 0, 5.2, 1],
]

let cachedWebGLAvailable: boolean | null = null

function useReducedMotion() {
  const [reducedMotion, setReducedMotion] = useState(false)

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReducedMotion(query.matches)
    update()

    if (typeof query.addEventListener === 'function') {
      query.addEventListener('change', update)
      return () => query.removeEventListener('change', update)
    }

    query.addListener(update)
    return () => query.removeListener(update)
  }, [])

  return reducedMotion
}

export function useWebGLAvailable() {
  const [available, setAvailable] = useState<boolean | null>(null)

  useEffect(() => {
    if (cachedWebGLAvailable !== null) {
      setAvailable(cachedWebGLAvailable)
      return
    }

    try {
      const canvas = document.createElement('canvas')
      const isAvailable = Boolean(canvas.getContext('webgl2') ?? canvas.getContext('webgl'))
      cachedWebGLAvailable = isAvailable
      setAvailable(isAvailable)
    } catch {
      cachedWebGLAvailable = false
      setAvailable(false)
    }
  }, [])

  return available
}

function FirstHomeFrame() {
  const marked = useRef(false)
  useFrame(() => {
    if (marked.current) return
    marked.current = true
    if (performance.getEntriesByName('urai:first-home-spatial-frame').length === 0) {
      performance.mark('urai:first-home-spatial-frame')
    }
  })
  return null
}

function CameraRig() {
  const { camera } = useThree()

  useEffect(() => {
    camera.position.set(0, 5.1, 12.8)
    camera.lookAt(0, 1.15, -2.2)
    camera.updateProjectionMatrix()
  }, [camera])

  return null
}

function Tree({ position, scale = 1 }: { position: [number, number, number]; scale?: number }) {
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 0.9, 0]} castShadow>
        <cylinderGeometry args={[0.12, 0.2, 1.8, 10]} />
        <meshStandardMaterial color="#725139" roughness={1} />
      </mesh>
      <mesh position={[0, 2.1, 0]} castShadow>
        <icosahedronGeometry args={[0.9, 2]} />
        <meshStandardMaterial color="#477357" roughness={0.92} />
      </mesh>
      <mesh position={[0.28, 2.65, -0.08]} castShadow>
        <icosahedronGeometry args={[0.55, 2]} />
        <meshStandardMaterial color="#5a8b64" roughness={0.9} />
      </mesh>
    </group>
  )
}

function LivingGround() {
  return (
    <group data-testid="urai-home-living-ground">
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.12, -1.5]} receiveShadow>
        <circleGeometry args={[18, 128]} />
        <meshStandardMaterial color="#29463a" roughness={0.94} metalness={0.02} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.04, -1.5]} receiveShadow>
        <circleGeometry args={[6.2, 96]} />
        <meshStandardMaterial color="#344b46" roughness={0.82} metalness={0.08} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, -1.5]}>
        <ringGeometry args={[2.15, 2.28, 96]} />
        <meshBasicMaterial color="#79eef3" transparent opacity={0.72} toneMapped={false} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.015, -1.5]}>
        <ringGeometry args={[3.8, 3.87, 96]} />
        <meshBasicMaterial color="#8de6ce" transparent opacity={0.3} toneMapped={false} />
      </mesh>

      {portals.map((portal) => {
        const x = portal.position[0] * 0.5
        const z = (portal.position[2] - 1.5) * 0.5
        const length = Math.max(2.8, Math.hypot(portal.position[0], portal.position[2] + 1.5) - 2.2)
        const angle = Math.atan2(portal.position[0], portal.position[2] + 1.5)
        return (
          <mesh key={`path-${portal.id}`} position={[x, 0.015, z]} rotation={[0, angle, 0]} receiveShadow>
            <boxGeometry args={[0.92, 0.045, length]} />
            <meshStandardMaterial color="#9f9b88" roughness={0.88} metalness={0.06} />
          </mesh>
        )
      })}

      {[
        [-13, 0.5, -8, 5.5, 2.4, 4.5], [-8, 0.38, -14, 7, 2.2, 5.2],
        [8, 0.42, -14, 7.4, 2.5, 5.4], [13, 0.5, -7, 5.5, 2.5, 4.5],
      ].map(([x, y, z, sx, sy, sz], index) => (
        <mesh key={`hill-${index}`} position={[x, y, z]} scale={[sx, sy, sz]} receiveShadow>
          <dodecahedronGeometry args={[1, 2]} />
          <meshStandardMaterial color={index % 2 ? '#355445' : '#3c5d4a'} roughness={1} />
        </mesh>
      ))}

      {TREES.map(([x, y, z, scale], index) => <Tree key={`tree-${index}`} position={[x, y, z]} scale={scale} />)}
    </group>
  )
}

function Orb({ reducedMotion, onOpen }: { reducedMotion: boolean; onOpen: () => void }) {
  const group = useRef<THREE.Group>(null)
  const outerRing = useRef<THREE.Mesh>(null)

  useFrame(({ clock }) => {
    if (!group.current) return
    if (!reducedMotion) {
      group.current.position.y = 1.9 + Math.sin(clock.elapsedTime * 1.1) * 0.1
      group.current.rotation.y = clock.elapsedTime * 0.2
      if (outerRing.current) outerRing.current.rotation.z = clock.elapsedTime * 0.28
    }
  })

  return (
    <group ref={group} position={[0, 1.9, -1.5]} data-testid="urai-home-webgl-orb">
      <mesh
        castShadow
        onClick={(event: ThreeEvent<MouseEvent>) => { event.stopPropagation(); onOpen() }}
        onPointerOver={() => { document.body.style.cursor = 'pointer' }}
        onPointerOut={() => { document.body.style.cursor = 'default' }}
      >
        <sphereGeometry args={[0.62, 56, 56]} />
        <meshPhysicalMaterial color="#e9feff" emissive="#54e8f4" emissiveIntensity={2.8} roughness={0.08} metalness={0.22} clearcoat={1} clearcoatRoughness={0.04} />
      </mesh>
      <mesh ref={outerRing} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.98, 0.045, 16, 112]} />
        <meshBasicMaterial color="#a7f5f8" transparent opacity={0.9} toneMapped={false} />
      </mesh>
      <mesh rotation={[0.35, 0.1, 0]}>
        <torusGeometry args={[0.82, 0.025, 12, 96]} />
        <meshBasicMaterial color="#ffd98a" transparent opacity={0.62} toneMapped={false} />
      </mesh>
      <pointLight color="#79f3fa" intensity={14} distance={12} decay={2} />
      <Html center position={[0, -1.1, 0]} distanceFactor={9} transform sprite>
        <button type="button" className="urai-home-spatial-portal-label" onClick={onOpen}>
          <strong>Orb</strong><span>private companion</span>
        </button>
      </Html>
    </group>
  )
}

function Portal({ spec, reducedMotion, onNavigate }: { spec: PortalSpec; reducedMotion: boolean; onNavigate: (href: string) => void }) {
  const group = useRef<THREE.Group>(null)
  const [hovered, setHovered] = useState(false)
  const color = useMemo(() => new THREE.Color(spec.color), [spec.color])

  useFrame(({ clock }) => {
    if (!group.current) return
    const pulse = reducedMotion ? 1 : 1 + Math.sin(clock.elapsedTime * 1.5 + spec.position[0]) * 0.018
    group.current.scale.setScalar(hovered ? 1.045 : pulse)
  })

  const enter = (event: ThreeEvent<PointerEvent>) => { event.stopPropagation(); setHovered(true); document.body.style.cursor = 'pointer' }
  const leave = (event: ThreeEvent<PointerEvent>) => { event.stopPropagation(); setHovered(false); document.body.style.cursor = 'default' }
  const open = (event: ThreeEvent<MouseEvent>) => { event.stopPropagation(); onNavigate(spec.href) }

  return (
    <group ref={group} position={spec.position} rotation={[0, spec.rotationY, 0]} data-urai-home-portal={spec.id}>
      <mesh position={[-1.12, 1.65, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.38, 3.3, 0.68]} />
        <meshStandardMaterial color="#aaa69b" emissive={color} emissiveIntensity={hovered ? 0.24 : 0.08} roughness={0.76} metalness={0.12} />
      </mesh>
      <mesh position={[1.12, 1.65, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.38, 3.3, 0.68]} />
        <meshStandardMaterial color="#aaa69b" emissive={color} emissiveIntensity={hovered ? 0.24 : 0.08} roughness={0.76} metalness={0.12} />
      </mesh>
      <mesh position={[0, 3.28, 0]} castShadow>
        <boxGeometry args={[2.62, 0.38, 0.72]} />
        <meshStandardMaterial color="#aaa69b" emissive={color} emissiveIntensity={hovered ? 0.24 : 0.08} roughness={0.76} metalness={0.12} />
      </mesh>
      <mesh position={[0, 1.66, 0.08]} onPointerOver={enter} onPointerOut={leave} onClick={open}>
        <planeGeometry args={[1.95, 2.9]} />
        <meshBasicMaterial color={color} transparent opacity={hovered ? 0.44 : 0.23} side={THREE.DoubleSide} depthWrite={false} toneMapped={false} />
      </mesh>
      <mesh
        position={[0, 1.67, 0.14]}
        scale={hovered ? [1.05, 1.34, 1.05] : [1, 1.28, 1]}
        onPointerOver={enter}
        onPointerOut={leave}
        onClick={open}
      >
        <torusGeometry args={[0.88, 0.045, 14, 96]} />
        <meshBasicMaterial color={color} transparent opacity={hovered ? 1 : 0.88} toneMapped={false} />
      </mesh>
      <pointLight position={[0, 1.8, 0.7]} color={color} intensity={hovered ? 8 : 4.6} distance={7.5} decay={2} />
      <Html center position={[0, 3.95, 0]} distanceFactor={9} transform sprite>
        <Link
          href={spec.href}
          className="urai-home-spatial-portal-label"
          data-active={hovered ? 'true' : 'false'}
          onClick={() => { document.body.style.cursor = 'default' }}
          onFocus={() => setHovered(true)}
          onBlur={() => setHovered(false)}
          style={{ textDecoration: 'none' }}
        >
          <strong>{spec.label}</strong><span>{spec.detail}</span>
        </Link>
      </Html>
    </group>
  )
}

function Scene({ reducedMotion, onOrbOpen }: { reducedMotion: boolean; onOrbOpen: () => void }) {
  const router = useRouter()
  const navigate = useCallback((href: string) => { document.body.style.cursor = 'default'; router.push(href) }, [router])

  return (
    <>
      <FirstHomeFrame />
      <CameraRig />
      <color attach="background" args={['#091b29']} />
      <fog attach="fog" args={['#0b1d29', 20, 58]} />
      <ambientLight intensity={1.25} color="#dceff4" />
      <hemisphereLight args={['#dff6ff', '#24382d', 2.1]} />
      <directionalLight position={[-6, 12, 8]} intensity={4.1} color="#fff0d8" castShadow shadow-mapSize-width={1536} shadow-mapSize-height={1536} />
      <directionalLight position={[8, 6, -10]} intensity={2.2} color="#78c9ff" />
      <pointLight position={[0, 7, -7]} color="#b5efff" intensity={6} distance={28} />
      <Stars radius={62} depth={42} count={reducedMotion ? 900 : 1900} factor={3.8} saturation={0.18} fade speed={reducedMotion ? 0 : 0.16} />
      <LivingGround />
      <Orb reducedMotion={reducedMotion} onOpen={onOrbOpen} />
      {portals.map((spec) => <Portal key={spec.id} spec={spec} reducedMotion={reducedMotion} onNavigate={navigate} />)}
      <OrbitControls
        makeDefault
        enablePan={false}
        enableDamping={!reducedMotion}
        dampingFactor={0.07}
        rotateSpeed={0.4}
        zoomSpeed={0.58}
        minDistance={7.4}
        maxDistance={17}
        minPolarAngle={0.68}
        maxPolarAngle={1.45}
        minAzimuthAngle={-1.35}
        maxAzimuthAngle={1.35}
        target={[0, 1.15, -2.2]}
      />
    </>
  )
}

export default function HomeSpatialCanvas({ onOrbOpen, webglAvailable }: HomeSpatialCanvasProps) {
  const reducedMotion = useReducedMotion()

  useEffect(() => () => { document.body.style.cursor = 'default' }, [])

  if (!webglAvailable) return null

  return (
    <div
      className="urai-home-spatial-canvas-shell"
      data-home-spatial-renderer="webgl"
      data-webgl-ready="true"
      data-home-spatial-geometry="terrain-portals-orb"
      aria-label="Interactive spatial Home world"
    >
      <Canvas
        className="urai-home-spatial-canvas"
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
        shadows
        frameloop="always"
        dpr={[1, 1.45]}
        camera={{ position: [0, 5.1, 12.8], fov: 50, near: 0.1, far: 100 }}
        gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
        onCreated={({ gl }) => {
          gl.outputColorSpace = THREE.SRGBColorSpace
          gl.toneMapping = THREE.ACESFilmicToneMapping
          gl.toneMappingExposure = 1.32
        }}
      >
        <Scene reducedMotion={reducedMotion} onOrbOpen={onOrbOpen} />
      </Canvas>
      <div className="urai-home-spatial-canvas-hint" aria-hidden="true"><span /> Drag to look · scroll to move · choose a doorway</div>
    </div>
  )
}
