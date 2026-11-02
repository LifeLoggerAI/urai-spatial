import test from 'node:test';
import assert from 'node:assert/strict';
import { requireStableLifeMapArrival } from '../scripts/genesis-lifemap-stable-arrival.mjs';

test('a genuinely ready destination is sampled throughout at least 900 ms', async () => {
  let now = 10_000;
  const samples = [];
  const proof = await requireStableLifeMapArrival({
    now: () => now,
    sleep: async ms => { assert.ok(ms > 0 && ms <= 75); now += ms; },
    isReady: async () => { samples.push(now); return true; },
  });
  assert.equal(proof.stableMs, 900);
  assert.equal(proof.samples, 13);
  assert.equal(samples[0], 10_000);
  assert.equal(samples.at(-1), 10_900);
});

test('a short not-ready interval cannot masquerade as stable arrival', async () => {
  let now = 10_000;
  await assert.rejects(
    requireStableLifeMapArrival({
      now: () => now,
      sleep: async ms => { now += ms; },
      isReady: async () => now !== 10_300, // Both old endpoints would appear ready.
    }), /LIFEMAP_REAL_WEBGL_NOT_STABLE/,
  );
});

test('unavailable readiness and a nonmonotonic clock fail closed', async () => {
  let now = 10_000;
  await assert.rejects(
    requireStableLifeMapArrival({
      now: () => now,
      sleep: async ms => { now += ms; },
      isReady: async () => { throw Error('WebGL context lost'); },
    }), /LIFEMAP_REAL_WEBGL_NOT_STABLE/,
  );
  await assert.rejects(
    requireStableLifeMapArrival({
      now: () => now,
      sleep: async () => { now -= 100; },
      isReady: async () => true,
    }), /LIFEMAP_REAL_WEBGL_NOT_STABLE/,
  );
});

test('a stuck clock or merely truthy ready value cannot be accepted', async () => {
  await assert.rejects(
    requireStableLifeMapArrival({ now: () => 10_000, sleep: async () => {}, isReady: async () => true }),
    /LIFEMAP_REAL_WEBGL_NOT_STABLE/,
  );
  await assert.rejects(
    requireStableLifeMapArrival({ now: () => 10_000, sleep: async () => {}, isReady: async () => 'true' }),
    /LIFEMAP_REAL_WEBGL_NOT_STABLE/,
  );
});
