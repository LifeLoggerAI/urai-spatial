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
  metal: string
}

type HomeSpatialCanvasProps = {
  onOrbOpen: () => void
  webglAvailable: true
}

const portals: readonly PortalSpec[] = [
  { id: 'ground', label: 'Ground', detail: 'Private workforce', href: '/ground?from=home-spatial', position: [-2.75, 0.08, -2.4], rotationY: 0.14, color: '#70e1bd', metal: '#354e49' },
  { id: 'life-map', label: 'Life Map', detail: 'Memory sky', href: '/life-map?from=home-sky', position: [2.75, 0.08, -2.4], rotationY: -0.14, color: '#b49bff', metal: '#403a57' },
  { id: 'mirror', label: 'Mirror', detail: 'Pattern realm', href: '/mirror', position: [-5.2, 0.08, 0.75], rotationY: 0.68, color: '#82ddff', metal: '#344b59' },
  { id: 'passport', label: 'Passport', detail: 'Ownership vault', href: '/passport', position: [5.2, 0.08, 0.75], rotationY: -0.68, color: '#f1ca72', metal: '#574a35' },
  { id: 'xr', label: 'XR', detail: 'Enter the world', href: '/spatial/ar-vr', position: [0, 0.08, -5.4], rotationY: 0, color: '#62e6f2', metal: '#31505a' },
]

const TREES: readonly [number, number, number, number][] = [
  [-8.4, 0, -7.2, 1.15], [-5.8, 0, -9.2, 0.92], [-1.8, 0, -11.2, 1.04],
  [2.8, 0, -11, 0.96], [7.8, 0, -8, 1.08], [9.8, 0, -2.5, 0.88],
  [-9.8, 0, -2.2, 0.96], [-8.8, 0, 5, 0.86], [8.9, 0, 5.1, 0.94],
]

const HILLS: readonly [number, number, number, number, number, number][] = [
  [-12.5, 0.3, -9.5, 4.5, 1.4, 3.8], [-7.5, 0.25, -16, 4.8, 1.2, 3.8],
  [7.5, 0.28, -16, 5, 1.35, 4], [12.5, 0.32, -9, 4.5, 1.45, 3.8],
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
  const { camera, size } = useThree()

  useEffect(() => {
    const mobile = size.width < 720
    camera.position.set(0, mobile ? 7.2 : 5.25, mobile ? 24.5 : 14.6)
    if (camera instanceof THREE.PerspectiveCamera) {
      camera.fov = mobile ? 64 : 50
      camera.updateProjectionMatrix()
    }
    camera.lookAt(0, 1.4, -2.35)
  }, [camera, size.width])

  return null
}

function Tree({ position, scale = 1 }: { position: [number, number, number]; scale?: number }) {
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 0.9, 0]} castShadow>
        <cylinderGeometry args={[0.12, 0.22, 1.8, 12]} />
        <meshStandardMaterial color="#6c4d38" roughness={0.94} />
      </mesh>
      <mesh position={[0, 2.1, 0]} castShadow>
        <icosahedronGeometry args={[0.9, 3]} />
        <meshStandardMaterial color="#3f7054" roughness={0.82} />
      </mesh>
      <mesh position={[0.28, 2.65, -0.08]} castShadow>
        <icosahedronGeometry args={[0.55, 3]} />
        <meshStandardMaterial color="#57906a" roughness={0.78} />
      </mesh>
    </group>
  )
}

function HorizonMonoliths() {
  return (
    <group position={[0, 0, -13.5]} data-testid="urai-home-horizon-architecture">
      {[-8.5, -6.2, -3.3, 3.3, 6.2, 8.5].map((x, index) => (
        <group key={x} position={[x, 0, index % 2 ? 0.8 : 0]}>
          <mesh position={[0, 2.4 + (index % 3) * 0.45, 0]} castShadow>
            <boxGeometry args={[0.42, 4.8 + (index % 3) * 0.9, 0.85]} />
            <meshStandardMaterial color="#243a42" emissive={index % 2 ? '#66d9d2' : '#8d7ad6'} emissiveIntensity={0.08} roughness={0.52} metalness={0.34} />
          </mesh>
          <mesh position={[0, 2.5 + (index % 3) * 0.45, 0.46]}>
            <boxGeometry args={[0.08, 3.5 + (index % 3) * 0.6, 0.025]} />
            <meshBasicMaterial color={index % 2 ? '#7ee8de' : '#bdadff'} transparent opacity={0.46} toneMapped={false} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

function LivingGround() {
  return (
    <group data-testid="urai-home-living-ground">
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.12, -1.5]} receiveShadow>
        <planeGeometry args={[48, 48]} />
        <meshStandardMaterial color="#223d34" roughness={0.9} metalness={0.04} />
      </mesh>
      <mesh position={[0, -0.035, -1.5]} receiveShadow data-testid="urai-home-horizontal-plaza">
        <cylinderGeometry args={[6.3, 6.8, 0.12, 128]} />
        <meshStandardMaterial color="#334a45" roughness={0.64} metalness={0.18} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, -1.5]}>
        <ringGeometry args={[2.15, 2.3, 128]} />
        <meshBasicMaterial color="#79eef3" transparent opacity={0.78} toneMapped={false} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.045, -1.5]}>
        <ringGeometry args={[3.8, 3.9, 128]} />
        <meshBasicMaterial color="#8de6ce" transparent opacity={0.34} toneMapped={false} />
      </mesh>

      {portals.map((portal) => {
        const x = portal.position[0] * 0.5
        const z = (portal.position[2] - 1.5) * 0.5
        const length = Math.max(2.8, Math.hypot(portal.position[0], portal.position[2] + 1.5) - 1.8)
        const angle = Math.atan2(portal.position[0], portal.position[2] + 1.5)
        return (
          <group key={`path-${portal.id}`} position={[x, 0, z]} rotation={[0, angle, 0]}>
            <mesh position={[0, 0.012, 0]} receiveShadow>
              <boxGeometry args={[1.04, 0.055, length]} />
              <meshStandardMaterial color="#8f9287" roughness={0.74} metalness={0.12} />
            </mesh>
            <mesh position={[0, 0.05, 0]}>
              <boxGeometry args={[0.08, 0.018, length * 0.94]} />
              <meshBasicMaterial color={portal.color} transparent opacity={0.72} toneMapped={false} />
            </mesh>
          </group>
        )
      })}

      {HILLS.map(([x, y, z, sx, sy, sz], index) => (
        <mesh key={`hill-${index}`} position={[x, y, z]} scale={[sx, sy, sz]} receiveShadow>
          <dodecahedronGeometry args={[1, 3]} />
          <meshStandardMaterial color={index % 2 ? '#304e40' : '#375747'} roughness={0.94} />
        </mesh>
      ))}

      {TREES.map(([x, y, z, scale], index) => <Tree key={`tree-${index}`} position={[x, y, z]} scale={scale} />)}
      <HorizonMonoliths />
    </group>
  )
}

function Orb({ reducedMotion, onOpen }: { reducedMotion: boolean; onOpen: () => void }) {
  const group = useRef<THREE.Group>(null)
  const outerRing = useRef<THREE.Mesh>(null)

  useFrame(({ clock }) => {
    if (!group.current || reducedMotion) return
    group.current.position.y = 2.05 + Math.sin(clock.elapsedTime * 1.1) * 0.1
    group.current.rotation.y = clock.elapsedTime * 0.2
    if (outerRing.current) outerRing.current.rotation.z = clock.elapsedTime * 0.28
  })

  return (
    <group ref={group} position={[0, 2.05, -1.5]} data-testid="urai-home-webgl-orb">
      <mesh castShadow onClick={(event: ThreeEvent<MouseEvent>) => { event.stopPropagation(); onOpen() }} onPointerOver={() => { document.body.style.cursor = 'pointer' }} onPointerOut={() => { document.body.style.cursor = 'default' }}>
        <sphereGeometry args={[0.62, 64, 64]} />
        <meshPhysicalMaterial color="#e9feff" emissive="#54e8f4" emissiveIntensity={2.8} roughness={0.06} metalness={0.25} clearcoat={1} clearcoatRoughness={0.03} />
      </mesh>
      <mesh ref={outerRing} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.98, 0.045, 18, 128]} />
        <meshBasicMaterial color="#a7f5f8" transparent opacity={0.9} toneMapped={false} />
      </mesh>
      <mesh rotation={[0.35, 0.1, 0]}>
        <torusGeometry args={[0.82, 0.025, 14, 112]} />
        <meshBasicMaterial color="#ffd98a" transparent opacity={0.62} toneMapped={false} />
      </mesh>
      <pointLight color="#79f3fa" intensity={14} distance={12} decay={2} />
      <Html center position={[0, -1.1, 0]} distanceFactor={9} transform sprite>
        <button type="button" className="urai-home-spatial-portal-label" onClick={onOpen}><strong>Orb</strong><span>private companion</span></button>
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
    const pulse = reducedMotion ? 1 : 1 + Math.sin(clock.elapsedTime * 1.5 + spec.position[0]) * 0.012
    group.current.scale.setScalar(hovered ? 1.035 : pulse)
  })

  const enter = (event: ThreeEvent<PointerEvent>) => { event.stopPropagation(); setHovered(true); document.body.style.cursor = 'pointer' }
  const leave = (event: ThreeEvent<PointerEvent>) => { event.stopPropagation(); setHovered(false); document.body.style.cursor = 'default' }
  const open = (event: ThreeEvent<MouseEvent>) => { event.stopPropagation(); onNavigate(spec.href) }

  return (
    <group ref={group} position={spec.position} rotation={[0, spec.rotationY, 0]} data-urai-home-portal={spec.id}>
      <mesh position={[0, 0.12, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[1.75, 2.05, 0.24, 72]} />
        <meshStandardMaterial color="#26383b" emissive={color} emissiveIntensity={0.08} roughness={0.48} metalness={0.42} />
      </mesh>
      <mesh position={[0, 0.27, 0]}>
        <ringGeometry args={[1.05, 1.55, 96]} />
        <meshBasicMaterial color={color} transparent opacity={hovered ? 0.42 : 0.2} side={THREE.DoubleSide} toneMapped={false} />
      </mesh>
      {[-1.18, 1.18].map((x) => (
        <group key={x} position={[x, 1.72, 0]}>
          <mesh castShadow receiveShadow>
            <cylinderGeometry args={[0.24, 0.36, 3.25, 18]} />
            <meshStandardMaterial color={spec.metal} emissive={color} emissiveIntensity={hovered ? 0.26 : 0.1} roughness={0.38} metalness={0.58} />
          </mesh>
          <mesh position={[0, 0.15, 0.28]}>
            <boxGeometry args={[0.07, 2.35, 0.035]} />
            <meshBasicMaterial color={color} transparent opacity={0.8} toneMapped={false} />
          </mesh>
        </group>
      ))}
      <mesh position={[0, 3.32, 0]} castShadow>
        <boxGeometry args={[2.75, 0.38, 0.78]} />
        <meshStandardMaterial color={spec.metal} emissive={color} emissiveIntensity={hovered ? 0.3 : 0.12} roughness={0.36} metalness={0.62} />
      </mesh>
      <mesh position={[0, 3.66, 0]}>
        <torusGeometry args={[1.28, 0.11, 18, 96, Math.PI]} />
        <meshStandardMaterial color="#b7c6c8" emissive={color} emissiveIntensity={0.32} roughness={0.28} metalness={0.72} />
      </mesh>
      <mesh position={[0, 1.72, 0.08]} onPointerOver={enter} onPointerOut={leave} onClick={open}>
        <planeGeometry args={[2.05, 2.95]} />
        <meshBasicMaterial color={color} transparent opacity={hovered ? 0.48 : 0.25} side={THREE.DoubleSide} depthWrite={false} toneMapped={false} />
      </mesh>
      <mesh position={[0, 1.73, 0.14]} scale={hovered ? [1.05, 1.34, 1.05] : [1, 1.28, 1]} onPointerOver={enter} onPointerOut={leave} onClick={open}>
        <torusGeometry args={[0.88, 0.045, 14, 96]} />
        <meshBasicMaterial color={color} transparent opacity={hovered ? 1 : 0.88} toneMapped={false} />
      </mesh>
      <mesh position={[0, 1.73, 0.18]} scale={[0.76, 1.08, 1]}>
        <torusGeometry args={[0.88, 0.018, 12, 96]} />
        <meshBasicMaterial color="#f5ffff" transparent opacity={0.34} toneMapped={false} />
      </mesh>
      <pointLight position={[0, 1.9, 0.7]} color={color} intensity={hovered ? 9 : 5.2} distance={8} decay={2} />
      <Html center position={[0, 4.12, 0]} distanceFactor={9} transform sprite>
        <Link href={spec.href} className="urai-home-spatial-portal-label" data-active={hovered ? 'true' : 'false'} onClick={() => { document.body.style.cursor = 'default' }} onFocus={() => setHovered(true)} onBlur={() => setHovered(false)} style={{ textDecoration: 'none' }}>
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
      <color attach="background" args={['#071821']} />
      <fog attach="fog" args={['#0b1d29', 30, 80]} />
      <ambientLight intensity={1.25} color="#dceff4" />
      <hemisphereLight args={['#dff6ff', '#24382d', 2.1]} />
      <directionalLight position={[-6, 12, 8]} intensity={4.1} color="#fff0d8" castShadow shadow-mapSize-width={1536} shadow-mapSize-height={1536} />
      <directionalLight position={[8, 6, -10]} intensity={2.2} color="#78c9ff" />
      <pointLight position={[0, 7, -7]} color="#b5efff" intensity={6} distance={28} />
      <Stars radius={62} depth={42} count={reducedMotion ? 900 : 1900} factor={3.8} saturation={0.18} fade speed={reducedMotion ? 0 : 0.16} />
      <LivingGround />
      <Orb reducedMotion={reducedMotion} onOpen={onOrbOpen} />
      {portals.map((spec) => <Portal key={spec.id} spec={spec} reducedMotion={reducedMotion} onNavigate={navigate} />)}
      <OrbitControls makeDefault enablePan={false} enableDamping={!reducedMotion} dampingFactor={0.07} rotateSpeed={0.36} zoomSpeed={0.5} minDistance={9} maxDistance={28} minPolarAngle={0.62} maxPolarAngle={1.42} minAzimuthAngle={-1.28} maxAzimuthAngle={1.28} target={[0, 1.4, -2.35]} />
    </>
  )
}

export default function HomeSpatialCanvas({ onOrbOpen, webglAvailable }: HomeSpatialCanvasProps) {
  const reducedMotion = useReducedMotion()

  useEffect(() => () => { document.body.style.cursor = 'default' }, [])

  if (!webglAvailable) return null

  return (
    <div className="urai-home-spatial-canvas-shell" data-home-spatial-renderer="webgl" data-webgl-ready="true" data-home-spatial-geometry="terrain-portals-orb" aria-label="Interactive spatial Home world">
      <Canvas className="urai-home-spatial-canvas" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} shadows frameloop="always" dpr={[1, 1.45]} camera={{ position: [0, 5.25, 14.6], fov: 50, near: 0.1, far: 110 }} gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }} onCreated={({ gl }) => {
        gl.outputColorSpace = THREE.SRGBColorSpace
        gl.toneMapping = THREE.ACESFilmicToneMapping
        gl.toneMappingExposure = 1.22
      }}>
        <Scene reducedMotion={reducedMotion} onOrbOpen={onOrbOpen} />
      </Canvas>
      <div className="urai-home-spatial-canvas-hint" aria-hidden="true"><span /> Drag to look · scroll to move · choose a doorway</div>
    </div>
  )
}
