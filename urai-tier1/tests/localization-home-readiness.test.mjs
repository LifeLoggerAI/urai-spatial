import assert from 'node:assert/strict'
import test from 'node:test'
import vm from 'node:vm'
import { waitForLocalizationHomeScene } from '../../scripts/lib/localization-home-readiness.mjs'

test('renderer capability cannot release localization capture before suspended scene assets finish', async () => {
  let assetsReady = 'false'
  let releasePoll
  let capturedSelector
  const scene = { waitFor: async () => {} }
  const page = {
    locator: (selector) => { capturedSelector = selector; return { first: () => scene } },
    waitForFunction: async (predicate, selector, options) => {
      assert.ok(options.timeout > 0 && options.timeout <= 45_000)
      const read = () => vm.runInNewContext(`(${predicate.toString()})(selector)`, {
        selector,
        document: {
          querySelector: (requested) => requested === capturedSelector
            ? { getAttribute: (name) => name === 'data-home-assets-ready' ? assetsReady : name === 'data-webgl-ready' ? 'true' : null }
            : null,
        },
      })
      assert.equal(read(), false, 'renderer ready while assets suspend must remain blocked')
      await new Promise((resolve) => { releasePoll = () => { assert.equal(read(), true); resolve() } })
    },
  }
  let complete = false
  const result = waitForLocalizationHomeScene(page).then((value) => { complete = true; return value })
  await new Promise((resolve) => setImmediate(resolve))
  assert.equal(complete, false)
  assetsReady = 'true'
  releasePoll()
  assert.equal(await result, scene)
  assert.match(capturedSelector, /data-home-primary-owner="asset-driven"/)
})

test('missing asset readiness fails localization instead of accepting a loading screen', async () => {
  const timeout = new Error('scene assets did not become ready')
  const page = {
    locator: () => ({ first: () => ({ waitFor: async () => {} }) }),
    waitForFunction: async () => { throw timeout },
  }
  await assert.rejects(waitForLocalizationHomeScene(page), (error) => error === timeout)
})
