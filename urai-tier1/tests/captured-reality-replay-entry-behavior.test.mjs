import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
import vm from 'node:vm'
import ts from 'typescript'

const source = fs.readFileSync(new URL('../../apps/functions/src/capturedReality.ts', import.meta.url), 'utf8')
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText

function callable({ place = 'place-1', anchor = 'place-1', missingAnchors = false, bindingOwner = 'owner', assetOwner = 'owner', release = true, consent = true } = {}) {
  const documents = {
    'users/owner/privacyPolicy/current': { 'domains.memory': { mode: consent ? 'granted' : 'denied' }, 'domains.location': { mode: 'granted' } },
    'users/owner/privacyRuntime/location-collection': { enabled: true },
    'users/owner/capturedRealityReplayBindings/memory-1': {
      ownerId: bindingOwner, memoryId: 'memory-1', state: 'accepted', capturedRealityAssetId: 'asset-1', placeEntityId: place,
    },
    'users/owner/capturedRealityAssets/asset-1': {
      ownerId: assetOwner, state: 'ready', reviewState: 'accepted', truthClass: 'spatially-reconstructable',
      anchorEntityId: anchor, releaseState: 'private-pilot', browserCertified: true, mobileCertified: true,
      truthLabel: 'Reconstruction from recorded evidence',
    },
  }
  if (missingAnchors) {
    delete documents['users/owner/capturedRealityReplayBindings/memory-1'].placeEntityId
    delete documents['users/owner/capturedRealityAssets/asset-1'].anchorEntityId
  }
  const db = { doc: path => ({ get: async () => ({ exists: Boolean(documents[path]), get: key => documents[path]?.[key] }) }) }
  class HttpsError extends Error { constructor(code, message) { super(message); this.code = code } }
  const modules = {
    'firebase-functions/v1': { https: { onCall: handler => handler, HttpsError } },
    'firebase-admin': { apps: [{}], firestore: () => db },
  }
  const context = { exports: {}, process: { env: { URAI_ENABLE_CAPTURED_REALITY: String(release) } }, require: name => {
    assert.ok(modules[name], `unexpected dependency ${name}`)
    return modules[name]
  } }
  vm.runInNewContext(compiled, context)
  return tier => context.exports.getCapturedRealityReplayEntry({ memoryId: 'memory-1', deviceTier: tier ?? 'desktop' }, { auth: { uid: 'owner' } })
}

test('Replay callable rejects missing, blank and non-string place anchors even when both fields match', async () => {
  for (const value of [null, '', ' ', '\n\t', 12, false]) {
    assert.equal((await callable({ place: value, anchor: value })()).available, false, String(value))
  }
  assert.equal((await callable({ missingAnchors: true })()).available, false)
  assert.equal((await callable({ place: 'place-1', anchor: null })()).available, false)
})

test('Replay callable requires the exact same valid place and retains valid desktop/mobile entries', async () => {
  assert.equal((await callable({ place: 'place-1', anchor: 'place-2' })()).available, false)
  for (const tier of ['desktop', 'mobile']) {
    const result = await callable()(tier)
    assert.equal(result.available, true)
    assert.equal(result.assetId, 'asset-1')
    assert.equal(result.truthLabel, 'Reconstruction from recorded evidence')
    assert.equal('placeEntityId' in result, false)
  }
  for (const id of ['place:family/home', 'place-1', 'place_α', 'x'.repeat(129)]) {
    assert.equal((await callable({ place: id, anchor: id })()).available, true, id)
  }
})

test('Replay callable keeps owner, release and consent gates while validating bindings', async () => {
  assert.equal((await callable({ bindingOwner: 'other' })()).available, false)
  assert.equal((await callable({ assetOwner: 'other' })()).available, false)
  assert.equal((await callable({ release: false })()).available, false)
  await assert.rejects(callable({ consent: false })(), error => error.code === 'permission-denied')
})
