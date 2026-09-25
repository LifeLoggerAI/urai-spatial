import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const root = process.cwd()
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8')
const manifest = JSON.parse(read('release/route-manifest.json'))
const deployProof = read('urai-tier1/src/app/api/system/deploy-proof/route.ts')
const liveSmoke = read('scripts/urai-live-smoke.mjs')
const homeXrSmoke = read('scripts/smoke-home-xr-live-url.mjs')
const deployProofSmoke = read('scripts/check-home-xr-live-deploy-proof.mjs')

test('XR remains conditional in route authority and deploy proof', () => {
  assert.ok(manifest.classification.conditionalExact.includes('/spatial/ar-vr'))
  assert.ok(!manifest.classification.publicExact.includes('/spatial/ar-vr'))
  assert.match(deployProof, /const conditionalRoutes = \[[\s\S]*'\/xr'[\s\S]*'\/spatial\/ar-vr'[\s\S]*\] as const/)
  assert.match(deployProof, /requiredSmokeRoutes: publicRoutes/)
  assert.match(deployProof, /conditionalRoutes,/)
  assert.match(deployProof, /webxr: 'governed-post-launch-gated'/)
})

test('live smoke defaults XR to fail-closed and requires explicit release expectation to open it', () => {
  for (const source of [liveSmoke, homeXrSmoke, deployProofSmoke]) {
    assert.match(source, /URAI_EXPECT_XR_ENABLED/)
    assert.match(source, /response\.status !== 404/)
    assert.match(source, /expectedEnabled/)
  }
  assert.match(liveSmoke, /const conditionalRoutes = \[/)
  assert.match(homeXrSmoke, /const conditionalChecks = \[/)
  assert.match(deployProofSmoke, /conditionalRoutes/i)
  assert.match(deployProofSmoke, /governed-post-launch-gated/i)
})
