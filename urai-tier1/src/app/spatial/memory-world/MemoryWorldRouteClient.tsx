'use client'

import { useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useSelectedMemory } from '@/spatial/memory/useSelectedMemory'
import { buildBoundedTemplateMemoryWorld } from '@/spatial/memory-world/templateWorld'
import MemoryWorldRuntime from '@/spatial/memory-world/MemoryWorldRuntime'
import { requestUraiWorldReturn } from '@/spatial/world/worldEvents'

export default function MemoryWorldRouteClient() {
  const router = useRouter()
  const result = useSelectedMemory()
  const memory = result.memory
  const world = useMemo(() => memory ? buildBoundedTemplateMemoryWorld(memory) : null, [memory])
  const exit = useCallback(() => {
    requestUraiWorldReturn()
    if (window.history.length <= 1) router.push('/replay')
  }, [router])

  if (!world) {
    return <main data-testid="memory-world-route" data-memory-world-state={result.status} style={{minHeight:'100svh',display:'grid',placeItems:'center',padding:24,background:'#05070b',color:'#fff'}}><section><h1>Memory World</h1><p>{result.message}</p><button type="button" onClick={exit}>Return to Replay</button></section></main>
  }

  return <MemoryWorldRuntime world={world} onExit={exit} />
}
