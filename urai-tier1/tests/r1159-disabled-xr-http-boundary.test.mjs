import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
const source = fs.readFileSync(new URL('../src/middleware.ts', import.meta.url), 'utf8')
const xrPage = fs.readFileSync(new URL('../src/app/xr/page.tsx', import.meta.url), 'utf8')
const boundary = fs.readFileSync(new URL('../src/lib/spatial-launch-boundaries.ts', import.meta.url), 'utf8')
const manifest = JSON.parse(fs.readFileSync(new URL('../../release/route-manifest.json', import.meta.url), 'utf8'))

test('disabled live XR is explicitly intercepted before any route rewrite', () => {
  assert.match(boundary, /liveArWebXrEnabled:\s*false/)
  assert.match(source, /request\.nextUrl\.pathname === '\/xr' && !spatialLaunchBoundary\.liveArWebXrEnabled/)
  assert.match(source, /status:\s*404/)
  assert.ok(source.indexOf("request.nextUrl.pathname === '/xr'") < source.indexOf("request.nextUrl.pathname === '/home'"))
})

test('XR middleware matcher includes exact /xr and does not gate safe preview route', () => {
  assert.match(source, /matcher:\s*\['\/xr', '\/home'/)
  assert.doesNotMatch(source, /request\.nextUrl\.pathname === '\/spatial\/ar-vr'/)
  assert.ok(manifest.classification.conditionalExact.includes('/xr'))
  assert.equal(manifest.conditionalRoutes.find(x => x.route === '/xr').disabledStatus, 404)
})

test('XR page retains disabled-session notFound independent of the transport boundary', () => {
  assert.match(xrPage, /if \(!spatialLaunchBoundary\.liveArWebXrEnabled\) notFound\(\)/)
  assert.match(source, /'cache-control': 'no-store'/)
})
