import test from 'node:test'
import assert from 'node:assert/strict'
import { minimumCssContrast } from '../scripts/lib/home-ui-readability.mjs'
test('WCAG linear luminance has black-white ratio21 and equal-color ratio1',()=> {
  assert.equal(minimumCssContrast([255,255,255,1],[0,0,0,1]),21)
  assert.equal(minimumCssContrast([42,42,42,1],[42,42,42,1]),1)
})
test('sRGB transfer distinguishes the known near-threshold gray from white',()=> {
  const ratio = minimumCssContrast([119,119,119,1],[255,255,255,1])
  assert.ok(ratio > 4.47 && ratio < 4.49)
})
test('transparent text remains unreadable on either world extreme',()=> {
  assert.equal(minimumCssContrast([255,255,255,0],[9,21,17,.92]),1)
})
test('translucent original caption palette cannot prove minimum4.5 across variableworld',()=> {
  assert.ok(minimumCssContrast([246,249,247,.76],[9,21,17,.2]) < 4.5)
})
test('opaque light text on bounded sanctuary backing survives bothworld extremes',()=> {
  assert.ok(minimumCssContrast([246,249,247,1],[9,21,17,.92]) >= 4.5)
})

