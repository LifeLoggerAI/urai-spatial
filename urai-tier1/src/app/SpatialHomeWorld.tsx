'use client'

import { OrbitControls, PerspectiveCamera } from '@react-three/drei'
import { Canvas, useFrame } from '@react-three/fiber'
import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing'
import Link from 'next/link'
import { Suspense, useMemo, useRef } from 'react'
import * as THREE from 'three'

function HomeSky() {
  const ref = useRef<THREE.Mesh>(null)

  useFrame(({ clock }) => {
    if (!ref.current) return
    ref.current.rotation.y = clock.elapsedTime * 0.006
  })

  return (
    <mesh ref={ref} scale={[-1, 1, 1]}>
      <sphereGeometry args={[58, 72, 72]} />
      <meshBasicMaterial side={THREE.BackSide} color="#020713" />
    </mesh>
  )
}

function HomeStars() {
  const ref = useRef<THREE.Points>(null)
  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry()
    const positions = new Float32Array(760 * 3)
    for (let i = 0; i < 760; i += 1) {
      const angle = i * 2.399963
      const radius = 8 + (i % 127) * 0.34
      positions[i * 3] = Math.cos(angle) * radius
      positions[i * 3 + 1] = -0.8 + ((i * 31) % 220) / 15
      positions[i * 3 + 2] = -10 + Math.sin(angle) * radius
    }
    g.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    return g
  }, [])

  useFrame(({ clock }) => {
    if (!ref.current) return
    ref.current.rotation.y = clock.elapsedTime * 0.008
  })

  return (
    <points ref={ref} geometry={geometry}>
      <pointsMaterial size={0.024} color="#d8f7ff" transparent opacity={0.5} depthWrite={false} blending={THREE.AdditiveBlending} />
    </points>
  )
}

function PortalRing({ position, color, scale = 1, vertical = false }: { position: [number, number, number]; color: string; scale?: number; vertical?: boolean }) {
  const ref = useRef<THREE.Group>(null)

  useFrame(({ clock }) => {
    if (!ref.current) return
    ref.current.rotation.z = vertical ? Math.sin(clock.elapsedTime * 0.45) * 0.05 : clock.elapsedTime * 0.18
  })

  return (
    <group ref={ref} position={position} scale={scale} rotation={vertical ? [0, 0, 0] : [Math.PI / 2, 0, 0]}>
      <mesh>
        <torusGeometry args={[0.78, 0.026, 18, 112]} />
        <meshBasicMaterial color={color} transparent opacity={0.74} blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh>
        <torusGeometry args={[1.08, 0.012, 18, 128]} />
        <meshBasicMaterial color={color} transparent opacity={0.28} blending={THREE.AdditiveBlending} />
      </mesh>
    </group>
  )
}

function CentralOrb() {
  const ref = useRef<THREE.Group>(null)

  useFrame(({ clock }) => {
    if (!ref.current) return
    ref.current.position.y = 1.28 + Math.sin(clock.elapsedTime * 0.85) * 0.045
    ref.current.rotation.y = clock.elapsedTime * 0.2
  })

  return (
    <group ref={ref} position={[0, 1.28, -0.9]}>
      <mesh castShadow>
        <sphereGeometry args={[0.42, 56, 56]} />
        <meshStandardMaterial color="#f5feff" emissive="#67e8f9" emissiveIntensity={3.4} roughness={0.1} metalness={0.22} />
      </mesh>
      <mesh>
        <sphereGeometry args={[1.38, 48, 48]} />
        <meshBasicMaterial color="#67e8f9" transparent opacity={0.1} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.8, 0.016, 16, 96]} />
        <meshBasicMaterial color="#d8fbff" transparent opacity={0.5} blending={THREE.AdditiveBlending} />
      </mesh>
    </group>
  )
}

function ChamberColumn({ x, z, color }: { x: number; z: number; color: string }) {
  return (
    <group position={[x, -0.5, z]}>
      <mesh castShadow>
        <cylinderGeometry args={[0.12, 0.18, 2.5, 28]} />
        <meshStandardMaterial color="#071527" emissive={color} emissiveIntensity={0.18} roughness={0.42} metalness={0.34} />
      </mesh>
      <mesh position={[0, 1.36, 0]}>
        <sphereGeometry args={[0.16, 24, 24]} />
        <meshBasicMaterial color={color} transparent opacity={0.72} blending={THREE.AdditiveBlending} />
      </mesh>
    </group>
  )
}

function HomeChamber() {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.82, -0.95]} receiveShadow>
        <cylinderGeometry args={[4.6, 5.4, 0.16, 160]} />
        <meshStandardMaterial color="#04111f" roughness={0.7} metalness={0.22} emissive="#0b3950" emissiveIntensity={0.16} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.7, -0.95]}>
        <ringGeometry args={[1.1, 4.5, 180]} />
        <meshBasicMaterial color="#38d7ff" transparent opacity={0.11} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.62, -2.85]}>
        <ringGeometry args={[0.68, 1.42, 112]} />
        <meshBasicMaterial color="#67e8f9" transparent opacity={0.5} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh position={[0, -1.08, -2.85]} rotation={[-Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[1.22, 1.84, 0.22, 96]} />
        <meshStandardMaterial color="#020814" emissive="#0ea5e9" emissiveIntensity={0.26} roughness={0.55} metalness={0.24} />
      </mesh>
      <PortalRing position={[0, -0.52, -2.85]} color="#67e8f9" scale={1.12} />
      <PortalRing position={[-3.05, 0.86, -2.1]} color="#a78bfa" scale={0.58} vertical />
      <PortalRing position={[3.05, 0.86, -2.1]} color="#86efac" scale={0.58} vertical />
      <PortalRing position={[0, 3.15, -4.6]} color="#60a5fa" scale={1.6} />
      <ChamberColumn x={-3.6} z={-0.8} color="#67e8f9" />
      <ChamberColumn x={3.6} z={-0.8} color="#a78bfa" />
      <ChamberColumn x={-2.7} z={-3.7} color="#86efac" />
      <ChamberColumn x={2.7} z={-3.7} color="#f0abfc" />
      <CentralOrb />
      <mesh position={[0, 0.32, -0.9]}>
        <cylinderGeometry args={[0.24, 0.38, 1.75, 48]} />
        <meshStandardMaterial color="#0d2238" emissive="#22d3ee" emissiveIntensity={0.28} roughness={0.35} metalness={0.18} transparent opacity={0.88} />
      </mesh>
      <mesh position={[0, 0.66, -1.62]} rotation={[0, 0, Math.PI / 4]}>
        <octahedronGeometry args={[0.62, 0]} />
        <meshStandardMaterial color="#0f172a" emissive="#7dd3fc" emissiveIntensity={0.54} roughness={0.3} metalness={0.18} transparent opacity={0.58} />
      </mesh>
    </group>
  )
}

function GroundBelow() {
  const ref = useRef<THREE.Group>(null)

  useFrame(({ clock }) => {
    if (!ref.current) return
    ref.current.position.y = -2.85 + Math.sin(clock.elapsedTime * 0.5) * 0.03
  })

  return (
    <group ref={ref} position={[0, -2.85, -3.35]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[5.8, 140]} />
        <meshStandardMaterial color="#020b12" emissive="#0f766e" emissiveIntensity={0.36} roughness={0.74} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.06, 0]}>
        <ringGeometry args={[1.1, 5.05, 180]} />
        <meshBasicMaterial color="#22d3ee" transparent opacity={0.16} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} />
      </mesh>
    </group>
  )
}

function HomeScene() {
  return (
    <>
      <color attach="background" args={["#020611"]} />
      <fog attach="fog" args={["#041225", 6.5, 24]} />
      <PerspectiveCamera makeDefault position={[0, 2.75, 8.2]} fov={42} />
      <OrbitControls enablePan={false} enableZoom enableDamping dampingFactor={0.06} rotateSpeed={0.3} zoomSpeed={0.55} minDistance={4.6} maxDistance={11.5} minPolarAngle={0.64} maxPolarAngle={1.68} />
      <ambientLight intensity={0.38} color="#c7ddff" />
      <hemisphereLight args={["#dbeafe", "#020617", 1.0]} />
      <directionalLight position={[-4, 7, 5]} intensity={1.22} color="#dbeafe" castShadow />
      <pointLight position={[0, 2.35, -0.65]} intensity={5.2} color="#67e8f9" distance={8} />
      <pointLight position={[-3, 2.2, -2]} intensity={1.6} color="#a78bfa" distance={10} />
      <pointLight position={[3, 1.8, -2]} intensity={1.35} color="#86efac" distance={10} />
      <HomeSky />
      <HomeStars />
      <GroundBelow />
      <HomeChamber />
      <EffectComposer>
        <Bloom intensity={1.05} luminanceThreshold={0.08} luminanceSmoothing={0.26} />
        <Vignette eskil={false} offset={0.14} darkness={0.7} />
      </EffectComposer>
    </>
  )
}

export default function SpatialHomeWorld() {
  return (
    <main className="ush-root" aria-label="URAI spatial home world">
      <Suspense fallback={<div className="ush-loader">URAI Spatial World · loading chamber</div>}>
        <Canvas shadows dpr={[1, 1.7]} gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}>
          <HomeScene />
        </Canvas>
      </Suspense>

      <header className="ush-card ush-card--hero">
        <p>URAI Spatial</p>
        <h1>Entry chamber</h1>
        <span>Ground is below. Life Map is above. The orb is the center.</span>
        <div>
          <Link className="primary" href="/ground">Descend</Link>
          <Link href="/life-map">Open sky</Link>
        </div>
      </header>

      <Link className="ush-ground-call" href="/ground">
        <strong>Ground below</strong>
        <span>walkable real-life layer</span>
      </Link>

      <nav className="ush-rail" aria-label="URAI spatial routes">
        <Link href="/life-map">Life Map</Link>
        <Link href="/focus?manifestId=seed-memory-bloom">Focus</Link>
        <Link href="/replay?memoryId=quiet-reset&manifestId=replay-recovery-thread">Replay</Link>
        <Link href="/passport">Passport</Link>
        <Link href="/status">Status</Link>
      </nav>

      <style jsx>{`
        :global(.uraiV2StateAnnouncer){position:absolute!important;width:1px!important;height:1px!important;overflow:hidden!important;clip-path:inset(50%)!important;white-space:nowrap!important;color:transparent!important}
        .ush-root{position:fixed;inset:0;overflow:hidden;background:#020611;color:#f8fbff;isolation:isolate}
        .ush-root:before{content:'';position:absolute;inset:0;z-index:2;pointer-events:none;background:radial-gradient(circle at 50% 16%,rgba(96,165,250,.14),transparent 24%),linear-gradient(180deg,rgba(2,6,17,.64),transparent 22%,transparent 68%,rgba(2,6,17,.84))}
        .ush-root canvas{position:absolute;inset:0;z-index:1;display:block;cursor:grab}
        .ush-loader{position:absolute;inset:0;z-index:10;display:grid;place-items:center;background:#020611;color:rgba(226,246,255,.76);letter-spacing:.18em;text-transform:uppercase;font-size:12px}
        .ush-card,.ush-ground-call,.ush-rail{position:absolute;z-index:5;border:1px solid rgba(160,220,255,.15);background:linear-gradient(145deg,rgba(2,8,24,.54),rgba(10,9,31,.32));box-shadow:0 24px 90px rgba(0,0,0,.28),inset 0 1px 0 rgba(255,255,255,.045);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px)}
        .ush-card--hero{left:22px;top:22px;width:min(315px,calc(100vw - 44px));padding:15px 17px;border-radius:24px}
        .ush-card p{margin:0 0 8px;color:rgba(186,230,253,.68);font-size:10px;letter-spacing:.22em;text-transform:uppercase;font-weight:800}
        .ush-card h1{margin:0 0 8px;font-size:clamp(28px,3.4vw,44px);line-height:.94;font-weight:900;letter-spacing:-.045em;text-shadow:0 0 34px rgba(103,232,249,.18)}
        .ush-card span{display:block;color:rgba(235,244,255,.68);line-height:1.45;font-size:13px}
        .ush-card div{display:flex;gap:9px;flex-wrap:wrap;margin-top:15px}
        .ush-card a,.ush-rail a{border:1px solid rgba(160,220,255,.2);border-radius:999px;padding:9px 12px;color:#eef6ff;text-decoration:none;background:rgba(2,8,24,.46)}
        .ush-card a.primary{background:linear-gradient(135deg,rgba(103,232,249,.94),rgba(167,139,250,.88));color:#03101f;font-weight:900}
        .ush-ground-call{left:50%;bottom:88px;display:grid;gap:3px;min-width:206px;padding:13px 18px;transform:translateX(-50%);border-radius:999px;text-align:center;color:#f8fbff;text-decoration:none;box-shadow:0 0 86px rgba(103,232,249,.18),0 24px 90px rgba(0,0,0,.3)}
        .ush-ground-call strong{font-size:12px;letter-spacing:.16em;text-transform:uppercase}
        .ush-ground-call span{color:rgba(235,244,255,.68);font-size:11px}
        .ush-rail{left:50%;bottom:18px;display:flex;gap:6px;max-width:calc(100vw - 32px);padding:7px;transform:translateX(-50%);overflow-x:auto;border-radius:999px}
        .ush-rail a{white-space:nowrap;font-size:12px;font-weight:800;letter-spacing:.04em;padding:8px 11px}
        .ush-card a:hover,.ush-rail a:hover,.ush-ground-call:hover{border-color:rgba(103,232,249,.56);box-shadow:0 0 46px rgba(103,232,249,.15)}
        @media(max-width:720px){.ush-card--hero{left:14px;right:14px;top:14px;width:auto;padding:14px}.ush-card h1{font-size:32px}.ush-ground-call{bottom:82px;min-width:190px}.ush-rail{bottom:12px}}
      `}</style>
    </main>
  )
}
