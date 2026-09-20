import assert from 'node:assert/strict';
import test from 'node:test';
import { decideStripeEventApplication } from '../src/lib/server/stripe-event-order.ts';

const decide = (currentEventCreated, currentStatus, incomingEventCreated, incomingStatus) =>
  decideStripeEventApplication({ currentEventCreated, currentStatus, incomingEventCreated, incomingStatus });

test('newer lifecycle events apply in order', () => {
  assert.deepEqual(decide(100, 'trialing', 101, 'active'), { apply: true, reason: 'applied' });
  assert.deepEqual(decide(101, 'active', 102, 'canceled'), { apply: true, reason: 'applied' });
});

test('a delayed update cannot resurrect a canceled entitlement', () => {
  assert.deepEqual(decide(200, 'canceled', 199, 'active'), { apply: false, reason: 'stale-event' });
});

test('cancellation wins when processor timestamps tie', () => {
  assert.deepEqual(decide(300, 'canceled', 300, 'active'), { apply: false, reason: 'cancellation-precedence' });
  assert.deepEqual(decide(300, 'canceled', 300, 'past_due'), { apply: false, reason: 'cancellation-precedence' });
});

test('a later paid recovery may restore access after a prior failure', () => {
  assert.deepEqual(decide(400, 'past_due', 401, 'active'), { apply: true, reason: 'applied' });
});

test('a stale payment failure cannot override a newer paid state', () => {
  assert.deepEqual(decide(500, 'active', 499, 'past_due'), { apply: false, reason: 'stale-event' });
});

test('same-timestamp non-cancellation transitions remain deterministic and applicable', () => {
  assert.deepEqual(decide(600, 'past_due', 600, 'active'), { apply: true, reason: 'applied' });
});
