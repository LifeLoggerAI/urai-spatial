import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { createRequire } from 'node:module'
import path from 'node:path'
import test from 'node:test'

if (!process.env.FIRESTORE_EMULATOR_HOST) throw Error('REAL_FIRESTORE_EMULATOR_REQUIRED')
process.env.GCLOUD_PROJECT ||= 'demo-urai-speech-worker'
process.env.GOOGLE_CLOUD_PROJECT ||= process.env.GCLOUD_PROJECT
const requireFunctions = createRequire(new URL('../apps/functions/package.json', import.meta.url))
const admin = requireFunctions('firebase-admin')
const { grantSpeechPurposeLease, revokeSpeechPurposeLease } =
  requireFunctions(path.resolve('apps/functions/lib/apps/functions/src/speechPurposeConsent.js'))
const { processTrustedSpeechPurgeJob } =
  requireFunctions(path.resolve('apps/functions/lib/apps/functions/src/speechPurgeWorker.js'))
const db = admin.firestore()
const ownerId = 'speech-worker-owner'
const sourceId = 'speech-worker-source'
const providerId = 'speech-worker-provider'
const baseDomain = {
  mode:'denied', retentionDays:30, precise:false,
  replayVisible:false, lifeMapVisible:false, modelContext:false,
  sharingEnabled:false, automationEnabled:false, likenessEnabled:false,
}
const policy = {
  version:2, ownerId, revision:5,
  domains: {
    memory:{...baseDomain}, location:{...baseDomain},
    models:{...baseDomain, mode:'granted', modelContext:true},
    exports:{...baseDomain}, workforce:{...baseDomain}, identity:{...baseDomain},
  },
  enforcement:{state:'fully-enforced', jobId:null, affectedTargets:[], providerState:'complete'},
}
const auth = {auth:{uid:ownerId,token:{auth_time:Math.floor(Date.now()/1000)}}}
const purgeRef = (jobId) => db.doc('speechProviderPurgeQueue/'+jobId)
const leaseRef = (sid) => db.doc('users/'+ownerId+'/speechPurposeLeases/'+sid)
const derivativeRef = (sid,id) => leaseRef(sid).collection('derivatives').doc(id)

async function newJob(sid) {
  await grantSpeechPurposeLease.run({
    sessionId:sid,sourceId,providerId,
    transcriptionConsent:true,inferenceConsent:true,
    sessionBaselineConsent:false,userInitiated:true,
  },auth)
  return revokeSpeechPurposeLease.run({sessionId:sid},auth)
}
function adapter(calls, overrides={}) {
  return {
    deleteProviderSession:async req => {
      calls.push(req)
      if (overrides.throwDelete) throw Error('provider service unavailable')
      return {
        providerId:req.providerId,sessionId:req.sessionId,sourceId:req.sourceId,
        idempotencyKey:req.idempotencyKey, status:'deleted',
        evidenceId:'receipt-'+req.sessionId,verifiedAtMs:Date.now(),
      }
    },
    verifyProviderAcknowledgement:async (returned,req) => {
      if (overrides.rejectAck) return null
      if (overrides.invalidIdentity) return {...returned,providerId:'other-provider'}
      // The verifier is a TEST DOUBLE only. Production has no provider port
      // and must never treat this simulated attestation as a live receipt.
      if (returned.idempotencyKey !== req.idempotencyKey) return null
      return returned
    },
  }
}
test.before(async () => {
  await Promise.all([
    db.doc('users/'+ownerId+'/privacyPolicy/current').set(policy),
    db.doc('users/'+ownerId+'/dataSources/'+sourceId).set({
      ownerId,state:'active',verified:true,speechFeatureSource:true,
    }),
    db.doc('users/'+ownerId+'/providerConnections/'+providerId).set({
      ownerId,state:'active',verified:true,speechInferenceAuthorized:true,
    }),
  ])
})
test.after(async () => { await admin.app().delete() })

test('no provider port: exact derivatives are removed; provider deletion remains unverified', async () => {
  const sid='worker-no-provider'
  await grantSpeechPurposeLease.run({
    sessionId:sid,sourceId,providerId,transcriptionConsent:true,
    inferenceConsent:true,sessionBaselineConsent:false,userInitiated:true,
  },auth)
  await derivativeRef(sid,'feature').set({
    ownerId,sessionId:sid,sourceId,providerId,leaseRevision:1,
    signal:'placeholder-local-data',
  })
  const job=await revokeSpeechPurposeLease.run({sessionId:sid},auth)
  assert.equal(await processTrustedSpeechPurgeJob(job.purgeJobId),'pending')
  const saved=await purgeRef(job.purgeJobId).get()
  assert.equal((await derivativeRef(sid,'feature').get()).exists,false)
  assert.equal(saved.get('localCacheState'),'verified')
  assert.equal(saved.get('providerPurgeVerified'),false)
  assert.equal(saved.get('state'),'failed')
  assert.equal(saved.get('failureCode'),'SPEECH_PURGE_TRUSTED_PROVIDER_PORT_UNAVAILABLE')
  assert.ok(saved.get('nextAttemptAtMs')>Date.now())
  assert.equal(saved.get('attempts'),1)
})

test('provider test-double acknowledgement only verifies after independent validator accepts it', async () => {
  const sid='worker-verified-test-double'
  const job=await newJob(sid)
  const calls=[]
  assert.equal(await processTrustedSpeechPurgeJob(job.purgeJobId,adapter(calls)),'verified')
  assert.equal(calls.length,1)
  const saved=await purgeRef(job.purgeJobId).get()
  assert.equal(saved.get('state'),'verified')
  assert.equal(saved.get('providerState'),'verified')
  assert.equal(saved.get('providerPurgeVerified'),true)
  assert.match(saved.get('providerEvidenceDigest'),/^[a-f0-9]{64}$/)
  assert.equal(saved.get('providerReceipt'),undefined)
  assert.equal(saved.get('lockToken'),null)
  assert.equal(await processTrustedSpeechPurgeJob(job.purgeJobId,adapter(calls)),'pending')
  assert.equal(calls.length,1)
})

test('unverified, mismatched or missing provider evidence NEVER marks deletion verified', async () => {
  for(const [name,opts] of [['no-ack',{rejectAck:true}],['wrong-id',{invalidIdentity:true}],['network-error',{throwDelete:true}]]) {
    const sid='worker-'+name
    const job=await newJob(sid)
    const calls=[]
    assert.equal(await processTrustedSpeechPurgeJob(job.purgeJobId,adapter(calls,opts)),'pending')
    const saved=await purgeRef(job.purgeJobId).get()
    assert.equal(saved.get('state'),'failed')
    assert.equal(saved.get('providerPurgeVerified'),false)
    assert.equal(saved.get('providerEvidenceDigest'),undefined)
    assert.ok(saved.get('nextAttemptAtMs')>Date.now())
    assert.equal(saved.get('lockToken'),null)
  }
})

test('retry keeps stable provider idempotency key and does not revive lease', async () => {
  const sid='worker-retry'
  const job=await newJob(sid)
  const firstCalls=[]
  await processTrustedSpeechPurgeJob(job.purgeJobId,adapter(firstCalls,{rejectAck:true}))
  await purgeRef(job.purgeJobId).update({nextAttemptAtMs:Date.now()-10})
  const nextCalls=[]
  assert.equal(await processTrustedSpeechPurgeJob(job.purgeJobId,adapter(nextCalls)),'verified')
  assert.equal(firstCalls[0].idempotencyKey,nextCalls[0].idempotencyKey)
  assert.equal((await leaseRef(sid).get()).get('active'),false)
  assert.equal((await purgeRef(job.purgeJobId).get()).get('attempts'),2)
})

test('foreign/mismatched derivatives block deletion, never erase unrelated records', async () => {
  const sid='worker-mismatched'
  await grantSpeechPurposeLease.run({
    sessionId:sid,sourceId,providerId,transcriptionConsent:true,
    inferenceConsent:true,sessionBaselineConsent:false,userInitiated:true,
  },auth)
  await derivativeRef(sid,'foreign').set({
    ownerId:'other-owner',sessionId:sid,sourceId,providerId,leaseRevision:1,
  })
  const job=await revokeSpeechPurposeLease.run({sessionId:sid},auth)
  const calls=[]
  assert.equal(await processTrustedSpeechPurgeJob(job.purgeJobId,adapter(calls)),'pending')
  assert.equal(calls.length,0)
  assert.equal((await derivativeRef(sid,'foreign').get()).exists,true)
  assert.equal((await purgeRef(job.purgeJobId).get()).get('failureCode'),'SPEECH_PURGE_FOREIGN_DERIVATIVE')
  assert.equal((await purgeRef(job.purgeJobId).get()).get('providerPurgeVerified'),false)
})

test('lease reactivation prevents worker deletion, even if queued', async () => {
  const sid='worker-active-fence'
  const job=await newJob(sid)
  await derivativeRef(sid,'retained').set({ownerId,sessionId:sid,sourceId,providerId,leaseRevision:1})
  await leaseRef(sid).update({active:true})
  await assert.rejects(processTrustedSpeechPurgeJob(job.purgeJobId),
    /SPEECH_PURGE_AUTHORITY_INVALID/)
  assert.equal((await derivativeRef(sid,'retained').get()).exists,true)
  assert.equal((await purgeRef(job.purgeJobId).get()).get('providerPurgeVerified'),false)
})

test('concurrent workers cannot call provider twice for one active claim', async () => {
  const sid='worker-concurrent'
  const job=await newJob(sid)
  let release
  const gate=new Promise(resolve=>{release=resolve})
  const calls=[]
  const ports={
    deleteProviderSession:async req=>{calls.push(req);await gate;return {...req,status:'deleted',evidenceId:'once',verifiedAtMs:Date.now()}},
    verifyProviderAcknowledgement:async returned=>returned,
  }
  const first=processTrustedSpeechPurgeJob(job.purgeJobId,ports)
  for(let i=0;i<80;i++) {
    if((await purgeRef(job.purgeJobId).get()).get('state')==='in-progress' && calls.length===1) break
    await new Promise(r=>setTimeout(r,50))
  }
  assert.equal(calls.length,1)
  assert.equal(await processTrustedSpeechPurgeJob(job.purgeJobId,ports),'pending')
  release()
  assert.equal(await first,'verified')
  assert.equal(calls.length,1)
})

test('forged queue identity is rejected before touching the owner', async () => {
  const sid='worker-forged'
  const job=await newJob(sid)
  const forgedId=createHash('sha256').update('not-speech-job').digest('hex')
  await purgeRef(forgedId).set({
    ownerId,sessionId:sid,sourceId,providerId,
    purgeJobId:forgedId,leaseRevision:2,schemaVersion:'urai-speech-purge-job-v1',
    state:'requested',attempts:0,providerPurgeVerified:false,scopes:[],
  })
  await assert.rejects(processTrustedSpeechPurgeJob(forgedId),
    /SPEECH_PURGE_INVALID_JOB_IDENTITY/)
  assert.equal((await purgeRef(job.purgeJobId).get()).get('state'),'requested')
})
