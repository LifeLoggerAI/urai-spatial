import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import test from 'node:test'

const source = fs.readFileSync(new URL('../../scripts/run-continuous-spatial-proof-v22-natural.mjs', import.meta.url), 'utf8')
const predicate = source.slice(source.indexOf('function snapshotPasses('), source.indexOf('async function activateSemanticTargetWithNativeKeyboard'))
const capture = source.slice(source.indexOf('async function visualCapture('), source.indexOf('async function clickCanvasRatio('))
const desktop = { width: 1440, height: 900, isMobile: false }
const baseline = {
  visibleWorld: 'cinematic-lived-world-threshold', stableState: 'AVATAR_HOME_FIRST_PERSON',
  embodiedSelf: 'camera-only-first-person-home', presencePresentation: 'bodyless-first-person-home',
  movement: 'shared-keyboard-touch-walk-look-interact', cameraMode: 'home-first-person',
  groundEntry: 'physical-world-surface', lifeMapEntry: 'visible-sky-broad-interaction',
  portalSequence: 'idle', canvas: { width: 1440, height: 900 },
  homeMovementPadCount: 1, homeMovementPadVisible: false,
}
async function run(viewport, changes = {}) {
  const receipt = { captures: [], errors: [] }
  let closed = false
  let images = 0
  const context = vm.createContext({
    receipt,
    openPage: async () => ({ context: { close: async () => { closed = true } },
      page: { goto: async () => ({ status: () => 200 }) }, pageErrors: [] }),
    waitHome: async () => ({}), homeSnapshot: async () => ({ ...baseline, ...changes }),
    screenshot: async () => { images++; return { file: 'retained.png', bytes: 20000 } },
    url: () => 'http://test.invalid/home/',
  })
  vm.runInContext(`${predicate}\n${capture}\nthis.capture = visualCapture`, context)
  await context.capture({}, 'home', viewport, 'homeAssetReview=1')
  assert.equal(closed, true)
  return { receipt, images }
}
test('visual group executes presentation and settled predicates before accepting evidence', async () => {
  const { receipt, images } = await run(desktop)
  assert.equal(receipt.captures[0].passed, true)
  assert.equal(receipt.errors.length, 0)
  assert.equal(images, 2)
})
test('presentation mismatch fails closed and retains diagnostic receipt', async () => {
  const { receipt, images } = await run(desktop, { embodiedSelf: 'visible-player-body' })
  assert.equal(receipt.captures[0].passed, false)
  assert.match(receipt.errors[0].error, /baseline mismatch/)
  assert.equal(images, 0)
})
test('landscape touch devices retain touch classification through both proof phases', async () => {
  const { receipt } = await run({ width: 1024, height: 768, isMobile: true }, { homeMovementPadVisible: true })
  assert.equal(receipt.captures[0].passed, true)
})
test('missing movement controls cannot pass desktop or mobile evidence', async () => {
  for (const viewport of [desktop, { width: 390, height: 844, isMobile: true }]) {
    const { receipt } = await run(viewport, { homeMovementPadCount: 0 })
    assert.equal(receipt.captures[0].passed, false)
  }
})
