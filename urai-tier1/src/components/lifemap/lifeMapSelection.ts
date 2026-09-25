export const LIFE_MAP_SELECTION_EVENT = 'urai:life-map-select-node'

export type LifeMapSelectionSource = 'semantic' | 'world-label' | 'world-object' | 'keyboard' | 'touch' | 'pointer'

export type LifeMapSelectionDetail = {
  nodeId: string
  source: LifeMapSelectionSource
}

let selectionRequestSerial = 0

export function requestLifeMapSelection(nodeId: string, source: LifeMapSelectionSource) {
  const detail = { nodeId, source }
  const requestSerial = ++selectionRequestSerial
  const dispatch = () => window.dispatchEvent(new CustomEvent<LifeMapSelectionDetail>(LIFE_MAP_SELECTION_EVENT, { detail }))
  dispatch()

  // The semantic navigator can become interactive before the suspended authored 3D
  // world has mounted its selection listener on software/reduced-motion paths. Keep
  // the event as the single state authority, but replay it exactly once only after
  // the real world is render-ready and still proves that the first delivery was lost.
  // A newer selection cancels an older pending replay so rapid keyboard navigation
  // can never resurrect stale identity.
  const startedAt = performance.now()
  let readyOverviewFrames = 0
  const verifyDelivery = () => {
    if (requestSerial !== selectionRequestSerial) return
    if (window.location.pathname.replace(/\/+$/, '') !== '/life-map') return

    const root = document.querySelector<HTMLElement>('[data-testid="urai-true-3d-life-map"]')
    if (root) {
      const mode = root.dataset.lifeMapMode
      const phase = root.dataset.lifeMapPhase
      if (mode === 'selected' || (phase && phase !== 'overview')) return

      if (root.dataset.lifeMapRenderReady === 'true') {
        readyOverviewFrames += 1
        if (readyOverviewFrames >= 2) {
          dispatch()
          return
        }
      } else {
        readyOverviewFrames = 0
      }
    }

    if (performance.now() - startedAt < 15_000) window.requestAnimationFrame(verifyDelivery)
  }

  window.requestAnimationFrame(verifyDelivery)
}

export function readLifeMapSelection(event: Event): LifeMapSelectionDetail | null {
  if (!(event instanceof CustomEvent)) return null
  const detail = event.detail as Partial<LifeMapSelectionDetail> | undefined
  if (!detail || typeof detail.nodeId !== 'string' || !detail.nodeId) return null
  if (typeof detail.source !== 'string') return null
  return { nodeId: detail.nodeId, source: detail.source as LifeMapSelectionSource }
}
