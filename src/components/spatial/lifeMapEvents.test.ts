import test from 'node:test';
import assert from 'node:assert/strict';
import { createNarratorDetail } from './lifeMapEvents.ts';

test('glow payload shape allows nullable chapter/emotion', () => {
  const detail = createNarratorDetail({ event: 'lifemap.star.glow', starId: 'star-a', chapterId: null, emotion: null });
  assert.equal(detail.event, 'lifemap.star.glow');
  assert.equal(detail.starId, 'star-a');
  assert.equal(detail.chapterId, null);
  assert.equal(detail.emotion, null);
  assert.ok(typeof detail.timestamp === 'number');
  assert.ok(!('action' in detail));
});

test('focus payload shape requires star/chapter/emotion', () => {
  const detail = createNarratorDetail({ event: 'lifemap.star.focus', starId: 'star-b', chapterId: 'threshold', emotion: 'focus', action: 'replay' });
  assert.equal(detail.event, 'lifemap.star.focus');
  assert.equal(detail.chapterId, 'threshold');
  assert.equal(detail.emotion, 'focus');
  assert.equal(detail.action, 'replay');
});

test('cluster payload shape contains chapter only', () => {
  const detail = createNarratorDetail({ event: 'lifemap.cluster.focus', chapterId: 'recovery-arc' });
  assert.equal(detail.event, 'lifemap.cluster.focus');
  assert.equal(detail.chapterId, 'recovery-arc');
  assert.ok(!('starId' in detail));
  assert.ok(!('emotion' in detail));
});

test('resolved payload shape enforces resolve action', () => {
  const detail = createNarratorDetail({ event: 'lifemap.star.resolved', starId: 'star-c', chapterId: 'mirror-of-becoming', emotion: 'mirror', action: 'resolve' });
  assert.equal(detail.event, 'lifemap.star.resolved');
  assert.equal(detail.action, 'resolve');
  assert.equal(detail.starId, 'star-c');
});
