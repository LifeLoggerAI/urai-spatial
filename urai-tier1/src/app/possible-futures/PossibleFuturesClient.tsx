'use client'

import { Canvas, useFrame } from '@react-three/fiber'
import { Environment } from '@react-three/drei'
import { useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import * as THREE from 'three'
import { requestUraiWorldReturn } from '@/spatial/world/worldEvents'

const BRANCHES = ['Current path', 'Requested change', 'Alternative constraint'] as const

function BranchMass({ branch }: { branch: number }) {
  const group = useRef<THREE.Group>(null)
  const seed = branch + 1
  const pieces = useMemo(() => Array.from({ length: 7 }, (_, index) => ({
    x: Math.sin(seed * 2.17 + index * 1.31) * 2.6,
    z: -1.5 - index * .82 + Math.cos(index * 1.7 + seed) * .45,
    y: .42 + (index % 3) * .23,
    scale: .44 + ((index * 17 + seed * 7) % 9) * .035,
    rotation: Math.sin(index * .91 + seed) * .4,
  })), [seed])
  useFrame(({ clock }) => { if (group.current) group.current.rotation.y = Math.sin(clock.elapsedTime * .12) * .012 })
  return <group ref={group}>
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[18, 18, 1, 1]} />
      <meshStandardMaterial color={branch === 0 ? '#202a28' : branch === 1 ? '#29302e' : '#262a30'} roughness={1} />
    </mesh>
    <group name="possible-future-factual-anchor" position={[0, .72, 1.2]}>
      <mesh castShadow><cylinderGeometry args={[.7, .95, 1.25, 7]} /><meshStandardMaterial color="#394744" roughness={.72} metalness={.08} /></mesh>
    </group>
    {pieces.map((piece, index) => <mesh key={index} position={[piece.x, piece.y, piece.z]} rotation={[piece.rotation * .3, piece.rotation, piece.rotation * .18]} scale={piece.scale} castShadow>
      <dodecahedronGeometry args={[1, 0]} />
      <meshStandardMaterial color={branch === 0 ? '#596963' : branch === 1 ? '#6c665e' : '#5b616b'} roughness={.82} metalness={.04} />
    </mesh>)}
  </group>
}

function ScenarioWorld({ branch }: { branch: number }) {
  return <Canvas camera={{ position: [0, 3.6, 8.4], fov: 48 }} shadows dpr={[1, 1.75]}>
    <color attach="background" args={['#080d10']} />
    <fog attach="fog" args={['#080d10', 8, 23]} />
    <ambientLight intensity={.48} />
    <hemisphereLight args={['#dbe7e4', '#0c1012', .52]} />
    <directionalLight position={[5, 8, 4]} intensity={1.3} castShadow />
    <BranchMass branch={branch} />
    <Environment preset="city" environmentIntensity={.24} />
  </Canvas>
}

export default function PossibleFuturesClient() {
  const params = useSearchParams()
  const requestedBranch = Number(params.get('branch') ?? 0)
  const [branch, setBranch] = useState(Number.isInteger(requestedBranch) && requestedBranch >= 0 && requestedBranch < BRANCHES.length ? requestedBranch : 0)
  const scenarioId = params.get('scenario')
  const horizon = params.get('horizon') ?? 'Exploratory horizon'

  return <main data-testid="urai-possible-futures" data-truth-mode="scenario" style={{ position: 'fixed', inset: 0, background: '#080d10', color: '#eef4f2', overflow: 'hidden' }}>
    <div aria-hidden="true" style={{ position: 'absolute', inset: 0 }}><ScenarioWorld branch={branch} /></div>
    <section aria-label="Possible Future controls" style={{ position: 'absolute', inset: 0, pointerEvents: 'none', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: 'max(18px, env(safe-area-inset-top)) max(18px, env(safe-area-inset-right)) max(18px, env(safe-area-inset-bottom)) max(18px, env(safe-area-inset-left))' }}>
      <header style={{ maxWidth: 520, pointerEvents: 'auto', textShadow: '0 2px 18px #000' }}>
        <p style={{ margin: 0, letterSpacing: '.16em', fontSize: 12, fontWeight: 700 }}>POSSIBLE FUTURE · NOT A MEMORY</p>
        <h1 style={{ margin: '8px 0 4px', fontSize: 'clamp(24px,4vw,42px)', fontWeight: 520 }}>Possible Futures</h1>
        <p style={{ margin: 0, opacity: .78 }}>{scenarioId ? `Scenario ${scenarioId}` : 'No governed scenario loaded — visual shell only.'} · {horizon}</p>
      </header>
      <footer style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', pointerEvents: 'auto' }}>
        <button type="button" onClick={requestUraiWorldReturn} style={{ minHeight: 48, padding: '0 18px', borderRadius: 999, border: '1px solid rgba(255,255,255,.25)', background: 'rgba(8,13,16,.78)', color: 'inherit' }}>Return</button>
        <div role="group" aria-label="Scenario branches" style={{ display: 'flex', gap: 8, padding: 6, borderRadius: 999, background: 'rgba(8,13,16,.78)', border: '1px solid rgba(255,255,255,.16)' }}>
          {BRANCHES.map((label, index) => <button key={label} type="button" aria-pressed={branch === index} onClick={() => setBranch(index)} style={{ minHeight: 42, padding: '0 14px', borderRadius: 999, border: branch === index ? '1px solid rgba(238,244,242,.7)' : '1px solid transparent', background: branch === index ? 'rgba(238,244,242,.12)' : 'transparent', color: 'inherit' }}>{label}</button>)}
        </div>
      </footer>
    </section>
    <p className="sr-only">This surface represents hypothetical scenarios only. It is not Replay and must not be interpreted as autobiographical memory.</p>
  </main>
}
