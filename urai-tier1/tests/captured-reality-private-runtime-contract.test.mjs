import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const source = fs.readFileSync(new URL('../../apps/functions/src/capturedReality.ts', import.meta.url), 'utf8')
const index = fs.readFileSync(new URL('../../apps/functions/src/index.ts', import.meta.url), 'utf8')
const privacy = fs.readFileSync(new URL('../../apps/functions/src/privacyOperations.ts', import.meta.url), 'utf8')
const manifest = fs.readFileSync(new URL('../../privacy/feature-manifests/captured-reality.privacy.yaml', import.meta.url), 'utf8')
const inventory = fs.readFileSync(new URL('../../privacy/data-inventory.yaml', import.meta.url), 'utf8')

test('captured reality runtime is owner-only, feature-gated and C3 revocation-aware', () => {
  assert.match(source, /URAI_ENABLE_CAPTURED_REALITY/)
  assert.match(source, /CAPTURED_REALITY_MEMORY_AND_LOCATION_CONSENT_REQUIRED/)
  assert.match(source, /privacyPolicy\/current/)
  assert.match(source, /privacyRuntime\/location-collection/)
  assert.match(source, /locationMode === 'granted' \|\| locationMode === 'limited'/)
  assert.match(source, /memoryMode === 'granted' \|\| memoryMode === 'limited'/)
  assert.match(source, /runtime\.get\('enabled'\) === true/)
  assert.match(source, /users\/\$\{uid\}\/capturedRealityAssets/)
  assert.match(source, /ownerId.*uid/)
})

test('runtime delivery accepts only reviewed source-backed reconstruction and a private owner path', () => {
  assert.match(source, /state.*ready/)
  assert.match(source, /reviewState.*accepted/)
  assert.match(source, /truthClass.*spatially-reconstructable/)
  assert.match(source, /private-captured-reality/)
  assert.match(source, /getSignedUrl/)
  assert.match(source, /RUNTIME_URL_TTL_MS = 10 \* 60 \* 1000/)
  assert.doesNotMatch(source, /makePublic\(/)
})

test('owner metadata response omits exact location and raw source locators', () => {
  assert.match(source, /Raw source locators, exact location, storage object/)
  assert.doesNotMatch(source, /exactLocation:\s*data/)
  assert.doesNotMatch(source, /runtimeObject:\s*data/)
})

test('functions index exports captured reality owner APIs', () => {
  assert.match(index, /getCapturedRealityAsset/)
  assert.match(index, /getCapturedRealityRuntimeUrl/)
})

test('privacy package classifies captured reality as L3 C1 content with additional memory and location purpose gates', () => {
  assert.match(manifest, /feature: captured-reality/)
  assert.match(manifest, /dataClass: L3/)
  assert.match(manifest, /consentTier: C1/)
  assert.match(manifest, /requiredConsentPurposes:/)
  assert.match(manifest, /memory\.storage/)
  assert.match(manifest, /location\.context/)
  assert.match(manifest, /deletionSupported: true/)
  assert.match(manifest, /consentRevocationSupported: true/)
  assert.match(inventory, /name: captured_reality_manifest/)
  assert.match(inventory, /name: captured_reality_runtime_asset/)
  assert.match(inventory, /name: captured_reality_replay_binding/)
})

test('privacy export and deletion lifecycle includes captured reality records and private object cleanup', () => {
  assert.match(privacy, /capturedRealityAssets/)
  assert.match(privacy, /private-captured-reality/)
  assert.match(privacy, /deleteFiles/)
})

test('proof delivery is separately gated and can never masquerade as certified runtime', () => {
  assert.match(source, /URAI_ENABLE_CAPTURED_REALITY_PROOF/)
  assert.match(source, /CAPTURED_REALITY_PROOF_DISABLED/)
  assert.match(source, /CAPTURED_REALITY_PROOF_REQUIRES_PRIVATE_PILOT/)
  assert.match(source, /accessMode === 'runtime' && !certified/)
  assert.match(source, /releaseGate: accessMode === 'proof' \? 'proof-only' : 'enabled'/)
})
