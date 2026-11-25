import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { operationalPrivacyContractSelected, requireOperationalPrivacyContract } from '../src/lib/privacy/privacyContractAuthority.ts'

const source = (p) => readFileSync(new URL(p, import.meta.url), 'utf8')
const api = source('../src/lib/privacy/operationalPrivacyClient.ts')
const ui = source('../src/app/privacy-controls/ConsentSanctuaryClient.tsx')

test('unknown, absent, canonical, and malformed backend contracts refuse operations', () => {
  for (const x of [undefined, null, '', 'canonical-account-v1', 'true', 'operational-v2', ' operational-v1 ', {}, true]) {
    assert.equal(operationalPrivacyContractSelected(x), false)
    assert.throws(() => requireOperationalPrivacyContract(x), /OPERATIONAL_PRIVACY_CONTRACT_UNVERIFIED/)
  }
})

test('explicit operational contract permits contract selection only, not server authority', () => {
  assert.equal(operationalPrivacyContractSelected('operational-v1'), true)
  assert.doesNotThrow(() => requireOperationalPrivacyContract('operational-v1'))
})

test('private callables and Firestore listeners independently enforce the contract', () => {
  assert.match(api, /callOperationalPrivacyFunction[\s\S]*?requireOperationalPrivacyContract\(process\.env\.NEXT_PUBLIC_URAI_PRIVACY_CONTRACT\)[\s\S]*?httpsCallable/)
  assert.match(api, /subscribeOperationalUserCollection[\s\S]*?requireOperationalPrivacyContract\(process\.env\.NEXT_PUBLIC_URAI_PRIVACY_CONTRACT\)[\s\S]*?requireUserCollection/)
})

test('authenticated UI refuses unsupported contract before attaching an auth listener', () => {
  assert.match(ui, /if \(!operationalContractReady\)\s*\{[\s\S]*?setLoadState\('unavailable'\)[\s\S]*?return[\s\S]*?\}\s*const auth = getAuth/)
  assert.match(ui, /if \(!user \|\| explicitDemo \|\| !operationalContractReady\) return\s*const unsubscribers/)
})

test('existing scoped operations are not silently transformed into canonical account deletion', () => {
  assert.match(api, /createOperationalExportRequest\(scopes: string\[\]/)
  assert.match(api, /createSpatialExportRequest', \{ scopes, operationId:/)
  assert.match(api, /createOperationalDeletionRequest\(payload: \{ scope: string; confirmation: string/)
  assert.match(api, /createSpatialDeletionRequest', \{ \.\.\.payload, operationId:/)
  assert.doesNotMatch(api, /callOperationalPrivacyFunction\('setCanonicalConsent'/)
})

test('unknown private policy is not a grant; demo mode is never writable', () => {
  assert.match(ui, /!snapshot\.exists\(\) \|\| !isConsentPolicy\(rawPolicy, user\.uid\)/)
  assert.match(ui, /const canWrite = loadState === 'private'/)
  assert.match(ui, /loadState === 'private' \? 'actual' : loadState === 'demo' \? 'sample'/)
})
