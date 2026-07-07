'use client'

import { OrbitControls, PerspectiveCamera } from '@react-three/drei'
import { Canvas, useFrame } from '@react-three/fiber'
import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing'
import Link from 'next/link'
import { Suspense, useMemo, useRef } from 'react'
import * as THREE from 'three'

type RealPlaceMode = 'home' | 'ground' | 'life-map'

type RealPlaceWorldProps = {
  mode: RealPlaceMode
}

const cityProfile = {
  id: 'default-city-overlook',
  title: 'City Overlook',
  orbAnchorPosition: [0.78, 0.92, -1.65] as [number, number, number],
  lifeMapAnchorPosition: [0, 4.9, -8.2] as [number, number, number],
  camera: {
    home: { position: [0, 2.12, 7.25] as [number, number, number], fov: 42 },
    ground: { position: [0, 1.34, 5.35] as [number, number, number], fov: 46 },
    'life-map': { position: [0, 3.85, 8.45] as [number, number, number], fov: 44 },
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

function Stars({ mode }: { mode: RealPlaceMode }) {
  const ref = useRef<THREE.Points>(null)
  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry()
    const count = mode === 'life-map' ? 1100 : 620
    const positions = new Float32Array(count * 3)
    for (let i = 0; i < count; i += 1) {
      const angle = i * 2.399963
      const radius = 8 + (i % 151) * 0.34
      positions[i * 3] = Math.cos(angle) * radius
      positions[i * 3 + 1] = 0.75 + ((i * 29) % 250) / 18
      positions[i * 3 + 2] = -11.5 + Math.sin(angle) * radius
    }
    g.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    return g
  }, [mode])

  useFrame(({ clock }) => {
    if (!ref.current) return
    ref.current.rotation.y = clock.elapsedTime * 0.005
  })

  return (
    <points ref={ref} geometry={geometry}>
      <pointsMaterial size={mode === 'life-map' ? 0.034 : 0.022} color="#d9f8ff" transparent opacity={mode === 'ground' ? 0.18 : 0.52} depthWrite={false} blending={THREE.AdditiveBlending} />
    </points>
  )
}

function CitySkylineBackdrop() {
  const buildings = [
    [-7.4, -0.05, -9.8, 1.15, 2.3, 0.75],
    [-6.05, 0.35, -10.05, 0.92, 3.2, 0.75],
    [-4.95, 0.0, -9.65, 1.35, 2.5, 0.8],
    [-3.3, 0.55, -9.9, 1.05, 3.7, 0.75],
    [-1.85, 0.82, -10.15, 1.25, 4.4, 0.78],
    [-0.25, 0.25, -9.75, 1.4, 3.0, 0.8],
    [1.45, 0.62, -10.0, 1.0, 4.0, 0.75],
    [2.85, 0.2, -9.55, 1.25, 2.8, 0.8],
    [4.35, 0.65, -9.95, 1.05, 3.9, 0.75],
    [5.72, 0.15, -9.65, 1.28, 2.7, 0.78],
    [7.1, 0.45, -10.1, 0.95, 3.45, 0.75],
  ] as const

  return (
    <group>
      {buildings.map(([x, y, z, w, h, d], index) => (
        <group key={index} position={[x, y, z]}>
          <mesh castShadow>
            <boxGeometry args={[w, h, d]} />
            <meshStandardMaterial color="#071220" emissive="#10253b" emissiveIntensity={0.2} roughness={0.88} metalness={0.06} />
          </mesh>
          {Array.from({ length: 5 }).map((_, row) => (
            <mesh key={row} position={[0, -h / 2 + 0.46 + row * 0.52, d / 2 + 0.01]}>
              <boxGeometry args={[w * 0.72, 0.035, 0.02]} />
              <meshBasicMaterial color={row % 2 === 0 ? '#facc6b' : '#67e8f9'} transparent opacity={0.13 + ((index + row) % 3) * 0.04} blending={THREE.AdditiveBlending} />
            </mesh>
          ))}
        </group>
      ))}
      <mesh position={[0, 1.05, -10.35]}>
        <boxGeometry args={[16.5, 0.02, 0.02]} />
        <meshBasicMaterial color="#67e8f9" transparent opacity={0.22} blending={THREE.AdditiveBlending} />
      </mesh>
    </group>
  )
}

function StreetLevelGround({ mode }: { mode: RealPlaceMode }) {
  const isGround = mode === 'ground'

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.88, 0.25]} receiveShadow>
        <planeGeometry args={[9.2, 5.2]} />
        <meshStandardMaterial color="#111827" emissive="#0b1d2a" emissiveIntensity={0.14} roughness={0.92} metalness={0.05} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.84, 2.85]} receiveShadow>
        <planeGeometry args={[2.35, 6.2]} />
        <meshStandardMaterial color="#18212d" emissive={isGround ? '#14384d' : '#0b2233'} emissiveIntensity={isGround ? 0.28 : 0.1} roughness={0.96} />
      </mesh>
      {[-1.05, 1.05].map((x) => (
        <mesh key={x} rotation={[-Math.PI / 2, 0, 0]} position={[x, -0.79, 2.6]}>
          <planeGeometry args={[0.08, 5.4]} />
          <meshBasicMaterial color="#67e8f9" transparent opacity={isGround ? 0.36 : 0.18} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} />
        </mesh>
      ))}
      {[0, 1, 2].map((step) => (
        <mesh key={step} position={[0, -1.04 - step * 0.22, 4.65 + step * 0.72]} receiveShadow>
          <boxGeometry args={[3.1 + step * 0.24, 0.2, 0.54]} />
          <meshStandardMaterial color={step === 0 ? '#111827' : '#0b1320'} emissive="#071827" emissiveIntensity={0.12} roughness={0.9} />
        </mesh>
      ))}
      {[-3.9, 3.9].map((x) => (
        <group key={x} position={[x, -0.36, -4.8]}>
          <mesh>
            <cylinderGeometry args={[0.05, 0.07, 1.4, 16]} />
            <meshStandardMaterial color="#172437" emissive="#0f172a" emissiveIntensity={0.2} roughness={0.58} />
          </mesh>
          <mesh position={[0, 0.82, 0]}>
            <sphereGeometry args={[0.16, 24, 24]} />
            <meshBasicMaterial color="#fde68a" transparent opacity={0.62} blending={THREE.AdditiveBlending} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

function CityOverlookEnvironment({ mode }: { mode: RealPlaceMode }) {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.98, -2.6]} receiveShadow>
        <circleGeometry args={[25, 180]} />
        <meshStandardMaterial color={mode === 'ground' ? '#071019' : '#071827'} emissive={mode === 'ground' ? '#0f2d3a' : '#0b2638'} emissiveIntensity={0.14} roughness={0.96} />
      </mesh>
      <StreetLevelGround mode={mode} />
      <CitySkylineBackdrop />
      <mesh position={[0, 0.05, -6.85]}>
        <boxGeometry args={[12.4, 0.1, 0.12]} />
        <meshStandardMaterial color="#203246" roughness={0.7} metalness={0.12} />
      </mesh>
      {[-4.2, -1.4, 1.4, 4.2].map((x) => (
        <mesh key={x} position={[x, -0.42, -6.85]}>
          <boxGeometry args={[0.12, 1.05, 0.12]} />
          <meshStandardMaterial color="#203246" roughness={0.7} metalness={0.12} />
        </mesh>
      ))}
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
    <group ref={ref} position={[x, baseY, mode === 'ground' ? -0.75 : z]}>
      <mesh castShadow>
        <sphereGeometry args={[0.18, 40, 40]} />
        <meshStandardMaterial color="#f8ffff" emissive="#67e8f9" emissiveIntensity={mode === 'life-map' ? 1.8 : 2.4} roughness={0.15} metalness={0.12} />
      </mesh>
      <mesh>
        <sphereGeometry args={[0.42, 32, 32]} />
        <meshBasicMaterial color="#67e8f9" transparent opacity={0.08} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.32, 0.01, 16, 96]} />
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
    <group ref={ref} position={[0, -0.75, 2.1]} rotation={[Math.PI / 2, 0, 0]}>
      <mesh>
        <torusGeometry args={[0.95, 0.018, 16, 128]} />
        <meshBasicMaterial color="#67e8f9" transparent opacity={mode === 'ground' ? 0.72 : 0.34} blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh>
        <torusGeometry args={[1.42, 0.01, 16, 128]} />
        <meshBasicMaterial color="#67e8f9" transparent opacity={mode === 'ground' ? 0.28 : 0.14} blending={THREE.AdditiveBlending} />
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
    <group ref={ref} position={cityProfile.lifeMapAnchorPosition} scale={strong ? 1.35 : 0.82}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[3.0, 0.02, 16, 150]} />
        <meshBasicMaterial color="#60a5fa" transparent opacity={strong ? 0.55 : 0.16} blending={THREE.AdditiveBlending} />
      </mesh>
      {stars.map(([x, y, z, color], index) => (
        <mesh key={index} position={[x, y, z]}>
          <sphereGeometry args={[strong ? 0.16 : 0.08, 24, 24]} />
          <meshStandardMaterial color="#020617" emissive={color} emissiveIntensity={strong ? 3.4 : 1.3} transparent opacity={0.96} />
        </mesh>
      ))}
    </group>
  )
}

function SpatialScene({ mode }: { mode: RealPlaceMode }) {
  const camera = cityProfile.camera[mode]

  return (
    <>
      <color attach="background" args={["#020611"]} />
      <fog attach="fog" args={["#041225", 6, mode === 'life-map' ? 30 : 22]} />
      <PerspectiveCamera makeDefault position={camera.position} fov={camera.fov} />
      <OrbitControls enablePan={false} enableZoom enableDamping dampingFactor={0.06} rotateSpeed={0.28} zoomSpeed={0.55} minDistance={mode === 'ground' ? 3.4 : 4.6} maxDistance={mode === 'life-map' ? 14 : 10.5} minPolarAngle={0.58} maxPolarAngle={1.72} />
      <ambientLight intensity={0.38} color="#d7e7ff" />
      <hemisphereLight args={["#dbeafe", "#020617", 1.0]} />
      <directionalLight position={[-4, 7, 5]} intensity={1.2} color="#dbeafe" castShadow />
      <pointLight position={[1.0, 1.8, -1.6]} intensity={3.4} color="#67e8f9" distance={6.5} />
      <pointLight position={[-3.5, 1.8, -7.5]} intensity={1.2} color="#f59e0b" distance={12} />
      <pointLight position={[3.5, 1.8, -7.5]} intensity={1.0} color="#a78bfa" distance={12} />
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
        <Bloom intensity={mode === 'life-map' ? 1.02 : 0.82} luminanceThreshold={0.08} luminanceSmoothing={0.26} />
        <Vignette eskil={false} offset={0.14} darkness={0.7} />
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
        .srp-root:before{content:'';position:absolute;inset:0;z-index:2;pointer-events:none;background:radial-gradient(circle at 50% 16%,rgba(96,165,250,.14),transparent 24%),linear-gradient(180deg,rgba(2,6,17,.52),transparent 23%,transparent 66%,rgba(2,6,17,.86))}
        .srp-root[data-mode='ground']:before{background:linear-gradient(180deg,rgba(2,6,17,.32),transparent 22%,rgba(2,6,17,.88))}
        .srp-root[data-mode='life']:before{background:radial-gradient(circle at 50% 14%,rgba(96,165,250,.26),transparent 32%),linear-gradient(180deg,rgba(2,6,17,.28),transparent 30%,rgba(2,6,17,.86))}
        .srp-root canvas{position:absolute;inset:0;z-index:1;display:block;cursor:grab}
        .srp-loader{position:absolute;inset:0;z-index:10;display:grid;place-items:center;background:#020611;color:rgba(226,246,255,.76);letter-spacing:.18em;text-transform:uppercase;font-size:12px}
        .srp-card,.srp-ground,.srp-rail,.srp-status{position:absolute;z-index:5;border:1px solid rgba(160,220,255,.15);background:linear-gradient(145deg,rgba(2,8,24,.54),rgba(10,9,31,.32));box-shadow:0 24px 90px rgba(0,0,0,.28),inset 0 1px 0 rgba(255,255,255,.045);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px)}
        .srp-hero{left:22px;top:22px;width:min(352px,calc(100vw - 44px));padding:16px 18px;border-radius:26px}
        .srp-hero p{margin:0 0 8px;color:rgba(186,230,253,.68);font-size:10px;letter-spacing:.22em;text-transform:uppercase;font-weight:800}
        .srp-hero h1{margin:0 0 8px;font-size:clamp(30px,3.6vw,48px);line-height:.94;font-weight:900;letter-spacing:-.045em;text-shadow:0 0 34px rgba(103,232,249,.18)}
        .srp-hero span{display:block;color:rgba(235,244,255,.68);line-height:1.45;font-size:13px}
        .srp-hero div{display:flex;gap:9px;flex-wrap:wrap;margin-top:15px}
        .srp-hero a,.srp-rail a{border:1px solid rgba(160,220,255,.2);border-radius:999px;padding:9px 12px;color:#eef6ff;text-decoration:none;background:rgba(2,8,24,.46)}
        .srp-hero a.primary{background:linear-gradient(135deg,rgba(103,232,249,.94),rgba(167,139,250,.88));color:#03101f;font-weight:900}
        .srp-status{right:22px;top:22px;padding:10px 13px;border-radius:999px;color:rgba(226,246,255,.78);font-size:11px;letter-spacing:.12em;text-transform:uppercase}
        .srp-ground{left:50%;bottom:88px;display:grid;gap:3px;min-width:226px;padding:13px 18px;transform:translateX(-50%);border-radius:999px;text-align:center;color:#f8fbff;text-decoration:none;box-shadow:0 0 86px rgba(103,232,249,.18),0 24px 90px rgba(0,0,0,.3)}
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
