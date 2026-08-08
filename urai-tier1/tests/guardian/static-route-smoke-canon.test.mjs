import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()
const app = join(root, 'urai-tier1')
const read = (relativePath) => readFileSync(join(app, relativePath), 'utf8')

const canonicalRoutes = [
  ['src/app/page.tsx', /FinalHomeThreshold/],
  ['src/app/home/page.tsx', /FinalHomeThreshold/],
  ['src/app/life-map/page.tsx', /SpatialLifeMapCanonical/],
  ['src/app/focus/page.tsx', /FinalFocusChamber/],
  ['src/app/replay/page.tsx', /FinalReplayFilm/],
  ['src/app/location-map/page.tsx', /LocationMapAcceptanceBoundary/],
  ['src/app/passport/page.tsx', /PassportVaultClient/],
  ['src/app/shadow/page.tsx', /SpatialRealmRuntime/],
  ['src/app/council/page.tsx', /SpatialRealmRuntime/],
  ['src/app/ground/page.tsx', /walkable-first-person-ground-layer/],
]

for (const [file, expected] of canonicalRoutes) {
  const full = join(app, file)
  assert.equal(existsSync(full), true, `${file} must exist.`)
  assert.match(read(file), expected, `${file} must retain its canonical owner marker.`)
}

const redirectAliases = [
  ['src/app/spatial/page.tsx', '/home?from=spatial'],
  ['src/app/spatial/v1/page.tsx', '/home?from=spatial-v1'],
  ['src/app/v1/page.tsx', '/home?from=v1'],
  ['src/app/ascent/page.tsx', '/home?from=ascent'],
  ['src/app/spatial-fallback/page.tsx', '/home?from=spatial-fallback'],
  ['src/app/unwind/page.tsx', '/life-map?from=unwind&overview=1'],
  ['src/app/spatial/life-map/page.tsx', '/life-map?from=spatial-life-map'],
  ['src/app/spatial/life-map-r3f/page.tsx', '/life-map?from=spatial-life-map-r3f'],
  ['src/app/spatial/life-map-orbit/page.tsx', '/life-map?from=spatial-life-map-orbit'],
  ['src/app/privacy/page.tsx', '/privacy-controls?from=privacy'],
]

for (const [file, destination] of redirectAliases) {
  const source = read(file)
  assert.match(source, /redirect\(/, `${file} must be a compatibility redirect.`)
  assert.ok(source.includes(destination), `${file} must resolve to ${destination}.`)
  assert.doesNotMatch(source, /TierOneExperience|UraiV1Experience|UraiSpatialStage|SpatialLifeMapCanonical/, `${file} must not own another product runtime.`)
}

for (const file of ['src/app/u/[handle]/page.tsx', 'src/app/u/adamclamp/page.tsx', 'src/app/demo/life-map/page.tsx']) {
  const source = read(file)
  assert.match(source, /redirect\(/, `${file} must converge demo compatibility into canonical Life Map.`)
  assert.match(source, /\/life-map\?demo=1/, `${file} must preserve disclosed sample-demo semantics.`)
  assert.doesNotMatch(source, /TierOneExperience|UraiV1Experience|LifeMapAscentGate/, `${file} must not restore demo runtime ownership.`)
}

for (const retired of [
  'src/spatial/layout/TierOneExperience.tsx',
  'src/components/urai/UraiV1Experience.tsx',
  'src/app/RootModeExperience.tsx',
]) {
  assert.equal(existsSync(join(app, retired)), false, `${retired} must stay retired.`)
}

const semanticRoutePath = join(app, 'src/spatial/realms/LifeMapSemanticRoute.tsx')
assert.equal(existsSync(semanticRoutePath), true, 'Life Map semantic convergence owner must exist.')
const semanticRoute = read('src/spatial/realms/LifeMapSemanticRoute.tsx')
assert.match(semanticRoute, /\/life-map\?from=\$\{kind\}&overview=1/, 'Legacy and Dream aliases must resolve to canonical Life Map.')
assert.doesNotMatch(semanticRoute, /Camera:|Lighting:|Fallback:/, 'Semantic convergence surface must not expose diagnostic metadata.')
assert.equal(existsSync(join(app, 'src/spatial/realms/RealmShell.tsx')), false, 'Obsolete RealmShell must stay removed.')

const spatialRuntime = read('src/spatial/realms/SpatialRealmRuntime.tsx')
assert.match(spatialRuntime, /SpatialRealmExperience/, 'Capability-aware realm runtime must preserve the canonical R3F owner.')
assert.match(spatialRuntime, /semantic-no-webgl-fallback/, 'Capability-aware realm runtime must preserve semantic no-WebGL access.')

console.log('URAI static route smoke canon passed.')
