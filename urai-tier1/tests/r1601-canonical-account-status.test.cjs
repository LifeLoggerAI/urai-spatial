'use strict'
const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')
const source = fs.readFileSync(path.join(__dirname, '../src/lib/privacy/canonicalAccountPrivacyClient.ts'), 'utf8')
const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText
const later = () => { let resolve; const promise = new Promise(r => { resolve = r }); return { promise, resolve } }

function harness() {
  const owner = { uid: 'owner-1' }
  const auth = { currentUser: owner }
  const app = { options: { projectId: 'urai-privacy-r1512-disposable' } }
  let authorized = true
  const calls = [], listeners = [], handlers = {}, weatherClears = []
  const expiry = Date.now() + 600000
  const body = new TextEncoder().encode('{"fixture":"canonical-owner"}')
  const sha256 = require('node:crypto').createHash('sha256').update(body).digest('hex')
  const authorityHash = 'b'.repeat(64), downloadExpiresAt = expiry - 1000
  const query = new URLSearchParams({ jobId: 'export-1', file: 'export', expiresAt: String(downloadExpiresAt), authorityHash, auditId: 'audit-1' })
  const responses = {
    createExportRequest: { requestId: 'request-1', exportJobId: 'export-1', status: 'pending' },
    createDeletionRequest: { requestId: 'deletion-1', status: 'pending' },
    getExportDownloadUrl: { schemaVersion: 'urai-canonical-export-download-v1', requiresAuthorization: true, uid: owner.uid,
      jobId: 'export-1', requestId: 'request-1', file: 'export', url: 'http://127.0.0.1:5001/urai-privacy-r1512-disposable/us-central1/downloadExportPackage?' + query,
      downloadExpiresAt, packageExpiresAt: expiry, auditId:'audit-1', authorityHash, generation:'123', sha256, byteLength:body.length },
  }
  const transport = {exports:{}}
  const transportSource = fs.readFileSync(path.join(__dirname, '../src/lib/privacy/authorizedExportDownload.ts'), 'utf8')
  new Function('module','exports',ts.transpileModule(transportSource,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText)(transport,transport.exports)
  const mocks = {
    './authorizedExportDownload': transport.exports,
    'firebase/firestore': {
      doc: (_db, collection, documentId) => ({ collection, documentId }),
      onSnapshot: (ref, options, next, error) => { const item = { ref, options, next, error, stopped: false }; listeners.push(item); return () => { item.stopped = true } },
    },
    'firebase/functions': { httpsCallable: (_fn, name) => async payload => { calls.push({ name, payload }); return { data: handlers[name] ? await handlers[name](payload) : responses[name] } } },
    '@/lib/uraiEmotion/manualWeatherSession': { notifyManualWeatherRevocation: () => weatherClears.push(calls.length) },
    '@/lib/firebase/client': { app, functions: {}, getFirebaseDb: () => ({}), getUrAiAuth: () => auth, privacyExportEmulatorOrigin: () => 'http://127.0.0.1:5001', disposableFirebaseReviewAuthorized: () => authorized },
  }
  const mod = { exports: {} }
  new Function('require', 'module', 'exports', compiled)(name => { if (!(name in mocks)) throw Error('Unexpected import ' + name); return mocks[name] }, mod, mod.exports)
  const session = () => mod.exports.createCanonicalAccountPrivacySession(owner)
  function emit(index, data, metadata = { fromCache: false, hasPendingWrites: false }) {
    const listener = listeners[index]
    listener.next({ id: listener.ref.documentId, exists: () => data !== null, data: () => data, metadata })
  }
  const complete = () => ({ uid: owner.uid, requestId: 'request-1', status: 'completed', complete: true, exportSha256:sha256, packageExpiresAt: { toMillis: () => expiry } })
  return { owner, auth, app, calls, listeners, handlers, responses, weatherClears, expiry, emit, complete, session, body, linkCurrent: mod.exports.canonicalDownloadIsCurrent, disable: () => { authorized = false } }
}
const exportRequest = { requestId: 'request-1', exportJobId: 'export-1', status: 'pending' }
const deletionRequest = { requestId: 'deletion-1', status: 'pending' }

test('local authorization gate rejects session and later calls without dispatch', async () => {
  const h = harness(), session = h.session()
  h.disable()
  assert.throws(h.session, /LOCAL_EMULATOR_ONLY/)
  await assert.rejects(session.requestExport(), /AUTH_CHANGED/)
  assert.equal(h.calls.length, 0)
})

for (const [name, change] of [
  ['different account', h => { h.auth.currentUser = { uid: 'owner-2' } }],
  ['same UID replacement User', h => { h.auth.currentUser = { uid: h.owner.uid } }],
  ['sign-out', h => { h.auth.currentUser = null }],
  ['project change', h => { h.app.options.projectId = 'different-project' }],
]) test(name + ' while request is in flight never returns the stale receipt', async () => {
  const h = harness(), session = h.session(), delay = later()
  h.handlers.createExportRequest = () => delay.promise
  const result = session.requestExport()
  change(h)
  delay.resolve(h.responses.createExportRequest)
  await assert.rejects(result, /AUTH_CHANGED/)
})

test('canonical requests dispatch only exact account-wide payloads and return pending', async () => {
  const h = harness(), session = h.session()
  assert.deepEqual(await session.requestExport(), exportRequest)
  assert.deepEqual(await session.requestDeletion('  Disposable account removal  ', 'REQUEST ACCOUNT DELETION'), deletionRequest)
  assert.deepEqual(h.calls, [{ name: 'createExportRequest', payload: {} }, { name: 'createDeletionRequest', payload: { reason: 'Disposable account removal' } }])
  await assert.rejects(session.requestDeletion('long enough', 'DELETE MEMORY'), /CONFIRMATION_REQUIRED/)
  assert.equal(h.calls.length, 2)
  assert.deepEqual(h.weatherClears, [1])
})

test('creation response cannot announce completion or carry malformed identifiers', async () => {
  const h = harness(), session = h.session()
  h.responses.createExportRequest.status = 'completed'
  await assert.rejects(session.requestExport(), /RECEIPT_INVALID/)
  h.responses.createDeletionRequest.requestId = 'foreign/path'
  await assert.rejects(session.requestDeletion('Disposable account', 'REQUEST ACCOUNT DELETION'), /RECEIPT_INVALID/)
})

test('export listener follows pending, processing and complete server records with owner linkage', async () => {
  const h = harness(), session = h.session(), states = [], errors = []
  session.watchExport(exportRequest, x => states.push(x), x => errors.push(x))
  assert.deepEqual(h.listeners[0].ref, { collection: 'exportJobs', documentId: 'export-1' })
  h.emit(0, { uid: h.owner.uid, requestId: 'request-1', status: 'pending' })
  await assert.rejects(session.getDownload(exportRequest), /NOT_READY/)
  h.emit(0, { uid: h.owner.uid, requestId: 'request-1', status: 'processing' })
  h.emit(0, h.complete())
  assert.deepEqual(states.map(x => [x.status, x.downloadEligible]), [['pending', false], ['processing', false], ['completed', true]])
  const download = await session.getDownload(exportRequest)
  assert.deepEqual(Object.keys(download).sort(), ['downloadExpiresAt', 'jobId', 'requestId'])
  assert.deepEqual(h.calls.map(x => x.name), ['getExportDownloadUrl'])
  assert.equal(errors.length, 0)
})

test('foreign owner, wrong request link and unknown statuses invalidate previously eligible export', async () => {
  for (const change of [d => ({ ...d, uid: 'other' }), d => ({ ...d, requestId: 'other' }), d => ({ ...d, status: 'ready' }), d => ({ ...d, complete: 'true' })]) {
    const h = harness(), session = h.session(), errors = []
    session.watchExport(exportRequest, () => {}, e => errors.push(e))
    h.emit(0, h.complete()); h.emit(0, change(h.complete()))
    await assert.rejects(session.getDownload(exportRequest), /NOT_READY/)
    assert.equal(errors.length, 1)
    assert.equal(h.calls.length, 0)
  }
})

test('cached, pending-write, incomplete and expired documents cannot enable a download', async () => {
  for (const variant of ['cache', 'pending-write', 'incomplete', 'expired', 'missing-expiry','missing-checksum']) {
    const h = harness(), session = h.session(), states = []
    session.watchExport(exportRequest, x => states.push(x), () => {})
    const value = h.complete(), metadata = { fromCache: false, hasPendingWrites: false }
    if (variant === 'cache') metadata.fromCache = true
    if (variant === 'pending-write') metadata.hasPendingWrites = true
    if (variant === 'incomplete') value.complete = false
    if (variant === 'expired') value.packageExpiresAt = { toMillis: () => Date.now() - 1000 }
    if (variant === 'missing-checksum') delete value.exportSha256
    if (variant === 'missing-expiry') delete value.packageExpiresAt
    h.emit(0, value, metadata)
    assert.equal(states.at(-1).downloadEligible, false)
    await assert.rejects(session.getDownload(exportRequest), /NOT_READY/)
    assert.equal(h.calls.length, 0)
  }
})

test('backend refusal cannot be replaced by a constructed download link', async () => {
  const h = harness(), session = h.session()
  session.watchExport(exportRequest, () => {}, () => {}); h.emit(0, h.complete())
  h.handlers.getExportDownloadUrl = async () => { throw Error('failed-precondition') }
  await assert.rejects(session.getDownload(exportRequest), /failed-precondition/)
})

test('backend download response must match the request, expiry and configured authenticated endpoint', async () => {
  for (const change of [d => ({ ...d, jobId: 'other' }), d => ({ ...d, url: 'javascript:alert(1)' }), d => ({ ...d, url: 'https://example.test/download' }), d => ({...d, downloadExpiresAt: Date.now() - 1}), d => ({...d, uid: 'foreign'}), d=>({...d, requiresAuthorization:false}), d=>({...d, sha256:'invalid'}), d=>({...d, sha256:'0'.repeat(64)}),
    d=>({...d, url:d.url.replace(':5001',':6001')}), d=>({...d, url:d.url.replace('downloadExportPackage','downloadOperationalExportPackage')}),
    d=>({...d,url:d.url+'&file=export'}), d=>({...d,url:d.url.replace('audit-1','other-audit')}), d=>({...d,url:'https://storage.googleapis.com/fixture/job?old'})]) {
    const h = harness(), session = h.session()
    session.watchExport(exportRequest, () => {}, () => {}); h.emit(0, h.complete())
    h.responses.getExportDownloadUrl = change(h.responses.getExportDownloadUrl)
    await assert.rejects(session.getDownload(exportRequest), /DOWNLOAD_(RECEIPT|URL)_INVALID/)
  }
})

test('status change while download callable is pending suppresses its obsolete response', async () => {
  const h = harness(), session = h.session(), delay = later()
  session.watchExport(exportRequest, () => {}, () => {}); h.emit(0, h.complete())
  h.handlers.getExportDownloadUrl = () => delay.promise
  const result = session.getDownload(exportRequest)
  h.emit(0, { uid: h.owner.uid, requestId: 'request-1', status: 'expired', complete: true })
  delay.resolve(h.responses.getExportDownloadUrl)
  await assert.rejects(result, /STATE_CHANGED/)
})

test('deletion remains a pending request and changes only from owner-bound server records', async () => {
  const h = harness(), session = h.session(), states = [], errors = []
  assert.deepEqual(await session.requestDeletion('Disposable account', 'REQUEST ACCOUNT DELETION'), deletionRequest)
  session.watchDeletion(deletionRequest, x => states.push(x), e => errors.push(e))
  assert.deepEqual(h.listeners[0].ref, { collection: 'deletionRequests', documentId: 'deletion-1' })
  h.emit(0, { uid: h.owner.uid, scope: 'account', status: 'pending' })
  assert.equal(states.at(-1).status, 'pending')
  h.emit(0, { uid: h.owner.uid, scope: 'account', status: 'completed' }, { fromCache: true, hasPendingWrites: false })
  assert.equal(states.at(-1).serverConfirmed, false)
  h.emit(0, { uid: 'other', scope: 'account', status: 'completed' })
  h.emit(0, { uid: h.owner.uid, scope: 'memories', status: 'completed' })
  h.emit(0, { uid: h.owner.uid, scope: 'account', status: 'deleted' })
  assert.equal(errors.length, 3)
  h.emit(0, { uid: h.owner.uid, scope: 'account', status: 'completed' })
  assert.deepEqual(states.at(-1), { requestId: 'deletion-1', scope: 'account', status: 'completed', serverConfirmed: true })
  assert.deepEqual(h.calls.map(x => x.name), ['createDeletionRequest'])
})

test('close, account replacement and unsubscribe suppress late status callbacks', () => {
  for (const action of ['close', 'replace', 'unsubscribe']) {
    const h = harness(), session = h.session(), states = [], errors = []
    const stop = session.watchExport(exportRequest, x => states.push(x), e => errors.push(e))
    if (action === 'close') session.close()
    if (action === 'replace') h.auth.currentUser = { uid: h.owner.uid }
    if (action === 'unsubscribe') stop()
    h.emit(0, h.complete()); h.listeners[0].error(Error('late error'))
    assert.equal(states.length, 0); assert.equal(errors.length, 0)
    if (action !== 'replace') assert.equal(h.listeners[0].stopped, true)
  }
})

test('listener failure and missing documents revoke download eligibility', async () => {
  const h = harness(), session = h.session(), errors = []
  session.watchExport(exportRequest, () => {}, e => errors.push(e)); h.emit(0, h.complete())
  h.listeners[0].error(Error('permission denied'))
  await assert.rejects(session.getDownload(exportRequest), /NOT_READY/)
  h.emit(0, null)
  assert.equal(errors.length, 2)
})

test('unregistered purpose never dispatches and a closed session cannot mutate consent', async () => {
  const h = harness(), session = h.session()
  await assert.rejects(session.setConsent('storytime.family_share', 'granted'), /INPUT_INVALID/)
  session.close()
  await assert.rejects(session.setConsent('memory.storage', 'granted'), /AUTH_CHANGED/)
  assert.deepEqual(h.weatherClears, [])
  assert.equal(h.calls.length, 0)
})

test('rendered download link stays bound to the exact issuing session across account replacement', () => {
  const h = harness(), original = h.session(), sameAccountNewSession = h.session()
  const link = { receipt: { downloadExpiresAt:h.responses.getExportDownloadUrl.downloadExpiresAt }, issuingSession: original }
  assert.equal(h.linkCurrent(link, original), true)
  assert.equal(sameAccountNewSession.isCurrent(), true)
  assert.equal(h.linkCurrent(link, sameAccountNewSession), false)
  const foreignSession = { isCurrent: () => true }
  assert.equal(h.linkCurrent(link, foreignSession), false)
  assert.equal(h.linkCurrent(link, original, link.receipt.downloadExpiresAt), false)
  original.close()
  assert.equal(h.linkCurrent(link, original), false)
})

async function ready(h) {
  const session = h.session()
  session.watchExport(exportRequest, () => {}, () => {}); h.emit(0,h.complete())
  const grant = await session.getDownload(exportRequest)
  return {session,grant}
}
test('a copied or foreign-session download grant cannot request an owner token', async () => {
  const h=harness(), {session,grant}=await ready(h)
  h.owner.getIdToken=()=>{ throw Error('must not request a token') }
  await assert.rejects(session.saveDownload({...grant}),/STATE_CHANGED/)
  await assert.rejects(h.session().saveDownload(grant),/STATE_CHANGED/)
})
test('same-UID owner replacement during forced token refresh prevents the HTTP request', async () => {
  const h=harness(), {session,grant}=await ready(h), token=later()
  h.owner.getIdToken=force=>{assert.equal(force,true);return token.promise}
  const save=session.saveDownload(grant)
  h.auth.currentUser={uid:h.owner.uid};token.resolve('synthetic')
  await assert.rejects(save,/stopped|AUTH_CHANGED|STATE_CHANGED/i)
})
test('new server status invalidates the original grant before token acquisition', async () => {
  const h=harness(), {session,grant}=await ready(h)
  h.emit(0,{uid:h.owner.uid,requestId:'request-1',status:'expired',complete:false})
  await assert.rejects(session.saveDownload(grant),/STATE_CHANGED/)
})
