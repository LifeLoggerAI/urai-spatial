'use strict'
const {test} = require('node:test')
const assert = require('node:assert/strict')
const {uploaderAuditQuery,readBoundedUploaderAudit,verifyUploaderAudit,
 verifyUploaderAuditAfterIngestion} = require('./memory-media-staging-uploader-audit.cjs')
const x={project:'urai-fixture-staging',bucket:'gcf-v2-sources-fixture',
 object:'uploads/fictional-source.zip',generation:'123456789',
 createdAt:'2026-10-16T18:00:00Z',
 approvedServiceAccount:'staging-uploader@urai-fixture-staging.iam.gserviceaccount.com'}
function event(){return {insertId:'fixed-creation-1',
 logName:`projects/${x.project}/logs/cloudaudit.googleapis.com%2Fdata_access`,
 timestamp:x.createdAt,resource:{type:'gcs_bucket',labels:{project_id:x.project,bucket_name:x.bucket}},
 protoPayload:{'@type':'type.googleapis.com/google.cloud.audit.AuditLog',serviceName:'storage.googleapis.com',methodName:'storage.objects.create',
  resourceName:`projects/_/buckets/${x.bucket}/objects/${x.object}`,
  response:{generation:x.generation},status:{},
  authenticationInfo:{principalEmail:x.approvedServiceAccount},
  authorizationInfo:[{permission:'storage.objects.create',granted:true}]}}
}
const fail=(change,code)=>{const a=event(),b={...x};change(a,b);
 assert.throws(()=>verifyUploaderAudit([a],b),new RegExp('STAGING_UPLOAD_AUDIT_UNVERIFIED:'+code))}
test('only source-bound fictional positive contract reaches audit classification (never release)',()=>{
 const r=verifyUploaderAudit([event()],x)
 assert.equal(r.audited,true);assert.equal(r.sourceGeneration,x.generation)
 assert.equal(r.verified,undefined);assert.equal(r.releaseCertified,undefined)
})
test('scope filters cannot be widened by malformed project, bucket, object or account',()=>{
 for(const field of ['project','bucket','object','approvedServiceAccount']){
  const v={...x,[field]:'" OR true'}
  assert.throws(()=>uploaderAuditQuery(v),/SOURCE_SCOPE_INVALID/)
 }
})
test('query is bounded and scoped to project, bucket, method and time',()=>{
 const q=uploaderAuditQuery(x)
 assert.equal(q.pageSize,50);assert.equal(q.orderBy,'timestamp desc')
 assert.deepEqual(q.resourceNames,[`projects/${x.project}`])
 for(const s of ['data_access','storage.objects.create',x.bucket,x.project,'timestamp>=','timestamp<='])
  assert.ok(q.filter.includes(s),s)
})
test('a generic object creation log without response generation cannot authorize',()=>
 fail(a=>{delete a.protoPayload.response},'OBJECT_GENERATION_NOT_ATTESTED'))
test('unsafe numeric generation cannot masquerade as immutable source generation',()=>
 fail(a=>{a.protoPayload.response.generation=123456789},'OBJECT_GENERATION_NOT_ATTESTED'))
test('wrong immutable object generation cannot authorize',()=>
 fail(a=>{a.protoPayload.response.generation='123456790'},'OBJECT_GENERATION_NOT_ATTESTED'))
test('wrong authenticated uploader principal cannot authorize',()=>
 fail(a=>{a.protoPayload.authenticationInfo.principalEmail='intruder@example.com'},'UPLOADER_PRINCIPAL_NOT_APPROVED'))
test('missing authenticated principal cannot authorize',()=>
 fail(a=>{delete a.protoPayload.authenticationInfo},'UPLOADER_PRINCIPAL_NOT_APPROVED'))
test('wrong object identity cannot authorize',()=>
 fail(a=>{a.protoPayload.resourceName+='-changed'},'CREATE_AUDIT_NOT_FOUND'))
test('wrong project in native resource cannot authorize',()=>
 fail(a=>{a.resource.labels.project_id='other-staging'},'CREATE_AUDIT_NOT_FOUND'))
test('wrong bucket cannot authorize',()=>
 fail(a=>{a.resource.labels.bucket_name='other-bucket'},'CREATE_AUDIT_NOT_FOUND'))
test('wrong method cannot authorize',()=>
 fail(a=>{a.protoPayload.methodName='storage.objects.get'},'CREATE_AUDIT_NOT_FOUND'))
test('non-Google-Audit payload cannot authorize',()=>
 fail(a=>{delete a.protoPayload['@type']},'CREATE_AUDIT_NOT_FOUND'))
test('wrong Google service cannot authorize',()=>
 fail(a=>{a.protoPayload.serviceName='another.googleapis.com'},'CREATE_AUDIT_NOT_FOUND'))
test('wrong log type cannot authorize',()=>
 fail(a=>{a.logName=a.logName.replace('data_access','activity')},'CREATE_AUDIT_NOT_FOUND'))
test('failed create cannot authorize',()=>
 fail(a=>{a.protoPayload.status={code:7}},'CREATE_NOT_SUCCESSFUL'))
test('read access cannot stand in for granted create permission',()=>
 fail(a=>{a.protoPayload.authorizationInfo=[{permission:'storage.objects.get',granted:true}]},'CREATE_PERMISSION_NOT_ATTESTED'))
test('explicit denied create permission does not authorize',()=>
 fail(a=>{a.protoPayload.authorizationInfo=[{permission:'storage.objects.create',granted:false}]},'CREATE_PERMISSION_NOT_ATTESTED'))
test('audit event timestamp must be bound to GCS object creation time',()=>
 fail(a=>{a.timestamp='2026-10-17T18:00:00Z'},'AUDIT_TIME_NOT_BOUND'))
test('different generation logs do not shadow single exact object generation',()=>{
 const bad=event();bad.protoPayload.response.generation='999'
 assert.equal(verifyUploaderAudit([bad,event()],x).audited,true)
})
test('conflicting duplicate exact generation entries fail closed',()=>{
 assert.throws(()=>verifyUploaderAudit([event(),event()],x),/CREATE_AUDIT_AMBIGUOUS/)
})
test('pagination exhausts source-bound pages before attestation',async()=>{
 const bodies=[]
 const entries=await readBoundedUploaderAudit(async body=>{
  bodies.push(body)
  return bodies.length===1?{entries:[],nextPageToken:'next'}:{entries:[event()]}
 },x)
 assert.equal(bodies.length,2);assert.equal(bodies[1].pageToken,'next')
 assert.equal(verifyUploaderAudit(entries,x).audited,true)
})
test('unbounded provider pagination fails closed',async()=>{
 let i=0
 await assert.rejects(readBoundedUploaderAudit(async()=>({entries:[],nextPageToken:'p'+(++i)}),x),/AUDIT_PAGINATION_INCOMPLETE/)
})
test('repeated pagination token fails closed',async()=>{
 await assert.rejects(readBoundedUploaderAudit(async()=>({entries:[],nextPageToken:'same'}),x),/AUDIT_PAGE_TOKEN_INVALID/)
})
test('malformed provider pages fail closed',async()=>{
 await assert.rejects(readBoundedUploaderAudit(async()=>({entries:{fake:true}}),x),/AUDIT_PAGE_INVALID/)
})
test('object name URL escaping never changes source ownership',()=>{
 const e=event();e.protoPayload.resourceName=`projects/_/buckets/${x.bucket}/objects/${encodeURIComponent(x.object)}`
 assert.equal(verifyUploaderAudit([e],x).audited,true)
})
test('self-declared editable object metadata cannot replace audit generation',()=>{
 const e=event();delete e.protoPayload.response
 e.protoPayload.metadata={generation:x.generation, uploader:x.approvedServiceAccount}
 assert.throws(()=>verifyUploaderAudit([e],x),/OBJECT_GENERATION_NOT_ATTESTED/)
})

test('nonstring pagination token cannot truncate audit read',async()=>{
 await assert.rejects(readBoundedUploaderAudit(async()=>({entries:[],nextPageToken:false}),x),/AUDIT_PAGE_TOKEN_INVALID/)
})

test('delayed authenticated creation becomes visible only on a later full query',async()=>{
 let reads=0;const pauses=[]
 const proof=await verifyUploaderAuditAfterIngestion(async ()=>{
  reads++;return {entries:reads===3?[event()]:[]}
 },x,async ms=>{pauses.push(ms)})
 assert.equal(proof.audited,true);assert.equal(proof.sourceGeneration,x.generation)
 assert.equal(reads,3);assert.deepEqual(pauses,[1500,3000])
})
test('delayed exact generation may follow a different generation without trusting it',async()=>{
 let reads=0
 const proof=await verifyUploaderAuditAfterIngestion(async ()=>{
  reads++;const e=event()
  if(reads===1)e.protoPayload.response.generation='999'
  return {entries:[e]}
 },x,async()=>{})
 assert.equal(reads,2);assert.equal(proof.sourceGeneration,x.generation)
})
test('wrong uploader identity is a terminal denial, never retried into a pass',async()=>{
 let reads=0
 await assert.rejects(verifyUploaderAuditAfterIngestion(async ()=>{
  reads++;const e=event();e.protoPayload.authenticationInfo.principalEmail='unapproved@example.com'
  return {entries:[e]}
 },x,async()=>{throw Error('UNAUTHORIZED_RETRY')}),/UPLOADER_PRINCIPAL_NOT_APPROVED/)
 assert.equal(reads,1)
})
test('missing genuine audit after four complete reads remains denied',async()=>{
 let reads=0;const pauses=[]
 await assert.rejects(verifyUploaderAuditAfterIngestion(async ()=>{
  reads++;return {entries:[]}
 },x,async ms=>{pauses.push(ms)}),/CREATE_AUDIT_NOT_FOUND/)
 assert.equal(reads,4);assert.deepEqual(pauses,[1500,3000,6000])
})
test('pagination truncation is never reinterpreted as log ingestion delay',async()=>{
 let reads=0
 await assert.rejects(verifyUploaderAuditAfterIngestion(async()=>{
  reads++;return {entries:[],nextPageToken:'page'+reads}
 },x,async()=>{throw Error('UNAUTHORIZED_RETRY')}),/AUDIT_PAGINATION_INCOMPLETE/)
 assert.equal(reads,4)
})
test('provider error is terminal, without retry',async()=>{
 let reads=0
 await assert.rejects(verifyUploaderAuditAfterIngestion(async()=>{
  reads++;throw Error('STAGING_UPLOAD_ORIGIN_UNVERIFIED:AUDIT_LOGS_HTTP_403')
 },x,async()=>{throw Error('UNAUTHORIZED_RETRY')}),/AUDIT_LOGS_HTTP_403/)
 assert.equal(reads,1)
})
test('malformed provider page is terminal, without retry',async()=>{
 let reads=0
 await assert.rejects(verifyUploaderAuditAfterIngestion(async()=>{
  reads++;return {entries:{unauthenticated:true}}
 },x,async()=>{throw Error('UNAUTHORIZED_RETRY')}),/AUDIT_PAGE_INVALID/)
 assert.equal(reads,1)
})
test('delayed read still completely exhausts its per-attempt pagination',async()=>{
 let calls=0, attempts=0
 const proof=await verifyUploaderAuditAfterIngestion(async body=>{
  calls++
  if(!body.pageToken){attempts++;return {entries:[],nextPageToken:'page'} }
  return attempts===1?{entries:[]}:{entries:[event()]}
 },x,async()=>{})
 assert.equal(attempts,2);assert.equal(calls,4);assert.equal(proof.audited,true)
})
