import assert from 'node:assert/strict'
import { test } from 'node:test'
import { homeTerrainHeight, makeHomeTerrainGapInfillGeometry, makeHomeTerrainGeometry } from '../src/spatial/layout/HomeSanctuaryGeometry.ts'

test('visual infill covers the 90 m domain with a lower-density recessed grid', () => {
  const infill = makeHomeTerrainGapInfillGeometry()
  const position = infill.getAttribute('position')
  assert.equal(position.count, 91 * 91)
  assert.equal(infill.index?.count, 90 * 90 * 6)
  assert.equal(infill.getAttribute('color').count, position.count)
  assert.equal(infill.getAttribute('uv').count, position.count)
  for (const vertex of [0, 90, 4095, position.count - 1]) {
    const x = position.getX(vertex)
    const z = position.getZ(vertex)
    assert.ok(x >= -45 && x <= 45 && z >= -45 && z <= 45)
    assert.ok(position.getY(vertex) <= homeTerrainHeight(x, z) - .06 + .00001)
  }
  // This corner already clears all of its neighboring terrain triangles.
  assert.ok(Math.abs(position.getY(position.count - 1) - homeTerrainHeight(45, 45) + .06) < .00001)
  infill.dispose()
})

test('infill triangle interiors stay below the detailed pond bank and courtyard', () => {
  const infill = makeHomeTerrainGapInfillGeometry()
  const detail = makeHomeTerrainGeometry()
  const coarse = infill.getAttribute('position')
  const fine = detail.getAttribute('position')
  const indices = infill.getIndex()
  const fineHeights = new Map()
  const samples = new Set()
  let maxDifference = -Infinity
  let location

  for (let vertex = 0; vertex < fine.count; vertex++) {
    fineHeights.set(`${fine.getX(vertex)},${fine.getZ(vertex)}`, fine.getY(vertex))
  }

  function sample(x, y, z) {
    const key = `${x},${z}`
    const reference = fineHeights.get(key)
    assert.notEqual(reference, undefined)
    samples.add(key)
    if (y - reference > maxDifference) {
      maxDifference = y - reference
      location = key
    }
  }

  // Each coarse triangle is four detailed triangles. Their vertices are the
  // coarse corners and edge midpoints, including the diagonal through a cell.
  for (let triangle = 0; triangle < indices.count; triangle += 3) {
    for (let edge = 0; edge < 3; edge++) {
      const a = indices.getX(triangle + edge)
      const b = indices.getX(triangle + (edge + 1) % 3)
      sample(coarse.getX(a), coarse.getY(a), coarse.getZ(a))
      sample(
        (coarse.getX(a) + coarse.getX(b)) / 2,
        (coarse.getY(a) + coarse.getY(b)) / 2,
        (coarse.getZ(a) + coarse.getZ(b)) / 2,
      )
    }
  }
  assert.equal(samples.size, fine.count)
  assert.ok(maxDifference <= -.06 + 1e-6, `highest infill at ${location}: ${maxDifference} m above detailed terrain`)
  infill.dispose()
  detail.dispose()
})
