'use strict'
const assert = require('node:assert/strict')
const { initializeApp, deleteApp } = require('firebase-admin/app')
const { getAuth } = require('firebase-admin/auth')
const { getFirestore } = require('firebase-admin/firestore')

const project = 'demo-urai-r1591-policy'
assert.equal(process.env.GCLOUD_PROJECT, project)
assert.equal(process.env.FIREBASE_AUTH_EMULATOR_HOST, '127.0.0.1:21099')
assert.equal(process.env.FIRESTORE_EMULATOR_HOST, '127.0.0.1:28080')
const app = initializeApp({ projectId: project }, 'synthetic-policy-acceptance')
const db = getFirestore(app)
const auth = getAuth(app)
const uid = 'r1591-policy-synthetic-owner'
const domains = ['memory', 'location', 'models', 'exports', 'workforce', 'identity']
const denied = { mode: 'denied', retentionDays: null, precise: false, replayVisible: false,
  lifeMapVisible: false, modelContext: false, sharingEnabled: false, automationEnabled: false, likenessEnabled: false }
let token
const checks = []
async function call(name, data = {}, bearer = token) {
  const response = await fetch(`http://127.0.0.1:25001/${project}/us-central1/${name}`, {
    method: 'POST', headers: { 'content-type': 'application/json', ...(bearer ? { authorization: `Bearer ${bearer}` } : {}) },
    body: JSON.stringify({ data }), signal: AbortSignal.timeout(20000),
  })
  const body = await response.json()
  if (!response.ok || body.error) {
    const error = new Error(body.error?.message || `HTTP ${response.status}`)
    error.status = body.error?.status; throw error
  }
  return body.result ?? body.data
}
const pass = label => { checks.push(label); console.log(`PASS ${checks.length} ${label}`) }
async function main() {
  await auth.createUser({ uid, email: 'r1591-policy@example.test', password: 'DisposablePolicy1591!', emailVerified: true })
  await db.doc(`users/${uid}`).set({ displayName: 'Synthetic policy owner' })
  const signedIn = await fetch('http://127.0.0.1:21099/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=demo', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: 'r1591-policy@example.test', password: 'DisposablePolicy1591!', returnSecureToken: true }),
  }).then(response => response.json())
  assert.ok(signedIn.idToken); token = signedIn.idToken
  const cap = await call('getOperationalPrivacyCapabilities')
  assert.equal(cap.uid, uid); assert.equal(cap.projectId, project)
  pass('genuine emulator identity reaches owner-bound capability')
  const before = await call('getPassportSnapshot')
  for (const domain of domains) assert.deepEqual(before.consent.domains[domain], denied)
  assert.equal(before.consent.enforcement.state, 'pending')
  assert.equal(before.consent.enforcement.providerState, 'pending')
  pass('missing-policy passport denies all domains without completed-enforcement claim')
  const next = { ...denied, mode: 'granted', retentionDays: 30 }
  const requested = await call('applyConsentPolicy', { domain: 'exports', next, expectedRevision: 0, operationId: 'r1591-first-export-0001' })
  const deadline = Date.now() + 15000
  while (Date.now() < deadline) {
    if ((await db.doc(`privacyEnforcementJobs/${requested.jobId}`).get()).get('state') === 'fully-enforced') break
    await new Promise(resolve => setTimeout(resolve, 100))
  }
  assert.equal((await db.doc(`privacyEnforcementJobs/${requested.jobId}`).get()).get('state'), 'fully-enforced')
  const policyRef = db.doc(`users/${uid}/privacyPolicy/current`)
  const saved = (await policyRef.get()).data()
  assert.equal(saved.revision, 1)
  for (const domain of domains) assert.deepEqual(saved.domains[domain], domain === 'exports' ? next : denied)
  pass('explicit export update persists no unrelated implicit grants')

  const variants = [
    ['foreign-owner', policy => { policy.ownerId = 'another-synthetic-owner' }],
    ['coerced-revision', policy => { policy.revision = '1' }],
    ['unknown-enforcement', policy => { policy.enforcement.state = 'unverified' }],
    ['missing-memory-domain', policy => { delete policy.domains.memory }],
  ]
  for (const [label, mutate] of variants) {
    const invalid = structuredClone(saved); mutate(invalid)
    await policyRef.set(invalid)
    const priorJobs = (await db.collection('privacyEnforcementJobs').get()).size
    const rejectsAuthority = error => error.status === 'FAILED_PRECONDITION' && error.message === 'STORED_CONSENT_POLICY_INVALID'
    await assert.rejects(call('getPassportSnapshot'), rejectsAuthority)
    await assert.rejects(call('applyConsentPolicy', { domain: 'exports', next: denied,
      expectedRevision: 1, operationId: `r1591-invalid-${label}` }), rejectsAuthority)
    assert.equal((await db.collection('privacyEnforcementJobs').get()).size, priorJobs)
    pass(`${label} denies real HTTP read and mutation without a new enforcement job`)
  }
  await policyRef.set(saved)
  const restored = await call('getPassportSnapshot')
  assert.deepEqual(restored.consent.domains.exports, next)
  await call('applyConsentPolicy', { domain: 'exports', next: denied, expectedRevision: 1, operationId: 'r1591-revoke-export-0001' })
  const revoked = (await policyRef.get()).data()
  assert.equal(revoked.revision, 2)
  for (const domain of domains) assert.deepEqual(revoked.domains[domain], denied)
  pass('valid explicit policy remains readable and requested revocation denies all domains')
  await assert.rejects(call('getPassportSnapshot', {}, null), error => error.status === 'UNAUTHENTICATED')
  pass('anonymous passport denied')
  await auth.updateUser(uid, { disabled: true })
  await assert.rejects(call('getPassportSnapshot'), error => ['PERMISSION_DENIED', 'UNAUTHENTICATED'].includes(error.status))
  pass('disabled current owner denied with prior signed identity token')
  console.log('R1591_OPERATIONAL_POLICY_RESULT ' + JSON.stringify({ checksPassed: checks.length, checks,
    project, actualHttpCallables: true, productionWrites: false, canonicalAuthorityBridge: false }))
}
main().then(() => deleteApp(app)).catch(async error => {
  console.error('R1591_OPERATIONAL_POLICY_FAIL', error.status || error.name, error.message)
  await deleteApp(app); process.exitCode = 1
})
