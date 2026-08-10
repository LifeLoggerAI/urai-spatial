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
  drawCalls: number
  contextLost: boolean
}

const proofStates = new WeakMap<HTMLElement, ProofState>()
const instrumentedCanvases = new WeakSet<HTMLCanvasElement>()
const restoringOwners = new WeakSet<HTMLElement>()

function proofState(owner: HTMLElement) {
  let state = proofStates.get(owner)
  if (!state) {
    state = { objects: 0, anchors: 0, drawCalls: 0, contextLost: false }
    proofStates.set(owner, state)
  }
  return state
}

function syncProof(owner: HTMLElement, state: ProofState) {
  if (restoringOwners.has(owner)) return
  restoringOwners.add(owner)
  owner.dataset.lifeMapRenderProofOwner = 'r3f-scene-plus-webgl-draws'
  owner.dataset.lifeMapVisibleObjects = String(state.objects)
  owner.dataset.lifeMapVisibleAnchors = String(state.anchors)
  owner.dataset.lifeMapRenderCalls = String(state.drawCalls)
  owner.dataset.lifeMapRenderReady = !state.contextLost && state.drawCalls > 0 && state.objects > 20 && state.anchors >= 8 ? 'true' : 'false'
  queueMicrotask(() => restoringOwners.delete(owner))
}

function bindContextLifecycle(canvas: HTMLCanvasElement, owner: HTMLElement) {
  if (instrumentedCanvases.has(canvas)) return
  instrumentedCanvases.add(canvas)
  canvas.addEventListener('webglcontextlost', () => {
    const state = proofState(owner)
    state.contextLost = true
    state.drawCalls = 0
    state.objects = 0
    state.anchors = 0
    syncProof(owner, state)
  })
  canvas.addEventListener('webglcontextrestored', () => {
    const state = proofState(owner)
    state.contextLost = false
    state.drawCalls = 0
    state.objects = 0
    state.anchors = 0
    syncProof(owner, state)
  })
}

function recordDraw(context: WebGLRenderingContext | WebGL2RenderingContext) {
  if (typeof document === 'undefined') return
  const canvas = context.canvas
  const owner = canvas.closest<HTMLElement>('[data-testid="urai-true-3d-life-map"]')
  if (!owner) return
  bindContextLifecycle(canvas, owner)
  const state = proofState(owner)
  if (state.contextLost) return
  state.drawCalls += 1
  syncProof(owner, state)
}

function wrapDrawMethod(prototypeObject: object | undefined, method: string) {
  if (!prototypeObject) return
  const record = prototypeObject as Record<string, unknown>
  const marker = `__urai_${method}`
  if (record[marker]) return
  const original = record[method]
  if (typeof original !== 'function') return
  Object.defineProperty(prototypeObject, marker, { value: true })
  Object.defineProperty(prototypeObject, method, {
    configurable: true,
    writable: true,
    value: function wrappedWebGLDraw(this: WebGLRenderingContext | WebGL2RenderingContext, ...args: unknown[]) {
      const result = (original as (...values: unknown[]) => unknown).apply(this, args)
      recordDraw(this)
      return result
    },
  })
}

if (typeof window !== 'undefined') {
  const webgl = window.WebGLRenderingContext?.prototype
  const webgl2 = window.WebGL2RenderingContext?.prototype
  for (const method of ['drawArrays', 'drawElements', 'drawArraysInstanced', 'drawElementsInstanced']) {
    wrapDrawMethod(webgl, method)
    wrapDrawMethod(webgl2, method)
  }

  const observe = () => {
    if (!document.documentElement) return
    const observer = new MutationObserver((records) => {
      for (const mutation of records) {
        if (!(mutation.target instanceof HTMLElement) || restoringOwners.has(mutation.target)) continue
        const owner = mutation.target.matches('[data-testid="urai-true-3d-life-map"]')
          ? mutation.target
          : mutation.target.closest<HTMLElement>('[data-testid="urai-true-3d-life-map"]')
        if (!owner) continue
        const state = proofState(owner)
        if (mutation.attributeName === 'data-life-map-visible-objects') {
          const value = Number(owner.dataset.lifeMapVisibleObjects || 0)
          if (Number.isFinite(value) && value > state.objects) state.objects = value
        }
        if (mutation.attributeName === 'data-life-map-visible-anchors') {
          const value = Number(owner.dataset.lifeMapVisibleAnchors || 0)
          if (Number.isFinite(value) && value > state.anchors) state.anchors = value
        }
        syncProof(owner, state)
      }
    })
    observer.observe(document.documentElement, {
      attributes: true,
      subtree: true,
      attributeFilter: ['data-life-map-visible-objects', 'data-life-map-visible-anchors'],
    })
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', observe, { once: true })
  else observe()
}
