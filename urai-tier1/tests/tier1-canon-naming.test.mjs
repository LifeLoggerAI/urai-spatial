import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const pageFile = fs.readFileSync(new URL('../src/app/life-map/page.tsx', import.meta.url), 'utf8')
const gateFile = fs.readFileSync(new URL('../src/spatial/components/world/LifeMapAscentGate.tsx', import.meta.url), 'utf8')

test('life-map route path and canonical naming are preserved', () => {
  assert.match(pageFile, /LifeMapAscentGate/)
  assert.match(gateFile, /TierOneExperience/)
  assert.match(gateFile, /mode="life-map"/)
  assert.doesNotMatch(pageFile, /mode="lifemap"/)
  assert.doesNotMatch(gateFile, /mode="lifemap"/)
})
