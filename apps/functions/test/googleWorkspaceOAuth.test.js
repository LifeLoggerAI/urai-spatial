'use strict'

const assert = require('node:assert/strict')
const crypto = require('node:crypto')
const { test } = require('node:test')
const { oauthHarness, deferred, TOKEN_PATH, CONNECTION_PATH, BASELINE_BLOB, GENERATION_ONLY_BLOB } = require('./helpers/googleWorkspaceOAuthHarness')
const caseTest = (name, fn) => test(name, { timeout: 10000 }, fn)
const EXCHANGE_URL = 'https://oauth2.googleapis.com/token'
const REVOKE_URL = 'https://oauth2.googleapis.com/revoke'

async function start(h, request) {
  const response = await h.invoke('googleOAuthStart', request)
  assert.equal(response.status, 200)
  const url = new URL(response.body.authorizationUrl)
  const state = url.searchParams.get('state')
  return { response, url, state, document: h.records.get(h.statePath(state)) }
}
async function callback(h, state) {
  return h.invoke('googleOAuthCallback', { query: { state, code: 'fixture-code' } })
}
async function connect(h) {
  const pending = await start(h)
  const response = await callback(h, pending.state)
  assert.equal(response.redirect, 'https://urai.app/settings?google=connected')
  return pending
}
function noTokens(h) {
  assert.equal(h.records.has(TOKEN_PATH), false)
  assert.notEqual(h.records.get(CONNECTION_PATH)?.connected, true)
}
function exchangeCalls(h) { return h.fetchCalls.filter((c) => c.url === EXCHANGE_URL) }
function noSecretLogs(h) {
  const text = JSON.stringify(h.consoleCalls)
  for (const value of ['fixture-access-token', 'fixture-refresh-token', 'fixture-client-secret', Buffer.alloc(32, 7).toString('base64')]) {
    assert.equal(text.includes(value), false)
  }
}

caseTest('baseline receipt: pinned original reconnects after start, disconnect, then old callback', async () => {
  const h = oauthHarness({ baseline: true })
  assert.equal(h.sourceBlob, BASELINE_BLOB)
  const pending = await start(h)
  assert.equal((await h.invoke('googleOAuthDisconnect')).status, 200)
  noTokens(h)
  assert.equal((await callback(h, pending.state)).redirect, 'https://urai.app/settings?google=connected')
  assert.equal(h.records.get(CONNECTION_PATH).connected, true)
})

caseTest('baseline receipt: pinned original reconnects when exchange returns after disconnect', async () => {
  const entered = deferred(), release = deferred()
  const h = oauthHarness({ baseline: true, fetch: async (url, init, { defaultFetch }) => {
    if (url === EXCHANGE_URL) { entered.resolve(); await release.promise }
    return defaultFetch(url)
  } })
  assert.equal(h.sourceBlob, BASELINE_BLOB)
  const pending = await start(h)
  const inflight = callback(h, pending.state)
  await entered.promise
  assert.equal((await h.invoke('googleOAuthDisconnect')).status, 200)
  noTokens(h)
  release.resolve()
  assert.equal((await inflight).redirect, 'https://urai.app/settings?google=connected')
  assert.equal(h.records.get(CONNECTION_PATH).connected, true)
})

caseTest('superseded generation-only receipt: deleting the marker revives an old state at generation zero', async () => {
  const h = oauthHarness({ generationOnlyBaseline: true })
  assert.equal(h.sourceBlob, GENERATION_ONLY_BLOB)
  const pending = await start(h)
  await h.invoke('googleOAuthDisconnect')
  h.records.delete(CONNECTION_PATH)
  assert.equal((await callback(h, pending.state)).redirect, 'https://urai.app/settings?google=connected')
  assert.equal(h.records.get(CONNECTION_PATH).connected, true)
})

for (const name of ['googleOAuthStart', 'googleOAuthStatus', 'googleOAuthDisconnect']) {
  caseTest(`${name}: missing or empty bearer token is rejected without mutation`, async () => {
    const h = oauthHarness()
    for (const authorization of [undefined, 'Bearer ', 'Basic fixture']) {
      const response = await h.invoke(name, { headers: { authorization } })
      assert.equal(response.status, 401)
      assert.equal(response.body.error, 'UNAUTHORIZED')
    }
    assert.equal(h.records.size, 0)
    assert.equal(h.authCalls.length, 0)
    assert.equal(h.fetchCalls.length, 0)
  })
  caseTest(`${name}: revoked Firebase authentication is checked and rejected opaquely`, async () => {
    const h = oauthHarness()
    const response = await h.invoke(name, { headers: { authorization: 'Bearer revoked' } })
    assert.equal(response.status, 500)
    assert.equal(response.body.error, 'GOOGLE_OAUTH_FAILURE')
    assert.equal(JSON.stringify(response).includes('Synthetic revoked'), false)
    assert.deepEqual(h.authCalls, [{ token: 'revoked', checkRevoked: true }])
    assert.equal(h.records.size, 0)
    assert.equal(h.fetchCalls.length, 0)
  })
  caseTest(`${name}: decoded token without uid is rejected`, async () => {
    const h = oauthHarness({ verifyIdToken: async () => ({}) })
    assert.equal((await h.invoke(name)).status, 401)
    assert.equal(h.authCalls[0].checkRevoked, true)
    assert.equal(h.records.size, 0)
  })
  caseTest(`${name}: wrong method is rejected before authentication or persistence`, async () => {
    const h = oauthHarness()
    assert.equal((await h.invoke(name, { method: 'GET' })).status, 405)
    assert.equal(h.authCalls.length, 0)
    assert.equal(h.records.size, 0)
  })
}

caseTest('start: hashed uid-bound state, ten minute TTL, S256 PKCE and callback binding', async () => {
  const h = oauthHarness()
  const pending = await start(h)
  assert.equal(pending.url.origin, 'https://accounts.google.com')
  assert.equal(pending.document.uid, 'owner-a')
  assert.equal(pending.document.expiresAt.toMillis(), h.now() + 600000)
  assert.equal(pending.document.disconnectGeneration, 0)
  assert.match(pending.document.oauthInstance, /^[A-Za-z0-9_-]{43}$/)
  assert.equal(h.records.get(CONNECTION_PATH).oauthInstance, pending.document.oauthInstance)
  assert.equal(h.records.has(`providerOAuthStates/${pending.state}`), false)
  assert.match(pending.document.verifier, /^[A-Za-z0-9_-]{64}$/)
  assert.equal(pending.url.searchParams.get('code_challenge_method'), 'S256')
  assert.equal(pending.url.searchParams.get('code_challenge'), crypto.createHash('sha256').update(pending.document.verifier).digest('base64url'))
  assert.equal(pending.url.searchParams.get('client_id'), 'fixture-client-id')
  assert.equal(pending.url.searchParams.get('redirect_uri'), 'https://urai.app/api/google/oauth/callback')
  assert.equal(pending.url.searchParams.get('access_type'), 'offline')
  assert.equal(pending.url.searchParams.get('prompt'), 'consent')
  assert.equal(pending.response.headers['Cache-Control'], 'private, no-store, max-age=0')
  assert.equal(h.fetchCalls.length, 0)
  const write = h.operations.find((o) => o.type === 'transaction' && o.writes.some((w) => w.path === h.statePath(pending.state)))
  assert.deepEqual(write.reads, [CONNECTION_PATH])
})

caseTest('callback: actual code exchange uses PKCE and persists authenticated AES-GCM envelopes atomically', async () => {
  const h = oauthHarness()
  const pending = await connect(h)
  assert.equal(h.records.has(h.statePath(pending.state)), false)
  const exchange = exchangeCalls(h)[0]
  assert.equal(exchange.method, 'POST')
  assert.equal(exchange.body.code_verifier, pending.document.verifier)
  assert.equal(exchange.body.redirect_uri, pending.url.searchParams.get('redirect_uri'))
  assert.equal(exchange.body.code, 'fixture-code')
  assert.equal(exchange.body.grant_type, 'authorization_code')
  const tokens = h.records.get(TOKEN_PATH)
  assert.equal(tokens.uid, 'owner-a')
  assert.equal(tokens.accessToken.alg, 'A256GCM')
  assert.equal(h.decrypt(tokens.accessToken), 'fixture-access-token')
  assert.equal(h.decrypt(tokens.refreshToken), 'fixture-refresh-token')
  assert.equal(JSON.stringify([...h.records.values()]).includes('fixture-access-token'), false)
  const commit = h.operations.find((o) => o.type === 'transaction' && o.writes.some((w) => w.path === TOKEN_PATH && w.type === 'set'))
  assert.deepEqual(new Set(commit.reads), new Set([TOKEN_PATH, CONNECTION_PATH]))
  assert.deepEqual(new Set(commit.writes.map((w) => w.path)), new Set([TOKEN_PATH, CONNECTION_PATH]))
  assert.equal(h.records.get(CONNECTION_PATH).disconnectGeneration, 0)
  noSecretLogs(h)
})

caseTest('callback: configured redirect URI and app origin retain exact bindings', async () => {
  const h = oauthHarness({ env: { GOOGLE_OAUTH_REDIRECT_URI: 'https://www.urai.app/api/google/oauth/callback', URAI_APP_ORIGIN: 'https://www.urai.app/' } })
  const pending = await start(h)
  const response = await callback(h, pending.state)
  assert.equal(exchangeCalls(h)[0].body.redirect_uri, pending.url.searchParams.get('redirect_uri'))
  assert.equal(response.redirect, 'https://www.urai.app/settings?google=connected')
})

caseTest('callback: a consumed state cannot replay or exchange twice', async () => {
  const h = oauthHarness()
  const pending = await connect(h)
  assert.equal((await callback(h, pending.state)).redirect, 'https://urai.app/settings?google=invalid-state')
  assert.equal(exchangeCalls(h).length, 1)
})

caseTest('callback: concurrent claims of one state permit exactly one exchange', async () => {
  const h = oauthHarness()
  const pending = await start(h)
  const results = await Promise.all([callback(h, pending.state), callback(h, pending.state)])
  assert.deepEqual(results.map((r) => r.redirect).sort(), ['https://urai.app/settings?google=connected', 'https://urai.app/settings?google=invalid-state'].sort())
  assert.equal(exchangeCalls(h).length, 1)
})

caseTest('callback: expired state is consumed and cannot exchange', async () => {
  const h = oauthHarness()
  const pending = await start(h)
  h.setNow(h.now() + 600001)
  assert.equal((await callback(h, pending.state)).redirect, 'https://urai.app/settings?google=invalid-state')
  assert.equal(h.records.has(h.statePath(pending.state)), false)
  assert.equal(exchangeCalls(h).length, 0)
  noTokens(h)
})

for (const [name, mutation] of [
  ['missing expiry', { expiresAt: undefined }], ['incorrect expiry type', { expiresAt: 1_900_000_000_000 }],
  ['missing uid', { uid: undefined }], ['missing verifier', { verifier: undefined }],
  ['malformed generation', { disconnectGeneration: -1 }],
  ['missing marker instance', { oauthInstance: undefined }], ['malformed marker instance', { oauthInstance: 'invalid' }],
]) {
  caseTest(`callback: ${name} invalidates and consumes state without exchange`, async () => {
    const h = oauthHarness()
    const pending = await start(h)
    h.seed(h.statePath(pending.state), { ...pending.document, ...mutation })
    assert.equal((await callback(h, pending.state)).redirect, 'https://urai.app/settings?google=invalid-state')
    assert.equal(h.records.has(h.statePath(pending.state)), false)
    assert.equal(exchangeCalls(h).length, 0)
    noTokens(h)
  })
}

caseTest('callback: unknown, missing or non-string state/code cannot exchange', async () => {
  const h = oauthHarness()
  for (const query of [{}, { state: 'unknown', code: 'fixture-code' }, { state: ['unknown'], code: 'fixture-code' }, { state: 'unknown', code: ['fixture-code'] }]) {
    assert.equal((await h.invoke('googleOAuthCallback', { query })).redirect, 'https://urai.app/settings?google=invalid-state')
  }
  assert.equal(exchangeCalls(h).length, 0)
  noTokens(h)
})

caseTest('callback: provider denial and wrong method persist no tokens', async () => {
  const h = oauthHarness()
  assert.equal((await h.invoke('googleOAuthCallback', { query: { error: 'access_denied' } })).redirect, 'https://urai.app/settings?google=denied')
  assert.equal((await h.invoke('googleOAuthCallback', { method: 'POST' })).redirect, 'https://urai.app/settings?google=error')
  assert.equal(h.fetchCalls.length, 0)
  noTokens(h)
})

for (const mode of ['http failure', 'network failure', 'invalid json', 'missing access', 'missing expiry', 'missing first refresh']) {
  caseTest(`callback: ${mode} consumes state and cannot persist tokens or replay`, async () => {
    const h = oauthHarness({ fetch: async () => {
      if (mode === 'network failure') throw new Error('Synthetic provider failure')
      return { ok: mode !== 'http failure', json: async () => {
        if (mode === 'invalid json') throw new SyntaxError('Synthetic invalid JSON')
        return { access_token: mode === 'missing access' ? undefined : 'fixture-access-token', expires_in: mode === 'missing expiry' ? undefined : 3600, refresh_token: mode === 'missing first refresh' ? undefined : 'fixture-refresh-token' }
      } }
    } })
    const pending = await start(h)
    assert.equal((await callback(h, pending.state)).redirect, 'https://urai.app/settings?google=error')
    assert.equal((await callback(h, pending.state)).redirect, 'https://urai.app/settings?google=invalid-state')
    assert.equal(exchangeCalls(h).length, 1)
    noTokens(h)
    noSecretLogs(h)
  })
}

caseTest('callback: invalid encryption configuration fails closed without partial token or marker writes', async () => {
  const h = oauthHarness({ secrets: { GOOGLE_OAUTH_TOKEN_ENCRYPTION_KEY: 'invalid-fixture-key' } })
  const pending = await start(h)
  assert.equal((await callback(h, pending.state)).redirect, 'https://urai.app/settings?google=error')
  noTokens(h)
  noSecretLogs(h)
  assert.equal(h.operations.some((o) => o.type === 'transaction-aborted'), true)
})

caseTest('callback: subsequent valid authorization preserves existing encrypted refresh token', async () => {
  let exchanges = 0
  const h = oauthHarness({ fetch: async (url, init, { defaultFetch, tokenResponse }) => {
    if (url !== EXCHANGE_URL) return defaultFetch(url)
    const tokens = tokenResponse()
    if (++exchanges > 1) delete tokens.refresh_token
    return { ok: true, json: async () => tokens }
  } })
  await connect(h)
  await connect(h)
  assert.equal(h.decrypt(h.records.get(TOKEN_PATH).refreshToken), 'fixture-refresh-token')
})

caseTest('status: authenticated metadata excludes token envelopes and another user connection', async () => {
  const h = oauthHarness()
  await connect(h)
  const response = await h.invoke('googleOAuthStatus')
  assert.deepEqual(Object.keys(response.body).sort(), ['connected', 'status', 'scopes', 'expiresAt'].sort())
  assert.equal(response.body.connected, true)
  assert.equal(response.headers['Cache-Control'], 'private, no-store, max-age=0')
  assert.equal(JSON.stringify(response).includes('fixture-access-token'), false)
  assert.equal((await h.invoke('googleOAuthStatus', { headers: { authorization: 'Bearer valid:owner-b' } })).body.connected, false)
})

caseTest('status: absent marker reports disconnected without network or mutations', async () => {
  const h = oauthHarness()
  assert.deepEqual((await h.invoke('googleOAuthStatus')).body, { connected: false, status: 'disconnected', scopes: [], expiresAt: null })
  assert.equal(h.fetchCalls.length, 0)
  assert.equal(h.records.size, 0)
})

for (const mode of ['success', 'network failure', 'http failure']) {
  caseTest(`disconnect: ${mode} of upstream revocation leaves local tokens deleted and generation advanced`, async () => {
    const h = oauthHarness({ fetch: async (url, init, { defaultFetch }) => {
      if (url === REVOKE_URL && mode === 'network failure') throw new Error('Synthetic offline revocation')
      if (url === REVOKE_URL && mode === 'http failure') return { ok: false }
      return defaultFetch(url)
    } })
    await connect(h)
    assert.equal((await h.invoke('googleOAuthDisconnect')).status, 200)
    noTokens(h)
    const marker = h.records.get(CONNECTION_PATH)
    assert.equal(marker.disconnectGeneration, 1)
    assert.equal(marker.status, 'disconnected')
    assert.deepEqual(marker.scopes, [])
    assert.equal(marker.expiresAt, null)
    assert.equal(h.fetchCalls.at(-1).body.token, 'fixture-refresh-token')
    assert.equal(h.authCalls.at(-1).checkRevoked, true)
    const commit = h.operations.find((o) => o.type === 'transaction' && o.writes.some((w) => w.type === 'delete' && w.path === TOKEN_PATH))
    assert.deepEqual(new Set(commit.writes.map((w) => w.path)), new Set([TOKEN_PATH, CONNECTION_PATH]))
  })
}

caseTest('disconnect: invalid encrypted envelopes cannot prevent local authority removal', async () => {
  const h = oauthHarness()
  h.seed(TOKEN_PATH, { accessToken: { v: 9 }, refreshToken: { v: 1, alg: 'A256GCM', iv: 'bad', tag: 'bad', ciphertext: 'bad' } })
  assert.equal((await h.invoke('googleOAuthDisconnect')).status, 200)
  noTokens(h)
  assert.equal(h.fetchCalls.length, 0)
})

caseTest('privacy regression: disconnect fences an earlier valid pending callback', async () => {
  const h = oauthHarness()
  const pending = await start(h)
  await h.invoke('googleOAuthDisconnect')
  assert.equal((await callback(h, pending.state)).redirect, 'https://urai.app/settings?google=error')
  noTokens(h)
  assert.equal(h.records.get(CONNECTION_PATH).disconnectGeneration, 1)
})

caseTest('privacy regression: disconnect fences an in-flight exchange before its return', async () => {
  const entered = deferred(), release = deferred()
  const h = oauthHarness({ fetch: async (url, init, { defaultFetch }) => {
    if (url === EXCHANGE_URL) { entered.resolve(); await release.promise }
    return defaultFetch(url)
  } })
  const pending = await start(h)
  const inflight = callback(h, pending.state)
  await entered.promise
  await h.invoke('googleOAuthDisconnect')
  release.resolve()
  assert.equal((await inflight).redirect, 'https://urai.app/settings?google=error')
  noTokens(h)
})

caseTest('reconnect: fresh start after disconnect captures new generation and succeeds', async () => {
  const h = oauthHarness()
  const stale = await start(h)
  await h.invoke('googleOAuthDisconnect')
  const fresh = await connect(h)
  assert.equal(fresh.document.disconnectGeneration, 1)
  assert.equal((await callback(h, stale.state)).redirect, 'https://urai.app/settings?google=error')
  assert.equal(h.records.get(CONNECTION_PATH).connected, true)
  assert.equal(h.records.get(CONNECTION_PATH).disconnectGeneration, 1)
  assert.equal(h.decrypt(h.records.get(TOKEN_PATH).refreshToken), 'fixture-refresh-token')
})

caseTest('disconnect: local fence commits before upstream wait and older completion cannot delete a fresh reconnect', async () => {
  const entered = deferred(), release = deferred()
  const h = oauthHarness({ fetch: async (url, init, { defaultFetch }) => {
    if (url === REVOKE_URL) { entered.resolve(); await release.promise }
    return defaultFetch(url)
  } })
  await connect(h)
  const stale = await start(h)
  const disconnect = h.invoke('googleOAuthDisconnect')
  await entered.promise
  noTokens(h)
  assert.equal((await h.invoke('googleOAuthStatus')).body.connected, false)
  assert.equal((await callback(h, stale.state)).redirect, 'https://urai.app/settings?google=error')
  await connect(h)
  release.resolve()
  assert.equal((await disconnect).status, 200)
  assert.equal(h.records.get(CONNECTION_PATH).connected, true)
  assert.equal(h.records.get(CONNECTION_PATH).disconnectGeneration, 1)
})

caseTest('disconnect: concurrent requests advance the fence twice and invalidate intermediate state', async () => {
  const entered = deferred(), release = deferred()
  const h = oauthHarness({ fetch: async (url, init, { defaultFetch }) => {
    if (url === REVOKE_URL) { entered.resolve(); await release.promise }
    return defaultFetch(url)
  } })
  await connect(h)
  const first = h.invoke('googleOAuthDisconnect')
  await entered.promise
  const intermediate = await start(h)
  assert.equal((await h.invoke('googleOAuthDisconnect')).status, 200)
  assert.equal(h.records.get(CONNECTION_PATH).disconnectGeneration, 2)
  assert.equal((await callback(h, intermediate.state)).redirect, 'https://urai.app/settings?google=error')
  release.resolve()
  await first
  noTokens(h)
  const fresh = await connect(h)
  assert.equal(fresh.document.disconnectGeneration, 2)
})

caseTest('callback: a stale in-flight exchange cannot overwrite newer connected tokens', async () => {
  const entered = deferred(), release = deferred()
  let exchanges = 0
  const h = oauthHarness({ fetch: async (url, init, { defaultFetch, tokenResponse }) => {
    if (url !== EXCHANGE_URL) return defaultFetch(url)
    const old = ++exchanges === 1
    if (old) { entered.resolve(); await release.promise }
    return { ok: true, json: async () => ({ ...tokenResponse(), access_token: old ? 'old-fixture-access' : 'new-fixture-access', refresh_token: old ? 'old-fixture-refresh' : 'new-fixture-refresh' }) }
  } })
  const stale = await start(h)
  const inflight = callback(h, stale.state)
  await entered.promise
  await h.invoke('googleOAuthDisconnect')
  await connect(h)
  release.resolve()
  assert.equal((await inflight).redirect, 'https://urai.app/settings?google=error')
  assert.equal(h.decrypt(h.records.get(TOKEN_PATH).accessToken), 'new-fixture-access')
  assert.equal(h.records.get(CONNECTION_PATH).disconnectGeneration, 1)
})

caseTest('legacy: pending state without a marker instance fails closed and a fresh authorization succeeds', async () => {
  const h = oauthHarness()
  const pending = await start(h)
  const legacy = { ...pending.document }
  delete legacy.disconnectGeneration
  delete legacy.oauthInstance
  h.seed(h.statePath(pending.state), legacy)
  assert.equal((await callback(h, pending.state)).redirect, 'https://urai.app/settings?google=invalid-state')
  assert.equal(exchangeCalls(h).length, 0)
  noTokens(h)
  await connect(h)
})

caseTest('legacy: existing connection without generation increments to one on disconnect', async () => {
  const h = oauthHarness()
  await connect(h)
  const legacy = { ...h.records.get(CONNECTION_PATH) }
  delete legacy.disconnectGeneration
  delete legacy.oauthInstance
  h.seed(CONNECTION_PATH, legacy)
  await h.invoke('googleOAuthDisconnect')
  assert.equal(h.records.get(CONNECTION_PATH).disconnectGeneration, 1)
  noTokens(h)
})

caseTest('generation: malformed server marker cannot be reset by start, callback or disconnect', async () => {
  for (const value of [-1, 1.5, '1', null, Number.MAX_SAFE_INTEGER + 1]) {
    const h = oauthHarness()
    const pending = await start(h)
    h.seed(CONNECTION_PATH, { disconnectGeneration: value, connected: false })
    assert.equal((await h.invoke('googleOAuthStart')).status, 500)
    assert.equal((await callback(h, pending.state)).redirect, 'https://urai.app/settings?google=error')
    assert.equal((await h.invoke('googleOAuthDisconnect')).status, 500)
    assert.equal(h.records.get(CONNECTION_PATH).disconnectGeneration, value)
    noTokens(h)
  }
})

caseTest('generation: disconnect refuses integer overflow without changing authority', async () => {
  const h = oauthHarness()
  h.seed(CONNECTION_PATH, { disconnectGeneration: Number.MAX_SAFE_INTEGER, connected: false })
  assert.equal((await h.invoke('googleOAuthDisconnect')).body.error, 'OAUTH_CONNECTION_STATE_INVALID')
  assert.equal(h.records.get(CONNECTION_PATH).disconnectGeneration, Number.MAX_SAFE_INTEGER)
  assert.equal(h.fetchCalls.length, 0)
})

caseTest('atomic save: commit failure leaves neither encrypted token nor connected marker', async () => {
  const h = oauthHarness({ fetch: async (url, init, { defaultFetch }) => {
    if (url === EXCHANGE_URL) h.failNextCommit()
    return defaultFetch(url)
  } })
  const pending = await start(h)
  assert.equal((await callback(h, pending.state)).redirect, 'https://urai.app/settings?google=error')
  noTokens(h)
})

caseTest('atomic disconnect: failed commit changes neither local authority nor upstream revocation', async () => {
  const h = oauthHarness()
  await connect(h)
  h.failNextCommit()
  assert.equal((await h.invoke('googleOAuthDisconnect')).status, 500)
  assert.equal(h.records.has(TOKEN_PATH), true)
  assert.equal(h.records.get(CONNECTION_PATH).connected, true)
  assert.equal(h.records.get(CONNECTION_PATH).disconnectGeneration, 0)
  assert.equal(h.fetchCalls.some((c) => c.url === REVOKE_URL), false)
})

caseTest('tenant binding: another authenticated uid disconnect cannot revoke or delete this user connection', async () => {
  const h = oauthHarness()
  await connect(h)
  const pending = await start(h)
  await h.invoke('googleOAuthDisconnect', { headers: { authorization: 'Bearer valid:owner-b' } })
  assert.equal(h.records.get(CONNECTION_PATH).disconnectGeneration, 0)
  assert.equal(h.records.has(TOKEN_PATH), true)
  assert.equal(h.fetchCalls.some((c) => c.url === REVOKE_URL), false)
  assert.equal((await callback(h, pending.state)).redirect, 'https://urai.app/settings?google=connected')
  assert.equal(h.records.get('users/owner-b/providerConnections/google-workspace').disconnectGeneration, 1)
})

caseTest('tenant binding: callback uses the authenticated state uid rather than incidental request bearer', async () => {
  const h = oauthHarness()
  const pending = await start(h, { headers: { authorization: 'Bearer valid:owner-b' } })
  assert.equal((await callback(h, pending.state)).redirect, 'https://urai.app/settings?google=connected')
  assert.equal(h.records.has(TOKEN_PATH), false)
  assert.equal(h.records.get('providerOAuthTokens/owner-b_google-workspace').uid, 'owner-b')
  assert.equal(h.records.get('users/owner-b/providerConnections/google-workspace').connected, true)
})

caseTest('deletion fence: removing the marker after start prevents an old callback from restoring authority', async () => {
  const h = oauthHarness()
  const pending = await start(h)
  h.records.delete(CONNECTION_PATH)
  assert.equal((await callback(h, pending.state)).redirect, 'https://urai.app/settings?google=error')
  noTokens(h)
  assert.equal(h.records.has(CONNECTION_PATH), false)
})

caseTest('deletion fence: removing a disconnected marker cannot reset an earlier callback to generation zero', async () => {
  const h = oauthHarness()
  const pending = await start(h)
  await h.invoke('googleOAuthDisconnect')
  h.records.delete(CONNECTION_PATH)
  assert.equal((await callback(h, pending.state)).redirect, 'https://urai.app/settings?google=error')
  noTokens(h)
})

caseTest('deletion fence: a fresh marker instance after deletion cannot admit the previous instance state', async () => {
  const h = oauthHarness()
  const stale = await start(h)
  h.records.delete(CONNECTION_PATH)
  const fresh = await connect(h)
  assert.notEqual(fresh.document.oauthInstance, stale.document.oauthInstance)
  assert.equal(fresh.document.disconnectGeneration, 0)
  assert.equal((await callback(h, stale.state)).redirect, 'https://urai.app/settings?google=error')
  assert.equal(h.records.get(CONNECTION_PATH).oauthInstance, fresh.document.oauthInstance)
  assert.equal(h.records.get(CONNECTION_PATH).connected, true)
})

caseTest('deletion fence: an in-flight old exchange cannot overwrite a connection with a recreated marker', async () => {
  const entered = deferred(), release = deferred()
  let exchanges = 0
  const h = oauthHarness({ fetch: async (url, init, { defaultFetch, tokenResponse }) => {
    if (url !== EXCHANGE_URL) return defaultFetch(url)
    const old = ++exchanges === 1
    if (old) { entered.resolve(); await release.promise }
    return { ok: true, json: async () => ({ ...tokenResponse(), access_token: old ? 'old-fixture-access' : 'new-fixture-access' }) }
  } })
  const stale = await start(h)
  const inflight = callback(h, stale.state)
  await entered.promise
  h.records.delete(CONNECTION_PATH)
  const fresh = await connect(h)
  release.resolve()
  assert.equal((await inflight).redirect, 'https://urai.app/settings?google=error')
  assert.equal(h.decrypt(h.records.get(TOKEN_PATH).accessToken), 'new-fixture-access')
  assert.equal(h.records.get(CONNECTION_PATH).oauthInstance, fresh.document.oauthInstance)
})

caseTest('marker integrity: malformed server instance cannot be silently replaced by start or disconnect', async () => {
  for (const oauthInstance of ['short', '', null, 42]) {
    const h = oauthHarness()
    const pending = await start(h)
    h.seed(CONNECTION_PATH, { ...h.records.get(CONNECTION_PATH), oauthInstance })
    assert.equal((await h.invoke('googleOAuthStart')).body.error, 'OAUTH_CONNECTION_STATE_INVALID')
    assert.equal((await callback(h, pending.state)).redirect, 'https://urai.app/settings?google=error')
    assert.equal((await h.invoke('googleOAuthDisconnect')).body.error, 'OAUTH_CONNECTION_STATE_INVALID')
    assert.equal(h.records.get(CONNECTION_PATH).oauthInstance, oauthInstance)
    noTokens(h)
  }
})

caseTest('marker integrity: an instance without its generation fails closed rather than resetting to zero', async () => {
  const h = oauthHarness()
  const pending = await start(h)
  const marker = { ...h.records.get(CONNECTION_PATH) }
  delete marker.disconnectGeneration
  h.seed(CONNECTION_PATH, marker)
  assert.equal((await h.invoke('googleOAuthStart')).body.error, 'OAUTH_CONNECTION_STATE_INVALID')
  assert.equal((await callback(h, pending.state)).redirect, 'https://urai.app/settings?google=error')
  assert.equal((await h.invoke('googleOAuthDisconnect')).body.error, 'OAUTH_CONNECTION_STATE_INVALID')
  assert.equal(h.records.get(CONNECTION_PATH).disconnectGeneration, undefined)
  noTokens(h)
})

caseTest('atomic start: failed commit persists neither pending state nor a new marker instance', async () => {
  const h = oauthHarness()
  h.failNextCommit()
  assert.equal((await h.invoke('googleOAuthStart')).status, 500)
  assert.equal(h.records.size, 0)
  assert.equal(h.fetchCalls.length, 0)
})
