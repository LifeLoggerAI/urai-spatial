'use strict'
// Read-only, SOURCE-CONTROLLED staging-only bridge from a locally reviewed
// Firebase ZIP to an authenticated GCS object generation and Cloud Build input.
// This is NOT a Firebase deploy/upload, an uploader-identity attestation,
// Cloud Run revision proof, or protected-media admission.
const {createHash} = require('node:crypto')
const {execFileSync} = require('node:child_process')
const {readFileSync,statSync} = require('node:fs')
const {stripTypeScriptTypes} = require('node:module')
const {resolve} = require('node:path')
const {projectPath} = require('./memory-media-staging-cloud-collector.cjs')

// The Firebase media bucket and the Google-managed Functions *source* bucket
// are different resources. Never infer one from the other. Approval registry
// remains intentionally EMPTY until independently reviewed source governance.
const APPROVED_FUNCTIONS_SOURCE_BUCKETS = Object.freeze({})
const MAX_SOURCE_BYTES = 128 * 1024 * 1024
const bad = code => {throw Error('STAGING_UPLOAD_ORIGIN_UNVERIFIED:' + code)}
const sha = bytes => createHash('sha256').update(bytes).digest('hex')
const crcTable = Array.from({length:256},(_,n)=>{
 let c=n
 for(let i=0;i<8;i++) c=(c&1)?(c>>>1)^0x82f63b78:c>>>1
 return c>>>0
})
function crc32cBase64(bytes){
 let crc=0xffffffff
 for(const x of bytes)crc=(crc>>>8)^crcTable[(crc^x)&255]
 crc=(crc^0xffffffff)>>>0
 const b=Buffer.allocUnsafe(4);b.writeUInt32BE(crc)
 return b.toString('base64')
}
const decimal=n=>typeof n==='string' && /^[1-9][0-9]{0,19}$/.test(n)
const sameStorage=(s,bucket,object,generation,allowUnresolved=false)=>
 s?.bucket===bucket && s.object===object &&
 (String(s.generation||'')===generation || (allowUnresolved&&(s.generation===undefined||s.generation===null)))

// Pure contract used only by FICTIONAL offline tests. Arbitrary JSON passed
// to this function is NEVER accepted as independently observed Google evidence.
function evaluateOfflineUploadOriginContract({project,region,functionName,localBytes,providerBytes,
  metadata,cloudFunction,cloudBuild,sourceBucket}){
 const functionPath=projectPath(project,region,functionName)
 if(functionName!=='streamMemoryMediaPlayback')bad('FUNCTION_NOT_ALLOWED')
 if(typeof sourceBucket!=='string'||!/^[a-z0-9][a-z0-9._-]{2,220}$/.test(sourceBucket))bad('SOURCE_BUCKET_INVALID')
 if(!Buffer.isBuffer(localBytes)||!Buffer.isBuffer(providerBytes)
   ||!localBytes.length||localBytes.length>MAX_SOURCE_BYTES
   ||!providerBytes.length||providerBytes.length>MAX_SOURCE_BYTES)bad('ARCHIVE_BYTES_MISSING')
 if(sha(localBytes)!==sha(providerBytes))bad('SOURCE_ARCHIVE_BYTES_DIFFER')
 const fn=cloudFunction,build=cloudBuild,obj=metadata
 if(fn?.name!==functionPath||fn.environment!=='GEN_2'||fn.state!=='ACTIVE'||fn.eventTrigger)bad('FUNCTION_IDENTITY')
 const buildPath=fn.buildConfig?.build
 if(typeof buildPath!=='string'||!new RegExp(`^projects/${project}/locations/(?:${region}|global)/builds/[a-f0-9-]{20,64}$`,'i').test(buildPath)
  ||build?.name!==buildPath||build.projectId!==project||build.status!=='SUCCESS')bad('BUILD_IDENTITY')
 const resolved=build.sourceProvenance?.resolvedStorageSource
 const bucket=resolved?.bucket,object=resolved?.object,generation=String(resolved?.generation||'')
 if(bucket!==sourceBucket||typeof object!=='string'||object.length>1024
  ||!/^[-a-zA-Z0-9_./]+$/.test(object)||object.startsWith('/')
  ||object.split('/').some(p=>!p||p==='.'||p==='..')||!decimal(generation))bad('SOURCE_OBJECT_IDENTITY')
 if(!sameStorage(build.source?.storageSource,bucket,object,generation,true))bad('BUILD_SOURCE_MISMATCH')
 const fnInput=fn.buildConfig?.source?.storageSource
 const fnResolved=fn.buildConfig?.sourceProvenance?.resolvedStorageSource
 if(fnInput&&!sameStorage(fnInput,bucket,object,generation,true))bad('FUNCTION_SOURCE_MISMATCH')
 if(fnResolved&&!sameStorage(fnResolved,bucket,object,generation))bad('FUNCTION_SOURCE_MISMATCH')
 if(obj?.kind!=='storage#object'||obj.bucket!==bucket||obj.name!==object
   ||String(obj.generation)!==generation||!decimal(String(obj.generation||'')))bad('OBJECT_GENERATION_MISMATCH')
 if(!/^[0-9]+$/.test(String(obj.size||'')) || Number(obj.size)!==providerBytes.length)bad('OBJECT_SIZE_MISMATCH')
 // CRC32C is checked as the provider's transport integrity checksum, NOT
 // cryptographic proof of source authorship. Exact downloaded bytes are also
 // independently SHA256 compared against the locally verified source ZIP.
 if(typeof obj.crc32c!=='string'||obj.crc32c!==crc32cBase64(providerBytes))bad('CRC32C_MISMATCH')
 if(obj.md5Hash!==undefined && obj.md5Hash!==createHash('md5').update(providerBytes).digest('base64'))bad('MD5_MISMATCH')
 if(obj.metadata && Object.keys(obj.metadata).some(k=>/^(?:sha256|sourceSha|commitSha|reviewed|trusted|attestation)$/i.test(k)))
   bad('EDITABLE_METADATA_NOT_AUTHORITY')
 if(build.sourceProvenance?.resolvedGitSource||build.source?.gitSource)bad('MIXED_GIT_SOURCE_CLAIM')
 return Object.freeze({
  classification:'OFFLINE_GCS_CLOUD_BUILD_OBJECT_LINK_CONTRACT_ONLY',
  localArchiveSha256:sha(localBytes),objectGeneration:generation,
  sourceObjectMatchesLocalArchive:true,cloudBuildSourceObjectMatches:true,
  uploaderIdentityVerified:false,cloudRunImageVerified:false,cloudRunRevisionVerified:false,
  protectedMediaAccepted:false,releaseCertified:false,
 })
}

async function assertCanonicalApprovedMediaAndSourceBucket(project,bucket){
 const src=readFileSync(resolve(__dirname,'../src/memoryMediaProjectBoundary.ts'),'utf8')
 const boundary=await import('data:text/javascript;charset=utf-8,'+
   encodeURIComponent(stripTypeScriptTypes(src,{mode:'strip'})))
 if(!Object.prototype.hasOwnProperty.call(boundary.APPROVED_MEDIA_STAGING_BUCKETS,project))bad('PROJECT_NOT_APPROVED')
 if(!Object.prototype.hasOwnProperty.call(APPROVED_FUNCTIONS_SOURCE_BUCKETS,project)
   ||APPROVED_FUNCTIONS_SOURCE_BUCKETS[project]!==bucket)bad('SOURCE_BUCKET_NOT_APPROVED')
 try {if(boundary.resolveMemoryMediaProject(process.env)!==project)bad('PROJECT_NOT_APPROVED')}
 catch {bad('PROJECT_NOT_APPROVED')}
}
function googleToken(){
 const t=execFileSync('gcloud',['auth','application-default','print-access-token'],
   {encoding:'utf8',timeout:10000,stdio:['ignore','pipe','pipe']}).trim()
 if(!/^[A-Za-z0-9._~-]{30,4096}$/.test(t))bad('GOOGLE_CREDENTIALS_UNAVAILABLE')
 return t
}
async function jsonGet(url,token){
 const result=await fetch(url,{method:'GET',headers:{authorization:`Bearer ${token}`,accept:'application/json'},
  redirect:'error',signal:AbortSignal.timeout(20000)})
 if(!result.ok)bad('PROVIDER_HTTP_'+result.status)
 const json=await result.json()
 if(!json||typeof json!=='object'||Array.isArray(json))bad('PROVIDER_RESPONSE_INVALID')
 return json
}
async function boundedMediaGet(url,token){
 const result=await fetch(url,{method:'GET',headers:{authorization:`Bearer ${token}`},
  redirect:'error',signal:AbortSignal.timeout(60000)})
 if(!result.ok)bad('PROVIDER_HTTP_'+result.status)
 const header=Number(result.headers.get('content-length'))
 if(Number.isFinite(header)&&header>MAX_SOURCE_BYTES)bad('SOURCE_OBJECT_TOO_LARGE')
 if(!result.body)bad('SOURCE_OBJECT_MISSING')
 const chunks=[];let count=0
 const reader=result.body.getReader()
 try {
  while(true){const {value,done}=await reader.read();if(done)break
   count+=value.length;if(count>MAX_SOURCE_BYTES)bad('SOURCE_OBJECT_TOO_LARGE')
   chunks.push(Buffer.from(value))}
 }finally{reader.releaseLock()}
 return Buffer.concat(chunks)
}

// Production entrypoint: no caller-supplied provider records, token, fetcher,
// approval flags, cloud responses or checksums. Zero write methods. Canonical
// source-controlled media AND source-bucket approvals are mandatory before
// invoking Git / gcloud / Google APIs. The archive is first checked against
// a separate offline rebuild of immutable Git HEAD.
async function readAuthenticatedUploadOrigin(options={}){
 const allowed=['project','region','functionName','expectedSha','archivePath','approvedSourceBucket']
 if(!options||typeof options!=='object'||Array.isArray(options)
   ||Object.keys(options).some(k=>!allowed.includes(k)))bad('CALLER_EVIDENCE_REJECTED')
 const {project,region,functionName,expectedSha,archivePath,approvedSourceBucket}=options
 projectPath(project,region,functionName)
 if(functionName!=='streamMemoryMediaPlayback'||!(/^[a-f0-9]{40}$/.test(expectedSha||'')))bad('INVALID_REQUEST')
 await assertCanonicalApprovedMediaAndSourceBucket(project,approvedSourceBucket)
 const root=resolve(__dirname,'../../..'), archive=resolve(archivePath||'')
 const stdout=execFileSync('python3',[
  resolve(root,'scripts/verify_functions_source_archive.py'),
  '--repo-root',root,'--source-dir',resolve(root,'apps/functions'),
  '--archive',archive,'--expected-sha',expectedSha,'--rebuild-generated',
 ],{encoding:'utf8',timeout:300000,maxBuffer:65536,stdio:['ignore','pipe','pipe']})
 const localReceipt=JSON.parse(stdout)
 if(localReceipt.status!=='OFFLINE_PACKAGE_BYTES_MATCH_ONLY'
  ||localReceipt.checkoutSha!==expectedSha||!localReceipt.generatedOutputBuildVerified
  ||!localReceipt.toolchainVerifiedByOfflineRebuild)bad('OFFLINE_SOURCE_UNVERIFIED')
 const stat=statSync(archive)
 if(!stat.isFile()||stat.size>MAX_SOURCE_BYTES)bad('LOCAL_ARCHIVE_INVALID')
 const localBytes=readFileSync(archive)
 if(localReceipt.archiveSha256!==sha(localBytes))bad('LOCAL_RECEIPT_CHANGED')
 const token=googleToken()
 const functionPath=projectPath(project,region,functionName)
 const fn=await jsonGet('https://cloudfunctions.googleapis.com/v2/'+functionPath,token)
 const buildPath=fn?.buildConfig?.build
 if(typeof buildPath!=='string'||!new RegExp(`^projects/${project}/locations/(?:${region}|global)/builds/[a-f0-9-]{20,64}$`,'i').test(buildPath))bad('BUILD_RESOURCE_INVALID')
 const build=await jsonGet('https://cloudbuild.googleapis.com/v1/'+buildPath,token)
 const source=build.sourceProvenance?.resolvedStorageSource
 if(!source||source.bucket!==approvedSourceBucket||!decimal(String(source.generation||'')))bad('SOURCE_BUCKET_OR_GENERATION_UNVERIFIED')
 if(typeof source.object!=='string'||source.object.length>1024||!/^[-a-zA-Z0-9_./]+$/.test(source.object)
    ||source.object.split('/').some(p=>!p||p==='.'||p==='..'))bad('SOURCE_OBJECT_PATH_INVALID')
 const objUrl=`https://storage.googleapis.com/storage/v1/b/${encodeURIComponent(source.bucket)}/o/${encodeURIComponent(source.object)}`
 const generation=`generation=${encodeURIComponent(String(source.generation))}`
 const metadata=await jsonGet(objUrl+'?'+generation,token)
 const bytes=await boundedMediaGet(objUrl+'?'+generation+'&alt=media',token)
 const result=evaluateOfflineUploadOriginContract({project,region,functionName,localBytes,providerBytes:bytes,
   metadata,cloudFunction:fn,cloudBuild:build,sourceBucket:approvedSourceBucket})
 return Object.freeze({...result,
   classification:'AUTHENTICATED_OBJECT_READBACK_AND_BUILD_SOURCE_LINK_ONLY',
   localSourceBuildVerified:true,authenticatedProviderReadback:true,
   uploaderIdentityVerified:false,cloudRunImageVerified:false,cloudRunRevisionVerified:false,
   protectedMediaAccepted:false,releaseCertified:false})
}
module.exports={evaluateOfflineUploadOriginContract,readAuthenticatedUploadOrigin,crc32cBase64}
