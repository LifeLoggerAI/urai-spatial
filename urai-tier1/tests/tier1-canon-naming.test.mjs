import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const pageFile = fs.readFileSync(new URL('../src/app/life-map/page.tsx', import.meta.url), 'utf8')
const layoutFile = fs.readFileSync(new URL('../src/app/life-map/layout.tsx', import.meta.url), 'utf8')
const canonicalFile = fs.readFileSync(new URL('../src/spatial/lifemap/SpatialLifeMapCanonical.tsx', import.meta.url), 'utf8')

test('Life Map route path and canonical naming are preserved without a legacy mode shell', () => {
  assert.match(pageFile, /SpatialLifeMapCanonical/)
  assert.match(layoutFile, /SpatialLifeMapCanonical/)
  assert.match(canonicalFile, /data-testid="urai-r3f-canonical-lifemap"/)
  assert.doesNotMatch(pageFile + layoutFile + canonicalFile, /TierOneExperience|mode="lifemap"|UraiSpatialStage/)
})
