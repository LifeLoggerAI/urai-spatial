import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const proof = fs.readFileSync(path.resolve('..', 'scripts', 'capture-natural-home-orb-proof.mjs'), 'utf8')

test('Portal and Orb retained-pixel signal is bound to the exact visible Home canvas', () => {
  assert.match(proof, /portal-orb-proof-canvas-element-retained-png/)
  assert.match(proof, /page\.locator\('\.urai-asset-home-world\[data-home-primary-owner="asset-driven"\] canvas'\)\.first\(\)/)
  assert.match(proof, /const \{ buffer, capture \} = await captureVisibleCanvasPng\(page, canvas\)/)
  assert.match(proof, /record\.screenshotBytes > 12000 && record\.luminanceRange >= 16 && record\.visibleSamples >= 5/)
  const start = proof.indexOf('async function imageEvidence')
  const end = proof.indexOf('for (const spec of cases)')
  assert.ok(start >= 0 && end > start)
  assert.doesNotMatch(proof.slice(start, end), /await page\.screenshot\(/)
  assert.doesNotMatch(proof.slice(start, end), /canvas\.screenshot\(/)
})
