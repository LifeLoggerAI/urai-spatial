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
  orbAnchorPosition: [0, 1.12, -2.35] as [number, number, number],
  lifeMapAnchorPosition: [0, 3.15, -5.85] as [number, number, number],
  camera: {
    home: { position: [0, 1.34, 5.45] as [number, number, number], fov: 46 },
    ground: { position: [0, 1.02, 4.72] as [number, number, number], fov: 50 },
    'life-map': { position: [0, 2.72, 6.15] as [number, number, number], fov: 49 },
  },
}

const copy = {
  home: {
    eyebrow: 'URAI Spatial',
    title: 'Living world hub',
    body: 'The Orb holds the city. Ground opens below the deck. Life Map glows above the skyline.',
    primary: ['Descend Ground', '/ground'],
    secondary: ['Open Life Map', '/life-map'],
    status: 'Orb-centered Home world',
  },
  ground: {
    eyebrow: 'URAI Ground',
    title: 'Ground below Home',
    body: 'The same city, closer to life: path, block, signals, approvals, and lived context stay embodied.',
    primary: ['Rise Home', '/home'],
    secondary: ['Open Sky', '/life-map'],
    status: 'Lower world connected',
  },
  'life-map': {
    eyebrow: 'URAI Life Map',
    title: 'Galaxy above Home',
    body: 'The city remains below. Memory stars orbit overhead. Select a star and Focus begins inside it.',
    primary: ['Return Home', '/home'],
    secondary: ['Enter Focus', '/focus?manifestId=seed-memory-bloom'],
    status: 'Explorable sky layer active',
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
    const count = mode === 'life-map' ? 1800 : 820
    const positions = new Float32Array(count * 3)
    for (let i = 0; i < count; i += 1) {
      const angle = i * 2.399963
      const radius = 7.5 + (i % 181) * 0.28
      positions[i * 3] = Math.cos(angle) * radius
      positions[i * 3 + 1] = 1.4 + ((i * 31) % 280) / 18
      positions[i * 3 + 2] = -9 + Math.sin(angle) * radius
    }
    g.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    return g
  }, [mode])

  useFrame(({ clock }) => {
    if (!ref.current) return
    ref.current.rotation.y = clock.elapsedTime * 0.006
  })

  return (
    <points ref={ref} geometry={geometry}>
      <pointsMaterial size={mode === 'life-map' ? 0.04 : 0.022} color="#dffcff" transparent opacity={mode === 'ground' ? 0.12 : mode === 'life-map' ? 0.62 : 0.38} depthWrite={false} blending={THREE.AdditiveBlending} />
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
          <meshBasicMaterial color="#1d4ed8" transparent opacity={mode === 'life-map' ? 0.18 : 0.08} depthWrite={false} blending={THREE.AdditiveBlending} />
        </mesh>
        <mesh position={[0, 1.1, -0.1]}>
          <planeGeometry args={[14, 3.4]} />
          <meshBasicMaterial color="#67e8f9" transparent opacity={mode === 'life-map' ? 0.12 : 0.055} depthWrite={false} blending={THREE.AdditiveBlending} />
        </mesh>
      </group>
      <group ref={traffic} position={[0, -0.38, -8.25]}>
        {[-5.4, -3.1, -0.8, 1.8, 4.4, 6.1].map((x, index) => (
          <mesh key={x} position={[x, 0, index % 2 === 0 ? 0.08 : -0.08]}>
            <boxGeometry args={[0.58 + (index % 2) * 0.34, 0.018, 0.018]} />
            <meshBasicMaterial color={index % 2 === 0 ? '#facc6b' : '#67e8f9'} transparent opacity={0.4} blending={THREE.AdditiveBlending} />
          </mesh>
        ))}
      </group>
    </group>
  )
}

function SkylineBand() {
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
      <group>
        {buildings.map(([x, y, z, w, h, d], index) => (
          <group key={index} position={[x, y, z]}>
            <mesh castShadow>
              <boxGeometry args={[w, h, d]} />
              <meshStandardMaterial color="#040b14" emissive="#10253b" emissiveIntensity={0.3} roughness={0.82} metalness={0.12} />
            </mesh>
            {Array.from({ length: 8 }).map((_, row) => (
              <mesh key={row} position={[0, -h / 2 + 0.32 + row * 0.42, d / 2 + 0.011]}>
                <boxGeometry args={[w * 0.68, 0.026, 0.02]} />
                <meshBasicMaterial color={row % 2 === 0 ? '#facc6b' : '#67e8f9'} transparent opacity={0.1 + ((index + row) % 4) * 0.055} blending={THREE.AdditiveBlending} />
              </mesh>
            ))}
            {index % 3 === 0 ? (
              <mesh position={[0, h / 2 + 0.18, 0]}>
                <boxGeometry args={[0.04, 0.36, 0.04]} />
                <meshBasicMaterial color="#67e8f9" transparent opacity={0.36} blending={THREE.AdditiveBlending} />
              </mesh>
            ) : null}
          </group>
        ))}
        <mesh position={[0, 1.05, -10.35]}>
          <boxGeometry args={[18, 0.018, 0.018]} />
          <meshBasicMaterial color="#67e8f9" transparent opacity={0.2} blending={THREE.AdditiveBlending} />
        </mesh>
      </group>
    </CityAssetSlot>
  )
}

function CityOverlookDeck() {
  return (
    <CityAssetSlot assetId="city-overlook-deck">
      <group>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.88, 0.15]} receiveShadow>
          <planeGeometry args={[10.4, 5.5]} />
          <meshStandardMaterial color="#101820" emissive="#0b1d2a" emissiveIntensity={0.22} roughness={0.88} metalness={0.12} />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.86, 0.15]}>
          <ringGeometry args={[1.45, 5.0, 160]} />
          <meshBasicMaterial color="#67e8f9" transparent opacity={0.07} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.845, 1.35]}>
          <circleGeometry args={[1.05, 96]} />
          <meshBasicMaterial color="#67e8f9" transparent opacity={0.065} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} />
        </mesh>
        <mesh position={[0, 0.06, -6.86]}>
          <boxGeometry args={[13.4, 0.1, 0.12]} />
          <meshStandardMaterial color="#203246" roughness={0.64} metalness={0.18} />
        </mesh>
        {[-5.1, -2.55, 0, 2.55, 5.1].map((x) => (
          <mesh key={x} position={[x, -0.42, -6.86]}>
            <boxGeometry args={[0.12, 1.05, 0.12]} />
            <meshStandardMaterial color="#203246" roughness={0.64} metalness={0.18} />
          </mesh>
        ))}
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
          <planeGeometry args={[2.55, 6.8]} />
          <meshStandardMaterial color="#172332" emissive={isGround ? '#16445d' : '#0b2233'} emissiveIntensity={isGround ? 0.36 : 0.14} roughness={0.92} metalness={0.08} />
        </mesh>
        {[-1.05, 1.05].map((x) => (
          <mesh key={x} rotation={[-Math.PI / 2, 0, 0]} position={[x, -0.79, 2.55]}>
            <planeGeometry args={[0.09, 5.75]} />
            <meshBasicMaterial color="#67e8f9" transparent opacity={isGround ? 0.48 : 0.28} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} />
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

function CityOverlookEnvironment({ mode }: { mode: RealPlaceMode }) {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.98, -2.75]} receiveShadow>
        <circleGeometry args={[25, 180]} />
        <meshStandardMaterial color={mode === 'ground' ? '#071019' : '#071827'} emissive={mode === 'ground' ? '#0f2d3a' : '#0b2638'} emissiveIntensity={0.16} roughness={0.94} />
      </mesh>
      <CityOverlookDeck />
      <StreetDescentPath mode={mode} />
      <SkylineBand />
      <CityAtmosphere mode={mode} />
    </group>
  )
}

function OrbGuide({ mode }: { mode: RealPlaceMode }) {
  const ref = useRef<THREE.Group>(null)
  const [x, baseY, z] = cityProfile.orbAnchorPosition
  const scale = mode === 'home' ? 1.55 : mode === 'life-map' ? 1.16 : 1.28

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
        <meshStandardMaterial color="#f8ffff" emissive="#67e8f9" emissiveIntensity={mode === 'life-map' ? 2.1 : 3.1} roughness={0.11} metalness={0.16} />
      </mesh>
      <mesh>
        <sphereGeometry args={[0.5, 40, 40]} />
        <meshBasicMaterial color="#67e8f9" transparent opacity={0.075} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.37, 0.012, 16, 128]} />
        <meshBasicMaterial color="#dffcff" transparent opacity={0.56} blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh rotation={[0.35, 0, 0.8]}>
        <torusGeometry args={[0.52, 0.006, 12, 128]} />
        <meshBasicMaterial color="#a78bfa" transparent opacity={0.25} blending={THREE.AdditiveBlending} />
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
        <meshBasicMaterial color="#67e8f9" transparent opacity={mode === 'ground' ? 0.74 : 0.48} blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh>
        <torusGeometry args={[1.55, 0.012, 16, 160]} />
        <meshBasicMaterial color="#a78bfa" transparent opacity={mode === 'ground' ? 0.28 : 0.16} blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh>
        <circleGeometry args={[0.72, 96]} />
        <meshBasicMaterial color="#67e8f9" transparent opacity={mode === 'ground' ? 0.16 : 0.09} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} />
      </mesh>
    </group>
  )
}

function LifeMapSky({ mode }: { mode: RealPlaceMode }) {
  const ref = useRef<THREE.Group>(null)
  const visible = mode !== 'ground'
  const strong = mode === 'life-map'

  useFrame(({ clock }) => {
    if (!ref.current) return
    ref.current.rotation.y = Math.sin(clock.elapsedTime * 0.18) * 0.12
    ref.current.position.y = cityProfile.lifeMapAnchorPosition[1] + Math.sin(clock.elapsedTime * 0.22) * 0.06
  })

  if (!visible) return null

  const stars = [
    [-3.55, 0.25, 0, '#67e8f9'],
    [-2.05, 1.0, -0.55, '#a78bfa'],
    [-0.45, 0.58, -0.2, '#86efac'],
    [1.38, 1.12, -0.7, '#f0abfc'],
    [0.2, 2.2, -0.8, '#f8fafc'],
    [3.2, 0.2, -0.5, '#93c5fd'],
    [4.25, 1.16, -1.05, '#facc6b'],
    [-4.55, 1.25, -1.0, '#c4b5fd'],
  ] as const

  return (
    <CityAssetSlot assetId="life-map-sky-anchor">
      <group ref={ref} position={cityProfile.lifeMapAnchorPosition} scale={strong ? 1.7 : 1.08}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[3.8, 0.022, 16, 190]} />
          <meshBasicMaterial color="#60a5fa" transparent opacity={strong ? 0.68 : 0.28} blending={THREE.AdditiveBlending} />
        </mesh>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[5.25, 0.01, 14, 190]} />
          <meshBasicMaterial color="#a78bfa" transparent opacity={strong ? 0.26 : 0.1} blending={THREE.AdditiveBlending} />
        </mesh>
        {stars.map(([x, y, z, color], index) => (
          <group key={index} position={[x, y, z]}>
            <mesh>
              <sphereGeometry args={[strong ? 0.19 : 0.09, 28, 28]} />
              <meshStandardMaterial color="#020617" emissive={color} emissiveIntensity={strong ? 4.3 : 1.7} transparent opacity={0.98} />
            </mesh>
            <mesh>
              <sphereGeometry args={[strong ? 0.46 : 0.22, 24, 24]} />
              <meshBasicMaterial color={color} transparent opacity={strong ? 0.08 : 0.045} depthWrite={false} blending={THREE.AdditiveBlending} />
            </mesh>
          </group>
        ))}
      </group>
    </CityAssetSlot>
  )
}

function SpatialScene({ mode }: { mode: RealPlaceMode }) {
  const camera = cityProfile.camera[mode]

  return (
    <>
      <color attach="background" args={["#020611"]} />
      <fog attach="fog" args={["#041225", mode === 'life-map' ? 4.2 : 5.4, mode === 'life-map' ? 34 : 23]} />
      <PerspectiveCamera makeDefault position={camera.position} fov={camera.fov} />
      <OrbitControls enablePan={false} enableZoom enableDamping dampingFactor={0.06} rotateSpeed={0.26} zoomSpeed={0.52} minDistance={mode === 'ground' ? 3.2 : 4.0} maxDistance={mode === 'life-map' ? 13 : 10.5} minPolarAngle={0.45} maxPolarAngle={1.76} />
      <ambientLight intensity={0.4} color="#d7e7ff" />
      <hemisphereLight args={["#dbeafe", "#020617", 1.0]} />
      <directionalLight position={[-4, 7, 5]} intensity={1.22} color="#dbeafe" castShadow />
      <pointLight position={[0, 1.6, -2.0]} intensity={3.6} color="#67e8f9" distance={6.2} />
      <pointLight position={[-4.0, 1.6, -7.8]} intensity={1.35} color="#f59e0b" distance={12} />
      <pointLight position={[4.0, 1.65, -7.8]} intensity={1.1} color="#a78bfa" distance={12} />
      <mesh scale={[-1, 1, 1]}>
        <sphereGeometry args={[60, 72, 72]} />
        <meshBasicMaterial side={THREE.BackSide} color="#020713" />
      </mesh>
      <Stars mode={mode} />
      <CityOverlookEnvironment mode={mode} />
      <GroundPortal mode={mode} />
      <OrbGuide mode={mode} />
      <LifeMapSky mode={mode} />
      <EffectComposer>
        <Bloom intensity={mode === 'life-map' ? 1.12 : 0.86} luminanceThreshold={0.07} luminanceSmoothing={0.26} />
        <Vignette eskil={false} offset={0.14} darkness={mode === 'life-map' ? 0.6 : 0.64} />
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

      <Link className="srp-ground" href={mode === 'life-map' ? '/home' : '/ground'}>
        <strong>{mode === 'life-map' ? 'City below' : mode === 'ground' ? 'You are below Home' : 'Ground hatch below'}</strong>
        <span>{mode === 'life-map' ? 'return through the same world' : mode === 'ground' ? 'same city, lived layer' : 'descend into the lived layer'}</span>
      </Link>

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
        .srp-root:before{content:'';position:absolute;inset:0;z-index:2;pointer-events:none;background:radial-gradient(circle at 50% 30%,rgba(103,232,249,.16),transparent 18%),radial-gradient(circle at 50% 8%,rgba(96,165,250,.22),transparent 30%),linear-gradient(180deg,rgba(2,6,17,.34),transparent 26%,transparent 67%,rgba(2,6,17,.84))}
        .srp-root[data-mode='ground']:before{background:radial-gradient(circle at 50% 24%,rgba(103,232,249,.12),transparent 22%),linear-gradient(180deg,rgba(2,6,17,.2),transparent 23%,rgba(2,6,17,.88))}
        .srp-root[data-mode='life']:before{background:radial-gradient(circle at 50% 26%,rgba(103,232,249,.22),transparent 22%),radial-gradient(circle at 50% 9%,rgba(167,139,250,.24),transparent 34%),linear-gradient(180deg,rgba(2,6,17,.14),transparent 43%,rgba(2,6,17,.74))}
        .srp-root canvas{position:absolute;inset:0;z-index:1;display:block;cursor:grab}
        .srp-loader{position:absolute;inset:0;z-index:10;display:grid;place-items:center;background:#020611;color:rgba(226,246,255,.76);letter-spacing:.18em;text-transform:uppercase;font-size:12px}
        .srp-card,.srp-ground,.srp-rail,.srp-status{position:absolute;z-index:5;border:1px solid rgba(160,220,255,.14);background:linear-gradient(145deg,rgba(2,8,24,.42),rgba(10,9,31,.2));box-shadow:0 24px 90px rgba(0,0,0,.24),inset 0 1px 0 rgba(255,255,255,.045);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px)}
        .srp-hero{left:22px;top:22px;width:min(300px,calc(100vw - 44px));padding:13px 15px;border-radius:22px}
        .srp-hero p{margin:0 0 7px;color:rgba(186,230,253,.7);font-size:9px;letter-spacing:.24em;text-transform:uppercase;font-weight:850}
        .srp-hero h1{margin:0 0 7px;font-size:clamp(25px,2.65vw,36px);line-height:.94;font-weight:950;letter-spacing:-.045em;text-shadow:0 0 34px rgba(103,232,249,.2)}
        .srp-hero span{display:block;color:rgba(235,244,255,.72);line-height:1.42;font-size:12px}
        .srp-hero div{display:flex;gap:8px;flex-wrap:wrap;margin-top:13px}
        .srp-hero a,.srp-rail a{border:1px solid rgba(160,220,255,.2);border-radius:999px;padding:8px 11px;color:#eef6ff;text-decoration:none;background:rgba(2,8,24,.38)}
        .srp-hero a.primary{background:linear-gradient(135deg,rgba(103,232,249,.94),rgba(167,139,250,.88));color:#03101f;font-weight:900}
        .srp-status{right:22px;top:22px;padding:9px 12px;border-radius:999px;color:rgba(226,246,255,.78);font-size:10px;letter-spacing:.13em;text-transform:uppercase}
        .srp-ground{left:50%;bottom:84px;display:grid;gap:3px;min-width:218px;padding:12px 17px;transform:translateX(-50%);border-radius:999px;text-align:center;color:#f8fbff;text-decoration:none;box-shadow:0 0 90px rgba(103,232,249,.18),0 24px 90px rgba(0,0,0,.26)}
        .srp-ground strong{font-size:11px;letter-spacing:.16em;text-transform:uppercase}
        .srp-ground span{color:rgba(235,244,255,.68);font-size:10px}
        .srp-rail{left:50%;bottom:18px;display:flex;gap:6px;max-width:calc(100vw - 32px);padding:7px;transform:translateX(-50%);overflow-x:auto;border-radius:999px}
        .srp-rail a{white-space:nowrap;font-size:11px;font-weight:850;letter-spacing:.04em;padding:8px 11px}
        .srp-hero a:hover,.srp-rail a:hover,.srp-ground:hover{border-color:rgba(103,232,249,.56);box-shadow:0 0 46px rgba(103,232,249,.15)}
        @media(max-width:720px){.srp-hero{left:14px;right:14px;top:14px;width:auto;max-width:310px;padding:13px}.srp-hero h1{font-size:29px}.srp-status{display:none}.srp-ground{bottom:82px;min-width:190px}.srp-rail{bottom:12px}}
      `}</style>
    </main>
  )
}
