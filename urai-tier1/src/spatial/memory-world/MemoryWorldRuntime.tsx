'use client'

import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import type { MemoryWorld } from './memoryWorld'
import { buildMemoryWorldRuntimePlan } from './runtimePlan'
import { useAdaptiveSpatialQuality } from '@/spatial/performance/useAdaptiveSpatialQuality'

function archetypeDomain(world: MemoryWorld) {
  return world.archetypeId.split(':')[1] ?? 'unknown'
}

function BoundedTemplateGeometry({ world }: { world: MemoryWorld }) {
  const domain = archetypeDomain(world)
  const outdoor = domain === 'nature' || domain === 'agricultureRural' || domain === 'communityCivicRetail'
  if (outdoor) {
    return (
      <group name="memory-world-bounded-template-outdoor" userData={{ truthClass: 'T4_CONTEXT_TEMPLATE', autobiographical: false }}>
        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[34, 34, 1, 1]} />
          <meshStandardMaterial color="#26352e" roughness={0.95} />
        </mesh>
        {[[-4,0,-5],[3,0,-7],[-7,0,-10],[7,0,-11]].map((position,index) => (
          <group key={index} position={position as [number,number,number]}>
            <mesh position={[0,1.1,0]} castShadow><cylinderGeometry args={[0.16,0.24,2.2,10]} /><meshStandardMaterial color="#443526" roughness={1} /></mesh>
            <mesh position={[0,2.5,0]} castShadow><sphereGeometry args={[1.1,20,14]} /><meshStandardMaterial color="#314a37" roughness={1} /></mesh>
          </group>
        ))}
      </group>
    )
  }
  return (
    <group name="memory-world-bounded-template-interior" userData={{ truthClass: 'T4_CONTEXT_TEMPLATE', autobiographical: false }}>
      <mesh position={[0,-1.2,-2]} receiveShadow><boxGeometry args={[10,.2,10]} /><meshStandardMaterial color="#3b3936" roughness={.86} /></mesh>
      <mesh position={[0,2.4,-7]} receiveShadow><boxGeometry args={[10,7,.18]} /><meshStandardMaterial color="#58534e" roughness={.92} /></mesh>
      <mesh position={[-5,2.4,-2]} receiveShadow><boxGeometry args={[.18,7,10]} /><meshStandardMaterial color="#4e4b47" roughness={.92} /></mesh>
      <mesh position={[5,2.4,-2]} receiveShadow><boxGeometry args={[.18,7,10]} /><meshStandardMaterial color="#4e4b47" roughness={.92} /></mesh>
      <mesh position={[0,-.45,-3.8]} castShadow><boxGeometry args={[2.6,.35,1.1]} /><meshStandardMaterial color="#62574b" roughness={.8} /></mesh>
      <mesh position={[-2.7,-.35,-2.2]} castShadow><boxGeometry args={[1.5,.55,1.5]} /><meshStandardMaterial color="#48525b" roughness={.88} /></mesh>
      <mesh position={[2.65,-.55,-2.4]} castShadow><boxGeometry args={[1.4,.25,1.4]} /><meshStandardMaterial color="#514a43" roughness={.9} /></mesh>
    </group>
  )
}

export type MemoryWorldRuntimeProps = {
  world: MemoryWorld
  onExit: () => void
}

export default function MemoryWorldRuntime({ world, onExit }: MemoryWorldRuntimeProps) {
  const quality = useAdaptiveSpatialQuality()
  const plan = buildMemoryWorldRuntimePlan(world)
  const accent = world.context.emotionalWeather === 'Heavy' ? '#90a6bb' : '#9de5db'

  if (!plan.valid) {
    return <main data-testid="memory-world-runtime" data-memory-world-state="suppressed" style={{minHeight:'100svh',display:'grid',placeItems:'center',background:'#05070b',color:'#fff',padding:24}}><section><h1>Memory World unavailable</h1><p>This world failed its provenance or governance contract and was not mounted.</p><button type="button" onClick={onExit}>Return to Replay</button></section></main>
  }

  return (
    <main data-testid="memory-world-runtime" data-memory-world-state="rendered" data-memory-world-id={world.worldId} data-memory-world-archetype={world.archetypeId} data-memory-world-truth={plan.truthLabel} data-memory-world-navigation={plan.navigation} style={{position:'fixed',inset:0,overflow:'hidden',background:'#071018',color:'#fff'}}>
      <Canvas shadows={quality.shadows} dpr={[1,quality.pixelRatioMax]} frameloop={quality.documentVisible?'always':'never'} camera={{position:[0,1.35,7.8],fov:52,near:.05,far:120}}>
        <color attach="background" args={['#071018']} />
        <fog attach="fog" args={['#071018',8,34]} />
        <ambientLight intensity={.42} />
        <hemisphereLight intensity={.62} color="#d7f5ff" groundColor="#172019" />
        <directionalLight position={[5,8,4]} intensity={1.5} color="#fff1d6" castShadow={quality.shadows} />
        <pointLight position={[0,2,-4]} intensity={2.3} color={accent} distance={18} />
        <BoundedTemplateGeometry world={world} />
        <OrbitControls enablePan={false} enableDamping={!quality.reducedMotion} minDistance={2.5} maxDistance={12} target={[0,.4,-3]} />
      </Canvas>
      <header style={{position:'absolute',zIndex:5,left:20,top:20,maxWidth:440,padding:'14px 16px',border:'1px solid rgba(255,255,255,.18)',borderRadius:18,background:'rgba(4,10,16,.74)',backdropFilter:'blur(12px)'}}>
        <p style={{margin:0,fontSize:11,letterSpacing:'.14em',textTransform:'uppercase',color:'#b7f7ee'}}>Memory World · bounded runtime</p>
        <h1 style={{margin:'7px 0 6px',fontSize:'clamp(1.4rem,4vw,2.5rem)'}}>{world.label}</h1>
        <strong>{plan.truthLabel}</strong>
        <p style={{fontSize:12,lineHeight:1.5,color:'rgba(255,255,255,.72)'}}>This view uses a contextual template unless source-backed reconstruction is explicitly available. It does not claim missing geometry or events were recorded.</p>
        <button type="button" onClick={onExit} style={{minHeight:48,padding:'0 16px',borderRadius:999}}>← Replay</button>
        <details style={{marginTop:10,fontSize:12}}><summary>Truth & provenance</summary><p>Archetype: {world.archetypeId}</p><p>Correction revision: {world.provenance.userCorrectionRevision}</p><p>Runtime: {plan.runtimeVersion}</p></details>
      </header>
      <span className="sr-only">Use drag or touch to orbit and scroll or pinch to move through bounded depth. This template does not replace source-backed memory evidence.</span>
    </main>
  )
}
