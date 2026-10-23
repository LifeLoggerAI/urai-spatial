import test from 'node:test'
import assert from 'node:assert/strict'
import { inspectFounderVoiceReceiptShape, verifyFounderVoiceReceipt, FOUNDER_VOICE_RECEIPT_VERSION } from '../../apps/functions/src/adamFounderVoiceReceiptContract.mjs'
const NOW = 1_800_000_000_000
const SHA = 'a'.repeat(64)
const expected = () => ({accountId:'synthetic-owner',actorEpoch:'epoch-1',turnId:4,audioSha256:SHA})
const receipt = () => ({
  version:FOUNDER_VOICE_RECEIPT_VERSION,audience:'urai:adam-founder-voice',
  accountId:'synthetic-owner',subjectId:'adam',identityKind:'founder',
  actorEpoch:'epoch-1',turnId:4,modelSha256:'b'.repeat(64),
  voiceId:'synthetic-voice',voiceApprovalSha256:'c'.repeat(64),
  consentRevision:'synthetic-consent',audioSha256:SHA,
  providerReceiptId:'synthetic-provider',providerReceipt:{synthetic:true},
  issuerId:'synthetic-issuer',nonce:'Z'.repeat(24),
  issuedAtMs:NOW-3000,expiresAtMs:NOW+10000,signature:'S'.repeat(43),
})
const trusted = () => ({
  verifyIssuerSignature(){throw Error('must not call verifier')},
  verifyProviderExecution(){throw Error('must not call provider')},
  readCurrentAdmission(){throw Error('must not read admission')},
  consumeNonceOnce(){throw Error('must not consume nonce')},
})
for (const [name,make] of [
  ['receipt field getter',()=>{const r=receipt();Object.defineProperty(r,'version',{get(){throw Error('malicious getter')}});return r}],
  ['nonce conversion',()=>{const r=receipt();r.nonce={toString(){throw Error('malicious conversion')}};return r}],
  ['provider receipt getter',()=>{const r=receipt();Object.defineProperty(r,'providerReceipt',{get(){throw Error('malicious getter')}});return r}],
  ['revoked proxy',()=>{const r=Proxy.revocable(receipt(),{});r.revoke();return r.proxy}],
]) {
  test(name+' denies without throwing or provider calls',async()=>{
    const candidate=make()
    assert.equal(inspectFounderVoiceReceiptShape(candidate,expected(),NOW).valid,false)
    assert.equal(await verifyFounderVoiceReceipt(candidate,expected(),trusted(),NOW),false)
  })
}
test('hostile expected binding fails closed',async()=>{
  const binding=expected()
  Object.defineProperty(binding,'accountId',{get(){throw Error('malicious getter')}})
  assert.equal(inspectFounderVoiceReceiptShape(receipt(),binding,NOW).valid,false)
  assert.equal(await verifyFounderVoiceReceipt(receipt(),binding,trusted(),NOW),false)
})
test('hostile trusted verifier getter fails closed',async()=>{
  const adapter=trusted()
  Object.defineProperty(adapter,'verifyIssuerSignature',{get(){throw Error('malicious getter')}})
  assert.equal(await verifyFounderVoiceReceipt(receipt(),expected(),adapter,NOW),false)
})
