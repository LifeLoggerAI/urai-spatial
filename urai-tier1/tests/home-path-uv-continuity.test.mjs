import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import test from 'node:test'
import vm from 'node:vm'

// Execute actual authoring functions under minimal Three-compatible geometry
// fakes. SOURCE GEOMETRY TEST ONLY; not a GPU/photoreal/founder approval.
const require = createRequire(import.meta.url)
const ts = require('typescript')
const source = readFileSync(new URL('../src/spatial/layout/HomeSanctuaryGeometry.ts', import.meta.url), 'utf8')
const start = source.indexOf('export function makeHomeRibbonGeometry(')
const end = source.indexOf('export function makeHomeHorizonGeometry(', start)
assert.ok(start > 0 && end > start, 'Original Home path/patch functions required')
const compiled = ts.transpileModule(source.slice(start, end), {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
}).outputText

class Attribute {
  constructor(values, itemSize) { this.array = Float32Array.from(values); this.itemSize = itemSize; this.count = this.array.length / itemSize }
  getX(i) { return this.array[i * this.itemSize] }
  getY(i) { return this.array[i * this.itemSize + 1] }
  getZ(i) { return this.array[i * this.itemSize + 2] }
}
class Geometry {
  attributes = {}
  setAttribute(name, value) { this.attributes[name] = value; return this }
  setIndex(value) { this.index = [...value]; return this }
  computeVertexNormals() { this.normalsComputed = true }
}
const exports = {}
vm.runInNewContext(compiled, {
  exports,
  THREE: { BufferGeometry: Geometry, Float32BufferAttribute: Attribute },
  homeTerrainHeight(x, z) { return .12 * Math.sin(x / 6) - .04 * Math.cos(z / 8) },
  homeSeeded(segment, salt) { return ((segment * 13 + salt * 7) % 97) / 97 },
}, { timeout: 3000 })

function assertWorldMeterUV(geometry) {
  const position = geometry.attributes.position, uv = geometry.attributes.uv
  assert.ok(geometry.normalsComputed)
  assert.ok(uv, 'Texture maps require actual UV attributes, not constant samples')
  assert.equal(uv.itemSize, 2)
  assert.equal(uv.count, position.count)
  for (let i = 0; i < position.count; i++) {
    assert.ok(Number.isFinite(uv.getX(i)) && Number.isFinite(uv.getY(i)))
    assert.ok(Math.abs(uv.getX(i) - position.getX(i)) < .00001)
    assert.ok(Math.abs(uv.getY(i) - position.getZ(i)) < .00001)
  }
}

test('real Home ribbon geometry uses continuous world-meter UV coordinates', () => {
  const points = [[-6, 7], [-3, 4], [0, -2], [5, -9]]
  const mesh = exports.makeHomeRibbonGeometry(points, 1.1)
  assert.equal(mesh.attributes.position.count, points.length * 5)
  assert.equal(mesh.index.length, (points.length - 1) * 4 * 6)
  assertWorldMeterUV(mesh)
})

test('original Home terrain patches reuse the same physical XZ texture space', () => {
  for (const input of [[1.8, -6.2, 2, 1.4, 10], [-4, -1, .7, 2.1, 21]]) {
    const mesh = exports.makeHomePatchGeometry(...input, undefined, 12, 3)
    assert.equal(mesh.attributes.position.count, 37)
    assert.equal(mesh.index.length, 12 * 3 + 2 * 12 * 6)
    assertWorldMeterUV(mesh)
  }
})

test('UVs scale in meters rather than restarting/stretching at path segments', () => {
  const short = exports.makeHomeRibbonGeometry([[0, 0], [0, -2]], 1)
  const long = exports.makeHomeRibbonGeometry([[0, 0], [0, -25]], 1)
  assertWorldMeterUV(short)
  assertWorldMeterUV(long)
  assert.ok(Math.abs(long.attributes.uv.getY(5) - short.attributes.uv.getY(5)) > 20)
})
