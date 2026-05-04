'use client'
import { useEffect, useMemo, useState } from 'react'
import { fetchLifeChapters, fetchLifeMapEdges, fetchLifeMapNodes, generateMirrorOfBecoming } from '@/lib/life-map/lifeMapFirestore'
import { LifeMapMode, LifeMapNode } from '@/lib/life-map/lifeMapTypes'
import { LifeMapCanvas } from './LifeMapCanvas'
import { LifeMapControls } from './LifeMapControls'
import { LifeMapFilters } from './LifeMapFilters'
import { LifeMapDetailCard } from './LifeMapDetailCard'
import { LifeMapNarrator } from './LifeMapNarrator'
import { CompanionGuide } from './CompanionGuide'

export default function LifeMapView({ userId='demo-user' }: { userId?: string }) {
  const [nodes, setNodes] = useState<LifeMapNode[]>([]); const [edges, setEdges] = useState<any[]>([]); const [mode, setMode] = useState<LifeMapMode>('timeline');
  const [selected, setSelected] = useState<LifeMapNode | null>(null); const [narratorLine, setNarratorLine] = useState<string>()
  useEffect(() => { (async()=>{ setNodes(await fetchLifeMapNodes(userId)); setEdges(await fetchLifeMapEdges(userId)); await fetchLifeChapters(userId) })() }, [userId])
  const isEmpty = nodes.length === 0
  const highlighted = useMemo(()=>nodes.filter(n=>n.importanceScore>0.75).length,[nodes])
  return <main className='relative h-dvh w-full overflow-hidden text-white'>
    {isEmpty ? <div className='flex h-full flex-col items-center justify-center bg-slate-950 text-center px-6'><p className='max-w-sm text-sm text-white/80'>Your Life Map is quiet right now. As URAI notices memories, moods, places, voices, rituals, and patterns, this sky will begin to bloom.</p><div className='mt-4 flex gap-2'><button className='rounded bg-indigo-500 px-3 py-2 text-sm'>Demo mode</button><button className='rounded bg-white/20 px-3 py-2 text-sm'>Connect data</button></div></div> : <LifeMapCanvas nodes={nodes} edges={edges} onSelect={(n)=>{setSelected(n); setNarratorLine(n.narratorLine)}} />}
    <LifeMapFilters /><LifeMapNarrator line={narratorLine ?? `${highlighted} major stars are glowing in this era.`} /><CompanionGuide mood={mode} />
    <LifeMapControls mode={mode} setMode={async (m)=>{ setMode(m); if (m==='mirror') setNarratorLine(`Mirror path includes ${(await generateMirrorOfBecoming(userId)).length} transformation moments.`)}} />
    {selected ? <LifeMapDetailCard node={selected} onClose={()=>setSelected(null)} onReplay={()=>setNarratorLine('Cinematic replay started: camera path, aura bloom, and emotional weather shifting...')} /> : null}
  </main>
}
