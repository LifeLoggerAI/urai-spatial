const assert = require('node:assert/strict')
const crypto = require('node:crypto')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const { test, after } = require('node:test')

// These guards execute before Firebase initialization. This proof must never
// inherit a live project, endpoint, service-account file or deployment authority.
const project = 'demo-urai-passive-consent-proof'
const host = process.env.FIRESTORE_EMULATOR_HOST
const mode = process.env.URAI_PASSIVE_SIGNAL_HANDLER_MODE
assert.equal(process.env.URAI_PASSIVE_SIGNAL_EMULATOR_TEST, '1')
assert.equal(process.env.GCLOUD_PROJECT, project)
assert.match(host || '', /^127\.0\.0\.1:\d+$/)
assert.ok(mode === 'original' || mode === 'repaired')
assert.ok(!process.env.GOOGLE_APPLICATION_CREDENTIALS, 'Credential files are forbidden in this emulator proof')

const admin = require('firebase-admin')
const functions = require('firebase-functions/v1')
const app = admin.initializeApp({ projectId: project }, 'passive-consent-proof')
const db = admin.firestore(app)
db.settings({ host, ssl: false })
const outputDir = path.resolve(process.env.URAI_PASSIVE_SIGNAL_PROOF_OUTPUT_DIR || '')
assert.equal(path.basename(outputDir), 'passive-firestore-proof')
fs.mkdirSync(outputDir, { recursive: true })
const moduleFile = mode === 'original'
  ? path.resolve(__dirname, 'proof-original/passiveSignals-before-consent-transaction.js')
  : path.resolve(__dirname, '../lib/apps/functions/src/passiveSignals.js')
const compiled = fs.readFileSync(moduleFile, 'utf8')
const report = {
  schemaVersion: 'urai-passive-consent-real-firestore-proof-v1',
  sourceSha: process.env.URAI_PROOF_SOURCE_SHA,
  mode, project, emulatorHost: host,
  compiledModuleSha256: crypto.createHash('sha256').update(compiled).digest('hex'),
  actualCompiledHandler: true, realFirestoreSdkAndDatastore: true,
  schedulingAdapter: 'pauses the actual policy read; uses actual datastore transactions and server commit timestamps',
  callableJwtOrAppCheckVerification: false,
  firestoreRulesVerification: false,
  productionVerification: false,
  cases: [],
}
const writeReport = () => fs.writeFileSync(path.join(outputDir, `${mode}-cases.json`), JSON.stringify(report, null, 2) + '\n')
writeReport()

const domains = () => {
  const base = { mode: 'granted', retentionDays: 30, precise: true, replayVisible: false,
    lifeMapVisible: false, modelContext: true, sharingEnabled: false, automationEnabled: true, likenessEnabled: true }
  return Object.fromEntries(['memory', 'location', 'models', 'exports', 'workforce', 'identity']
    .map((name) => [name, { ...base }]))
}
const policyFor = (ownerId, overrides = {}) => ({
  version: 2, revision: 1, ownerId,
  domains: Object.fromEntries(Object.entries(domains()).map(([name, value]) => [name, { ...value, ...(overrides[name] || {}) }])),
  enforcement: { state: 'fully-enforced', jobId: null, affectedTargets: [], providerState: 'not-applicable' },
})
const coordinates = { latitude: 37.4219999, longitude: -122.0840575, accuracyMeters: 8, precision: 'precise' }
const payloadFor = (type) => type === 'location' ? coordinates
  : type === 'voice-interaction' ? { transcript: 'Synthetic transcript only', rawAudio: 'must-not-store' }
    : type === 'camera-emotion' ? { emotionTag: 'calm', rawImage: 'must-not-store' }
      : { intensity: 2, sampleWindowMs: 1000 }
const collectionFor = (type) => type === 'location' ? 'locations' : type === 'voice-interaction' ? 'voiceEvents' : 'behaviorSignals'
const deferred = () => {
  let resolve
  const promise = new Promise((done) => { resolve = done })
  return { promise, resolve }
}
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
async function bounded(promise, label) {
  let timer
  try {
    return await Promise.race([promise, new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error(`Timed out: ${label}`)), 15000)
    })])
  } finally { clearTimeout(timer) }
}
function atOrBefore(left, right) {
  assert.ok(left && Number.isInteger(left.seconds) && Number.isInteger(left.nanoseconds), 'Real stored server timestamp required')
  assert.ok(right && Number.isInteger(right.seconds) && Number.isInteger(right.nanoseconds), 'Real acknowledged policy commit timestamp required')
  return left.seconds < right.seconds || (left.seconds === right.seconds && left.nanoseconds <= right.nanoseconds)
}
async function fixture(name, onPolicyRead = async () => {}) {
  const uid = `synthetic-${mode}-${name}`
  const policyRef = db.doc(`users/${uid}/privacyPolicy/current`)
  const reads = [], allocatedIds = []
  let transactionAttempts = 0
  const reference = (ref) => ({
    id: ref.id, _realReference: ref,
    get: async () => {
      const snapshot = await ref.get()
      reads.push(ref.path)
      await onPolicyRead()
      return snapshot
    },
    set: (data) => ref.set(data),
  })
  const io = {
    doc: (location) => reference(db.doc(location)),
    collection: (location) => ({ doc: () => {
      const ref = db.collection(location).doc()
      allocatedIds.push(ref.id)
      return reference(ref)
    } }),
    runTransaction: (callback) => db.runTransaction(async (transaction) => {
      transactionAttempts += 1
      return callback({
        get: async (ref) => {
          const snapshot = await transaction.get(ref._realReference)
          reads.push(ref._realReference.path)
          await onPolicyRead()
          return snapshot
        },
        set: (ref, data) => transaction.set(ref._realReference, data),
      })
    }),
  }
  const adminFacade = {
    apps: [app],
    firestore: Object.assign(() => io, { FieldValue: admin.firestore.FieldValue }),
    initializeApp: () => { throw new Error('Unexpected additional Firebase app initialization') },
  }
  const holder = { exports: {} }
  // Use the current realm and the normal CJS wrapper shape so actual Firestore
  // receives ordinary document objects. No source rewrite or synthetic datastore.
  const load = vm.runInThisContext(`(function(exports, require, module, __filename, __dirname) {\n${compiled}\n})`, { filename: moduleFile })
  load(holder.exports, (name) => {
    if (name === 'firebase-admin') return adminFacade
    if (name === 'firebase-functions/v1') return functions
    if (name === './consentPolicyAuthority') return require(path.resolve(__dirname, '../lib/apps/functions/src/consentPolicyAuthority.js'))
    throw new Error(`Unexpected actual-handler dependency: ${name}`)
  }, holder, moduleFile, path.dirname(moduleFile))
  const callable = holder.exports.recordPassiveSignal
  assert.equal(typeof callable.run, 'function', 'Actual Firebase v1 callable test entry required')
  const record = (type, context = { auth: { uid } }) => callable.run({ type, payload: payloadFor(type) }, context)
  const stored = async (type) => (await db.collection(`users/${uid}/${collectionFor(type)}`).get()).docs.map((doc) => doc.data())
  return { uid, policyRef, reads, allocatedIds, record, stored, transactionAttempts: () => transactionAttempts }
}
function caseTest(name, role, run) {
  test(name, { timeout: 30000 }, async () => {
    const item = { name, role, passed: false }
    try { await run(item); item.passed = true }
    catch (error) { item.errorCode = error.code || error.name; item.errorMessage = String(error.message).slice(0, 400); throw error }
    finally { report.cases.push(item); writeReport() }
  })
}

caseTest('unchanged location consent preserves precise coordinates and owner metadata', 'positive', async (item) => {
  const f = await fixture('precise')
  await f.policyRef.set(policyFor(f.uid))
  const result = await f.record('location')
  const rows = await f.stored('location')
  assert.equal(result.accepted, true)
  assert.equal(rows.length, 1)
  assert.equal(rows[0].ownerId, f.uid)
  assert.equal(rows[0].payload.latitude, coordinates.latitude)
  assert.equal(rows[0].payload.longitude, coordinates.longitude)
  assert.equal(rows[0].rawMediaStored, false)
  assert.ok(rows[0].createdAt instanceof admin.firestore.Timestamp)
  item.storedSignals = rows.length
})
caseTest('approximate consent still coarsens server-side with a minimum radius', 'positive', async (item) => {
  const f = await fixture('approximate')
  await f.policyRef.set(policyFor(f.uid, { location: { mode: 'limited', precise: false } }))
  await f.record('location')
  const rows = await f.stored('location')
  assert.equal(rows.length, 1)
  assert.equal(rows[0].payload.precision, 'approximate')
  assert.equal(rows[0].payload.latitude, 37.42)
  assert.equal(rows[0].payload.longitude, -122.08)
  assert.equal(rows[0].payload.accuracyMeters, 1000)
  item.storedSignals = rows.length
})
caseTest('unauthenticated call rejects before any policy read', 'positive', async () => {
  const f = await fixture('unauthenticated')
  await assert.rejects(f.record('location', {}), { code: 'unauthenticated' })
  assert.equal(f.reads.length, 0)
  assert.equal((await f.stored('location')).length, 0)
})
caseTest('missing actual policy rejects without committing a signal', 'positive', async () => {
  const f = await fixture('missing-policy')
  await assert.rejects(f.record('location'), { code: 'permission-denied', message: 'PASSIVE_SIGNAL_CONSENT_POLICY_REQUIRED' })
  assert.equal((await f.stored('location')).length, 0)
})

const revocations = [
  ['camera-emotion', 'identity', { mode: 'granted', likenessEnabled: false }],
  ['voice-interaction', 'models', { mode: 'granted', modelContext: false }],
  ['location', 'location', { mode: 'denied', precise: true }],
  ['motion', 'workforce', { mode: 'granted', automationEnabled: false }],
]
for (const [type, domain, value] of revocations) {
  caseTest(`already revoked ${domain} consent rejects in the actual datastore`, 'positive', async () => {
    const f = await fixture(`already-revoked-${domain}`)
    await f.policyRef.set(policyFor(f.uid, { [domain]: value }))
    await assert.rejects(f.record(type), { code: 'permission-denied' })
    assert.equal((await f.stored(type)).length, 0)
  })
}

async function race(item, name, type, changePolicy, precisionOnly = false) {
  const reached = deferred(), release = deferred()
  let firstRead = true
  const f = await fixture(name, async () => {
    if (firstRead) { firstRead = false; reached.resolve(); await release.promise }
  })
  await f.policyRef.set(policyFor(f.uid))
  const outcome = f.record(type).then((value) => ({ value }), (error) => ({ error }))
  await bounded(reached.promise, 'actual policy read')
  const revocation = changePolicy(f.policyRef, f.uid)
  try {
    // An independent original read holds no write lock, so require its revoke
    // to finish first. The repair may lock or conflict/retry; both are valid.
    if (mode === 'original') await bounded(revocation, 'original policy revocation')
    else await Promise.race([revocation, pause(150)])
  } finally { release.resolve() }
  const result = await bounded(outcome, 'handler completion')
  const policyWrite = await bounded(revocation, 'policy commit')
  const rows = await f.stored(type)
  item.storedSignals = rows.length
  item.transactionAttempts = f.transactionAttempts()
  if (result.error) {
    assert.equal(result.error.code, 'permission-denied')
    assert.equal(rows.length, 0)
    item.ordering = 'REVOCATION_REJECTED_NO_SIGNAL'
    return
  }
  assert.equal(result.value.accepted, true)
  assert.equal(rows.length, 1)
  assert.equal(rows[0].ownerId, f.uid)
  assert.equal(rows[0].rawMediaStored, false)
  const beforeRevoke = atOrBefore(rows[0].createdAt, policyWrite.writeTime)
  if (precisionOnly && rows[0].payload.precision === 'approximate') {
    assert.equal(rows[0].payload.latitude, 37.42)
    assert.equal(rows[0].payload.longitude, -122.08)
    assert.equal(rows[0].payload.accuracyMeters, 1000)
    item.ordering = 'PRECISION_DOWNGRADE_APPLIED'
  } else {
    item.ordering = beforeRevoke ? 'SIGNAL_COMMITTED_BEFORE_REVOCATION' : 'VIOLATION_SIGNAL_COMMITTED_AFTER_REVOCATION'
    assert.equal(beforeRevoke, true, 'Signal using stale consent must not commit after actual policy revocation')
  }
  assert.equal(f.allocatedIds.length, 1, 'One signal ID must survive real transaction retries')
  assert.equal(rows[0].signalId, f.allocatedIds[0])
}
for (const [type, domain, value] of revocations) {
  caseTest(`conflicting ${domain} revocation never commits a stale-consent ${type} signal`, 'regression', async (item) => {
    await race(item, `raced-${domain}`, type, (ref, ownerId) => ref.set(policyFor(ownerId, { [domain]: value })))
  })
}
caseTest('conflicting actual policy deletion never commits a stale-consent signal', 'regression', async (item) => {
  await race(item, 'raced-delete', 'location', (ref) => ref.delete())
})
caseTest('precision downgrade retains precise coordinates only if committed before the downgrade', 'regression', async (item) => {
  await race(item, 'raced-precision', 'location', (ref, ownerId) => ref.set(policyFor(ownerId, { location: { mode: 'limited', precise: false } })), true)
})
after(async () => {
  writeReport()
  await db.terminate()
  await app.delete()
})
