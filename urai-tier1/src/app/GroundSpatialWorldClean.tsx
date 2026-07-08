'use client'

import { OrbitControls, PerspectiveCamera } from '@react-three/drei'
import { Canvas, useFrame } from '@react-three/fiber'
import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing'
import Link from 'next/link'
import { Suspense, useRef } from 'react'
import * as THREE from 'three'

function MovingCityLights() {
  const ref = useRef<THREE.Group>(null)
  useFrame(({ clock }) => {
    if (ref.current) ref.current.position.x = Math.sin(clock.elapsedTime * 0.75) * 1.4
  })
  return (
    <group ref={ref} position={[0, -0.42, -6.2]}>
      {[-5.2, -3.4, -1.2, 1.2, 3.4, 5.2].map((x, index) => (
        <mesh key={x} position={[x, 0, index % 2 ? -0.08 : 0.08]}>
          <boxGeometry args={[0.82, 0.022, 0.022]} />
          <meshBasicMaterial color={index % 2 ? '#67e8f9' : '#facc6b'} transparent opacity={0.5} blending={THREE.AdditiveBlending} />
        </mesh>
      ))}
    </group>
  )
}

function Skyline() {
  const buildings = [
    [-6.3, 0.0, -8.9, 1.0, 2.7], [-4.8, 0.6, -9.1, 1.1, 3.9], [-3.1, 0.1, -8.85, 1.05, 2.7],
    [-1.35, 0.86, -9.2, 1.15, 4.55], [0.35, 0.35, -8.85, 1.28, 3.35], [2.1, 0.78, -9.15, 1.05, 4.1],
    [3.7, 0.16, -8.9, 1.25, 2.85], [5.3, 0.5, -9.15, 1.1, 3.5],
  ] as const
  return (
    <group>
      {buildings.map(([x, y, z, w, h], index) => (
        <group key={index} position={[x, y, z]}>
          <mesh castShadow>
            <boxGeometry args={[w, h, 0.72]} />
            <meshStandardMaterial color="#040b14" emissive="#10253b" emissiveIntensity={0.24} roughness={0.84} metalness={0.12} />
          </mesh>
          {[0, 1, 2, 3, 4, 5, 6].map((row) => (
            <mesh key={row} position={[0, -h / 2 + 0.32 + row * 0.43, 0.37]}>
              <boxGeometry args={[w * 0.68, 0.026, 0.02]} />
              <meshBasicMaterial color={row % 2 ? '#67e8f9' : '#facc6b'} transparent opacity={0.1 + ((row + index) % 3) * 0.05} blending={THREE.AdditiveBlending} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  )
}

function DescentCeiling() {
  const ref = useRef<THREE.Group>(null)
  useFrame(({ clock }) => {
    if (!ref.current) return
    ref.current.rotation.z = clock.elapsedTime * 0.045
  })
  return (
    <group ref={ref} position={[0, 2.05, -1.8]} rotation={[Math.PI / 2, 0, 0]}>
      <mesh>
        <torusGeometry args={[1.35, 0.018, 18, 160]} />
        <meshBasicMaterial color="#67e8f9" transparent opacity={0.34} blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh>
        <torusGeometry args={[2.1, 0.009, 14, 160]} />
        <meshBasicMaterial color="#a78bfa" transparent opacity={0.16} blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh>
        <circleGeometry args={[1.05, 96]} />
        <meshBasicMaterial color="#67e8f9" transparent opacity={0.045} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} />
      </mesh>
    </group>
  )
}

function GroundSignal({ position, color }: { position: [number, number, number]; color: string }) {
  const ref = useRef<THREE.Group>(null)
  useFrame(({ clock }) => {
    if (ref.current) ref.current.position.y = position[1] + Math.sin(clock.elapsedTime * 1.25 + position[0]) * 0.035
  })
  return (
    <group ref={ref} position={position}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.2, 0.46, 72]} />
        <meshBasicMaterial color={color} transparent opacity={0.45} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh position={[0, 0.16, 0]}>
        <sphereGeometry args={[0.13, 24, 24]} />
        <meshStandardMaterial color="#020617" emissive={color} emissiveIntensity={1.65} transparent opacity={0.92} />
      </mesh>
      <mesh position={[0, 0.16, 0]}>
        <sphereGeometry args={[0.42, 24, 24]} />
        <meshBasicMaterial color={color} transparent opacity={0.055} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
    </group>
  )
}

function GroundScene() {
  return (
    <>
      <color attach="background" args={['#020611']} />
      <fog attach="fog" args={['#041225', 3.8, 24]} />
      <PerspectiveCamera makeDefault position={[0, 0.98, 4.45]} fov={52} />
      <OrbitControls enablePan={false} enableZoom enableDamping dampingFactor={0.06} rotateSpeed={0.26} zoomSpeed={0.52} minDistance={2.2} maxDistance={7.8} minPolarAngle={0.44} maxPolarAngle={1.78} />
      <ambientLight intensity={0.48} color="#d7e7ff" />
      <hemisphereLight args={['#dbeafe', '#020617', 1.15]} />
      <directionalLight position={[-4, 7, 5]} intensity={1.15} color="#dbeafe" castShadow />
      <pointLight position={[0, 1.9, -1.4]} intensity={3.9} color="#67e8f9" distance={7.5} />
      <pointLight position={[-3.8, 1.25, -5.5]} intensity={1.3} color="#facc6b" distance={10} />
      <pointLight position={[3.8, 1.25, -5.5]} intensity={1.2} color="#a78bfa" distance={10} />

      <mesh scale={[-1, 1, 1]}>
        <sphereGeometry args={[50, 64, 64]} />
        <meshBasicMaterial side={THREE.BackSide} color="#020713" />
      </mesh>

      <DescentCeiling />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.88, 0.9]} receiveShadow>
        <planeGeometry args={[8.2, 10.4]} />
        <meshStandardMaterial color="#0e1722" emissive="#0b1d2a" emissiveIntensity={0.24} roughness={0.88} metalness={0.1} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.835, 1.52]}>
        <planeGeometry args={[2.85, 8.4]} />
        <meshStandardMaterial color="#172332" emissive="#12384a" emissiveIntensity={0.36} roughness={0.92} metalness={0.08} />
      </mesh>
      {[-1.28, 1.28].map((x) => (
        <mesh key={x} rotation={[-Math.PI / 2, 0, 0]} position={[x, -0.79, 1.45]}>
          <planeGeometry args={[0.08, 7.3]} />
          <meshBasicMaterial color="#67e8f9" transparent opacity={0.46} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} />
        </mesh>
      ))}
      {[0, 1, 2, 3].map((step) => (
        <mesh key={step} position={[0, -1.02 - step * 0.2, 4.3 + step * 0.62]} receiveShadow>
          <boxGeometry args={[3.4 + step * 0.22, 0.18, 0.5]} />
          <meshStandardMaterial color="#0b1320" emissive="#071827" emissiveIntensity={0.2} roughness={0.84} metalness={0.06} />
        </mesh>
      ))}

      <Skyline />
      <MovingCityLights />
      <GroundSignal position={[-1.6, -0.42, 0.3]} color="#67e8f9" />
      <GroundSignal position={[1.55, -0.42, 0.1]} color="#a78bfa" />
      <GroundSignal position={[-1.0, -0.42, 2.35]} color="#facc6b" />
      <GroundSignal position={[1.05, -0.42, 2.65]} color="#86efac" />

      <EffectComposer>
        <Bloom intensity={1.0} luminanceThreshold={0.07} luminanceSmoothing={0.26} />
        <Vignette eskil={false} offset={0.14} darkness={0.62} />
      </EffectComposer>
    </>
  )
}

export default function GroundSpatialWorldClean() {
  return (
    <main className="ground-spatial-root" aria-label="URAI Ground lower city layer below Home">
      <Suspense fallback={<div className="ground-loader">URAI Ground · descending below Home</div>}>
        <Canvas shadows dpr={[1, 1.7]} gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}>
          <GroundScene />
        </Canvas>
      </Suspense>
      <header className="ground-card ground-hero">
        <p>URAI Ground</p>
        <h1>Lower city layer</h1>
        <span>You are below the Home deck. Signals, tasks, memory anchors, and control points live here before anything acts.</span>
        <div><Link className="primary" href="/home">Rise Home</Link><Link href="/life-map">Open Sky</Link></div>
      </header>
      <aside className="ground-status">Connected below Home</aside>
      <aside className="ground-pins">Signals · tasks · memory · control</aside>
      <nav className="ground-rail" aria-label="URAI Ground navigation">
        <Link href="/home">Home</Link><Link href="/ground">Ground</Link><Link href="/life-map">Life Map</Link><Link href="/focus?manifestId=seed-memory-bloom">Focus</Link><Link href="/replay?memoryId=quiet-reset&manifestId=replay-recovery-thread">Replay</Link>
      </nav>
      <style jsx>{`
        .ground-spatial-root{position:fixed;inset:0;overflow:hidden;background:#020611;color:#f8fbff;isolation:isolate;font-family:Inter,ui-sans-serif,system-ui}
        .ground-spatial-root:before{content:'';position:absolute;inset:0;z-index:2;pointer-events:none;background:radial-gradient(circle at 50% 20%,rgba(103,232,249,.16),transparent 25%),linear-gradient(180deg,rgba(2,6,17,.12),transparent 28%,rgba(2,6,17,.86))}
        .ground-spatial-root canvas{position:absolute;inset:0;z-index:1;display:block;cursor:grab}
        .ground-loader{position:absolute;inset:0;z-index:10;display:grid;place-items:center;background:#020611;color:rgba(226,246,255,.76);letter-spacing:.18em;text-transform:uppercase;font-size:12px}
        .ground-card,.ground-status,.ground-rail,.ground-pins{position:absolute;z-index:5;border:1px solid rgba(160,220,255,.14);background:linear-gradient(145deg,rgba(2,8,24,.42),rgba(10,9,31,.22));box-shadow:0 24px 90px rgba(0,0,0,.25),inset 0 1px 0 rgba(255,255,255,.04);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px)}
        .ground-hero{left:22px;top:22px;width:min(300px,calc(100vw - 44px));padding:13px 15px;border-radius:22px}
        .ground-hero p{margin:0 0 8px;color:rgba(186,230,253,.72);font-size:9px;letter-spacing:.24em;text-transform:uppercase;font-weight:850}
        .ground-hero h1{margin:0 0 8px;font-size:clamp(25px,2.65vw,36px);line-height:.94;font-weight:950;letter-spacing:-.045em}
        .ground-hero span{display:block;color:rgba(235,244,255,.72);line-height:1.42;font-size:12px}
        .ground-hero div{display:flex;gap:8px;flex-wrap:wrap;margin-top:13px}
        .ground-hero a,.ground-rail a{border:1px solid rgba(160,220,255,.2);border-radius:999px;padding:8px 11px;color:#eef6ff;text-decoration:none;background:rgba(2,8,24,.42)}
        .ground-hero a.primary{background:linear-gradient(135deg,rgba(103,232,249,.94),rgba(167,139,250,.88));color:#03101f;font-weight:900}
        .ground-status{right:22px;top:22px;padding:9px 12px;border-radius:999px;color:rgba(226,246,255,.78);font-size:10px;letter-spacing:.13em;text-transform:uppercase}
        .ground-pins{right:22px;bottom:86px;padding:9px 12px;border-radius:999px;color:rgba(226,246,255,.75);font-size:10px;letter-spacing:.09em;text-transform:uppercase}
        .ground-rail{left:50%;bottom:18px;display:flex;gap:6px;max-width:calc(100vw - 32px);padding:7px;transform:translateX(-50%);overflow-x:auto;border-radius:999px}
        .ground-rail a{white-space:nowrap;font-size:11px;font-weight:850;letter-spacing:.04em;padding:8px 11px}
        @media(max-width:720px){.ground-hero{left:14px;right:14px;top:14px;width:auto;max-width:310px}.ground-status,.ground-pins{display:none}.ground-rail{bottom:12px}}
      `}</style>
    </main>
  )
}
