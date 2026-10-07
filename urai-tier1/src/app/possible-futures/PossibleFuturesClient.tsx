'use client'

import AdamLauncherSlot from '@/spatial/adam/AdamLauncherSlot'
import { Canvas, useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import * as THREE from 'three'
import { requestUraiWorldReturn } from '@/spatial/world/worldEvents'
import { createPossibleFutureClient, getPossibleFutureClient, requestPossibleFutureGenerationClient, submitManualScenarioBranchesClient } from '@/lib/scenario/scenarioClient'
import { ScenarioCouncilPanel } from '@/spatial/scenario/ScenarioCouncilPanel'
import { useWebGLAvailable } from '../HomeSpatialCanvas'
import { useReducedMotion } from '@/spatial/hooks/useReducedMotion'

const BRANCH_LABELS = ['Current path', 'Requested change', 'Alternative constraint'] as const
type SetupState = 'question' | 'creating' | 'manual' | 'exploring' | 'error'

function seeded(index: number, salt: number) {
  const value = Math.sin((index + 1) * 12.9898 + salt * 78.233) * 43758.5453
  return value - Math.floor(value)
}

function scenarioTerrainHeight(x: number, z: number, seed: number) {
  const radial = Math.hypot(x * 0.72, z * 0.56)
  const longWave = Math.sin(x * 0.34 + seed * 1.7) * 0.42 + Math.cos(z * 0.29 - seed * 0.9) * 0.34
  const crossWave = Math.sin((x + z) * 0.19 + seed * 2.1) * 0.22 + Math.cos((x - z) * 0.23 - seed) * 0.18
  const basin = -Math.exp(-((x / 4.2) ** 2 + ((z - 1.5) / 5.8) ** 2)) * 0.9
  const horizonLift = Math.max(0, radial - 7.5) * 0.075
  return longWave + crossWave + basin + horizonLift - 0.55
}

function makeScenarioTerrain(branch: number) {
  const seed = branch + 1
  const geometry = new THREE.PlaneGeometry(36, 36, 150, 150)
  geometry.rotateX(-Math.PI / 2)
  const position = geometry.attributes.position as THREE.BufferAttribute
  const colors = new Float32Array(position.count * 3)
  const low = new THREE.Color(branch === 0 ? '#101c1a' : branch === 1 ? '#191c18' : '#141923')
  const high = new THREE.Color(branch === 0 ? '#476b61' : branch === 1 ? '#756d55' : '#58647a')
  const color = new THREE.Color()
  for (let i = 0; i < position.count; i += 1) {
    const x = position.getX(i)
    const z = position.getZ(i)
    const y = scenarioTerrainHeight(x, z, seed)
    position.setY(i, y)
    const normalized = THREE.MathUtils.clamp((y + 1.4) / 2.8, 0, 1)
    color.copy(low).lerp(high, normalized * 0.82)
    colors[i * 3] = color.r
    colors[i * 3 + 1] = color.g
    colors[i * 3 + 2] = color.b
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  geometry.computeVertexNormals()
  return geometry
}

function makeScenarioRibbon(branch: number, lane: number) {
  const seed = branch + 1
  const points: THREE.Vector3[] = []
  for (let i = 0; i <= 72; i += 1) {
    const t = i / 72
    const z = 7.2 - t * 17.5
    const x = (lane - 1) * 2.4 + Math.sin(t * Math.PI * 2.1 + seed * 1.2 + lane) * (0.8 + lane * 0.18)
    const y = scenarioTerrainHeight(x, z, seed) + 0.11 + Math.sin(t * Math.PI * 3 + lane) * 0.035
    points.push(new THREE.Vector3(x, y, z))
  }
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 96, 0.022 + lane * 0.008, 8, false)
}

function makeScenarioDust(branch: number) {
  const seed = branch + 1
  const positions = new Float32Array(320 * 3)
  for (let i = 0; i < 320; i += 1) {
    const x = (seeded(i, 101 + seed) - 0.5) * 27
    const z = (seeded(i, 151 + seed) - 0.5) * 25 - 2
    positions[i * 3] = x
    positions[i * 3 + 1] = scenarioTerrainHeight(x, z, seed) + 0.35 + seeded(i, 201 + seed) * 2.6
    positions[i * 3 + 2] = z
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  return geometry
}

function BranchMass({ branch }: { branch: number }) {
  const group = useRef<THREE.Group>(null)
  const [reducedMotion, setReducedMotion] = useState(false)
  const terrain = useMemo(() => makeScenarioTerrain(branch), [branch])
  const ribbons = useMemo(() => [0, 1, 2].map((lane) => makeScenarioRibbon(branch, lane)), [branch])
  const dust = useMemo(() => makeScenarioDust(branch), [branch])
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const sync = () => setReducedMotion(media.matches)
    sync()
    media.addEventListener?.('change', sync)
    return () => media.removeEventListener?.('change', sync)
  }, [])
  useEffect(() => () => {
    terrain.dispose()
    dust.dispose()
    ribbons.forEach((geometry) => geometry.dispose())
  }, [dust, ribbons, terrain])
  useFrame(({ clock }) => {
    if (group.current) group.current.rotation.y = reducedMotion ? 0 : Math.sin(clock.elapsedTime * 0.12) * 0.01
  })
  const ribbonColors = branch === 0 ? ['#8ad6c1', '#d8f3e7', '#6fae9f'] : branch === 1 ? ['#d9bd7a', '#fff0c0', '#a9925d'] : ['#9cb8ef', '#d7e5ff', '#778bb7']
  return <group ref={group} name="possible-futures-organic-scenario-landscape">
    <mesh geometry={terrain} receiveShadow>
      <meshStandardMaterial vertexColors roughness={0.94} metalness={0.02} />
    </mesh>
    {ribbons.map((geometry, lane) => <mesh key={lane} geometry={geometry}>
      <meshBasicMaterial color={ribbonColors[lane]} transparent opacity={lane === 1 ? 0.72 : 0.42} toneMapped={false} blending={THREE.AdditiveBlending} depthWrite={false} />
    </mesh>)}
    <points geometry={dust}>
      <pointsMaterial color={branch === 1 ? '#f4d99a' : branch === 2 ? '#b9ccff' : '#a7e5d2'} size={0.038} transparent opacity={0.46} depthWrite={false} toneMapped={false} />
    </points>
  </group>
}

function ScenarioWorld({ branch }: { branch:number }) {
  const reducedMotion = useReducedMotion()
  return <Canvas data-testid="possible-futures-canvas" data-render-cadence={reducedMotion ? 'reduced-motion-demand' : 'continuous'} frameloop={reducedMotion ? 'demand' : 'always'} camera={{ position:[0,3.7,8.8], fov:46 }} shadows dpr={[1,1.75]}>
    <color attach="background" args={['#060a0d']} />
    <fog attach="fog" args={['#060a0d',7.5,27]} />
    <ambientLight intensity={.36} />
    <hemisphereLight args={['#dbe7e4','#071014',.46]} />
    <directionalLight position={[5,9,4]} intensity={1.45} castShadow />
    <pointLight position={[0,3,-5]} intensity={2.2} distance={13} color={branch===1?'#d9bd7a':branch===2?'#94b3ff':'#8ad6c1'} />
    <BranchMass branch={branch} />
  </Canvas>
}

const panelStyle = { pointerEvents:'auto' as const, background:'rgba(8,13,16,.88)', border:'1px solid rgba(255,255,255,.18)', borderRadius:18, padding:16, backdropFilter:'blur(16px)', maxWidth:620, width:'100%', boxSizing:'border-box' as const, alignSelf:'flex-start' as const }
const inputStyle = { width:'100%', minHeight:48, boxSizing:'border-box' as const, borderRadius:12, border:'1px solid rgba(255,255,255,.22)', background:'rgba(255,255,255,.055)', color:'inherit', padding:'12px 14px', font:'inherit' }

export default function PossibleFuturesClient() {
  const params = useSearchParams(); const requestedBranch = Number(params.get('branch') ?? 0)
  const webglAvailable = useWebGLAvailable()
  const [branch,setBranch] = useState(Number.isInteger(requestedBranch)&&requestedBranch>=0&&requestedBranch<BRANCH_LABELS.length?requestedBranch:0)
  const existingScenarioId = params.get('scenario')
  const [scenarioId,setScenarioId] = useState(existingScenarioId ?? '')
  const [branchIds,setBranchIds] = useState<string[]>([])
  const [branchLabels,setBranchLabels] = useState<string[]>([])
  const [branchesLoaded,setBranchesLoaded] = useState(!existingScenarioId)
  const [basisRevision,setBasisRevision] = useState(Number(params.get('basisRevision') ?? 1))
  const [setup,setSetup] = useState<SetupState>(existingScenarioId?'exploring':'question')
  const [question,setQuestion] = useState('')
  const [manualSummaries,setManualSummaries] = useState(['','',''])
  const [message,setMessage] = useState(existingScenarioId?'This is a possibility, not a prediction.':'Ask a what-if question. No provider will be simulated if one is unavailable.')
  const horizon = params.get('horizon') ?? 'Exploratory horizon'

  useEffect(() => {
    if (!existingScenarioId) return
    let active = true
    setBranchesLoaded(false)
    void getPossibleFutureClient(existingScenarioId).then((result) => {
      if (!active) return
      const branchRecords = Array.isArray(result.branches) ? result.branches.slice(0, BRANCH_LABELS.length) : []
      const ids = branchRecords.map((entry) => String(entry.id ?? '')).filter(Boolean)
      const labels = branchRecords.map((entry, index) => String(entry.label ?? BRANCH_LABELS[index] ?? `Branch ${index + 1}`)).slice(0, ids.length)
      setBranchIds(ids)
      setBranchLabels(labels)
      setBranch((current) => Math.min(current, Math.max(0, ids.length - 1)))
      const revision = Number(result.scenario?.basisRevision ?? result.basis?.revision ?? 1)
      if (Number.isInteger(revision) && revision > 0) setBasisRevision(revision)
      setBranchesLoaded(true)
    }).catch(() => {
      if (!active) return
      setBranchesLoaded(true)
      setMessage('This Scenario could not be reloaded. Its truth boundary remains closed.')
    })
    return () => { active = false }
  }, [existingScenarioId])

  const visibleBranchLabels = branchLabels.length
    ? branchLabels
    : branchesLoaded ? [] : ['Loading Scenario…']

  const createScenario = async () => {
    if (!question.trim()) return
    setSetup('creating'); setMessage('Building a governed Scenario basis…')
    try {
      const created = await createPossibleFutureClient({ question:question.trim(), originRealm:params.get('scenarioOrigin') ?? 'home', returnToken:`possible-futures-${Date.now()}`, worldRevision:'client-context-v1', sourceContext:{
        memoryId: params.get('memoryId') ?? undefined,
        personId: params.get('personId') ?? undefined,
        placeId: params.get('placeId') ?? undefined,
      }, assumptionOnly:true, timeHorizon:{ amount:1, unit:'month' } })
      setScenarioId(created.scenarioId); setBasisRevision(created.basisRevision)
      const generation = await requestPossibleFutureGenerationClient({ scenarioId:created.scenarioId, expectedRevision:created.basisRevision })
      if (generation.status === 'provider-unavailable') { setSetup('manual'); setMessage('AI generation is unavailable. Enter your own branch assumptions; UrAi will render them without pretending a model generated them.') }
      else { setSetup('exploring'); setMessage('This is a possibility, not a prediction.') }
    } catch (error) { setSetup('error'); setMessage(error instanceof Error ? error.message : 'Scenario creation failed safely.') }
  }

  const submitManual = async () => {
    const branches = manualSummaries.map((summary,index)=>({ label:BRANCH_LABELS[index], summary:summary.trim() })).filter((item)=>item.summary)
    if (!branches.length || !scenarioId) return
    setSetup('creating'); setMessage('Saving your Manual Scenario…')
    try { const result = await submitManualScenarioBranchesClient({ scenarioId, expectedRevision:basisRevision, branches }); setBranchIds(result.branchIds); setBranchLabels(branches.map((item)=>item.label)); setBranch(0); setBranchesLoaded(true); setSetup('exploring'); setMessage('Manual Scenario loaded. These branches came from your assumptions, not an AI prediction.') }
    catch (error) { setSetup('error'); setMessage(error instanceof Error ? error.message : 'Manual Scenario failed safely.') }
  }

  return <main data-testid="urai-possible-futures" data-truth-mode="scenario" data-setup-state={setup} style={{ position:'fixed',inset:0,background:'#080d10',color:'#eef4f2',overflow:'hidden' }}>
    <div aria-hidden="true" style={{ position:'absolute',inset:0 }}>
      {webglAvailable === true
        ? <ScenarioWorld branch={branch} />
        : <div data-testid="possible-futures-webgl-fallback" data-webgl-state={webglAvailable === null ? 'detecting' : 'unavailable'} style={{position:'absolute',inset:0,background:'radial-gradient(circle at 50% 32%, rgba(89,105,99,.24), transparent 34%), linear-gradient(180deg,#0d1517 0%,#080d10 58%,#05080a 100%)'}} />}
    </div>
    <section aria-label="Possible Future controls" style={{ position:'absolute',inset:0,pointerEvents:'none',display:'flex',flexDirection:'column',justifyContent:'space-between',gap:20,padding:'max(18px, env(safe-area-inset-top)) max(18px, env(safe-area-inset-right)) max(120px, calc(env(safe-area-inset-bottom) + 110px)) max(18px, env(safe-area-inset-left))',overflowY:'auto',boxSizing:'border-box' }}>
      <header style={{ flexShrink:0,maxWidth:620,pointerEvents:'auto',textShadow:'0 2px 18px #000' }}><p style={{ margin:0,letterSpacing:'.16em',fontSize:12,fontWeight:700 }}>POSSIBLE FUTURE · NOT A MEMORY</p><h1 style={{ margin:'8px 0 4px',fontSize:'clamp(24px,4vw,42px)',fontWeight:520 }}>Possible Futures</h1><p aria-live="polite" style={{ margin:0,opacity:.82 }}>{message}</p></header>
      {setup==='question'||setup==='creating'||setup==='error'?<div style={{...panelStyle,flexShrink:0}}><label htmlFor="possible-future-question">What do you want to explore?</label><textarea id="possible-future-question" value={question} onChange={(e)=>setQuestion(e.target.value)} disabled={setup==='creating'} placeholder="What if I move?" style={{...inputStyle,minHeight:88,marginTop:8}} /><p style={{opacity:.72,fontSize:13}}>Direct arrival without evidence uses an explicit assumption-only basis. Nothing here becomes autobiographical memory.</p><button type="button" disabled={!question.trim()||setup==='creating'} onClick={createScenario} style={{...inputStyle,width:'auto',cursor:'pointer'}}>Create Possible Future</button></div>:null}
      {setup==='manual'?<div style={{...panelStyle,flexShrink:0}}><strong>Manual Scenario</strong><p style={{opacity:.76}}>Provider generation is unavailable. Write one or more possible branches yourself.</p>{BRANCH_LABELS.map((label,index)=><label key={label} style={{display:'block',marginTop:10}}>{label}<textarea value={manualSummaries[index]} onChange={(e)=>setManualSummaries((current)=>current.map((value,i)=>i===index?e.target.value:value))} style={{...inputStyle,minHeight:64,marginTop:5}} /></label>)}<button type="button" onClick={submitManual} disabled={!manualSummaries.some((value)=>value.trim())} style={{...inputStyle,width:'auto',marginTop:12}}>Enter Manual Scenario</button></div>:null}
      {setup==='exploring'&&scenarioId&&branchesLoaded?<ScenarioCouncilPanel scenarioId={scenarioId} branchId={branchIds[branch]} />:null}
      <footer style={{flexShrink:0,display:'flex',gap:10,flexWrap:'wrap',alignItems:'center',pointerEvents:'auto'}}><button type="button" onClick={requestUraiWorldReturn} style={{minHeight:48,padding:'0 18px',borderRadius:999,border:'1px solid rgba(255,255,255,.25)',background:'rgba(8,13,16,.78)',color:'inherit'}}>Return</button>{setup==='exploring'&&visibleBranchLabels.length?<div role="group" aria-label="Scenario branches" style={{display:'flex',flexWrap:'wrap',maxWidth:'100%',gap:8,padding:6,borderRadius:18,background:'rgba(8,13,16,.78)',border:'1px solid rgba(255,255,255,.16)'}}>{visibleBranchLabels.map((label,index)=><button key={label} type="button" aria-pressed={branch===index} onClick={()=>setBranch(index)} style={{minHeight:48,padding:'0 14px',borderRadius:999,border:branch===index?'1px solid rgba(238,244,242,.7)':'1px solid transparent',background:branch===index?'rgba(238,244,242,.12)':'transparent',color:'inherit'}}>{label}</button>)}</div>:null}<AdamLauncherSlot name="possible-futures-controls" /><span style={{fontSize:12,opacity:.65}}>{scenarioId?`Scenario ${scenarioId.slice(0,18)}… · `:''}{horizon}</span></footer>
    </section>
    <p className="sr-only">This surface represents hypothetical scenarios only. It is not Replay and must not be interpreted as autobiographical memory.</p>
  </main>
}
