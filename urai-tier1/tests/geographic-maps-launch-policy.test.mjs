import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const policyUrl = new URL('../../operations/maps/geographic-maps-launch-policy.json', import.meta.url)
const policy = JSON.parse(fs.readFileSync(policyUrl, 'utf8'))

test('geographic Maps policy is bounded to canonical project and launch minimum', () => {
  assert.equal(policy.authority.repository, 'LifeLoggerAI/urai-spatial')
  assert.equal(policy.authority.firebaseProject, 'urai-4dc1d')
  assert.equal(policy.authority.legacyProjectProhibitedUnlessReauthorized, 'urai-web-frontend')
  assert.equal(policy.productBoundary.symbolicLifeMapRemainsPrimary, true)
  assert.equal(policy.productBoundary.geographicLayerIsSupporting, true)
  assert.equal(policy.productBoundary.backgroundCollectionBeforeConsent, false)
  assert.equal(policy.productBoundary.preciseLocationAnalytics, false)
  assert.deepEqual(policy.apiAllowlist, ['maps-javascript-api', 'geocoding-api'])
  assert.ok(policy.apiDenylistUntilDirectlyRequired.includes('places-api-new'))
  assert.ok(policy.apiDenylistUntilDirectlyRequired.includes('routes-api'))
})

test('geographic Maps credentials and cost controls fail closed', () => {
  assert.equal(policy.credentials.browserKeysMustUseHttpReferrerRestrictions, true)
  assert.equal(policy.credentials.serverCredentialMustNotBeExposedToBrowser, true)
  assert.equal(policy.credentials.apiRestrictionsRequired, true)
  assert.equal(policy.credentials.unrestrictedKeysAllowed, false)
  assert.equal(policy.credentials.repositorySecretsAllowed, false)
  assert.ok(policy.initialCostControls.monthlyBudgetUsd > 0)
  assert.ok(policy.initialCostControls.monthlyBudgetUsd <= 50)
  assert.ok(policy.initialCostControls.dailyRequestCaps['maps-javascript-api'] > 0)
  assert.ok(policy.initialCostControls.dailyRequestCaps['geocoding-api'] > 0)
  assert.equal(policy.initialCostControls.increaseOnlyAfterMeasuredDemand, true)
})

test('cloud activation remains explicitly unauthorized without receipts', () => {
  assert.equal(policy.activation.mapsJavascriptEnabled, false)
  assert.equal(policy.activation.geocodingEnabled, false)
  assert.equal(policy.activation.restrictedKeysCreated, false)
  assert.equal(policy.activation.quotasConfigured, false)
  assert.equal(policy.activation.budgetAlertsConfigured, false)
  assert.equal(policy.activation.productionUseAuthorized, false)
  assert.ok(policy.requiredReceiptsBeforeProductionUse.length >= 8)
})
