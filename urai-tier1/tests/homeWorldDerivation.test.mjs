import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const source = readFileSync(new URL('../src/spatial/home/deriveHomeWorldStateFromSignals.ts', import.meta.url), 'utf8');

function expectContains(name, pattern) {
  test(name, () => assert.match(source, pattern));
}

expectContains('stable inputs preserve tier through hysteresis', /applyHysteresis[\s\S]*previousTier[\s\S]*return previousTier/);
expectContains('strong recovery can lift ground before sky through weighted channels', /ground:[\s\S]*recoveryScore[\s\S]*0\.28[\s\S]*sky:/);
expectContains('low confidence holds downgrade unless movement is extreme', /confidence < 0\.45[\s\S]*Math\.abs\(directTier - previousTier\) < 2[\s\S]*return previousTier/);
expectContains('disabled signal has no effect through enabled gate', /enabledSources\?\.\[signal\] === false \? 0 : 1/);
expectContains('freshness decay reduces influence', /Math\.pow\(0\.5, ageHours \/ halfLifeHours\)/);
expectContains('missing signals avoid NaN by using fallback weighted mean', /if \(totalWeight <= 0\) return fallback/);
expectContains('EMA smoothing reduces abrupt changes', /previous \* \(1 - alpha\) \+ current \* alpha/);
expectContains('hysteresis prevents threshold flicker with asymmetric margins', /UP_MARGIN = 4[\s\S]*DOWN_MARGIN = 8/);
expectContains('count saturation is exponential for rituals and memories', /1 - Math\.exp\(-count \/ saturationPoint\)/);
