'use strict'
// Pure validation of authenticated Google control-plane data. Fictional test fixtures are NOT deployment evidence.
function verifyControlPlaneEvidence(x) {
  const bad = reason => { throw new Error('STAGING_DEPLOYED_SOURCE_UNVERIFIED:'+reason) }
  const P=x?.project,R=x?.region,F=x?.functionName,S=x?.expectedSha,trace=x?.traceId;
  const reSha=/^[a-f0-9]{40}$/i,reProject=/^[a-z][a-z0-9-]{4,61}[a-z0-9]$/,reName=/^[a-zA-Z][a-zA-Z0-9_-]{2,90}$/;
  if(!reProject.test(P||'')||!/^[a-z]+-[a-z0-9]+[0-9]$/.test(R||'')||!reName.test(F||'')||!reSha.test(S||'')||!/^[a-f0-9]{32}$/.test(trace||''))bad('INVALID_INPUT');
  const functionPath=`projects/${P}/locations/${R}/functions/${F}`;
  const fn=x.functionRecord,svc=x.runService,rev=x.runRevision,build=x.cloudBuild,logs=x.requestLogs;
  if(fn?.name!==functionPath||fn.environment!=='GEN_2'||fn.state!=='ACTIVE'||fn.eventTrigger
    ||fn.buildConfig?.entryPoint!==F)bad('FUNCTION_IDENTITY');
  const buildPath=fn.buildConfig?.build;
  if(typeof buildPath!=='string'||!new RegExp(`^projects/${P}/locations/(?:${R}|global)/builds/[0-9a-f-]{20,64}$`,'i').test(buildPath))bad('BUILD_RESOURCE');
  const servicePath=fn.serviceConfig?.service;
  if(typeof servicePath!=='string'||!new RegExp(`^projects/${P}/locations/${R}/services/[a-z0-9-]+$`).test(servicePath)
   ||fn.serviceConfig?.allTrafficOnLatestRevision!==true)bad('SERVICE_BINDING');
  const revisionName=fn.serviceConfig?.revision,revisionId=typeof revisionName==='string'?revisionName.split('/').pop():'';
  const revisionPath=`${servicePath}/revisions/${revisionId}`;
  if(!revisionId||!new RegExp('^[a-z0-9-]{10,100}$').test(revisionId)
    ||(revisionName.includes('/')&&revisionName!==revisionPath))bad('REVISION_BINDING');
  if(svc?.name!==servicePath||svc.reconciling!==false||svc.terminalCondition?.state!=='CONDITION_SUCCEEDED'
    ||String(svc.generation)!==String(svc.observedGeneration)
    ||svc.latestReadyRevision?.split('/').pop()!==revisionId)bad('SERVICE_NOT_READY');
  const traffic=svc.trafficStatuses;
  if(!Array.isArray(traffic)||traffic.length!==1||traffic[0].percent!==100
    ||traffic[0].revision?.split('/').pop()!==revisionId)bad('SPLIT_TRAFFIC');
  if(rev?.name!==revisionPath||rev.service!==servicePath||rev.deleteTime
    ||!Array.isArray(rev.containers)||rev.containers.length!==1)bad('REVISION_RESOURCE');
  const img=rev.containers[0]?.image,m=typeof img==='string'?/^([a-z0-9.-]+\/[a-z0-9._/-]+)@sha256:([a-f0-9]{64})$/.exec(img):null;
  if(!m||!m[1].split('/').includes(P))bad('UNPINNED_IMAGE');
  const digest='sha256:'+m[2];
  if(build?.name!==buildPath||build.projectId!==P||build.status!=='SUCCESS'
    ||!Array.isArray(build.results?.images)||!build.results.images.some(i=>i.digest===digest
      && typeof i.name==='string'&&(i.name===m[1]||i.name.startsWith(m[1]+':'))))bad('BUILD_IMAGE_MISMATCH');
  const source=build.sourceProvenance?.resolvedGitSource;
  const validGit=url=>typeof url==='string'&&/^https:\/\/github\.com\/LifeLoggerAI\/urai-spatial(?:\.git)?$/.test(url);
  if(!validGit(source?.url)||String(source.revision).toLowerCase()!==S.toLowerCase()
    ||(build.source?.gitSource&&!validGit(build.source.gitSource.url)))bad('UNTRUSTED_BUILD_SOURCE');
  const parseUri=value=>/^https:\/\/([^/?#]+)(\/[^?#]+)\?([^#]+)$/.exec(value||'');
  const expected=parseUri(x.requestUrl);
  if(!expected||expected[1]!==`${R}-${P}.cloudfunctions.net`||expected[2]!==`/${F}`
    ||!/(?:^|&)authorityHash=[a-z0-9%]+(?:&|$)/i.test(expected[3])
    ||!/(?:^|&)receiptId=[a-z0-9%]+(?:&|$)/i.test(expected[3]))bad('INVALID_PROBE_URL');
  if(!Array.isArray(logs)||!logs.some(log=>{
    const u=parseUri(log.httpRequest?.requestUrl);
    const instance=log.labels?.instanceId,ts=Date.parse(log.timestamp);
    return u&&log.logName===`projects/${P}/logs/run.googleapis.com%2Frequests`
      &&log.resource?.type==='cloud_run_revision'
      &&log.resource.labels?.project_id===P&&log.resource.labels?.location===R
      &&log.resource.labels?.service_name===servicePath.split('/').pop()
      &&log.resource.labels?.revision_name===revisionId
      &&log.trace===`projects/${P}/traces/${trace}`
      &&typeof instance==='string'&&/^[A-Za-z0-9_-]{8,256}$/.test(instance)
      &&log.httpRequest?.requestMethod==='GET'&&log.httpRequest?.status===200
      &&u[2].endsWith('/'+F)&&u[3]===expected[3]
      &&Number.isFinite(ts)&&ts>=Date.parse(x.probeStartedAt)-30000&&ts<=Date.parse(x.probeEndedAt)+30000
  }))bad('SERVING_REQUEST_UNBOUND');
  return {verified:true,sourceSha:S.toLowerCase(),functionName:F,serviceName:servicePath.split('/').pop(),
    revisionName:revisionId,imageDigest:digest,buildId:buildPath.split('/').pop(),
    authoritativeRequestLog:true,servingInstanceBound:true};
}
module.exports={verifyControlPlaneEvidence}
