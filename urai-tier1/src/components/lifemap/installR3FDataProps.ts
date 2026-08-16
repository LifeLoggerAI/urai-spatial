import * as THREE from 'three'

const values = new WeakMap<THREE.Object3D, Record<string, unknown>>()
const prototype = THREE.Object3D.prototype as THREE.Object3D & { data?: Record<string, unknown> }

if (!Object.getOwnPropertyDescriptor(prototype, 'data')) {
  Object.defineProperty(prototype, 'data', {
    configurable: true,
    get(this: THREE.Object3D) {
      let value = values.get(this)
      if (!value) {
        value = {}
        values.set(this, value)
      }
      return value
    },
    set(this: THREE.Object3D, value: Record<string, unknown> | undefined) {
      values.set(this, value && typeof value === 'object' ? value : {})
    },
  })
}

type ProofState = {
  objects: number
  anchors: number
  calls: number
  contextLost: boolean
}

const proofStates = new WeakMap<HTMLElement, ProofState>()
const instrumentedCanvases = new WeakSet<HTMLCanvasElement>()

function proofState(owner: HTMLElement) {
  let state = proofStates.get(owner)
  if (!state) {
    state = { objects: 0, anchors: 0, calls: 0, contextLost: false }
    proofStates.set(owner, state)
  }
  return state
}

function numeric(value: string | null | undefined) {
  const parsed = Number(value || 0)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0
}

function currentOwner(canvas: HTMLCanvasElement) {
  return canvas.closest<HTMLElement>('[data-testid="urai-true-3d-life-map"]')
}

function resetProof(owner: HTMLElement, contextLost: boolean) {
  const state = proofState(owner)
  state.objects = 0
  state.anchors = 0
  state.calls = 0
  state.contextLost = contextLost
}

function bindContextLifecycle(owner: HTMLElement) {
  const canvas = owner.querySelector('canvas')
  if (!(canvas instanceof HTMLCanvasElement) || instrumentedCanvases.has(canvas)) return
  instrumentedCanvases.add(canvas)
  canvas.addEventListener('webglcontextlost', () => {
    const liveOwner = currentOwner(canvas)
    if (liveOwner) resetProof(liveOwner, true)
  })
  canvas.addEventListener('webglcontextrestored', () => {
    const liveOwner = currentOwner(canvas)
    if (liveOwner) resetProof(liveOwner, false)
  })
}

function rememberMutation(owner: HTMLElement, mutation: MutationRecord) {
  const state = proofState(owner)
  const current = mutation.attributeName ? numeric(owner.getAttribute(mutation.attributeName)) : 0
  const previous = numeric(mutation.oldValue)
  const observed = Math.max(current, previous)
  if (mutation.attributeName === 'data-life-map-visible-objects') state.objects = Math.max(state.objects, observed)
  if (mutation.attributeName === 'data-life-map-visible-anchors') state.anchors = Math.max(state.anchors, observed)
  if (mutation.attributeName === 'data-life-map-render-calls') state.calls = Math.max(state.calls, observed)
}

function restoreOnlyStaleRegression(owner: HTMLElement) {
  const state = proofState(owner)
  bindContextLifecycle(owner)
  if (state.contextLost) return

  const currentObjects = numeric(owner.dataset.lifeMapVisibleObjects)
  const currentAnchors = numeric(owner.dataset.lifeMapVisibleAnchors)
  const currentCalls = numeric(owner.dataset.lifeMapRenderCalls)

  if (state.objects > currentObjects) owner.dataset.lifeMapVisibleObjects = String(state.objects)
  if (state.anchors > currentAnchors) owner.dataset.lifeMapVisibleAnchors = String(state.anchors)
  if (state.calls > currentCalls) owner.dataset.lifeMapRenderCalls = String(state.calls)

  if (state.calls > 0 && state.objects > 20 && state.anchors >= 8 && owner.dataset.lifeMapRenderReady !== 'true') {
    owner.dataset.lifeMapRenderReady = 'true'
  }
}

if (typeof window !== 'undefined') {
  const observe = () => {
    if (!document.documentElement) return
    const observer = new MutationObserver((records) => {
      const touchedOwners = new Set<HTMLElement>()
      for (const mutation of records) {
        if (!(mutation.target instanceof HTMLElement)) continue
        const owner = mutation.target.matches('[data-testid="urai-true-3d-life-map"]')
          ? mutation.target
          : mutation.target.closest<HTMLElement>('[data-testid="urai-true-3d-life-map"]')
        if (!owner) continue
        rememberMutation(owner, mutation)
        touchedOwners.add(owner)
      }
      for (const owner of touchedOwners) restoreOnlyStaleRegression(owner)
    })
    observer.observe(document.documentElement, {
      attributes: true,
      attributeOldValue: true,
      subtree: true,
      attributeFilter: [
        'data-life-map-visible-objects',
        'data-life-map-visible-anchors',
        'data-life-map-render-calls',
        'data-life-map-render-ready',
      ],
    })
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', observe, { once: true })
  else observe()
}
