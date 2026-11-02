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

// The authenticated segmented timeline must have the same streaming byte and
// session enforcement as its protected MP4/SRT media, before JSON.parse().
const TIMELINE_MAX = 96 * 1024
const timelineReader = async (...args) => {
  const { readBoundedPrivateMovieTimelineText } = await import('../src/app/replay/privateMovieResponseBoundary.mjs')
  assert.equal(typeof readBoundedPrivateMovieTimelineText, 'function', 'production timeline reader must exist')
  return readBoundedPrivateMovieTimelineText(...args)
}

test('private timeline accepts bounded chunked Unicode JSON using byte count', async () => {
  const bytes = new TextEncoder().encode(JSON.stringify({ movie: '🌟', segments: [1, 2] }))
  const payload = stream([bytes.subarray(0, 5), bytes.subarray(5)], {})
  const decoded = await timelineReader(payload, token())
  assert.deepEqual(JSON.parse(decoded), { movie: '🌟', segments: [1, 2] })
})

test('private timeline does not trust advertised small Content-Length for actual body size', async () => {
  let cancelled = false
  const payload = new Response(new ReadableStream({
    start(controller) { controller.enqueue(new Uint8Array(TIMELINE_MAX + 1)) },
    cancel() { cancelled = true },
  }), { headers: { 'content-length': '1' } })
  await assert.rejects(timelineReader(payload, token()), /private_timeline_size_invalid/)
  assert.equal(cancelled, true)
})

test('private timeline oversized advertised response is canceled before consumption', async () => {
  let cancelled = false
  const payload = stream([Uint8Array.of(123)], { onCancel: () => { cancelled = true } })
  payload.headers.set('content-length', String(TIMELINE_MAX + 1))
  await assert.rejects(timelineReader(payload, token()), /private_timeline_size_invalid/)
  assert.equal(cancelled, true)
})

test('private timeline invalid UTF-8 fails closed', async () => {
  const payload = stream([Uint8Array.of(0xc3, 0x28)])
  await assert.rejects(timelineReader(payload, token()), /private_timeline_size_invalid/)
})

test('private timeline stale owner is denied and unread bytes are canceled', async () => {
  let cancelled = false
  const payload = stream([Uint8Array.of(123)], { onCancel: () => { cancelled = true } })
  await assert.rejects(timelineReader(payload, { signal: new AbortController().signal, isCurrent: () => false }), /private_timeline_size_invalid/)
  assert.equal(cancelled, true)
})

test('private timeline owner change during streaming cancels remaining response', async () => {
  let current = true, cancelled = false
  const payload = stream([Uint8Array.of(123), Uint8Array.of(125)], {
    beforeSecond: () => { current = false }, onCancel: () => { cancelled = true },
  })
  await assert.rejects(timelineReader(payload, { signal: new AbortController().signal, isCurrent: () => current }), /private_timeline_size_invalid/)
  assert.equal(cancelled, true)
})

test('private timeline abort cancels a network read which is waiting forever', async () => {
  const controller = new AbortController()
  let canceled = false
  let sawWaitingRead
  const waiting = new Promise(resolve => { sawWaitingRead = resolve })
  const payload = new Response(new ReadableStream({
    pull() { sawWaitingRead() },
    cancel() { canceled = true },
  }, { highWaterMark: 0 }), { headers: { 'content-type': 'application/json' } })
  const pending = timelineReader(payload, { signal: controller.signal, isCurrent: () => !controller.signal.aborted })
  await waiting
  controller.abort()
  const timeout = Symbol('stalled')
  let timer
  try {
    const result = await Promise.race([
      pending.then(() => 'resolved', () => 'rejected'),
      new Promise(resolve => { timer = setTimeout(() => resolve(timeout), 100) }),
    ])
    assert.notEqual(result, timeout, 'aborting a stalled private timeline read must settle promptly')
    assert.equal(result, 'rejected')
    assert.equal(canceled, true)
  } finally { clearTimeout(timer) }
})


for (const kind of ['mp4', 'timeline']) {
  test('private ' + kind + ' stalled network read is canceled when owner rotates without abort', async () => {
    let ownerCurrent = true
    let canceled = false
    let enteredRead
    const waiting = new Promise(resolve => { enteredRead = resolve })
    const response = new Response(new ReadableStream({
      pull() { enteredRead() },
      cancel() { canceled = true },
    }, { highWaterMark: 0 }))
    const controller = new AbortController()
    const pending = kind === 'mp4'
      ? readBoundedPrivateMovieBlob(response, {
        kind: 'mp4', expectedBytes: 1, signal: controller.signal, isCurrent: () => ownerCurrent,
      })
      : timelineReader(response, {
        signal: controller.signal, isCurrent: () => ownerCurrent,
      })
    await waiting
    ownerCurrent = false
    let timer
    try {
      const outcome = await Promise.race([
        pending.then(() => 'resolved', () => 'rejected'),
        new Promise(resolve => { timer = setTimeout(() => resolve('timed-out'), 1000) }),
      ])
      assert.equal(outcome, 'rejected', 'stale private stream must settle without network progress')
      assert.equal(canceled, true, 'stale private network response must be canceled')
    } finally {
      clearTimeout(timer)
      controller.abort()
      await pending.catch(() => {})
    }
  })
}


for (const kind of ['mp4', 'timeline']) {
  for (const [label, authority] of [
    ['asynchronous authorization', () => Promise.resolve(true)],
    ['thrown authorization lookup', () => { throw new Error('owner unavailable') }],
    ['truthy non-boolean authorization', () => 'true'],
  ]) {
    test('private ' + kind + ' fails closed on ' + label, async () => {
      let canceled = false
      const payload = stream([Uint8Array.of(123)], { onCancel: () => { canceled = true } })
      const options = { signal: new AbortController().signal, isCurrent: authority }
      const request = kind === 'mp4'
        ? readBoundedPrivateMovieBlob(payload, { kind: 'mp4', expectedBytes: 1, ...options })
        : timelineReader(payload, options)
      await assert.rejects(request, kind === 'mp4'
        ? /private_movie_delivery_unavailable/
        : /private_timeline_size_invalid/)
      assert.equal(canceled, true, 'denied private payload must be disposed')
    })
  }
}

test('HTTP 403 cannot masquerade as an authorized playable private movie', async () => {
  const response = new Response(Uint8Array.of(65, 66, 67), {
    status: 403, headers: { 'content-type': 'video/mp4' },
  })
  await assert.rejects(readBoundedPrivateMovieBlob(response, {
    kind: 'mp4', expectedBytes: 3, ...token(),
  }), /private_movie_delivery_unavailable/)
})

test('HTTP 403 cannot masquerade as an authorized private timeline', async () => {
  const response = new Response('{"private":"denied"}', {
    status: 403, headers: { 'content-type': 'application/json' },
  })
  await assert.rejects(timelineReader(response, token()), /private_timeline_size_invalid/)
})

for (const kind of ['mp4', 'timeline']) {
  test('non-success ' + kind + ' response cancels unread private bytes', async () => {
    let canceled = false
    const body = new ReadableStream({ cancel() { canceled = true } }, { highWaterMark: 0 })
    const response = new Response(body, { status: 401 })
    const request = kind === 'mp4'
      ? readBoundedPrivateMovieBlob(response, { kind: 'mp4', expectedBytes: 1, ...token() })
      : timelineReader(response, token())
    await assert.rejects(request, kind === 'mp4'
      ? /private_movie_delivery_unavailable/
      : /private_timeline_size_invalid/)
    assert.equal(canceled, true, 'denied private bytes must be canceled at the source')
  })
}

test('a 200 HTML response with matching MP4 bytes fails the inner Replay MIME boundary', async () => {
  const response = new Response(Uint8Array.of(65, 66, 67), {
    status: 200, headers: { 'content-type': 'text/html' },
  })
  await assert.rejects(readBoundedPrivateMovieBlob(response, {
    kind: 'mp4', expectedBytes: 3, ...token(),
  }), /private_movie_delivery_unavailable/)
})

test('a 200 HTML response cannot be admitted as SRT subtitle media', async () => {
  const response = new Response(Uint8Array.of(65, 66, 67), {
    status: 200, headers: { 'content-type': 'text/html' },
  })
  await assert.rejects(readBoundedPrivateMovieBlob(response, {
    kind: 'srt', expectedBytes: 3, ...token(),
  }), /private_movie_delivery_unavailable/)
})

test('a 200 HTML response cannot be admitted as protected timeline metadata', async () => {
  const response = new Response('{"private":"denied"}', {
    status: 200, headers: { 'content-type': 'text/html' },
  })
  await assert.rejects(timelineReader(response, token()), /private_timeline_size_invalid/)
})

for (const kind of ['mp4', 'timeline']) {
  test('incompatible advertised private ' + kind + ' MIME cancels unread response bytes', async () => {
    let canceled = false
    const body = new ReadableStream({
      pull(controller) { controller.enqueue(Uint8Array.of(65)); controller.close() },
      cancel() { canceled = true },
    }, { highWaterMark: 0 })
    const response = new Response(body, { status: 200, headers: { 'content-type': 'text/html' } })
    const request = kind === 'mp4'
      ? readBoundedPrivateMovieBlob(response, { kind: 'mp4', expectedBytes: 1, ...token() })
      : timelineReader(response, token())
    await assert.rejects(request, kind === 'mp4'
      ? /private_movie_delivery_unavailable/
      : /private_timeline_size_invalid/)
    assert.equal(canceled, true, 'mismatched private response must be disposed')
  })
}

for (const kind of ['mp4', 'timeline']) {
  test('silent private stream is canceled and denied without waiting for owner revocation: ' + kind, async () => {
    let canceled = false
    const stream = new ReadableStream({
      pull() {},
      cancel() { canceled = true },
    }, { highWaterMark: 0 })
    const response = new Response(stream, {
      status: 200,
      headers: { 'content-type': kind === 'mp4' ? 'video/mp4' : 'application/json' },
    })
    const request = kind === 'mp4'
      ? readBoundedPrivateMovieBlob(response, {
        kind: 'mp4', expectedBytes: 1, ...token(), readStallMs: 25,
      })
      : timelineReader(response, { ...token(), readStallMs: 25 })
    await assert.rejects(request, kind === 'mp4'
      ? /private_movie_delivery_unavailable/
      : /private_timeline_size_invalid/)
    assert.equal(canceled, true, 'silent private response must release its stream')
  })
}

for (const kind of ['mp4', 'timeline']) {
  test('empty chunks cannot keep a private ' + kind + ' download alive without progress', async () => {
    let pulls = 0, canceled = false
    const response = new Response(new ReadableStream({
      pull(controller) {
        if (pulls++ < 20) controller.enqueue(new Uint8Array(0))
        else { controller.enqueue(Uint8Array.of(65)); controller.close() }
      },
      cancel() { canceled = true },
    }, { highWaterMark: 0 }), { status: 200 })
    const request = kind === 'mp4'
      ? readBoundedPrivateMovieBlob(response, { kind: 'mp4', expectedBytes: 1, ...token(), readStallMs: 30 })
      : timelineReader(response, { ...token(), readStallMs: 30 })
    await assert.rejects(request, kind === 'mp4'
      ? /private_movie_delivery_unavailable/
      : /private_timeline_size_invalid/)
    assert.equal(canceled, true)
  })
}
