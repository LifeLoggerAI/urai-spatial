'use strict'
// Read-only attestation collector. The production entrypoint never accepts
// caller-supplied approval, observer flags, provider records, or test transports.
const { execFileSync } = require('node:child_process')
const { readFileSync } = require('node:fs')
const { stripTypeScriptTypes } = require('node:module')
const { randomBytes } = require('node:crypto')
const path = require('node:path')
const { verifyServingRequestAfterIngestion } = require('./memory-media-staging-request-log-proof.cjs')
const { verifyControlPlaneDeployment } = require('./memory-media-staging-deployed-source.cjs')
const { readBoundedProviderBody, readBoundedProviderJson } = require('./memory-media-staging-provider-body.cjs')
const API = Object.freeze({
  function:'https://cloudfunctions.googleapis.com/v2/',
  build:'https://cloudbuild.googleapis.com/v1/',
  run:'https://run.googleapis.com/v2/',
  logging:'https://logging.googleapis.com/v2/entries:list',
})
const MAX_LOG_PAGES = 4
const LOG_PAGE_SIZE = 25
function check(value,pattern){
  if(typeof value!=='string'||!pattern.test(value))throw Error('STAGING_CONTROL_PLANE_INPUT_REJECTED')
}
function projectPath(project,region,functionName){
  check(project,/^urai-[a-z0-9-]+-(?:staging|sandbox|test)(?:-[a-z0-9]+)?$/)
  check(region,/^[a-z]+-[a-z0-9]+[0-9]$/)
  check(functionName,/^[a-zA-Z][a-zA-Z0-9_-]{2,90}$/)
  return `projects/${project}/locations/${region}/functions/${functionName}`
}
async function assertCanonicalStaging(project){
  // Evaluate the exact policy module used by the Firebase Functions handlers.
  // No caller-provided registry or environment is accepted here.
  const source=readFileSync(path.resolve(__dirname,'../src/memoryMediaProjectBoundary.ts'),'utf8')
  const boundary=await import('data:text/javascript;charset=utf-8,'+
    encodeURIComponent(stripTypeScriptTypes(source,{mode:'strip'})))
  try {
    if(!Object.prototype.hasOwnProperty.call(boundary.APPROVED_MEDIA_STAGING_BUCKETS,project)
       ||boundary.resolveMemoryMediaProject(process.env)!==project)
      throw Error('unapproved')
  }catch { throw Error('STAGING_PROJECT_NOT_APPROVED') }
}
function adcToken(){
  const token=execFileSync('gcloud',['auth','application-default','print-access-token'],
    {encoding:'utf8',timeout:10000,stdio:['ignore','pipe','pipe']}).trim()
  check(token,/^[A-Za-z0-9._~-]{30,4096}$/)
  return token
}
function validateProbeUrl(value,project,region,functionName){
  let u
  try {u=new URL(value)} catch { throw Error('STAGING_PROBE_URL_INVALID') }
  if(u.protocol!=='https:'||u.username||u.password||u.hash
    ||u.hostname!==`${region}-${project}.cloudfunctions.net`
    ||u.port||u.pathname!==`/${functionName}`
    ||!['memoryId','receiptId','authorityHash','expiresAt','storageGeneration']
      .every(name=>u.searchParams.has(name)&&u.searchParams.get(name)))
    throw Error('STAGING_PROBE_URL_INVALID')
  return u.href
}
// Only a verified, bounded, fully exhausted log query can be used by the
// deployment verifier. This helper does not grant any approval or acceptance.
async function readBoundedLogPages(postPage,{project,region,service,revision,traceId,startedAt,endedAt}){
  projectPath(project,region,'streamMemoryMediaPlayback')
  check(service,/^[a-z0-9-]{3,100}$/)
  check(revision,/^[a-z0-9-]{10,100}$/)
  check(traceId,/^[a-f0-9]{32}$/)
  const start=Date.parse(startedAt),end=Date.parse(endedAt)
  if(!Number.isFinite(start)||!Number.isFinite(end)||end<start||end-start>120000)
    throw Error('STAGING_LOG_WINDOW_INVALID')
  const low=new Date(start-30000).toISOString(),high=new Date(end+30000).toISOString()
  const filter=[
    'resource.type="cloud_run_revision"',
    `resource.labels.project_id="${project}"`,
    `resource.labels.location="${region}"`,
    `resource.labels.service_name="${service}"`,
    `resource.labels.revision_name="${revision}"`,
    `trace="projects/${project}/traces/${traceId}"`,
    `timestamp>="${low}"`,
    `timestamp<="${high}"`,
  ].join(' AND ')
  const entries=[],seen=new Set()
  let token
  for(let page=0;page<MAX_LOG_PAGES;page++){
    const body={resourceNames:[`projects/${project}`],filter,orderBy:'timestamp desc',pageSize:LOG_PAGE_SIZE}
    if(token)body.pageToken=token
    const response=await postPage(body)
    if(!response||typeof response!=='object'||Array.isArray(response)
       ||(response.entries!==undefined&&!Array.isArray(response.entries)))
      throw Error('STAGING_LOG_PAGE_MALFORMED')
    if((response.entries||[]).length>LOG_PAGE_SIZE)throw Error('STAGING_LOG_PAGE_MALFORMED')
    entries.push(...(response.entries||[]))
    if(!response.nextPageToken)return entries
    check(response.nextPageToken,/^[A-Za-z0-9_~+\/=.-]{1,2048}$/)
    if(seen.has(response.nextPageToken))throw Error('STAGING_LOG_PAGE_TOKEN_REPEATED')
    seen.add(response.nextPageToken)
    token=response.nextPageToken
  }
  throw Error('STAGING_LOG_PAGINATION_INCOMPLETE')
}
async function readTrustedControlPlane(options){
  const input=options||{}
  const {project,region,functionName,expectedSha,requestUrl,ownerIdToken}=input
  const resource=projectPath(project,region,functionName)
  check(expectedSha,/^[a-f0-9]{40}$/)
  // A previously supplied observer flag, approval, or HTTP mock is never proof.
  const allowed=['project','region','functionName','expectedSha','requestUrl','ownerIdToken',
    'archivePath','approvedSourceBucket']
  if(!input||typeof input!=='object'||Array.isArray(input)
    ||Object.keys(input).some(k=>!allowed.includes(k)))
    throw Error('STAGING_CALLER_EVIDENCE_REJECTED')
  await assertCanonicalStaging(project) // Mandatory before credentials or network I/O.
  // These caller fields are local selectors, not evidence or approval.
  // Source-controlled media and Functions-source bucket approval, independent
  // rebuild, and authenticated Google readback occur inside the provider.
  const archiveRequested=input.archivePath!==undefined||input.approvedSourceBucket!==undefined
  if(archiveRequested&&(!input.archivePath||!input.approvedSourceBucket))
    throw Error('STAGING_ARCHIVE_REQUEST_INCOMPLETE')
  // Lazy import avoids a CommonJS initialization cycle: upload-origin
  // currently imports projectPath from this already-initialized collector.
  if(functionName!=='streamMemoryMediaPlayback')throw Error('STAGING_FUNCTION_NOT_ALLOWED')
  check(ownerIdToken,/^[A-Za-z0-9._~-]{100,4096}$/)
  const target=validateProbeUrl(requestUrl,project,region,functionName)
  const authenticatedOrigin=archiveRequested
    ? await require('./memory-media-staging-upload-origin.cjs').readAuthenticatedUploadOrigin({
      project,region,functionName,expectedSha,
      archivePath:input.archivePath,approvedSourceBucket:input.approvedSourceBucket
    }) : undefined
  const googleToken=adcToken()
  const get=async url=>{
    const u=new URL(url)
    if(u.protocol!=='https:'||!['cloudfunctions.googleapis.com','cloudbuild.googleapis.com',
      'run.googleapis.com','logging.googleapis.com'].includes(u.hostname))
      throw Error('STAGING_API_ORIGIN_REJECTED')
    const result=await fetch(url,{method:'GET',headers:{authorization:`Bearer ${googleToken}`,
      accept:'application/json','accept-encoding':'identity','cache-control':'no-transform'},
      redirect:'error',signal:AbortSignal.timeout(15000)})
    if(result.status!==200)throw Error('STAGING_CONTROL_PLANE_HTTP_'+result.status)
    return readBoundedProviderJson(result)
  }
  const functionRecord=await get(API.function+resource)
  const buildName=functionRecord?.buildConfig?.build,serviceName=functionRecord?.serviceConfig?.service
  check(buildName,new RegExp('^projects/'+project+'/locations/(?:'+region+'|global)/builds/[a-f0-9-]{20,64}$'))
  check(serviceName,new RegExp('^projects/'+project+'/locations/'+region+'/services/[a-z0-9-]+$'))
  const revisionName=functionRecord?.serviceConfig?.revision
  check(revisionName,/^[a-z0-9-]{10,100}$/)
  const [cloudBuild,runService,runRevision]=await Promise.all([
    get(API.build+buildName),get(API.run+serviceName),
    get(API.run+serviceName+'/revisions/'+revisionName),
  ])
  const archiveSource=[functionRecord?.buildConfig?.source?.storageSource,
    functionRecord?.buildConfig?.sourceProvenance?.resolvedStorageSource,
    cloudBuild?.source?.storageSource,cloudBuild?.sourceProvenance?.resolvedStorageSource]
      .some(Boolean)
  if(archiveSource!==archiveRequested)
    throw Error('STAGING_SOURCE_MODE_MISMATCH')
  // The source/build/image/serving revision must already be verified
  // BEFORE making a protected private-media request.
  // An unaudited uploader always fails this check, even with a valid ZIP.
  const traceId=randomBytes(16).toString('hex')
  verifyControlPlaneDeployment({project,region,functionName,expectedSha,traceId,
    functionRecord,cloudBuild,runService,runRevision,authenticatedOrigin})
  const probeStartedAt=new Date().toISOString()
  const response=await fetch(target,{method:'GET',headers:{
    authorization:`Bearer ${ownerIdToken}`,'x-cloud-trace-context':`${traceId}/1;o=1`,
    origin:`https://${project}.web.app`,
  },cache:'no-store',redirect:'error',signal:AbortSignal.timeout(65000)})
  if(response.status!==200)throw Error('STAGING_PROBE_NOT_ACCEPTED')
  // Consume a bounded complete identity-encoded body, not arrayBuffer() on an
  // untrusted Content-Length and not a silently transformed stream.
  await readBoundedProviderBody(response,10*1024*1024)
  const probeEndedAt=new Date().toISOString()
  // Bounded ingestion polling: re-read only complete canonical pages and
  // re-run the full source/build/revision/request validator on every attempt.
  const verified=await verifyServingRequestAfterIngestion(
    ()=>readBoundedLogPages(async body=>{
      const res=await fetch(API.logging,{method:'POST',headers:{
        authorization:`Bearer ${googleToken}`,accept:'application/json',
        'accept-encoding':'identity','cache-control':'no-transform',
        'content-type':'application/json'},body:JSON.stringify(body),
        redirect:'error',signal:AbortSignal.timeout(15000)})
      if(res.status!==200)throw Error('STAGING_CONTROL_PLANE_HTTP_'+res.status)
      return readBoundedProviderJson(res)
    },{project,region,service:serviceName.split('/').pop(),revision:revisionName,
      traceId,startedAt:probeStartedAt,endedAt:probeEndedAt}),
    {project,region,functionName,expectedSha,
      requestUrl:target,traceId,probeStartedAt,probeEndedAt,functionRecord,
      cloudBuild,runService,runRevision,authenticatedOrigin})
  return {verified:verified.verified,sourceSha:verified.sourceSha,
    functionName:verified.functionName,revisionName:verified.revisionName,
    imageDigest:verified.imageDigest,buildId:verified.buildId,
    servingInstanceBound:verified.servingInstanceBound,
    sourceMode:verified.sourceMode,authenticatedArchiveOriginBound:verified.authenticatedArchiveOriginBound,
    uploaderIdentityVerified:verified.uploaderIdentityVerified,
    directGitSourceVerified:verified.directGitSourceVerified}
}
module.exports={readTrustedControlPlane,projectPath,readBoundedLogPages}
