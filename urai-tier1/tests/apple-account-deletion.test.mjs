import test from 'node:test'
import assert from 'node:assert/strict'
import { prepareAppleAccountDeletion } from '../src/lib/firebase/appleDeletionPolicy.ts'
import { revokeAppleForAccountDeletion, assertAppleDeletionMayComplete } from '../../apps/functions/src/appleDeletionRevocation.ts'

const environment = { appleLinked: true, native: true, platform: 'ios', nativeConfigured: true }
const nativeCredential = { idToken: 'synthetic-apple-identity', nonce: 'synthetic-nonce', authorizationCode: 'synthetic-authorization-code' }
const now = 1800000000000
const decoded = { uid: 'owner', aud: 'urai-4dc1d', iss: 'https://securetoken.google.com/urai-4dc1d', auth_time: now / 1000 - 1, firebase: { sign_in_provider: 'apple.com', identities: { 'apple.com': ['apple-owner'] } } }
const input = { uid: 'owner', appleProviderUid: 'apple-owner', bearerToken: 'synthetic-firebase-token', credential: { tokenType: 'CODE', token: nativeCredential.authorizationCode }, publicApiKey: `AIza${'a'.repeat(35)}` }

test('native deletion reauthenticates the existing account and yields only an ephemeral authorization code', async () => {
  const order = []
  const result = await prepareAppleAccountDeletion(environment, {
    assertCurrentUser: () => order.push('account'),
    native: async () => { order.push('native'); return nativeCredential },
    reauthenticate: async (idToken, nonce) => { order.push('reauth'); assert.equal(idToken, nativeCredential.idToken); assert.equal(nonce, nativeCredential.nonce) },
    web: async () => { throw new Error('native must not open a popup') },
  })
  assert.deepEqual(order, ['account', 'native', 'account', 'reauth', 'account'])
  assert.deepEqual(result, { tokenType: 'CODE', token: nativeCredential.authorizationCode })
  assert.equal(JSON.stringify(result).includes(nativeCredential.idToken), false)
})

test('missing native configuration, cancellation, wrong account and missing credential never yield deletion authority', async () => {
  const actions = { assertCurrentUser() {}, native: async () => nativeCredential, reauthenticate: async () => {}, web: async () => { throw new Error('popup forbidden') } }
  await assert.rejects(prepareAppleAccountDeletion({ ...environment, nativeConfigured: false }, actions), /CONFIGURATION_REQUIRED/)
  await assert.rejects(prepareAppleAccountDeletion({ ...environment, platform: 'android' }, actions), /CONFIGURATION_REQUIRED/)
  await assert.rejects(prepareAppleAccountDeletion(environment, { ...actions, native: async () => { throw new Error('cancelled') } }), /cancelled/)
  await assert.rejects(prepareAppleAccountDeletion(environment, { ...actions, native: async () => ({ ...nativeCredential, authorizationCode: undefined }) }), /CREDENTIAL_REQUIRED/)
  await assert.rejects(prepareAppleAccountDeletion(environment, { ...actions, reauthenticate: async () => { throw new Error('auth/user-mismatch') } }), /user-mismatch/)
  let sameAccount = true
  await assert.rejects(prepareAppleAccountDeletion(environment, { ...actions, assertCurrentUser: () => { if (!sameAccount) throw new Error('changed account') }, native: async () => { sameAccount = false; return nativeCredential } }), /changed account/)
})

test('web Apple reauthentication uses an access token and non-Apple accounts bypass provider work', async () => {
  const actions = { assertCurrentUser() {}, native: async () => { throw new Error('native forbidden') }, reauthenticate: async () => { throw new Error('native forbidden') }, web: async () => 'synthetic-web-access-token' }
  assert.deepEqual(await prepareAppleAccountDeletion({ ...environment, native: false }, actions), { tokenType: 'ACCESS_TOKEN', token: 'synthetic-web-access-token' })
  assert.equal(await prepareAppleAccountDeletion({ ...environment, appleLinked: false }, { ...actions, assertCurrentUser: () => { throw new Error('provider work forbidden') } }), undefined)
  await assert.rejects(prepareAppleAccountDeletion({ ...environment, native: false }, { ...actions, web: async () => undefined }), /CREDENTIAL_REQUIRED/)
})

test('the managed revocation response creates only server-owned, token-free evidence', async () => {
  let request
  const evidence = await revokeAppleForAccountDeletion(input, {
    verifyIdToken: async (token) => { assert.equal(token, input.bearerToken); return decoded }, now: () => now,
    fetch: async (url, options) => { request = { url, options }; return { ok: true } },
  })
  assert.equal(request.url.origin, 'https://identitytoolkit.googleapis.com')
  assert.equal(request.url.pathname, '/v2/accounts:revokeToken')
  assert.equal(request.options.redirect, 'error')
  assert.ok(request.options.signal instanceof AbortSignal)
  assert.deepEqual(JSON.parse(request.options.body), { providerId: 'apple.com', tokenType: 3, token: input.credential.token, idToken: input.bearerToken })
  assert.deepEqual(evidence, { providerId: 'apple.com', state: 'revoked', revokedAtMs: now, authenticatedAtSeconds: decoded.auth_time })
  assert.equal(JSON.stringify(evidence).includes('synthetic-'), false)
  await revokeAppleForAccountDeletion({ ...input, credential: { tokenType: 'ACCESS_TOKEN', token: 'synthetic-web-token' } }, {
    verifyIdToken: async () => decoded, now: () => now,
    fetch: async (_, options) => { assert.equal(JSON.parse(options.body).tokenType, 'ACCESS_TOKEN'); return { ok: true } },
  })
})

test('absent authority, stale credentials and failed upstream responses cannot attest revocation', async () => {
  let calls = 0
  const actions = { verifyIdToken: async () => decoded, now: () => now, fetch: async () => { calls++; return { ok: true } } }
  await assert.rejects(revokeAppleForAccountDeletion({ ...input, publicApiKey: '' }, actions), /CONFIGURATION_REQUIRED/)
  await assert.rejects(revokeAppleForAccountDeletion({ ...input, credential: { tokenType: 'CODE', token: '' } }, actions), /CREDENTIAL_REQUIRED/)
  for (const altered of [{ ...decoded, uid: 'other' }, { ...decoded, aud: 'foreign' }, { ...decoded, firebase: { sign_in_provider: 'google.com' } }, { ...decoded, firebase: { ...decoded.firebase, identities: { 'apple.com': ['other-apple'] } } }]) {
    await assert.rejects(revokeAppleForAccountDeletion(input, { ...actions, verifyIdToken: async () => altered }), /ACCOUNT_MISMATCH/)
  }
  await assert.rejects(revokeAppleForAccountDeletion(input, { ...actions, verifyIdToken: async () => ({ ...decoded, auth_time: now / 1000 - 301 }) }), /RECENT_AUTH_REQUIRED/)
  assert.equal(calls, 0)
  await assert.rejects(revokeAppleForAccountDeletion(input, { ...actions, fetch: async () => ({ ok: false, text: () => { throw new Error('upstream body must not be read') } }) }), /^Error: APPLE_REVOCATION_FAILED$/)
  await assert.rejects(revokeAppleForAccountDeletion(input, { ...actions, fetch: async () => { throw new Error('private upstream credential detail') } }), /^Error: APPLE_REVOCATION_FAILED$/)
})

test('grace-period execution fails closed for missing receipts and any later sign-in', () => {
  const evidence = { providerId: 'apple.com', state: 'revoked', revokedAtMs: now, authenticatedAtSeconds: decoded.auth_time }
  assert.doesNotThrow(() => assertAppleDeletionMayComplete(true, evidence, new Date(now - 1000).toISOString()))
  assert.doesNotThrow(() => assertAppleDeletionMayComplete(false, undefined, undefined))
  assert.throws(() => assertAppleDeletionMayComplete(true, { state: 'revoked' }, new Date(now - 1000).toISOString()), /REVOCATION_REQUIRED/)
  assert.throws(() => assertAppleDeletionMayComplete(true, undefined, new Date(now - 1000).toISOString()), /REVOCATION_REQUIRED/)
  assert.throws(() => assertAppleDeletionMayComplete(true, evidence, new Date(now + 1000).toISOString()), /REQUIRES_NEW_DELETION_REQUEST/)
  assert.throws(() => assertAppleDeletionMayComplete(true, evidence, undefined), /REQUIRES_NEW_DELETION_REQUEST/)
})
