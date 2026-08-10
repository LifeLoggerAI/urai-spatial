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

type RenderSample = {
  sampledAt: number
  objects: number
  anchors: number
  calls: number
  triangles: number
}

type InstrumentedRendererPrototype = THREE.WebGLRenderer & {
  __uraiOriginalRender?: THREE.WebGLRenderer['render']
}

const renderSamples = new WeakMap<THREE.WebGLRenderer, RenderSample>()
const rendererPrototype = THREE.WebGLRenderer.prototype as InstrumentedRendererPrototype

if (!rendererPrototype.__uraiOriginalRender) {
  const originalRender = rendererPrototype.render
  Object.defineProperty(rendererPrototype, '__uraiOriginalRender', {
    configurable: false,
    enumerable: false,
    writable: false,
    value: originalRender,
  })

  rendererPrototype.render = function renderWithLifeMapProof(scene: THREE.Object3D, camera: THREE.Camera) {
    originalRender.call(this, scene as THREE.Scene, camera)
    if (typeof document === 'undefined') return

    const owner = document.querySelector<HTMLElement>('[data-testid="urai-true-3d-life-map"]')
    if (!owner || owner.querySelector('canvas') !== this.domElement) return

    const now = typeof performance !== 'undefined' ? performance.now() : Date.now()
    let sample = renderSamples.get(this)
    if (!sample || now - sample.sampledAt >= 100) {
      let objects = 0
      let anchors = 0
      scene.traverse((object) => {
        if (object.visible) objects += 1
        if (object.visible && object.name.startsWith('life-map-')) anchors += 1
      })
      sample = {
        sampledAt: now,
        objects,
        anchors,
        calls: this.info.render.calls,
        triangles: this.info.render.triangles,
      }
      renderSamples.set(this, sample)
    } else {
      sample = {
        ...sample,
        calls: this.info.render.calls,
        triangles: this.info.render.triangles,
      }
      renderSamples.set(this, sample)
    }

    owner.dataset.lifeMapRenderProofOwner = 'post-render-scene'
    owner.dataset.lifeMapRenderReady = sample.calls > 0 && sample.objects > 20 && sample.anchors >= 8 ? 'true' : 'false'
    owner.dataset.lifeMapVisibleObjects = String(sample.objects)
    owner.dataset.lifeMapVisibleAnchors = String(sample.anchors)
    owner.dataset.lifeMapRenderCalls = String(sample.calls)
    owner.dataset.lifeMapRenderTriangles = String(sample.triangles)
  }
}
