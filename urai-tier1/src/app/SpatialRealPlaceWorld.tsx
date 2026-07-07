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
  orbAnchorPosition: [1.28, 0.78, -1.95] as [number, number, number],
  lifeMapAnchorPosition: [0, 4.35, -8.4] as [number, number, number],
  camera: {
    home: { position: [0, 1.45, 6.05] as [number, number, number], fov: 48 },
    ground: { position: [0, 1.05, 4.85] as [number, number, number], fov: 50 },
    'life-map': { position: [0, 3.1, 7.65] as [number, number, number], fov: 47 },
  },
}

const copy = {
  home: {
    eyebrow: 'URAI Spatial',
    title: 'City overlook',
    body: 'Your city becomes the spatial home. Ground lives at street level below. Life Map opens above the skyline.',
    primary: ['Descend Ground', '/ground'],
    secondary: ['Open Life Map', '/life-map'],
    status: 'Default city-overlook home world',
  },
  ground: {
    eyebrow: 'URAI Ground',
    title: 'Street level',
    body: 'The same city, closer to life: path, block, objects, approvals, and lived context stay embodied.',
    primary: ['Return Home', '/home'],
    secondary: ['Open Life Map', '/life-map'],
    status: 'City ground layer descended',
  },
  'life-map': {
    eyebrow: 'URAI Life Map',
    title: 'Sky above the city',
    body: 'The city stays below while memory stars, Focus, and Replay paths open above the skyline.',
    primary: ['Return Home', '/home'],
    secondary: ['Enter Focus', '/focus?manifestId=seed-memory-bloom'],
    status: 'Memory sky above city active',
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
    const count = mode === 'life-map' ? 1250 : 720
    const positions = new Float32Array(count * 3)
    for (let i = 0; i < count; i += 1) {
      const angle = i * 2.399963
      const radius = 9 + (i % 151) * 0.34
      positions[i * 3] = Math.cos(angle) * radius
      positions[i * 3 + 1] = 1.1 + ((i * 29) % 250) / 17
      positions[i * 3 + 2] = -12 + Math.sin(angle) * radius
    }
    g.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    return g
  }, [mode])

  useFrame(({ clock }) => {
    if (!ref.current) return
    ref.current.rotation.y = clock.elapsedTime * 0.004
  })

  return (
    <points ref={ref} geometry={geometry}>
      <pointsMaterial size={mode === 'life-map' ? 0.034 : 0.022} color="#d9f8ff" transparent opacity={mode === 'ground' ? 0.16 : 0.48} depthWrite={false} blending={THREE.AdditiveBlending} />
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
      <group ref={skyGlow} position={[0, 2.05, -10.9]}>
        <mesh>
          <planeGeometry args={[15.8, 5.4]} />
          <meshBasicMaterial color="#1d4ed8" transparent opacity={mode === 'life-map' ? 0.1 : 0.05} depthWrite={false} blending={THREE.AdditiveBlending} />
        </mesh>
        <mesh position={[0, 1.3, -0.1]}>
          <planeGeometry args={[11, 2.7]} />
          <meshBasicMaterial color="#67e8f9" transparent opacity={mode === 'life-map' ? 0.08 : 0.035} depthWrite={false} blending={THREE.AdditiveBlending} />
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
              <meshStandardMaterial color="#050d18" emissive="#10253b" emissiveIntensity={0.24} roughness={0.86} metalness={0.08} />
            </mesh>
            {Array.from({ length: 8 }).map((_, row) => (
              <mesh key={row} position={[0, -h / 2 + 0.32 + row * 0.42, d / 2 + 0.011]}>
                <boxGeometry args={[w * 0.68, 0.026, 0.02]} />
                <meshBasicMaterial color={row % 2 === 0 ? '#facc6b' : '#67e8f9'} transparent opacity={0.09 + ((index + row) % 4) * 0.045} blending={THREE.AdditiveBlending} />
              </mesh>
            ))}
            {index % 3 === 0 ? (
              <mesh position={[0, h / 2 + 0.18, 0]}>
                <boxGeometry args={[0.04, 0.36, 0.04]} />
                <meshBasicMaterial color="#67e8f9" transparent opacity={0.32} blending={THREE.AdditiveBlending} />
              </mesh>
            ) : null}
          </group>
        ))}
        <mesh position={[0, 1.05, -10.35]}>
          <boxGeometry args={[18, 0.018, 0.018]} />
          <meshBasicMaterial color="#67e8f9" transparent opacity={0.18} blending={THREE.AdditiveBlending} />
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
          <meshStandardMaterial color="#101820" emissive="#0b1d2a" emissiveIntensity={0.16} roughness={0.92} metalness={0.06} />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.865, 0.15]}>
          <ringGeometry args={[1.9, 5.0, 160]} />
          <meshBasicMaterial color="#67e8f9" transparent opacity={0.045} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} />
        </mesh>
        <mesh position={[0, 0.06, -6.86]}>
          <boxGeometry args={[13.4, 0.1, 0.12]} />
          <meshStandardMaterial color="#203246" roughness={0.7} metalness={0.12} />
        </mesh>
        {[-5.1, -2.55, 0, 2.55, 5.1].map((x) => (
          <mesh key={x} position={[x, -0.42, -6.86]}>
            <boxGeometry args={[0.12, 1.05, 0.12]} />
            <meshStandardMaterial color="#203246" roughness={0.7} metalness={0.12} />
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
              <meshBasicMaterial color="#fde68a" transparent opacity={0.62} blending={THREE.AdditiveBlending} />
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
          <planeGeometry args={[2.35, 6.6]} />
          <meshStandardMaterial color="#18212d" emissive={isGround ? '#14384d' : '#0b2233'} emissiveIntensity={isGround ? 0.28 : 0.1} roughness={0.96} />
        </mesh>
        {[-1.05, 1.05].map((x) => (
          <mesh key={x} rotation={[-Math.PI / 2, 0, 0]} position={[x, -0.79, 2.55]}>
            <planeGeometry args={[0.08, 5.75]} />
            <meshBasicMaterial color="#67e8f9" transparent opacity={isGround ? 0.36 : 0.18} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} />
          </mesh>
        ))}
        {[0, 1, 2, 3].map((step) => (
          <mesh key={step} position={[0, -1.02 - step * 0.19, 4.32 + step * 0.64]} receiveShadow>
            <boxGeometry args={[3.0 + step * 0.22, 0.18, 0.48]} />
            <meshStandardMaterial color={step === 0 ? '#111827' : '#0b1320'} emissive="#071827" emissiveIntensity={0.12} roughness={0.9} />
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
        <meshStandardMaterial color={mode === 'ground' ? '#071019' : '#071827'} emissive={mode === 'ground' ? '#0f2d3a' : '#0b2638'} emissiveIntensity={0.14} roughness={0.96} />
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

  useFrame(({ clock }) => {
    if (!ref.current) return
    ref.current.position.y = baseY + Math.sin(clock.elapsedTime * 0.9) * 0.04
    ref.current.rotation.y = clock.elapsedTime * 0.34
  })

  return (
    <group ref={ref} position={[x, baseY, mode === 'ground' ? -0.72 : z]}>
      <mesh castShadow>
        <sphereGeometry args={[0.16, 40, 40]} />
        <meshStandardMaterial color="#f8ffff" emissive="#67e8f9" emissiveIntensity={mode === 'life-map' ? 1.65 : 2.25} roughness={0.15} metalness={0.12} />
      </mesh>
      <mesh>
        <sphereGeometry args={[0.34, 32, 32]} />
        <meshBasicMaterial color="#67e8f9" transparent opacity={0.07} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.29, 0.01, 16, 96]} />
        <meshBasicMaterial color="#dffcff" transparent opacity={0.42} blending={THREE.AdditiveBlending} />
      </mesh>
    </group>
  )
}

function GroundPortal({ mode }: { mode: RealPlaceMode }) {
  const ref = useRef<THREE.Group>(null)

  useFrame(({ clock }) => {
    if (!ref.current) return
    ref.current.rotation.z = clock.elapsedTime * 0.08
  })

  return (
    <group ref={ref} position={[0, -0.75, 2.0]} rotation={[Math.PI / 2, 0, 0]}>
      <mesh>
        <torusGeometry args={[0.86, 0.018, 16, 128]} />
        <meshBasicMaterial color="#67e8f9" transparent opacity={mode === 'ground' ? 0.68 : 0.28} blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh>
        <torusGeometry args={[1.34, 0.01, 16, 128]} />
        <meshBasicMaterial color="#67e8f9" transparent opacity={mode === 'ground' ? 0.25 : 0.1} blending={THREE.AdditiveBlending} />
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
    ref.current.rotation.y = Math.sin(clock.elapsedTime * 0.18) * 0.1
  })

  if (!visible) return null

  const stars = [
    [-2.8, 0.5, 0, '#67e8f9'],
    [-1.1, 1.0, -0.4, '#a78bfa'],
    [0.7, 0.8, -0.2, '#86efac'],
    [2.5, 1.2, -0.7, '#f0abfc'],
    [0.1, 2.0, -0.8, '#f8fafc'],
    [3.5, 0.25, -0.5, '#93c5fd'],
  ] as const

  return (
    <CityAssetSlot assetId="life-map-sky-anchor">
      <group ref={ref} position={cityProfile.lifeMapAnchorPosition} scale={strong ? 1.42 : 0.9}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[3.0, 0.02, 16, 150]} />
          <meshBasicMaterial color="#60a5fa" transparent opacity={strong ? 0.58 : 0.22} blending={THREE.AdditiveBlending} />
        </mesh>
        {stars.map(([x, y, z, color], index) => (
          <mesh key={index} position={[x, y, z]}>
            <sphereGeometry args={[strong ? 0.17 : 0.08, 24, 24]} />
            <meshStandardMaterial color="#020617" emissive={color} emissiveIntensity={strong ? 3.6 : 1.45} transparent opacity={0.96} />
          </mesh>
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
      <fog attach="fog" args={["#041225", 5.8, mode === 'life-map' ? 32 : 24]} />
      <PerspectiveCamera makeDefault position={camera.position} fov={camera.fov} />
      <OrbitControls enablePan={false} enableZoom enableDamping dampingFactor={0.06} rotateSpeed={0.28} zoomSpeed={0.55} minDistance={mode === 'ground' ? 3.4 : 4.6} maxDistance={mode === 'life-map' ? 14 : 10.5} minPolarAngle={0.58} maxPolarAngle={1.72} />
      <ambientLight intensity={0.36} color="#d7e7ff" />
      <hemisphereLight args={["#dbeafe", "#020617", 0.95]} />
      <directionalLight position={[-4, 7, 5]} intensity={1.15} color="#dbeafe" castShadow />
      <pointLight position={[1.1, 1.55, -1.9]} intensity={2.8} color="#67e8f9" distance={5.5} />
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
        <Bloom intensity={mode === 'life-map' ? 0.98 : 0.74} luminanceThreshold={0.08} luminanceSmoothing={0.28} />
        <Vignette eskil={false} offset={0.14} darkness={0.66} />
      </EffectComposer>
    </>
  )
}

export default function SpatialRealPlaceWorld({ mode }: RealPlaceWorldProps) {
  const current = copy[mode]
  const dataMode = mode === 'life-map' ? 'life' : mode

  return (
    <main className="srp-root" data-mode={dataMode} aria-label={`URAI ${current.title}`}>
      <Suspense fallback={<div className="srp-loader">URAI city-overlook world loading</div>}>
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

      <Link className="srp-ground" href="/ground">
        <strong>{mode === 'ground' ? 'You are at street level' : 'Street level below'}</strong>
        <span>{mode === 'ground' ? 'same city, lived layer' : 'walk down into the lived city layer'}</span>
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
        .srp-root:before{content:'';position:absolute;inset:0;z-index:2;pointer-events:none;background:radial-gradient(circle at 50% 16%,rgba(96,165,250,.14),transparent 24%),linear-gradient(180deg,rgba(2,6,17,.42),transparent 25%,transparent 67%,rgba(2,6,17,.82))}
        .srp-root[data-mode='ground']:before{background:linear-gradient(180deg,rgba(2,6,17,.26),transparent 24%,rgba(2,6,17,.86))}
        .srp-root[data-mode='life']:before{background:radial-gradient(circle at 50% 14%,rgba(96,165,250,.22),transparent 32%),linear-gradient(180deg,rgba(2,6,17,.22),transparent 31%,rgba(2,6,17,.84))}
        .srp-root canvas{position:absolute;inset:0;z-index:1;display:block;cursor:grab}
        .srp-loader{position:absolute;inset:0;z-index:10;display:grid;place-items:center;background:#020611;color:rgba(226,246,255,.76);letter-spacing:.18em;text-transform:uppercase;font-size:12px}
        .srp-card,.srp-ground,.srp-rail,.srp-status{position:absolute;z-index:5;border:1px solid rgba(160,220,255,.15);background:linear-gradient(145deg,rgba(2,8,24,.5),rgba(10,9,31,.28));box-shadow:0 24px 90px rgba(0,0,0,.28),inset 0 1px 0 rgba(255,255,255,.045);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px)}
        .srp-hero{left:22px;top:22px;width:min(352px,calc(100vw - 44px));padding:16px 18px;border-radius:26px}
        .srp-hero p{margin:0 0 8px;color:rgba(186,230,253,.68);font-size:10px;letter-spacing:.22em;text-transform:uppercase;font-weight:800}
        .srp-hero h1{margin:0 0 8px;font-size:clamp(30px,3.6vw,48px);line-height:.94;font-weight:900;letter-spacing:-.045em;text-shadow:0 0 34px rgba(103,232,249,.18)}
        .srp-hero span{display:block;color:rgba(235,244,255,.68);line-height:1.45;font-size:13px}
        .srp-hero div{display:flex;gap:9px;flex-wrap:wrap;margin-top:15px}
        .srp-hero a,.srp-rail a{border:1px solid rgba(160,220,255,.2);border-radius:999px;padding:9px 12px;color:#eef6ff;text-decoration:none;background:rgba(2,8,24,.46)}
        .srp-hero a.primary{background:linear-gradient(135deg,rgba(103,232,249,.94),rgba(167,139,250,.88));color:#03101f;font-weight:900}
        .srp-status{right:22px;top:22px;padding:10px 13px;border-radius:999px;color:rgba(226,246,255,.78);font-size:11px;letter-spacing:.12em;text-transform:uppercase}
        .srp-ground{left:50%;bottom:88px;display:grid;gap:3px;min-width:226px;padding:13px 18px;transform:translateX(-50%);border-radius:999px;text-align:center;color:#f8fbff;text-decoration:none;box-shadow:0 0 86px rgba(103,232,249,.16),0 24px 90px rgba(0,0,0,.3)}
        .srp-ground strong{font-size:12px;letter-spacing:.16em;text-transform:uppercase}
        .srp-ground span{color:rgba(235,244,255,.68);font-size:11px}
        .srp-rail{left:50%;bottom:18px;display:flex;gap:6px;max-width:calc(100vw - 32px);padding:7px;transform:translateX(-50%);overflow-x:auto;border-radius:999px}
        .srp-rail a{white-space:nowrap;font-size:12px;font-weight:800;letter-spacing:.04em;padding:8px 11px}
        .srp-hero a:hover,.srp-rail a:hover,.srp-ground:hover{border-color:rgba(103,232,249,.56);box-shadow:0 0 46px rgba(103,232,249,.15)}
        @media(max-width:720px){.srp-hero{left:14px;right:14px;top:14px;width:auto;padding:14px}.srp-hero h1{font-size:32px}.srp-status{display:none}.srp-ground{bottom:82px;min-width:190px}.srp-rail{bottom:12px}}
      `}</style>
    </main>
  )
}
