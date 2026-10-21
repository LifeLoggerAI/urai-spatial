import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readBoundedPrivateMovieBlob } from '../src/app/replay/privateMovieResponseBoundary.mjs'

function stream(chunks, { onCancel = () => {}, beforeSecond = () => {} } = {}) {
  let index = 0
  return new Response(new ReadableStream({
    pull(controller) {
      if (index === 1) beforeSecond()
      if (index < chunks.length) controller.enqueue(chunks[index++])
      else controller.close()
    },
    cancel(reason) { onCancel(reason) },
  }))
}
const token = () => ({ signal: new AbortController().signal, isCurrent: () => true })

test('exact private video bytes produce valid MP4 Blob', async () => {
  const payload = stream([Uint8Array.of(1, 2), Uint8Array.of(3, 4)])
  const blob = await readBoundedPrivateMovieBlob(payload, { kind: 'mp4', expectedBytes: 4, ...token() })
  assert.equal(blob.size, 4)
  assert.equal(blob.type, 'video/mp4')
  assert.deepEqual([...new Uint8Array(await blob.arrayBuffer())], [1, 2, 3, 4])
})

test('SRT remains a separate 2 MiB class', async () => {
  const blob = await readBoundedPrivateMovieBlob(stream([Uint8Array.of(65, 66)]),
    { kind: 'srt', expectedBytes: 2, ...token() })
  assert.equal(blob.type, 'application/x-subrip')
  assert.equal(await blob.text(), 'AB')
})

test('advertised small length cannot admit a larger actual stream', async () => {
  let cancelled = false
  const response = stream([Uint8Array.of(1, 2, 3, 4, 5)], { onCancel: () => { cancelled = true } })
  await assert.rejects(readBoundedPrivateMovieBlob(response, { kind: 'mp4', expectedBytes: 3, ...token() }), /private_movie_delivery_unavailable/)
  assert.equal(cancelled, true)
})

test('truncated response is denied', async () => {
  await assert.rejects(readBoundedPrivateMovieBlob(stream([Uint8Array.of(1)]),
    { kind: 'mp4', expectedBytes: 2, ...token() }), /private_movie_delivery_unavailable/)
})

test('missing body is denied before media construction', async () => {
  await assert.rejects(readBoundedPrivateMovieBlob(new Response(null),
    { kind: 'mp4', expectedBytes: 1, ...token() }), /private_movie_delivery_unavailable/)
})

test('untrusted kind cannot inherit the video ceiling', async () => {
  let cancelled = false
  const response = stream([Uint8Array.of(5)], { onCancel: () => { cancelled = true } })
  await assert.rejects(readBoundedPrivateMovieBlob(response,
    { kind: 'unknown', expectedBytes: 1, ...token() }), /private_movie_delivery_unavailable/)
  assert.equal(cancelled, true)
})

test('declared MP4 over 64 MiB is rejected before consumption', async () => {
  let cancelled = false
  const response = stream([Uint8Array.of(1)], { onCancel: () => { cancelled = true } })
  await assert.rejects(readBoundedPrivateMovieBlob(response,
    { kind: 'mp4', expectedBytes: 64 * 1024 * 1024 + 1, ...token() }), /private_movie_delivery_unavailable/)
  assert.equal(cancelled, true)
})

test('declared SRT over 2 MiB is rejected before consumption', async () => {
  const response = stream([Uint8Array.of(1)])
  await assert.rejects(readBoundedPrivateMovieBlob(response,
    { kind: 'srt', expectedBytes: 2 * 1024 * 1024 + 1, ...token() }), /private_movie_delivery_unavailable/)
})

test('a stale owner is denied and unread payload canceled', async () => {
  let cancelled = false
  const response = stream([Uint8Array.of(1)], { onCancel: () => { cancelled = true } })
  await assert.rejects(readBoundedPrivateMovieBlob(response,
    { kind: 'mp4', expectedBytes: 1, signal: new AbortController().signal, isCurrent: () => false }), /private_movie_delivery_unavailable/)
  assert.equal(cancelled, true)
})

test('an owner change between streamed chunks fails closed', async () => {
  let current = true, cancelled = false
  const response = stream([Uint8Array.of(1), Uint8Array.of(2)],
    { beforeSecond: () => { current = false }, onCancel: () => { cancelled = true } })
  await assert.rejects(readBoundedPrivateMovieBlob(response,
    { kind: 'mp4', expectedBytes: 2, signal: new AbortController().signal, isCurrent: () => current }), /private_movie_delivery_unavailable/)
  assert.equal(cancelled, true)
})

test('aborted session is denied even when valid bytes were buffered', async () => {
  const controller = new AbortController()
  const response = stream([Uint8Array.of(1), Uint8Array.of(2)],
    { beforeSecond: () => controller.abort() })
  await assert.rejects(readBoundedPrivateMovieBlob(response,
    { kind: 'mp4', expectedBytes: 2, signal: controller.signal, isCurrent: () => true }), /private_movie_delivery_unavailable/)
})

test('zero and unsafe lengths cannot initiate private downloads', async () => {
  for (const n of [0, -1, 0.5, Number.NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) {
    await assert.rejects(readBoundedPrivateMovieBlob(stream([Uint8Array.of(1)]),
      { kind: 'mp4', expectedBytes: n, ...token() }), /private_movie_delivery_unavailable/)
  }
})
