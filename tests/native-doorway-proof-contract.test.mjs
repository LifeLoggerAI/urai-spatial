import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const proof = await readFile(new URL('./native-doorway-proof.mjs', import.meta.url), 'utf8')

test('keyboard doorway activation waits for Home readiness and uses visible browser-native focus', () => {
  assert.match(proof, /async function waitForHomeActionsReady/)
  assert.match(proof, /owner\.dataset\.homeAssetsReady !== 'true'/)
  assert.match(proof, /navigationDeadline = Date\.now\(\) \+ 20000/)
  assert.match(proof, /async function activate\(page, target, method\)[\s\S]*page\.keyboard\.press\('Tab'\)/)
  assert.match(proof, /node\.matches\(':focus-visible'\)/)
  assert.match(proof, /keyboard-focused destination does not visibly expose its focus state/)
  assert.match(proof, /page\.keyboard\.press\('Enter'\)/)
  assert.doesNotMatch(proof, /await target\.focus\(\)/)
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


test('doorway activation uses a single unchanged 20-second budget for readiness and route handoff', () => {
  assert.match(proof, /const navigationDeadline = Date\.now\(\) \+ 20000/)
  assert.match(proof, /waitForHomeActionsReady\(page, Math\.max\(1, navigationDeadline - Date\.now\(\)\)\)/)
  assert.match(proof, /timeout: Math\.max\(1, navigationDeadline - Date\.now\(\)\)/)
})
