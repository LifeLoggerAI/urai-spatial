import test from 'node:test';
import assert from 'node:assert/strict';
import { backPhase, canEnterReplay } from '../src/spatial/scene/phaseMachine.ts';

test('backPhase unwinds correctly', () => {
  assert.equal(backPhase('REPLAY'), 'FOCUS');
  assert.equal(backPhase('FOCUS'), 'LIFEMAP');
  assert.equal(backPhase('LIFEMAP'), 'HOME');
  assert.equal(backPhase('ASCENT'), 'HOME');
  assert.equal(backPhase('HOME'), 'HOME');
});

test('canEnterReplay requires focus + selected + focusReady', () => {
  assert.equal(canEnterReplay('FOCUS', 'star-1', true), true);
  assert.equal(canEnterReplay('FOCUS', null, true), false);
  assert.equal(canEnterReplay('LIFEMAP', 'star-1', true), false);
  assert.equal(canEnterReplay('FOCUS', 'star-1', false), false);
});
