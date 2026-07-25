export const LIFE_MAP_SELECTION_EVENT = 'urai:life-map-select-node'

export type LifeMapSelectionSource = 'semantic' | 'world-label' | 'world-object' | 'keyboard' | 'touch' | 'pointer'

export type LifeMapSelectionDetail = {
  nodeId: string
  source: LifeMapSelectionSource
}

const SELECTION_RETRY_DELAYS_MS = [0, 60, 180] as const

function dispatchLifeMapSelection(detail: LifeMapSelectionDetail) {
  window.dispatchEvent(new CustomEvent<LifeMapSelectionDetail>(LIFE_MAP_SELECTION_EVENT, { detail }))
}

export function requestLifeMapSelection(nodeId: string, source: LifeMapSelectionSource) {
  const detail = { nodeId, source }
  dispatchLifeMapSelection(detail)
  for (const delay of SELECTION_RETRY_DELAYS_MS) {
    window.setTimeout(() => dispatchLifeMapSelection(detail), delay)
  }
}

export function readLifeMapSelection(event: Event): LifeMapSelectionDetail | null {
  if (!(event instanceof CustomEvent)) return null
  const detail = event.detail as Partial<LifeMapSelectionDetail> | undefined
  if (!detail || typeof detail.nodeId !== 'string' || !detail.nodeId) return null
  if (typeof detail.source !== 'string') return null
  return { nodeId: detail.nodeId, source: detail.source as LifeMapSelectionSource }
}
