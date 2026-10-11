import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import vm from 'node:vm'
import { CANVAS_EVIDENCE_SAMPLE_POINTS } from '../scripts/capture-visible-canvas-png.mjs'
import { inspectHomeOrbCanvasSamples } from '../scripts/home-orb-canvas-sampling.mjs'

const proof = await readFile(new URL('../scripts/capture-natural-home-orb-proof.mjs', import.meta.url), 'utf8')

test('painted Home canvas probes retain a bounded starvation budget', () => {
  assert.match(proof, /const paintedHomeEvaluationTimeout = 90_000/)

  assert.doesNotMatch(proof, /worldCanvas\.evaluate\(/)
  assert.doesNotMatch(proof, /worldCanvas\.count\(/)
  assert.match(proof, /page\.evaluate\(inspectHomeOrbCanvasSamples, \{\s+selector: worldCanvasSelector,\s+points: CANVAS_EVIDENCE_SAMPLE_POINTS/)
  assert.equal((proof.match(/await inspectCanvasSamplingFromPage\(page\)/g) || []).length, 2)
  assert.match(proof, /setTimeout\([^\n]+paintedHomeEvaluationTimeout\)/)
  assert.match(proof, /finally \{ clearTimeout\(timeout\) \}/)
})

const samplerSource = proof.slice(proof.indexOf('async function inspectCanvasSamplingFromPage(page)'), proof.indexOf('async function imageEvidence('))
const worldCanvasSelector = '.urai-asset-home-world[data-home-primary-owner="asset-driven"] canvas'
function runSampler(page, timeout = 90_000) {
  const run = vm.runInNewContext(`${samplerSource}\ninspectCanvasSamplingFromPage`, {
    inspectHomeOrbCanvasSamples, CANVAS_EVIDENCE_SAMPLE_POINTS, worldCanvasSelector,
    paintedHomeEvaluationTimeout: timeout, setTimeout, clearTimeout,
  })
  return run(page)
}

test('direct canvas sampler executes the unchanged twelve-point predicate without locator calls', async () => {
  class HTMLCanvasElement { getBoundingClientRect() { return { x: 0, y: 0, width: 320, height: 900 } } }
  const canvas = new HTMLCanvasElement()
  let reads = 0
  const result = await runSampler({
    locator() { throw new Error('Locator protocol must not run') },
    async evaluate(fn, input) {
      reads += 1
      return vm.runInNewContext(`(${fn.toString()})(input)`, {
        input,
        HTMLCanvasElement,
        document: {
          querySelectorAll(selector) { assert.equal(selector, worldCanvasSelector); return [canvas] },
          querySelector(selector) { assert.equal(selector, worldCanvasSelector); return canvas },
          elementFromPoint() { return canvas },
        },
      })
    },
  })
  assert.equal(reads, 2)
  assert.equal(result.accepted, true)
  assert.equal(result.originalSampleCount, 12)
  assert.equal(result.unobstructedSampleCount, 12)
  assert.deepEqual(JSON.parse(JSON.stringify(result.samplePoints)), CANVAS_EVIDENCE_SAMPLE_POINTS)
})

test('direct canvas sampler rejects missing or ambiguous canvas and preserves occlusion denial', async () => {
  class HTMLCanvasElement { getBoundingClientRect() { return { x: 0, y: 0, width: 320, height: 900 } } }
  const canvas = new HTMLCanvasElement()
  for (const matches of [[], [canvas, canvas], [{}]]) {
    await assert.rejects(runSampler({ evaluate: async (fn, input) => vm.runInNewContext(`(${fn.toString()})(input)`, {
      input, HTMLCanvasElement, document: { querySelectorAll: () => matches, querySelector: () => matches[0] },
    }) }), /exactly one (?:world )?canvas/)
  }
  const result = await runSampler({ evaluate: async (fn, input) => vm.runInNewContext(`(${fn.toString()})(input)`, {
    input, HTMLCanvasElement,
    document: { querySelectorAll: () => [canvas], querySelector: () => canvas, elementFromPoint: () => ({ tagName: 'DIV' }) },
  }) })
  assert.equal(result.accepted, false)
  assert.equal(result.blocked.length, 12)
})

test('direct canvas sampling still fails when its finite deadline expires', async () => {
  await assert.rejects(runSampler({ evaluate: () => new Promise(() => {}) }, 10), /bounded painted-home deadline/)
  await assert.rejects(runSampler({ evaluate: async (_fn, input) => typeof input === 'string' ? 1 : new Promise(() => {}) }, 10), /bounded painted-home deadline/)
})

test('natural Orb proof retains desktop mobile reduced motion and adds narrow touch coverage', () => {
  for (const marker of [
    "{ id: 'desktop', viewport: { width: 1440, height: 900 } }",
    "{ id: 'mobile', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }",
    "{ id: 'mobile-narrow', viewport: { width: 320, height: 900 }, isMobile: true, hasTouch: true }",
    "{ id: 'reduced-motion', viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' }",
  ]) assert.ok(proof.includes(marker), `missing viewport/motion case: ${marker}`)
})

test('painted Home proof keeps strict before-and-after sample acceptance', () => {
  assert.match(proof, /if \(!record\.canvasSamplingBefore\.accepted\) throw new Error/)
  assert.match(proof, /!record\.canvasSamplingAfter\.accepted \|\| JSON\.stringify\(record\.canvasSamplingAfter\) !== JSON\.stringify\(record\.canvasSamplingBefore\)/)
  assert.match(proof, /record\.canvasCapture\?\.canvasTopmostAtSamplePoints === true/)
  assert.match(proof, /record\.canvasCapture\?\.canvasTopmostAfterCapture === true/)
})
