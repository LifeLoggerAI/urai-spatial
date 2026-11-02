import test from 'node:test';
import assert from 'node:assert/strict';
import { readAuthorizedAdamVoice } from '../src/spatial/adam/adamVoiceResponseBoundary.mjs';

const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

// Supplemental local tests for the proposed owner-check cancellation logic.
test('slow but still-authorized private voice completes normally', async () => {
  let stage = 0;
  const stream = new ReadableStream({
    async pull(c) {
      if (stage++ === 0) c.enqueue(Uint8Array.of(30));
      else { await wait(125); c.enqueue(Uint8Array.of(31)); c.close(); }
    },
  }, { highWaterMark: 0 });
  const blob = await readAuthorizedAdamVoice(new Response(stream, {
    headers: { 'content-type': 'audio/mpeg', 'content-length': '2' },
  }), { signal: new AbortController().signal, isAuthorized: () => true });
  assert.deepEqual([...new Uint8Array(await blob.arrayBuffer())], [30, 31]);
});

test('owner checker exceptions while read is pending deny private stream', async () => {
  let checkThrows = false;
  let cancelled = false;
  const stream = new ReadableStream({
    start(c) { c.enqueue(Uint8Array.of(30)); },
    pull() {},
    cancel() { cancelled = true; },
  }, { highWaterMark: 0 });
  const ac = new AbortController();
  const work = readAuthorizedAdamVoice(new Response(stream, {
    headers: { 'content-type': 'audio/mpeg' },
  }), {signal: ac.signal, isAuthorized: () => {if (checkThrows) throw new Error('auth unavailable'); return true; }});
  await wait(10);
  checkThrows = true;
  const outcome = await Promise.race([work.then(() => 'accepted', () => 'denied'), wait(170).then(() => 'stalled')]);
  ac.abort();
  await work.catch(() => {});
  assert.equal(outcome, 'denied');
  assert.equal(cancelled, true);
});

test('authorization check stops polling after successful completion', async () => {
  let calls = 0;
  const stream = new ReadableStream({
    start(c) { c.enqueue(Uint8Array.of(51)); c.close(); },
  });
  await readAuthorizedAdamVoice(new Response(stream, {headers: {'content-type':'audio/mpeg'}}), {
    signal: new AbortController().signal, isAuthorized: () => {calls++;return true;},
  });
  const after = calls;
  await wait(110);
  assert.equal(calls, after);
});
