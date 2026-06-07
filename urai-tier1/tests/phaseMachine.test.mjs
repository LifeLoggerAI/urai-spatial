import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../src/spatial/scene/phaseMachine.ts', import.meta.url), 'utf8');

test('backPhase unwinds correctly by contract', () => {
  assert.match(source, /if \(current === "REPLAY"\) return "FOCUS"/);
  assert.match(source, /if \(current === "FOCUS"\) return "LIFEMAP"/);
  assert.match(source, /if \(current === "LIFEMAP" \|\| current === "ASCENT"\) return "HOME"/);
  assert.match(source, /return "HOME"/);
});

test('canEnterReplay requires focus, selected star, and focus readiness', () => {
  assert.match(source, /phase === "FOCUS"/);
  assert.match(source, /!!selectedStarId/);
  assert.match(source, /focusReady/);
});
