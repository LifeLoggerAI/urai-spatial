'use strict'

// Execute the actual TypeScript handler with bounded Firebase and HTTPS doubles.
// This is deterministic handler evidence, not a Firestore emulator or live-provider test.
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const crypto = require('node:crypto')
const ts = require('typescript')

const TOKEN_PATH = 'providerOAuthTokens/owner-a_google-workspace'
const CONNECTION_PATH = 'users/owner-a/providerConnections/google-workspace'
const BASELINE_BLOB = 'e4e6a39a7f6d66377a532397a3efda7459225ee9'
const GENERATION_ONLY_BLOB = '5db8e719dddbf073111b6c3f05f363063a8e7b6d'

function deferred() {
  let resolve, reject
  const promise = new Promise((yes, no) => { resolve = yes; reject = no })
  return { promise, resolve, reject }
}

function oauthHarness(options = {}) {
  let now = 1_800_000_000_000
  let transactionId = 0
  let queue = Promise.resolve()
  let failNextCommit = false
  const records = new Map()
  const operations = []
  const authCalls = []
  const fetchCalls = []
  const consoleCalls = []
  const key = Buffer.alloc(32, 7)
  const secrets = {
    GOOGLE_OAUTH_CLIENT_ID: 'fixture-client-id',
    GOOGLE_OAUTH_CLIENT_SECRET: 'fixture-client-secret',
    GOOGLE_OAUTH_TOKEN_ENCRYPTION_KEY: key.toString('base64'),
    ...options.secrets,
  }

  class Timestamp {
    constructor(millis) {
      if (!Number.isFinite(millis)) throw new Error('Invalid fixture timestamp')
      this.millis = millis
    }
    toMillis() { return this.millis }
    static fromMillis(millis) { return new Timestamp(millis) }
  }
  function clone(value) {
    if (value instanceof Timestamp) return new Timestamp(value.millis)
    if (Array.isArray(value)) return Array.from(value, clone)
    if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, clone(v)]))
    return value
  }
  function snapshot(ref) {
    const data = clone(records.get(ref.path))
    return { exists: records.has(ref.path), data: () => clone(data) }
  }
  function apply(write) {
    if (write.type === 'delete') records.delete(write.path)
    else records.set(write.path, write.merge ? { ...clone(records.get(write.path) || {}), ...clone(write.data) } : clone(write.data))
  }
  function doc(documentPath) {
    return {
      path: documentPath,
      async get() { operations.push({ type: 'get', path: documentPath }); return snapshot(this) },
      async set(data, settings) {
        apply({ type: 'set', path: documentPath, data, merge: settings?.merge === true })
        operations.push({ type: 'set', path: documentPath })
      },
      async delete() { records.delete(documentPath); operations.push({ type: 'delete', path: documentPath }) },
    }
  }
  const db = {
    doc,
    collection: (name) => ({ doc: (id) => doc(`${name}/${id}`) }),
    async runTransaction(callback) {
      const previous = queue
      const release = deferred()
      queue = release.promise
      await previous
      const id = ++transactionId
      const writes = []
      const reads = []
      try {
        const transaction = {
          async get(ref) {
            if (writes.length) throw new Error('Fixture transaction read after write')
            reads.push(ref.path)
            return snapshot(ref)
          },
          set(ref, data, settings) { writes.push({ type: 'set', path: ref.path, data: clone(data), merge: settings?.merge === true }); return this },
          delete(ref) { writes.push({ type: 'delete', path: ref.path }); return this },
        }
        const result = await callback(transaction)
        if (failNextCommit) { failNextCommit = false; throw new Error('Synthetic transaction commit failure') }
        for (const write of writes) apply(write)
        operations.push({ type: 'transaction', id, reads, writes: writes.map(({ type, path }) => ({ type, path })) })
        return result
      } catch (error) {
        operations.push({ type: 'transaction-aborted', id, reads, writes: [] })
        throw error
      } finally { release.resolve() }
    },
  }
  const firestore = () => db
  firestore.Timestamp = Timestamp
  firestore.FieldValue = { serverTimestamp: () => Timestamp.fromMillis(now) }
  const admin = {
    apps: [{}], initializeApp() {}, firestore,
    auth: () => ({ async verifyIdToken(token, checkRevoked) {
      authCalls.push({ token, checkRevoked })
      if (options.verifyIdToken) return options.verifyIdToken(token, checkRevoked)
      if (token === 'revoked') throw new Error('Synthetic revoked token; no credentials')
      return { uid: token.startsWith('valid:') ? token.slice(6) : 'owner-a' }
    } }),
  }
  const tokenResponse = () => ({
    access_token: 'fixture-access-token', refresh_token: 'fixture-refresh-token', expires_in: 3600,
    token_type: 'Bearer', scope: 'openid https://www.googleapis.com/auth/drive.file',
  })
  const defaultFetch = async (url) => {
    if (url === 'https://oauth2.googleapis.com/token') return { ok: true, json: async () => tokenResponse() }
    if (url === 'https://oauth2.googleapis.com/revoke') return { ok: true, json: async () => ({}) }
    throw new Error('Unexpected outbound fixture request')
  }
  const boundedFetch = async (url, init) => {
    if (!['https://oauth2.googleapis.com/token', 'https://oauth2.googleapis.com/revoke'].includes(String(url))) {
      throw new Error('Fixture forbids outbound network')
    }
    const call = { url: String(url), method: init?.method, body: Object.fromEntries(init?.body || []) }
    fetchCalls.push(call)
    return options.fetch ? options.fetch(url, init, { defaultFetch, tokenResponse, records, operations }) : defaultFetch(url)
  }

  const sourcePath = options.generationOnlyBaseline
    ? path.join(__dirname, '../fixtures/googleWorkspaceOAuth.generationOnly.before.ts')
    : options.baseline
      ? path.join(__dirname, '../fixtures/googleWorkspaceOAuth.before.ts')
      : path.join(__dirname, '../../src/googleWorkspaceOAuth.ts')
  const source = fs.readFileSync(sourcePath, 'utf8')
  const sourceBlob = crypto.createHash('sha1').update(`blob ${Buffer.byteLength(source)}\0`).update(source).digest('hex')
  const compiled = ts.transpileModule(source, {
    fileName: sourcePath,
    reportDiagnostics: true,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true, strict: true },
  })
  const errors = (compiled.diagnostics || []).filter((d) => d.category === ts.DiagnosticCategory.Error)
  if (errors.length) throw new Error(ts.formatDiagnosticsWithColorAndContext(errors, { getCurrentDirectory: () => '', getCanonicalFileName: (f) => f, getNewLine: () => '\n' }))
  const exports = {}
  class FixedDate extends Date { static now() { return now } }
  const sandbox = {
    exports, module: { exports }, Buffer, URL, URLSearchParams, Date: FixedDate, fetch: boundedFetch,
    process: { env: { ...options.env } },
    console: Object.fromEntries(['log', 'info', 'warn', 'error'].map((level) => [level, (...args) => consoleCalls.push({ level, args })])),
    require(name) {
      if (name === 'node:crypto') return crypto
      if (name === 'firebase-admin') return admin
      if (name === 'firebase-functions/params') return { defineSecret: (name) => ({ name, value: () => secrets[name] || '' }) }
      if (name === 'firebase-functions/v2/https') return { onRequest: (settings, handler) => Object.assign(handler, { settings }) }
      throw new Error(`Fixture cannot load module ${name}`)
    },
  }
  vm.runInNewContext(compiled.outputText, sandbox, { filename: sourcePath, timeout: 1000 })

  async function invoke(name, request = {}) {
    const result = { status: 200, headers: {}, body: undefined, redirect: undefined }
    const response = {
      status(code) { result.status = code; return this },
      json(value) { result.body = clone(value); return this },
      setHeader(name, value) { result.headers[name] = value },
      redirect(code, location) { result.status = code; result.redirect = location; return this },
    }
    const req = { method: name === 'googleOAuthCallback' ? 'GET' : 'POST', headers: { authorization: 'Bearer valid' }, query: {}, ...request }
    await exports[name](req, response)
    return result
  }
  function decrypt(envelope) {
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(envelope.iv, 'base64'))
    decipher.setAuthTag(Buffer.from(envelope.tag, 'base64'))
    return Buffer.concat([decipher.update(Buffer.from(envelope.ciphertext, 'base64')), decipher.final()]).toString('utf8')
  }
  return {
    invoke, records, operations, authCalls, fetchCalls, consoleCalls, Timestamp, decrypt, sourceBlob, sourcePath,
    statePath: (state) => `providerOAuthStates/${crypto.createHash('sha256').update(state).digest('hex')}`,
    setNow(value) { now = value }, now: () => now,
    failNextCommit() { failNextCommit = true },
    seed(documentPath, data) { records.set(documentPath, clone(data)) },
  }
}

module.exports = { oauthHarness, deferred, TOKEN_PATH, CONNECTION_PATH, BASELINE_BLOB, GENERATION_ONLY_BLOB }
