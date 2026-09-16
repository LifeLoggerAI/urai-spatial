'use client'

import { Canvas, useFrame } from '@react-three/fiber'
import { Environment } from '@react-three/drei'
import { useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import * as THREE from 'three'
import { requestUraiWorldReturn } from '@/spatial/world/worldEvents'
import { createPossibleFutureClient, requestPossibleFutureGenerationClient, submitManualScenarioBranchesClient } from '@/lib/scenario/scenarioClient'

const BRANCH_LABELS = ['Current path', 'Requested change', 'Alternative constraint'] as const
type SetupState = 'question' | 'creating' | 'manual' | 'exploring' | 'error'

function BranchMass({ branch }: { branch: number }) {
  const group = useRef<THREE.Group>(null); const seed = branch + 1
  const pieces = useMemo(() => Array.from({ length:7 }, (_, index) => ({ x:Math.sin(seed*2.17+index*1.31)*2.6, z:-1.5-index*.82+Math.cos(index*1.7+seed)*.45, y:.42+(index%3)*.23, scale:.44+((index*17+seed*7)%9)*.035, rotation:Math.sin(index*.91+seed)*.4 })), [seed])
  useFrame(({ clock }) => { if (group.current) group.current.rotation.y = Math.sin(clock.elapsedTime*.12)*.012 })
  return <group ref={group}>
    <mesh rotation={[-Math.PI/2,0,0]} receiveShadow><planeGeometry args={[18,18,1,1]} /><meshStandardMaterial color={branch===0?'#202a28':branch===1?'#29302e':'#262a30'} roughness={1} /></mesh>
    <group name="possible-future-factual-anchor" position={[0,.72,1.2]}><mesh castShadow><cylinderGeometry args={[.7,.95,1.25,7]} /><meshStandardMaterial color="#394744" roughness={.72} metalness={.08} /></mesh></group>
    {pieces.map((piece,index)=><mesh key={index} position={[piece.x,piece.y,piece.z]} rotation={[piece.rotation*.3,piece.rotation,piece.rotation*.18]} scale={piece.scale} castShadow><dodecahedronGeometry args={[1,0]} /><meshStandardMaterial color={branch===0?'#596963':branch===1?'#6c665e':'#5b616b'} roughness={.82} metalness={.04} /></mesh>)}
  </group>
}
function ScenarioWorld({ branch }: { branch:number }) { return <Canvas camera={{ position:[0,3.6,8.4], fov:48 }} shadows dpr={[1,1.75]}><color attach="background" args={['#080d10']} /><fog attach="fog" args={['#080d10',8,23]} /><ambientLight intensity={.48} /><hemisphereLight args={['#dbe7e4','#0c1012',.52]} /><directionalLight position={[5,8,4]} intensity={1.3} castShadow /><BranchMass branch={branch} /><Environment preset="city" environmentIntensity={.24} /></Canvas> }

const panelStyle = { pointerEvents:'auto' as const, background:'rgba(8,13,16,.88)', border:'1px solid rgba(255,255,255,.18)', borderRadius:18, padding:16, backdropFilter:'blur(16px)', maxWidth:620 }
const inputStyle = { width:'100%', minHeight:48, borderRadius:12, border:'1px solid rgba(255,255,255,.22)', background:'rgba(255,255,255,.055)', color:'inherit', padding:'12px 14px', font:'inherit' }

export default function PossibleFuturesClient() {
  const params = useSearchParams(); const requestedBranch = Number(params.get('branch') ?? 0)
  const [branch,setBranch] = useState(Number.isInteger(requestedBranch)&&requestedBranch>=0&&requestedBranch<BRANCH_LABELS.length?requestedBranch:0)
  const existingScenarioId = params.get('scenario')
  const [scenarioId,setScenarioId] = useState(existingScenarioId ?? '')
  const [basisRevision,setBasisRevision] = useState(Number(params.get('basisRevision') ?? 1))
  const [setup,setSetup] = useState<SetupState>(existingScenarioId?'exploring':'question')
  const [question,setQuestion] = useState('')
  const [manualSummaries,setManualSummaries] = useState(['','',''])
  const [message,setMessage] = useState(existingScenarioId?'This is a possibility, not a prediction.':'Ask a what-if question. No provider will be simulated if one is unavailable.')
  const horizon = params.get('horizon') ?? 'Exploratory horizon'

  const createScenario = async () => {
    if (!question.trim()) return
    setSetup('creating'); setMessage('Building a governed Scenario basis…')
    try {
      const created = await createPossibleFutureClient({ question:question.trim(), originRealm:params.get('scenarioOrigin') ?? 'home', returnToken:`possible-futures-${Date.now()}`, worldRevision:'client-context-v1', evidenceRefs:[], assumptionOnly:true, timeHorizon:{ amount:1, unit:'month' } })
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
    try { await submitManualScenarioBranchesClient({ scenarioId, expectedRevision:basisRevision, branches }); setSetup('exploring'); setMessage('Manual Scenario loaded. These branches came from your assumptions, not an AI prediction.') }
    catch (error) { setSetup('error'); setMessage(error instanceof Error ? error.message : 'Manual Scenario failed safely.') }
  }

  return <main data-testid="urai-possible-futures" data-truth-mode="scenario" data-setup-state={setup} style={{ position:'fixed',inset:0,background:'#080d10',color:'#eef4f2',overflow:'hidden' }}>
    <div aria-hidden="true" style={{ position:'absolute',inset:0 }}><ScenarioWorld branch={branch} /></div>
    <section aria-label="Possible Future controls" style={{ position:'absolute',inset:0,pointerEvents:'none',display:'flex',flexDirection:'column',justifyContent:'space-between',padding:'max(18px, env(safe-area-inset-top)) max(18px, env(safe-area-inset-right)) max(18px, env(safe-area-inset-bottom)) max(18px, env(safe-area-inset-left))' }}>
      <header style={{ maxWidth:620,pointerEvents:'auto',textShadow:'0 2px 18px #000' }}><p style={{ margin:0,letterSpacing:'.16em',fontSize:12,fontWeight:700 }}>POSSIBLE FUTURE · NOT A MEMORY</p><h1 style={{ margin:'8px 0 4px',fontSize:'clamp(24px,4vw,42px)',fontWeight:520 }}>Possible Futures</h1><p aria-live="polite" style={{ margin:0,opacity:.82 }}>{message}</p></header>
      {setup==='question'||setup==='creating'||setup==='error'?<div style={panelStyle}><label htmlFor="possible-future-question">What do you want to explore?</label><textarea id="possible-future-question" value={question} onChange={(e)=>setQuestion(e.target.value)} disabled={setup==='creating'} placeholder="What if I move?" style={{...inputStyle,minHeight:88,marginTop:8}} /><p style={{opacity:.72,fontSize:13}}>Direct arrival without evidence uses an explicit assumption-only basis. Nothing here becomes autobiographical memory.</p><button type="button" disabled={!question.trim()||setup==='creating'} onClick={createScenario} style={{...inputStyle,width:'auto',cursor:'pointer'}}>Create Possible Future</button></div>:null}
      {setup==='manual'?<div style={panelStyle}><strong>Manual Scenario</strong><p style={{opacity:.76}}>Provider generation is unavailable. Write one or more possible branches yourself.</p>{BRANCH_LABELS.map((label,index)=><label key={label} style={{display:'block',marginTop:10}}>{label}<textarea value={manualSummaries[index]} onChange={(e)=>setManualSummaries((current)=>current.map((value,i)=>i===index?e.target.value:value))} style={{...inputStyle,minHeight:64,marginTop:5}} /></label>)}<button type="button" onClick={submitManual} disabled={!manualSummaries.some((value)=>value.trim())} style={{...inputStyle,width:'auto',marginTop:12}}>Enter Manual Scenario</button></div>:null}
      <footer style={{display:'flex',gap:10,flexWrap:'wrap',alignItems:'center',pointerEvents:'auto'}}><button type="button" onClick={requestUraiWorldReturn} style={{minHeight:48,padding:'0 18px',borderRadius:999,border:'1px solid rgba(255,255,255,.25)',background:'rgba(8,13,16,.78)',color:'inherit'}}>Return</button>{setup==='exploring'?<div role="group" aria-label="Scenario branches" style={{display:'flex',gap:8,padding:6,borderRadius:999,background:'rgba(8,13,16,.78)',border:'1px solid rgba(255,255,255,.16)'}}>{BRANCH_LABELS.map((label,index)=><button key={label} type="button" aria-pressed={branch===index} onClick={()=>setBranch(index)} style={{minHeight:42,padding:'0 14px',borderRadius:999,border:branch===index?'1px solid rgba(238,244,242,.7)':'1px solid transparent',background:branch===index?'rgba(238,244,242,.12)':'transparent',color:'inherit'}}>{label}</button>)}</div>:null}<span style={{fontSize:12,opacity:.65}}>{scenarioId?`Scenario ${scenarioId.slice(0,18)}… · `:''}{horizon}</span></footer>
    </section>
    <p className="sr-only">This surface represents hypothetical scenarios only. It is not Replay and must not be interpreted as autobiographical memory.</p>
  </main>
}
