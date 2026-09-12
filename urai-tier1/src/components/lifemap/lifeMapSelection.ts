export const LIFE_MAP_SELECTION_EVENT = 'urai:life-map-select-node'

export type LifeMapSelectionSource = 'semantic' | 'world-label' | 'world-object' | 'keyboard' | 'touch' | 'pointer'

export type LifeMapSelectionDetail = {
  nodeId: string
  source: LifeMapSelectionSource
}

function dispatchLifeMapSelection(detail: LifeMapSelectionDetail) {
  window.dispatchEvent(new CustomEvent<LifeMapSelectionDetail>(LIFE_MAP_SELECTION_EVENT, { detail }))
}

export function requestLifeMapSelection(nodeId: string, source: LifeMapSelectionSource) {
  const detail = { nodeId, source }
  dispatchLifeMapSelection(detail)

  // The semantic navigator is mounted outside the R3F Suspense boundary. On a cold or
  // reduced-motion load it can become keyboard-ready a frame before the production-world
  // listener mounts. Preserve the single canonical event authority, but make one bounded
  // redelivery only if the same selected URL identity is still stuck in a healthy overview.
  let frame = 0
  const redeliverIfMissed = () => {
    const root = document.querySelector<HTMLElement>('[data-testid="urai-true-3d-life-map"]')
    const route = new URLSearchParams(window.location.search)
    const routeNode = route.get('node') || route.get('memoryId')
    if (route.get('overview') === '1' || routeNode !== nodeId) return
    if (root?.dataset.lifeMapMode === 'selected') return
    const renderReady = root?.dataset.lifeMapRenderReady === 'true'
    const visibleAnchors = Number(root?.dataset.lifeMapVisibleAnchors || '0')
    if (root?.dataset.lifeMapPhase === 'overview' && renderReady && Number.isFinite(visibleAnchors) && visibleAnchors >= 8) {
      dispatchLifeMapSelection(detail)
      return
    }
    if (frame >= 180) return
    frame += 1
    window.requestAnimationFrame(redeliverIfMissed)
  }
  window.requestAnimationFrame(redeliverIfMissed)
}

export function readLifeMapSelection(event: Event): LifeMapSelectionDetail | null {
  if (!(event instanceof CustomEvent)) return null
  const detail = event.detail as Partial<LifeMapSelectionDetail> | undefined
  if (!detail || typeof detail.nodeId !== 'string' || !detail.nodeId) return null
  if (typeof detail.source !== 'string') return null
  return { nodeId: detail.nodeId, source: detail.source as LifeMapSelectionSource }
}
