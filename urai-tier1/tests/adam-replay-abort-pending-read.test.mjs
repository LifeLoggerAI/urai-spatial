import test from 'node:test';
import assert from 'node:assert/strict';
import { readAuthorizedAdamVoice } from '../src/spatial/adam/adamVoiceResponseBoundary.mjs';
import { readBoundedPrivateMovieBlob } from '../src/app/replay/privateMovieResponseBoundary.mjs';

function suspendedResponse(type, onReadPending) {
  let controller;
  let cancelled = false;
  const body = new ReadableStream({
    start(c) { controller = c; c.enqueue(Uint8Array.of(65)); },
    pull() { queueMicrotask(onReadPending); },
    cancel() { cancelled = true; },
  }, { highWaterMark: 0 });
  return {
    response: new Response(body, { status: 200, headers: { 'content-type': type, 'content-length': '2' } }),
    release() { try { controller.close(); } catch {} },
    cancelled() { return cancelled; },
  };
}
async function mustRejectOnAbort(promise, controller, stream) {
  const pending = Symbol('pending');
  let timer;
  try {
    const outcome = await Promise.race([
      promise.then(() => 'resolved', () => 'rejected'),
      new Promise(resolve => { timer = setTimeout(() => resolve(pending), 70); }),
    ]);
    assert.notEqual(outcome, pending, 'private network read must stop immediately when caller aborts');
    assert.equal(outcome, 'rejected', 'aborted private bytes must never become playable');
    assert.equal(stream.cancelled(), true, 'unread private bytes must be canceled at their source');
  } finally {
    clearTimeout(timer);
    stream.release();
    await promise.catch(() => {});
  }
}

test('Replay abort during stalled private MP4 read interrupts the pending reader', async () => {
  const controller = new AbortController();
  const stream = suspendedResponse('video/mp4', () => controller.abort());
  const read = readBoundedPrivateMovieBlob(stream.response,
    { kind: 'mp4', expectedBytes: 2, signal: controller.signal, isCurrent: () => !controller.signal.aborted });
  await mustRejectOnAbort(read, controller, stream);
});

test('ADAM abort during stalled voice read interrupts the pending reader', async () => {
  const controller = new AbortController();
  const stream = suspendedResponse('audio/mpeg', () => controller.abort());
  const read = readAuthorizedAdamVoice(stream.response,
    { signal: controller.signal, isAuthorized: () => !controller.signal.aborted });
  await mustRejectOnAbort(read, controller, stream);
});
