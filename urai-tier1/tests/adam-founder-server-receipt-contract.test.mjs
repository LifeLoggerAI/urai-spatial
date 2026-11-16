import test from 'node:test'
import assert from 'node:assert/strict'
import {
  FOUNDER_VOICE_RECEIPT_VERSION, FOUNDER_VOICE_RECEIPT_DENIED,
  inspectFounderVoiceReceiptShape, verifyFounderVoiceReceipt,
  founderVoiceIssuerReadiness,
} from '../../apps/functions/src/adamFounderVoiceReceiptContract.mjs'

// Synthetic fixtures only: none represent a real person, signer or provider.
const NOW = 1_800_000_000_000
const SHA = 'a'.repeat(64), MODEL = 'b'.repeat(64), APPROVAL = 'c'.repeat(64)
const receipt = () => ({
  version: FOUNDER_VOICE_RECEIPT_VERSION, audience: 'urai:adam-founder-voice',
  accountId: 'synthetic-owner', subjectId: 'adam', identityKind: 'founder',
  actorEpoch: 'epoch-1', turnId: 4, modelSha256: MODEL,
  voiceId: 'synthetic-voice', voiceApprovalSha256: APPROVAL,
  consentRevision: 'synthetic-consent-4', audioSha256: SHA,
  providerReceiptId: 'synthetic-provider-receipt', providerReceipt: {synthetic: true},
  issuerId: 'synthetic-test-issuer', nonce: 'Z'.repeat(24),
  issuedAtMs: NOW - 3000, expiresAtMs: NOW + 20_000,
  signature: 'S'.repeat(43),
})
const expected = () => ({accountId:'synthetic-owner',actorEpoch:'epoch-1',turnId:4,audioSha256:SHA})
const admission = () => ({accountId:'synthetic-owner',subjectId:'adam',identityKind:'founder',
  actorEpoch:'epoch-1',aiConsent:true,voiceConsent:true,likenessApproved:true,
  modelAdmitted:true,voiceAdmitted:true,providerEnabled:true,revoked:false,
  modelSha256:MODEL,approvedVoiceId:'synthetic-voice',
  voiceApprovalSha256:APPROVAL,consentRevision:'synthetic-consent-4'})
function syntheticServer() {
  const seen = new Set()
  const context = {admission: admission(), signatureCalls:0, providerCalls:0, consumed:0,
    issuerVerifier:async()=>true, providerVerifier:async()=>true}
  const trustedServer = {
    async verifyIssuerSignature(r, payload) { context.signatureCalls++;
      assert.equal(JSON.parse(payload)[0],FOUNDER_VOICE_RECEIPT_VERSION)
      return context.issuerVerifier(r, payload) },
    async verifyProviderExecution(proof,id,hash) { context.providerCalls++;
      assert.equal(hash,SHA); return context.providerVerifier(proof,id,hash) },
    async readCurrentAdmission() { return context.admission },
    async consumeNonceOnce({accountId,issuerId,nonce,turnId}) {
      const key=[accountId,issuerId,nonce,turnId].join(':')
      if(seen.has(key)) return false
      seen.add(key); context.consumed++; return true
    },
  }
  return {context,trustedServer}
}

test('production issuer is always disabled despite receipt-shaped input',()=>{
  const status=founderVoiceIssuerReadiness()
  assert.deepEqual(status,{ready:false,code:FOUNDER_VOICE_RECEIPT_DENIED,
    message:'Founder playback authority issuer and verified voice admission are not configured.'})
  assert.ok(Object.isFrozen(status))
})
test('synthetic receipt can have valid SHAPE without obtaining authorization',async()=>{
  const shape=inspectFounderVoiceReceiptShape(receipt(),expected(),NOW)
  assert.equal(shape.valid,true)
  assert.equal(await verifyFounderVoiceReceipt(receipt(),expected(),null,NOW),false)
})
for(const [name,change,exp] of [
  ['wrong audience',{audience:'urai:council-voice'},null],
  ['wrong subject',{subjectId:'council'},null],
  ['wrong identity kind',{identityKind:'council'},null],
  ['wrong owner',{accountId:'foreign-owner'},null],
  ['wrong epoch',{actorEpoch:'epoch-2'},null],
  ['wrong turn',{turnId:3},null],
  ['wrong audio hash',{audioSha256:'d'.repeat(64)},null],
  ['malformed audio digest',{audioSha256:'abc'},null],
  ['missing admitted model digest',{modelSha256:''},null],
  ['missing approved voice hash',{voiceApprovalSha256:''},null],
  ['missing voice identity',{voiceId:''},null],
  ['missing consent revision',{consentRevision:''},null],
  ['missing provider receipt',{providerReceipt:null},null],
  ['missing provider receipt id',{providerReceiptId:''},null],
  ['missing issuer id',{issuerId:''},null],
  ['invalid nonce',{nonce:'insecure'},null],
  ['missing signature',{signature:''},null],
  ['future issue time',{issuedAtMs:NOW+1},null],
  ['expired receipt',{expiresAtMs:NOW-1},null],
  ['oversized lifetime',{expiresAtMs:NOW+120_000},null],
  ['wrong receipt version',{version:'v0'},null],
]) {
  test('untrusted receipt is rejected: '+name,async()=>{
    const s=receipt();Object.assign(s,change)
    const shape=inspectFounderVoiceReceiptShape(s,expected(),NOW)
    assert.equal(shape.valid,false)
    assert.equal(await verifyFounderVoiceReceipt(s,expected(),syntheticServer().trustedServer,NOW),false)
  })
}
test('the signature verifier is required and rejects forged proofs',async()=>{
  const x=syntheticServer(); x.context.issuerVerifier=async()=>false
  assert.equal(await verifyFounderVoiceReceipt(receipt(),expected(),x.trustedServer,NOW),false)
  assert.equal(x.context.consumed,0)
})
test('provider execution must be independently verified',async()=>{
  const x=syntheticServer(); x.context.providerVerifier=async()=>false
  assert.equal(await verifyFounderVoiceReceipt(receipt(),expected(),x.trustedServer,NOW),false)
  assert.equal(x.context.consumed,0)
})
test('missing nonce consumer fails closed before calling partial trusted adapters',async()=>{
  const x=syntheticServer(); delete x.trustedServer.consumeNonceOnce
  assert.equal(await verifyFounderVoiceReceipt(receipt(),expected(),x.trustedServer,NOW),false)
  assert.equal(x.context.signatureCalls,0)
})
test('revoked admission denies already-shaped receipt before nonce consumption',async()=>{
  const x=syntheticServer(); x.context.admission.revoked=true
  assert.equal(await verifyFounderVoiceReceipt(receipt(),expected(),x.trustedServer,NOW),false)
  assert.equal(x.context.consumed,0)
})
test('rotated voice approval rejects after successful issuer/provider checks',async()=>{
  const x=syntheticServer(); x.context.admission.voiceApprovalSha256='d'.repeat(64)
  assert.equal(await verifyFounderVoiceReceipt(receipt(),expected(),x.trustedServer,NOW),false)
  assert.equal(x.context.consumed,0)
})
test('model withdrawal and account migration reject authorization',async()=>{
  for(const patch of [{modelAdmitted:false},{accountId:'other-owner'},{voiceConsent:false},{consentRevision:'synthetic-consent-5'}]) {
    const x=syntheticServer();Object.assign(x.context.admission,patch)
    assert.equal(await verifyFounderVoiceReceipt(receipt(),expected(),x.trustedServer,NOW),false)
    assert.equal(x.context.consumed,0)
  }
})
test('a malicious or crashed trusted adapter cannot grant voice',async()=>{
  const x=syntheticServer(); x.context.issuerVerifier=async()=>{throw Error('simulated issuer outage')}
  assert.equal(await verifyFounderVoiceReceipt(receipt(),expected(),x.trustedServer,NOW),false)
})
test('synthetic trusted authority consumes one nonce only once',async()=>{
  const x=syntheticServer()
  assert.equal(await verifyFounderVoiceReceipt(receipt(),expected(),x.trustedServer,NOW),true)
  assert.equal(await verifyFounderVoiceReceipt(receipt(),expected(),x.trustedServer,NOW),false)
  assert.equal(x.context.consumed,1)
})
test('delayed issuer verification observes live consent withdrawal before grant',async()=>{
  const x=syntheticServer();let release
  x.context.issuerVerifier=()=>new Promise(resolve=>{release=resolve})
  const pending=verifyFounderVoiceReceipt(receipt(),expected(),x.trustedServer,NOW)
  for(let n=0;n<100 && !release;n++) await new Promise(resolve=>setImmediate(resolve))
  assert.equal(typeof release,'function')
  x.context.admission.voiceConsent=false
  release(true)
  assert.equal(await pending,false)
  assert.equal(x.context.consumed,0)
})
test('all signed binding fields are covered by deterministic canonical payload',()=>{
  const base=inspectFounderVoiceReceiptShape(receipt(),expected(),NOW)
  assert.equal(base.valid,true)
  const changed=receipt();changed.voiceApprovalSha256='e'.repeat(64)
  const altered=inspectFounderVoiceReceiptShape(changed,expected(),NOW)
  assert.equal(altered.valid,true)
  assert.notEqual(base.canonicalPayload,altered.canonicalPayload)
})
