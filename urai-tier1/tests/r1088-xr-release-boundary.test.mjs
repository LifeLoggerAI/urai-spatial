import fs from 'node:fs'
import test from 'node:test'
import assert from 'node:assert/strict'

const read = (path) => fs.readFileSync(new URL('../' + path, import.meta.url), 'utf8')
const home = read('src/app/HomeSpatialWorldFinal.tsx')
const xrPage = read('src/app/xr/page.tsx')
const liveBoundary = read('src/lib/spatial-launch-boundaries.ts')
const manifest = JSON.parse(fs.readFileSync(new URL('../../release/route-manifest.json', import.meta.url), 'utf8'))
const deployProof = read('src/app/api/system/deploy-proof/route.ts')

test('R1088 Home does not advertise a disabled live XR route as currently available', () => {
  assert.match(liveBoundary, /liveArWebXrEnabled:\s*false/)
  assert.doesNotMatch(home, /href:\s*["']\/xr["']/)
  assert.doesNotMatch(home, /<Link href=["']\/xr["']/)
  assert.match(home, /href:\s*["']\/spatial\/ar-vr["']/)
  assert.match(home, /<Link href=["']\/spatial\/ar-vr["']>XR preview<\/Link>/)
  assert.match(home, /Live XR awaits device certification/)
})

test('R1088 live XR remains conditionally denied pending device proof', () => {
  assert.equal(manifest.classification.publicExact.includes('/xr'), false)
  assert.equal(manifest.classification.conditionalExact.includes('/xr'), true)
  const entry = manifest.conditionalRoutes.find((item) => item.route === '/xr')
  assert.ok(entry)
  assert.equal(entry.deviceAcceptance, false)
  assert.equal(entry.disabledStatus, 404)
  assert.match(xrPage, /if \(!spatialLaunchBoundary\.liveArWebXrEnabled\) notFound\(\)/)
})

test('R1088 preview fallback does not assert device-certified XR', () => {
  const entry = manifest.conditionalRoutes.find((item) => item.route === '/spatial/ar-vr')
  assert.ok(entry)
  assert.equal(entry.previewOnlyWhenDisabled, true)
  assert.equal(entry.deviceAcceptance, false)
  assert.ok(manifest.classification.conditionalExact.includes('/spatial/ar-vr'))
  assert.match(deployProof, /previewOnly: route === '\/spatial\/ar-vr'/)
  assert.match(deployProof, /questBrowser: 'unverified-until-device-proof'/)
})
