import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createHash, webcrypto } from 'node:crypto'
import { createRequire } from 'node:module'
import vm from 'node:vm'
import http from 'node:http'
import test from 'node:test'
import ts from 'typescript'

const root = process.env.URAI_RESERVATION_SOURCE_ROOT || fileURLToPath(new URL('../../../', import.meta.url))
if (process.env.GITHUB_ACTIONS && process.env.URAI_RESERVATION_SOURCE_ROOT) throw new Error('Native proof must exercise the checked-out source')
const localRequire = createRequire(import.meta.url)
const hash = (text) => createHash('sha256').update(text).digest('hex')
const message = 'synthetic private reflection; never send this fixture externally'
const requestId = hash(JSON.stringify({ message, context: [], locale: 'en-US' }))
const consentPolicyAuthority = loadSource('apps/functions/src/consentPolicyAuthority.ts', {})
const consentModel = loadSource('urai-tier1/src/app/privacy-controls/consentModel.ts', {})
function canonicalProviderPolicy(uid) {
  const policy = JSON.parse(JSON.stringify(consentModel.defaultConsentPolicy(uid)))
  policy.domains.models.mode = 'granted'
  policy.domains.models.modelContext = true
  assert.equal(consentPolicyAuthority.isCanonicalStoredPolicy(policy, uid), true, 'positive reservation fixture executes actual canonical owner consent')
  return policy
}
const policy = canonicalProviderPolicy('alice')
const answer = { message: 'A synthetic answer.', caption: 'A synthetic answer.', disclosure: 'OpenAI processed the response.', suggestedActions: ['Pause here'], locale: 'en-US' }

function loadSource(relativePath, dependencies, globals = {}) {
  const filename = path.join(root, relativePath)
  const source = fs.readFileSync(filename, 'utf8')
  const emitted = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, esModuleInterop: true } }).outputText
  const module = { exports: {} }
  const require = (id) => Object.hasOwn(dependencies, id) ? dependencies[id] : localRequire(id)
  const context = vm.createContext({ Buffer, TextEncoder, TextDecoder, AbortController, URL, Response, setTimeout, clearTimeout, process: { env: globals.env || {} }, crypto: webcrypto, ...globals })
  const wrapper = new vm.Script(`(function(require, module, exports) { ${emitted}\n})`, { filename }).runInContext(context)
  wrapper(require, module, module.exports)
  return module.exports
}

class Timestamp {
  constructor(value) { this.value = value }
  toMillis() { return this.value }
  static fromMillis(value) { return new Timestamp(value) }
}
function clone(value) {
  if (value instanceof Timestamp) return new Timestamp(value.value)
  if (Array.isArray(value)) return value.map(clone)
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, clone(v)]))
  return value
}

// This is an atomic storage double, not a real-account or Firestore-emulator
// canary. It exercises the exported HTTP handler, transaction retries, durable
// states shared by cold handler instances, and ambiguous commit acknowledgments.
function storage() {
  const state = { docs: new Map(), queue: Promise.resolve(), retryOnce: false, commitFailure: null, updateFailure: null, transactions: 0 }
  const snapshot = (key, docs = state.docs) => ({ exists: docs.has(key), data: () => clone(docs.get(key)) })
  const apply = (key, value, merge, docs = state.docs) => {
    const prior = merge ? clone(docs.get(key) || {}) : {}
    for (const [field, item] of Object.entries(value)) prior[field] = item?.increment === undefined ? clone(item) : Number(prior[field] || 0) + item.increment
    docs.set(key, prior)
  }
  const doc = (key) => ({
    path: key,
    get: async () => snapshot(key),
    set: async (value, options) => apply(key, value, options?.merge),
    update: async (value) => {
      if (state.updateFailure === 'all' || state.updateFailure === value.state) throw new Error('synthetic storage update failure')
      if (!state.docs.has(key)) throw new Error('document missing')
      apply(key, value, true)
    },
  })
  const db = {
    doc,
    runTransaction: (body) => {
      const execute = async () => {
        const attempt = async () => {
          state.transactions++
          const working = new Map([...state.docs].map(([k, v]) => [k, clone(v)]))
          const result = await body({
            get: async (ref) => snapshot(ref.path, working),
            create: (ref, value) => { if (working.has(ref.path)) throw new Error('create conflict'); apply(ref.path, value, false, working) },
            set: (ref, value, options) => apply(ref.path, value, options?.merge, working),
          })
          return { result, working }
        }
        if (state.retryOnce) { state.retryOnce = false; await attempt() }
        const { result, working } = await attempt()
        if (state.commitFailure === 'before') { state.commitFailure = null; throw new Error('synthetic uncommitted transaction') }
        state.docs = working
        if (state.commitFailure === 'after') { state.commitFailure = null; throw new Error('synthetic lost commit acknowledgement') }
        return result
      }
      const pending = state.queue.then(execute, execute)
      state.queue = pending.then(() => undefined, () => undefined)
      return pending
    },
  }
  return { state, db }
}

function responseDouble({ loseDelivery = false } = {}) {
  return {
    statusCode: 200, headersSent: false, headers: {}, chunks: [], jsonBody: null,
    status(code) { this.statusCode = code; return this },
    json(value) { this.jsonBody = clone(value); this.headersSent = true },
    setHeader(key, value) { this.headers[key] = value },
    write(value) { if (loseDelivery) throw new Error('synthetic HTTP delivery loss'); this.headersSent = true; this.chunks.push(value) },
    end(value) { if (value) this.chunks.push(value); this.headersSent = true },
  }
}

function fixture({ store = storage(), env = {}, fetchHook, authHook, shortenDeadlineMs } = {}) {
  for (const uid of ['alice', 'bob']) {
    if (!store.state.docs.has(`users/${uid}/privacyPolicy/current`)) store.state.docs.set(`users/${uid}/privacyPolicy/current`, canonicalProviderPolicy(uid))
  }
  const calls = []
  let authReads = 0
  const firestore = Object.assign(() => store.db, { Timestamp, FieldValue: { serverTimestamp: () => Timestamp.fromMillis(Date.now()), increment: (value) => ({ increment: value }) } })
  const admin = {
    apps: [{}], initializeApp() {}, firestore,
    auth: () => ({ verifyIdToken: async (token, checkRevoked) => {
      assert.equal(checkRevoked, true)
      authReads++
      if (authHook) return authHook({ token, checkRevoked, authReads })
      if (!['alice', 'bob'].includes(token)) throw new Error('synthetic revoked credential')
      return { uid: token }
    } }),
  }
  const fetch = async (url, options) => {
    assert.ok(['https://api.openai.com/v1/moderations', 'https://api.openai.com/v1/responses'].includes(String(url)), 'unexpected external route')
    const call = { url: String(url), body: JSON.parse(options.body), headers: options.headers, signal: options.signal }
    calls.push(call)
    if (fetchHook) { const handled = await fetchHook(call, calls); if (handled) return handled }
    if (String(url).endsWith('/moderations')) return Response.json({ results: [{ flagged: false }] })
    return sse(answer)
  }
  const exports = loadSource('apps/functions/src/providerFunctions.ts', {
    '../../../packages/localization/src/contentLanguage': loadSource('packages/localization/src/contentLanguage.ts', {}),
    './consentPolicyAuthority': consentPolicyAuthority,
    './protectedProviderSpend': { paidSpatialFetch: (_db, _uid, _lane, _provider, _model, _input, url, init) => fetch(url, init), SpatialSpendError: class extends Error {}, SPATIAL_SPEND_WORKER_TOKENS_JSON: {} },
    'firebase-admin': admin,
    'firebase-functions/params': { defineSecret: () => ({ value: () => 'synthetic-test-only-key' }) },
    'firebase-functions/v2/https': { onRequest: (_options, handler) => handler },
  }, { fetch, env, setTimeout: (callback, duration) => setTimeout(callback, shortenDeadlineMs ? Math.min(duration, shortenDeadlineMs) : duration) })
  const run = async ({ uid = 'alice', body = {}, loseDelivery = false, authorization = `Bearer ${uid}` } = {}) => {
    const response = responseDouble({ loseDelivery })
    await exports.openAiOrbProvider({ method: 'POST', headers: { authorization }, body: { message, context: [], aiProcessingConsent: true, requestId, locale: 'en-US', ...body }, on() {} }, response)
    return response
  }
  const reservations = () => [...store.state.docs].filter(([key]) => key.includes('/providerRequestReservations/'))
  return { run, calls, store, reservations }
}

function sse(value, completed = true) {
  const data = `data: ${JSON.stringify({ type: 'response.output_text.delta', delta: JSON.stringify(value) })}\n\n${completed ? 'data: {"type":"response.completed"}\n\n' : ''}`
  return new Response(data, { headers: { 'content-type': 'text/event-stream', 'x-request-id': 'synthetic-upstream-receipt' } })
}

test('successful actual HTTP handler invocation holds repeats without replaying a cached answer', async () => {
  const f = fixture()
  const first = await f.run(); const repeat = await f.run()
  assert.equal(first.statusCode, 200)
  assert.equal(repeat.statusCode, 409); assert.equal(repeat.jsonBody.error, 'PROVIDER_REQUEST_HELD')
  assert.equal(f.calls.length, 2); assert.equal(f.reservations()[0][1].state, 'completed')
  assert.equal(f.store.state.docs.get('users/alice/providerRateLimits/openai').count, 1)
  assert.equal(repeat.chunks.length, 0)
})

test('twelve concurrent same-intent HTTP requests admit exactly one moderation and response invocation', async () => {
  const f = fixture(); const responses = await Promise.all(Array.from({ length: 12 }, () => f.run()))
  assert.equal(responses.filter((r) => r.statusCode === 200).length, 1)
  assert.equal(responses.filter((r) => r.statusCode === 409 && r.jsonBody.error === 'PROVIDER_REQUEST_HELD').length, 11)
  assert.equal(f.calls.length, 2); assert.equal(f.reservations().length, 1)
})

test('storage transaction retry never repeats upstream work', async () => {
  const f = fixture(); f.store.state.retryOnce = true
  assert.equal((await f.run()).statusCode, 200)
  assert.equal(f.store.state.transactions, 2); assert.equal(f.calls.length, 2)
})

test('unknown provider outcome remains held across a cold handler restart', async () => {
  const f = fixture({ fetchHook: (call) => { if (call.url.endsWith('/responses')) throw new Error('synthetic lost upstream response') } })
  f.store.state.updateFailure = 'all'
  const failed = await f.run(); assert.equal(failed.jsonBody.error, 'PROVIDER_ATTEMPT_UNCERTAIN')
  assert.equal(f.reservations()[0][1].state, 'reserved')
  const restarted = fixture({ store: f.store }); const repeat = await restarted.run()
  assert.equal(repeat.jsonBody.error, 'PROVIDER_REQUEST_HELD'); assert.equal(restarted.calls.length, 0)
})

test('a completed result lost at the HTTP delivery boundary cannot invoke upstream again', async () => {
  const f = fixture(); await f.run({ loseDelivery: true })
  assert.equal(f.reservations()[0][1].state, 'completed')
  const cold = fixture({ store: f.store }); assert.equal((await cold.run()).jsonBody.error, 'PROVIDER_REQUEST_HELD'); assert.equal(cold.calls.length, 0)
})

for (const [name, upstream, code] of [
  ['incomplete SSE', () => sse(answer, false), 'OPENAI_RESPONSE_INCOMPLETE'],
  ['invalid structured answer', () => sse({ message: '' }), 'INVALID_PROVIDER_RESPONSE'],
  ['provider HTTP rejection', () => new Response('', { status: 503 }), 'OPENAI_REQUEST_FAILED'],
]) test(`${name} remains held rather than being retried automatically or manually`, async () => {
  const f = fixture({ fetchHook: (call) => call.url.endsWith('/responses') ? upstream() : undefined })
  assert.equal((await f.run()).jsonBody.error, code)
  assert.equal(f.reservations()[0][1].state, 'uncertain')
  assert.equal((await f.run()).jsonBody.error, 'PROVIDER_REQUEST_HELD'); assert.equal(f.calls.length, 2)
})

test('failure to durably settle an answer prevents HTTP success and keeps replay blocked', async () => {
  const f = fixture(); f.store.state.updateFailure = 'completed'
  const response = await f.run(); assert.equal(response.statusCode, 503); assert.equal(response.jsonBody.error, 'PROVIDER_ATTEMPT_UNCERTAIN')
  assert.equal(response.chunks.length, 0); assert.equal(f.reservations()[0][1].state, 'uncertain')
  assert.equal((await f.run()).jsonBody.error, 'PROVIDER_REQUEST_HELD'); assert.equal(f.calls.length, 2)
})

for (const stage of ['moderations', 'responses']) test(`actual local HTTP ${stage} headers do not release the deadline before delayed body consumption`, async () => {
  let localRequests = 0
  let headersArrived = false
  const server = http.createServer((request, response) => {
    request.resume(); localRequests++
    response.writeHead(200, { 'Content-Type': stage === 'moderations' ? 'application/json' : 'text/event-stream' })
    response.flushHeaders()
    const delayed = setTimeout(() => response.end(stage === 'moderations'
      ? JSON.stringify({ results: [{ flagged: false }] })
      : `data: ${JSON.stringify({ type: 'response.output_text.delta', delta: JSON.stringify(answer) })}\n\ndata: {"type":"response.completed"}\n\n`), 700)
    response.on('close', () => clearTimeout(delayed))
  })
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve) })
  try {
    const url = `http://127.0.0.1:${server.address().port}/${stage}`
    const f = fixture({ shortenDeadlineMs: 200, fetchHook: async (call) => {
      if (!call.url.endsWith(`/${stage}`)) return undefined
      const upstream = await globalThis.fetch(url, { method: 'POST', body: JSON.stringify(call.body), signal: call.signal })
      headersArrived = true
      return upstream
    } })
    const first = await f.run()
    assert.equal(headersArrived, true, 'headers must arrive before the deadline')
    assert.equal(first.statusCode, 503); assert.equal(first.jsonBody.error, 'PROVIDER_ATTEMPT_UNCERTAIN')
    assert.equal(f.reservations()[0][1].state, 'uncertain')
    assert.equal((await f.run()).jsonBody.error, 'PROVIDER_REQUEST_HELD')
    assert.equal(localRequests, 1)
    assert.equal(f.calls.length, stage === 'moderations' ? 1 : 2)
  } finally {
    server.closeAllConnections()
    await new Promise(resolve => server.close(resolve))
  }
})

test('missing moderation decision cannot authorize the response invocation or release its reservation', async () => {
  const f = fixture({ fetchHook: (call) => call.url.endsWith('/moderations') ? Response.json({ results: [] }) : undefined })
  assert.equal((await f.run()).jsonBody.error, 'MODERATION_UNAVAILABLE'); assert.equal(f.calls.length, 1)
  assert.equal((await f.run()).jsonBody.error, 'PROVIDER_REQUEST_HELD'); assert.equal(f.calls.length, 1)
})

test('no upstream request runs when reservation storage has not committed', async () => {
  const f = fixture(); f.store.state.commitFailure = 'before'
  assert.ok((await f.run()).statusCode >= 500); assert.equal(f.calls.length, 0); assert.equal(f.reservations().length, 0)
  assert.equal((await f.run()).statusCode, 200); assert.equal(f.calls.length, 2)
})

test('lost reservation commit acknowledgment leaves a durable hold with zero dispatch', async () => {
  const f = fixture(); f.store.state.commitFailure = 'after'
  assert.ok((await f.run()).statusCode >= 500); assert.equal(f.calls.length, 0); assert.equal(f.reservations().length, 1)
  assert.equal((await f.run()).jsonBody.error, 'PROVIDER_REQUEST_HELD'); assert.equal(f.calls.length, 0)
})

for (const [name, changed] of [['message', { message: 'a changed private intent' }], ['context', { context: [{ role: 'user', content: 'a different context' }] }], ['locale', { locale: 'fr-FR' }]]) {
  test(`same request ID with changed ${name} conflicts with its canonical body`, async () => {
    const f = fixture(); await f.run()
    const response = await f.run({ body: changed }); assert.equal(response.jsonBody.error, 'PROVIDER_REQUEST_CONFLICT'); assert.equal(f.calls.length, 2)
  })
}

test('same request ID with changed trusted server model/configuration is not admitted again', async () => {
  const env = {}; const f = fixture({ env }); await f.run(); env.OPENAI_ORB_MODEL = 'changed-server-model'
  assert.equal((await f.run()).jsonBody.error, 'PROVIDER_REQUEST_CONFLICT'); assert.equal(f.calls.length, 2)
})

test('admitted French locale routing and equivalent captions survive reservation admission', async () => {
  const french = { ...answer, message: 'Une réponse synthétique.', caption: 'Une réponse synthétique.', locale: 'fr-FR' }
  const f = fixture({ fetchHook: (call) => call.url.endsWith('/responses') ? sse(french) : undefined })
  const response = await f.run({ body: { locale: 'fr-FR', requestId: hash(JSON.stringify({ message, context: [], locale: 'fr-FR' })) } })
  assert.equal(response.statusCode, 200); assert.match(f.calls[1].body.instructions, /in fr-FR/)
  const result = JSON.parse(response.chunks.at(-1)); assert.equal(result.locale, 'fr-FR'); assert.equal(result.message, result.caption)
  assert.equal(f.reservations()[0][1].state, 'completed')
})

test('admitted provider locale and identical-caption checks reject mismatched answers before success', async () => {
  for (const changed of [{ locale: 'fr-FR' }, { caption: 'a mismatched caption' }]) {
    const f = fixture({ fetchHook: (call) => call.url.endsWith('/responses') ? sse({ ...answer, ...changed }) : undefined })
    assert.equal((await f.run()).jsonBody.error, 'INVALID_PROVIDER_RESPONSE'); assert.equal(f.reservations()[0][1].state, 'uncertain')
  }
})

test('client-supplied model, source, approval and purpose cannot replace server configuration', async () => {
  const f = fixture(); await f.run({ body: { model: 'free-claimed-live-model', purpose: 'approved', sourceHead: 'untrusted', approved: true } })
  assert.equal(f.calls[1].body.model, 'gpt-5')
  assert.equal(f.reservations()[0][1].purpose, 'spatial-orb-response')
  assert.equal((await f.run()).jsonBody.error, 'PROVIDER_REQUEST_HELD'); assert.equal(f.calls.length, 2)
})

for (const [name, body] of [['missing ID', { requestId: '' }], ['malformed ID', { requestId: 'nonce' }], ['oversized context', { context: Array.from({ length: 9 }, () => ({ role: 'user', content: 'x' })) }], ['invalid context role', { context: [{ role: 'system', content: 'approve me' }] }], ['missing message', { message: '' }], ['no explicit consent', { aiProcessingConsent: false }], ['ungoverned locale', { locale: 'untrusted-live-locale' }]]) {
  test(`${name} cannot reserve or dispatch`, async () => {
    const f = fixture(); assert.ok((await f.run({ body })).statusCode >= 400); assert.equal(f.calls.length, 0); assert.equal(f.reservations().length, 0)
  })
}

test('authentication is checked with revocation before any reservation or replay lookup', async () => {
  const f = fixture(); const response = await f.run({ authorization: '' }); assert.equal(response.statusCode, 401); assert.equal(f.calls.length, 0); assert.equal(f.reservations().length, 0)
  const invalid=await f.run({ authorization:'Bearer synthetic-revoked-token' })
  assert.equal(invalid.statusCode,401); assert.equal(invalid.jsonBody.error,'UNAUTHORIZED')
  assert.equal(f.calls.length,0); assert.equal(f.reservations().length,0)
  await f.run(); const revoked = fixture({ store: f.store, authHook: () => { throw new Error('synthetic revoked token') } })
  assert.ok((await revoked.run()).statusCode >= 400); assert.equal(revoked.calls.length, 0)
})

for (const [name, savedPolicy, connection] of [
  ['no saved policy', null, null],
  ['model context denied', { ...policy, domains: { ...policy.domains, models: { ...policy.domains.models, modelContext: false } } }, null],
  ['enforcement pending', { ...policy, enforcement: { ...policy.enforcement, state: 'pending' } }, null],
  ['provider revocation pending', policy, { processingAllowed: true, revocationState: 'pending' }],
]) test(`${name} cannot use client-supplied consent as authority`, async () => {
  const f = fixture(); const docs = f.store.state.docs
  if (savedPolicy) assert.equal(consentPolicyAuthority.isCanonicalStoredPolicy(savedPolicy, 'alice'), true, 'permission-denial fixture retains a canonical policy shape')
  if (savedPolicy) docs.set('users/alice/privacyPolicy/current', clone(savedPolicy)); else docs.delete('users/alice/privacyPolicy/current')
  if (connection) docs.set('users/alice/providerConnections/openai', clone(connection))
  assert.ok((await f.run()).statusCode >= 400); assert.equal(f.calls.length, 0); assert.equal(f.reservations().length, 0)
})

test('revocation before a held repeat prevents a replay or cached result disclosure', async () => {
  const f = fixture(); await f.run(); f.store.state.docs.set('users/alice/providerConnections/openai', { processingAllowed: false, revocationState: 'complete' })
  const repeat = await f.run(); assert.equal(repeat.jsonBody.error, 'PROVIDER_PROCESSING_REVOKED'); assert.equal(repeat.chunks.length, 0); assert.equal(f.calls.length, 2)
})

test('authentication changing immediately after admission holds the request without dispatch', async () => {
  const f = fixture({ authHook: ({ authReads }) => ({ uid: authReads === 1 ? 'alice' : 'bob' }) })
  assert.equal((await f.run()).jsonBody.error, 'PROVIDER_ATTEMPT_UNCERTAIN'); assert.equal(f.calls.length, 0); assert.equal(f.reservations()[0][1].state, 'uncertain')
})

test('provider revocation after moderation prevents the response invocation and preserves uncertainty', async () => {
  let f
  f = fixture({ fetchHook: (call) => { if (call.url.endsWith('/moderations')) f.store.state.docs.set('users/alice/providerConnections/openai', { processingAllowed: false, revocationState: 'requested' }) } })
  assert.equal((await f.run()).jsonBody.error, 'PROVIDER_ATTEMPT_UNCERTAIN'); assert.equal(f.calls.length, 1); assert.equal(f.reservations()[0][1].state, 'uncertain')
})

test('auth revocation during moderation prevents Responses and retains the held intent', async () => {
  let revoked = false
  const f = fixture({
    authHook: () => { if (revoked) throw new Error('synthetic auth revoked after moderation'); return { uid: 'alice' } },
    fetchHook: (call) => { if (call.url.endsWith('/moderations')) revoked = true },
  })
  assert.equal((await f.run()).jsonBody.error, 'PROVIDER_ATTEMPT_UNCERTAIN'); assert.equal(f.calls.length, 1)
  assert.equal(f.reservations()[0][1].state, 'uncertain')
  assert.ok((await f.run()).statusCode >= 400); assert.equal(f.calls.length, 1)
  revoked = false
  assert.equal((await f.run()).jsonBody.error, 'PROVIDER_REQUEST_HELD'); assert.equal(f.calls.length, 1)
})

test('provider revocation while Responses runs suppresses all output and preserves the held intent', async () => {
  let f
  f=fixture({ fetchHook:call=>{ if(call.url.endsWith('/responses')) f.store.state.docs.set('users/alice/providerConnections/openai',{ processingAllowed:false,revocationState:'requested' }) } })
  const response=await f.run()
  assert.equal(response.jsonBody.error,'PROVIDER_ATTEMPT_UNCERTAIN'); assert.equal(response.chunks.length,0)
  assert.equal(f.reservations()[0][1].state,'uncertain'); assert.equal(f.calls.length,2)
  f.store.state.docs.delete('users/alice/providerConnections/openai')
  assert.equal((await f.run()).jsonBody.error,'PROVIDER_REQUEST_HELD'); assert.equal(f.calls.length,2)
})

test('authentication revoked while Responses runs cannot disclose the private answer', async () => {
  let revoked=false
  const f=fixture({ authHook:()=>{ if(revoked) throw new Error('synthetic revoked during response'); return {uid:'alice'} },fetchHook:call=>{ if(call.url.endsWith('/responses')) revoked=true } })
  const response=await f.run()
  assert.equal(response.jsonBody.error,'PROVIDER_ATTEMPT_UNCERTAIN'); assert.equal(response.chunks.length,0)
  assert.equal(f.reservations()[0][1].state,'uncertain'); assert.equal(f.calls.length,2)
})

test('verified users have separate private reservations and cannot accept copied foreign provenance', async () => {
  const f = fixture(); await f.run(); await f.run({ uid: 'bob' }); assert.equal(f.reservations().length, 2)
  const [alice] = f.reservations().filter(([key]) => key.startsWith('users/alice/'))
  const [bob] = f.reservations().filter(([key]) => key.startsWith('users/bob/'))
  assert.notEqual(alice[1].ownerDigest, bob[1].ownerDigest)
  f.store.state.docs.set(bob[0], clone(alice[1]))
  assert.equal((await f.run({ uid: 'bob' })).jsonBody.error, 'PROVIDER_REQUEST_CONFLICT'); assert.equal(f.calls.length, 4)
})

test('server receipt contains hashes/state only and never retains raw prompts, context, answers or secrets', async () => {
  const context = [{ role: 'user', content: 'synthetic-private-context-marker' }]
  const f = fixture(); await f.run({ body: { context, requestId: hash(JSON.stringify({ message, context, locale: 'en-US' })) } })
  const serialized = JSON.stringify(f.reservations())
  for (const forbidden of [message, 'synthetic-private-context-marker', answer.message, 'synthetic-test-only-key', 'Bearer alice']) assert.equal(serialized.includes(forbidden), false)
  const receipt = f.reservations()[0][1]
  for (const key of ['bodyDigest', 'configurationDigest', 'ownerDigest', 'requestDigest']) assert.match(receipt[key], /^[a-f0-9]{64}$/)
})

test('held duplicate is checked before rate limit and never consumes another admission', async () => {
  const f = fixture(); await f.run(); f.store.state.docs.get('users/alice/providerRateLimits/openai').count = 8
  assert.equal((await f.run()).jsonBody.error, 'PROVIDER_REQUEST_HELD')
  assert.equal((await f.run({ body: { message: 'fresh intent', requestId: hash(JSON.stringify({ message: 'fresh intent', context: [], locale: 'en-US' })) } })).jsonBody.error, 'RATE_LIMITED')
  assert.equal(f.calls.length, 2); assert.equal(f.reservations().length, 1)
})

test('a fresh random-shaped request ID cannot resubmit the same canonical intent', async () => {
  const f = fixture(); await f.run()
  assert.equal((await f.run({ body: { requestId: hash('untrusted fresh nonce') } })).jsonBody.error, 'INVALID_REQUEST_ID')
  assert.equal(f.calls.length, 2); assert.equal(f.reservations().length, 1)
})

test('canonical whitespace and context field ordering cannot create a second identical admission', async () => {
  const context = [{ role: 'user', content: 'same context' }]
  const id = hash(JSON.stringify({ message, context, locale: 'en-US' }))
  const f = fixture(); assert.equal((await f.run({ body: { context, requestId: id } })).statusCode, 200)
  const repeat = await f.run({ body: { message: `  ${message}  `, context: [{ content: ' same context ', role: 'user' }], requestId: id } })
  assert.equal(repeat.jsonBody.error, 'PROVIDER_REQUEST_HELD'); assert.equal(f.calls.length, 2)
})

function client(fetch) {
  const auth = { currentUser: { uid: 'alice', getIdToken: async () => 'alice' } }
  return loadSource('urai-tier1/src/spatial/orb/openaiClient.ts', {
    '@/lib/orb-companion-contract': { buildOrbCompanionResponse: () => ({ reply: 'synthetic local fallback' }) },
    'firebase/auth': { getAuth: () => auth },
    '@/lib/firebase/client': { app: {}, firebasePublicEnvReady: true },
    '@/lib/clientApiUrl': { clientApiUrl: (value) => value },
    '@/lib/i18n/localePreference': { currentSpeechTag: () => 'en-US' },
    '@/lib/i18n/contentLanguage': loadSource('packages/localization/src/contentLanguage.ts', {}),
  }, { fetch })
}
const clientInput = () => ({ message, context: [], aiProcessingConsent: true, signal: new AbortController().signal })

test('actual browser adapter preserves unchanged intent identity across manual retries', async () => {
  const ids = []; const c = client(async (_url, options) => { ids.push(JSON.parse(options.body).requestId); return Response.json({ error: 'PROVIDER_REQUEST_HELD' }, { status: 409 }) })
  for (let attempt = 0; attempt < 2; attempt++) await assert.rejects(c.requestOpenAIOrb(clientInput()), c.OrbProviderAttemptUncertainError)
  assert.equal(ids[0], requestId); assert.equal(ids[1], requestId)
})

for (const code of ['PROVIDER_REQUEST_HELD', 'PROVIDER_REQUEST_CONFLICT', 'PROVIDER_ATTEMPT_UNCERTAIN', 'PROVIDER_BOUNDARY_FAILURE', 'unknown-proxy-error']) {
  test(`actual browser adapter reports ${code} as uncertain rather than no external processing`, async () => {
    const c = client(async () => Response.json({ error: code }, { status: 503 }))
    await assert.rejects(c.requestOpenAIOrb(clientInput()), c.OrbProviderAttemptUncertainError)
  })
}

test('actual browser adapter distinguishes known pre-dispatch rejection from proven external attempt', async () => {
  const rejected = client(async () => Response.json({ error: 'EXPLICIT_CONSENT_REQUIRED' }, { status: 403 }))
  assert.equal(await rejected.requestOpenAIOrb(clientInput()), null)
  const attempted = client(async () => Response.json({ error: 'INPUT_BLOCKED' }, { status: 400 }))
  await assert.rejects(attempted.requestOpenAIOrb(clientInput()), attempted.OrbProviderAttemptError)
})

test('actual client/server HTTP storage path suppresses a repeat after the first successful response is lost', async () => {
  const f = fixture(); let loseFirst = true
  const c = client(async (_url, options) => {
    const r = await f.run({ body: JSON.parse(options.body) })
    if (loseFirst) { loseFirst = false; throw new Error('synthetic proxy lost the response') }
    return r.jsonBody ? Response.json(r.jsonBody, { status: r.statusCode }) : new Response(r.chunks.join(''), { status: r.statusCode, headers: r.headers })
  })
  await assert.rejects(c.requestOpenAIOrb(clientInput()), c.OrbProviderAttemptUncertainError)
  await assert.rejects(c.requestOpenAIOrb(clientInput()), c.OrbProviderAttemptUncertainError)
  assert.equal(f.calls.length, 2); assert.equal(f.reservations()[0][1].state, 'completed')
})
