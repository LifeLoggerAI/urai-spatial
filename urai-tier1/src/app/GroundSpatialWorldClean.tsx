'use client'

import { Html, OrbitControls, PerspectiveCamera, Stars } from '@react-three/drei'
import { Canvas, useFrame } from '@react-three/fiber'
import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing'
import Link from 'next/link'
import { Suspense, useRef, type CSSProperties } from 'react'
import * as THREE from 'three'
import { assetCssStack, groundAssets } from '@/spatial/assets/uraiAssets'

const groundLinkStyle: CSSProperties = {
  display: 'inline-flex',
  flex: '0 0 auto',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: 34,
  padding: '8px 11px',
  border: '1px solid rgba(160,220,255,.24)',
  borderRadius: 999,
  color: '#eef6ff',
  background: 'rgba(2,8,24,.68)',
  textDecoration: 'none',
  whiteSpace: 'nowrap',
  fontSize: 12,
  fontWeight: 800,
  letterSpacing: '.04em',
  boxSizing: 'border-box',
}

const groundPrimaryLinkStyle: CSSProperties = {
  ...groundLinkStyle,
  background: 'linear-gradient(135deg,rgba(103,232,249,.94),rgba(167,139,250,.88))',
  color: '#03101f',
  fontWeight: 900,
}

const groundActiveLinkStyle: CSSProperties = {
  ...groundLinkStyle,
  border: '1px solid rgba(154,240,255,.66)',
  color: '#ffffff',
  background: 'rgba(28,91,115,.82)',
  boxShadow: '0 0 24px rgba(103,232,249,.2), inset 0 1px 0 rgba(255,255,255,.12)',
}

const groundRailLinks = [
  { href: '/home', label: 'Home' },
  { href: '/ground', label: 'Ground' },
  { href: '/life-map', label: 'Life Map' },
  { href: '/focus?memoryId=quiet-reset&manifestId=replay-recovery-thread&node=quiet-reset', label: 'Focus' },
  { href: '/replay?memoryId=quiet-reset&manifestId=replay-recovery-thread&node=quiet-reset', label: 'Replay' },
] as const

type GroundDistrictSpec = {
  id: 'reception' | 'sanctuary' | 'council' | 'logistics' | 'wellness' | 'archive'
  label: string
  detail: string
  color: string
  position: [number, number, number]
  rotationY: number
}

const GROUND_DISTRICTS: readonly GroundDistrictSpec[] = [
  { id: 'reception', label: 'Reception', detail: 'Today and arrivals', color: '#67e8f9', position: [-3.35, -0.74, -0.9], rotationY: 0.32 },
  { id: 'sanctuary', label: 'Privacy Sanctuary', detail: 'Consent and control', color: '#a78bfa', position: [3.35, -0.74, -0.9], rotationY: -0.32 },
  { id: 'council', label: 'Council Table', detail: 'Schedule and decisions', color: '#facc6b', position: [0, -0.74, -4.65], rotationY: 0 },
  { id: 'logistics', label: 'Logistics', detail: 'Tasks and movement', color: '#fb7185', position: [-4.15, -0.74, -5.45], rotationY: 0.5 },
  { id: 'wellness', label: 'Wellness', detail: 'Check-in and recovery', color: '#86efac', position: [4.15, -0.74, -5.45], rotationY: -0.5 },
  { id: 'archive', label: 'Archive', detail: 'Memory and provenance', color: '#93c5fd', position: [0, -0.74, -8.1], rotationY: 0 },
]

const WORKFORCE: readonly { position: [number, number, number]; color: string; phase: number }[] = [
  { position: [-1.7, -0.68, 0.15], color: '#67e8f9', phase: 0.2 },
  { position: [1.75, -0.68, 0.2], color: '#a78bfa', phase: 1.1 },
  { position: [-2.55, -0.68, -3.25], color: '#facc6b', phase: 2.2 },
  { position: [2.65, -0.68, -3.4], color: '#86efac', phase: 3.1 },
  { position: [-1.65, -0.68, -6.6], color: '#fb7185', phase: 4.1 },
  { position: [1.7, -0.68, -6.65], color: '#93c5fd', phase: 5.2 },
]

function WorkforceAvatar({ position, color, phase }: { position: [number, number, number]; color: string; phase: number }) {
  const ref = useRef<THREE.Group>(null)
  useFrame(({ clock }) => {
    if (!ref.current) return
    ref.current.position.y = position[1] + Math.sin(clock.elapsedTime * 0.9 + phase) * 0.025
    ref.current.rotation.y = Math.sin(clock.elapsedTime * 0.22 + phase) * 0.18
  })

  return (
    <group ref={ref} position={position} data-ground-workforce-avatar="true">
      <mesh position={[0, 1.22, 0]} castShadow>
        <sphereGeometry args={[0.18, 24, 24]} />
        <meshPhysicalMaterial color="#e6f7fa" emissive={color} emissiveIntensity={0.24} roughness={0.32} metalness={0.16} />
      </mesh>
      <mesh position={[0, 0.72, 0]} castShadow>
        <capsuleGeometry args={[0.22, 0.62, 8, 20]} />
        <meshStandardMaterial color="#142331" emissive={color} emissiveIntensity={0.18} roughness={0.48} metalness={0.34} />
      </mesh>
      <mesh position={[0, 0.25, 0]}>
        <cylinderGeometry args={[0.34, 0.4, 0.05, 36]} />
        <meshBasicMaterial color={color} transparent opacity={0.42} toneMapped={false} />
      </mesh>
    </group>
  )
}

function CouncilPlaza() {
  const ring = useRef<THREE.Mesh>(null)
  useFrame(({ clock }) => {
    if (ring.current) ring.current.rotation.z = clock.elapsedTime * 0.08
  })

  return (
    <group position={[0, -0.72, -3.1]} data-testid="urai-ground-council-plaza">
      <mesh receiveShadow>
        <cylinderGeometry args={[2.05, 2.3, 0.22, 96]} />
        <meshStandardMaterial color="#132630" emissive="#38bdf8" emissiveIntensity={0.12} roughness={0.42} metalness={0.52} />
      </mesh>
      <mesh ref={ring} position={[0, 0.14, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.25, 1.38, 128]} />
        <meshBasicMaterial color="#7dd3fc" transparent opacity={0.54} toneMapped={false} />
      </mesh>
      <mesh position={[0, 0.58, 0]} receiveShadow castShadow>
        <cylinderGeometry args={[1.08, 1.2, 0.18, 64]} />
        <meshPhysicalMaterial color="#243d48" emissive="#67e8f9" emissiveIntensity={0.15} roughness={0.22} metalness={0.68} clearcoat={0.8} />
      </mesh>
      <mesh position={[0, 0.79, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.82, 96]} />
        <meshBasicMaterial color="#baf7ff" transparent opacity={0.22} toneMapped={false} />
      </mesh>
      {[0, 1, 2, 3, 4, 5].map((index) => {
        const angle = (index / 6) * Math.PI * 2
        return (
          <mesh key={index} position={[Math.sin(angle) * 1.5, 0.33, Math.cos(angle) * 1.5]} rotation={[0, angle, 0]} castShadow>
            <boxGeometry args={[0.48, 0.62, 0.52]} />
            <meshStandardMaterial color="#101c27" emissive={index % 2 ? '#a78bfa' : '#67e8f9'} emissiveIntensity={0.12} roughness={0.6} metalness={0.24} />
          </mesh>
        )
      })}
      <Html position={[0, 1.25, 0]} center distanceFactor={9}>
        <span className="ground-district-label council"><strong>Private Council</strong><em>Nothing acts without you</em></span>
      </Html>
    </group>
  )
}

function GroundDistrict({ spec }: { spec: GroundDistrictSpec }) {
  const beacon = useRef<THREE.Mesh>(null)
  const color = new THREE.Color(spec.color)

  useFrame(({ clock }) => {
    if (beacon.current) beacon.current.rotation.z = clock.elapsedTime * 0.16 + spec.position[0] * 0.1
  })

  return (
    <group position={spec.position} rotation={[0, spec.rotationY, 0]} data-ground-district={spec.id}>
      <mesh receiveShadow castShadow>
        <cylinderGeometry args={[1.35, 1.62, 0.22, 64]} />
        <meshStandardMaterial color="#112330" emissive={color} emissiveIntensity={0.1} roughness={0.5} metalness={0.44} />
      </mesh>
      <mesh position={[0, 0.14, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.92, 1.18, 96]} />
        <meshBasicMaterial color={color} transparent opacity={0.48} toneMapped={false} />
      </mesh>
      {[-0.92, 0.92].map((x) => (
        <mesh key={x} position={[x, 1.08, -0.35]} castShadow>
          <cylinderGeometry args={[0.08, 0.13, 2.05, 14]} />
          <meshStandardMaterial color="#29414a" emissive={color} emissiveIntensity={0.2} roughness={0.38} metalness={0.56} />
        </mesh>
      ))}
      <mesh position={[0, 2.05, -0.35]} castShadow>
        <boxGeometry args={[2.15, 0.15, 0.72]} />
        <meshStandardMaterial color="#243b45" emissive={color} emissiveIntensity={0.18} roughness={0.34} metalness={0.62} />
      </mesh>
      <mesh position={[0, 0.56, 0.1]} castShadow>
        <cylinderGeometry args={[0.56, 0.7, 0.18, 48]} />
        <meshPhysicalMaterial color="#1d3540" emissive={color} emissiveIntensity={0.22} roughness={0.2} metalness={0.66} clearcoat={0.7} />
      </mesh>
      <mesh ref={beacon} position={[0, 1.22, -0.26]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.38, 0.025, 12, 72]} />
        <meshBasicMaterial color={color} transparent opacity={0.82} toneMapped={false} />
      </mesh>
      <pointLight position={[0, 1.1, 0.3]} color={color} intensity={3.4} distance={5.4} decay={2} />
      <Html position={[0, 2.48, 0]} center distanceFactor={10}>
        <span className="ground-district-label"><strong>{spec.label}</strong><em>{spec.detail}</em></span>
      </Html>
    </group>
  )
}

function GroundPaths() {
  const paths = GROUND_DISTRICTS.map((district) => {
    const x = district.position[0] * 0.5
    const z = (district.position[2] + 3.1) * 0.5 - 3.1
    const length = Math.max(2.2, Math.hypot(district.position[0], district.position[2] + 3.1))
    const angle = Math.atan2(district.position[0], district.position[2] + 3.1)
    return { id: district.id, x, z, length, angle, color: district.color }
  })

  return (
    <group>
      {paths.map((path) => (
        <group key={path.id} position={[path.x, -0.71, path.z]} rotation={[0, path.angle, 0]}>
          <mesh receiveShadow>
            <boxGeometry args={[0.68, 0.045, path.length]} />
            <meshStandardMaterial color="#20313b" roughness={0.72} metalness={0.2} />
          </mesh>
          <mesh position={[0, 0.035, 0]}>
            <boxGeometry args={[0.045, 0.015, path.length * 0.92]} />
            <meshBasicMaterial color={path.color} transparent opacity={0.48} toneMapped={false} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

function GroundScene() {
  return (
    <>
      <color attach="background" args={['#010611']} />
      <fog attach="fog" args={['#041225', 8, 30]} />
      <PerspectiveCamera makeDefault position={[0, 4.8, 10.8]} fov={50} />
      <OrbitControls makeDefault enablePan={false} enableZoom enableDamping dampingFactor={0.06} rotateSpeed={0.28} zoomSpeed={0.48} minDistance={7.5} maxDistance={15} minPolarAngle={0.5} maxPolarAngle={1.35} target={[0, 0.55, -3.35]} />
      <ambientLight intensity={0.62} color="#d7e7ff" />
      <hemisphereLight args={['#dbeafe', '#020617', 1.55]} />
      <directionalLight position={[-5, 9, 7]} intensity={2.1} color="#e8f4ff" castShadow />
      <pointLight position={[0, 4.4, -3.1]} intensity={6.2} color="#67e8f9" distance={14} />
      <pointLight position={[-5.8, 2.2, -5.2]} intensity={2.2} color="#facc6b" distance={12} />
      <pointLight position={[5.8, 2.2, -5.2]} intensity={2.2} color="#a78bfa" distance={12} />

      <mesh scale={[-1, 1, 1]}>
        <sphereGeometry args={[60, 72, 72]} />
        <meshBasicMaterial side={THREE.BackSide} color="#010611" />
      </mesh>
      <Stars radius={58} depth={34} count={1200} factor={2.5} saturation={0.28} fade speed={0.08} />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.86, -3.2]} receiveShadow>
        <planeGeometry args={[18, 18]} />
        <meshStandardMaterial color="#0c1721" emissive="#071827" emissiveIntensity={0.2} roughness={0.86} metalness={0.16} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.81, -3.1]}>
        <ringGeometry args={[4.9, 5.08, 160]} />
        <meshBasicMaterial color="#67e8f9" transparent opacity={0.18} toneMapped={false} />
      </mesh>

      <GroundPaths />
      <CouncilPlaza />
      {GROUND_DISTRICTS.map((district) => <GroundDistrict key={district.id} spec={district} />)}
      {WORKFORCE.map((avatar, index) => <WorkforceAvatar key={index} {...avatar} />)}

      <EffectComposer>
        <Bloom intensity={0.72} luminanceThreshold={0.12} luminanceSmoothing={0.32} />
        <Vignette eskil={false} offset={0.12} darkness={0.48} />
      </EffectComposer>
    </>
  )
}

export default function GroundSpatialWorldClean() {
  return (
    <main className="ground-spatial-root" aria-label="URAI Ground private workforce chamber" data-canonical-asset={groundAssets.primary.src} data-testid="urai-ground-private-workforce-world">
      <div aria-hidden="true" className="ground-provider-art" style={{ backgroundImage: assetCssStack(groundAssets.primary) }} />
      <Suspense fallback={<div className="ground-loader">URAI Ground · opening private workforce</div>}>
        <Canvas shadows dpr={[1, 1.65]} gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}>
          <GroundScene />
        </Canvas>
      </Suspense>
      <header className="ground-card ground-hero">
        <p>URAI Ground</p>
        <h1>Your private workforce.</h1>
        <span>Reception, privacy, council, logistics, wellness, and archive stay visible around one consent-first center. Nothing acts without you.</span>
        <div>
          <Link className="primary" style={groundPrimaryLinkStyle} href="/home">Return Home</Link>
          <Link style={groundLinkStyle} href="/life-map">Open Life Map</Link>
        </div>
      </header>
      <aside className="ground-status">Six chambers active · private by default</aside>
      <aside className="ground-pins">Reception · Sanctuary · Council · Logistics · Wellness · Archive</aside>
      <nav className="ground-rail" aria-label="URAI Ground navigation">
        {groundRailLinks.map((link) => {
          const active = link.href === '/ground'
          return (
            <span className="ground-rail-item" key={link.href}>
              <Link style={active ? groundActiveLinkStyle : groundLinkStyle} href={link.href} aria-current={active ? 'page' : undefined}>{link.label}</Link>
            </span>
          )
        })}
      </nav>
      <style jsx>{`
        .ground-spatial-root{position:fixed;inset:0;overflow:hidden;background:#010611;color:#f8fbff;isolation:isolate;font-family:Inter,ui-sans-serif,system-ui}
        .ground-spatial-root:before{content:'';position:absolute;inset:0;z-index:2;pointer-events:none;background:linear-gradient(180deg,rgba(1,6,17,.12),transparent 32%,rgba(1,6,17,.72))}
        .ground-provider-art{position:absolute;inset:0;z-index:2;pointer-events:none;background-size:cover;background-position:center;opacity:.08;mix-blend-mode:screen}
        .ground-spatial-root canvas{position:absolute;inset:0;z-index:1;display:block;cursor:grab}
        .ground-loader{position:absolute;inset:0;z-index:10;display:grid;place-items:center;background:#010611;color:rgba(226,246,255,.76);letter-spacing:.18em;text-transform:uppercase;font-size:12px}
        .ground-card,.ground-status,.ground-rail,.ground-pins{position:absolute;z-index:5;border:1px solid rgba(160,220,255,.15);background:linear-gradient(145deg,rgba(2,8,24,.7),rgba(10,9,31,.42));box-shadow:0 24px 90px rgba(0,0,0,.34);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px)}
        .ground-hero{left:22px;top:22px;width:min(355px,calc(100vw - 44px));padding:16px 18px;border-radius:26px}
        .ground-hero p{margin:0 0 8px;color:rgba(186,230,253,.72);font-size:10px;letter-spacing:.22em;text-transform:uppercase;font-weight:800}
        .ground-hero h1{margin:0 0 8px;font-size:clamp(30px,3.2vw,46px);line-height:.92;font-weight:950;letter-spacing:-.055em}
        .ground-hero span{display:block;color:rgba(235,244,255,.72);line-height:1.48;font-size:13px}
        .ground-hero div{display:flex;gap:9px;flex-wrap:wrap;margin-top:15px}
        .ground-status{right:22px;top:22px;padding:10px 13px;border-radius:999px;color:rgba(226,246,255,.8);font-size:10px;letter-spacing:.12em;text-transform:uppercase}
        .ground-pins{right:22px;top:67px;padding:9px 12px;border-radius:14px;color:rgba(226,246,255,.68);font-size:10px;letter-spacing:.06em}
        .ground-rail{left:50%;bottom:18px;display:flex;gap:6px;width:max-content;max-width:calc(100vw - 28px);padding:7px;transform:translateX(-50%);overflow-x:auto;overflow-y:hidden;border-radius:999px;scrollbar-width:none}
        .ground-rail::-webkit-scrollbar{display:none}
        .ground-rail-item{display:inline-flex;flex:0 0 auto}
        :global(.ground-district-label){display:grid;gap:3px;min-width:118px;padding:8px 10px;border:1px solid rgba(160,220,255,.25);border-radius:14px;background:rgba(2,8,24,.8);box-shadow:0 14px 44px rgba(0,0,0,.42),0 0 34px rgba(103,232,249,.1);backdrop-filter:blur(12px);color:#eef6ff;text-align:center;line-height:1.05;pointer-events:none}
        :global(.ground-district-label strong){font-size:10px;text-transform:uppercase;letter-spacing:.1em}
        :global(.ground-district-label em){font-style:normal;font-size:9px;color:rgba(235,244,255,.64)}
        :global(.ground-district-label.council){min-width:132px;border-color:rgba(103,232,249,.4)}
        @media(max-width:760px){
          .ground-hero{left:14px;right:14px;top:14px;width:auto;padding:13px 14px}
          .ground-hero h1{font-size:30px}
          .ground-hero span{font-size:12px;max-width:32ch}
          .ground-status,.ground-pins{display:none}
          .ground-rail{left:14px;right:14px;bottom:10px;width:auto;max-width:none;transform:none;justify-content:flex-start;padding:7px 6px}
          .ground-rail-item{min-width:0}
          :global(.ground-rail a){padding:8px 10px;font-size:11px}
          :global(.ground-district-label){min-width:92px;padding:6px 7px}
          :global(.ground-district-label strong){font-size:8px}
          :global(.ground-district-label em){font-size:7px}
        }
        @media(prefers-reduced-motion:reduce){.ground-spatial-root *{scroll-behavior:auto!important}}
      `}</style>
    </main>
  )
}
