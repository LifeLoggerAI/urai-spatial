import assert from 'node:assert/strict'
import test from 'node:test'
import { capturedRealityContentLengthAvailable, createCapturedRealityRequestAuthority } from '../src/spatial/captured-reality/capturedRealityDelivery.ts'
import { capturedRealityLaunchCertification, validateCapturedRealityPerformanceReceipt } from '../src/spatial/captured-reality/capturedRealityRuntime.ts'

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
