import type { LifeMapNode } from '@/components/lifemap/lifeMapData'
import type { SelectedMemory } from '@/spatial/memory/selectedMemoryContract'

export function currentFocusNode(nodes: readonly LifeMapNode[], memory: SelectedMemory | null, hint: string | null): LifeMapNode | null {
  if (!memory || memory.privacy === 'hidden') return null
  const valid = (node: LifeMapNode) => !node.locked && node.privacyLevel !== 'hidden'
    && (memory.demo ? node.id === memory.star.id
      : (node.authorizedMemory === true && node.memoryId === memory.id
        && node.replayManifestId === memory.replayManifest.id))
  return nodes.find(node => node.id === hint && valid(node))
    ?? nodes.find(node => (node.id === memory.star.id || node.memoryId === memory.id) && valid(node))
    ?? null
}

export function eligibleFocusNeighbors(nodes: readonly LifeMapNode[], selected: LifeMapNode | null, memory: SelectedMemory | null): LifeMapNode[] {
  if (!selected || !memory || memory.privacy === 'hidden') return []
  return nodes.filter(node => node.id !== selected.id && !node.locked && node.privacyLevel !== 'hidden'
    && (memory.demo ? node.replayAvailable === true : (node.type === 'memory' && node.authorizedMemory === true && !!node.memoryId && !!node.replayManifestId)))
    .sort((a, b) => {
      const dist = (node: LifeMapNode) => node.position.reduce((n, value, i) => n + (value - selected.position[i]) ** 2, 0)
      return dist(a) - dist(b) || a.id.localeCompare(b.id)
    }).slice(0, 6)
}

export function focusNeighborHref(node: LifeMapNode, demo: boolean): string | null {
  if (node.locked || node.privacyLevel === 'hidden') return null
  const params = new URLSearchParams({ node: node.id, from: 'focus-neighbor' })
  if (demo) {
    if (node.replayAvailable !== true) return null
    params.set('demo', '1')
    params.set('memoryId', node.id)
  } else {
    if (node.type !== 'memory' || node.authorizedMemory !== true || !node.memoryId || !node.replayManifestId) return null
    params.set('memoryId', node.memoryId)
    params.set('manifestId', node.replayManifestId)
  }
  return `/focus?${params}`
}

/**
 * A URL node label is not memory authority. Preserve the exact neighboring
 * star across Focus -> Replay only after currentFocusNode verified the owner-
 * scoped selected memory and manifest. The caller independently checks both
 * memoryId and replayManifestId against the current SelectedMemory.
 */
export function isAuthorizedFocusNeighborReturn(
  nodeHint: string | null,
  origin: string | null,
  selected: Pick<LifeMapNode, 'id'> | null,
): boolean {
  // Replay -> Focus drops the original `from` marker. The visual node may
  // still be preserved only when it matches the currently verified selection.
  return (origin === 'focus-neighbor' || origin === null) && Boolean(nodeHint && selected?.id === nodeHint)
}
