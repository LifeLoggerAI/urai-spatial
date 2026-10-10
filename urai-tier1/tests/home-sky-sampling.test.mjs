import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
import vm from 'node:vm'

const source = fs.readFileSync(new URL('../src/spatial/layout/HomeSanctuaryMaterials.tsx', import.meta.url), 'utf8')
const fragment = source.match(/fragmentShader=\{`([\s\S]*?)`\.replace/)?.[1]
assert.ok(fragment, 'read the actual Home sky fragment shader')
const longitudeCells = Number(fragment.match(/vec2 cells=skyUv\*vec2\(([\d.]+),/)?.[1])
assert.ok(Number.isFinite(longitudeCells) && longitudeCells > 0)

// Execute the shader's scalar expressions, rather than duplicating the repair
// in a test helper. This verifies sampling math without claiming GPU evidence.
function correctedDerivative(axis, delta) {
  const variable = `cellD${axis}.x`
  const assignment = fragment.match(new RegExp(`cellD${axis}\\.x-=(.+?);`))?.[1]
  assert.ok(assignment, `shader corrects the ${axis} screen derivative`)
  return vm.runInNewContext(`${delta} - (${assignment.replaceAll(variable, 'delta')})`, { delta, floor: Math.floor })
}
function footprint(dx, dy) {
  const aaExpression = fragment.match(/float aa=(.+?);/)?.[1]
  assert.ok(aaExpression)
  const cellWidth = {
    x: Math.abs(correctedDerivative('x', dx.x)) + Math.abs(correctedDerivative('y', dy.x)),
    y: Math.abs(dx.y) + Math.abs(dy.y),
  }
  return vm.runInNewContext(aaExpression, { cellWidth, max: Math.max })
}
function longitudeCell(angle) {
  return (Math.atan2(Math.sin(angle), Math.cos(angle)) / (2 * Math.PI) + .5) * longitudeCells
}
function close(actual, expected) {
  assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} should equal ${expected}`)
}

test('star footprint crosses atan longitude seam without inflating support', () => {
  const pixelAngle = .001
  const ordinaryDelta = longitudeCell(pixelAngle / 2) - longitudeCell(-pixelAngle / 2)
  const seamDelta = longitudeCell(Math.PI + pixelAngle / 2) - longitudeCell(Math.PI - pixelAngle / 2)
  const reference = footprint({ x: ordinaryDelta, y: .04 }, { x: .02, y: .03 })
  // The old raw fwidth interpreted the coordinate wrap as almost an entire sky.
  assert.ok(Math.abs(seamDelta) > longitudeCells * .99)
  assert.ok(Math.abs(seamDelta) / Math.abs(ordinaryDelta) > 6000)
  for (const direction of [-1, 1]) {
    close(footprint({ x: seamDelta * direction, y: .04 }, { x: .02, y: .03 }), reference)
    close(footprint({ x: .02, y: .04 }, { x: seamDelta * direction, y: .03 }), reference)
  }
})

test('ordinary screen derivatives retain their star sampling footprint', () => {
  for (const delta of [-20, -1, -.0001, 0, .0001, 1, 20]) {
    for (const axis of ['x', 'y']) assert.equal(correctedDerivative(axis, delta), delta)
  }
  close(footprint({ x: -.1, y: .04 }, { x: .02, y: -.03 }), .12 * .65)
  close(footprint({ x: -.01, y: .4 }, { x: .02, y: -.3 }), .7 * .65)
})

test('latitude sampling stays finite at zenith and rounding beyond the pole', () => {
  const argument = fragment.match(/asin\((.*?)\)\/3\.14159265/)?.[1]
  assert.ok(argument, 'read the actual latitude sampling argument')
  const sample = y => Math.asin(vm.runInNewContext(argument, {
    dir: { y }, clamp: (value, min, max) => Math.min(max, Math.max(min, value)),
  }))
  for (const y of [-1 - Number.EPSILON, -1, 1, 1 + Number.EPSILON]) {
    const latitude = sample(y)
    assert.ok(Number.isFinite(latitude))
    close(latitude, Math.sign(y) * Math.PI / 2)
  }
  for (const y of [-.9, -.1, 0, .1, .9]) assert.equal(sample(y), Math.asin(y))
})
