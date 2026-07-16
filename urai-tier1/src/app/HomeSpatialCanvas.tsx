'use client'

import { Html, OrbitControls, Stars } from '@react-three/drei'
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'

type HomeSpatialCanvasProps = {
  onOrbOpen: () => void
  webglAvailable: true
}

const TREES: readonly [number, number, number, number][] = [
  [-8.4, 0, -7.2, 1.15], [-5.8, 0, -9.2, 0.92], [-1.8, 0, -11.2, 1.04],
  [2.8, 0, -11, 0.96], [7.8, 0, -8, 1.08], [9.8, 0, -2.5, 0.88],
  [-9.8, 0, -2.2, 0.96], [-8.8, 0, 5, 0.86], [8.9, 0, 5.1, 0.94],
]

const HILLS: readonly [number, number, number, number, number, number][] = [
  [-13, 0.5, -8, 5.5, 2.4, 4.5], [-8, 0.38, -14, 7, 2.2, 5.2],
  [8, 0.42, -14, 7.4, 2.5, 5.4], [13, 0.5, -7, 5.5, 2.5, 4.5],
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
    camera.position.set(0, mobile ? 6.4 : 5.25, mobile ? 19.2 : 14.6)
    if (camera instanceof THREE.PerspectiveCamera) {
      camera.fov = mobile ? 58 : 50
      camera.updateProjectionMatrix()
    }
    camera.lookAt(0, 1.35, -2.25)
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
    <group data-testid="urai-home-living-ground" data-tier0-ground-gateway="true">
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.12, -1.5]} receiveShadow>
        <planeGeometry args={[48, 48]} />
        <meshStandardMaterial color="#223d34" roughness={0.9} metalness={0.04} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.035, -1.5]} receiveShadow>
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

function Scene({ reducedMotion, onOrbOpen }: { reducedMotion: boolean; onOrbOpen: () => void }) {
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
      <OrbitControls makeDefault enablePan={false} enableDamping={!reducedMotion} dampingFactor={0.07} rotateSpeed={0.36} zoomSpeed={0.5} minDistance={9} maxDistance={20} minPolarAngle={0.62} maxPolarAngle={1.42} minAzimuthAngle={-1.28} maxAzimuthAngle={1.28} target={[0, 1.35, -2.25]} />
    </>
  )
}

export default function HomeSpatialCanvas({ onOrbOpen, webglAvailable }: HomeSpatialCanvasProps) {
  const reducedMotion = useReducedMotion()

  useEffect(() => () => { document.body.style.cursor = 'default' }, [])

  if (!webglAvailable) return null

  return (
    <div className="urai-home-spatial-canvas-shell" data-home-spatial-renderer="webgl" data-webgl-ready="true" data-home-spatial-geometry="terrain-orb-ground-gateway" aria-label="Interactive spatial Home world">
      <Canvas className="urai-home-spatial-canvas" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} shadows frameloop="always" dpr={[1, 1.45]} camera={{ position: [0, 5.25, 14.6], fov: 50, near: 0.1, far: 110 }} gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }} onCreated={({ gl }) => {
        gl.outputColorSpace = THREE.SRGBColorSpace
        gl.toneMapping = THREE.ACESFilmicToneMapping
        gl.toneMappingExposure = 1.22
      }}>
        <Scene reducedMotion={reducedMotion} onOrbOpen={onOrbOpen} />
      </Canvas>
      <div className="urai-home-spatial-canvas-hint" aria-hidden="true"><span /> Drag to look · tap the ground to enter below</div>
    </div>
  )
}
