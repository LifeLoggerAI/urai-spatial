import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { stripTypeScriptTypes } from 'node:module'
import vm from 'node:vm'
import test from 'node:test'

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8')
const shared = read('../src/spatial/runtime/probeWebGLSupport.ts')
const realm = read('../src/spatial/realms/SpatialRealmRuntime.tsx')

function run(source, name, document) {
  const js = stripTypeScriptTypes(source).replace('export function', 'function')
  return vm.runInNewContext(`${js}\n${name}()`, { document })
}

test('Shadow reaches capability=false when browser context creation throws', () => {
  const oldProbe = realm.match(/function detectWebGL\(\): boolean \{[\s\S]*?\n\}/)?.[0]
  const document = { createElement: () => ({ getContext() { throw new Error('GPU denied') } }) }
  if (oldProbe) assert.equal(run(oldProbe, 'detectWebGL', document), false)
  else {
    assert.match(realm, /setWebglAvailable\(probeWebGLSupport\(\)\)/)
    assert.equal(run(shared, 'probeWebGLSupport', document), false)
  }
})

test('server render and unsupported graphics remain unavailable', () => {
  assert.equal(run(shared, 'probeWebGLSupport', undefined), false)
  assert.equal(run(shared, 'probeWebGLSupport', { createElement: () => ({ getContext: () => null }) }), false)
})

for (const api of ['webgl2', 'webgl']) {
  test(`${api} capability probe releases its context on every repeated call`, () => {
    let allocated = 0
    let released = 0
    const canvases = []
    const document = { createElement() {
      const canvas = { width: 300, height: 150, getContext(kind) {
        if (kind !== api) return null
        allocated++
        return { getExtension(name) {
          assert.equal(name, 'WEBGL_lose_context')
          return { loseContext() { released++ } }
        } }
      } }
      canvases.push(canvas)
      return canvas
    } }
    for (let index = 0; index < 32; index++) assert.equal(run(shared, 'probeWebGLSupport', document), true)
    assert.equal(allocated, 32)
    assert.equal(released, allocated)
    assert.ok(canvases.every(canvas => canvas.width === 1 && canvas.height === 1))
  })
}

for (const getExtension of [() => null, () => { throw new Error('extension blocked') }, () => ({ loseContext() { throw new Error('cleanup blocked') } })]) {
  test('cleanup restrictions do not misreport supported graphics', () => {
    assert.equal(run(shared, 'probeWebGLSupport', { createElement: () => ({ getContext: () => ({ getExtension }) }) }), true)
  })
}
