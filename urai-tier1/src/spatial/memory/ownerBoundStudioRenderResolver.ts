/** Pure read-only review contract. Server callers must independently fetch
 * authenticated owner, tenant, protected binding, current Jobs state, consent
 * and deletion evidence. NEVER pass client-supplied binding/job objects.
 * Candidate is not a playable URL, consent grant, or media authorization. */
type Resolution = {status:'unavailable'; reason:string} | {status:'candidate'; tenantId:string; jobId:string}
const ID=/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/
const JOB=/^[A-Za-z0-9_-]{10,64}$/
const obj=(v:unknown):v is Record<string,unknown>=>v!==null&&typeof v==='object'&&!Array.isArray(v)
const valid=(v:unknown,re=ID):v is string=>typeof v==='string'&&re.test(v)
const deny=(reason:string):Resolution=>({status:'unavailable',reason})
export function resolveOwnerBoundStudioRender(input:{
  authenticatedOwnerUid:unknown; activeStudioTenantId:unknown
  selectedMemory:unknown; protectedBinding:unknown; currentJobsReadback:unknown
  ownerDeletionFenced:unknown; consentCurrentlyAuthorized:unknown
}):Resolution {
  if (!valid(input.authenticatedOwnerUid)||!valid(input.activeStudioTenantId))return deny('current_identity_required')
  if(input.ownerDeletionFenced!==false||input.consentCurrentlyAuthorized!==true)return deny('current_authority_unavailable')
  const m=input.selectedMemory,b=input.protectedBinding,j=input.currentJobsReadback
  if(!obj(m)||!obj(b)||!obj(j))return deny('verified_provenance_missing')
  if(!valid(m.id)||!valid(m.ownerId)||!obj(m.replayManifest)||!valid(m.replayManifest.id)||m.deleted!==false||m.demo!==false)return deny('memory_not_eligible')
  if(m.ownerId!==input.authenticatedOwnerUid)return deny('memory_owner_mismatch')
  if(b.authority!=='protected-server-record'||b.revoked!==false||!valid(b.ownerUid)||!valid(b.tenantId)
    ||!valid(b.memoryId)||!valid(b.replayManifestId)||!valid(b.jobId,JOB)||b.jobType!=='studio.render.video')return deny('protected_binding_invalid')
  if(b.ownerUid!==input.authenticatedOwnerUid||b.tenantId!==input.activeStudioTenantId
    ||b.memoryId!==m.id||b.replayManifestId!==m.replayManifest.id)return deny('provenance_boundary_mismatch')
  if(j.jobId!==b.jobId||j.ownerUid!==input.authenticatedOwnerUid||j.tenantId!==input.activeStudioTenantId
    ||j.jobType!=='studio.render.video'||j.status!=='SUCCESS'||j.outputDeletedAt!=null)return deny('render_job_not_current')
  return {status:'candidate',tenantId:b.tenantId as string,jobId:b.jobId as string}
}
