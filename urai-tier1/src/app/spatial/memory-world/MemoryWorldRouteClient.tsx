'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSelectedMemory } from '@/spatial/memory/useSelectedMemory'
import { buildBoundedTemplateMemoryWorld } from '@/spatial/memory-world/templateWorld'
import MemoryWorldRuntime from '@/spatial/memory-world/MemoryWorldRuntime'
import { MemoryWorldAuthoringTools } from '@/spatial/memory-world/MemoryWorldAuthoringTools'
import type { MemoryWorld } from '@/spatial/memory-world/memoryWorld'
import { memoryWorldReplayReturnHref } from '@/spatial/memory-world/memoryWorldReplay'

export default function MemoryWorldRouteClient() {
  const router = useRouter()
  const result = useSelectedMemory()
  const memory = result.memory
  const baseWorld = useMemo(() => memory ? buildBoundedTemplateMemoryWorld(memory) : null, [memory])
  const [world, setWorld] = useState<MemoryWorld | null>(baseWorld)
  useEffect(() => { setWorld(baseWorld) }, [baseWorld?.worldId])
  const exit = useCallback(() => {
    router.push(memory ? memoryWorldReplayReturnHref(memory) : '/replay')
  }, [memory, router])
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.key !== 'Escape') return
      const target = event.target
      if (target instanceof HTMLElement && (target.isContentEditable || target.matches('input,textarea,select,[role="textbox"]'))) return
      event.preventDefault()
      event.stopPropagation()
      exit()
    }
    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [exit])

  if (!world) {
    return <main data-testid="memory-world-route" data-memory-world-state={result.status} style={{minHeight:'100svh',display:'grid',placeItems:'center',padding:24,background:'#05070b',color:'#fff'}}><section><h1>Memory World</h1><p>{result.message}</p><button type="button" onClick={exit}>Return to Replay</button></section></main>
  }

  return <><MemoryWorldRuntime world={world} onExit={exit} />{memory ? <MemoryWorldAuthoringTools memory={memory} world={world} onWorldChange={setWorld} /> : null}</>
}
