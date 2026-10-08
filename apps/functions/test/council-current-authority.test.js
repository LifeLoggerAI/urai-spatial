const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const http = require('node:http')
const test = require('node:test')
const ts = require('typescript')

// Actual checked-out handler source with explicit Auth, Firestore and paid
// transport doubles. These cases authorize no real provider or cloud operation.
const root = path.resolve(__dirname, '../../..')
function load(relative, imports, globals = {}) {
  const filename = path.join(root, relative)
  const output = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, esModuleInterop: true },
  }).outputText
  const module = { exports: {} }
  const context = vm.createContext({ Buffer, URL, Response, Headers, AbortController,
    setTimeout, clearTimeout, setInterval, clearInterval, process: { env: globals.env ?? {} }, ...globals })
  new vm.Script(`(function(require,module,exports){${output}\n})`, { filename })
    .runInContext(context)((id) => Object.hasOwn(imports, id) ? imports[id] : require(id), module, module.exports)
  return module.exports
}
const canonical = load('apps/functions/src/consentPolicyAuthority.ts', {})
function policy() {
  return { version: 2, revision: 7, ownerId: 'synthetic-owner',
    domains: Object.fromEntries(canonical.CONSENT_DOMAINS.map(domain => [domain, {
      mode: 'granted', retentionDays: 30, precise: false, replayVisible: true, lifeMapVisible: true,
      modelContext: true, sharingEnabled: false, automationEnabled: false, likenessEnabled: true,
    }])), enforcement: { state: 'fully-enforced', jobId: null, affectedTargets: [], providerState: 'complete' } }
}
class SpatialSpendError extends Error { constructor() { super('synthetic protected boundary'); this.status = 503; this.code = 'PROTECTED_SPEND_REQUIRED' } }
class Timestamp { constructor(value) { this.value = value } toMillis() { return this.value } static fromMillis(value) { return new Timestamp(value) } }
function fixture(options = {}) {
  const state = { policy: policy(), connection: null, calls: [], tokenChecks: 0, outputChecks: 0, beforeReserveChecks: 0, writes: [], authorityDigest: 'a'.repeat(64), bindingHash: 'b'.repeat(64) }
  options.initial?.(state)
  const db = { doc: (key) => ({ path: key,
    get: async () => ({ exists: key.includes('/privacyPolicy/') ? Boolean(state.policy) : key.includes('/providerConnections/') ? Boolean(state.connection) : false,
      data: () => structuredClone(key.includes('/privacyPolicy/') ? state.policy : key.includes('/providerConnections/') ? state.connection : {}) }),
    set: async value => { state.writes.push({ key, value }) },
  }), runTransaction: async callback => {
    await callback({ get: ref => ref.get(), set: (ref, value) => { state.writes.push({ key: ref.path, value }) } })
    if (options.afterRateLimit) await options.afterRateLimit(state)
  } }
  const firestore = Object.assign(() => db, { Timestamp, FieldValue: { increment: n => ({ increment: n }), serverTimestamp: () => Timestamp.fromMillis(Date.now()) } })
  const imports = {
    './consentPolicyAuthority': canonical,
    './personPresenceAuthority': { PersonPresenceAuthorityError: class extends Error {},
      loadPersonPresenceAuthority: async () => ({ authorityDigest: state.authorityDigest }),
      requirePersonPresenceRenderBinding: async () => ({ get: key => ({ provider: 'elevenlabs', bindingHash: state.bindingHash,
        providerResourceId: 'SYNTHETIC-voice', providerModelId: 'synthetic-model' })[key] }),
    },
    'firebase-admin': { apps: [{}], firestore, auth: () => ({ verifyIdToken: async (_token, checkRevoked) => {
      assert.equal(checkRevoked, true); state.tokenChecks++
      return options.auth ? options.auth(state) : { uid: 'synthetic-owner' }
    } }) },
    'firebase-functions/params': { defineSecret: () => ({ value: () => 'synthetic-only-credential' }) },
    'firebase-functions/v2/https': { onRequest: (_config, handler) => handler },
    './protectedProviderSpend': { SpatialSpendError, SPATIAL_SPEND_WORKER_TOKENS_JSON: {},
      paidSpatialFetch: async (_db, _uid, _lane, provider, _model, _input, target, init, beforeReserve) => {
        if (options.beforeReserve) await options.beforeReserve(state)
        if (beforeReserve) { state.beforeReserveChecks++; await beforeReserve() }
        state.calls.push({ provider, target: String(target), init })
        if (options.transport) return options.transport(state.calls.at(-1), state)
        const response = provider === 'elevenlabs' ? new Response('SYNTHETIC audio', { headers: { 'content-type': 'audio/mpeg' } }) : Response.json(provider === 'anthropic' ? { content: [{ type: 'text', text: 'SYNTHETIC answer' }] }
          : provider === 'gemini' ? { candidates: [{ content: { parts: [{ text: 'SYNTHETIC answer' }] } }] }
          : { choices: [{ message: { content: 'SYNTHETIC answer' } }] })
        const json = response.json.bind(response)
        response.json = async () => { const value = await json(); if (options.afterBody) await options.afterBody(state); return value }
        if (provider === 'elevenlabs') {
          const getReader = response.body.getReader.bind(response.body)
          response.body.getReader = () => {
            const reader = getReader(), read = reader.read.bind(reader)
            reader.read = async () => { const chunk = await read(); if (chunk.done && options.afterBody) await options.afterBody(state); return chunk }
            return reader
          }
        }
        return response
      },
      assertSpatialPaidOutputCurrent: () => { state.outputChecks++; if (options.outputCheck) options.outputCheck(state) },
    },
  }
  const env = Object.fromEntries(['anthropic', 'gemini', 'xai', 'mistral'].flatMap(provider => [
    [`URAI_COUNCIL_${provider.toUpperCase()}_ENABLED`, 'true'], [`COUNCIL_${provider.toUpperCase()}_MODEL`, 'synthetic-model'],
  ]))
  env.PERSON_PRESENCE_VOICE_ENABLED = 'true'
  const exports = load(options.voice ? 'apps/functions/src/personPresenceVoiceProvider.ts' : 'apps/functions/src/councilProviderFunctions.ts', imports, { env })
  const run = async (provider = 'anthropic', body = {}) => {
    const response = { statusCode: 0, jsonBody: null, headersSent: false, writableEnded: false, headers: {}, listeners: {},
      status(code) { this.statusCode = code; return this }, setHeader(key, value) { this.headers[key] = value },
      on(name, listener) { this.listeners[name] = listener }, json(value) { this.jsonBody = structuredClone(value); this.headersSent = true; this.writableEnded = true },
      end(bytes) { this.bytes = bytes; this.writableEnded = true },
    }
    await (options.voice ? exports.personPresenceVoiceProvider : exports[`${provider}CouncilProvider`])({ method: 'POST', headers: { authorization: 'Bearer synthetic-token' }, body: {
      message: 'SYNTHETIC private request; never send externally', context: [], requestId: 'a'.repeat(64), aiProcessingConsent: true,
      sessionId: 'presence:synthetic-session-123', text: 'SYNTHETIC narration', externalProcessingConsent: true, ...body,
    } }, response)
    return response
  }
  return { state, run }
}

for (const provider of ['anthropic', 'gemini', 'xai', 'mistral']) {
  test(`${provider} keeps the current consented result, caption and actual provider attribution`, async () => {
    const f = fixture(); const result = await f.run(provider)
    assert.equal(result.statusCode, 200); assert.equal(result.jsonBody.provider, provider)
    assert.equal(result.jsonBody.message, result.jsonBody.caption); assert.equal(f.state.calls.length, 1)
    assert.ok(f.state.tokenChecks >= 2); assert.equal(f.state.beforeReserveChecks, 1); assert.ok(f.state.outputChecks >= 1)
  })
  test(`${provider} denies policy withdrawal after the provider body without publishing its text`, async () => {
    const f = fixture({ afterBody: state => { state.policy.domains.models.modelContext = false } })
    const result = await f.run(provider)
    assert.equal(result.statusCode, 403); assert.equal(result.jsonBody.error, 'MODEL_PROCESSING_NOT_AUTHORIZED')
    assert.equal(result.jsonBody.externalProcessingAttempted, true); assert.ok(!JSON.stringify(result.jsonBody).includes('SYNTHETIC answer'))
  })
}
test('consent withdrawal during protected preflight denies provider dispatch', async () => {
  const f = fixture({ beforeReserve: state => { state.connection = { processingAllowed: false, revocationState: 'complete' } } })
  const result = await f.run(); assert.equal(result.statusCode, 403); assert.equal(f.state.calls.length, 0)
})
test('a replacement granted revision cannot silently authorize the prior Council intent', async () => {
  const f = fixture({ afterBody: state => { state.policy.revision++ } })
  const result = await f.run(); assert.equal(result.statusCode, 409); assert.equal(result.jsonBody.error, 'CONSENT_AUTHORITY_CHANGED')
})
test('a revoked token at the final boundary denies a previously completed provider result', async () => {
  const f = fixture({ afterBody: state => { state.revoked = true }, auth: state => {
    if (state.revoked) throw new Error('synthetic revoked session'); return { uid: 'synthetic-owner' }
  } })
  const result = await f.run(); assert.equal(result.statusCode, 401); assert.equal(result.jsonBody.error, 'UNAUTHORIZED')
  assert.equal(result.jsonBody.externalProcessingAttempted, true)
})
test('protected output authority expiration after consent/auth awaits withholds the result', async () => {
  const f = fixture({ outputCheck: () => { throw new SpatialSpendError() } })
  const result = await f.run(); assert.equal(result.statusCode, 503); assert.equal(result.jsonBody.error, 'PROTECTED_SPEND_REQUIRED')
})
test('without explicit consent no provider or protected admission is called', async () => {
  const f = fixture(); const result = await f.run('anthropic', { aiProcessingConsent: false })
  assert.equal(result.statusCode, 403); assert.equal(f.state.calls.length, 0); assert.equal(f.state.beforeReserveChecks, 0)
})
test('real loopback delayed body keeps consent withdrawal fenced at final publication', async () => {
  let changed = false
  const server = http.createServer((request, response) => {
    request.resume(); response.writeHead(200, { 'Content-Type': 'application/json' }); response.flushHeaders()
    setImmediate(() => { changed = true; response.end(JSON.stringify({ content: [{ type: 'text', text: 'SYNTHETIC loopback answer' }] })) })
  })
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  try {
    const f = fixture({ transport: async (call, state) => {
      const response = await fetch(`http://127.0.0.1:${server.address().port}`, { method: 'POST', body: call.init.body, signal: call.init.signal })
      const json = response.json.bind(response)
      response.json = async () => { const result = await json(); assert.equal(changed, true); state.policy = null; return result }
      return response
    } })
    const result = await f.run(); assert.equal(result.statusCode, 403); assert.equal(result.jsonBody.error, 'CONSENT_POLICY_REQUIRED')
    assert.equal(result.jsonBody.externalProcessingAttempted, true)
  } finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)) }
})
test('accepted synthetic person voice still returns bounded private audio under current authority', async () => {
  const f = fixture({ voice: true }); const result = await f.run()
  assert.equal(result.statusCode, 200); assert.equal(result.bytes.toString(), 'SYNTHETIC audio')
  assert.equal(f.state.beforeReserveChecks, 1); assert.ok(f.state.outputChecks >= 1); assert.ok(f.state.tokenChecks >= 2)
})
for (const [name, change] of [
  ['foreign policy owner', state => { state.policy.ownerId = 'FOREIGN' }],
  ['missing policy revision', state => { delete state.policy.revision }],
]) test(`person voice ${name} never authorizes synthesis`, async () => {
  const f = fixture({ voice: true, initial: change }); const result = await f.run()
  assert.equal(result.statusCode, 403); assert.equal(f.state.calls.length, 0)
})
test('person voice consent revision replacement during synthesis withholds audio', async () => {
  const f = fixture({ voice: true, afterBody: state => { state.policy.revision++ } }); const result = await f.run()
  assert.equal(result.statusCode, 409); assert.equal(result.bytes, undefined)
})
test('person voice revoked token during synthesis withholds audio', async () => {
  const f = fixture({ voice: true, afterBody: state => { state.revoked = true }, auth: state => {
    if (state.revoked) throw new Error('synthetic revoked token'); return { uid: 'synthetic-owner' }
  } }); const result = await f.run()
  assert.equal(result.statusCode, 401); assert.equal(result.bytes, undefined)
})
test('person voice source change during protected preflight denies synthesis', async () => {
  const f = fixture({ voice: true, beforeReserve: state => { state.authorityDigest = 'c'.repeat(64) } }); const result = await f.run()
  assert.equal(result.statusCode, 409); assert.equal(f.state.calls.length, 0)
})
test('person voice protected output expiration after final authority awaits withholds audio', async () => {
  const f = fixture({ voice: true, outputCheck: () => { throw new SpatialSpendError() } }); const result = await f.run()
  assert.equal(result.statusCode, 503); assert.equal(result.bytes, undefined)
})
