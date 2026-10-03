import assert from 'node:assert/strict'
import test from 'node:test'
import { capturedRealityContentLengthAvailable, capturedRealityWebGL2Available, createCapturedRealityRequestAuthority } from '../src/spatial/captured-reality/capturedRealityDelivery.ts'
import { capturedRealityLaunchCertification, validateCapturedRealityPerformanceReceipt } from '../src/spatial/captured-reality/capturedRealityRuntime.ts'

test('repeated WebGL capability probes release their temporary GPU contexts', () => {
  let active = 0
  let released = 0
  const canvas = () => ({ getContext(kind) {
    assert.equal(kind, 'webgl2')
    active += 1
    return { getExtension(name) {
      assert.equal(name, 'WEBGL_lose_context')
      return { loseContext() { active -= 1; released += 1 } }
    } }
  } })
  for (let i = 0; i < 32; i += 1) {
    assert.equal(capturedRealityWebGL2Available(canvas), true)
    assert.equal(active, 0)
  }
  assert.equal(released, 32)
})

test('WebGL capability probing handles unsupported and denied contexts', () => {
  assert.equal(capturedRealityWebGL2Available(() => ({ getContext: () => null })), false)
  assert.equal(capturedRealityWebGL2Available(() => { throw new Error('denied') }), false)
  assert.equal(capturedRealityWebGL2Available(() => ({ getContext: () => ({ getExtension: () => null }) })), true)
})

test('GET-signed delivery probes use the authorized method and cancel media consumption after headers', async () => {
  let cancelled = false
  const abort = new AbortController()
  const fetcher = async (url, options) => {
    assert.equal(url, 'https://storage.example/private.splat?signature=private')
    assert.equal(options.method, 'GET')
    assert.equal(options.credentials, 'omit')
    assert.equal(options.signal, abort.signal)
    return new Response(new ReadableStream({ cancel() { cancelled = true } }), { headers: { 'content-length': '320' } })
  }
  assert.equal(await capturedRealityContentLengthAvailable('https://storage.example/private.splat?signature=private', 1024, abort.signal, fetcher), true)
  assert.equal(cancelled, true)
})

test('private delivery rejects failed, partial, missing, malformed and oversized responses and releases every stream', async () => {
  for (const [status, length] of [[403, '320'], [206, '320'], [200, null], [200, 'NaN'], [200, 'Infinity'], [200, '1.2'], [200, '1e2'], [200, '0'], [200, '1025']]) {
    let cancelled = false
    const fetcher = async () => new Response(new ReadableStream({ cancel() { cancelled = true } }), {
      status, headers: length === null ? {} : { 'content-length': length },
    })
    assert.equal(await capturedRealityContentLengthAvailable('https://storage.example/private.splat', 1024, undefined, fetcher), false, `${status}/${length}`)
    assert.equal(cancelled, true)
  }
})

test('private request authority rejects late responses after logout, account change and disposal', () => {
  const authority = createCapturedRealityRequestAuthority()
  const accountA = authority.begin()
  assert.equal(accountA(), true)
  authority.begin() // sign-out callback
  assert.equal(accountA(), false)
  const accountB = authority.begin()
  assert.equal(accountB(), true)
  const accountC = authority.begin()
  assert.equal(accountB(), false)
  assert.equal(accountC(), true)
  authority.invalidate() // effect cleanup
  assert.equal(accountC(), false)
})

const receipt = {
  tier: 'desktop', runtimeBytes: 1024, sustainedFps: 90, sampleSeconds: 60,
  deviceLabel: 'physical-desktop', measuredAt: '2026-09-25T23:00:00Z',
}

test('performance authority rejects non-finite measurements and invalid device tiers', () => {
  for (const field of ['runtimeBytes', 'sustainedFps', 'sampleSeconds']) {
    for (const value of [NaN, Infinity, -Infinity]) {
      assert.ok(validateCapturedRealityPerformanceReceipt({ ...receipt, [field]: value }).length > 0, `${field}/${value}`)
    }
  }
  assert.deepEqual(validateCapturedRealityPerformanceReceipt({ ...receipt, tier: 'unknown' }), ['DEVICE_TIER_INVALID'])
})

test('one desktop performance receipt cannot certify mobile or XR devices', () => {
  const result = capturedRealityLaunchCertification({
    qaAccepted: true, truthAndConsentPassed: true,
    desktopReceipt: receipt, mobileReceipt: receipt, xrReceipt: receipt,
  })
  assert.equal(result.browserReady, true)
  assert.equal(result.mobileReady, false)
  assert.equal(result.xrReady, false)
  assert.ok(result.mobileErrors.includes('MOBILE_RECEIPT_TIER_MISMATCH'))
  assert.ok(result.xrErrors.includes('XR_RECEIPT_TIER_MISMATCH'))
})

test('private splat delivery requires whole raw records and readable unencoded bodies', async () => {
  for (const headers of [
    { 'content-length': '31' },
    { 'content-length': '33' },
    { 'content-length': '320', 'content-encoding': 'gzip' },
    { 'content-length': '320', 'content-encoding': 'br' },
    { 'content-length': '320', 'content-range': 'bytes 0-319/640' },
  ]) {
    let cancelled = false
    const fetcher = async () => new Response(new ReadableStream({ cancel() { cancelled = true } }), { headers })
    assert.equal(await capturedRealityContentLengthAvailable('https://storage.example/private.splat', 1024, undefined, fetcher), false)
    assert.equal(cancelled, true)
  }
  const empty = async () => new Response(null, { headers: { 'content-length': '320' } })
  assert.equal(await capturedRealityContentLengthAvailable('https://storage.example/private.splat', 1024, undefined, empty), false)
  const valid = async (_url, options) => {
    assert.equal(options.redirect, 'error')
    return new Response(new Uint8Array(320), { headers: { 'content-length': '320', 'content-encoding': 'identity' } })
  }
  assert.equal(await capturedRealityContentLengthAvailable('https://storage.example/private.splat', 1024, undefined, valid), true)
})

test('invalid runtime byte budgets cannot trigger a private fetch', async () => {
  for (const budget of [NaN, Infinity, -1, 0, 31, 32.5]) {
    assert.equal(await capturedRealityContentLengthAvailable('https://storage.example/private.splat', budget, undefined, () => { throw new Error('must not fetch') }), false)
  }
})

test('capability checks release temporary WebGL contexts on every renewal', () => {
  let released = 0
  const createCanvas = () => ({ getContext(kind) {
    assert.equal(kind, 'webgl2')
    return { getExtension(name) {
      assert.equal(name, 'WEBGL_lose_context')
      return { loseContext() { released++ } }
    } }
  } })
  for (let i = 0; i < 30; i++) assert.equal(capturedRealityWebGL2Available(createCanvas), true)
  assert.equal(released, 30)
  assert.equal(capturedRealityWebGL2Available(() => ({ getContext: () => null })), false)
  assert.equal(capturedRealityWebGL2Available(() => { throw new Error('canvas unavailable') }), false)
  assert.equal(capturedRealityWebGL2Available(() => ({ getContext: () => ({ getExtension: () => null }) })), true)
})
