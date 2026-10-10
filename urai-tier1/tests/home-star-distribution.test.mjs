import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const source = fs.readFileSync(new URL('../src/spatial/layout/HomeSanctuaryMaterials.tsx', import.meta.url), 'utf8')
const expression = source.match(/float homeStarThreshold\(float stellarWeight\)\s*\{\s*return ([^;]+);\s*\}/)?.[1]
const bandExpression = source.match(/float stellarBand=([^;]+);/)?.[1]
const weightExpression = source.match(/float stellarWeight=([^;]+);/)?.[1]
assert.ok(expression && bandExpression && weightExpression, 'extract actual density shader expressions')
const clamp = (value, low, high) => Math.max(low, Math.min(high, value))
const mix = (a, b, amount) => a * (1 - amount) + b * amount
const threshold = new Function('stellarWeight', 'mix', 'clamp', `return ${expression}`)
const band = new Function('dir', `return ${bandExpression.replaceAll('exp(', 'Math.exp(').replaceAll('pow(', 'Math.pow(')}`)
const weight = new Function('stellarBand', 'broad', `return ${weightExpression}`)
const density = value => {
  let stars = 0
  for (let seed = 0; seed < 10000; seed++) if ((seed + .5) / 10000 >= threshold(value, mix, clamp)) stars++
  return stars / 10000
}

test('actual static shader yields bounded finite density and localized band grouping', () => {
  const quiet = density(0), peak = density(1)
  assert.ok(quiet > 0 && peak < .02, 'quiet sparse sky with bounded peak occupancy')
  assert.ok(peak / quiet >= 1.5 && peak / quiet <= 2, 'modest density increase within band')
  for (let x = -1; x <= 1; x += .1) {
    const centerY = .28 + x * .18
    const center = band({ x, y: centerY }), outside = band({ x, y: centerY + .6 })
    assert.ok(center > outside)
    let previous = quiet
    for (let broad = 0; broad <= 1; broad += .05) {
      const grouped = density(weight(center, broad)), ungrouped = density(weight(outside, broad))
      assert.ok(Number.isFinite(grouped) && Number.isFinite(ungrouped))
      assert.ok(grouped >= previous && grouped <= peak)
      assert.ok(grouped > ungrouped)
      assert.ok(Math.abs(ungrouped - quiet) <= .0001, 'off-band density remains quiet')
      previous = grouped
    }
  }
  for (const value of [-2, 0, .5, 1, 3]) assert.ok(Number.isFinite(threshold(value, mix, clamp)))
  assert.equal(threshold(-2, mix, clamp), threshold(0, mix, clamp))
  assert.equal(threshold(3, mix, clamp), threshold(1, mix, clamp))
})
