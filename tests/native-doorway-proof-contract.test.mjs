import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const proof = await readFile(new URL('./native-doorway-proof.mjs', import.meta.url), 'utf8')
const homeRuntime = await readFile(new URL('../urai-tier1/src/app/HomeSpatialRuntimeLayer.tsx', import.meta.url), 'utf8')

test('keyboard doorway activation proves focused target without injected page evaluation', () => {
  assert.match(proof, /await target\.focus\(\)/)
  assert.match(proof, /page\.locator\(':focus'\)\.getAttribute\('data-testid'\)/)
  assert.match(proof, /target\.press\('Enter'\)/)
  assert.doesNotMatch(proof, /page\.keyboard\.press\('Enter'\)/)
  assert.doesNotMatch(proof, /\.evaluate\(/)
})

test('pointer and touch use Playwright-native scrolling and stable browser geometry', () => {
  assert.match(proof, /target\.scrollIntoViewIfNeeded/)
  assert.match(proof, /const before = await target\.boundingBox\(\)/)
  assert.match(proof, /const after = await target\.boundingBox\(\)/)
  assert.match(proof, /semantic target geometry is still moving/)
  assert.doesNotMatch(proof, /requestAnimationFrame/)
})

test('pointer and touch retain real browser-coordinate hit ownership', () => {
  assert.match(proof, /target\.click\(\{ trial: true/)
  assert.match(proof, /target\.tap\(\{ trial: true/)
  assert.match(proof, /page\.mouse\.click\(hitPoint\.center\.x, hitPoint\.center\.y\)/)
  assert.match(proof, /page\.touchscreen\.tap\(hitPoint\.center\.x, hitPoint\.center\.y\)/)
  assert.match(proof, /targetOwnsHitPoint: true/)
  assert.match(proof, /box\.width < 44 \|\| box\.height < 44/)
})

test('semantic navigation stays statically opacity-bounded and runtime footprint-bounded', () => {
  assert.match(homeRuntime, /\.urai-home-spatial-runtime-layer>\.home-semantic-navigation\{[^}]*width:48px;[^}]*opacity:\.015\}/)
  assert.match(proof, /data-home-navigation-non-dominant/)
  assert.match(proof, /navBox\.width <= 64/)
  assert.match(proof, /navAreaRatio <= 0\.03/)
  assert.match(proof, /nonDominanceOpacitySourceContract: '\.015'/)
})
