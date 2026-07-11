'use client'

import { OrbitControls, PerspectiveCamera } from '@react-three/drei'
import { Canvas, useFrame } from '@react-three/fiber'
import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing'
import Link from 'next/link'
import { Suspense, useRef } from 'react'
import * as THREE from 'three'
import { assetCssStack, groundAssets } from '@/spatial/assets/uraiAssets'

function MovingCityLights() {
  const ref = useRef<THREE.Group>(null)
  useFrame(({ clock }) => {
    if (ref.current) ref.current.position.x = Math.sin(clock.elapsedTime * 0.75) * 1.4
  })
  return (
    <group ref={ref} position={[0, -0.42, -5.9]}>
      {[-4, -2.2, 0.3, 2.4, 4.5].map((x, index) => (
        <mesh key={x} position={[x, 0, index % 2 ? -0.08 : 0.08]}>
          <boxGeometry args={[0.7, 0.025, 0.025]} />
          <meshBasicMaterial color={index % 2 ? '#67e8f9' : '#facc6b'} transparent opacity={0.55} blending={THREE.AdditiveBlending} />
        </mesh>
      ))}
    </group>
  )
}

function Skyline() {
  const buildings = [
    [-5.8, 0.2, -8.3, 0.8, 2.6], [-4.5, 0.55, -8.55, 1.0, 3.4], [-3.0, 0.1, -8.25, 0.9, 2.5],
    [-1.4, 0.8, -8.6, 1.1, 4.2], [0.2, 0.35, -8.25, 1.2, 3.2], [1.9, 0.7, -8.55, 0.95, 3.9],
    [3.3, 0.12, -8.25, 1.15, 2.6], [4.9, 0.45, -8.55, 0.95, 3.3],
  ] as const
  return (
    <group>
      {buildings.map(([x, y, z, w, h], index) => (
        <group key={index} position={[x, y, z]}>
          <mesh castShadow>
            <boxGeometry args={[w, h, 0.65]} />
            <meshStandardMaterial color="#06111d" emissive="#10253b" emissiveIntensity={0.2} roughness={0.86} />
          </mesh>
          {[0, 1, 2, 3, 4, 5].map((row) => (
            <mesh key={row} position={[0, -h / 2 + 0.35 + row * 0.42, 0.34]}>
              <boxGeometry args={[w * 0.68, 0.026, 0.02]} />
              <meshBasicMaterial color={row % 2 ? '#67e8f9' : '#facc6b'} transparent opacity={0.13 + ((row + index) % 3) * 0.05} blending={THREE.AdditiveBlending} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  )
}

function GroundPin({ position, color }: { position: [number, number, number]; color: string }) {
  const ref = useRef<THREE.Group>(null)
  useFrame(({ clock }) => {
    if (ref.current) ref.current.position.y = position[1] + Math.sin(clock.elapsedTime * 1.25 + position[0]) * 0.035
  })
  return (
    <group ref={ref} position={position}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.18, 0.36, 64]} />
        <meshBasicMaterial color={color} transparent opacity={0.52} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh position={[0, 0.2, 0]}>
        <boxGeometry args={[0.28, 0.38, 0.04]} />
        <meshStandardMaterial color="#07111f" emissive={color} emissiveIntensity={0.42} transparent opacity={0.82} />
      </mesh>
    </group>
  )
}

function GroundScene() {
  return (
    <>
      <color attach="background" args={['#020611']} />
      <fog attach="fog" args={['#041225', 4.6, 22]} />
      <PerspectiveCamera makeDefault position={[0, 0.92, 4.25]} fov={54} />
      <OrbitControls enablePan={false} enableZoom enableDamping dampingFactor={0.06} rotateSpeed={0.3} zoomSpeed={0.55} minDistance={2.2} maxDistance={7.5} minPolarAngle={0.48} maxPolarAngle={1.78} />
      <ambientLight intensity={0.45} color="#d7e7ff" />
      <hemisphereLight args={['#dbeafe', '#020617', 1.1]} />
      <directionalLight position={[-4, 7, 5]} intensity={1.1} color="#dbeafe" castShadow />
      <pointLight position={[0, 1.6, 0.6]} intensity={3.2} color="#67e8f9" distance={7} />
      <pointLight position={[-3.8, 1.3, -5.5]} intensity={1.2} color="#facc6b" distance={10} />
      <pointLight position={[3.8, 1.3, -5.5]} intensity={1.1} color="#a78bfa" distance={10} />

      <mesh scale={[-1, 1, 1]}>
        <sphereGeometry args={[50, 64, 64]} />
        <meshBasicMaterial side={THREE.BackSide} color="#020713" />
      </mesh>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.88, 0.9]} receiveShadow>
        <planeGeometry args={[7.4, 9.6]} />
        <meshStandardMaterial color="#111827" emissive="#0b1d2a" emissiveIntensity={0.18} roughness={0.92} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.84, 1.55]}>
        <planeGeometry args={[2.7, 8.2]} />
        <meshStandardMaterial color="#18212d" emissive="#12384a" emissiveIntensity={0.32} roughness={0.96} />
      </mesh>
      {[-1.28, 1.28].map((x) => (
        <mesh key={x} rotation={[-Math.PI / 2, 0, 0]} position={[x, -0.8, 1.45]}>
          <planeGeometry args={[0.08, 7.3]} />
          <meshBasicMaterial color="#67e8f9" transparent opacity={0.38} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} />
        </mesh>
      ))}
      {[0, 1, 2, 3].map((step) => (
        <mesh key={step} position={[0, -1.02 - step * 0.2, 4.3 + step * 0.62]} receiveShadow>
          <boxGeometry args={[3.4 + step * 0.22, 0.18, 0.5]} />
          <meshStandardMaterial color="#0b1320" emissive="#071827" emissiveIntensity={0.14} roughness={0.9} />
        </mesh>
      ))}

      <Skyline />
      <MovingCityLights />
      <GroundPin position={[-1.6, -0.42, 0.3]} color="#67e8f9" />
      <GroundPin position={[1.55, -0.42, 0.1]} color="#a78bfa" />
      <GroundPin position={[-1.0, -0.42, 2.35]} color="#facc6b" />
      <GroundPin position={[1.05, -0.42, 2.65]} color="#86efac" />

      <EffectComposer>
        <Bloom intensity={0.86} luminanceThreshold={0.08} luminanceSmoothing={0.28} />
        <Vignette eskil={false} offset={0.14} darkness={0.58} />
      </EffectComposer>
    </>
  )
}

export default function GroundSpatialWorldClean() {
  return (
    <main className="ground-spatial-root" aria-label="URAI Ground explorable city layer" data-canonical-asset={groundAssets.primary.src}>
      <div
        aria-hidden="true"
        className="ground-provider-art"
        style={{ backgroundImage: assetCssStack(groundAssets.primary) }}
      />
      <Suspense fallback={<div className="ground-loader">URAI Ground · loading street layer</div>}>
        <Canvas shadows dpr={[1, 1.7]} gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}>
          <GroundScene />
        </Canvas>
      </Suspense>
      <header className="ground-card ground-hero">
        <p>URAI Ground</p>
        <h1>Street-level city world</h1>
        <span>Orbit the lived layer. Inspect signals, tasks, memory anchors, and control points before anything acts.</span>
        <div><Link className="primary" href="/home">Return Home</Link><Link href="/life-map">Open Sky</Link></div>
      </header>
      <aside className="ground-status">Explorable spatial Ground active</aside>
      <aside className="ground-pins">Pins: Signal · Tasks · Memory · Control</aside>
      <nav className="ground-rail" aria-label="URAI Ground navigation">
        <Link href="/home">Home</Link><Link href="/ground">Ground</Link><Link href="/life-map">Life Map</Link><Link href="/focus?manifestId=seed-memory-bloom">Focus</Link><Link href="/replay?memoryId=quiet-reset&manifestId=replay-recovery-thread">Replay</Link>
      </nav>
      <style jsx>{`
        .ground-spatial-root{position:fixed;inset:0;overflow:hidden;background:#020611;color:#f8fbff;isolation:isolate;font-family:Inter,ui-sans-serif,system-ui}
        .ground-spatial-root:before{content:'';position:absolute;inset:0;z-index:2;pointer-events:none;background:linear-gradient(180deg,rgba(2,6,17,.18),transparent 26%,rgba(2,6,17,.8))}
        .ground-provider-art{position:absolute;inset:0;z-index:2;pointer-events:none;background-size:cover;background-position:center;opacity:.12;mix-blend-mode:screen}
        .ground-spatial-root canvas{position:absolute;inset:0;z-index:1;display:block;cursor:grab}
        .ground-loader{position:absolute;inset:0;z-index:10;display:grid;place-items:center;background:#020611;color:rgba(226,246,255,.76);letter-spacing:.18em;text-transform:uppercase;font-size:12px}
        .ground-card,.ground-status,.ground-rail,.ground-pins{position:absolute;z-index:5;border:1px solid rgba(160,220,255,.15);background:linear-gradient(145deg,rgba(2,8,24,.52),rgba(10,9,31,.28));box-shadow:0 24px 90px rgba(0,0,0,.28);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px)}
        .ground-hero{left:22px;top:22px;width:min(330px,calc(100vw - 44px));padding:15px 17px;border-radius:26px}
        .ground-hero p{margin:0 0 8px;color:rgba(186,230,253,.7);font-size:10px;letter-spacing:.22em;text-transform:uppercase;font-weight:800}
        .ground-hero h1{margin:0 0 8px;font-size:clamp(28px,3vw,42px);line-height:.94;font-weight:900;letter-spacing:-.045em}
        .ground-hero span{display:block;color:rgba(235,244,255,.7);line-height:1.45;font-size:13px}
        .ground-hero div{display:flex;gap:9px;flex-wrap:wrap;margin-top:15px}
        .ground-hero a,.ground-rail a{border:1px solid rgba(160,220,255,.2);border-radius:999px;padding:9px 12px;color:#eef6ff;text-decoration:none;background:rgba(2,8,24,.46)}
        .ground-hero a.primary{background:linear-gradient(135deg,rgba(103,232,249,.94),rgba(167,139,250,.88));color:#03101f;font-weight:900}
        .ground-status{right:22px;top:22px;padding:10px 13px;border-radius:999px;color:rgba(226,246,255,.78);font-size:11px;letter-spacing:.12em;text-transform:uppercase}
        .ground-pins{right:22px;bottom:88px;padding:10px 13px;border-radius:999px;color:rgba(226,246,255,.75);font-size:11px;letter-spacing:.08em;text-transform:uppercase}
        .ground-rail{left:50%;bottom:18px;display:flex;gap:6px;max-width:calc(100vw - 32px);padding:7px;transform:translateX(-50%);overflow-x:auto;border-radius:999px}
        .ground-rail a{white-space:nowrap;font-size:12px;font-weight:800;letter-spacing:.04em;padding:8px 11px}
        @media(max-width:720px){.ground-hero{left:14px;right:14px;top:14px;width:auto}.ground-status,.ground-pins{display:none}.ground-rail{bottom:12px}}
      `}</style>
    </main>
  )
}
