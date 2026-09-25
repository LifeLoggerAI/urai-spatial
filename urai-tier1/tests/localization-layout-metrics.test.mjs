import assert from 'node:assert/strict'
import test from 'node:test'
import vm from 'node:vm'
import { readLocalizationLayoutMetrics } from '../../scripts/lib/localization-layout-metrics.mjs'

function metrics(clip) {
  class Element {
    textContent = 'Passport'
    getAttribute() { return null }
    getBoundingClientRect() { return { width: 2059, height: 17, left: 268465, right: 270524, top: 787, bottom: 804 } }
  }
  const root = { clientWidth: 390, scrollWidth: 390, clientHeight: 844, scrollHeight: 844 }
  return vm.runInNewContext(`(${readLocalizationLayoutMetrics.toString()})()`, {
    HTMLElement: Element,
    document: { documentElement: root, body: root, querySelectorAll: () => [new Element()] },
    getComputedStyle: () => ({ clip, display: 'block', visibility: 'visible', opacity: '1' }),
  })
}

test('a zero-area CSS clip stays nonvisual despite perspective-expanded bounds', () => {
  const result = metrics('rect(0px, 0px, 0px, 0px)')
  assert.equal(result.clippedInteractive.length, 0)
  assert.equal(result.undersizedVisibleInteractive.length, 0)
})

test('visible and nonempty-clipped offscreen controls still fail layout acceptance', () => {
  for (const clip of ['auto', 'rect(0px, 100px, 40px, 0px)']) {
    const result = metrics(clip)
    assert.equal(result.clippedInteractive.length, 1)
    assert.equal(result.undersizedVisibleInteractive.length, 1)
  }
})
