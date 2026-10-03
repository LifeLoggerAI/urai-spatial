import type { SelectedMemory } from '@/spatial/memory/selectedMemoryContract'

export function memoryWorldReplayHref(memory: SelectedMemory) {
  const params = new URLSearchParams({
    memoryId: memory.id,
    manifestId: memory.replayManifest.id,
    node: memory.star.id,
    returnNode: memory.star.id,
    from: 'replay',
  })
  if (memory.demo) params.set('demo', '1')
  return `/spatial/memory-world?${params.toString()}`
}

export function memoryWorldReplayReturnHref(memory: SelectedMemory) {
  const params = new URLSearchParams({ memoryId: memory.id, manifestId: memory.replayManifest.id, node: memory.star.id, returnNode: memory.star.id, from: 'memory-world' })
  if (memory.demo) params.set('demo', '1')
  return `/replay?${params.toString()}`
}
