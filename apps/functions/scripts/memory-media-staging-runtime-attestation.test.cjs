'use strict'
const { test } = require('node:test')
const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const { join } = require('node:path')
const { runInNewContext } = require('node:vm')
const { classifyStagingMediaAcceptance } = require('./memory-media-staging-admission.cjs')

// VM-only require interception: there is no production test transport or
// caller-injectable collector argument on the exported runtime function.
const source = readFileSync(join(__dirname, 'memory-media-staging-runtime-attestation.cjs'), 'utf8')
const sha = 'a'.repeat(40)
const args = {project: 'urai-fictional-staging', region: 'us-central1', expectedSha: sha,
  requestUrl: 'https://example.invalid/fictional-media', ownerIdToken: 'fictional-private-token'}
const proof = { verified: true, sourceSha: sha, functionName: 'streamMemoryMediaPlayback',
  servingInstanceBound: true, revisionName: 'fictional-revision', imageDigest: 'sha256:' + 'c'.repeat(64) }
function offline(collector) {
  const m = { exports: {} }
  runInNewContext(source, {module:m, exports:m.exports, require: id => {
    assert.equal(id, './memory-media-staging-cloud-collector.cjs')
    return {readTrustedControlPlane: collector}
  }}, {timeout: 1000})
  return m.exports.attestStagingPlayback
}
const completeEvidence = () => ({actualCloudBucketMetadata:true,actualNoPublicIam:true,
  positiveProxyPlaybackAccepted:true,exactClientBlobAccepted:true,
  sourceCheckoutVerified:true,deployedSourceExactHeadVerified:true,cleanupComplete:true})

test('offline fictional match invokes collector with exact SHA and fixed function', async () => {
  let observed
  const run = offline(async input => {observed = input;return proof})
  const result = await run({...args,functionName:'attackerFunction',approvedProject:'fake',
    records:{verified:true},fetcher:()=>{throw Error('injected')}})
  assert.equal(result.verified,true)
  assert.equal(result.errorCode,null)
  assert.deepEqual(Object.keys(observed).sort(),['project','region','functionName','expectedSha','requestUrl','ownerIdToken'].sort())
  assert.equal(observed.functionName,'streamMemoryMediaPlayback')
  assert.equal(observed.expectedSha,sha)
  assert.equal(observed.requestUrl,args.requestUrl)
})
test('wrong source, function, revision, digest, and serving identity fail closed', async () => {
  for(const extra of [{sourceSha:'f'.repeat(40)},{functionName:'wrongFunction'},
    {revisionName:''},{imageDigest:'unbound-tag'}, {servingInstanceBound:false},{verified:false}]){
    const result = await offline(async () => ({...proof,...extra}))(args)
    assert.equal(result.verified,false)
    assert.equal(result.errorCode,'STAGING_DEPLOYED_SOURCE_UNVERIFIED')
  }
})
test('collector errors do not leak private request descriptor or credentials', async () => {
  for(const message of ['STAGING_PROJECT_NOT_APPROVED','STAGING_DEPLOYED_SOURCE_UNVERIFIED:SOURCE_ARCHIVE_UNATTESTED',
    'sensitive token=secret-token private media URI']){
    const result=await offline(async()=>{throw Error(message)})(args)
    assert.equal(result.verified,false)
    assert.ok(/^STAGING_[A-Z0-9_]+$/.test(result.errorCode))
    assert.ok(!JSON.stringify(result).includes('secret-token'))
  }
})
test('missing provider evidence or null result cannot become accepted', async () => {
  for(const value of [null,undefined,{}, {verified:true}]){
    const result=await offline(async()=>value)(args)
    assert.equal(result.verified,false)
  }
})
test('failed attestation and incomplete cleanup never classify as positive staging', async () => {
  const denied=completeEvidence();denied.deployedSourceExactHeadVerified=false
  assert.equal(classifyStagingMediaAcceptance(denied).runResult,'NOT_ACCEPTED')
  const dirty=completeEvidence();dirty.cleanupComplete=false
  assert.equal(classifyStagingMediaAcceptance(dirty).runResult,'NOT_ACCEPTED')
  assert.equal(classifyStagingMediaAcceptance(completeEvidence(),true).runResult,'NOT_ACCEPTED')
})
