import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
import { evaluatePublishedGlobalEmotionalFieldCell } from '../src/spatial/lived-world/globalEmotionalField.ts'

const functionsSource = fs.readFileSync(new URL('../../apps/functions/src/globalEmotionalFieldAggregation.ts', import.meta.url), 'utf8')
const publicationSource = fs.readFileSync(new URL('../../apps/functions/src/globalEmotionalFieldPublication.ts', import.meta.url), 'utf8')
const homeSource = fs.readFileSync(new URL('../src/spatial/layout/HomeAAAVisualRepair.tsx', import.meta.url), 'utf8')

test('public viewing is not conditioned on C8 contribution consent', () => {
  const cell = { id:'c', regionKey:'US', precision:'country', timeBucket:'2026-09-16T18:00:00.000Z', cohortSize:100, requiredMinimumCohort:100, sensitiveThresholdApproved:false, locationSensitive:false, sensitiveInferenceDerived:false, signal:{ calm:.5 }, confidence:.6, policyVersion:'v1', riskAssessmentId:'risk' }
  assert.equal(evaluatePublishedGlobalEmotionalFieldCell(cell).state, 'aggregate')
})

test('99 users suppress while ordinary nonsensitive 100-user base cell is evaluable', () => {
  const base = { id:'c', regionKey:'US', precision:'country', timeBucket:'2026-09-16T18:00:00.000Z', requiredMinimumCohort:100, sensitiveThresholdApproved:false, locationSensitive:false, sensitiveInferenceDerived:false, signal:{ calm:.5 }, confidence:.6, policyVersion:'v1', riskAssessmentId:'risk' }
  assert.equal(evaluatePublishedGlobalEmotionalFieldCell({ ...base, cohortSize:99 }).state, 'suppressed')
  assert.equal(evaluatePublishedGlobalEmotionalFieldCell({ ...base, cohortSize:100 }).state, 'aggregate')
})

test('sensitive emotional cells remain suppressed without governed threshold above 100', () => {
  const cell = { id:'c', regionKey:'US', precision:'country', timeBucket:'2026-09-16T18:00:00.000Z', cohortSize:100, requiredMinimumCohort:100, sensitiveThresholdApproved:false, locationSensitive:false, sensitiveInferenceDerived:true, signal:{ calm:.5 }, confidence:.6, policyVersion:'v1', riskAssessmentId:'risk' }
  assert.equal(evaluatePublishedGlobalEmotionalFieldCell(cell).state, 'suppressed')
})

test('missing risk receipt invalid confidence and fine precision all suppress', () => {
  const base = { id:'c', regionKey:'US', precision:'country', timeBucket:'2026-09-16T18:00:00.000Z', cohortSize:200, requiredMinimumCohort:150, sensitiveThresholdApproved:true, locationSensitive:true, sensitiveInferenceDerived:true, signal:{ calm:.5 }, confidence:.6, policyVersion:'v1', riskAssessmentId:'risk' }
  assert.equal(evaluatePublishedGlobalEmotionalFieldCell({ ...base, riskAssessmentId:'' }).state, 'suppressed')
  assert.equal(evaluatePublishedGlobalEmotionalFieldCell({ ...base, confidence:2 }).state, 'suppressed')
  assert.equal(evaluatePublishedGlobalEmotionalFieldCell({ ...base, precision:'exact' }).state, 'suppressed')
})

test('launch intake rejects raw or emotional payloads and remains participation-only', () => {
  assert.match(functionsSource, /Sensitive emotional input producer is not activated/)
  assert.match(functionsSource, /cohort-participation-only/)
  assert.match(functionsSource, /Launch contribution precision is country-only/)
  assert.doesNotMatch(functionsSource, /rawAudio|transcript|movementTrail|biometricTemplate/)
})

test('batch aggregation is suppression-only until sensitive signal and >100 governance exist', () => {
  assert.match(publicationSource, /SENSITIVE_SIGNAL_PROVIDER_NOT_ACTIVATED/)
  assert.match(publicationSource, /GOVERNED_HIGHER_SENSITIVE_THRESHOLD_REQUIRED/)
  assert.match(publicationSource, /PUBLICATION_ADAPTER_NOT_ACTIVATED/)
  assert.match(publicationSource, /containsUidList: false/)
  assert.match(publicationSource, /containsRawSensitivePayload: false/)
})

test('expired pre-publication contribution envelopes are cleaned without touching published cells', () => {
  assert.match(publicationSource, /expireGlobalEmotionalFieldIntake/)
  assert.match(publicationSource, /globalEmotionalFieldIntake/)
  assert.doesNotMatch(publicationSource, /batch\.delete\(db\.doc\(`globalEmotionalFieldCells/)
})

test('Home Earth is first-person only, non-portal and truthful about unavailable or suppressed state', () => {
  assert.match(homeSource, /home-global-emotional-field-earth/)
  assert.match(homeSource, /contributionConsentRequiredForViewing:false/)
  assert.match(homeSource, /Global field unavailable/)
  assert.match(homeSource, /Not enough safely aggregated data/)
  assert.match(homeSource, /portal:false/)
  assert.match(homeSource, /position=\{\[-3\.15,1\.28,1\.85\]\}/)
})
