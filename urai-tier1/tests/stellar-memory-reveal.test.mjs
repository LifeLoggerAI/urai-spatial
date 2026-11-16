import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import test from 'node:test'
import vm from 'node:vm'

const require = createRequire(import.meta.url)
const ts = require('typescript')
const THREE = require('three')
const source = readFileSync(new URL('../src/spatial/stellar/stellarMemoryReveal.ts', import.meta.url), 'utf8')
const compiled = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
}).outputText

function fixture() {
  const images = []
  const states = []
  const effects = []
  let stateIndex = 0
  let effectIndex = 0
  let pending = []
  class SyntheticImage {
    constructor() {
      this.onload = null
      this.onerror = null
      this.naturalWidth = 0
      this.naturalHeight = 0
      this.src = ''
      images.push(this)
    }
    removeAttribute(name) { if (name === 'src') this.src = '' }
    succeed(width = 1600, height = 900) {
      this.naturalWidth = width
      this.naturalHeight = height
      this.onload?.()
    }
    fail() { this.onerror?.({ message: 'synthetic source unavailable' }) }
  }
  const react = {
    useState(initial) {
      const slot = stateIndex++
      if (!(slot in states)) states[slot] = initial
      return [states[slot], value => { states[slot] = typeof value === 'function' ? value(states[slot]) : value }]
    },
    useEffect(callback, deps) {
      const slot = effectIndex++
      if (!effects[slot] || deps.some((value, index) => !Object.is(value, effects[slot].deps[index]))) {
        pending.push({ slot, callback, deps })
      }
    },
  }
  const exports = {}
  vm.runInNewContext(compiled, {
    exports, Image: SyntheticImage,
    require: name => {
      if (name === 'react') return react
      if (name === 'three') return THREE
      throw new Error('Unexpected test dependency')
    },
  })
  const render = (url, onState) => {
    stateIndex = 0
    effectIndex = 0
    pending = []
    return exports.useStellarMemoryTexture(url, onState)
  }
  const commit = () => {
    const work = pending
    pending = []
    for (const { slot, callback, deps } of work) {
      effects[slot]?.cleanup?.()
      effects[slot] = { deps, cleanup: callback() }
    }
  }
  const unmount = () => { for (const effect of effects) effect?.cleanup?.() }
  return { images, exports, render, commit, unmount }
}

test('portrait and landscape dimensions retain their native aspect and linear-color upload contract', () => {
  for (const [width, height] of [[1600, 900], [900, 1600], [1000, 1000]]) {
    const f = fixture()
    const changes = []
    const cancel = f.exports.loadStellarMemoryTexture('/demo/synthetic-memory.png', result => changes.push(result))
    assert.equal(changes[0].state, 'loading')
    assert.equal(changes[0].texture, null)
    f.images[0].succeed(width, height)
    const ready = changes.at(-1)
    assert.equal(ready.state, 'ready')
    assert.equal(ready.aspect, width / height)
    assert.equal(ready.texture.image, f.images[0])
    assert.equal(ready.texture.colorSpace, THREE.SRGBColorSpace)
    assert.equal(ready.texture.wrapS, THREE.ClampToEdgeWrapping)
    assert.equal(ready.texture.wrapT, THREE.ClampToEdgeWrapping)
    assert.ok(ready.texture.version > 0)
    assert.equal(f.images[0].crossOrigin, 'anonymous')
    assert.equal(f.images[0].referrerPolicy, 'no-referrer')
    cancel()
  }
})

test('changing selection hides the old texture before effect cleanup or the next image decode', () => {
  const f = fixture()
  const notifications = []
  const notify = state => notifications.push(state)
  assert.equal(f.render('/demo/first-memory.png', notify).state, 'loading')
  f.commit()
  f.images[0].succeed()
  const first = f.render('/demo/first-memory.png', notify)
  f.commit()
  assert.equal(first.state, 'ready')
  let disposed = 0
  first.texture.addEventListener('dispose', () => disposed++)
  const next = f.render('/demo/second-memory.png', notify)
  assert.equal(next.state, 'loading')
  assert.equal(next.texture, null)
  assert.equal(disposed, 0)
  f.commit()
  assert.equal(disposed, 1)
  assert.equal(f.images[0].src, '')
  assert.equal(notifications.at(-1), 'loading')
  f.images[1].succeed(900, 1600)
  const second = f.render('/demo/second-memory.png', notify)
  f.commit()
  assert.equal(second.state, 'ready')
  assert.equal(second.aspect, 900 / 1600)
  assert.notEqual(second.texture, first.texture)
  f.unmount()
})

test('queued completion and failure cannot publish after a request is canceled', () => {
  for (const phase of ['load', 'error']) {
    const f = fixture()
    const changes = []
    const cancel = f.exports.loadStellarMemoryTexture('/demo/stale-memory.png', result => changes.push(result))
    const image = f.images[0]
    image.naturalWidth = 1600
    image.naturalHeight = 900
    const late = phase === 'load' ? image.onload : image.onerror
    cancel()
    late()
    assert.deepEqual(changes.map(result => result.state), ['loading'])
    assert.equal(image.onload, null)
    assert.equal(image.onerror, null)
    assert.equal(image.src, '')
  }
})

test('unmount disposes the owned texture exactly once and drops its image source', () => {
  const f = fixture()
  const changes = []
  const cancel = f.exports.loadStellarMemoryTexture('/demo/owned-memory.png', result => changes.push(result))
  f.images[0].succeed()
  const texture = changes.at(-1).texture
  let disposed = 0
  texture.addEventListener('dispose', () => disposed++)
  cancel()
  cancel()
  assert.equal(disposed, 1)
  assert.equal(f.images[0].src, '')
})

test('failed or invalid image leaves an empty unavailable result without throwing or retaining a texture', () => {
  for (const kind of ['network', 'zero-width', 'zero-height', 'non-finite']) {
    const f = fixture()
    const changes = []
    const cancel = f.exports.loadStellarMemoryTexture('/demo/unavailable-memory.png', result => changes.push(result))
    if (kind === 'network') f.images[0].fail()
    if (kind === 'zero-width') f.images[0].succeed(0, 900)
    if (kind === 'zero-height') f.images[0].succeed(1600, 0)
    if (kind === 'non-finite') f.images[0].succeed(Infinity, 900)
    assert.equal(changes.at(-1).state, 'unavailable')
    assert.equal(changes.at(-1).texture, null)
    assert.equal(changes.at(-1).aspect, 1)
    cancel()
  }
})

test('withdrawing an image immediately produces absent, then releases the previous texture', () => {
  const f = fixture()
  const notifications = []
  const notify = state => notifications.push(state)
  f.render('/demo/withdrawn-memory.png', notify)
  f.commit()
  f.images[0].succeed()
  const ready = f.render('/demo/withdrawn-memory.png', notify)
  f.commit()
  let disposed = 0
  ready.texture.addEventListener('dispose', () => disposed++)
  const absent = f.render(null, notify)
  assert.equal(absent.state, 'absent')
  assert.equal(absent.texture, null)
  f.commit()
  assert.equal(disposed, 1)
  assert.equal(notifications.at(-1), 'absent')
  assert.equal(f.images.length, 1)
  f.unmount()
})

test('a late old selection resolution cannot report ready for the newly selected image', () => {
  const f = fixture()
  const notifications = []
  const notify = state => notifications.push(state)
  f.render('/demo/previous-memory.png', notify)
  f.commit()
  const oldImage = f.images[0]
  const queuedLoad = oldImage.onload
  oldImage.naturalWidth = 1600
  oldImage.naturalHeight = 900
  f.render('/demo/current-memory.png', notify)
  // Simulate an image event between the new render and passive effect cleanup.
  queuedLoad()
  assert.equal(f.render('/demo/current-memory.png', notify).texture, null)
  f.commit()
  assert.equal(notifications.includes('ready'), false)
  f.images[1].fail()
  assert.equal(f.render('/demo/current-memory.png', notify).state, 'unavailable')
  f.commit()
  assert.equal(notifications.at(-1), 'unavailable')
  f.unmount()
})

test('each mounted consumer owns an independent image and texture, without shared private cache', () => {
  const f = fixture()
  const results = []
  const stopFirst = f.exports.loadStellarMemoryTexture('/demo/shared-source.png', result => results.push(result))
  const stopSecond = f.exports.loadStellarMemoryTexture('/demo/shared-source.png', result => results.push(result))
  assert.equal(f.images.length, 2)
  f.images.forEach(image => image.succeed())
  const ready = results.filter(result => result.state === 'ready')
  assert.equal(ready.length, 2)
  assert.notEqual(ready[0].texture, ready[1].texture)
  stopFirst()
  assert.notEqual(f.images[1].src, '')
  stopSecond()
})
