import assert from 'node:assert/strict'
import { test } from 'node:test'
import fs from 'node:fs'

const policyLease = fs.readFileSync(new URL('../../apps/functions/src/speechPurposeConsent.ts', import.meta.url), 'utf8')
const functionIndex = fs.readFileSync(new URL('../../apps/functions/src/index.ts', import.meta.url), 'utf8')
const rules = fs.readFileSync(new URL('../../firebase/firestore.rules', import.meta.url), 'utf8')
const browser = fs.readFileSync(new URL('../../tests/genesis-nine-state-browser.mjs', import.meta.url), 'utf8')

test('speech consent issuance requires current authenticated owner and recent reauthentication', () => {
  assert.match(policyLease, /const uid = uidOf\(context\)/)
  assert.match(policyLease, /recentAuth\(context\)/)
  assert.match(policyLease, /context\.auth\?\.uid/)
  assert.match(policyLease, /now - issued > 300/)
  assert.match(policyLease, /export const grantSpeechPurposeLease = speechRegion\.https\.onCall/)
})

test('speech transcription and inference permissions are separate explicit user decisions', () => {
  for (const check of ['data?.transcriptionConsent !== true', 'data?.inferenceConsent !== true',
    'data?.sessionBaselineConsent !== true', 'data?.sessionBaselineConsent !== false',
    'data?.userInitiated !== true']) assert.ok(policyLease.includes(check), 'missing '+check)
  assert.match(policyLease, /MAX_LEASE_MS = 30 \* 60 \* 1000/)
  assert.match(policyLease, /data\.durationMs !== MAX_LEASE_MS/)
})

test('lease issuance checks canonical policy and active verified source/provider in one transaction', () => {
  assert.match(policyLease, /isCanonicalStoredPolicy\(raw, uid\)/)
  assert.match(policyLease, /raw\.domains\.models\.modelContext !== true/)
  assert.match(policyLease, /return db\.runTransaction\(async tx =>/)
  for (const expected of ["tx.get(policyRef)", "tx.get(sourceRef)", "tx.get(providerRef)",
    "sourceSnap.get('ownerId') !== uid", "sourceSnap.get('state') !== 'active'",
    "sourceSnap.get('verified') !== true", "sourceSnap.get('speechFeatureSource') !== true",
    "providerSnap.get('ownerId') !== uid", "providerSnap.get('state') !== 'active'",
    "providerSnap.get('verified') !== true", "providerSnap.get('speechInferenceAuthorized') !== true"])
    assert.ok(policyLease.includes(expected), 'missing verified source/provider check: '+expected)
  assert.match(policyLease, /if \(existing\.exists\) \{\s*if \(previous\?\.active === true\)\s*throw new functions\.https\.HttpsError\('already-exists', 'SPEECH_SESSION_ALREADY_ACTIVE'\)\s*throw new functions\.https\.HttpsError\('failed-precondition', 'SPEECH_SESSION_TERMINAL_NEW_ID_REQUIRED'\)/)
  assert.match(policyLease, /const revision = 1/)
})

test('lease is exact-owner/revision, bounded and atomically revoked once with durable cleanup', () => {
  assert.match(policyLease, /ownerId: uid, sessionId, sourceId, providerId, policyRevision/)
  assert.match(policyLease, /expiresAtMs = issuedAtMs \+ MAX_LEASE_MS/)
  assert.match(policyLease, /const currentRevision = lease\.get\('revision'\) as number/)
  assert.match(policyLease, /const wasActive = lease\.get\('active'\) === true/)
  assert.match(policyLease, /const revision = wasActive \? currentRevision \+ 1 : currentRevision/)
  assert.match(policyLease, /active: false, transcription: false, inference: false,\s*sessionBaseline: false/)
  assert.match(policyLease, /const \[lease, existingPurge\] = await Promise\.all\(\[\s*tx\.get\(leaseRef\), tx\.get\(purgeRef\)/)
  assert.match(policyLease, /if \(wasActive\) \{[\s\S]*?tx\.update\(leaseRef,/)
  assert.match(policyLease, /if \(!existingPurge\.exists\) \{[\s\S]*?tx\.create\(purgeRef,/)
  assert.match(policyLease, /schemaVersion: 'urai-speech-purge-job-v1'/)
  assert.match(policyLease, /providerPurgeVerified: false/)
})

test('owner may read lease; clients cannot create, replace, revive or delete it through rules', () => {
  assert.match(rules, /match \/speechPurposeLeases\/\{sessionId\} \{\s*allow read: if isSelf\(uid\);\s*allow write: if false;/)
  assert.match(functionIndex, /export \{ grantSpeechPurposeLease, revokeSpeechPurposeLease \} from '\.\/speechPurposeConsent'/)
})

test('disclosed-sample browser journey uses real sky gesture, semantic star, and Escape return', () => {
  assert.match(browser, /chromium\.launch/)
  assert.match(browser, /sourceClassification:'disclosed-sample-not-private-user-memory'/)
  assert.match(browser, /page\.mouse\.click\(x,y\)/)
  assert.match(browser, /getByRole\('button',\{name:'Open disclosed sample'\}\)/)
  assert.match(browser, /getByTestId\('life-map-semantic-trigger'\)/)
  assert.match(browser, /data-life-map-node-id/)
  assert.match(browser, /page\.keyboard\.press\('Escape'\)/)
  assert.match(browser, /context\.tracing\.start\(/)
  assert.match(browser, /await page\.screenshot\(/)
  assert.match(browser, /recordVideo:/)
  assert.match(browser, /assertion:'NOT_VERIFIED'/)
  assert.match(browser, /report\.assertion='PASS'/)
})

test('sample-world journey is not presented as authenticated private memory acceptance', () => {
  assert.match(browser, /sourceClassification:'disclosed-sample-not-private-user-memory'/)
  assert.match(browser, /data-life-map-access','explicit-demo'/)
  assert.match(browser, /data-memory-status','demo'/)
  assert.doesNotMatch(browser, /sourceClassification:'authenticated-private-user-memory'/)
})
