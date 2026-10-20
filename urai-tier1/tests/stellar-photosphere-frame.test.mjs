import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import test from 'node:test'
import vm from 'node:vm'

const require = createRequire(import.meta.url)
const ts = require('typescript')
const THREE = require('three')
const sourceUrl = new URL('../src/spatial/stellar/StellarPhotosphere.tsx', import.meta.url)
const compiled = ts.transpileModule(readFileSync(sourceUrl, 'utf8'), {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    jsx: ts.JsxEmit.ReactJSX,
    target: ts.ScriptTarget.ES2022,
    esModuleInterop: true,
  },
}).outputText

/** Exercise the real component callback and Three uniforms without a GPU.
 * Passive effects deliberately stay pending so selection safety cannot depend
 * on their timing. Texture request/cleanup behavior has separate loader tests. */
function createFrameHarness() {
  let visibleMemory = { texture: null, aspect: 1, state: 'absent' }
  let memoIndex = 0
  let frameCallback
  const memos = []
  const dataset = {}
  const react = {
    useMemo(factory, dependencies) {
      const index = memoIndex++
      const previous = memos[index]
      if (previous && dependencies.length === previous.dependencies.length
        && dependencies.every((dependency, position) => Object.is(dependency, previous.dependencies[position]))) {
        return previous.value
      }
      const value = factory()
      memos[index] = { value, dependencies }
      return value
    },
    useEffect() {},
  }
  const mockedModules = {
    react,
    three: THREE,
    '@react-three/fiber': { useFrame(callback) { frameCallback = callback } },
    './StellarCorona': { __esModule: true, default: () => null },
    './stellarMemoryReveal': {
      STELLAR_MEMORY_UNIFORMS: '',
      STELLAR_MEMORY_REVEAL: '',
      useStellarMemoryTexture: () => visibleMemory,
    },
  }
  const module = { exports: {} }
  vm.runInNewContext(compiled, {
    module,
    exports: module.exports,
    require: name => mockedModules[name] ?? require(name),
  }, { filename: sourceUrl.pathname })

  return {
    dataset,
    render(memory, { url = null, reducedMotion = false } = {}) {
      visibleMemory = memory
      memoIndex = 0
      module.exports.default({
        accent: '#ffd36c',
        light: '#ffe9b5',
        quality: 'low',
        memoryImageUrl: url,
        reducedMotion,
      })
    },
    draw(delta) {
      frameCallback({ gl: { domElement: { dataset } } }, delta)
      return memos.find(memo => memo.value instanceof THREE.ShaderMaterial).value
    },
    dispose() {
      for (const memo of memos) memo.value?.dispose?.()
    },
  }
}

test('the draw callback clears the previous selected texture while passive effects remain pending', t => {
  const harness = createFrameHarness()
  const first = new THREE.Texture()
  const second = new THREE.Texture()
  t.after(() => { harness.dispose(); first.dispose(); second.dispose() })

  harness.render({ texture: first, aspect: 2, state: 'ready' }, { url: '/synthetic/first', reducedMotion: true })
  const material = harness.draw(.2)
  assert.equal(material.uniforms.uMemoryTexture.value, first)
  assert.equal(material.uniforms.uMemoryReady.value, 1)

  // The real loader qualifies a new URL synchronously as loading with no texture.
  harness.render({ texture: null, aspect: 1, state: 'loading' }, { url: '/synthetic/second', reducedMotion: true })
  assert.equal(harness.draw(.2), material, 'selection changes retain the shader material')
  assert.ok(material.uniforms.uMemoryTexture.value instanceof THREE.DataTexture)
  assert.equal(material.uniforms.uMemoryReady.value, 0)
  assert.equal(harness.dataset.focusMemoryReveal, '0.000')

  harness.render({ texture: second, aspect: .5, state: 'ready' }, { url: '/synthetic/second', reducedMotion: true })
  harness.draw(.2)
  assert.equal(material.uniforms.uMemoryTexture.value, second)
  assert.equal(material.uniforms.uMemoryAspect.value, .5)
  assert.equal(material.uniforms.uMemoryReady.value, 1)

  for (const state of ['unavailable', 'absent']) {
    harness.render({ texture: null, aspect: 1, state }, { reducedMotion: true })
    harness.draw(.2)
    assert.ok(material.uniforms.uMemoryTexture.value instanceof THREE.DataTexture)
    assert.equal(material.uniforms.uMemoryReady.value, 0)
  }
})

test('the draw callback settles a memory reveal within two seconds at five frames per second', t => {
  const harness = createFrameHarness()
  const texture = new THREE.Texture()
  t.after(() => { harness.dispose(); texture.dispose() })
  harness.render({ texture, aspect: 1, state: 'ready' }, { url: '/synthetic/slow-renderer' })
  let material
  for (let frame = 0; frame < 7; frame++) material = harness.draw(.2)

  assert.ok(material.uniforms.uReveal.value >= .98, 'the reveal reaches the settled threshold after 1.4 seconds')
  assert.ok(material.uniforms.uReveal.value <= 1)
  assert.equal(harness.dataset.focusMemoryReveal, material.uniforms.uReveal.value.toFixed(3))
  assert.ok(Math.abs(material.uniforms.uTime.value - .35) < 1e-9, 'surface evolution retains its shorter frame cap')

  harness.draw(10)
  assert.ok(Math.abs(material.uniforms.uTime.value - .4) < 1e-9, 'a long pause cannot surge the stellar phase')
  assert.ok(material.uniforms.uReveal.value <= 1)
  assert.deepEqual(Object.keys(harness.dataset), ['focusMemoryReveal'])
  assert.match(harness.dataset.focusMemoryReveal, /^\d\.\d{3}$/)
})

test('reduced motion freezes the stellar phase and reveals the selected memory immediately', t => {
  const harness = createFrameHarness()
  const texture = new THREE.Texture()
  t.after(() => { harness.dispose(); texture.dispose() })
  const ready = { texture, aspect: 1, state: 'ready' }
  harness.render(ready, { url: '/synthetic/calmer' })
  harness.draw(.2)
  const material = harness.draw(.2)
  const phase = material.uniforms.uTime.value

  harness.render(ready, { url: '/synthetic/calmer', reducedMotion: true })
  assert.equal(harness.draw(10), material)
  assert.equal(material.uniforms.uTime.value, phase)
  assert.equal(material.uniforms.uReveal.value, 1)
  assert.equal(harness.dataset.focusMemoryReveal, '1.000')

  harness.render(ready, { url: '/synthetic/calmer' })
  harness.draw(.2)
  assert.ok(Math.abs(material.uniforms.uTime.value - phase - .05) < 1e-9)
})
