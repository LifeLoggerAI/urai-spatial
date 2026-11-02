import test from 'node:test'
import assert from 'node:assert/strict'
import {
  readBoundedPrivateMovieBlob,
  readBoundedPrivateMovieTimelineText,
} from '../src/app/replay/privateMovieResponseBoundary.mjs'

const sleep = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds))

for (const [kind, start] of [
  ['private MP4', (response, actor) => readBoundedPrivateMovieBlob(response, {
    kind: 'mp4', expectedBytes: 2, ...actor,
  })],
  ['private timeline', (response, actor) => readBoundedPrivateMovieTimelineText(response, actor)],
]) {
  test(`${kind}: account changes during indefinitely stalled read without abort`, async () => {
    let allowed = true
    let canceled = false
    const ctrl = new AbortController()
    const stream = new ReadableStream({
      start(controller) { controller.enqueue(Uint8Array.of(123)) },
      pull() {},
      cancel() { canceled = true },
    }, { highWaterMark: 0 })
    const read = start(new Response(stream), { signal: ctrl.signal, isCurrent: () => allowed })
    try {
      await sleep(15)
      allowed = false
      const outcome = await Promise.race([
        read.then(() => 'authorized', () => 'denied'),
        sleep(250).then(() => 'stalled'),
      ])
      assert.equal(outcome, 'denied', 'owner change must interrupt pending private read')
      assert.equal(canceled, true, 'stale owner must cancel original response stream')
    } finally {
      ctrl.abort()
      await read.catch(() => {})
    }
  })
  test(`${kind}: authorized slow stream completes correctly`, async () => {
    let step = 0
    const stream = new ReadableStream({
      async pull(controller) {
        if (step++ === 0) controller.enqueue(Uint8Array.of(123))
        else { await sleep(100); controller.enqueue(Uint8Array.of(125)); controller.close() }
      },
    }, { highWaterMark: 0 })
    const result = await start(new Response(stream), {
      signal: new AbortController().signal, isCurrent: () => true,
    })
    if (kind === 'private MP4') assert.deepEqual([...new Uint8Array(await result.arrayBuffer())], [123, 125])
    else assert.equal(result, '{}')
  })
  test(`${kind}: authorization checker exception mid-stream fails closed`, async () => {
    let explode = false
    let canceled = false
    const ctrl = new AbortController()
    const stream = new ReadableStream({
      start(controller) { controller.enqueue(Uint8Array.of(123)) },
      pull() {},
      cancel() { canceled = true },
    }, { highWaterMark: 0 })
    const read = start(new Response(stream), {
      signal: ctrl.signal,
      isCurrent: () => { if (explode) throw Error('private checker internal details'); return true },
    })
    try {
      await sleep(15)
      explode = true
      const outcome = await Promise.race([read.then(() => 'authorized', error => error.message), sleep(250).then(() => 'stalled')])
      assert.equal(outcome, kind === 'private MP4' ? 'private_movie_delivery_unavailable' : 'private_timeline_size_invalid')
      assert.equal(canceled, true)
    } finally {
      ctrl.abort()
      await read.catch(() => {})
    }
  })
}
