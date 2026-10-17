'use strict'
const {test}=require('node:test')
const assert=require('node:assert/strict')
const {evaluateOfflineUploadOriginContract:proof,readAuthenticatedUploadOrigin,crc32cBase64}=require('./memory-media-staging-upload-origin.cjs')
const {createHash}=require('node:crypto')
const project='urai-fixture-staging',region='us-central1',fnName='streamMemoryMediaPlayback'
const prefix=`projects/${project}/locations/${region}`
const bucket='gcf-v2-sources-fictional',object='uploads/fake-source.zip',generation='123'
const bytes=Buffer.from('fictional local zip bytes only; not a real deployment')
function fixture(){
 const a={project,region,functionName:fnName,localBytes:bytes,providerBytes:Buffer.from(bytes),sourceBucket:bucket}
 const src={bucket,object,generation}
 const buildId='a'.repeat(32)
 a.cloudFunction={name:`${prefix}/functions/${fnName}`,environment:'GEN_2',state:'ACTIVE',
   buildConfig:{build:`${prefix}/builds/${buildId}`,source:{storageSource:src},
     sourceProvenance:{resolvedStorageSource:src}}}
 a.cloudBuild={name:`${prefix}/builds/${buildId}`,projectId:project,status:'SUCCESS',
   source:{storageSource:src},sourceProvenance:{resolvedStorageSource:src}}
 a.metadata={kind:'storage#object',name:object,bucket,generation,size:String(bytes.length),
   crc32c:crc32cBase64(bytes),md5Hash:createHash('md5').update(bytes).digest('base64')}
 return a
}
function rejects(mutate,code){const x=fixture();mutate(x);
 assert.throws(()=>proof(x),e=>e.message==='STAGING_UPLOAD_ORIGIN_UNVERIFIED:'+code)}
test('fixture-only matching GCS and Cloud Build bytes never grant deployed acceptance',()=>{
 const r=proof(fixture())
 assert.equal(r.classification,'OFFLINE_GCS_CLOUD_BUILD_OBJECT_LINK_CONTRACT_ONLY')
 assert.equal(r.sourceObjectMatchesLocalArchive,true)
 assert.equal(r.uploaderIdentityVerified,false)
 assert.equal(r.cloudRunRevisionVerified,false)
 assert.equal(r.releaseCertified,false)
})
test('CRC32C known Castagnoli vector 123456789',()=>assert.equal(crc32cBase64(Buffer.from('123456789')),'4waSgw=='))
test('wrong actual provider ZIP bytes reject despite editable SHA metadata',()=>rejects(x=>{
 x.providerBytes=Buffer.from('swapped bytes');x.metadata.metadata={sha256:createHash('sha256').update(x.localBytes).digest('hex')}
},'SOURCE_ARCHIVE_BYTES_DIFFER'))
test('wrong project rejected',()=>rejects(x=>{x.cloudFunction.name=x.cloudFunction.name.replace(project,'foreign')},'FUNCTION_IDENTITY'))
test('wrong source bucket rejected',()=>rejects(x=>{x.cloudBuild.sourceProvenance.resolvedStorageSource={...x.cloudBuild.sourceProvenance.resolvedStorageSource,bucket:'bad-bucket'}},'SOURCE_OBJECT_IDENTITY'))
test('wrong object name rejected',()=>rejects(x=>{x.metadata.name='other.zip'},'OBJECT_GENERATION_MISMATCH'))
test('wrong GCS generation rejected',()=>rejects(x=>{x.metadata.generation='124'},'OBJECT_GENERATION_MISMATCH'))
test('wrong Cloud Build resolved generation rejected',()=>rejects(x=>{x.cloudBuild.source.storageSource={...x.cloudBuild.source.storageSource,generation:'124'}},'BUILD_SOURCE_MISMATCH'))
test('wrong Cloud Function archive binding rejects',()=>rejects(x=>{x.cloudFunction.buildConfig.source.storageSource={...x.cloudFunction.buildConfig.source.storageSource,object:'other.zip'}},'FUNCTION_SOURCE_MISMATCH'))
test('inconsistent provider CRC32C rejects',()=>rejects(x=>{x.metadata.crc32c='AAAAAA=='},'CRC32C_MISMATCH'))
test('inconsistent provider MD5 rejects',()=>rejects(x=>{x.metadata.md5Hash='AAAAAA=='},'MD5_MISMATCH'))
test('missing checksum rejects',()=>rejects(x=>{delete x.metadata.crc32c},'CRC32C_MISMATCH'))
test('provider size mismatch rejects',()=>rejects(x=>{x.metadata.size='0'},'OBJECT_SIZE_MISMATCH'))
test('forged custom sha256 metadata cannot grant proof',()=>rejects(x=>{x.metadata.metadata={sha256:'f'.repeat(64)}},'EDITABLE_METADATA_NOT_AUTHORITY'))
test('mixed claimed Git build source rejects',()=>rejects(x=>{x.cloudBuild.sourceProvenance.resolvedGitSource={url:'https://github.com/LifeLoggerAI/urai-spatial.git',revision:'a'.repeat(40)}},'MIXED_GIT_SOURCE_CLAIM'))
test('failed Cloud Build rejects',()=>rejects(x=>{x.cloudBuild.status='FAILURE'},'BUILD_IDENTITY'))
test('foreign Cloud Build project rejects',()=>rejects(x=>{x.cloudBuild.projectId='other'},'BUILD_IDENTITY'))
test('unknown provider response shape rejects',()=>rejects(x=>{x.metadata={}},'OBJECT_GENERATION_MISMATCH'))
test('no caller-supplied token/provider/mock approval accepted by read-only entrypoint',async()=>{
 for(const name of ['fetcher','records','approvedStaging','getAccessToken','uploadReceipt','trustedSha256']) {
  await assert.rejects(readAuthenticatedUploadOrigin({project,region,functionName:fnName,
    expectedSha:'a'.repeat(40),archivePath:'/fictional',approvedSourceBucket:bucket,[name]:true}),
    /STAGING_UPLOAD_ORIGIN_UNVERIFIED:CALLER_EVIDENCE_REJECTED/)
 }
})
test('canonical registry blocks cloud access before attempting local files or ADC',async()=>{
 await assert.rejects(readAuthenticatedUploadOrigin({project,region,functionName:fnName,
   expectedSha:'a'.repeat(40),archivePath:'/fictional',approvedSourceBucket:bucket}),
   /STAGING_UPLOAD_ORIGIN_UNVERIFIED:PROJECT_NOT_APPROVED/)
})
