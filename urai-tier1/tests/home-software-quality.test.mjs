import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
import vm from 'node:vm'
import ts from 'typescript'

const compiled = ts.transpileModule(fs.readFileSync(new URL('../src/spatial/performance/useAdaptiveSpatialQuality.ts', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText

function fixture({ reducedMotion = false, deterministic = { enabled: false } } = {}) {
  const state = []
  let stateIndex = 0, memo
  const exports = {}
  vm.runInNewContext(compiled, {
    exports,
    navigator: { deviceMemory: 16, hardwareConcurrency: 16, connection: { effectiveType: '4g', saveData: false } },
    document: { visibilityState: 'visible' },
    window: { matchMedia: query => ({ matches: query === '(prefers-reduced-motion: reduce)' && reducedMotion }) },
    require: name => {
      if (name === 'react') return {
        useState(initial) {
          const index = stateIndex++
          if (!(index in state)) state[index] = typeof initial === 'function' ? initial() : initial
          return [state[index], next => { state[index] = typeof next === 'function' ? next(state[index]) : next }]
        },
        useEffect() {},
        useMemo(calculate, dependencies) {
          if (!memo || dependencies.some((value, index) => !Object.is(value, memo.dependencies[index]))) {
            memo = { dependencies: [...dependencies], value: calculate() }
          }
          return memo.value
        },
      }
      if (name === '@/components/lifemap/lifeMapDeterministicTestMode') return { readLifeMapDeterministicTestConfig: () => deterministic }
      throw new Error(`Unexpected import: ${name}`)
    },
  })
  return softwareRenderer => {
    stateIndex = 0
    return exports.useAdaptiveSpatialQuality(softwareRenderer)
  }
}
const plain = value => JSON.parse(JSON.stringify(value))

test('hardware renderer keeps high quality on capable desktop hardware', () => {
  const profile = fixture()(false)
  assert.equal(profile.tier, 'high')
  assert.equal(profile.pixelRatioMax, 1.75)
  assert.equal(profile.shadows, true)
  assert.equal(profile.postprocessing, true)
  assert.equal(profile.preloadSecondaryWorlds, true)
  assert.equal(profile.reducedMotion, false)
})

test('software renderer selects the existing low profile without changing motion preference', () => {
  const profile = fixture()(true)
  const existingLow = fixture({ reducedMotion: true })(false)
  assert.equal(profile.tier, 'low')
  assert.equal(profile.reducedMotion, false)
  assert.deepEqual(plain(profile), { ...plain(existingLow), reducedMotion: false })
})

test('renderer changes recompute quality with unchanged hardware and motion hints', () => {
  const render = fixture()
  assert.equal(render(false).tier, 'high')
  assert.equal(render(true).tier, 'low')
  assert.equal(render(false).tier, 'high')
})

test('explicit deterministic high quality and DPR override software fallback', () => {
  const render = fixture({ deterministic: { enabled: true, quality: 'high', dpr: 2.25, freeze: true, reducedMotion: false } })
  const hardware = render(false)
  const software = render(true)
  assert.equal(software.tier, 'high')
  assert.equal(software.pixelRatioMax, 2.25)
  assert.equal(software.shadows, true)
  assert.equal(software.postprocessing, true)
  assert.equal(software.reducedMotion, true)
  assert.equal(software.documentVisible, true)
  assert.deepEqual(plain(software), plain(hardware))
})
