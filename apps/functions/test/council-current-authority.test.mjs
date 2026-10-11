import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import path from 'node:path'
import { createHash } from 'node:crypto'
import test from 'node:test'
import ts from 'typescript'

const providers = ['anthropic', 'gemini', 'xai', 'mistral']
const uid = 'synthetic-council-owner'
const responseText = 'A disclosed synthetic Council response.'
const sourceRoot = process.env.URAI_COUNCIL_AUTHORITY_SOURCE_ROOT
if (process.env.GITHUB_ACTIONS && sourceRoot) throw new Error('Native proof must exercise the checked-out source')
function load(relative, imports, globals = {}) {
  const file = sourceRoot ? path.resolve(sourceRoot, path.basename(relative)) : new URL(relative, import.meta.url)
  const emitted = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText
  const module = { exports: {} }
  vm.runInNewContext(emitted, {
    module, exports: module.exports, require: name => {
      assert.ok(Object.hasOwn(imports, name), `Unexpected source dependency ${name}`)
      return imports[name]
    }, Buffer, URL, AbortController, setTimeout, clearTimeout, ...globals,
  }, { filename: typeof file === 'string' ? file : file.pathname })
  return module.exports
}
const authority = load('../src/consentPolicyAuthority.ts', {})
function policy() {
  return {
    version: 2, revision: 3, ownerId: uid,
    domains: Object.fromEntries(['memory', 'location', 'models', 'exports', 'workforce', 'identity'].map(domain => [domain, {
      mode: domain === 'models' ? 'granted' : 'denied', retentionDays: null,
      precise: false, replayVisible: false, lifeMapVisible: false, modelContext: domain === 'models',
      sharingEnabled: false, automationEnabled: false, likenessEnabled: false,
    }])), enforcement: { state: 'fully-enforced', jobId: null, affectedTargets: [], providerState: 'not-applicable' },
  }
}
function fixture(provider, controls = {}) {
  const state = { uid, policy: policy(), connection: { processingAllowed: true, revocationState: 'not-required' }, paid: [], outputChecks: 0, authChecks: 0, policyReads: 0, secretReads: 0, rateWrites: 0, ended: false }
  const policyPath = `users/${uid}/privacyPolicy/current`
  class Timestamp { constructor(value) { this.value = value } toMillis() { return this.value } static fromMillis(value) { return new Timestamp(value) } }
  const snap = path => ({ exists: path === policyPath || path.includes('/providerConnections/'), data: () => path === policyPath ? structuredClone(state.policy) : path.includes('/providerConnections/') ? structuredClone(state.connection) : {} })
  const doc = path => ({ path, async get() { const snapshot = snap(path); if (path === policyPath) { state.policyReads++; await controls.onPolicyRead?.(state) } return snapshot }, async set() {} })
  const db = { doc, async runTransaction(run) { const result = await run({ get: async ref => snap(ref.path), set() { state.rateWrites++ } }); await controls.afterRate?.(state); return result } }
  const firestore = Object.assign(() => db, { Timestamp, FieldValue: { serverTimestamp: () => 'synthetic', increment: value => value } })
  const admin = { apps: [{}], initializeApp() { assert.fail('SDK initialization is outside this synthetic proof') }, firestore,
    auth: () => ({ async verifyIdToken(token, revoked) { assert.equal(token, 'synthetic-token'); assert.equal(revoked, true); state.authChecks++; if (state.uid === 'revoked') throw Error('Synthetic revoked token'); return { uid: state.uid } } }) }
  class SpatialSpendError extends Error { constructor() { super('Synthetic protected admission expired'); this.status = 503; this.code = 'PROTECTED_SPEND_REQUIRED' } }
  const paidSpatialFetch = async (_db, owner, lane, family, _model, input, url, init) => {
    assert.equal(owner, uid); assert.equal(family, provider); assert.equal(lane, `council-${provider}`)
    assert.equal(input.message, 'Disclosed synthetic question'); assert.equal(init.method, 'POST')
    state.paid.push({ lane, family, url: String(url) }); await controls.onPaid?.(state, init)
    return { ok: true, status: 200, headers: { get: () => 'synthetic-upstream-id' }, async json() {
      await controls.onParse?.(state, init)
      if (provider === 'anthropic') return { content: [{ type: 'text', text: responseText }] }
      if (provider === 'gemini') return { candidates: [{ content: { parts: [{ text: responseText }] } }] }
      return { choices: [{ message: { content: responseText } }] }
    } }
  }
  const env = { [`URAI_COUNCIL_${provider.toUpperCase()}_ENABLED`]: controls.disabled ? 'false' : 'true', [`COUNCIL_${provider.toUpperCase()}_MODEL`]: 'synthetic-model' }
  const exports = load('../src/councilProviderFunctions.ts', {
    'node:crypto': { createHash }, './consentPolicyAuthority': authority, 'firebase-admin': admin,
    'firebase-functions/params': { defineSecret: () => ({ value: () => { state.secretReads++; return 'synthetic-not-a-credential' } }) },
    'firebase-functions/v2/https': { onRequest: (_settings, handler) => handler },
    './protectedProviderSpend': { paidSpatialFetch, assertSpatialPaidOutputCurrent() { state.outputChecks++; if (controls.expired?.(state)) throw new SpatialSpendError() }, SpatialSpendError, SPATIAL_SPEND_WORKER_TOKENS_JSON: {} },
  }, { process: { env }, setTimeout: (cb, delay) => setTimeout(cb, controls.timeoutMs ?? delay) })
  const response = { headersSent: false, writableEnded: false, statusCode: 200, body: undefined, headers: {}, listeners: {},
    status(code) { this.statusCode = code; return this }, setHeader(name, value) { this.headers[name] = value },
    json(value) { this.body = value; this.headersSent = true; this.writableEnded = true },
    end() { this.writableEnded = true }, on(name, handler) { this.listeners[name] = handler } }
  const run = async () => {
    state.closeOutput = () => response.listeners.close?.()
    await exports[`${provider}CouncilProvider`]({ method: 'POST', headers: { authorization: 'Bearer synthetic-token' }, body: { message: 'Disclosed synthetic question', context: [], aiProcessingConsent: true, requestId: 'a'.repeat(64) } }, response)
    return response
  }
  return { state, response, run }
}
for (const provider of providers) {
  test(`${provider} actual handler retains canonical success with current protected output`, async () => {
    const f = fixture(provider); const response = await f.run()
    assert.equal(response.statusCode, 200); assert.equal(response.body.message, responseText)
    assert.equal(response.body.caption, responseText); assert.equal(response.body.provider, provider)
    assert.equal(f.state.paid.length, 1); assert.equal(f.state.outputChecks, 1)
    assert.ok(f.state.authChecks >= 3); assert.ok(f.state.policyReads >= 3)
    assert.equal(response.headers['Cache-Control'], 'private, no-store, max-age=0')
  })
  for (const reason of ['consent', 'owner']) test(`${provider} rate-write withdrawal blocks dispatch: ${reason}`, async () => {
    const f = fixture(provider, { afterRate(state) { if (reason === 'consent') state.policy.domains.models.mode = 'denied'; else state.uid = 'other-owner' } })
    const response = await f.run(); assert.notEqual(response.statusCode, 200); assert.equal(f.state.paid.length, 0)
    assert.equal(response.body.message === responseText, false)
  })
  for (const phase of ['onPaid', 'onParse']) for (const reason of ['consent', 'provider', 'owner']) test(`${provider} ${phase} withdrawal suppresses complete output: ${reason}`, async () => {
    const f = fixture(provider, { [phase](state) { if (reason === 'consent') state.policy.domains.models.mode = 'denied'; else if (reason === 'provider') state.connection.revocationState = 'complete'; else state.uid = 'other-owner' } })
    const response = await f.run(); assert.notEqual(response.statusCode, 200); assert.equal(f.state.paid.length, 1)
    assert.equal(response.body.message === responseText, false)
  })
  test(`${provider} output admission expiry during final asynchronous owner checks suppresses success`, async () => {
    const f = fixture(provider, { expired: state => state.paid.length > 0 && state.policyReads >= 3 })
    const response = await f.run(); assert.equal(response.statusCode, 503); assert.equal(response.body.error, 'PROTECTED_SPEND_REQUIRED')
    assert.equal(f.state.paid.length, 1); assert.equal(response.body.message === responseText, false)
  })
  test(`${provider} original deadline stays active through final asynchronous consent reads`, async () => {
    const f = fixture(provider, { timeoutMs: 15, async onPolicyRead(state) {
      if (state.policyReads >= 3) await new Promise(resolve => setTimeout(resolve, 35))
    } })
    const response = await f.run(); assert.equal(response.statusCode, 499)
    assert.equal(response.body.error, 'COUNCIL_OUTPUT_CANCELLED'); assert.equal(f.state.paid.length, 1)
    assert.equal(response.body.message === responseText, false)
  })
  test(`${provider} closed HTTP delivery suppresses the parsed private response`, async () => {
    const f = fixture(provider, { onParse(state) { state.closeOutput() } })
    const response = await f.run(); assert.equal(response.statusCode, 499)
    assert.equal(response.body.error, 'COUNCIL_OUTPUT_CANCELLED'); assert.equal(f.state.paid.length, 1)
    assert.equal(response.body.message === responseText, false)
  })
  test(`${provider} retains hard-off with zero credential reads or provider actions`, async () => {
    const f = fixture(provider, { disabled: true }); const response = await f.run()
    assert.equal(response.statusCode, 503); assert.equal(response.body.error, 'COUNCIL_PROVIDER_DISABLED')
    assert.equal(f.state.secretReads, 0); assert.equal(f.state.paid.length, 0)
  })
}
