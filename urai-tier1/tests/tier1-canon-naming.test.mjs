import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const pageFile = fs.readFileSync(new URL('../src/app/life-map/page.tsx', import.meta.url), 'utf8')
const clientFile = fs.readFileSync(new URL('../src/app/life-map/LifeMapClient.tsx', import.meta.url), 'utf8')

test('life-map route path and canonical naming are preserved', () => {
  assert.match(pageFile, /LifeMapClient/)
  assert.match(clientFile, /SpatialShell mode="overview"/)
  assert.doesNotMatch(clientFile, /mode="lifemap"/)
})
