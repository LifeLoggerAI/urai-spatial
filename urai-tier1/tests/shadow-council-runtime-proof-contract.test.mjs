import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()
const runtimePath = join(root, 'urai-tier1/src/spatial/realms/SpatialRealmRuntime.tsx')
const proofPath = join(root, 'scripts/capture-shadow-council-runtime-proof.mjs')

for (const file of [runtimePath, proofPath]) assert.equal(existsSync(file), true, `${file} must exist.`)

const runtime = readFileSync(runtimePath, 'utf8')
assert.match(runtime, /SpatialRealmExperience/, 'Runtime boundary must retain the canonical R3F owner when WebGL is available.')
assert.match(runtime, /canvas\.getContext\('webgl2'\)/, 'Runtime boundary must probe WebGL2 capability.')
assert.match(runtime, /canvas\.getContext\('webgl'\)/, 'Runtime boundary must probe WebGL capability.')
assert.match(runtime, /semantic-no-webgl-fallback/, 'Runtime boundary must expose a semantic no-WebGL owner.')
assert.match(runtime, /data-reduced-motion/, 'Runtime boundary must publish reduced-motion evidence.')
assert.match(runtime, /requestUraiWorldTravel/, 'Fallback destinations must retain unified world travel.')

const proof = readFileSync(proofPath, 'utf8')
for (const marker of ["id: 'shadow'", "id: 'council'", "mode = 'standard'", "'reduced-motion'", "mode: 'no-webgl'", 'consoleErrors', 'pageErrors', 'failedRequests', 'receipt.captures.length === 8']) {
  assert.match(proof, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), `Proof script must retain ${marker}.`)
}
assert.match(proof, /semantic-no-webgl-fallback/, 'Proof must require the semantic no-WebGL owner.')
assert.match(proof, /canonical-route-owned-r3f/, 'Proof must require the canonical R3F owner.')
assert.match(proof, /data-realm-ready/, 'Proof must require a rendered spatial frame.')

console.log('URAI Shadow and Council runtime proof contract passed.')
