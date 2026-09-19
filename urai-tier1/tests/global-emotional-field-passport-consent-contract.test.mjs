import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const passportPage = fs.readFileSync(new URL('../src/app/passport/page.tsx', import.meta.url), 'utf8')
const publicGoodCard = fs.readFileSync(new URL('../src/app/passport/GlobalEmotionalFieldConsentCard.tsx', import.meta.url), 'utf8')
const privacyClient = fs.readFileSync(new URL('../src/lib/privacy/operationalPrivacyClient.ts', import.meta.url), 'utf8')
const publicGoodFunctions = fs.readFileSync(new URL('../../apps/functions/src/publicGoodConsent.ts', import.meta.url), 'utf8')
const functionIndex = fs.readFileSync(new URL('../../apps/functions/src/index.ts', import.meta.url), 'utf8')

test('Passport owns dedicated fail-closed C8 public-good consent without activating publication', () => {
  assert.match(passportPage, /GlobalEmotionalFieldConsentCard/)
  assert.match(publicGoodCard, /\(\['off', 'limited', 'on'\] as const\)/)
  assert.match(publicGoodCard, /Default is <strong>Off<\/strong>/)
  assert.match(publicGoodCard, /Absolute privacy floor: \{snapshot\.minimumCohortFloor\} users/)
  assert.match(publicGoodCard, /Location\/sensitive cohorts require a separately approved higher threshold/)
  assert.match(publicGoodCard, /What never contributes/)
  assert.match(publicGoodCard, /cue: 'permission'/)
  assert.match(privacyClient, /callOperationalPrivacyFunction\('getGlobalEmotionalFieldConsent'\)/)
  assert.match(privacyClient, /callOperationalPrivacyFunction\('applyGlobalEmotionalFieldConsent'/)
  assert.match(functionIndex, /applyGlobalEmotionalFieldConsent/)
  assert.match(functionIndex, /getGlobalEmotionalFieldConsent/)
  assert.match(publicGoodFunctions, /mode: 'off'/)
  assert.match(publicGoodFunctions, /consentTier: 'C8'/)
  assert.match(publicGoodFunctions, /purpose: 'data\.public-good\.emotional-field'/)
  assert.match(publicGoodFunctions, /providerState: 'not-activated'/)
  assert.match(publicGoodFunctions, /publicationState: 'blocked-pending-governance-and-aggregate-provider'/)
  assert.match(publicGoodFunctions, /minimumCohortFloor: 100/)
  for (const forbidden of ['individual emotion', 'exact location', 'raw voice', 'raw transcript', 'raw memory', 'movement trail', 'identifiable social graph', 'biometric template']) {
    assert.ok(publicGoodFunctions.includes(forbidden), `missing forbidden contribution ${forbidden}`)
  }
})

test('C8 consent writes revisioned receipts and leaves aggregate publication fail-closed', () => {
  assert.match(publicGoodFunctions, /CONSENT_REVISION_CONFLICT/)
  assert.match(publicGoodFunctions, /privacyReceipts/)
  assert.match(publicGoodFunctions, /previousMode: current\.mode/)
  assert.match(publicGoodFunctions, /nextMode: mode/)
  assert.match(publicGoodFunctions, /result: enabled \? 'recorded-provider-blocked' : 'revoked'/)
  assert.match(publicGoodFunctions, /sensitiveHigherThresholdRequired: true/)
})
