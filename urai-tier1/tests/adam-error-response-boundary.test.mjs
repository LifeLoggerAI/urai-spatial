import test from 'node:test'
import assert from 'node:assert/strict'
import { readBoundedAdamError } from '../src/spatial/adam/adamErrorResponseBoundary.mjs'
const options = (signal = new AbortController().signal, isCurrent = () => true) =>
  ({ signal, isCurrent, fallbackCode: 'FOUNDER_VOICE_UNAVAILABLE' })
const pause = ms => new Promise(resolve => setTimeout(resolve, ms))

test('authorized safe machine-readable error code retained, raw private message ignored', async () => {
  const response = new Response(JSON.stringify({ error: 'PROVIDER_PROCESSING_REVOKED', message: 'private family context' }), { status: 403 })
  const result = await readBoundedAdamError(response, options())
  assert.deepEqual(result, { code: 'PROVIDER_PROCESSING_REVOKED' })
  assert.equal(Object.hasOwn(result, 'message'), false)
})
test('raw, malformed or lowercase provider error codes fail closed', async () => {
  for (const code of ['private_context', '<script>alert(1)</script>', 'A'.repeat(121), 42]) {
    const response = new Response(JSON.stringify({ error: code }), { status: 403 })
    assert.deepEqual(await readBoundedAdamError(response, options()), { code: 'FOUNDER_VOICE_UNAVAILABLE' })
  }
})
test('oversized network response is bounded by actual bytes and canceled', async () => {
  let canceled = false
  const body = new ReadableStream({ start(controller) { controller.enqueue(new Uint8Array(4097)) }, cancel() { canceled = true } }, { highWaterMark: 0 })
  const result = await readBoundedAdamError(new Response(body, { status: 502 }), options())
  assert.deepEqual(result, { code: 'FOUNDER_VOICE_UNAVAILABLE' })
  assert.equal(canceled, true)
})
test('claimed oversized Content-Length rejects before reading body', async () => {
  let canceled = false
  const body = new ReadableStream({ cancel() { canceled = true } }, { highWaterMark: 0 })
  const result = await readBoundedAdamError(new Response(body, { status: 403, headers: { 'content-length': '5000' } }), options())
  assert.equal(result.code, 'FOUNDER_VOICE_UNAVAILABLE')
  assert.equal(canceled, true)
})
test('owner rotation stops stalled HTTP 403 without caller abort', async () => {
  let current = true, canceled = false
  const body = new ReadableStream({ pull() {}, cancel() { canceled = true } }, { highWaterMark: 0 })
  const response = new Response(body, { status: 403 })
  const work = readBoundedAdamError(response, options(new AbortController().signal, () => current))
  await pause(25); current = false
  const value = await Promise.race([work, pause(300).then(() => ({ code: 'STALLED' }))])
  assert.deepEqual(value, { code: 'AUTH_SESSION_CHANGED' })
  assert.equal(canceled, true)
})
test('abort stops stalled error read and denies output', async () => {
  const ac = new AbortController()
  let canceled = false
  const body = new ReadableStream({ pull() {}, cancel() { canceled = true } }, { highWaterMark: 0 })
  const work = readBoundedAdamError(new Response(body, { status: 403 }), options(ac.signal))
  await pause(10); ac.abort()
  const value = await Promise.race([work, pause(300).then(() => ({ code: 'STALLED' }))])
  assert.deepEqual(value, { code: 'AUTH_SESSION_CHANGED' })
  assert.equal(canceled, true)
})
test('throwing authorization lookup cannot accept response', async () => {
  let canceled = false
  const body = new ReadableStream({ cancel() { canceled = true } })
  const result = await readBoundedAdamError(new Response(body, { status: 403 }), options(undefined, () => { throw Error('private') }))
  assert.deepEqual(result, { code: 'AUTH_SESSION_CHANGED' })
  assert.equal(canceled, true)
})
test('invalid UTF-8 and broken JSON fail closed without exposing response', async () => {
  for (const body of [Uint8Array.of(0xc3, 0x28), Uint8Array.of(123)]) {
    const response = new Response(body, { status: 502 })
    assert.deepEqual(await readBoundedAdamError(response, options()), { code: 'FOUNDER_VOICE_UNAVAILABLE' })
  }
})
