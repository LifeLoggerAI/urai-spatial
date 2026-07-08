'use client'

import { OrbitControls, PerspectiveCamera } from '@react-three/drei'
import { Canvas, useFrame } from '@react-three/fiber'
import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing'
import Link from 'next/link'
import { Suspense, useMemo, useRef, type ReactNode } from 'react'
import * as THREE from 'three'

type RealPlaceMode = 'home' | 'ground' | 'life-map'

type RealPlaceWorldProps = {
  mode: RealPlaceMode
}

type CityAssetId = 'skyline-band' | 'city-overlook-deck' | 'street-descent-path' | 'life-map-sky-anchor'

const cityGlbAssets: Record<CityAssetId, string> = {
  'skyline-band': '/assets/urai/spatial/city-overlook/models/skyline-band.glb',
  'city-overlook-deck': '/assets/urai/spatial/city-overlook/models/city-overlook-deck.glb',
  'street-descent-path': '/assets/urai/spatial/city-overlook/models/street-descent-path.glb',
  'life-map-sky-anchor': '/assets/urai/spatial/city-overlook/models/life-map-sky-anchor.glb',
}

const cityProfile = {
  id: 'default-city-overlook',
  title: 'City Overlook',
  orbAnchorPosition: [0, 1.18, -2.05] as [number, number, number],
  lifeMapAnchorPosition: [0, 2.9, -6.8] as [number, number, number],
  camera: {
    home: { position: [0, 1.2, 5.05] as [number, number, number], fov: 42 },
    ground: { position: [0, 0.82, 4.35] as [number, number, number], fov: 48 },
    'life-map': { position: [0, 1.1, 7.2] as [number, number, number], fov: 56 },
  },
}

const copy = {
  home: {
    eyebrow: 'URAI Home',
    title: 'World hub',
    body: 'Orb. Ground below. Life Map above.',
    primary: ['Ground', '/ground'],
    secondary: ['Life Map', '/life-map'],
    status: 'Home world',
  },
  ground: {
    eyebrow: 'URAI Ground',
    title: 'Lower city',
    body: 'The lived layer below Home.',
    primary: ['Home', '/home'],
    secondary: ['Life Map', '/life-map'],
    status: 'Below Home',
  },
  'life-map': {
    eyebrow: 'URAI Life Map',
    title: 'Memory galaxy',
    body: 'Stars, memories, paths.',
    primary: ['Home', '/home'],
    secondary: ['Focus', '/focus?manifestId=seed-memory-bloom'],
    status: 'Galaxy active',
  },
} as const

function CityAssetSlot({ assetId, children }: { assetId: CityAssetId; children: ReactNode }) {
  return (
    <group
      name={`urai-city-asset:${assetId}`}
      userData={{ assetSrc: cityGlbAssets[assetId], assetStatus: 'glb-slot-ready-procedural-fallback-active' }}
    >
      {children}
    </group>
  )
}

function Stars({ mode }: { mode: RealPlaceMode }) {
  const ref = useRef<THREE.Points>(null)
  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry()
    const count = mode === 'life-map' ? 3600 : 720
    const positions = new Float32Array(count * 3)
    for (let i = 0; i < count; i += 1) {
      const angle = i * 2.399963
      const radius = mode === 'life-map' ? 4.8 + ((i * 17) % 900) / 42 : 5.2 + (i % 211) * 0.22
      positions[i * 3] = Math.cos(angle) * radius
      positions[i * 3 + 1] = mode === 'life-map' ? -2.4 + ((i * 31) % 520) / 58 : 1.35 + ((i * 31) % 260) / 22
      positions[i * 3 + 2] = mode === 'life-map' ? -12.0 + Math.sin(angle) * radius : -6.8 + Math.sin(angle) * radius
    }
    g.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    return g
  }, [mode])

  useFrame(({ clock }) => {
    if (!ref.current) return
    ref.current.rotation.y = clock.elapsedTime * (mode === 'life-map' ? 0.018 : 0.006)
  })

  return (
    <points ref={ref} geometry={geometry}>
      <pointsMaterial size={mode === 'life-map' ? 0.042 : 0.02} color="#e8fbff" transparent opacity={mode === 'ground' ? 0.16 : mode === 'life-map' ? 0.86 : 0.36} depthWrite={false} blending={THREE.AdditiveBlending} />
    </points>
  )
}

function CityAtmosphere({ mode }: { mode: RealPlaceMode }) {
  const traffic = useRef<THREE.Group>(null)
  const skyGlow = useRef<THREE.Group>(null)

  useFrame(({ clock }) => {
    if (traffic.current) traffic.current.position.x = Math.sin(clock.elapsedTime * 0.55) * 0.42
    if (skyGlow.current) skyGlow.current.position.y = 2.05 + Math.sin(clock.elapsedTime * 0.18) * 0.05
  })

  return (
    <group>
      <group ref={skyGlow} position={[0, 2.15, -9.8]}>
        <mesh>
          <planeGeometry args={[19, 7.4]} />
          <meshBasicMaterial color="#1d4ed8" transparent opacity={0.08} depthWrite={false} blending={THREE.AdditiveBlending} />
        </mesh>
        <mesh position={[0, 1.1, -0.1]}>
          <planeGeometry args={[14, 3.4]} />
          <meshBasicMaterial color="#67e8f9" transparent opacity={0.055} depthWrite={false} blending={THREE.AdditiveBlending} />
        </mesh>
      </group>
      <group ref={traffic} position={[0, -0.38, -8.25]}>
        {[-5.4, -3.1, -0.8, 1.8, 4.4, 6.1].map((x, index) => (
          <mesh key={x} position={[x, 0, index % 2 === 0 ? 0.08 : -0.08]}>
            <boxGeometry args={[0.58 + (index % 2) * 0.34, 0.018, 0.018]} />
            <meshBasicMaterial color={index % 2 === 0 ? '#facc6b' : '#67e8f9'} transparent opacity={mode === 'ground' ? 0.32 : 0.42} blending={THREE.AdditiveBlending} />
          </mesh>
        ))}
      </group>
    </group>
  )
}

function SkylineBand({ mode }: { mode: RealPlaceMode }) {
  const buildings = [
    [-8.4, -0.12, -10.15, 1.05, 2.05, 0.78],
    [-7.1, 0.42, -10.35, 0.78, 3.4, 0.72],
    [-6.0, 0.0, -9.9, 1.12, 2.5, 0.78],
    [-4.55, 0.7, -10.2, 0.96, 3.9, 0.72],
    [-3.25, 0.1, -9.9, 1.1, 2.8, 0.78],
    [-1.85, 0.95, -10.32, 1.0, 4.8, 0.78],
    [-0.45, 0.34, -9.95, 1.3, 3.2, 0.78],
    [1.18, 0.82, -10.2, 0.95, 4.3, 0.72],
    [2.55, 0.22, -9.8, 1.25, 2.9, 0.78],
    [4.05, 0.76, -10.22, 1.0, 4.05, 0.72],
    [5.4, 0.16, -9.9, 1.25, 2.7, 0.78],
    [6.88, 0.5, -10.32, 0.98, 3.55, 0.72],
    [8.15, 0.05, -10.08, 1.08, 2.35, 0.78],
  ] as const

  return (
    <CityAssetSlot assetId="skyline-band">
      <group position={mode === 'ground' ? [0, 0.2, -0.65] : [0, 0, 0]} scale={mode === 'ground' ? 1.05 : 1}>
        {buildings.map(([x, y, z, w, h, d], index) => (
          <group key={index} position={[x, y, z]}>
            <mesh castShadow>
              <boxGeometry args={[w, h, d]} />
              <meshStandardMaterial color="#040b14" emissive="#10253b" emissiveIntensity={mode === 'ground' ? 0.2 : 0.34} roughness={0.82} metalness={0.12} />
            </mesh>
            {Array.from({ length: 8 }).map((_, row) => (
              <mesh key={row} position={[0, -h / 2 + 0.32 + row * 0.42, d / 2 + 0.011]}>
                <boxGeometry args={[w * 0.68, 0.026, 0.02]} />
                <meshBasicMaterial color={row % 2 === 0 ? '#facc6b' : '#67e8f9'} transparent opacity={0.1 + ((index + row) % 4) * 0.04} blending={THREE.AdditiveBlending} />
              </mesh>
            ))}
          </group>
        ))}
      </group>
    </CityAssetSlot>
  )
}

function CityOverlookDeck({ mode }: { mode: RealPlaceMode }) {
  const lower = mode === 'ground'
  return (
    <CityAssetSlot assetId="city-overlook-deck">
      <group position={lower ? [0, -0.12, 0.15] : [0, 0, 0]} scale={lower ? 1.1 : 1}>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.88, 0.15]} receiveShadow>
          <planeGeometry args={[10.8, 5.9]} />
          <meshStandardMaterial color={lower ? '#08131d' : '#101820'} emissive={lower ? '#071b2a' : '#0b1d2a'} emissiveIntensity={lower ? 0.28 : 0.22} roughness={0.88} metalness={0.12} />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.86, 0.15]}>
          <ringGeometry args={[1.45, 5.0, 160]} />
          <meshBasicMaterial color="#67e8f9" transparent opacity={lower ? 0.11 : 0.07} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.845, 1.35]}>
          <circleGeometry args={[1.05, 96]} />
          <meshBasicMaterial color="#67e8f9" transparent opacity={lower ? 0.09 : 0.065} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} />
        </mesh>
        <mesh position={[0, 0.06, -6.86]}>
          <boxGeometry args={[13.4, 0.1, 0.12]} />
          <meshStandardMaterial color="#203246" roughness={0.64} metalness={0.18} />
        </mesh>
        {[-4.15, 4.15].map((x) => (
          <group key={x} position={[x, -0.36, -4.8]}>
            <mesh>
              <cylinderGeometry args={[0.05, 0.07, 1.35, 16]} />
              <meshStandardMaterial color="#172437" emissive="#0f172a" emissiveIntensity={0.2} roughness={0.58} />
            </mesh>
            <mesh position={[0, 0.82, 0]}>
              <sphereGeometry args={[0.16, 24, 24]} />
              <meshBasicMaterial color="#fde68a" transparent opacity={0.66} blending={THREE.AdditiveBlending} />
            </mesh>
          </group>
        ))}
      </group>
    </CityAssetSlot>
  )
}

function StreetDescentPath({ mode }: { mode: RealPlaceMode }) {
  const isGround = mode === 'ground'

  return (
    <CityAssetSlot assetId="street-descent-path">
      <group>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.835, 2.6]} receiveShadow>
          <planeGeometry args={[2.75, isGround ? 8.2 : 6.8]} />
          <meshStandardMaterial color="#172332" emissive={isGround ? '#16445d' : '#0b2233'} emissiveIntensity={isGround ? 0.42 : 0.14} roughness={0.92} metalness={0.08} />
        </mesh>
        {[-1.12, 1.12].map((x) => (
          <mesh key={x} rotation={[-Math.PI / 2, 0, 0]} position={[x, -0.79, 2.55]}>
            <planeGeometry args={[0.09, isGround ? 7.3 : 5.75]} />
            <meshBasicMaterial color="#67e8f9" transparent opacity={isGround ? 0.58 : 0.28} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} />
          </mesh>
        ))}
        {[0, 1, 2, 3].map((step) => (
          <mesh key={step} position={[0, -1.02 - step * 0.19, 4.32 + step * 0.64]} receiveShadow>
            <boxGeometry args={[3.0 + step * 0.22, 0.18, 0.48]} />
            <meshStandardMaterial color={step === 0 ? '#111827' : '#0b1320'} emissive="#071827" emissiveIntensity={0.18} roughness={0.86} />
          </mesh>
        ))}
      </group>
    </CityAssetSlot>
  )
}

function GroundDepthLayer() {
  return (
    <group position={[0, -1.16, -1.65]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.18, -1.2]}>
        <ringGeometry args={[2.2, 9.5, 180]} />
        <meshBasicMaterial color="#38bdf8" transparent opacity={0.065} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} />
      </mesh>
      {[-3.6, -1.85, 1.85, 3.6].map((x, index) => (
        <group key={x} position={[x, 0.05, -2.6 - index * 0.25]}>
          <mesh>
            <cylinderGeometry args={[0.16, 0.22, 1.05 + index * 0.22, 24]} />
            <meshStandardMaterial color="#07111d" emissive={index % 2 === 0 ? '#0f3550' : '#241653'} emissiveIntensity={0.48} roughness={0.54} metalness={0.2} />
          </mesh>
          <mesh position={[0, 0.66 + index * 0.11, 0]}>
            <sphereGeometry args={[0.18 + index * 0.025, 24, 24]} />
            <meshBasicMaterial color={index % 2 === 0 ? '#67e8f9' : '#a78bfa'} transparent opacity={0.5} blending={THREE.AdditiveBlending} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

function CityOverlookEnvironment({ mode }: { mode: RealPlaceMode }) {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.98, -2.75]} receiveShadow>
        <circleGeometry args={[25, 180]} />
        <meshStandardMaterial color={mode === 'ground' ? '#061019' : '#071827'} emissive={mode === 'ground' ? '#0f2d3a' : '#0b2638'} emissiveIntensity={mode === 'ground' ? 0.23 : 0.16} roughness={0.94} />
      </mesh>
      <CityOverlookDeck mode={mode} />
      <StreetDescentPath mode={mode} />
      <SkylineBand mode={mode} />
      <CityAtmosphere mode={mode} />
      {mode === 'ground' ? <GroundDepthLayer /> : null}
    </group>
  )
}

function OrbGuide({ mode }: { mode: RealPlaceMode }) {
  const ref = useRef<THREE.Group>(null)
  const [x, baseY, z] = cityProfile.orbAnchorPosition
  const scale = mode === 'home' ? 1.72 : 1.18

  useFrame(({ clock }) => {
    if (!ref.current) return
    ref.current.position.y = baseY + Math.sin(clock.elapsedTime * 0.9) * 0.055
    ref.current.rotation.y = clock.elapsedTime * 0.34
    ref.current.rotation.z = Math.sin(clock.elapsedTime * 0.35) * 0.08
  })

  return (
    <group ref={ref} position={[x, baseY, mode === 'ground' ? -0.72 : z]} scale={scale}>
      <mesh castShadow>
        <sphereGeometry args={[0.18, 48, 48]} />
        <meshStandardMaterial color="#f8ffff" emissive="#67e8f9" emissiveIntensity={3.25} roughness={0.11} metalness={0.16} />
      </mesh>
      <mesh>
        <sphereGeometry args={[0.56, 40, 40]} />
        <meshBasicMaterial color="#67e8f9" transparent opacity={0.085} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.38, 0.012, 16, 128]} />
        <meshBasicMaterial color="#dffcff" transparent opacity={0.62} blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh rotation={[0.35, 0, 0.8]}>
        <torusGeometry args={[0.55, 0.006, 12, 128]} />
        <meshBasicMaterial color="#a78bfa" transparent opacity={0.3} blending={THREE.AdditiveBlending} />
      </mesh>
    </group>
  )
}

function GroundPortal({ mode }: { mode: RealPlaceMode }) {
  const ref = useRef<THREE.Group>(null)

  useFrame(({ clock }) => {
    if (!ref.current) return
    ref.current.rotation.z = clock.elapsedTime * 0.09
  })

  return (
    <group ref={ref} position={[0, -0.745, 1.38]} rotation={[Math.PI / 2, 0, 0]}>
      <mesh>
        <torusGeometry args={[1.05, 0.024, 18, 160]} />
        <meshBasicMaterial color="#67e8f9" transparent opacity={mode === 'ground' ? 0.78 : 0.54} blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh>
        <torusGeometry args={[1.55, 0.012, 16, 160]} />
        <meshBasicMaterial color="#a78bfa" transparent opacity={mode === 'ground' ? 0.32 : 0.18} blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh>
        <circleGeometry args={[0.72, 96]} />
        <meshBasicMaterial color="#67e8f9" transparent opacity={mode === 'ground' ? 0.18 : 0.1} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} />
      </mesh>
    </group>
  )
}

function LifeMapSky({ mode }: { mode: RealPlaceMode }) {
  const ref = useRef<THREE.Group>(null)
  const strong = mode === 'life-map'

  useFrame(({ clock }) => {
    if (!ref.current) return
    ref.current.rotation.y = Math.sin(clock.elapsedTime * 0.18) * (strong ? 0.22 : 0.1)
    ref.current.rotation.z = clock.elapsedTime * (strong ? 0.018 : 0.006)
    ref.current.position.y = cityProfile.lifeMapAnchorPosition[1] + Math.sin(clock.elapsedTime * 0.22) * 0.06
  })

  const stars = [
    [-4.6, 0.25, 0, '#67e8f9'],
    [-2.8, 1.0, -0.55, '#a78bfa'],
    [-0.8, 0.58, -0.2, '#86efac'],
    [1.7, 1.12, -0.7, '#f0abfc'],
    [0.2, 2.45, -0.8, '#f8fafc'],
    [3.8, 0.2, -0.5, '#93c5fd'],
    [5.0, 1.16, -1.05, '#facc6b'],
    [-5.5, 1.25, -1.0, '#c4b5fd'],
    [0.6, -1.25, 0.4, '#38bdf8'],
    [-1.9, -1.0, -0.15, '#f0abfc'],
  ] as const

  return (
    <CityAssetSlot assetId="life-map-sky-anchor">
      <group ref={ref} position={strong ? [0, 0.1, -6.6] : cityProfile.lifeMapAnchorPosition} scale={strong ? 1.62 : 1.08}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[strong ? 5.6 : 3.8, 0.018, 16, 220]} />
          <meshBasicMaterial color="#60a5fa" transparent opacity={strong ? 0.38 : 0.24} blending={THREE.AdditiveBlending} />
        </mesh>
        <mesh rotation={[Math.PI / 2, 0, 0.44]}>
          <torusGeometry args={[strong ? 7.4 : 5.25, 0.01, 14, 220]} />
          <meshBasicMaterial color="#a78bfa" transparent opacity={strong ? 0.2 : 0.08} blending={THREE.AdditiveBlending} />
        </mesh>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <circleGeometry args={[strong ? 6.5 : 4.7, 180]} />
          <meshBasicMaterial color="#67e8f9" transparent opacity={strong ? 0.025 : 0.014} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} />
        </mesh>
        {stars.map(([x, y, z, color], index) => (
          <group key={index} position={[x, y, z]}>
            <mesh>
              <sphereGeometry args={[strong ? 0.17 : 0.08, 30, 30]} />
              <meshStandardMaterial color="#020617" emissive={color} emissiveIntensity={strong ? 5.5 : 1.7} transparent opacity={0.98} />
            </mesh>
            <mesh>
              <sphereGeometry args={[strong ? 0.72 : 0.22, 26, 26]} />
              <meshBasicMaterial color={color} transparent opacity={strong ? 0.075 : 0.04} depthWrite={false} blending={THREE.AdditiveBlending} />
            </mesh>
          </group>
        ))}
      </group>
    </CityAssetSlot>
  )
}

function SpatialScene({ mode }: { mode: RealPlaceMode }) {
  const camera = cityProfile.camera[mode]
  const life = mode === 'life-map'

  return (
    <>
      <color attach="background" args={[life ? '#01030a' : '#020611']} />
      <fog attach="fog" args={[life ? '#01030a' : '#041225', life ? 7.5 : 5.4, life ? 42 : 23]} />
      <PerspectiveCamera makeDefault position={camera.position} fov={camera.fov} />
      <OrbitControls enablePan={life} enableZoom enableDamping dampingFactor={0.06} rotateSpeed={life ? 0.18 : 0.26} zoomSpeed={0.52} minDistance={life ? 4.4 : mode === 'ground' ? 3.2 : 4.0} maxDistance={life ? 18 : 10.5} minPolarAngle={life ? 0.1 : 0.45} maxPolarAngle={life ? 2.65 : 1.76} />
      <ambientLight intensity={life ? 0.58 : 0.4} color="#d7e7ff" />
      <hemisphereLight args={["#dbeafe", "#020617", life ? 1.35 : 1.0]} />
      <directionalLight position={[-4, 7, 5]} intensity={life ? 0.4 : 1.22} color="#dbeafe" castShadow={!life} />
      <pointLight position={[0, 1.6, -2.0]} intensity={life ? 1.4 : 3.6} color="#67e8f9" distance={life ? 13 : 6.2} />
      <pointLight position={[-4.0, 1.6, -7.8]} intensity={life ? 1.0 : 1.35} color="#f59e0b" distance={12} />
      <pointLight position={[4.0, 1.65, -7.8]} intensity={life ? 1.15 : 1.1} color="#a78bfa" distance={12} />
      <mesh scale={[-1, 1, 1]}>
        <sphereGeometry args={[60, 72, 72]} />
        <meshBasicMaterial side={THREE.BackSide} color={life ? '#01030a' : '#020713'} />
      </mesh>
      <Stars mode={mode} />
      {life ? null : <CityOverlookEnvironment mode={mode} />}
      {life ? null : <GroundPortal mode={mode} />}
      {life ? null : <OrbGuide mode={mode} />}
      <LifeMapSky mode={mode} />
      <EffectComposer>
        <Bloom intensity={life ? 1.45 : 0.9} luminanceThreshold={0.05} luminanceSmoothing={0.22} />
        <Vignette eskil={false} offset={life ? 0.08 : 0.14} darkness={life ? 0.45 : 0.64} />
      </EffectComposer>
    </>
  )
}

export default function SpatialRealPlaceWorld({ mode }: RealPlaceWorldProps) {
  const current = copy[mode]
  const dataMode = mode === 'life-map' ? 'life' : mode

  return (
    <main className="srp-root" data-mode={dataMode} aria-label={`URAI ${current.title}`}>
      <Suspense fallback={<div className="srp-loader">URAI spatial world loading</div>}>
        <Canvas shadows dpr={[1, 1.7]} gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}>
          <SpatialScene mode={mode} />
        </Canvas>
      </Suspense>

      <header className="srp-card srp-hero">
        <p>{current.eyebrow}</p>
        <h1>{current.title}</h1>
        <span>{current.body}</span>
        <div>
          <Link className="primary" href={current.primary[1]}>{current.primary[0]}</Link>
          <Link href={current.secondary[1]}>{current.secondary[0]}</Link>
        </div>
      </header>

      <aside className="srp-status">{current.status}</aside>

      {mode === 'life-map' ? null : (
        <Link className="srp-ground" href={mode === 'ground' ? '/home' : '/ground'}>
          <strong>{mode === 'ground' ? 'Return above' : 'Descend'}</strong>
          <span>{mode === 'ground' ? 'same world overhead' : 'ground layer below'}</span>
        </Link>
      )}

      <nav className="srp-rail" aria-label="URAI real-place routes">
        <Link href="/home">Home</Link>
        <Link href="/ground">Ground</Link>
        <Link href="/life-map">Life Map</Link>
        <Link href="/focus?manifestId=seed-memory-bloom">Focus</Link>
        <Link href="/replay?memoryId=quiet-reset&manifestId=replay-recovery-thread">Replay</Link>
        <Link href="/passport">Passport</Link>
        <Link href="/status">Status</Link>
      </nav>

      <style jsx>{`
        :global(.uraiV2StateAnnouncer){position:absolute!important;width:1px!important;height:1px!important;overflow:hidden!important;clip-path:inset(50%)!important;white-space:nowrap!important;color:transparent!important}
        .srp-root{position:fixed;inset:0;overflow:hidden;background:#020611;color:#f8fbff;isolation:isolate;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}
        .srp-root:before{content:'';position:absolute;inset:0;z-index:2;pointer-events:none;background:radial-gradient(circle at 50% 30%,rgba(103,232,249,.16),transparent 18%),radial-gradient(circle at 50% 8%,rgba(96,165,250,.2),transparent 30%),linear-gradient(180deg,rgba(2,6,17,.24),transparent 26%,transparent 67%,rgba(2,6,17,.82))}
        .srp-root[data-mode='ground']:before{background:radial-gradient(circle at 50% 19%,rgba(103,232,249,.12),transparent 23%),linear-gradient(180deg,rgba(2,6,17,.08),transparent 23%,rgba(2,6,17,.9))}
        .srp-root[data-mode='life']:before{background:radial-gradient(circle at 49% 46%,rgba(103,232,249,.2),transparent 14%),radial-gradient(ellipse at 62% 35%,rgba(167,139,250,.18),transparent 33%),radial-gradient(circle at 25% 30%,rgba(250,204,21,.09),transparent 18%),linear-gradient(180deg,rgba(1,3,10,.03),transparent 48%,rgba(1,3,10,.42))}
        .srp-root[data-mode='life']:after{content:'';position:absolute;inset:-16%;z-index:3;pointer-events:none;opacity:.48;background-image:radial-gradient(circle,rgba(255,255,255,.9) 0 1px,transparent 1.4px),radial-gradient(circle,rgba(103,232,249,.62) 0 1px,transparent 1.2px),radial-gradient(circle,rgba(167,139,250,.5) 0 1px,transparent 1.2px);background-size:82px 82px,137px 137px,211px 211px;background-position:0 0,43px 51px,17px 109px;mask-image:linear-gradient(180deg,#000 0 76%,transparent 100%)}
        .srp-root canvas{position:absolute;inset:0;z-index:1;display:block;cursor:grab}
        .srp-loader{position:absolute;inset:0;z-index:10;display:grid;place-items:center;background:#020611;color:rgba(226,246,255,.76);letter-spacing:.18em;text-transform:uppercase;font-size:12px}
        .srp-card,.srp-ground,.srp-rail,.srp-status{position:absolute;z-index:5;border:1px solid rgba(160,220,255,.12);background:linear-gradient(145deg,rgba(2,8,24,.28),rgba(10,9,31,.12));box-shadow:0 20px 70px rgba(0,0,0,.18),inset 0 1px 0 rgba(255,255,255,.035);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px)}
        .srp-hero{left:22px;top:22px;width:min(218px,calc(100vw - 44px));padding:11px 12px;border-radius:18px;opacity:.82}
        .srp-hero p{margin:0 0 5px;color:rgba(186,230,253,.68);font-size:8px;letter-spacing:.24em;text-transform:uppercase;font-weight:850}
        .srp-hero h1{margin:0 0 5px;font-size:clamp(18px,1.8vw,24px);line-height:.98;font-weight:930;letter-spacing:-.04em;text-shadow:0 0 34px rgba(103,232,249,.16)}
        .srp-hero span{display:block;color:rgba(235,244,255,.62);line-height:1.35;font-size:10px}
        .srp-hero div{display:flex;gap:6px;flex-wrap:wrap;margin-top:10px}
        .srp-hero a,.srp-rail a{border:1px solid rgba(160,220,255,.15);border-radius:999px;padding:7px 9px;color:#eef6ff;text-decoration:none;background:rgba(2,8,24,.28)}
        .srp-hero a.primary{background:rgba(103,232,249,.78);color:#03101f;font-weight:900}
        .srp-status{right:22px;top:22px;padding:8px 11px;border-radius:999px;color:rgba(226,246,255,.72);font-size:9px;letter-spacing:.13em;text-transform:uppercase;opacity:.8}
        .srp-ground{left:50%;bottom:84px;display:grid;gap:3px;min-width:162px;padding:10px 14px;transform:translateX(-50%);border-radius:999px;text-align:center;color:#f8fbff;text-decoration:none;box-shadow:0 0 90px rgba(103,232,249,.18),0 24px 90px rgba(0,0,0,.22)}
        .srp-ground strong{font-size:10px;letter-spacing:.16em;text-transform:uppercase}
        .srp-ground span{color:rgba(235,244,255,.6);font-size:9px}
        .srp-rail{left:50%;bottom:18px;display:flex;gap:5px;max-width:calc(100vw - 32px);padding:6px;transform:translateX(-50%);overflow-x:auto;border-radius:999px;opacity:.78}
        .srp-rail a{white-space:nowrap;font-size:10px;font-weight:820;letter-spacing:.04em;padding:7px 9px}
        .srp-root[data-mode='life'] .srp-hero{width:170px;background:transparent;border-color:transparent;box-shadow:none;backdrop-filter:none;-webkit-backdrop-filter:none;opacity:.58}
        .srp-root[data-mode='life'] .srp-hero span,.srp-root[data-mode='life'] .srp-hero div{display:none}
        .srp-root[data-mode='life'] .srp-status{background:transparent;border-color:transparent;box-shadow:none;opacity:.5}
        .srp-root[data-mode='life'] .srp-rail{opacity:.48;background:rgba(2,8,24,.18)}
        .srp-hero a:hover,.srp-rail a:hover,.srp-ground:hover{border-color:rgba(103,232,249,.46);box-shadow:0 0 38px rgba(103,232,249,.12)}
        @media(max-width:720px){.srp-hero{left:14px;right:auto;top:14px;width:190px;padding:10px}.srp-hero h1{font-size:20px}.srp-status{display:none}.srp-ground{bottom:82px;min-width:142px}.srp-rail{bottom:12px}}
      `}</style>
    </main>
  )
}
