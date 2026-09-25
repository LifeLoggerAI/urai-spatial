import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
import {
  GLOBAL_EMOTIONAL_FIELD_DEFAULT_MINIMUM_COHORT,
  GLOBAL_EMOTIONAL_FIELD_PURPOSE,
  evaluateGlobalEmotionalFieldCell,
  evaluatePersonalEmotionalWeather,
} from '../src/spatial/lived-world/globalEmotionalField.ts'

const earth = fs.readFileSync(new URL('../src/spatial/home/HomeGlobalEmotionalFieldEarth.tsx', import.meta.url), 'utf8')
const homeRepair = fs.readFileSync(new URL('../src/spatial/layout/HomeAAAVisualRepair.tsx', import.meta.url), 'utf8')

const c8 = (status = 'granted') => ({
  purpose: GLOBAL_EMOTIONAL_FIELD_PURPOSE,
  tier: 'C8',
  status,
})

const cell = (overrides = {}) => ({
  id: 'cell-1',
  regionKey: 'coarse:test',
  precision: 'coarse-region',
  timeBucket: '2026-09-16T21:00Z',
  cohortSize: 150,
  requiredMinimumCohort: GLOBAL_EMOTIONAL_FIELD_DEFAULT_MINIMUM_COHORT,
  sensitiveThresholdApproved: false,
  locationSensitive: false,
  sensitiveInferenceDerived: false,
  signal: { calm: .4, pressure: .2 },
  confidence: .7,
  policyVersion: 'test-policy',
  riskAssessmentId: 'risk-1',
  ...overrides,
})

test('public-good field is suppressed without dedicated C8 consent', () => {
  const decision = evaluateGlobalEmotionalFieldCell({ cell: cell(), consent: null })
  assert.equal(decision.state, 'suppressed')
  assert.equal(decision.reason, 'DEDICATED_PUBLIC_GOOD_CONSENT_NOT_GRANTED')
  assert.equal(decision.cell, null)
})

test('absolute cohort floor cannot be lowered below 100', () => {
  const decision = evaluateGlobalEmotionalFieldCell({
    cell: cell({ cohortSize: 500, requiredMinimumCohort: 99 }),
    consent: c8(),
  })
  assert.equal(decision.state, 'suppressed')
  assert.equal(decision.reason, 'BELOW_PRIVACY_STANDARD_FLOOR')
})

test('cells below their approved threshold suppress rather than leak low-count cohorts', () => {
  const decision = evaluateGlobalEmotionalFieldCell({
    cell: cell({ cohortSize: 149, requiredMinimumCohort: 150 }),
    consent: c8(),
  })
  assert.equal(decision.state, 'suppressed')
  assert.equal(decision.reason, 'INSUFFICIENT_COHORT')
})

test('location or sensitive-derived cells require separately approved threshold above the absolute floor', () => {
  for (const patch of [{ locationSensitive: true }, { sensitiveInferenceDerived: true }]) {
    const decision = evaluateGlobalEmotionalFieldCell({ cell: cell(patch), consent: c8() })
    assert.equal(decision.state, 'suppressed')
    assert.equal(decision.reason, 'HIGHER_SENSITIVE_COHORT_THRESHOLD_REQUIRED')
  }
  const allowed = evaluateGlobalEmotionalFieldCell({
    cell: cell({
      locationSensitive: true,
      sensitiveThresholdApproved: true,
      requiredMinimumCohort: 180,
      cohortSize: 220,
    }),
    consent: c8(),
  })
  assert.equal(allowed.state, 'aggregate')
})

test('missing governance receipts, invalid signals and invalid confidence suppress fail-closed', () => {
  assert.equal(evaluateGlobalEmotionalFieldCell({ cell: cell({ policyVersion: '' }), consent: c8() }).reason, 'MISSING_POLICY_OR_RISK_RECEIPT')
  assert.equal(evaluateGlobalEmotionalFieldCell({ cell: cell({ signal: { calm: 1.2 } }), consent: c8() }).reason, 'INVALID_SIGNAL_VECTOR')
  assert.equal(evaluateGlobalEmotionalFieldCell({ cell: cell({ confidence: -1 }), consent: c8() }).reason, 'INVALID_CONFIDENCE')
})

test('safe coarse aggregate can pass only after every fail-closed boundary passes', () => {
  const decision = evaluateGlobalEmotionalFieldCell({ cell: cell(), consent: c8() })
  assert.equal(decision.state, 'aggregate')
  assert.equal(decision.reason, 'SAFE_AGGREGATE_AVAILABLE')
  assert.equal(decision.cell?.id, 'cell-1')
})

test('personal emotional weather remains private and requires explicit C4 sensitive-inference consent', () => {
  const weather = {
    state: 'private-pattern',
    purpose: 'inference.sensitive',
    language: 'possible-signal',
    confidence: .5,
    sourceWindow: 'private-window',
  }
  assert.equal(evaluatePersonalEmotionalWeather({ consent: null, weather }), null)
  assert.equal(evaluatePersonalEmotionalWeather({
    consent: { purpose: 'inference.sensitive', tier: 'C3', status: 'granted' },
    weather,
  }), null)
  const allowed = evaluatePersonalEmotionalWeather({
    consent: { purpose: 'inference.sensitive', tier: 'C4', status: 'granted' },
    weather,
  })
  assert.equal(allowed?.state, 'private-pattern')
})

test('Home mounts a separate first-person Earth candidate fail-closed with no invented aggregate activity', () => {
  assert.match(homeRepair, /HomeGlobalEmotionalFieldEarth/)
  assert.match(homeRepair, /useState<GlobalFieldState>\('unavailable'\)/)
  assert.match(homeRepair, /params\.get\('homeAssetReview'\) === '1' \? params\.get\('homeGlobalFieldReview'\) : null/)
  assert.match(homeRepair, /setGlobalFieldState\(review === 'suppressed' \? 'suppressed' : 'unavailable'\)/)
  assert.match(homeRepair, /<HomeGlobalEmotionalFieldEarth state=\{globalFieldState\} \/>/)
  assert.doesNotMatch(homeRepair, /setGlobalFieldState\([^\n]*'aggregate'/)
  assert.match(earth, /semanticOwner: 'global-emotional-field-earth'/)
  assert.match(earth, /privateMapReuse: false/)
  assert.match(earth, /individualDots: false/)
  assert.match(earth, /exactLocationExposure: false/)
  assert.match(earth, /providerState: 'not-activated'/)
  assert.match(earth, /visibility: 'first-person-only'/)
  assert.match(earth, /No emotional activity is inferred or fabricated/)
  assert.doesNotMatch(earth, /LocationMap|private.*pin|userDot|individual.*location/i)
})
