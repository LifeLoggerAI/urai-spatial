import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const policyUrl = new URL('../../operations/maps/geographic-maps-launch-policy.json', import.meta.url)
const policy = JSON.parse(fs.readFileSync(policyUrl, 'utf8'))

const expectedAllowlist = [
  'maps-javascript-api',
  'map-tiles-api',
  'places-api-new',
  'geocoding-api',
  'routes-api',
  'maps-elevation-api',
  'roads-api',
  'time-zone-api',
  'weather-api',
  'aerial-view-api',
  'arcore-api',
]

test('geographic Maps policy is bounded to canonical project and approved world stack', () => {
  assert.equal(policy.authority.repository, 'LifeLoggerAI/urai-spatial')
  assert.equal(policy.authority.firebaseProject, 'urai-4dc1d')
  assert.equal(policy.authority.legacyProjectProhibitedUnlessReauthorized, 'urai-web-frontend')
  assert.equal(policy.productBoundary.symbolicLifeMapRemainsPrimary, true)
  assert.equal(policy.productBoundary.geographicLayerIsSupporting, true)
  assert.equal(policy.productBoundary.backgroundCollectionBeforeConsent, false)
  assert.equal(policy.productBoundary.preciseLocationAnalytics, false)
  assert.deepEqual(policy.apiAllowlist, expectedAllowlist)
  assert.deepEqual(policy.apiDenylistUntilDirectlyRequired, [])
})

test('geographic Maps credentials and cost controls fail closed', () => {
  assert.equal(policy.credentials.browserKeysMustUseHttpReferrerRestrictions, true)
  assert.equal(policy.credentials.serverCredentialMustNotBeExposedToBrowser, true)
  assert.equal(policy.credentials.apiRestrictionsRequired, true)
  assert.equal(policy.credentials.unrestrictedKeysAllowed, false)
  assert.equal(policy.credentials.repositorySecretsAllowed, false)
  assert.deepEqual(policy.credentials.expectedEnvironmentVariables, [
    'NEXT_PUBLIC_GOOGLE_MAPS_API_KEY',
    'GOOGLE_MAPS_SERVER_API_KEY',
  ])
  assert.ok(policy.initialCostControls.monthlyBudgetUsd > 0)
  assert.ok(policy.initialCostControls.monthlyBudgetUsd <= 50)
  for (const api of expectedAllowlist) {
    assert.ok(policy.initialCostControls.dailyRequestCaps[api] > 0, `missing positive daily request cap for ${api}`)
  }
  assert.equal(policy.initialCostControls.increaseOnlyAfterMeasuredDemand, true)
})

test('provider service state requires fresh read-only proof before production authorization', () => {
  assert.equal(policy.providerServiceState.status, 'requires-fresh-read-only-wif-audit')
  assert.deepEqual(policy.providerServiceState.previousVerifiedSubset, [
    'maps-backend.googleapis.com',
    'geocoding-backend.googleapis.com',
  ])
  assert.equal(policy.providerServiceState.previousObservedByNonMutatingAuditRun, '30703085166')
  assert.equal(policy.providerServiceState.serviceEnablementMutationPerformedByThisLane, false)
  assert.ok(Array.isArray(policy.providerServiceState.expectedServices))
  assert.ok(policy.providerServiceState.expectedServices.length >= 11)
  assert.equal(policy.activation.restrictedKeysCreated, false)
  assert.equal(policy.activation.quotasConfigured, false)
  assert.equal(policy.activation.budgetAlertsConfigured, false)
  assert.equal(policy.activation.previewOriginVerified, false)
  assert.equal(policy.activation.productionOriginVerified, false)
  assert.equal(policy.activation.rollbackAndRotationDrillVerified, false)
  assert.equal(policy.activation.productionUseAuthorized, false)
  assert.ok(policy.requiredReceiptsBeforeProductionUse.length >= 8)
})
