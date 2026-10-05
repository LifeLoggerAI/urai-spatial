import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import test from 'node:test'
import ts from 'typescript'

const source = fs.readFileSync(new URL('../src/spatial/performance/useAdaptiveSpatialQuality.ts', import.meta.url), 'utf8')
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText

function render(browser) {
  const states = [], effects = [], updates = []
  const exports = {}
  vm.runInNewContext(code, {
    exports,
    require: () => ({
      useState(initial) {
        const index = states.length
        states.push(typeof initial === 'function' ? initial() : initial)
        return [states[index], value => { states[index] = value; updates.push([index, value]) }]
      },
      useEffect(effect) { effects.push(effect) },
      useMemo(factory) { return factory() },
    }),
    ...browser,
  })
  const profile = exports.useAdaptiveSpatialQuality()
  return { profile, states, effects, updates }
}

function device({ reduced = true, visible = false, saveData = true } = {}) {
  const listeners = new Map()
  const media = new Map()
  const target = name => ({
    addEventListener(event, callback) { listeners.set(`${name}:${event}:${callback.name}`, callback) },
    removeEventListener(event, callback) { listeners.delete(`${name}:${event}:${callback.name}`) },
  })
  return {
    listeners,
    media,
    window: { matchMedia(query) {
      if (!media.has(query)) media.set(query, { matches: query.includes('reduced-motion') ? reduced : false, ...target(query) })
      return media.get(query)
    } },
    navigator: { deviceMemory: 8, hardwareConcurrency: 8, connection: { saveData, effectiveType: '4g', ...target('connection') } },
    document: { visibilityState: visible ? 'visible' : 'hidden', ...target('document') },
  }
}

test('server and first client quality agree even for reduced motion and constrained devices', () => {
  const server = render({})
  const client = render(device())
  assert.deepEqual(JSON.parse(JSON.stringify(client.profile)), JSON.parse(JSON.stringify(server.profile)))
  assert.equal(client.profile.tier, 'medium')
})

test('mount reads actual preferences and subsequent device changes remain adaptive', () => {
  const browser = device()
  const result = render(browser)
  const cleanup = result.effects[0]()
  assert.deepEqual(result.states, [true, false, 'low'])
  browser.media.get('(prefers-reduced-motion: reduce)').matches = false
  browser.navigator.connection.saveData = false
  for (const callback of browser.listeners.values()) if (callback.name === 'updateMotion' || callback.name === 'updateTier') callback()
  assert.deepEqual(result.states, [false, false, 'high'])
  browser.document.visibilityState = 'visible'
  browser.listeners.get('document:visibilitychange:updateVisibility')()
  assert.deepEqual(result.states, [false, true, 'high'])
  cleanup()
  assert.equal(browser.listeners.size, 0)
})
