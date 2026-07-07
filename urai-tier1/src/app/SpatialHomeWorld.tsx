'use client'

import { OrbitControls, PerspectiveCamera } from '@react-three/drei'
import { Canvas, useFrame } from '@react-three/fiber'
import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing'
import Link from 'next/link'
import { Suspense, useRef } from 'react'
import * as THREE from 'three'

function HomeSky() {
  const ref = useRef<THREE.Mesh>(null)

  useFrame(({ clock }) => {
    if (!ref.current) return
    ref.current.rotation.y = clock.elapsedTime * 0.008
  })

  return (
    <mesh ref={ref} scale={[-1, 1, 1]}>
      <sphereGeometry args={[52, 64, 64]} />
      <meshBasicMaterial side={THREE.BackSide} color="#030712" />
    </mesh>
  )
}

function HomeStars() {
  const ref = useRef<THREE.Points>(null)
  const geometry = new THREE.BufferGeometry()
  const positions = new Float32Array(520 * 3)
  for (let i = 0; i < 520; i += 1) {
    const angle = i * 2.399963
    const radius = 8 + (i % 89) * 0.36
    positions[i * 3] = Math.cos(angle) * radius
    positions[i * 3 + 1] = -0.4 + ((i * 31) % 180) / 16
    positions[i * 3 + 2] = -8 + Math.sin(angle) * radius
  }
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))

  useFrame(({ clock }) => {
    if (!ref.current) return
    ref.current.rotation.y = clock.elapsedTime * 0.01
  })

  return (
    <points ref={ref} geometry={geometry}>
      <pointsMaterial size={0.028} color="#c7efff" transparent opacity={0.52} depthWrite={false} blending={THREE.AdditiveBlending} />
    </points>
  )
}

function PortalRing({ position, color, scale = 1 }: { position: [number, number, number]; color: string; scale?: number }) {
  const ref = useRef<THREE.Group>(null)

  useFrame(({ clock }) => {
    if (!ref.current) return
    ref.current.rotation.z = clock.elapsedTime * 0.22
  })

  return (
    <group ref={ref} position={position} scale={scale}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.72, 0.025, 18, 96]} />
        <meshBasicMaterial color={color} transparent opacity={0.72} blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.05, 0.012, 18, 128]} />
        <meshBasicMaterial color={color} transparent opacity={0.28} blending={THREE.AdditiveBlending} />
      </mesh>
    </group>
  )
}

function CentralOrb() {
  const ref = useRef<THREE.Group>(null)

  useFrame(({ clock }) => {
    if (!ref.current) return
    ref.current.position.y = 1.08 + Math.sin(clock.elapsedTime * 0.9) * 0.05
    ref.current.rotation.y = clock.elapsedTime * 0.24
  })

  return (
    <group ref={ref} position={[0, 1.08, -0.55]}>
      <mesh castShadow>
        <sphereGeometry args={[0.46, 48, 48]} />
        <meshStandardMaterial color="#e8feff" emissive="#67e8f9" emissiveIntensity={2.9} roughness={0.12} metalness={0.2} />
      </mesh>
      <mesh>
        <sphereGeometry args={[1.18, 40, 40]} />
        <meshBasicMaterial color="#7dd3fc" transparent opacity={0.12} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.8, 0.018, 16, 96]} />
        <meshBasicMaterial color="#d8fbff" transparent opacity={0.4} blending={THREE.AdditiveBlending} />
      </mesh>
    </group>
  )
}

function HomeChamber() {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.72, -0.55]} receiveShadow>
        <circleGeometry args={[6.4, 160]} />
        <meshStandardMaterial color="#061525" roughness={0.82} metalness={0.18} emissive="#0b3950" emissiveIntensity={0.2} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.69, -0.55]}>
        <ringGeometry args={[1.65, 5.8, 180]} />
        <meshBasicMaterial color="#38d7ff" transparent opacity={0.11} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.63, -2.8]}>
        <ringGeometry args={[0.62, 1.24, 96]} />
        <meshBasicMaterial color="#67e8f9" transparent opacity={0.42} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh position={[0, -1.18, -2.8]} rotation={[-Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[1.26, 1.9, 0.18, 96]} />
        <meshStandardMaterial color="#020814" emissive="#0ea5e9" emissiveIntensity={0.22} roughness={0.6} metalness={0.18} />
      </mesh>
      <PortalRing position={[0, -0.54, -2.8]} color="#67e8f9" scale={1.05} />
      <PortalRing position={[-2.85, 0.72, -1.7]} color="#a78bfa" scale={0.62} />
      <PortalRing position={[2.85, 0.72, -1.7]} color="#86efac" scale={0.62} />
      <CentralOrb />
      <mesh position={[0, 0.18, -0.55]}>
        <cylinderGeometry args={[0.28, 0.36, 1.45, 48]} />
        <meshStandardMaterial color="#0d2238" emissive="#22d3ee" emissiveIntensity={0.25} roughness={0.35} metalness={0.16} transparent opacity={0.82} />
      </mesh>
      <mesh position={[0, 0.7, -1.5]} rotation={[0, 0, Math.PI / 4]}>
        <octahedronGeometry args={[0.7, 0]} />
        <meshStandardMaterial color="#0f172a" emissive="#7dd3fc" emissiveIntensity={0.48} roughness={0.32} metalness={0.16} transparent opacity={0.64} />
      </mesh>
    </group>
  )
}

function GroundBelow() {
  const ref = useRef<THREE.Group>(null)

  useFrame(({ clock }) => {
    if (!ref.current) return
    ref.current.position.y = -2.75 + Math.sin(clock.elapsedTime * 0.55) * 0.03
  })

  return (
    <group ref={ref} position={[0, -2.75, -3.4]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[5.2, 128]} />
        <meshStandardMaterial color="#021018" emissive="#0f766e" emissiveIntensity={0.34} roughness={0.74} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
        <ringGeometry args={[0.9, 4.3, 160]} />
        <meshBasicMaterial color="#22d3ee" transparent opacity={0.13} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} />
      </mesh>
    </group>
  )
}

function HomeScene() {
  return (
    <>
      <color attach="background" args={["#020611"]} />
      <fog attach="fog" args={["#041225", 7, 22]} />
      <PerspectiveCamera makeDefault position={[0, 2.35, 7.7]} fov={43} />
      <OrbitControls enablePan={false} enableZoom enableDamping dampingFactor={0.06} rotateSpeed={0.32} zoomSpeed={0.58} minDistance={4.2} maxDistance={11} minPolarAngle={0.72} maxPolarAngle={1.72} />
      <ambientLight intensity={0.46} color="#c7ddff" />
      <hemisphereLight args={["#dbeafe", "#020617", 1.15]} />
      <directionalLight position={[-4, 7, 5]} intensity={1.35} color="#dbeafe" castShadow />
      <pointLight position={[0, 2.2, -0.3]} intensity={4.4} color="#67e8f9" distance={8} />
      <pointLight position={[-3, 2.2, -2]} intensity={1.8} color="#a78bfa" distance={10} />
      <pointLight position={[3, 1.8, -2]} intensity={1.5} color="#86efac" distance={10} />
      <HomeSky />
      <HomeStars />
      <GroundBelow />
      <HomeChamber />
      <EffectComposer>
        <Bloom intensity={0.92} luminanceThreshold={0.08} luminanceSmoothing={0.28} />
        <Vignette eskil={false} offset={0.16} darkness={0.64} />
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
        <h1>Spatial home world</h1>
        <span>The chamber is the start. Ground is below. Life Map is above.</span>
        <div>
          <Link className="primary" href="/ground">Descend Ground</Link>
          <Link href="/life-map">Open Life Map</Link>
        </div>
      </header>

      <Link className="ush-ground-call" href="/ground">
        <strong>Ground below</strong>
        <span>descend into the walkable real-life layer</span>
      </Link>

      <nav className="ush-rail" aria-label="URAI spatial routes">
        <Link href="/life-map">Sky · Life Map</Link>
        <Link href="/focus?manifestId=seed-memory-bloom">Star · Focus</Link>
        <Link href="/replay?memoryId=quiet-reset&manifestId=replay-recovery-thread">Film · Replay</Link>
        <Link href="/passport">Vault · Passport</Link>
        <Link href="/status">Control · Status</Link>
      </nav>

      <style jsx>{`
        .ush-root{position:fixed;inset:0;overflow:hidden;background:#020611;color:#f8fbff;isolation:isolate}
        .ush-root:before{content:'';position:absolute;inset:0;z-index:2;pointer-events:none;background:linear-gradient(180deg,rgba(2,6,17,.78),transparent 18%,transparent 68%,rgba(2,6,17,.82))}
        .ush-root canvas{position:absolute;inset:0;z-index:1;display:block;cursor:grab}
        .ush-loader{position:absolute;inset:0;z-index:10;display:grid;place-items:center;background:#020611;color:rgba(226,246,255,.76);letter-spacing:.18em;text-transform:uppercase;font-size:12px}
        .ush-card,.ush-ground-call,.ush-rail{position:absolute;z-index:5;border:1px solid rgba(160,220,255,.18);background:linear-gradient(145deg,rgba(2,8,24,.64),rgba(10,9,31,.42));box-shadow:0 24px 90px rgba(0,0,0,.32),inset 0 1px 0 rgba(255,255,255,.05);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px)}
        .ush-card--hero{left:22px;top:22px;width:min(355px,calc(100vw - 44px));padding:18px 19px;border-radius:28px}
        .ush-card p{margin:0 0 9px;color:rgba(186,230,253,.76);font-size:11px;letter-spacing:.22em;text-transform:uppercase;font-weight:800}
        .ush-card h1{margin:0 0 9px;font-size:clamp(32px,4vw,52px);line-height:.94;font-weight:900;letter-spacing:-.045em;text-shadow:0 0 34px rgba(103,232,249,.18)}
        .ush-card span{display:block;color:rgba(235,244,255,.72);line-height:1.45;font-size:14px}
        .ush-card div{display:flex;gap:10px;flex-wrap:wrap;margin-top:18px}
        .ush-card a,.ush-rail a{border:1px solid rgba(160,220,255,.22);border-radius:999px;padding:10px 13px;color:#eef6ff;text-decoration:none;background:rgba(2,8,24,.48)}
        .ush-card a.primary{background:linear-gradient(135deg,rgba(103,232,249,.95),rgba(167,139,250,.9));color:#03101f;font-weight:900}
        .ush-ground-call{left:50%;bottom:94px;display:grid;gap:4px;min-width:240px;padding:15px 20px;transform:translateX(-50%);border-radius:999px;text-align:center;color:#f8fbff;text-decoration:none;box-shadow:0 0 86px rgba(103,232,249,.18),0 24px 90px rgba(0,0,0,.32)}
        .ush-ground-call strong{font-size:13px;letter-spacing:.16em;text-transform:uppercase}
        .ush-ground-call span{color:rgba(235,244,255,.72);font-size:12px}
        .ush-rail{left:50%;bottom:18px;display:flex;gap:8px;max-width:calc(100vw - 32px);padding:8px;transform:translateX(-50%);overflow-x:auto;border-radius:999px}
        .ush-rail a{white-space:nowrap;font-size:12px;font-weight:800;letter-spacing:.04em}
        .ush-card a:hover,.ush-rail a:hover,.ush-ground-call:hover{border-color:rgba(103,232,249,.56);box-shadow:0 0 46px rgba(103,232,249,.15)}
        @media(max-width:720px){.ush-card--hero{left:14px;right:14px;top:14px;width:auto;padding:15px}.ush-card h1{font-size:34px}.ush-ground-call{bottom:86px;min-width:210px}.ush-rail{bottom:12px}}
      `}</style>
    </main>
  )
}
