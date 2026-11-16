import assert from 'node:assert/strict'
import test from 'node:test'

import { inspectHomeCaption } from '../../scripts/lib/home-ui-readability.mjs'

const readableEvidence = (text = 'The Orb is here') => ({
  text,
  fontSize: 14,
  color: [255, 255, 255, 1],
  background: [0, 0, 0, 1],
  opacity: 1,
  zIndex: 2,
  vignetteZIndex: 1,
  bounds: {left: 600, right: 840, top: 820, bottom: 870},
  viewport: {width: 1440, height: 900},
  lines: [{left: 620, right: 820, top: 830, bottom: 860, width: 200, height: 30}],
})

function fakePage({evidence = readableEvidence(), waitError = null} = {}) {
  const calls = {selector: null, waitOptions: null, evaluateOptions: null}
  const locator = {
    async waitFor(options) {
      calls.waitOptions = options
      if (waitError) throw waitError
    },
    async evaluate(_callback, argument, options) {
      assert.equal(argument, undefined)
      calls.evaluateOptions = options
      return structuredClone(evidence)
    },
  }
  return {
    calls,
    page: {
      locator(selector) {
        calls.selector = selector
        return locator
      },
    },
  }
}

test('caption inspection waits visibly and evaluates with explicit bounded timeouts', async () => {
  const {page, calls} = fakePage()
  const result = await inspectHomeCaption(page)

  assert.equal(result.passed, true)
  assert.equal(calls.selector, '.home-world-context')
  assert.deepEqual(calls.waitOptions, {state:'visible', timeout:90_000})
  assert.deepEqual(calls.evaluateOptions, {timeout:90_000})
})

test('caption inspection rejects missing and display-none captions', async () => {
  for (const message of ['caption missing', 'caption hidden']) {
    const {page} = fakePage({waitError: new Error(message)})
    await assert.rejects(inspectHomeCaption(page), new RegExp(message))
  }
})

test('caption inspection cannot pass empty text', async () => {
  for (const text of ['', '   \n\t']) {
    const {page} = fakePage({evidence: readableEvidence(text)})
    assert.equal((await inspectHomeCaption(page)).passed, false)
  }
})

test('caption inspection retains the readability thresholds', async () => {
  const mutations = [
    {fontSize: 11.9},
    {opacity: 0.98},
    {color: [110, 110, 110, 1]},
    {zIndex: 1},
    {lines: []},
    {bounds: {left: -1, right: 840, top: 820, bottom: 870}},
  ]
  for (const mutation of mutations) {
    const {page} = fakePage({evidence: {...readableEvidence(), ...mutation}})
    assert.equal((await inspectHomeCaption(page)).passed, false)
  }
})
