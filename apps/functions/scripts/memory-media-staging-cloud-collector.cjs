'use strict'
// Authenticated read-only control-plane acquisition. Never accepts a caller's
// record as proof; all provider records come from access-token-authorized GETs.
// Provider schema drift intentionally blocks acceptance.
const { verifyControlPlaneDeployment, verifyControlPlaneEvidence } = require('./memory-media-staging-deployed-source.cjs')
const { execFileSync } = require('node:child_process')
function check(x,pattern){if(typeof x!=='string'||!pattern.test(x))throw Error('STAGING_CONTROL_PLANE_INPUT_REJECTED')}
const API = Object.freeze({
  function:'https://cloudfunctions.googleapis.com/v2/',
  build:'https://cloudbuild.googleapis.com/v1/',
  run:'https://run.googleapis.com/v2/',
  logging:'https://logging.googleapis.com/v2/entries:list',
})
function projectPath(project,region,functionName){
  check(project,/^urai-[a-z0-9-]+-(?:staging|sandbox|test)(?:-[a-z0-9]+)?$/)
  check(region,/^[a-z]+-[a-z0-9]+[0-9]$/)
  check(functionName,/^[a-zA-Z][a-zA-Z0-9_-]{2,90}$/)
  return 'projects/'+project+'/locations/'+region+'/functions/'+functionName
}
function adcToken(){
  // Google CLI uses the machine's approved ADC identity; never persist it.
  const token=execFileSync('gcloud',['auth','application-default','print-access-token'],
    {encoding:'utf8',timeout:10000,stdio:['ignore','pipe','pipe']}).trim()
  check(token,/^[A-Za-z0-9._~-]{30,4096}$/)
  return token
}
async function readTrustedControlPlane(options){
  const {project,region,functionName,expectedSha,requestUrl,traceId,probeStartedAt,probeEndedAt}=options||{}
  const resource=projectPath(project,region,functionName)
  check(expectedSha,/^[a-f0-9]{40}$/)
  if(!options.approvedProject||options.approvedProject!==project)throw Error('STAGING_PROJECT_NOT_APPROVED')
  if(!options.probeObservedByHarness)throw Error('STAGING_PROBE_NOT_BOUND')
  const token=(options.getAccessToken||adcToken)()
  const fetcher=options.fetcher||fetch
  const get=async url=>{
    const u=new URL(url)
    if(!['cloudfunctions.googleapis.com','cloudbuild.googleapis.com','run.googleapis.com','logging.googleapis.com'].includes(u.hostname)
       ||u.protocol!=='https:')throw Error('STAGING_API_ORIGIN_REJECTED')
    const isLogging=u.hostname==='logging.googleapis.com'
    const res=await fetcher(url,{method:isLogging?'POST':'GET',headers:{
      authorization:'Bearer '+token,accept:'application/json',...(isLogging?{'content-type':'application/json'}:{})
    },...(isLogging?{body:JSON.stringify({resourceNames:['projects/'+project],filter:
      'resource.type="cloud_run_revision" AND trace="projects/'+project+'/traces/'+traceId+'"',pageSize:25})}:{}),
      redirect:'error',signal:AbortSignal.timeout(15000)})
    if(!res.ok)throw Error('STAGING_CONTROL_PLANE_HTTP_'+res.status)
    const data=await res.json()
    if(!data||typeof data!=='object'||Array.isArray(data))throw Error('STAGING_CONTROL_PLANE_INVALID_RESPONSE')
    return data
  }
  const functionRecord=await get(API.function+resource)
  const buildName=functionRecord?.buildConfig?.build,serviceName=functionRecord?.serviceConfig?.service
  check(buildName,new RegExp('^projects/'+project+'/locations/(?:'+region+'|global)/builds/[a-f0-9-]{20,64}$'))
  check(serviceName,new RegExp('^projects/'+project+'/locations/'+region+'/services/[a-z0-9-]+$'))
  const revisionName=functionRecord?.serviceConfig?.revision
  check(revisionName,/^[a-z0-9-]{10,100}$/)
  const [cloudBuild,runService,runRevision,logData]=await Promise.all([
    get(API.build+buildName),
    get(API.run+serviceName),
    get(API.run+serviceName+'/revisions/'+revisionName),
    get(API.logging),
  ])
  const evidence={project,region,functionName,expectedSha,requestUrl,traceId,
    probeStartedAt,probeEndedAt,functionRecord,cloudBuild,runService,runRevision,
    requestLogs:Array.isArray(logData.entries)?logData.entries:[]}
  const checked=verifyControlPlaneEvidence(evidence)
  return {verified:checked.verified,sourceSha:checked.sourceSha,
    functionName:checked.functionName,revisionName:checked.revisionName,
    imageDigest:checked.imageDigest,buildId:checked.buildId,servingInstanceBound:checked.servingInstanceBound}
}
module.exports={readTrustedControlPlane,projectPath}
