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

const copy = {
  home: {
    eyebrow: 'URAI Spatial',
    title: 'Backyard overlook',
    body: 'A real place first. Ground is the lived layer below. Life Map opens in the sky above.',
    primary: ['Descend Ground', '/ground'],
    secondary: ['Open Life Map', '/life-map'],
    status: 'Default real-place home world',
  },
  ground: {
    eyebrow: 'URAI Ground',
    title: 'Walkable life layer',
    body: 'The same place, closer to the ground: path, yard, objects, and approvals stay embodied.',
    primary: ['Return Home', '/home'],
    secondary: ['Open Life Map', '/life-map'],
    status: 'Ground mode descended',
  },
  'life-map': {
    eyebrow: 'URAI Life Map',
    title: 'Memory sky above',
    body: 'The same place remains below while memory stars and focus paths open overhead.',
    primary: ['Return Home', '/home'],
    secondary: ['Enter Focus', '/focus?manifestId=seed-memory-bloom'],
    status: 'Life Map sky layer active',
  },
} as const

function Stars({ mode }: { mode: RealPlaceMode }) {
  const ref = useRef<THREE.Points>(null)
  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry()
    const count = mode === 'life-map' ? 920 : 520
    const positions = new Float32Array(count * 3)
    for (let i = 0; i < count; i += 1) {
      const angle = i * 2.399963
      const radius = 8 + (i % 137) * 0.36
      positions[i * 3] = Math.cos(angle) * radius
      positions[i * 3 + 1] = 1.1 + ((i * 29) % 220) / 18
      positions[i * 3 + 2] = -12 + Math.sin(angle) * radius
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
      <pointsMaterial size={mode === 'life-map' ? 0.035 : 0.024} color="#d9f8ff" transparent opacity={mode === 'ground' ? 0.22 : 0.58} depthWrite={false} blending={THREE.AdditiveBlending} />
    </points>
  )
}

function EnvironmentShell({ mode }: { mode: RealPlaceMode }) {
  const group = useRef<THREE.Group>(null)

  useFrame(({ clock }) => {
    if (!group.current) return
    group.current.position.y = Math.sin(clock.elapsedTime * 0.45) * 0.018
  })

  return (
    <group ref={group}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.9, -2.2]} receiveShadow>
        <circleGeometry args={[18, 180]} />
        <meshStandardMaterial color={mode === 'ground' ? '#071b14' : '#092235'} roughness={0.9} metalness={0.04} emissive={mode === 'ground' ? '#0f3b2d' : '#0b3348'} emissiveIntensity={0.16} />
      </mesh>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.84, -2.2]}>
        <ringGeometry args={[2.6, 16.5, 180]} />
        <meshBasicMaterial color="#67e8f9" transparent opacity={mode === 'ground' ? 0.08 : 0.045} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} />
      </mesh>

      <mesh position={[0, 0.12, -8.7]}>
        <boxGeometry args={[14, 0.16, 0.22]} />
        <meshStandardMaterial color="#0c2532" emissive="#60a5fa" emissiveIntensity={0.16} roughness={0.7} />
      </mesh>
      <mesh position={[-4.9, -0.18, -6.7]}>
        <boxGeometry args={[0.16, 1.6, 0.16]} />
        <meshStandardMaterial color="#12263a" emissive="#134e4a" emissiveIntensity={0.12} />
      </mesh>
      <mesh position={[4.9, -0.18, -6.7]}>
        <boxGeometry args={[0.16, 1.6, 0.16]} />
        <meshStandardMaterial color="#12263a" emissive="#134e4a" emissiveIntensity={0.12} />
      </mesh>

      {[-7, -5.6, 5.8, 7.2].map((x, index) => (
        <group key={x} position={[x, -0.5, -6.9 - (index % 2) * 0.8]}>
          <mesh>
            <cylinderGeometry args={[0.12, 0.2, 2.2 + index * 0.35, 8]} />
            <meshStandardMaterial color="#071522" emissive="#0f766e" emissiveIntensity={0.11} roughness={0.8} />
          </mesh>
          <mesh position={[0, 1.32 + index * 0.18, 0]}>
            <sphereGeometry args={[0.42 + index * 0.08, 16, 16]} />
            <meshStandardMaterial color="#09291f" emissive="#34d399" emissiveIntensity={0.18} roughness={0.9} />
          </mesh>
        </group>
      ))}

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.78, 0.8]}>
        <circleGeometry args={[3.7, 128]} />
        <meshStandardMaterial color="#111827" emissive="#0e7490" emissiveIntensity={0.18} roughness={0.74} metalness={0.12} />
      </mesh>
    </group>
  )
}

function OrbGuide({ mode }: { mode: RealPlaceMode }) {
  const ref = useRef<THREE.Group>(null)

  useFrame(({ clock }) => {
    if (!ref.current) return
    ref.current.position.y = 0.92 + Math.sin(clock.elapsedTime * 0.9) * 0.055
    ref.current.rotation.y = clock.elapsedTime * 0.22
  })

  const z = mode === 'ground' ? -0.2 : -0.9
  return (
    <group ref={ref} position={[0, 0.92, z]}>
      <mesh castShadow>
        <sphereGeometry args={[0.42, 56, 56]} />
        <meshStandardMaterial color="#f8ffff" emissive="#67e8f9" emissiveIntensity={mode === 'life-map' ? 2.2 : 3.1} roughness={0.1} metalness={0.2} />
      </mesh>
      <mesh>
        <sphereGeometry args={[1.26, 48, 48]} />
        <meshBasicMaterial color="#67e8f9" transparent opacity={0.1} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.78, 0.018, 16, 112]} />
        <meshBasicMaterial color="#e0fbff" transparent opacity={0.5} blending={THREE.AdditiveBlending} />
      </mesh>
    </group>
  )
}

function GroundPath({ mode }: { mode: RealPlaceMode }) {
  return (
    <group position={[0, -0.72, 1.75]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.7, 1.55, 96]} />
        <meshBasicMaterial color="#67e8f9" transparent opacity={mode === 'ground' ? 0.72 : 0.32} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh position={[0, -0.15, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[1.08, 96]} />
        <meshStandardMaterial color="#020814" emissive="#0ea5e9" emissiveIntensity={mode === 'ground' ? 0.42 : 0.18} roughness={0.58} metalness={0.18} />
      </mesh>
    </group>
  )
}

function LifeMapSky({ mode }: { mode: RealPlaceMode }) {
  const ref = useRef<THREE.Group>(null)
  const visible = mode !== 'ground'

  useFrame(({ clock }) => {
    if (!ref.current) return
    ref.current.rotation.y = Math.sin(clock.elapsedTime * 0.18) * 0.12
  })

  return (
    <group ref={ref} visible={visible} position={[0, mode === 'life-map' ? 4.1 : 3.1, -6.4]} scale={mode === 'life-map' ? 1.45 : 0.68}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[2.5, 0.018, 18, 180]} />
        <meshBasicMaterial color="#60a5fa" transparent opacity={mode === 'life-map' ? 0.74 : 0.22} blending={THREE.AdditiveBlending} />
      </mesh>
      {[
        [-2.3, 0.35, -0.1, '#67e8f9'],
        [-0.7, 0.9, -0.5, '#a78bfa'],
        [0.8, 0.5, -0.2, '#86efac'],
        [2.2, 1.15, -0.7, '#f0abfc'],
        [0.1, 1.8, -0.9, '#f8fafc'],
      ].map(([x, y, z, color], index) => (
        <mesh key={index} position={[x as number, y as number, z as number]}>
          <sphereGeometry args={[mode === 'life-map' ? 0.18 : 0.08, 28, 28]} />
          <meshStandardMaterial color="#020617" emissive={color as string} emissiveIntensity={mode === 'life-map' ? 3.8 : 1.4} transparent opacity={0.96} />
        </mesh>
      ))}
    </group>
  )
}

function SpatialScene({ mode }: { mode: RealPlaceMode }) {
  const cameraPosition: [number, number, number] = mode === 'ground' ? [0, 1.45, 5.8] : mode === 'life-map' ? [0, 3.85, 8.2] : [0, 2.05, 7.1]
  const fov = mode === 'life-map' ? 46 : 42

  return (
    <>
      <color attach="background" args={["#020611"]} />
      <fog attach="fog" args={["#041225", 6, mode === 'life-map' ? 30 : 22]} />
      <PerspectiveCamera makeDefault position={cameraPosition} fov={fov} />
      <OrbitControls enablePan={false} enableZoom enableDamping dampingFactor={0.06} rotateSpeed={0.28} zoomSpeed={0.55} minDistance={mode === 'ground' ? 3.2 : 4.4} maxDistance={mode === 'life-map' ? 14 : 10.5} minPolarAngle={0.58} maxPolarAngle={1.74} />
      <ambientLight intensity={0.38} color="#c7ddff" />
      <hemisphereLight args={["#dbeafe", "#020617", 1.0]} />
      <directionalLight position={[-4, 7, 5]} intensity={1.25} color="#dbeafe" castShadow />
      <pointLight position={[0, 2.2, -0.8]} intensity={mode === 'life-map' ? 3.2 : 5.0} color="#67e8f9" distance={9} />
      <pointLight position={[-3.5, 2.1, -3.5]} intensity={1.5} color="#a78bfa" distance={12} />
      <pointLight position={[3.5, 1.8, -3.5]} intensity={1.4} color="#86efac" distance={12} />
      <mesh scale={[-1, 1, 1]}>
        <sphereGeometry args={[60, 72, 72]} />
        <meshBasicMaterial side={THREE.BackSide} color="#020713" />
      </mesh>
      <Stars mode={mode} />
      <EnvironmentShell mode={mode} />
      <GroundPath mode={mode} />
      <OrbGuide mode={mode} />
      <LifeMapSky mode={mode} />
      <EffectComposer>
        <Bloom intensity={mode === 'life-map' ? 1.08 : 0.92} luminanceThreshold={0.08} luminanceSmoothing={0.26} />
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
      <Suspense fallback={<div className="srp-loader">URAI real-place world loading</div>}>
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
        <strong>{mode === 'ground' ? 'You are on Ground' : 'Ground below'}</strong>
        <span>{mode === 'ground' ? 'same place, lived level' : 'descend into the lived layer'}</span>
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
        .srp-root:before{content:'';position:absolute;inset:0;z-index:2;pointer-events:none;background:radial-gradient(circle at 50% 16%,rgba(96,165,250,.14),transparent 24%),linear-gradient(180deg,rgba(2,6,17,.58),transparent 23%,transparent 66%,rgba(2,6,17,.86))}
        .srp-root[data-mode='ground']:before{background:linear-gradient(180deg,rgba(2,6,17,.42),transparent 22%,rgba(2,6,17,.88))}
        .srp-root[data-mode='life']:before{background:radial-gradient(circle at 50% 14%,rgba(96,165,250,.26),transparent 32%),linear-gradient(180deg,rgba(2,6,17,.36),transparent 30%,rgba(2,6,17,.86))}
        .srp-root canvas{position:absolute;inset:0;z-index:1;display:block;cursor:grab}
        .srp-loader{position:absolute;inset:0;z-index:10;display:grid;place-items:center;background:#020611;color:rgba(226,246,255,.76);letter-spacing:.18em;text-transform:uppercase;font-size:12px}
        .srp-card,.srp-ground,.srp-rail,.srp-status{position:absolute;z-index:5;border:1px solid rgba(160,220,255,.15);background:linear-gradient(145deg,rgba(2,8,24,.54),rgba(10,9,31,.32));box-shadow:0 24px 90px rgba(0,0,0,.28),inset 0 1px 0 rgba(255,255,255,.045);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px)}
        .srp-hero{left:22px;top:22px;width:min(340px,calc(100vw - 44px));padding:16px 18px;border-radius:26px}
        .srp-hero p{margin:0 0 8px;color:rgba(186,230,253,.68);font-size:10px;letter-spacing:.22em;text-transform:uppercase;font-weight:800}
        .srp-hero h1{margin:0 0 8px;font-size:clamp(30px,3.6vw,48px);line-height:.94;font-weight:900;letter-spacing:-.045em;text-shadow:0 0 34px rgba(103,232,249,.18)}
        .srp-hero span{display:block;color:rgba(235,244,255,.68);line-height:1.45;font-size:13px}
        .srp-hero div{display:flex;gap:9px;flex-wrap:wrap;margin-top:15px}
        .srp-hero a,.srp-rail a{border:1px solid rgba(160,220,255,.2);border-radius:999px;padding:9px 12px;color:#eef6ff;text-decoration:none;background:rgba(2,8,24,.46)}
        .srp-hero a.primary{background:linear-gradient(135deg,rgba(103,232,249,.94),rgba(167,139,250,.88));color:#03101f;font-weight:900}
        .srp-status{right:22px;top:22px;padding:10px 13px;border-radius:999px;color:rgba(226,246,255,.78);font-size:11px;letter-spacing:.12em;text-transform:uppercase}
        .srp-ground{left:50%;bottom:88px;display:grid;gap:3px;min-width:206px;padding:13px 18px;transform:translateX(-50%);border-radius:999px;text-align:center;color:#f8fbff;text-decoration:none;box-shadow:0 0 86px rgba(103,232,249,.18),0 24px 90px rgba(0,0,0,.3)}
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
