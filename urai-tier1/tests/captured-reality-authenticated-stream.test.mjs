import assert from 'node:assert/strict'
import { createHash, randomBytes } from 'node:crypto'
import test from 'node:test'
import { capturedRealityContentLengthAvailable, validateCapturedRealityRuntimeDelivery } from '../src/spatial/captured-reality/capturedRealityDelivery.ts'
import { createCapturedRealitySha256 } from '../src/spatial/captured-reality/capturedRealitySha256.ts'
import { streamCapturedRealitySplat } from '../src/spatial/captured-reality/capturedRealitySplatStream.ts'
import { createCapturedRealitySplatSession } from '../src/spatial/captured-reality/capturedRealitySplatSession.ts'

const digest = bytes => createHash('sha256').update(bytes).digest('hex')
const expected = { assetId: 'crp_2026_001', accessMode: 'runtime', deviceTier: 'desktop', projectId: 'urai-4dc1d', maxRuntimeBytes: 4096, now: Date.parse('2026-10-08T00:00:00Z') }
const descriptor = {
  assetId: expected.assetId, accessMode: 'runtime', deviceTier: 'desktop',
  url: 'https://us-central1-urai-4dc1d.cloudfunctions.net/streamCapturedRealityRuntime?assetId=crp_2026_001&accessMode=runtime&deviceTier=desktop&deliveryId=' + 'b'.repeat(64),
  expiresAt: '2026-10-08T00:10:00Z', truthLabel: 'Source-bound reconstruction',
  requiresAuthorization: true, runtimeSha256: 'a'.repeat(64), runtimeByteLength: 96, storageGeneration: '123456789',
}

test('authenticated delivery descriptors bind the current project, asset, mode, generation, expiry and format budget', () => {
  assert.equal(validateCapturedRealityRuntimeDelivery(descriptor, expected), true)
  for (const patch of [
    { assetId: 'foreign' }, { accessMode: 'proof' }, { deviceTier: 'mobile' }, { requiresAuthorization: false },
    { runtimeSha256: null }, { runtimeSha256: 'unknown' }, { runtimeByteLength: 95 },
    { runtimeByteLength: 8192 }, { storageGeneration: null }, { storageGeneration: '../private' },
    { expiresAt: '2026-10-07T23:59:59Z' }, { expiresAt: '2026-10-08T01:00:00Z' },
    { url: 'https://storage.googleapis.com/private/scene?signature=redacted' },
    { url: descriptor.url.replace('urai-4dc1d', 'foreign-project') },
    { url: descriptor.url.replace('streamCapturedRealityRuntime', 'otherFunction') },
    { url: descriptor.url.replace('assetId=crp_2026_001', 'assetId=foreign') },
    { url: descriptor.url.replace('accessMode=runtime&deviceTier=desktop&deliveryId=' + 'b'.repeat(64), 'accessMode=proof') },
    { url: descriptor.url.replace('deviceTier=desktop', 'deviceTier=mobile') },
    { url: descriptor.url.replace('deliveryId=' + 'b'.repeat(64), 'deliveryId=short') },
    { url: descriptor.url + '&assetId=duplicate' },
    { url: descriptor.url.replace('https://', 'http://') }, { url: `${descriptor.url}#fragment` },
    { url: descriptor.url.replace('https://', 'https://user:password@') },
  ]) assert.equal(validateCapturedRealityRuntimeDelivery({ ...descriptor, ...patch }, expected), false, JSON.stringify(patch))
})

test('constant-memory SHA256 agrees with Node crypto for empty, padding boundary, fragmented and large inputs', () => {
  for (const length of [0, 1, 3, 55, 56, 57, 63, 64, 65, 127, 128, 4096, 1_000_000]) {
    const bytes = randomBytes(length)
    for (const stride of [1, 13, 64, 4096]) {
      const hash = createCapturedRealitySha256()
      for (let offset = 0; offset < bytes.length; offset += stride) hash.update(bytes.subarray(offset, offset + stride))
      assert.equal(hash.digest(), digest(bytes), `${length}/${stride}`)
      assert.throws(() => hash.update(bytes), /FINALIZED/)
      assert.throws(() => hash.digest(), /FINALIZED/)
    }
  }
  const hash = createCapturedRealitySha256(); hash.dispose()
  assert.throws(() => hash.update(new Uint8Array()), /FINALIZED/)
})

function fixture() {
  const bytes = new Uint8Array(96)
  const view = new DataView(bytes.buffer)
  for (let offset = 0; offset < bytes.length; offset += 32) {
    view.setFloat32(offset + 8, 2, true)
    for (let axis = 0; axis < 3; axis++) view.setFloat32(offset + 12 + axis * 4, .2, true)
    bytes.set([255, 120, 80, 255, 255, 128, 128, 128], offset + 24)
  }
  return bytes
}
function streamOptions(extra = {}) {
  const bytes = fixture()
  return { url: descriptor.url, maxBytes: 4096, chunkSize: 1, signal: new AbortController().signal,
    authority: { expectedByteLength: bytes.length, expectedSha256: digest(bytes), requestHeaders: async () => ({ Authorization: 'Bearer synthetic-token' }) },
    onHeader() {}, onChunk() {}, fetcher: async () => new Response(bytes, { headers: { 'content-length': '96' } }), ...extra,
  }
}

test('probe and renderer GET obtain current credentials independently, omit cookies and prohibit redirects', async () => {
  let requests = 0, headersRead = 0
  const options = streamOptions()
  options.authority.requestHeaders = async () => ({ Authorization: `Bearer synthetic-${++headersRead}` })
  const fetcher = async (_url, request) => {
    assert.equal(request.headers.Authorization, `Bearer synthetic-${++requests}`)
    assert.equal(request.credentials, 'omit'); assert.equal(request.cache, 'no-store'); assert.equal(request.redirect, 'error')
    return new Response(fixture(), { headers: { 'content-length': '96' } })
  }
  assert.equal(await capturedRealityContentLengthAvailable(options.url, 4096, undefined, fetcher, options.authority), true)
  const receipt = await streamCapturedRealitySplat({ ...options, fetcher })
  assert.deepEqual(receipt, { byteSize: 96, pointCount: 3, sha256: digest(fixture()) })
  assert.equal(headersRead, 2)
})

test('identity rejection and exit during credential acquisition cannot dispatch a private GET', async () => {
  let calls = 0
  const authority = { ...streamOptions().authority, requestHeaders: async () => { throw new Error('PRIVATE_IDENTITY_CHANGED') } }
  const fetcher = async () => { calls++; throw new Error('must not fetch') }
  await assert.rejects(streamCapturedRealitySplat(streamOptions({ authority, fetcher })), /IDENTITY_CHANGED/)
  await assert.rejects(capturedRealityContentLengthAvailable(descriptor.url, 4096, undefined, fetcher, authority), /IDENTITY_CHANGED/)
  const abort = new AbortController()
  const delayedAuthority = { ...authority, requestHeaders: async () => { abort.abort(); return { Authorization: 'Bearer stale' } } }
  await assert.rejects(streamCapturedRealitySplat(streamOptions({ authority: delayedAuthority, fetcher, signal: abort.signal })), { name: 'AbortError' })
  assert.equal(calls, 0)
})

test('fragmented bytes must match their authorized SHA256; changed pixels cannot survive a failed session', async () => {
  const bytes = fixture()
  const response = () => new Response(new ReadableStream({ start(controller) {
    controller.enqueue(bytes.subarray(0, 11)); controller.enqueue(bytes.subarray(11, 61)); controller.enqueue(bytes.subarray(61)); controller.close()
  } }), { headers: { 'content-length': '96' } })
  assert.equal((await streamCapturedRealitySplat(streamOptions({ fetcher: async () => response() }))).sha256, digest(bytes))
  const modified = fixture(); modified[24] = 42
  const session = createCapturedRealitySplatSession({ ...streamOptions({ fetcher: async () => new Response(modified, { headers: { 'content-length': '96' } }) }), maxTextureSize: 64, alphaHash: true })
  await assert.rejects(session.completion, /could not be displayed/)
  assert.equal(session.disposed, true)
})

test('authorized size mismatches reject before any GPU allocation or chunk callback', async () => {
  let headers = 0, chunks = 0
  const options = streamOptions({ onHeader() { headers++ }, onChunk() { chunks++ } })
  options.authority.expectedByteLength = 64
  assert.equal(await capturedRealityContentLengthAvailable(options.url, 4096, undefined, options.fetcher, options.authority), false)
  await assert.rejects(streamCapturedRealitySplat(options), /ARTIFACT_BINDING/)
  assert.equal(headers, 0); assert.equal(chunks, 0)
})
