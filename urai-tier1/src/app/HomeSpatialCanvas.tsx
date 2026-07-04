'use client'

import { Html, OrbitControls, Stars } from '@react-three/drei'
import { Canvas, useFrame, type ThreeEvent } from '@react-three/fiber'
import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing'
import dynamic from 'next/dynamic'
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'

type PortalSpec = {
  id: 'ground' | 'life-map' | 'mirror' | 'passport' | 'xr'
  label: string
  detail: string
  href: string
  position: readonly [number, number, number]
  rotationY: number
  color: string
}

const portalSpecs: readonly PortalSpec[] = [
  {
    id: 'ground',
    label: 'Ground',
    detail: 'Private workforce',
    href: '/ground?from=home-spatial',
    position: [-4.8, 0.05, -4.6],
    rotationY: 0.42,
    color: '#86d9b8',
  },
  {
    id: 'life-map',
    label: 'Life Map',
    detail: 'Memory sky',
    href: '/life-map?from=home-sky',
    position: [4.8, 0.05, -4.6],
    rotationY: -0.42,
    color: '#a997ef',
  },
  {
    id: 'mirror',
    label: 'Mirror',
    detail: 'Pattern realm',
    href: '/mirror',
    position: [-7.2, 0.05, 0.8],
    rotationY: 1.04,
    color: '#8fd7ef',
  },
  {
    id: 'passport',
    label: 'Passport',
    detail: 'Ownership vault',
    href: '/passport',
    position: [7.2, 0.05, 0.8],
    rotationY: -1.04,
    color: '#e5c274',
  },
  {
    id: 'xr',
    label: 'XR',
    detail: 'Enter the world',
    href: '/spatial/ar-vr',
    position: [0, 0.05, 6.2],
    rotationY: Math.PI,
    color: '#79dbe8',
  },
]

function useReducedMotionPreference() {
  const [reducedMotion, setReducedMotion] = useState(false)

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReducedMotion(query.matches)
    update()
    query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  }, [])

  return reducedMotion
}

function useWebGLAvailable() {
  const [available, setAvailable] = useState<boolean | null>(null)

  useEffect(() => {
    try {
      const canvas = document.createElement('canvas')
      const context = canvas.getContext('webgl2') ?? canvas.getContext('webgl')
      setAvailable(Boolean(context))
    } catch {
      setAvailable(false)
    }
  }, [])

  return available
}

function LivingTerrain() {
  const pathMaterial = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#9b978c', roughness: 0.95, metalness: 0.02 }),
    [],
  )

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.08, 0]} receiveShadow>
        <circleGeometry args={[15, 128]} />
        <meshStandardMaterial color="#15251f" roughness={0.94} metalness={0.01} />
      </mesh>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.045, 0]} receiveShadow>
        <ringGeometry args={[2.15, 4.2, 128]} />
        <meshStandardMaterial color="#232b29" roughness={0.86} metalness={0.06} />
      </mesh>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
        <ringGeometry args={[2.18, 2.27, 128]} />
        <meshBasicMaterial color="#8ce7ee" transparent opacity={0.34} toneMapped={false} />
      </mesh>

      {portalSpecs.map((portal) => {
        const x = portal.position[0] * 0.5
        const z = portal.position[2] * 0.5
        const length = Math.hypot(portal.position[0], portal.position[2]) - 2.2
        const angle = Math.atan2(portal.position[0], portal.position[2])
        return (
          <mesh
            key={`path-${portal.id}`}
            material={pathMaterial}
            rotation={[-Math.PI / 2, 0, -angle]}
            position={[x, -0.025, z]}
            receiveShadow
          >
            <planeGeometry args={[1.15, Math.max(2.4, length)]} />
          </mesh>
        )
      })}

      {[
        [-10, -8, 6.4, 2.8],
        [-4, -13, 7.2, 3.2],
        [5, -13.5, 8.6, 3.7],
        [12, -7, 7.2, 3.1],
        [-13, 3, 6.2, 2.7],
        [13, 4, 6.4, 2.9],
      ].map(([x, z, width, height], index) => (
        <mesh key={`hill-${index}`} position={[x, height * 0.15 - 0.2, z]} scale={[width, height, width * 0.7]} receiveShadow>
          <dodecahedronGeometry args={[1, 2]} />
          <meshStandardMaterial color={index % 2 === 0 ? '#26382e' : '#2c3e34'} roughness={1} />
        </mesh>
      ))}
    </group>
  )
}

function Tree({ position, scale = 1 }: { position: readonly [number, number, number]; scale?: number }) {
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 1.05, 0]} castShadow>
        <cylinderGeometry args={[0.13, 0.2, 2.1, 9]} />
        <meshStandardMaterial color="#60452f" roughness={1} />
      </mesh>
      <mesh position={[0, 2.35, 0]} castShadow>
        <icosahedronGeometry args={[0.95, 2]} />
        <meshStandardMaterial color="#365b43" roughness={0.98} />
      </mesh>
      <mesh position={[0.28, 2.95, -0.06]} castShadow>
        <icosahedronGeometry args={[0.62, 2]} />
        <meshStandardMaterial color="#496e4e" roughness={0.96} />
      </mesh>
    </group>
  )
}

function LandscapeDetails() {
  const trees = [
    [-8.6, 0, -7.8, 1.12],
    [-5.9, 0, -10.1, 0.92],
    [-1.2, 0, -11.6, 1.04],
    [3.4, 0, -11.2, 0.95],
    [8.1, 0, -8.6, 1.1],
    [10.7, 0, -3.1, 0.96],
    [-10.6, 0, -2.4, 1.02],
    [-10.1, 0, 5.1, 0.92],
    [10.2, 0, 5.4, 1.02],
  ] as const

  return (
    <group>
      {trees.map(([x, y, z, scale], index) => (
        <Tree key={`tree-${index}`} position={[x, y, z]} scale={scale} />
      ))}
      {[
        [-2.8, 0.18, 2.6],
        [2.8, 0.18, 2.6],
        [-6.1, 0.18, -1.2],
        [6.1, 0.18, -1.2],
      ].map(([x, y, z], index) => (
        <mesh key={`stone-${index}`} position={[x, y, z]} scale={[1.3, 0.42, 0.72]} castShadow receiveShadow>
          <dodecahedronGeometry args={[0.48, 1]} />
          <meshStandardMaterial color="#686b65" roughness={0.98} />
        </mesh>
      ))}
    </group>
  )
}

function OrbCompanion({ reducedMotion, onOpen }: { reducedMotion: boolean; onOpen: () => void }) {
  const groupRef = useRef<THREE.Group>(null)
  const haloRef = useRef<THREE.Mesh>(null)

  useFrame(({ clock }) => {
    if (!groupRef.current) return
    if (!reducedMotion) {
      groupRef.current.position.y = 1.85 + Math.sin(clock.elapsedTime * 1.15) * 0.08
      groupRef.current.rotation.y = clock.elapsedTime * 0.18
    }
    if (haloRef.current && !reducedMotion) haloRef.current.rotation.z = clock.elapsedTime * 0.22
  })

  return (
    <group ref={groupRef} position={[0, 1.85, 0]}>
      <mesh
        castShadow
        onClick={(event: ThreeEvent<MouseEvent>) => {
          event.stopPropagation()
          onOpen()
        }}
        onPointerOver={(event) => {
          event.stopPropagation()
          document.body.style.cursor = 'pointer'
        }}
        onPointerOut={() => {
          document.body.style.cursor = 'default'
        }}
      >
        <sphereGeometry args={[0.48, 48, 48]} />
        <meshPhysicalMaterial
          color="#d8fbff"
          emissive="#42dbea"
          emissiveIntensity={2.4}
          roughness={0.12}
          metalness={0.18}
          clearcoat={1}
          clearcoatRoughness={0.08}
        />
      </mesh>
      <mesh ref={haloRef} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.76, 0.035, 14, 96]} />
        <meshBasicMaterial color="#8ee8ef" transparent opacity={0.72} toneMapped={false} />
      </mesh>
      <mesh scale={2.2}>
        <sphereGeometry args={[0.48, 32, 32]} />
        <meshBasicMaterial color="#4fdde9" transparent opacity={0.055} depthWrite={false} toneMapped={false} />
      </mesh>
      <pointLight color="#70edf4" intensity={8} distance={9} decay={2} />
    </group>
  )
}

function PortalArch({ spec, onNavigate }: { spec: PortalSpec; onNavigate: (href: string) => void }) {
  const groupRef = useRef<THREE.Group>(null)
  const [hovered, setHovered] = useState(false)
  const color = useMemo(() => new THREE.Color(spec.color), [spec.color])

  useFrame(({ clock }) => {
    if (!groupRef.current) return
    const pulse = 1 + Math.sin(clock.elapsedTime * 1.7 + spec.position[0]) * 0.012
    groupRef.current.scale.setScalar(hovered ? 1.035 : pulse)
  })

  const enter = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation()
    setHovered(true)
    document.body.style.cursor = 'pointer'
  }

  const leave = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation()
    setHovered(false)
    document.body.style.cursor = 'default'
  }

  const open = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation()
    onNavigate(spec.href)
  }

  return (
    <group ref={groupRef} position={spec.position} rotation={[0, spec.rotationY, 0]}>
      <mesh position={[-1.05, 1.55, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.34, 3.1, 0.58]} />
        <meshStandardMaterial color="#77756f" roughness={0.88} metalness={0.04} />
      </mesh>
      <mesh position={[1.05, 1.55, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.34, 3.1, 0.58]} />
        <meshStandardMaterial color="#77756f" roughness={0.88} metalness={0.04} />
      </mesh>
      <mesh position={[0, 3.08, 0]} castShadow>
        <boxGeometry args={[2.44, 0.34, 0.62]} />
        <meshStandardMaterial color="#77756f" roughness={0.88} metalness={0.04} />
      </mesh>
      <mesh position={[0, 1.56, 0.03]} onPointerOver={enter} onPointerOut={leave} onClick={open}>
        <planeGeometry args={[1.82, 2.72]} />
        <meshBasicMaterial color={color} transparent opacity={hovered ? 0.24 : 0.11} side={THREE.DoubleSide} depthWrite={false} toneMapped={false} />
      </mesh>
      <mesh position={[0, 1.57, 0.08]} scale={[1, 1.28, 1]} onPointerOver={enter} onPointerOut={leave} onClick={open}>
        <torusGeometry args={[0.82, hovered ? 0.055 : 0.035, 12, 72]} />
        <meshBasicMaterial color={color} transparent opacity={hovered ? 1 : 0.66} toneMapped={false} />
      </mesh>
      <mesh position={[0, 0.08, 0.1]} receiveShadow>
        <boxGeometry args={[2.55, 0.16, 1.02]} />
        <meshStandardMaterial color="#4a4c49" roughness={0.94} />
      </mesh>
      <pointLight position={[0, 1.8, 0.5]} color={color} intensity={hovered ? 5.5 : 2.2} distance={5.5} decay={2} />
      <Html center position={[0, 3.65, 0]} distanceFactor={10} transform sprite>
        <button
          type="button"
          className="urai-home-spatial-portal-label"
          data-active={hovered ? 'true' : 'false'}
          onClick={() => onNavigate(spec.href)}
          onFocus={() => setHovered(true)}
          onBlur={() => setHovered(false)}
        >
          <strong>{spec.label}</strong>
          <span>{spec.detail}</span>
        </button>
      </Html>
    </group>
  )
}

function HomeWorldScene({ reducedMotion, onOrbOpen }: { reducedMotion: boolean; onOrbOpen: () => void }) {
  const navigate = useCallback((href: string) => {
    document.body.style.cursor = 'default'
    window.location.assign(href)
  }, [])

  return (
    <>
      <color attach="background" args={['#07111c']} />
      <fog attach="fog" args={['#0b1721', 11, 34]} />
      <ambientLight intensity={0.62} color="#d6e9f0" />
      <hemisphereLight args={['#d9f3ff', '#18241d', 1.4]} />
      <directionalLight
        position={[-5, 10, 6]}
        intensity={2.3}
        color="#fff0d6"
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <pointLight position={[0, 5, -8]} color="#9bdcf5" intensity={3.4} distance={18} />
      <Stars radius={55} depth={35} count={reducedMotion ? 700 : 1400} factor={3.2} saturation={0.12} fade speed={reducedMotion ? 0 : 0.22} />
      <LivingTerrain />
      <LandscapeDetails />
      <OrbCompanion reducedMotion={reducedMotion} onOpen={onOrbOpen} />
      {portalSpecs.map((spec) => (
        <PortalArch key={spec.id} spec={spec} onNavigate={navigate} />
      ))}
      <OrbitControls
        makeDefault
        enablePan={false}
        enableDamping={!reducedMotion}
        dampingFactor={0.07}
        rotateSpeed={0.42}
        zoomSpeed={0.62}
        minDistance={7.2}
        maxDistance={15.5}
        minPolarAngle={0.72}
        maxPolarAngle={1.48}
        minAzimuthAngle={-1.45}
        maxAzimuthAngle={1.45}
        target={[0, 1.35, -1.8]}
      />
      <EffectComposer enabled={!reducedMotion} multisampling={0}>
        <Bloom intensity={0.72} luminanceThreshold={0.45} luminanceSmoothing={0.42} mipmapBlur />
        <Vignette eskil={false} offset={0.22} darkness={0.54} />
      </EffectComposer>
    </>
  )
}

function HomeSpatialCanvasImpl({ onOrbOpen }: { onOrbOpen: () => void }) {
  const reducedMotion = useReducedMotionPreference()
  const webglAvailable = useWebGLAvailable()

  if (webglAvailable === false) return null

  return (
    <div
      className="urai-home-spatial-canvas-shell"
      data-home-spatial-renderer="webgl"
      data-webgl-ready={webglAvailable === true ? 'true' : 'pending'}
      aria-label="Interactive spatial Home world"
    >
      <Suspense fallback={<div className="urai-home-spatial-canvas-loading" aria-hidden="true" />}>
        <Canvas
          className="urai-home-spatial-canvas"
          shadows
          dpr={[1, 1.55]}
          camera={{ position: [0, 4.35, 11.8], fov: 48, near: 0.1, far: 90 }}
          gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
          onCreated={({ gl }) => {
            gl.outputColorSpace = THREE.SRGBColorSpace
            gl.toneMapping = THREE.ACESFilmicToneMapping
            gl.toneMappingExposure = 1.05
          }}
        >
          <HomeWorldScene reducedMotion={reducedMotion} onOrbOpen={onOrbOpen} />
        </Canvas>
      </Suspense>
      <div className="urai-home-spatial-canvas-hint" aria-hidden="true">
        <span /> Drag to look · scroll to move · choose a doorway
      </div>
    </div>
  )
}

const HomeSpatialCanvas = dynamic(() => Promise.resolve(HomeSpatialCanvasImpl), {
  ssr: false,
  loading: () => <div className="urai-home-spatial-canvas-loading" aria-hidden="true" />,
})

export default HomeSpatialCanvas
