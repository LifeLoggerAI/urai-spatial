import assert from 'node:assert/strict'
import test from 'node:test'
import {
  aggregateGlobalEmotionalWeather,
  normalizeGlobalWeatherPolicy,
} from '../src/lib/uraiEmotion/globalWeatherPrivacy.ts'

const now = Date.UTC(2026, 9, 1, 3, 0, 0)
const baseContribution = {
  consented: true,
  capturedAt: now - 60_000,
  latitude: 32.512345,
  longitude: -94.734567,
  state: 'Calm',
  confidence: 0.9,
}

function cohort(count, override = {}) {
  return Array.from({ length: count }, (_, index) => ({
    ...baseContribution,
    participantId: `person-${index + 1}`,
    ...override,
  }))
}

test('global Emotional Weather is hard-off by default', () => {
  const snapshot = aggregateGlobalEmotionalWeather(cohort(50), {}, now)
  assert.equal(snapshot.enabled, false)
  assert.deepEqual(snapshot.cells, [])
})

test('privacy policy cannot be weakened below launch floors', () => {
  const policy = normalizeGlobalWeatherPolicy({
    enabled: true,
    minCohort: 2,
    cellDegrees: 0.01,
    bucketMs: 60_000,
    maxContributionAgeMs: 60_000,
  })
  assert.equal(policy.minCohort, 25)
  assert.equal(policy.cellDegrees, 1)
  assert.equal(policy.bucketMs, 3 * 60 * 60 * 1000)
  assert.equal(policy.maxContributionAgeMs, 6 * 60 * 60 * 1000)
})

test('small cohorts are suppressed rather than published', () => {
  const snapshot = aggregateGlobalEmotionalWeather(cohort(24), { enabled: true }, now)
  assert.equal(snapshot.cells.length, 0)
  assert.equal(snapshot.suppressedCellCount, 1)
})

test('a qualifying cohort publishes coarse bounds without participant ids or exact locations', () => {
  const snapshot = aggregateGlobalEmotionalWeather(cohort(25), { enabled: true }, now)
  assert.equal(snapshot.cells.length, 1)
  assert.equal(snapshot.cells[0].cohortBand, '25-49')
  assert.equal(snapshot.cells[0].dominantState, 'Calm')
  const serialized = JSON.stringify(snapshot)
  assert.doesNotMatch(serialized, /person-1/)
  assert.doesNotMatch(serialized, /32\.512345/)
  assert.doesNotMatch(serialized, /94\.734567/)
  assert.ok(snapshot.cells[0].bounds.north - snapshot.cells[0].bounds.south >= 1)
})

test('repeated contributions from one participant cannot inflate a cohort', () => {
  const repeated = Array.from({ length: 100 }, (_, index) => ({
    ...baseContribution,
    participantId: 'single-person',
    capturedAt: now - index * 1000,
  }))
  const snapshot = aggregateGlobalEmotionalWeather(repeated, { enabled: true }, now)
  assert.equal(snapshot.cells.length, 0)
  assert.equal(snapshot.suppressedCellCount, 1)
})

test('opted-out and stale contributions never enter the aggregate', () => {
  const valid = cohort(24)
  const snapshot = aggregateGlobalEmotionalWeather([
    ...valid,
    { ...baseContribution, participantId: 'opted-out', consented: false },
    { ...baseContribution, participantId: 'stale', capturedAt: now - 48 * 60 * 60 * 1000 },
  ], { enabled: true }, now)
  assert.equal(snapshot.cells.length, 0)
  assert.equal(snapshot.suppressedCellCount, 1)
})

test('participants are capped to their latest cell per fixed time bucket', () => {
  const contributions = cohort(24)
  contributions.push({
    ...baseContribution,
    participantId: 'mover',
    capturedAt: now - 120_000,
    latitude: 40.7128,
    longitude: -74.0060,
  })
  contributions.push({
    ...baseContribution,
    participantId: 'mover',
    capturedAt: now - 30_000,
  })
  const snapshot = aggregateGlobalEmotionalWeather(contributions, { enabled: true }, now)
  assert.equal(snapshot.cells.length, 1)
  assert.equal(snapshot.cells[0].cohortBand, '25-49')
})
