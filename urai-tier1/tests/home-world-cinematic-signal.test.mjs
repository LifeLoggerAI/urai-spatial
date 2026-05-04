import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { deriveStableHomeWorldStateFromSignals } from '../src/spatial/home/signal/homeWorldSignalDerivation.ts'

const root = process.cwd()
function read(file) {
  return fs.readFileSync(path.join(root, file), 'utf8')
}

const previous = {
  version: 3,
  userId: 'demo-user',
  groundTier: 2,
  orbTier: 2,
  skyTier: 2,
  moodState: 'calm',
  recoveryState: 'recovering',
  energyScore: 36,
  narratorSpeaking: false,
  skyWeatherIntensity: 0.32,
  groundGrowthIntensity: 0.3,
  orbPulseIntensity: 0.34,
  rawScores: { ground: 35, orb: 35, sky: 35 },
  smoothedScores: { ground: 35, orb: 35, sky: 35 },
  confidence: { overall: 0.5, ground: 0.5, orb: 0.5, sky: 0.5, label: 'medium' },
  sourceCoverage: { ground: 0.5, orb: 0.5, sky: 0.5 },
  lastDerivedAt: '2026-01-01T00:00:00.000Z',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

test('cinematic HomeScene is wired into active SpatialHomeWorld', () => {
  const spatial = read('src/spatial/home/SpatialHomeWorld.tsx')
  const homeScene = read('src/spatial/home/visual/HomeScene.tsx')
  const layout = read('src/app/layout.tsx')

  assert.match(spatial, /HomeScene/)
  assert.match(spatial, /data-testid="urai-spatial-stage"/)
  assert.match(layout, /HomeScene\.css/)
  assert.match(homeScene, /data-testid="urai-home-scene"/)
  assert.match(homeScene, /data-testid="urai-orb-button"/)
  assert.match(homeScene, /data-testid="urai-command-ribbon"/)
  assert.match(homeScene, /aria-label="Enter Life Map"/)
})

test('cinematic HomeScene preserves tier data attributes and reduced-motion styles', () => {
  const homeScene = read('src/spatial/home/visual/HomeScene.tsx')
  const css = read('src/spatial/home/visual/HomeScene.css')

  for (const attr of ['data-ground-tier', 'data-orb-tier', 'data-sky-tier', 'data-mood', 'data-recovery', 'data-energy', 'data-narrator-speaking']) {
    assert.match(homeScene, new RegExp(attr))
  }

  assert.match(css, /prefers-reduced-motion/)
  assert.match(css, /orb-companion/)
  assert.match(css, /urai-horizon-system/)
  assert.match(css, /avatar-chest-glow/)
})

test('stable derivation upgrades gradually when confidence and signals are strong', () => {
  const result = deriveStableHomeWorldStateFromSignals({
    userId: 'demo-user',
    previousState: previous,
    now: '2026-01-02T00:00:00.000Z',
    points: [
      { source: 'sleep', value: 88, confidence: 0.9, timestamp: '2026-01-02T00:00:00.000Z' },
      { source: 'movement', value: 84, confidence: 0.9, timestamp: '2026-01-02T00:00:00.000Z' },
      { source: 'rituals', value: 90, confidence: 0.92, timestamp: '2026-01-02T00:00:00.000Z' },
      { source: 'streaks', value: 86, confidence: 0.9, timestamp: '2026-01-02T00:00:00.000Z' },
      { source: 'stress', value: 18, confidence: 0.88, timestamp: '2026-01-02T00:00:00.000Z' },
    ],
    sevenDay: { sleep: 82, movement: 84, rituals: 86, streaks: 80, stress: 22 },
    thirtyDay: { sleep: 72, movement: 70, rituals: 74, streaks: 68, stress: 32 },
  })

  assert.equal(result.state.groundTier, 3)
  assert.ok(result.confidence > 0.62)
  assert.ok(result.explanations.length >= 4)
})

test('stable derivation holds tier when confidence is low', () => {
  const result = deriveStableHomeWorldStateFromSignals({
    userId: 'demo-user',
    previousState: previous,
    points: [{ source: 'rituals', value: 100, confidence: 0.2, timestamp: '2026-01-02T00:00:00.000Z' }],
  })

  assert.equal(result.state.groundTier, previous.groundTier)
  assert.equal(result.shouldHoldTier, true)
})

test('stable derivation avoids harsh downgrade from one isolated heavy day', () => {
  const result = deriveStableHomeWorldStateFromSignals({
    userId: 'demo-user',
    previousState: { ...previous, groundTier: 4, orbTier: 4, skyTier: 4 },
    points: [{ source: 'stress', value: 100, confidence: 0.7, timestamp: '2026-01-02T00:00:00.000Z' }],
    sevenDay: { stress: 44, sleep: 64, movement: 58 },
    thirtyDay: { stress: 38, sleep: 66, movement: 62 },
  })

  assert.ok(result.state.groundTier >= 3)
  assert.ok(result.explanations.every((item) => !item.privacySafeSummary.toLowerCase().includes('diagnosis')))
})
