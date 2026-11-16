import assert from 'node:assert/strict'
import test from 'node:test'
import { applyHomeCC0MacroVariation, homeCC0MacroProgramKey } from '../src/spatial/layout/HomeCC0PhotoMacroVariation.mjs'

const shader = () => ({
  vertexShader: '#include <common>\nvoid main() { #include <begin_vertex> }',
  fragmentShader: '#include <common>\nvoid main() { #include <color_fragment> }',
})

test('photographic PBR macro color variation preserves original shader chunks', () => {
  const source = shader()
  applyHomeCC0MacroVariation(source)
  assert.match(source.vertexShader, /varying vec3 vHomeCC0Position/)
  assert.match(source.vertexShader, /modelMatrix \* homeCC0LocalPoint/)
  assert.match(source.vertexShader, /#ifdef USE_INSTANCING/)
  assert.match(source.fragmentShader, /diffuseColor\.rgb \*= homeCC0Light/)
  assert.match(source.fragmentShader, /#include <color_fragment>/)
  assert.doesNotMatch(source.fragmentShader, /roughnessFactor\s*=/)
  assert.doesNotMatch(source.fragmentShader, /normal\s*=/)
  assert.match(homeCC0MacroProgramKey(), /photo-macro-v1/)
})
test('terrain and paths share deterministic world-coordinate variation', () => {
  const a = shader(), b = shader()
  applyHomeCC0MacroVariation(a)
  applyHomeCC0MacroVariation(b)
  assert.deepEqual(a, b)
  assert.match(a.fragmentShader, /vHomeCC0Position\.xz \* 0\.18/)
  assert.match(a.fragmentShader, /vHomeCC0Position\.xz \* 0\.68/)
})
test('unknown Three shader contract fails closed', () => {
  assert.throws(() => applyHomeCC0MacroVariation(null))
  assert.throws(() => applyHomeCC0MacroVariation({ vertexShader: 'bad', fragmentShader: 'bad' }))
})
