export const LIFE_MAP_SELECTION_EVENT = 'urai:life-map-select-node'

export type LifeMapSelectionSource = 'semantic' | 'world-label' | 'world-object' | 'keyboard' | 'touch' | 'pointer'

export type LifeMapSelectionDetail = {
  nodeId: string
  source: LifeMapSelectionSource
}

export function requestLifeMapSelection(nodeId: string, source: LifeMapSelectionSource) {
  const detail = { nodeId, source }
  window.dispatchEvent(new CustomEvent<LifeMapSelectionDetail>(LIFE_MAP_SELECTION_EVENT, { detail }))
}

export function readLifeMapSelection(event: Event): LifeMapSelectionDetail | null {
  if (!(event instanceof CustomEvent)) return null
  const detail = event.detail as Partial<LifeMapSelectionDetail> | undefined
  if (!detail || typeof detail.nodeId !== 'string' || !detail.nodeId) return null
  if (typeof detail.source !== 'string') return null
  return { nodeId: detail.nodeId, source: detail.source as LifeMapSelectionSource }
}
