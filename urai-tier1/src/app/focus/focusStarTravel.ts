import type { LifeMapNode } from '../../components/lifemap/lifeMapData'
import type { LifeMapSourceMode } from '../../components/lifemap/useLifeMapEvents'
import type { SelectedMemory } from '../../spatial/memory/selectedMemoryContract'

export type FocusStarTravelTarget = { nodeId: string; href: string }
export type FocusStarTravel = {
  previous: FocusStarTravelTarget | null
  next: FocusStarTravelTarget | null
  position: number
  total: number
  currentNodeId: string | null
}

const EMPTY: FocusStarTravel = { previous: null, next: null, position: 0, total: 0, currentNodeId: null }
const SAFE_TOKEN = /^[A-Za-z0-9._:-]{1,120}$/

function safeToken(value: unknown): value is string {
  return typeof value === 'string' && SAFE_TOKEN.test(value)
}

/** Navigation candidates come ONLY from the current consent/owner-scoped Life Map hook.
 * This selector adds no memory authorization, and a later Focus selection is
 * independently rechecked by useSelectedMemory before it can be rendered. */
export function focusStarTravel(
  nodes: readonly LifeMapNode[],
  memory: SelectedMemory | null,
  sourceMode: LifeMapSourceMode,
  loading: boolean,
): FocusStarTravel {
  if (!memory || loading || memory.authorization !== 'owner') return EMPTY
  const disclosedDemo = memory.demo && sourceMode === 'explicit-demo'
  const ownerGranted = !memory.demo && memory.privacy !== 'hidden' && sourceMode === 'private'
  if (!disclosedDemo && !ownerGranted) return EMPTY

  const accepted: Array<FocusStarTravelTarget & { memoryId: string; manifestId: string | null }> = []
  const visited = new Set<string>()
  for (const node of nodes) {
    if (!safeToken(node.id) || node.locked || node.privacyLevel === 'hidden') continue
    // Replay and WorldTransitionController use canonical demo: IDs. Keep the
    // same identity on Focus steps so Escape returns to that exact star.
    const selectedId = disclosedDemo ? `demo:${node.id}` : node.memoryId
    if (!safeToken(selectedId) || visited.has(selectedId)) continue
    if (disclosedDemo) {
      if (!node.replayAvailable) continue
    } else {
      if (node.type !== 'memory' || node.authorizedMemory !== true
        || !safeToken(node.replayManifestId) || selectedId.startsWith('demo:')) continue
    }
    visited.add(selectedId)
    // Never carry owner, plan, movie, prior consent, or previous star query data.
    const next = new URLSearchParams()
    next.set('node', node.id)
    next.set('memoryId', selectedId)
    next.set('returnNode', node.id)
    next.set('from', 'focus-star-step')
    if (disclosedDemo) next.set('demo', '1')
    else next.set('manifestId', node.replayManifestId!)
    accepted.push({ nodeId: node.id, memoryId: selectedId,
      manifestId: disclosedDemo ? null : node.replayManifestId!, href: '/focus?' + next.toString() })
  }

  // A disappearing/revoked current star must not become a doorway into another.
  const current = accepted.findIndex(item => disclosedDemo
    ? item.nodeId === memory.star.id && memory.id === item.memoryId
    : item.memoryId === memory.id && item.manifestId === memory.replayManifest.id)
  if (current < 0) return EMPTY
  return {
    previous: current > 0 ? accepted[current - 1] : null,
    next: current < accepted.length - 1 ? accepted[current + 1] : null,
    position: current + 1,
    total: accepted.length,
    currentNodeId: accepted[current].nodeId,
  }
}

/** Keep the actual owner's selected constellation event when traveling through
 * Replay. Route-supplied node metadata is never memory access authority; a
 * Focus-to-Focus step additionally needs the consent-scoped Life Map match. */
export function focusReplayReturnNode(
  memory: SelectedMemory,
  incoming: URLSearchParams,
  verifiedFocusNodeId: string | null,
): string {
  const node = incoming.get('node')
  const sameMemory = incoming.get('memoryId') === memory.id
    && incoming.get('manifestId') === memory.replayManifest.id
  if (!sameMemory || !safeToken(node)) return memory.star.id
  const source = incoming.get('from')
  const originalSelection = (source === 'life-map' || source === 'life-map-semantic')
    && node === incoming.get('returnNode')
  const projectedSelection = node === `canonical-memory:${memory.id}`
  const authorizedStep = memory.authorization === 'owner'
    && source === 'focus-star-step' && node === incoming.get('returnNode')
    && node === verifiedFocusNodeId
  return originalSelection || projectedSelection || authorizedStep ? node : memory.star.id
}
