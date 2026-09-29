import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
import vm from 'node:vm'

const page = fs.readFileSync(new URL('../src/app/spatial/captured-reality/page.tsx', import.meta.url), 'utf8')
const client = fs.readFileSync(new URL('../src/app/spatial/captured-reality/CapturedRealityRouteClient.tsx', import.meta.url), 'utf8')
const delivery = fs.readFileSync(new URL('../src/spatial/captured-reality/capturedRealityDelivery.ts', import.meta.url), 'utf8')
const scene = fs.readFileSync(new URL('../src/spatial/captured-reality/CapturedRealityPrivateScene.tsx', import.meta.url), 'utf8')
const ownedSplat = fs.readFileSync(new URL('../src/spatial/captured-reality/OwnedCapturedRealitySplat.tsx', import.meta.url), 'utf8')
const privacyOperations = fs.readFileSync(new URL('../../apps/functions/src/privacyOperations.ts', import.meta.url), 'utf8')
const proofImporter = fs.readFileSync(new URL('../../apps/functions/scripts/import-captured-reality-proof.mjs', import.meta.url), 'utf8')

test('consent suppression clears private provenance as well as the rendered scene', () => {
  // Execute the actual callback body with state setters, including an open panel.
  const body = client.match(/const suppress = useCallback\(\(message: string\) => \{([\s\S]*?)\n  \}, \[\]\)/)?.[1]
  assert.ok(body, 'suppression callback must exist')
  const state = { delivery: 'signed-private-url', metadata: { label: 'Private place' }, showProvenance: true }
  const revokedRef = { current: false }
  const truthLabelRef = { current: 'Private reconstruction label' }
  vm.runInNewContext(body, {
    revokedRef, truthLabelRef, message: 'Consent revoked',
    setDelivery: (value) => { state.delivery = value },
    setMetadata: (value) => { state.metadata = value },
    setShowProvenance: (value) => { state.showProvenance = value },
    suppressedDecision: (label = 'Private captured place unavailable') => ({ mode: 'suppressed', label }),
    setDecision: (value) => { state.decision = value },
    setState: (value) => { state.route = value },
  })
  assert.equal(revokedRef.current, true)
  assert.equal(state.delivery, null)
  assert.equal(state.metadata, null)
  assert.equal(state.showProvenance, false)
  assert.equal(truthLabelRef.current, undefined)
  assert.equal(state.decision.mode, 'suppressed')
  assert.equal(state.decision.label, 'Private captured place unavailable')
  assert.equal(state.route.kind, 'suppressed')
})

test('private captured reality route is a static shell and carries no private asset data at build time', () => {
  assert.match(page, /dynamic = 'force-static'/)
  assert.match(page, /<CapturedRealityRouteClient \/>/)
  assert.doesNotMatch(page, /capturedRealityReleaseEnabled/)
  assert.doesNotMatch(page, /runtimeObject|sourceIds|exactLocation/)
  assert.match(client, /useSearchParams/)
  assert.match(client, /SAFE_ASSET_ID/)
})

test('route requires Firebase identity and obtains runtime media only through trusted callable functions', () => {
  assert.match(client, /onAuthStateChanged/)
  assert.match(client, /getCapturedRealityAsset/)
  assert.match(client, /getCapturedRealityRuntimeUrl/)
  assert.doesNotMatch(client, /drive\.google\.com/)
  assert.doesNotMatch(client, /runtimeObject/)
})

test('route watches both memory and location privacy authority and unmounts delivery after revocation', () => {
  assert.match(client, /privacyPolicy/)
  assert.match(client, /privacyRuntime/)
  assert.match(client, /domains\.\$\{field\}\.mode/)
  assert.match(client, /memory/)
  assert.match(client, /location/)
  assert.match(client, /setDelivery\(null\)/)
  assert.match(client, /setDecision\(suppressedDecision/)
  assert.match(client, /capturedRealityAssets', assetId/)
  assert.match(client, /assetAuthorityActive\(snapshot, user\.uid, accessMode\)/)
  assert.match(client, /revocationState/)
  assert.match(client, /resolveAssetAuthority\(active\)/)
  assert.match(client, /assetAuthorityTimeout = window\.setTimeout/)
  assert.match(client, /resolveAssetAuthority\(false\)/)
})

test('route fails to semantic fallback when WebGL2 streaming prerequisites are unavailable', () => {
  assert.match(client, /capturedRealityBrowserCapability/)
  assert.match(delivery, /content-length/)
  assert.match(delivery, /method: 'GET'/)
  assert.match(client, /capturedRealityContentLengthAvailable/)
  assert.match(client, /fallbackDecision/)
})

test('private signed delivery is renewed before expiry and failure closes the scene', () => {
  assert.match(client, /expires - Date\.now\(\) - 60_000/)
  assert.match(client, /private delivery could not be renewed/)
  assert.match(client, /loadRuntimeDelivery\(assetId, accessMode\)/)
})

test('route always provides a deterministic exit and provenance is redacted to safe metadata', () => {
  assert.match(client, /router\.back\(\)/)
  assert.match(client, /router\.push\('\/replay'\)/)
  assert.match(client, /View source and provenance|Captured Reality provenance/)
  assert.match(client, /Exact source locators and private location are intentionally not exposed/)
})

test('proof mode remains visibly separate while callable authority enforces the actual proof gate', () => {
  assert.match(client, /searchParams\.get\('proof'\) === '1'/)
  assert.match(client, /accessMode: 'runtime' \| 'proof'/)
  assert.match(client, /Private proof mode · not launch runtime/)
  assert.match(client, /capturedRealityDeviceTier/)
})


test('technical render readiness requires meaningful non-background Gaussian pixels', () => {
  assert.match(ownedSplat, /capturedRealityFrameHasMeaningfulPixels/)
  assert.match(ownedSplat, /getClearColor/)
  assert.match(ownedSplat, /gl\.domElement\.width/)
  assert.match(scene, /GAUSSIAN_RENDERED/)
  assert.match(scene, /LOADING_OR_BLANK/)
  assert.match(scene, /FALLBACK_RENDERED/)
})

test('signed URL renewal preserves the already-loaded splat resource', () => {
  const renewal = client.match(/const scheduleRenewal = \(expiresAt: string\) => \{([\s\S]*?)\n    renewedDeliveryRef\.current = null/)?.[1]
  assert.ok(renewal, 'renewal scheduler must exist')
  assert.match(renewal, /renewedDeliveryRef\.current = next/)
  assert.match(renewal, /scheduleRenewal\(next\.expiresAt\)/)
  assert.doesNotMatch(renewal, /setDelivery\(next\)|setDecision\(splatDecision\(next\)\)/)
})

test('spatial deletion removes exported private splat copies as well as source runtime objects', () => {
  assert.match(privacyOperations, /private-captured-reality\/\$\{uid\}\//)
  assert.match(privacyOperations, /const exportPrefix = `private-exports\/\$\{uid\}\//)
  assert.match(privacyOperations, /file\.name\.includes\('\/spatial\/captured-reality\/'\)/)
  assert.match(privacyOperations, /scope === 'all-repository-data'[\s\S]*deleteCapturedRealityStorage\(uid, \{ deleteAllExports: true \}\)/)
  assert.match(privacyOperations, /scope === 'export-history'[\s\S]*deleteCapturedRealityStorage\(uid, \{ deleteAllExports: true, deleteSource: false \}\)/)
})

test('create-only proof import cleans up a successfully-created object after metadata failure', () => {
  assert.match(proofImporter, /let objectCreated = false/)
  assert.match(proofImporter, /objectCreated = true/)
  assert.match(proofImporter, /else if \(objectCreated\)/)
  assert.match(proofImporter, /recoveredGeneration/)
  assert.match(proofImporter, /object\.delete\(\{ ignoreNotFound: true \}\)/)
})
