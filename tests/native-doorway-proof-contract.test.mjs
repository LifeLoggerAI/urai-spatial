import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const proof = await readFile(new URL('./native-doorway-proof.mjs', import.meta.url), 'utf8')

test('keyboard doorway activation uses the real focused control and page-level Enter dispatch', () => {
  assert.match(proof, /await target\.focus\(\)/)
  assert.match(proof, /node === document\.activeElement/)
  assert.match(proof, /await page\.keyboard\.press\('Enter'\)/)
  assert.match(proof, /expectedTestId/)
  assert.match(proof, /activeTestId/)
  assert.doesNotMatch(proof, /target\.press\('Enter'\)/)
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
