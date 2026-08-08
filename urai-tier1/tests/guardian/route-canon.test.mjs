import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const repoRoot = process.cwd()
const appRoot = join(repoRoot, 'urai-tier1')
const read = (relativePath) => readFileSync(join(appRoot, relativePath), 'utf8')

for (const route of ['src/app/page.tsx', 'src/app/home/page.tsx']) {
  const source = read(route)
  assert.match(source, /FinalHomeThreshold/, `${route} must keep FinalHomeThreshold as the canonical Home entry.`)
  assert.doesNotMatch(source, /TierOneExperience|UraiV1Experience/, `${route} must not restore a parallel legacy owner.`)
}

const aliases = [
  ['src/app/spatial/page.tsx', /redirect\(['"]\/home\?from=spatial['"]\)/],
  ['src/app/spatial/v1/page.tsx', /redirect\(['"]\/home\?from=spatial-v1['"]\)/],
  ['src/app/v1/page.tsx', /redirect\(['"]\/home\?from=v1['"]\)/],
  ['src/app/ascent/page.tsx', /redirect\(['"]\/home\?from=ascent['"]\)/],
  ['src/app/spatial-fallback/page.tsx', /redirect\(['"]\/home\?from=spatial-fallback['"]\)/],
  ['src/app/unwind/page.tsx', /redirect\(['"]\/life-map\?from=unwind&overview=1['"]\)/],
  ['src/app/spatial/life-map/page.tsx', /redirect\(['"]\/life-map\?from=spatial-life-map['"]\)/],
  ['src/app/spatial/life-map-r3f/page.tsx', /redirect\(['"]\/life-map\?from=spatial-life-map-r3f['"]\)/],
  ['src/app/spatial/life-map-orbit/page.tsx', /redirect\(['"]\/life-map\?from=spatial-life-map-orbit['"]\)/],
  ['src/app/privacy/page.tsx', /redirect\(['"]\/privacy-controls\?from=privacy['"]\)/],
]

for (const [route, expectedRedirect] of aliases) {
  const source = read(route)
  assert.match(source, expectedRedirect, `${route} must resolve to its canonical owner.`)
  assert.doesNotMatch(source, /TierOneExperience|UraiV1Experience|UraiSpatialStage|SpatialLifeMapCanonical/, `${route} must not mount a parallel product runtime.`)
}

assert.equal(existsSync(join(appRoot, 'src/spatial/layout/TierOneExperience.tsx')), false, 'Retired TierOneExperience must stay removed.')
assert.equal(existsSync(join(appRoot, 'src/components/urai/UraiV1Experience.tsx')), false, 'Retired UraiV1Experience must stay removed.')
assert.equal(existsSync(join(appRoot, 'src/app/RootModeExperience.tsx')), false, 'Retired RootModeExperience must stay removed.')

console.log('URAI route canon passed: compatibility routes redirect into canonical Home, Life Map, or Privacy owners.')
