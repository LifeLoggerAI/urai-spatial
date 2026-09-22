'use client'

import { Canvas } from '@react-three/fiber'
import { PerspectiveCamera } from '@react-three/drei'
import { useEffect, useMemo, useState } from 'react'
import * as THREE from 'three'
import { requestUraiWorldReturn } from '@/spatial/world/worldEvents'
import { MAX_SCENARIO_BRANCHES } from '@/lib/scenario/scenarioTypes'

const DEFAULT_LABELS = ['Current path', 'Requested change', 'Alternative constraint'] as const

type ManualBranch = { id: string; label: string; summary: string }

function detectWebGL(): boolean {
  if (typeof document === 'undefined') return false
  const canvas = document.createElement('canvas')
  return Boolean(canvas.getContext('webgl2') || canvas.getContext('webgl'))
}

function makeBranch(index: number, summary: string): ManualBranch {
  return { id: `manual-${index + 1}`, label: DEFAULT_LABELS[index] ?? `Branch ${index + 1}`, summary }
}

function ScenarioWorld({ branches, activeId }: { branches: ManualBranch[]; activeId: string }) {
  const paths = useMemo(() => branches.map((branch, index) => {
    const side = index - (branches.length - 1) / 2
    const points = [
      new THREE.Vector3(0, 0.03, 3.4),
      new THREE.Vector3(side * 0.9, 0.05, 1.2),
      new THREE.Vector3(side * 2.2, 0.08, -2.8),
    ]
    return { branch, geometry: new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 40, 0.055, 8, false), x: side * 2.2 }
  }), [branches])
  return <Canvas data-testid="possible-futures-spatial-world" dpr={[1,1.4]} gl={{antialias:true,alpha:false,powerPreference:'high-performance'}}>
    <color attach="background" args={['#0a1010']} />
    <fog attach="fog" args={['#0a1010', 7, 22]} />
    <PerspectiveCamera makeDefault position={[0,5.2,9.4]} fov={45} />
    <ambientLight intensity={0.34} color="#dbe7e1" />
    <hemisphereLight intensity={0.5} color="#dce9e3" groundColor="#18201e" />
    <directionalLight position={[-4,7,5]} intensity={1.0} color="#e9efe9" />
    <mesh rotation={[-Math.PI/2,0,0]} receiveShadow>
      <planeGeometry args={[16,16,48,48]} />
      <meshStandardMaterial color="#17211f" roughness={0.98} />
    </mesh>
    {paths.map(({branch,geometry,x}, index) => {
      const active = branch.id === activeId
      return <group key={branch.id}>
        <mesh geometry={geometry}><meshStandardMaterial color={active?'#cfe2d8':'#73827c'} emissive={active?'#8aa89b':'#28312e'} emissiveIntensity={active?0.28:0.06} roughness={0.82} /></mesh>
        <mesh position={[x,0.28,-2.8]}><cylinderGeometry args={[0.28,0.34,0.56,24]} /><meshStandardMaterial color={active?'#dfe8e2':'#7d8984'} roughness={0.9} /></mesh>
        <pointLight position={[x,0.72,-2.8]} color={active?'#dfeee6':'#88958f'} intensity={active?1.8:0.45} distance={4.2} decay={2} />
      </group>
    })}
  </Canvas>
}

export default function PossibleFuturesClient() {
  const [question, setQuestion] = useState('')
  const [drafts, setDrafts] = useState(['', '', ''])
  const [branches, setBranches] = useState<ManualBranch[]>([])
  const [activeId, setActiveId] = useState('')
  const [webglAvailable, setWebglAvailable] = useState<boolean | null>(null)

  useEffect(() => setWebglAvailable(detectWebGL()), [])

  const active = useMemo(() => branches.find((branch) => branch.id === activeId) ?? branches[0] ?? null, [activeId, branches])

  const enterManualScenario = () => {
    const next = drafts
      .map((summary, index) => makeBranch(index, summary.trim()))
      .filter((branch) => branch.summary)
      .slice(0, MAX_SCENARIO_BRANCHES)
    if (!question.trim() || !next.length) return
    setBranches(next)
    setActiveId(next[0].id)
  }

  const reset = () => {
    setBranches([])
    setActiveId('')
  }

  return (
    <main
      data-testid="urai-possible-futures"
      data-truth-mode="scenario"
      data-provider-state="unavailable-manual-only"
      data-branch-ordering="unranked"
      data-webgl-state={webglAvailable === null ? 'checking' : webglAvailable ? 'available' : 'unavailable'}
      style={{ minHeight: '100svh', background: 'linear-gradient(180deg,#090d10 0%,#12191a 52%,#0b1012 100%)', color: '#eef4f2', padding: 'clamp(20px,4vw,56px)' }}
    >
      <div style={{ maxWidth: 980, margin: '0 auto', display: 'grid', gap: 24 }}>
        <header>
          <p style={{ letterSpacing: '.16em', fontSize: 12, fontWeight: 800, margin: 0 }}>POSSIBLE FUTURE · NOT A MEMORY</p>
          <h1 style={{ fontSize: 'clamp(32px,7vw,72px)', lineHeight: 1, margin: '12px 0' }}>Possible Futures</h1>
          <p style={{ maxWidth: 760, opacity: .82, fontSize: 'clamp(16px,2vw,20px)' }}>
            Explore assumptions without turning them into memory, prediction, or fact. The governed generation provider is unavailable here, so this surface fails closed to Manual Scenario.
          </p>
        </header>

        {!branches.length ? (
          <section aria-labelledby="possible-futures-manual-title" style={{ display: 'grid', gap: 16, padding: 'clamp(18px,3vw,30px)', border: '1px solid rgba(238,244,242,.18)', borderRadius: 24, background: 'rgba(255,255,255,.035)' }}>
            <div>
              <h2 id="possible-futures-manual-title" style={{ margin: 0 }}>Manual Scenario</h2>
              <p style={{ opacity: .72 }}>Provider unavailable. Nothing below is AI-generated or ranked.</p>
            </div>
            <label>
              <span>What do you want to explore?</span>
              <textarea value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="What if I change…" style={{ width: '100%', minHeight: 92, marginTop: 8, padding: 14, borderRadius: 14, background: '#111719', color: 'inherit', border: '1px solid rgba(238,244,242,.2)', font: 'inherit' }} />
            </label>
            {DEFAULT_LABELS.map((label, index) => (
              <label key={label}>
                <span>{label}</span>
                <textarea value={drafts[index]} onChange={(event) => setDrafts((current) => current.map((value, i) => i === index ? event.target.value : value))} placeholder="Your assumption or possible branch" style={{ width: '100%', minHeight: 72, marginTop: 8, padding: 14, borderRadius: 14, background: '#111719', color: 'inherit', border: '1px solid rgba(238,244,242,.2)', font: 'inherit' }} />
              </label>
            ))}
            <button type="button" onClick={enterManualScenario} disabled={!question.trim() || !drafts.some((value) => value.trim())} style={{ minHeight: 48, width: 'fit-content', padding: '0 20px', borderRadius: 999 }}>
              Enter Manual Scenario
            </button>
          </section>
        ) : (
          <section aria-labelledby="possible-futures-world-title" style={{ display: 'grid', gap: 18 }}>
            <div style={{ minHeight: 360, position: 'relative', borderRadius: 28, overflow: 'hidden', border: '1px solid rgba(238,244,242,.16)', background:'#0a1010' }}>
              {webglAvailable ? <ScenarioWorld branches={branches} activeId={active?.id ?? ''} /> : <div
                data-testid="possible-futures-spatial-fallback"
                aria-hidden="true"
                style={{ position:'absolute', inset:0, background:'radial-gradient(circle at 50% 42%, rgba(207,226,216,.12), transparent 30%), linear-gradient(180deg,#0a1010 0%,#121a18 100%)' }}
              />}
              <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'end center', padding: 24, textAlign: 'center', pointerEvents:'none' }}>
                <div style={{maxWidth:680,padding:'14px 18px',borderRadius:18,background:'rgba(8,12,12,.72)',backdropFilter:'blur(12px)'}}>
                  <p style={{ letterSpacing: '.14em', fontSize: 11, fontWeight: 800, margin:0 }}>SCENARIO · UNRANKED</p>
                  <h2 id="possible-futures-world-title" style={{ fontSize: 'clamp(24px,4vw,42px)', margin: '6px 0' }}>{active?.label}</h2>
                  <p style={{ margin: 0, fontSize: 'clamp(15px,2vw,18px)', lineHeight: 1.45 }}>{active?.summary}</p>
                </div>
              </div>
            </div>
            <div role="group" aria-label="Unranked scenario branches" style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              {branches.map((branch) => (
                <button key={branch.id} type="button" aria-pressed={active?.id === branch.id} onClick={() => setActiveId(branch.id)} style={{ minHeight: 48, padding: '0 18px', borderRadius: 999 }}>
                  {branch.label}
                </button>
              ))}
            </div>
            <aside aria-label="Scenario truth boundary" style={{ padding: 18, borderLeft: '3px solid rgba(238,244,242,.5)', background: 'rgba(255,255,255,.035)' }}>
              <strong>Assumptions only.</strong> These branches are user-authored possibilities. They are not memories, observations, recommendations, predictions, or externally executed actions.
            </aside>
            <button type="button" onClick={reset} style={{ minHeight: 48, width: 'fit-content', padding: '0 18px', borderRadius: 999 }}>Edit assumptions</button>
          </section>
        )}

        <footer style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <button type="button" onClick={requestUraiWorldReturn} style={{ minHeight: 48, padding: '0 20px', borderRadius: 999 }}>Return to origin</button>
          <span aria-live="polite" style={{ alignSelf: 'center', opacity: .68 }}>Maximum {MAX_SCENARIO_BRANCHES} branches · unranked · provider unavailable</span>
        </footer>
      </div>
      <p className="sr-only">This is a hypothetical Scenario World. It is not Replay and not autobiographical memory.</p>
    </main>
  )
}
