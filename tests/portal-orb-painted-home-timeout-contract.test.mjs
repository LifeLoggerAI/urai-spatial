import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const proof = await readFile(new URL('../scripts/capture-natural-home-orb-proof.mjs', import.meta.url), 'utf8')

test('painted Home canvas probes retain a bounded starvation budget', () => {
  assert.match(proof, /const paintedHomeEvaluationTimeout = 90_000/)

  const canvasEvaluations = proof.match(/worldCanvas\.evaluate\([^\n]+\)/g) || []
  assert.equal(canvasEvaluations.length, 2)
  for (const evaluation of canvasEvaluations) {
    assert.match(evaluation, /inspectHomeOrbCanvasSamples, CANVAS_EVIDENCE_SAMPLE_POINTS, \{ timeout: paintedHomeEvaluationTimeout \}/)
  }
})

test('painted Home proof keeps strict before-and-after sample acceptance', () => {
  assert.match(proof, /if \(!record\.canvasSamplingBefore\.accepted\) throw new Error/)
  assert.match(proof, /!record\.canvasSamplingAfter\.accepted \|\| JSON\.stringify\(record\.canvasSamplingAfter\) !== JSON\.stringify\(record\.canvasSamplingBefore\)/)
  assert.match(proof, /record\.canvasCapture\?\.canvasTopmostAtSamplePoints === true/)
  assert.match(proof, /record\.canvasCapture\?\.canvasTopmostAfterCapture === true/)
})
