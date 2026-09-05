import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const proof = await readFile(new URL('./native-doorway-proof.mjs', import.meta.url), 'utf8')

test('doorway activation waits for canonical rendered Home and input readiness', () => {
  assert.match(proof, /async function waitForHomeInputReady\(page\)/)
  assert.match(proof, /data-home-primary-owner=\\?"asset-driven\\?"/)
  assert.match(proof, /data-home-assets-ready/)
  assert.match(proof, /data-home-input-ready/)
  assert.match(proof, /await waitForHomeInputReady\(page\)/)
  assert.match(proof, /canonicalHomeReadinessRequiredBeforeActivation: true/)
  assert.doesNotMatch(proof, /waitForTimeout\(/)
})

test('keyboard doorway activation bypasses moving-target geometric stability', () => {
  assert.match(proof, /await target\.focus\(\)/)
  assert.match(proof, /target\.press\('Enter'\)/)
  assert.match(proof, /node === document\.activeElement/)
  assert.doesNotMatch(proof, /page\.keyboard\.press\('Enter'\)/)
})

test('pointer and touch use deterministic browser scrolling before hit proof', () => {
  assert.match(proof, /node\.scrollIntoView\(\{ block: 'nearest', inline: 'nearest', behavior: 'auto' \}\)/)
  assert.match(proof, /requestAnimationFrame\(resolve\)/)
  assert.match(proof, /semantic target geometry is still moving/)
})

test('pointer and touch retain real browser-coordinate hit ownership', () => {
  assert.match(proof, /page\.mouse\.click\(hitPoint\.center\.x, hitPoint\.center\.y\)/)
  assert.match(proof, /page\.touchscreen\.tap\(hitPoint\.center\.x, hitPoint\.center\.y\)/)
  assert.match(proof, /targetOwnsHitPoint/)
  assert.match(proof, /box\.width < 44 \|\| box\.height < 44/)
})
