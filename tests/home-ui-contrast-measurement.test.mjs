import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { minimumCssContrast, inspectHomeCaption } from '../scripts/lib/home-ui-readability.mjs'
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

// Actual retained fe0 mobile record11646400427 reported these computed styles
// and contained line bounds while its caption remained beneath the z18 veil.
// The explicit DOM measurement port tests classification, not fresh rendering.
const retainedCaption = {
  text:'The Orb is here', fontSize:12, color:[246,249,247,1],
  background:[9,21,17,.92], opacity:1, zIndex:10, vignetteZIndex:18,
  bounds:{left:131.8515625,right:258.1484375,top:794.484375,bottom:828},
  viewport:{width:390,height:844},
  lines:[{left:144.6796875,right:245.3203125,top:803.84375,bottom:817.84375,width:100.640625,height:14}],
}
function measurementPort(evidence) {
  return {locator(selector) {
    assert.equal(selector,'.home-world-context')
    return {evaluate:async()=>structuredClone(evidence)}
  }}
}
test('actual caption inspector rejects native z10 beneath actual z18 despite good local contrast',async()=> {
  const result = await inspectHomeCaption(measurementPort(retainedCaption))
  assert.ok(result.minimumContrast > 14)
  assert.equal(result.passed,false)
})
test('caption at the veil layer remains unaccepted; it must be strictly above',async()=> {
  const result = await inspectHomeCaption(measurementPort({...retainedCaption,zIndex:18}))
  assert.equal(result.passed,false)
})
test('current contextual source layer clears the actual active Home composition override',async()=> {
  const source = fs.readFileSync(new URL('../urai-tier1/src/spatial/layout/HomeWorldProductionPolished.tsx',import.meta.url),'utf8')
  const composition = fs.readFileSync(new URL('../urai-tier1/src/app/home-provider-preview-composition.css',import.meta.url),'utf8')
  const contextLayer = Number(source.match(/home-world-context[^\n]+style=\{\{ zIndex:(\d+)/)?.[1])
  const veilLayer = Number(composition.match(/asset-driven"\]\s*::after\s*\{[^}]*z-index:\s*(\d+)/)?.[1])
  assert.equal(veilLayer,retainedCaption.vignetteZIndex)
  assert.ok(contextLayer > veilLayer)
  const result = await inspectHomeCaption(measurementPort({...retainedCaption,zIndex:contextLayer,vignetteZIndex:veilLayer}))
  assert.equal(result.passed,true)
})

