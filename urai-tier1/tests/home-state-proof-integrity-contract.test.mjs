import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const proof = fs.readFileSync(path.resolve('..', 'scripts', 'capture-home-state-proof.mjs'), 'utf8')

test('Home retained-pixel Gold Master evidence is sourced from the WebGL canvas, not page overlays', () => {
  assert.match(proof, /home-proof-canvas-element-retained-png/)
  assert.match(proof, /const canvas = page\.locator\(canvasSelector\)\.first\(\)/)
  assert.match(proof, /const png = await canvas\.screenshot\(/)
  const evidenceStart = proof.indexOf('async function readVisualEvidence')
  const evidenceEnd = proof.indexOf('async function waitForVisualEvidence')
  assert.ok(evidenceStart >= 0 && evidenceEnd > evidenceStart)
  const evidenceBody = proof.slice(evidenceStart, evidenceEnd)
  assert.doesNotMatch(evidenceBody, /await page\.screenshot\(/)
})
