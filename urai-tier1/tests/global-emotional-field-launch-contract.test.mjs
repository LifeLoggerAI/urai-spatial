import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
import { evaluatePublishedGlobalEmotionalFieldCell } from '../src/spatial/lived-world/globalEmotionalField.ts'

const functionsSource = fs.readFileSync(new URL('../../apps/functions/src/globalEmotionalFieldAggregation.ts', import.meta.url), 'utf8')
const homeSource = fs.readFileSync(new URL('../src/spatial/layout/HomeAAAVisualRepair.tsx', import.meta.url), 'utf8')

test('public viewing is not conditioned on C8 contribution consent', () => {
  const cell = { id:'c', regionKey:'US', precision:'country', timeBucket:'2026-09-16T18:00:00.000Z', cohortSize:100, requiredMinimumCohort:100, sensitiveThresholdApproved:false, locationSensitive:false, sensitiveInferenceDerived:false, signal:{ calm:.5 }, confidence:.6, policyVersion:'v1', riskAssessmentId:'risk' }
  assert.equal(evaluatePublishedGlobalEmotionalFieldCell(cell).state, 'aggregate')
})

test('sensitive emotional cells remain suppressed without governed threshold above 100', () => {
  const cell = { id:'c', regionKey:'US', precision:'country', timeBucket:'2026-09-16T18:00:00.000Z', cohortSize:100, requiredMinimumCohort:100, sensitiveThresholdApproved:false, locationSensitive:false, sensitiveInferenceDerived:true, signal:{ calm:.5 }, confidence:.6, policyVersion:'v1', riskAssessmentId:'risk' }
  assert.equal(evaluatePublishedGlobalEmotionalFieldCell(cell).state, 'suppressed')
})

test('launch intake rejects raw or emotional payloads and remains participation-only', () => {
  assert.match(functionsSource, /Sensitive emotional input producer is not activated/)
  assert.match(functionsSource, /cohort-participation-only/)
  assert.match(functionsSource, /Launch contribution precision is country-only/)
  assert.doesNotMatch(functionsSource, /rawAudio|transcript|movementTrail|biometricTemplate/)
})

test('Home Earth is first-person only, non-portal and truthful about unavailable or suppressed state', () => {
  assert.match(homeSource, /home-global-emotional-field-earth/)
  assert.match(homeSource, /contributionConsentRequiredForViewing:false/)
  assert.match(homeSource, /Global field unavailable/)
  assert.match(homeSource, /Not enough safely aggregated data/)
  assert.match(homeSource, /portal:false/)
  assert.match(homeSource, /position=\{\[-3\.15,1\.28,1\.85\]\}/)
})
