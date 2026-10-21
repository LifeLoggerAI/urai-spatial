import test from 'node:test';
import assert from 'node:assert/strict';
import { readAuthorizedAdamVoice } from '../src/spatial/adam/adamVoiceResponseBoundary.mjs';

test('probe: owner change without abort while private voice read is stalled', async () => {
  let cancelled = false;
  const controller = new AbortController();
  const body = new ReadableStream({
    start(c) { c.enqueue(Uint8Array.of(45)); },
    pull() { /* deliberately never release the pending next read */ },
    cancel() { cancelled = true; },
  }, { highWaterMark: 0 });
  let authorized = true;
  const work = readAuthorizedAdamVoice(new Response(body, { headers: { 'content-type': 'audio/mpeg' } }), {
    signal: controller.signal, isAuthorized: () => authorized,
  });
  // A response is pending, then the current Firebase identity/consent changes.
  await new Promise(resolve => setTimeout(resolve, 15));
  authorized = false;
  const result = await Promise.race([
    work.then(() => 'accepted', () => 'denied'),
    new Promise(resolve => setTimeout(() => resolve('still_pending'), 90)),
  ]);
  controller.abort();
  await work.catch(() => {});
  assert.equal(result, 'denied', 'owner rotation must close a stalled private stream without an explicit abort');
  assert.equal(cancelled, true);
});
