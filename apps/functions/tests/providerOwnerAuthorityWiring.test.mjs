import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
const provider = fs.readFileSync(new URL('../src/providerFunctions.ts', import.meta.url), 'utf8')
const module = fs.readFileSync(new URL('../src/providerOwnerAuthority.ts', import.meta.url), 'utf8')
const requireBody = provider.slice(provider.indexOf('async function requireProviderConsent'), provider.indexOf('function assertProviderConsent'))
const reserveBody = provider.slice(provider.indexOf('async function reserveOpenAiRequest'), provider.indexOf('async function readAuthorizedOrbActivity'))
test('ordinary provider consent checks owner and deletion fence transactionally', () => {
  assert.match(provider, /providerOwnerAuthorityDecision/)
  assert.match(requireBody, /db.runTransaction\(async transaction =>/)
  assert.match(requireBody, /transaction.get\(db.doc\(`users\/\$\{uid\}`\)\)/)
  assert.match(requireBody, /transaction.get\(db.doc\(`privacyDeletionTombstones\/\$\{uid\}`\)\)/)
  assert.match(requireBody, /assertProviderOwnerActive/)
})
test('reservation atomically rejects owner deletion before writes', () => {
  assert.match(reserveBody, /transaction.get\(ownerRef\)/)
  assert.match(reserveBody, /transaction.get\(fenceRef\)/)
  assert.match(reserveBody, /transaction.get\(tombstoneRef\)/)
  const guard = reserveBody.indexOf('assertProviderOwnerActive')
  const create = reserveBody.indexOf('transaction.create(reservation')
  assert.ok(guard > 0 && create > guard)
  assert.match(provider, /PROVIDER_OWNER_INACTIVE/)
  assert.match(module, /deletion-fence-invalid/)
})
