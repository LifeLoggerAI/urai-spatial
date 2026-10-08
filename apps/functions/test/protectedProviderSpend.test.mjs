import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync, mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { execFileSync, spawnSync } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { isIP } from 'node:net'
import { performance } from 'node:perf_hooks'
import test from 'node:test'
import vm from 'node:vm'
import ts from 'typescript'

const SOURCE = 'd'.repeat(40), GATEWAY = 'a'.repeat(40), UID = 'synthetic-owner'
const gatewayUrl = 'https://spend.example.invalid/api/worker/production-spend'
const token = 'SYNTHETIC-WORKER-TOKEN-'.repeat(3), apiKey = 'SYNTHETIC-PROVIDER-CREDENTIAL'
const paths = [...['providerFunctions.ts', 'adamPresenceFunctions.ts', 'personPresenceProvider.ts', 'personPresenceVoiceProvider.ts', 'councilProviderFunctions.ts', 'protectedProviderSpend.ts', 'mapsElevation.ts', 'mapsElevationResult.ts'].map(name => `apps/functions/src/${name}`), 'urai-tier1/src/app/api/maps/elevation/route.ts']
const digest = value => createHash('sha256').update(value).digest('hex')
const syntheticJobDigest = job => digest(stable(Object.fromEntries(Object.entries(job).filter(([key]) => key !== 'approval' && key !== 'attempts'))).replace(/[\u007f-\uffff]/g, value => `\\u${value.charCodeAt(0).toString(16).padStart(4,'0')}`))
function stable(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value)
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`
  return `{${Object.keys(value).filter(k => value[k] !== undefined).sort().map(k => `${JSON.stringify(k)}:${stable(value[k])}`).join(',')}}`
}
function sourceModule(path, require, globals = {}) {
  const source = readFileSync(new URL(path, import.meta.url), 'utf8')
  const { outputText, diagnostics } = ts.transpileModule(source, { reportDiagnostics:true, compilerOptions:{ module:ts.ModuleKind.CommonJS, target:ts.ScriptTarget.ES2022 } })
  assert.equal(diagnostics.length, 0)
  const module = { exports:{} }
  vm.runInNewContext(outputText, { exports:module.exports, module, require, Buffer, Headers, URL, Response, ReadableStream, AbortController, AbortSignal, TextEncoder, TextDecoder, setTimeout, clearTimeout, setInterval, clearInterval, Date, console, ...globals }, { filename:path })
  return module.exports
}
function fixture(change = {}) {
  const controls = { missingBinding:false, missingToken:false, reserveLost:false, reserveDenied:false, proofRejected:false, recordLost:false, streamError:false, tokenReads:0, ...change }
  let clockOffset = 0, monotonicOffset = 0
  const now = () => Date.now() + clockOffset
  const advanceTime = value => { clockOffset += value; monotonicOffset += value }
  const advanceMonotonic = value => { monotonicOffset += value }
  class FixtureDate extends Date { static now() { return now() } }
  const clockContext = () => ({ env, setHead:value => { activeHead = value }, advanceTime, now })
  const env = { URAI_SOURCE_SHA:SOURCE, SPATIAL_PRODUCTION_SPEND_URL:gatewayUrl, SPATIAL_SPEND_GATEWAY_SOURCE_SHA:GATEWAY }
  const calls = [], providerCalls = [], rows = new Map(), bindings = new Map()
  let activeHead = SOURCE, metadata, metadataPath, expectedFields, currentProvider = async () => new Response('SYNTHETIC OUTPUT', { headers:{ 'x-request-id':'synthetic-task' } })
  const db = { doc:path => ({ path, get:async () => ({ exists:!controls.missingBinding && bindings.has(path), data:() => structuredClone(bindings.get(path)) }) }) }
  const fakeFetch = async (url, init) => {
    if (String(url) === gatewayUrl) {
      const body = JSON.parse(init.body); calls.push(body)
      assert.equal(init.headers.authorization, `Bearer ${token}`); assert.equal(init.redirect, 'error')
      const row = rows.get(body.job_id); assert.ok(row)
      if (body.action === 'preflight') {
        const fingerprints = Object.fromEntries(['credential_sha256','semantic_headers_sha256','source_input_sha256','semantic_input_sha256','content_type'].map(key => [key,body[key]]))
        const timing = { observed_at:new Date(now()-60000).toISOString(), expires_at:new Date(now()+300000).toISOString() }
        const reply = { ok:true, provider_call_authorized:false, execution_performed:false, envelope:{ job:structuredClone(row.job), account:{ ...timing,provider:body.provider,account_id:body.account_id,credential_sha256:body.credential_sha256,credential_binding_verified:true,credential_binding_receipt:'SYNTHETIC-ACCOUNT-MAP',trusted_readback:true,max_concurrency:2,frozen:false }, protected_controls:{ ...timing,...fingerprints,provider:body.provider,account_id:body.account_id,trusted_readback:true,endpoint:body.endpoint,request_sha256:body.request_sha256,enforcement_source_sha:GATEWAY,hard_stop_supported:true,cost_cap_enforced:true,auto_top_up:false,max_usd_micros:2500000,max_credits:20,max_runtime_seconds:2,max_concurrency:2,proof_receipt:'SYNTHETIC-CONTROLS' }, protected_pricing:{ ...timing,...fingerprints,provider:body.provider,account_id:body.account_id,model_version:body.model,request_sha256:body.request_sha256,trusted_readback:true,receipt:'SYNTHETIC-PRICE',rates:structuredClone(row.job.budget.rates) } } }
        reply.envelope.authority = { ...timing, trusted_readback:true, binding:structuredClone(row.job.authority) }
        reply.admission_expires_at = new Date(Math.min(row.deploymentExpiresAt, ...[reply.envelope.job.approval, reply.envelope.authority, reply.envelope.account, reply.envelope.protected_controls, reply.envelope.protected_pricing, reply.envelope.job.budget.rates].map(value => Date.parse(value.expires_at)))).toISOString()
        if (controls.proofRejected) return new Response('{}', { status:409 })
        await controls.preflight?.(reply, body, clockContext())
        row.preflightReply = structuredClone(reply)
        return controls.gatewayResponse ? controls.gatewayResponse(reply, 'preflight', clockContext()) : Response.json(reply)
      }
      if (body.action === 'reserve') {
        if (row.attempt || controls.reserveDenied) return new Response('{}', { status:409 })
        row.attempt = { id:'synthetic-attempt', status:'RESERVED', charges_reconciled:false }
        row.hold = 2500000
        const reservedAt = now()
        const reply = { ok:true, provider_call_authorized:true, execution_performed:false, executor_source_sha:SOURCE, gateway_source_sha:GATEWAY, worker_id:body.worker_id, job_digest:body.job_digest, attempt_id:row.attempt.id, max_runtime_seconds:2, reserved_at:new Date(reservedAt).toISOString(), admission_expires_at:new Date(Math.min(Date.parse(row.preflightReply.admission_expires_at), reservedAt + 2000)).toISOString(), ...Object.fromEntries(['account_id','credential_sha256','semantic_headers_sha256','source_input_sha256','semantic_input_sha256','content_type'].map(key => [key,body[key]])) }
        row.attempt.reserved_at = reply.reserved_at; row.attempt.admission_expires_at = reply.admission_expires_at
        await controls.reserve?.(body, clockContext())
        await controls.reserveReply?.(reply, body, clockContext())
        if (controls.reserveLost) throw new Error('SYNTHETIC LOST COMMITTED RESERVE RESPONSE')
        return controls.gatewayResponse ? controls.gatewayResponse(reply, 'reserve', clockContext()) : Response.json(reply)
      }
      assert.equal(body.action, 'record', 'caller must never reconcile charges')
      assert.ok(row.attempt); assert.equal(body.attempt_id, row.attempt.id)
      await controls.record?.(body, clockContext())
      if (controls.recordLost) throw new Error('SYNTHETIC RECORD OUTCOME UNKNOWN')
      row.attempt.status = 'RECONCILIATION_REQUIRED'; row.attempt.reported_outcome = body.status
      const reply = { ok:true, provider_call_authorized:false, execution_performed:false, reconciliation_required:true }
      return controls.gatewayResponse ? controls.gatewayResponse(reply, 'record', clockContext()) : Response.json(reply)
    }
    providerCalls.push({ url:String(url), init })
    assert.equal(init.method, expectedFields.method); assert.equal(init.redirect, 'error')
    const headers = new Headers(init.headers)
    if (expectedFields.method === 'GET') {
      assert.equal(init.body, undefined); assert.equal(init.cache, 'no-store'); assert.equal(init.referrerPolicy, 'no-referrer')
      assert.equal(String(url), expectedFields.nativeUrl)
      assert.equal(digest(stable({ key:new URL(url).searchParams.get('key') })), expectedFields.fields.credential_sha256)
      assert.equal(headers.get('authorization'), null)
    } else {
      assert.deepEqual(Buffer.from(init.body), Buffer.from(expectedFields.body))
      assert.equal(digest(stable(Object.fromEntries([...headers].filter(([k]) => ['authorization','xi-api-key','x-api-key','x-goog-api-key'].includes(k))))), expectedFields.fields.credential_sha256)
    }
    if (controls.streamError) return new Response(new ReadableStream({ start(stream) { stream.error(new Error('SYNTHETIC STREAM OUTCOME UNKNOWN')) } }))
    return currentProvider(url, init)
  }
  const params = { defineSecret:name => ({ value:() => { if (name !== 'SPATIAL_SPEND_WORKER_TOKENS_JSON') return apiKey; controls.tokenReads++; return JSON.stringify(controls.missingToken ? {} : { 'synthetic-worker':{ token, gateway_origin:controls.secretOrigin ?? new URL(gatewayUrl).origin } }) } }) }
  const helper = sourceModule('../src/protectedProviderSpend.ts', id => {
    if (id === 'node:perf_hooks') return { performance:{ now:() => performance.now()+monotonicOffset } }
    if (id === 'node:crypto') return { createHash }
    if (id === 'node:net') return { isIP }
    if (id === 'node:child_process') return { execFileSync:(_cmd, args) => {
      controls.sourceCheck?.(args, clockContext())
      if (args.includes('--show-toplevel')) return '/synthetic-tracked-checkout\n'
      if (args.includes('HEAD')) return activeHead + '\n'
      if (args.includes('ls-files')) return paths.join('\n') + '\n'
      if (args.includes('status')) return ''
      throw new Error('Unexpected source command')
    } }
    if (id === 'firebase-functions/params') return params
    throw new Error(`Unexpected helper dependency ${id}`)
  }, { process:{ env, cwd:() => '/synthetic-tracked-checkout' }, fetch:fakeFetch, Date:FixtureDate })
  function prepare(args, elevationKey) {
    const [_db, uid, lane, provider, model, input, target, init] = args
    const url = String(target), body = String(init.body), headers = new Headers(init.headers)
    const method = elevationKey ? 'GET' : 'POST'
    const credentials = elevationKey ? { key:elevationKey } : Object.fromEntries([...headers].filter(([k]) => ['authorization','xi-api-key','x-api-key','x-goog-api-key'].includes(k)))
    const requestSha = digest(Buffer.concat([Buffer.from(`${method}\n${url}\n`), Buffer.from(elevationKey ? '' : body)])), inputSha = digest(stable({ uid, lane, input })), tenantSha = digest(uid)
    const jobId = `SYNTHETIC-NOT-AUTHORIZATION-${lane}-${requestSha}`
    const fields = { job_id:jobId, worker_id:'synthetic-worker', executor_repository:'LifeLoggerAI/urai-spatial', executor_source_sha:SOURCE, gateway_repository:'LifeLoggerAI/asset-factory', gateway_source_sha:GATEWAY, consumer:'spatial-functions', tenant_sha256:tenantSha, provider, account_id:'SYNTHETIC-API-ACCOUNT', credential_sha256:digest(stable(credentials)), source_input_sha256:inputSha, semantic_input_sha256:digest(stable(JSON.parse(body))), semantic_headers_sha256:digest(stable(Object.fromEntries([...headers].filter(([k]) => !Object.hasOwn(credentials,k))))), content_type:headers.get('content-type'), request_sha256:requestSha, endpoint:url, model, asset:`spatial/${tenantSha}/${lane}`, request_size:elevationKey ? '0' : String(Buffer.byteLength(body)) }
    metadata = { ...fields, lane, gateway_url:gatewayUrl }; controls.binding?.(metadata, clockContext()); metadataPath = `spatialPaidProviderBindings/${digest(stable({ tenant_sha256:tenantSha, lane, request_sha256:requestSha, source_input_sha256:inputSha }))}`
    bindings.set(metadataPath, metadata)
    if (!rows.has(jobId)) {
      const executor = { ...fields, repository:fields.executor_repository, source_sha:SOURCE, binding_version:2, deployment_ref:'e'.repeat(64), controls_ref:'f'.repeat(64) }
      for (const k of ['job_id','executor_repository','executor_source_sha','provider','account_id','model','consumer']) delete executor[k]
      const rates = { usd_micros_per_unit:1000000,credits_per_unit:10,receipt:'SYNTHETIC-PRICING',verified_at:new Date(now()-60000).toISOString(),expires_at:new Date(now()+300000).toISOString() }
      const job = { job_id:jobId, provider, account_id:fields.account_id, model_version:model, consumer:fields.consumer, rights_reviewed:true, authority:{ repository:fields.executor_repository, sha:SOURCE }, input_sha256:[inputSha,requestSha], executor, budget:{ max_usd_micros:2500000,max_credits:20,max_runtime_seconds:2,max_concurrency:2,rates }, attempts:[] }
      // Entirely synthetic gateway response fields; no signing or real approval.
      job.approval = { status:'APPROVED',kind:'EXPLICIT_BOUNDED_SPEND',job_digest:syntheticJobDigest(job),max_usd_micros:2500000,max_credits:20,max_concurrency:2,receipt:'SYNTHETIC-NOT-AUTHORIZATION',approver:'synthetic-approver',key_id:'synthetic-test-only',signature:'U1lOVEhFVElDLU5PVC1BUFRIT1JJWkFUSU9O',issued_at:new Date(now()-60000).toISOString(),expires_at:new Date(now()+300000).toISOString() }
      rows.set(jobId, { job, hold:0, deploymentExpiresAt:now()+300000 })
    }
    const nativeUrl = new URL(url); if (elevationKey) nativeUrl.searchParams.set('key', elevationKey)
    expectedFields = { fields, body, method, nativeUrl:nativeUrl.toString() }; return fields
  }
  const paidFetch = async (...args) => { prepare(args); return helper.paidSpatialFetch(...args) }
  const elevationArgs = () => [db, UID, { latitude:37.422, longitude:-122.084 }, apiKey]
  const prepareElevation = args => {
    const [_db, uid, input, key] = args, url = new URL('https://maps.googleapis.com/maps/api/elevation/json')
    url.searchParams.set('locations', `${input.latitude},${input.longitude}`)
    return prepare([_db, uid, 'maps-elevation', 'google-maps-elevation', 'elevation-json', input, url.toString(), { method:'GET', headers:{ accept:'application/json', 'content-type':'application/x-www-form-urlencoded' }, body:JSON.stringify({ locations:`${input.latitude},${input.longitude}` }) }], key)
  }
  const paidElevation = async (...args) => { prepareElevation(args); return helper.paidSpatialElevationFetch(...args) }
  const directArgs = () => [db, UID, 'orb-reasoning', 'openai', 'synthetic-model', { message:'Synthetic question' }, 'https://api.openai.com/v1/responses', { method:'POST', headers:{ Authorization:`Bearer ${apiKey}`, 'Content-Type':'application/json', 'Idempotency-Key':'synthetic-stable-request' }, body:JSON.stringify({ model:'synthetic-model', input:'Synthetic question' }) }]
  return { controls, env, calls, providerCalls, rows, bindings, db, helper, paidFetch, directArgs, params, sourceModule, fakeFetch, prepare, elevationArgs, prepareElevation, paidElevation, advanceTime, advanceMonotonic, now, setProvider:fn => { currentProvider = fn }, expected:() => expectedFields }
}
test('actual unmocked clean Git provenance rejects every dirty untracked or misdeclared provider source', () => {
  const root=mkdtempSync(join(tmpdir(),'spatial-spend-source-')), env={}
  const git=(...args) => { const r=spawnSync('git',['-C',root,...args],{encoding:'utf8'}); assert.equal(r.status,0,r.stderr); return r.stdout.trim() }
  try {
    const helper=sourceModule('../src/protectedProviderSpend.ts', id => {
      if(id==='node:perf_hooks')return{performance}
      if(id==='node:crypto')return{createHash};if(id==='node:child_process')return{execFileSync};if(id==='node:net')return{isIP};if(id==='firebase-functions/params')return{defineSecret:()=>({value:()=>''})}
      throw new Error(`Unexpected provenance dependency ${id}`)
    },{process:{env,cwd:()=>root}})
    env.URAI_SOURCE_SHA=SOURCE;assert.throws(()=>helper.spatialSpendSourceSha())
    git('init','--quiet');git('config','user.name','Synthetic source fixture');git('config','user.email','fixture@example.invalid')
    for(const path of paths){mkdirSync(dirname(join(root,path)),{recursive:true});writeFileSync(join(root,path),readFileSync(new URL(`../../../${path}`,import.meta.url)))}
    git('add','.');git('commit','--quiet','-m','Synthetic actual source provenance');env.URAI_SOURCE_SHA=git('rev-parse','HEAD')
    assert.equal(helper.spatialSpendSourceSha(),env.URAI_SOURCE_SHA)
    const head=env.URAI_SOURCE_SHA;env.URAI_SOURCE_SHA=SOURCE;assert.throws(()=>helper.spatialSpendSourceSha());env.URAI_SOURCE_SHA=head
    for(const path of paths){writeFileSync(join(root,path),'SYNTHETIC DIRTY SOURCE\n');assert.throws(()=>helper.spatialSpendSourceSha());git('restore','--',path)}
    git('rm','--cached','apps/functions/src/protectedProviderSpend.ts');assert.throws(()=>helper.spatialSpendSourceSha())
  }finally{rmSync(root,{recursive:true,force:true})}
})
test('actual normalized payload identity survives JSON formatting and key order while wire identity stays exact', async () => {
  const payloads = [
    JSON.stringify({ model:'synthetic-model', input:'Fictional العربية context', parameters:{ z:[1,true,null], a:'bounded' } }),
    ' { "parameters": { "a": "bounded", "z": [1, true, null] }, "input": "Fictional العربية context", "model": "synthetic-model" } ',
  ]
  const sent=[]
  for(const body of payloads){
    const f=fixture(),args=f.directArgs();args[7].body=body
    const result=await f.paidFetch(...args);await result.text()
    const actual=f.calls[0]
    assert.equal(actual.semantic_input_sha256,digest(stable(JSON.parse(body))))
    assert.equal(f.providerCalls.length,1)
    sent.push(actual)
  }
  assert.equal(sent[0].semantic_input_sha256,sent[1].semantic_input_sha256)
  assert.notEqual(sent[0].request_sha256,sent[1].request_sha256)
  assert.equal(sent[0].provider,sent[1].provider)
  assert.equal(sent[0].account_id,sent[1].account_id)
  assert.equal(sent[0].model,sent[1].model)
})
for(const scope of ['executor','controls','pricing','reservation']){
  for(const change of ['missing','drifted']){
    test(`actual normalized payload ${scope} ${change} cannot authorize provider dispatch`, async()=>{
      const mutate=reply=>{
        const target=scope==='executor'?reply.envelope.job.executor:scope==='controls'?reply.envelope.protected_controls:scope==='pricing'?reply.envelope.protected_pricing:reply
        if(change==='missing')delete target.semantic_input_sha256
        else target.semantic_input_sha256='f'.repeat(64)
      }
      const f=fixture(scope==='reservation'?{reserveReply:mutate}:{preflight:mutate})
      await assert.rejects(f.paidFetch(...f.directArgs()))
      assert.equal(f.providerCalls.length,0)
      if(scope==='reservation'){
        assert.equal(f.calls.filter(call=>call.action==='reserve').length,1)
        assert.equal([...f.rows.values()][0].hold,2500000)
      }else assert.equal(f.calls.some(call=>call.action==='reserve'),false)
    })
  }
}
test('actual helper reserves before its only POST and completed output retains uncertain charges', async () => {
  const f = fixture(), response = await f.paidFetch(...f.directArgs())
  assert.equal(f.providerCalls.length,1); assert.equal([...f.rows.values()][0].hold,2500000)
  assert.equal(await response.text(),'SYNTHETIC OUTPUT')
  assert.deepEqual(f.calls.map(x => x.action),['preflight','reserve','record'])
  const row = [...f.rows.values()][0]; assert.equal(row.attempt.status,'RECONCILIATION_REQUIRED'); assert.equal(row.attempt.charges_reconciled,false); assert.equal(row.hold,2500000)
})
test('native Elevation GET binds exact coordinates and separately hashes its query credential', async () => {
  const f=fixture(), response=await f.paidElevation(...f.elevationArgs())
  assert.equal(await response.text(),'SYNTHETIC OUTPUT')
  const fields=f.calls[0], native=new URL(f.providerCalls[0].url)
  assert.equal(native.origin,'https://maps.googleapis.com');assert.equal(native.pathname,'/maps/api/elevation/json')
  assert.deepEqual([...native.searchParams.keys()],['locations','key'])
  assert.equal(fields.endpoint,`https://maps.googleapis.com/maps/api/elevation/json?locations=37.422%2C-122.084`)
  assert.equal(fields.request_sha256,digest(`GET\n${fields.endpoint}\n`));assert.equal(fields.request_size,'0')
  assert.equal(fields.semantic_input_sha256,digest(stable({locations:'37.422,-122.084'})))
  assert.equal(fields.credential_sha256,digest(stable({key:apiKey})))
  assert.equal(JSON.stringify(f.calls).includes(apiKey),false)
  assert.deepEqual(f.calls.map(x=>x.action),['preflight','reserve','record'])
  assert.equal([...f.rows.values()][0].attempt.charges_reconciled,false)
})
test('native Elevation cannot dispatch from labels, missing binding, denial, or an uncertain reserve',async()=>{
  for(const change of [{missingBinding:true},{missingToken:true},{proofRejected:true},{reserveDenied:true},{reserveLost:true},{preflight:reply=>{reply.envelope.protected_controls.hard_stop_supported=false}}]){
    const f=fixture(change);f.env.URAI_ELEVATION_SPEND_APPROVED='true';f.env.URAI_PROVIDER_SPEND_ENABLED='true'
    await assert.rejects(f.paidElevation(...f.elevationArgs()));assert.equal(f.providerCalls.length,0)
    if(change.reserveLost){assert.equal([...f.rows.values()][0].hold,2500000);assert.equal(f.calls.filter(x=>x.action==='reserve').length,1)}
  }
})
test('Elevation credential replacement and coordinate replay cannot reuse the original protected binding',async()=>{
  for(const change of ['credential','latitude','longitude']){
    const f=fixture(),args=f.elevationArgs();f.prepareElevation(args)
    if(change==='credential')args[3]='DIFFERENT-SYNTHETIC-KEY';else args[2][change]+=1
    await assert.rejects(f.helper.paidSpatialElevationFetch(...args));assert.equal(f.calls.length,0);assert.equal(f.providerCalls.length,0)
  }
})
test('Elevation rejects invalid coordinates or a query-injecting key before binding or secret reads',async()=>{
  for(const change of [args=>{args[2].latitude=91},args=>{args[2].longitude=-181},args=>{args[2].latitude=NaN},args=>{args[3]='KEY&locations=0,0'},args=>{args[3]=' KEY '}]){
    const f=fixture(),args=f.elevationArgs();change(args)
    await assert.rejects(f.helper.paidSpatialElevationFetch(...args));assert.equal(f.calls.length,0);assert.equal(f.controls.tokenReads,0);assert.equal(f.providerCalls.length,0)
  }
})
test('Elevation admission callback runs after genuine preflight and before reservation, then authority is rechecked',async()=>{
  const missing=fixture({missingBinding:true}),args=missing.elevationArgs();let touched=0
  args[5]=async()=>{touched++};await assert.rejects(missing.paidElevation(...args));assert.equal(touched,0)
  for(const mutate of [f=>f.advanceTime(400000),(_f,input)=>{input.latitude=1},f=>{f.env.URAI_SOURCE_SHA='c'.repeat(40)}]){
    const f=fixture(),args=f.elevationArgs();args[5]=async()=>{assert.deepEqual(f.calls.map(x=>x.action),['preflight']);mutate(f,args[2])}
    await assert.rejects(f.paidElevation(...args));assert.equal(f.calls.some(x=>x.action==='reserve'),false);assert.equal(f.providerCalls.length,0)
  }
})
test('Elevation native redirects are refused and auth cancellation withholds the final output without settling the hold',async()=>{
  const f=fixture(),abort=new AbortController(),args=f.elevationArgs();args[4]=abort.signal
  const response=await f.paidElevation(...args);await response.text();f.helper.assertSpatialPaidOutputCurrent(response)
  abort.abort();assert.throws(()=>f.helper.assertSpatialPaidOutputCurrent(response))
  await Promise.resolve();assert.equal(f.providerCalls[0].init.redirect,'error');assert.equal([...f.rows.values()][0].hold,2500000)
})
test('Elevation parsed output cannot survive an expired admission after its stream completes',async()=>{
  const f=fixture(),response=await f.paidElevation(...f.elevationArgs());await response.text()
  f.advanceTime(3000);assert.throws(()=>f.helper.assertSpatialPaidOutputCurrent(response))
  assert.equal([...f.rows.values()][0].attempt.charges_reconciled,false)
})
test('Elevation output parser accepts only the bounded single requested coordinate and strips raw provider fields',async()=>{
  const f=fixture(),input=f.elevationArgs()[2]
  const parser=sourceModule('../src/mapsElevationResult.ts',id=>{assert.equal(id,'./protectedProviderSpend');return f.helper})
  f.setProvider(()=>Response.json({status:'OK',results:[{elevation:123,resolution:1,location:{lat:input.latitude,lng:input.longitude},key:'DO-NOT-PUBLISH'}],provider_secret:'DO-NOT-PUBLISH'}))
  const response=await f.paidElevation(...f.elevationArgs()),result=await parser.readNormalizedElevation(response,input)
  assert.deepEqual(JSON.parse(JSON.stringify(result)),{elevationMeters:123,resolutionMeters:1,source:'google-maps-elevation'})
  f.helper.assertSpatialPaidOutputCurrent(response)
})
for(const shape of ['oversized','invalid-json','multiple','wrong-coordinate','negative-resolution','provider-error'])test(`Elevation ${shape} output is withheld`,async()=>{
  const f=fixture(),input=f.elevationArgs()[2],payload={status:'OK',results:[{elevation:123,resolution:1,location:{lat:input.latitude,lng:input.longitude}}]}
  if(shape==='multiple')payload.results.push({...payload.results[0]})
  if(shape==='wrong-coordinate')payload.results[0].location.lat+=1
  if(shape==='negative-resolution')payload.results[0].resolution=-1
  if(shape==='provider-error')payload.status='REQUEST_DENIED'
  const parser=sourceModule('../src/mapsElevationResult.ts',id=>{assert.equal(id,'./protectedProviderSpend');return f.helper})
  f.setProvider(()=>new Response(shape==='oversized'?'x'.repeat(65537):shape==='invalid-json'?'not-json':JSON.stringify(payload)))
  const response=await f.paidElevation(...f.elevationArgs());await assert.rejects(parser.readNormalizedElevation(response,input))
  assert.equal([...f.rows.values()][0].hold,2500000);assert.equal([...f.rows.values()][0].attempt.charges_reconciled,false)
})
for(const kind of ['functions','next'])test(`actual ${kind} Maps leaf executes the shared native adapter and withholds revoked output`,async()=>{
  for(const revokeAt of [Infinity,2,3]){
    const f=fixture(),args=f.elevationArgs(),input=args[2];f.prepareElevation(args)
    f.env.URAI_FIREBASE_STATIC_EXPORT='false';f.env.URAI_ELEVATION_SERVER_CREDENTIAL=apiKey
    let authChecks=0,rateWrites=0
    const uid=()=>++authChecks<revokeAt?UID:null
    class Timestamp{toMillis(){return 0}static fromMillis(){return new Timestamp()}}
    const firestore=Object.assign(()=>f.db,{Timestamp,FieldValue:{serverTimestamp:()=>null}})
    f.db.runTransaction=async callback=>callback({get:async()=>({data:()=>({})}),set:()=>{rateWrites++}})
    const parser=sourceModule('../src/mapsElevationResult.ts',id=>{assert.equal(id,'./protectedProviderSpend');return f.helper})
    f.setProvider(()=>Response.json({status:'OK',results:[{elevation:123,resolution:1,location:{lat:input.latitude,lng:input.longitude}}]}))
    const imports={
      'firebase-admin':{apps:[{}],firestore,auth:()=>({verifyIdToken:async(_token,revoked)=>{assert.equal(revoked,true);const subject=uid();if(!subject)throw new Error('SYNTHETIC REVOKED');return{uid:subject}}})},
      'firebase-functions/params':f.params,'firebase-functions/v2/https':{onRequest:(_config,handler)=>handler},
      'firebase-admin/firestore':{getFirestore:()=>f.db,Timestamp,FieldValue:firestore.FieldValue},
      'next/server':{NextResponse:{json:(body,options)=>Response.json(body,options)}},'@/lib/server/firebase-user':{verifyFirebaseUser:async()=>uid()},
      './protectedProviderSpend':f.helper,'./mapsElevationResult':parser,
      '../../../../../../apps/functions/src/protectedProviderSpend':f.helper,'../../../../../../apps/functions/src/mapsElevationResult':parser,
    }
    const leaf=sourceModule(kind==='functions'?'../src/mapsElevation.ts':'../../../urai-tier1/src/app/api/maps/elevation/route.ts',id=>{assert.ok(imports[id],id);return imports[id]},{process:{env:f.env},fetch:()=>{throw new Error('Direct provider fetch forbidden')}})
    let status,body
    if(kind==='functions'){
      const response={writableEnded:false,setHeader(){},on(){},status(value){status=value;return this},json(value){body=value;return this}}
      await leaf.mapsElevationProvider({method:'POST',body:input,headers:{authorization:'Bearer SYNTHETIC-IDENTITY'}},response)
    }else{
      const result=await leaf.POST({json:async()=>input,signal:new AbortController().signal});status=result.status;body=await result.json()
    }
    assert.equal(status,revokeAt===Infinity?200:401)
    assert.equal(f.providerCalls.length,revokeAt===2?0:1);assert.equal(rateWrites,1)
    if(revokeAt===Infinity)assert.deepEqual(JSON.parse(JSON.stringify(body)),{elevationMeters:123,resolutionMeters:1,source:'google-maps-elevation',subject:UID})
    else assert.equal(body.error,'authentication_required')
    if(revokeAt===3){assert.equal([...f.rows.values()][0].hold,2500000);assert.equal([...f.rows.values()][0].attempt.charges_reconciled,false)}
  }
})
test('missing protected binding token source or gateway denies all provider calls', async () => {
  for (const change of [{ missingBinding:true },{ missingToken:true },{ proofRejected:true },{ reserveDenied:true },{ preflight:(_reply,_body,{env}) => { env.URAI_SOURCE_SHA = 'c'.repeat(40) } }]) {
    const f = fixture(change); await assert.rejects(f.paidFetch(...f.directArgs())); assert.equal(f.providerCalls.length,0)
  }
})
test('lost committed reserve response holds budget without provider dispatch or retry', async () => {
  const f = fixture({ reserveLost:true }); await assert.rejects(f.paidFetch(...f.directArgs())); assert.equal(f.providerCalls.length,0); assert.equal(f.calls.filter(x => x.action === 'reserve').length,1); assert.equal([...f.rows.values()][0].hold,2500000)
})
test('parallel replays dispatch at most once for the same actual paid request', async () => {
  const f = fixture(); const outcomes = await Promise.allSettled([f.paidFetch(...f.directArgs()),f.paidFetch(...f.directArgs())]); assert.equal(outcomes.filter(x => x.status === 'fulfilled').length,1); assert.equal(f.providerCalls.length,1)
  await outcomes.find(x => x.status === 'fulfilled').value.text(); assert.equal([...f.rows.values()][0].hold,2500000)
})
test('unknown stream and outcome record failures retain reservation and prohibit retries', async () => {
  for (const change of [{ streamError:true },{ recordLost:true }]) { const f = fixture(change), response = await f.paidFetch(...f.directArgs()); await assert.rejects(response.text()); assert.equal(f.providerCalls.length,1); assert.equal([...f.rows.values()][0].hold,2500000); await assert.rejects(f.paidFetch(...f.directArgs())); assert.equal(f.providerCalls.length,1) }
})
test('source/head account input header credential tenant and model envelope drift denies dispatch', async () => {
  for (const field of ['gateway_source_sha','source_sha','worker_id','credential_sha256','semantic_headers_sha256','source_input_sha256','semantic_input_sha256','tenant_sha256','content_type','request_sha256','request_size','asset']) {
    const f = fixture({ preflight:reply => { reply.envelope.job.executor[field] = 'drifted' } }); await assert.rejects(f.paidFetch(...f.directArgs())); assert.equal(f.providerCalls.length,0)
  }
  for (const field of ['provider','account_id','model_version','consumer']) { const f = fixture({ preflight:reply => { reply.envelope.job[field] = 'drifted' } }); await assert.rejects(f.paidFetch(...f.directArgs())); assert.equal(f.providerCalls.length,0) }
})
test('missing drifted stale or untrusted actual-bound pricing denies reserve and external dispatch', async () => {
  const changes = [reply => { delete reply.envelope.protected_pricing }]
  for (const field of ['provider','account_id','model_version','request_sha256','credential_sha256','semantic_headers_sha256','source_input_sha256','semantic_input_sha256','content_type','receipt','observed_at','expires_at']) changes.push(reply => { delete reply.envelope.protected_pricing[field] })
  changes.push(reply => { reply.envelope.protected_pricing.trusted_readback=false }, reply => { reply.envelope.protected_pricing.expires_at='2000-01-01T00:00:00Z' }, reply => { reply.envelope.protected_pricing.observed_at='2100-01-01T00:00:00Z' }, reply => { reply.envelope.protected_pricing.rates.usd_micros_per_unit=1 })
  for (const preflight of changes) {
    const f=fixture({ preflight }); await assert.rejects(f.paidFetch(...f.directArgs())); assert.equal(f.providerCalls.length,0); assert.equal(f.calls.some(x => x.action==='reserve'),false)
  }
})
test('fresh protected account cap and deployment controls are required locally before reserve', async () => {
  const changes = [reply => { reply.envelope.account.trusted_readback=false }, reply => { reply.envelope.account.expires_at='2000-01-01T00:00:00Z' }, reply => { reply.envelope.protected_controls.proof_receipt='' }, reply => { reply.envelope.protected_controls.enforcement_source_sha='c'.repeat(40) }, reply => { reply.envelope.protected_controls.max_runtime_seconds=86400 }, reply => { reply.envelope.protected_controls.auto_top_up=true }]
  for (const preflight of changes) { const f=fixture({ preflight }); await assert.rejects(f.paidFetch(...f.directArgs())); assert.equal(f.providerCalls.length,0); assert.equal(f.calls.some(x => x.action==='reserve'),false) }
})
test('source or input drift during reserve retains the committed hold and never dispatches', async () => {
  for (const change of ['source','input']) {
    const f=fixture(), args=f.directArgs()
    f.controls.reserve = (_body,{ setHead }) => { if(change==='source')setHead('c'.repeat(40));else args[5].message='Mutated source after admission' }
    await assert.rejects(f.paidFetch(...args)); assert.equal(f.providerCalls.length,0); assert.equal([...f.rows.values()][0].hold,2500000); assert.equal([...f.rows.values()][0].attempt.charges_reconciled,false)
  }
})
test('captured caller cancellation cannot be replaced while admission is pending', async () => {
  const f=fixture(), args=f.directArgs(), controller=new AbortController();args[7].signal=controller.signal
  f.controls.preflight=()=>{controller.abort();args[7].signal=new AbortController().signal}
  await assert.rejects(f.paidFetch(...args));assert.equal(f.providerCalls.length,0);assert.equal(f.calls.some(x=>x.action==='reserve'),false)
})
test('preflight cannot claim dispatch authorization and exact runtime source is read twice', async () => {
  for (const change of [{ preflight:reply => { reply.provider_call_authorized = true } }, { preflight:(_reply,_body,{setHead}) => { setHead('c'.repeat(40)) } }]) { const f = fixture(change); await assert.rejects(f.paidFetch(...f.directArgs())); assert.equal(f.providerCalls.length,0) }
})
test('materialized body and effective headers stay frozen through reservation', async () => {
  const f = fixture(), args = f.directArgs()
  f.controls.preflight = () => { args[7].body = '{}'; args[7].headers.Authorization = 'Bearer MUTATED'; args[7].method = 'GET' }
  const response = await f.paidFetch(...args); assert.equal(await response.text(),'SYNTHETIC OUTPUT'); assert.equal(f.providerCalls.length,1)
})
test('caller financial authorization labels cannot replace server metadata or admission', async () => {
  const f = fixture({ missingBinding:true }), args = f.directArgs(); args[5] = { ...args[5], providerAuthorization:{ approved:true, usd:0, providerCallAuthorized:true } }
  await assert.rejects(f.paidFetch(...args)); assert.equal(f.providerCalls.length,0)
})
test('unexpected origin provider identity raw credentials or mismatched body model cannot dispatch', async () => {
  for (const mutate of [args => { args[6] = 'https://untrusted.example.invalid/v1/responses' },args => { args[3] = 'elevenlabs' },args => { args[7].headers.Authorization = 'Bearer ' },args => { args[4] = 'another-model' }]) { const f = fixture(), args = f.directArgs(); mutate(args); await assert.rejects(f.paidFetch(...args)); assert.equal(f.providerCalls.length,0) }
})
test('aborted and deadline-limited streams retain full charges and never release or retry', async () => {
  const f=fixture(), controller=new AbortController(), args=f.directArgs(); args[7].signal=controller.signal
  const response=await f.paidFetch(...args); controller.abort(); await assert.rejects(response.text()); assert.equal([...f.rows.values()][0].hold,2500000); assert.equal([...f.rows.values()][0].attempt.status,'RECONCILIATION_REQUIRED')
  const g=fixture(); g.setProvider(async()=>new Response(new ReadableStream({ pull:()=>new Promise(()=>{}) })))
  const before=Date.now(), stalled=await g.paidFetch(...g.directArgs()); await assert.rejects(stalled.text()); assert.ok(Date.now()-before<3500); assert.equal([...g.rows.values()][0].hold,2500000); assert.equal(g.providerCalls.length,1)
  await assert.rejects(g.paidFetch(...g.directArgs())); assert.equal(g.providerCalls.length,1); assert.equal(g.calls.some(x=>x.action==='reconcile'),false)
})

const policyAuthority = sourceModule('../src/consentPolicyAuthority.ts', id => { throw new Error(`Unexpected policy-authority dependency ${id}`) })
const language = sourceModule('../../../packages/localization/src/contentLanguage.ts', id => { throw new Error(`Unexpected language dependency ${id}`) })
const leaves = [
  ['providerFunctions.ts','openAiOrbProvider','orb','openai'],
  ['providerFunctions.ts','elevenLabsVoiceProvider','narrator','elevenlabs'],
  ['adamPresenceFunctions.ts','adamPresenceProvider','adam','openai'],
  ['adamPresenceFunctions.ts','adamFounderVoiceProvider','founder-voice','elevenlabs'],
  ['personPresenceProvider.ts','personPresenceProvider','person','openai'],
  ['personPresenceVoiceProvider.ts','personPresenceVoiceProvider','person-voice','elevenlabs'],
  ['councilProviderFunctions.ts','anthropicCouncilProvider','council-anthropic','anthropic'],
  ['councilProviderFunctions.ts','geminiCouncilProvider','council-gemini','gemini'],
  ['councilProviderFunctions.ts','xaiCouncilProvider','council-xai','xai'],
  ['councilProviderFunctions.ts','mistralCouncilProvider','council-mistral','mistral'],
]
function leafFixture(leaf, change = {}) {
  const f = fixture(change), [file,handlerName,lane,provider] = leaf
  Object.assign(f.env, { ADAM_PRESENCE_ENABLED:'true', FOUNDER_VOICE_ENABLED:'true', FOUNDER_ELEVENLABS_VOICE_ID:'SYNTHETIC_VOICE', ELEVENLABS_DEFAULT_VOICE_ID:'SYNTHETIC_VOICE', ELEVENLABS_ALLOWED_VOICE_IDS:'SYNTHETIC_VOICE', PERSON_PRESENCE_ENABLED:'true', PERSON_PRESENCE_VOICE_ENABLED:'true', OPENAI_ORB_MODEL:'synthetic-model', OPENAI_ADAM_MODEL:'synthetic-model' })
  for (const key of ['ANTHROPIC','GEMINI','XAI','MISTRAL']) { f.env[`URAI_COUNCIL_${key}_ENABLED`] = 'true'; f.env[`COUNCIL_${key}_MODEL`] = 'synthetic-model' }
  class Timestamp { constructor(value) { this.value=value } toMillis() { return this.value } static fromMillis(value) { return new Timestamp(value) } }
  const domainPolicy = { mode:'granted', retentionDays:365, precise:true, replayVisible:true, lifeMapVisible:true, modelContext:true, sharingEnabled:true, automationEnabled:true, likenessEnabled:true }
  const privacy = { version:2, revision:1, ownerId:UID,
    domains:Object.fromEntries(policyAuthority.CONSENT_DOMAINS.map(domain => [domain,{ ...domainPolicy }])),
    enforcement:{ state:'fully-enforced', jobId:null, affectedTargets:[], providerState:'not-applicable' } }
  assert.equal(policyAuthority.isCanonicalStoredPolicy(privacy,UID),true, 'positive paid-leaf fixture requires actual canonical owner consent')
  const originalDoc = f.db.doc
  f.db.doc = path => {
    if (path.startsWith('spatialPaidProviderBindings/')) return originalDoc(path)
    return { path, get:async () => snapshot(path), set:async () => undefined, update:async () => undefined }
  }
  const snapshot = path => ({ exists:path.endsWith('privacyPolicy/current'), data:() => path.endsWith('privacyPolicy/current') ? privacy : {} })
  f.db.runTransaction = async fn => fn({ get:ref => Promise.resolve(snapshot(ref.path)), set:() => undefined, create:() => undefined })
  const firestore = Object.assign(() => f.db, { Timestamp, FieldValue:{ increment:x => x, serverTimestamp:() => 'synthetic-time' } })
  class PersonPresenceAuthorityError extends Error {}
  const authority = { authorityDigest:'e'.repeat(64), canonicalLabel:'Synthetic person', mode:'SIMULATION_PRESENT', asOf:'2026-10-07', knowledgeCutoff:'2026-10-07', evidence:[{ id:'synthetic-claim', text:'Synthetic source fixture' }], negativeConstraints:[], sceneUnknowns:[], forbiddenAssertions:[], personId:'synthetic-person', sceneTruthPacketId:'synthetic-truth' }
  const requireAuthority = async () => { if (f.controls.rightsDenied) throw new PersonPresenceAuthorityError('SYNTHETIC RIGHTS DENIED'); return authority }
  const providerModule = sourceModule(`../src/${file}`, id => {
    if (id === 'node:crypto') return { createHash }
    if (id === 'firebase-admin') return { apps:[{}], firestore, auth:() => ({ verifyIdToken:async () => { if (f.controls.authDenied) throw new Error('SYNTHETIC AUTH DENIED'); return { uid:UID } } }) }
    if (id === 'firebase-functions/params') return f.params
    if (id === 'firebase-functions/v2/https') return { onRequest:(options,handler) => { assert.ok(options.secrets.includes(f.helper.SPATIAL_SPEND_WORKER_TOKENS_JSON)); return handler } }
    if (id === '../../../packages/localization/src/contentLanguage') return language
    if (id === './consentPolicyAuthority') return policyAuthority
    if (id === './protectedProviderSpend') return { ...f.helper, paidSpatialFetch:f.paidFetch }
    if (id === './personPresenceAuthority') return { PersonPresenceAuthorityError, loadPersonPresenceAuthority:requireAuthority, requirePersonPresenceRenderBinding:async () => { await requireAuthority(); return { get:key => ({ provider:'elevenlabs',bindingHash:'e'.repeat(64),providerResourceId:'SYNTHETIC_VOICE',providerModelId:'synthetic-model' })[key] } } }
    throw new Error(`Unexpected paid-leaf dependency ${id}`)
  }, { process:{ env:f.env }, fetch:f.fakeFetch })
  f.setProvider(async (url,init) => {
    if (String(url).endsWith('/moderations')) return Response.json({ results:[{ flagged:false }] })
    if (provider === 'elevenlabs') return new Response('SYNTHETIC AUDIO', { headers:{ 'content-type':'audio/mpeg','request-id':'synthetic-voice-task' } })
    if (provider === 'anthropic') return Response.json({ content:[{ type:'text',text:'Synthetic response' }] })
    if (provider === 'gemini') return Response.json({ candidates:[{ content:{ parts:[{ text:'Synthetic response' }] } }] })
    if (provider === 'xai' || provider === 'mistral') return Response.json({ choices:[{ message:{ content:'Synthetic response' } }] })
    const out = { message:'Synthetic response',caption:'Synthetic response',locale:'en-US',suggestedActions:[] }
    if (lane === 'orb') out.disclosure = 'Synthetic provider disclosure'
    if (lane === 'adam') Object.assign(out,{ requiresHumanFounder:false,handoffReason:'' })
    if (lane === 'person') Object.assign(out,{ evidenceClaimIds:['synthetic-claim'],uncertainty:'',simulationLabel:'Synthetic simulation' })
    return new Response([{ type:'response.output_text.delta',delta:JSON.stringify(out) },{ type:'response.completed' }].map(x => `data: ${JSON.stringify(x)}\n\n`).join(''), { headers:{ 'x-request-id':'synthetic-reasoning-task' } })
  })
  const invoke = async extra => {
    const chunks=[], headers={}; let code=200, json
    const response = { headersSent:false, writableEnded:false, status(value) { code=value; return this }, json(value) { json=value; this.writableEnded=true }, setHeader(key,value) { headers[key]=value }, write(value) { this.headersSent=true; chunks.push(value) }, end(value='') { this.writableEnded=true; chunks.push(value) }, on:() => undefined }
    const request = { method:'POST',headers:{ authorization:'Bearer SYNTHETIC-USER-AUTH' },on:() => undefined, body:{ message:'Synthetic question',text:'Synthetic spoken text',context:[],requestId:digest(JSON.stringify({ message:'Synthetic question',context:[],locale:'en-US' })),sessionId:'presence:synthetic-session-12345678',locale:'en-US',surface:'home',aiProcessingConsent:true,externalProcessingConsent:true,...extra } }
    await providerModule[handlerName](request,response)
    return { code,json,headers,chunks }
  }
  return { ...f, invoke, privacy }
}
for (const leaf of leaves) {
  test(`actual paid leaf ${leaf[1]} denies absent authentic admission before any external POST`, async () => {
    const f=leafFixture(leaf,{ missingBinding:true }); await f.invoke(); assert.equal(f.providerCalls.length,0); assert.equal(f.calls.filter(x => x.action === 'reserve').length,0)
  })
  test(`actual paid leaf ${leaf[1]} uses protected exact request and retains stream charges`, async () => {
    const f=leafFixture(leaf), result=await f.invoke(); assert.equal(result.code,200,JSON.stringify(result.json)); assert.equal(f.providerCalls.length,leaf[3] === 'openai' ? 2 : 1)
    for (const row of f.rows.values()) { assert.equal(row.attempt.status,'RECONCILIATION_REQUIRED'); assert.equal(row.attempt.charges_reconciled,false); assert.equal(row.hold,2500000) }
    assert.equal(f.calls.some(x => x.action === 'reconcile'),false)
  })
  test(`actual paid leaf ${leaf[1]} preserves authentication consent and rights denial`, async () => {
    const f=leafFixture(leaf,{ authDenied:true }); await f.invoke(); assert.equal(f.providerCalls.length,0); assert.equal(f.calls.length,0)
    const g=leafFixture(leaf); await g.invoke({ aiProcessingConsent:false,externalProcessingConsent:false }); assert.equal(g.providerCalls.length,0); assert.equal(g.calls.length,0)
    if (leaf[2].startsWith('person')) { const h=leafFixture(leaf,{ rightsDenied:true }); await h.invoke(); assert.equal(h.providerCalls.length,0); assert.equal(h.calls.length,0) }
  })
  test(`actual paid leaf ${leaf[1]} denies missing actual-bound price proof before reservation`, async () => {
    const f=leafFixture(leaf,{ preflight:reply => { delete reply.envelope.protected_pricing } }); await f.invoke(); assert.equal(f.providerCalls.length,0); assert.equal(f.calls.some(x => x.action==='reserve'),false)
  })
}

function syntheticShortWindow(reply, window, expires) {
  const envelope = reply.envelope
  if (window === 'approval') envelope.job.approval.expires_at = expires
  if (window === 'authority') envelope.authority.expires_at = expires
  if (window === 'account') envelope.account.expires_at = expires
  if (window === 'controls') envelope.protected_controls.expires_at = expires
  if (window === 'pricing') envelope.protected_pricing.expires_at = expires
  if (window === 'rates') {
    envelope.job.budget.rates.expires_at = expires
    envelope.protected_pricing.rates = structuredClone(envelope.job.budget.rates)
    envelope.job.approval.job_digest = syntheticJobDigest(envelope.job)
  }
  // Deployment is independently verified by the canonical gateway; its minimum
  // is carried in admission_expires_at, not an invented client proof object.
  reply.admission_expires_at = expires
}
function assertUnsettled(f) {
  for (const row of f.rows.values()) {
    assert.equal(row.hold,2500000)
    assert.equal(row.attempt.charges_reconciled,false)
  }
  assert.equal(f.calls.some(call => call.action === 'reconcile'),false)
}

test('protected issuer mismatch or missing gateway pin denies token lookup and all HTTP', async () => {
  for (const binding of [
    value => { delete value.gateway_url },
    value => { value.gateway_url = 'https://foreign.example.invalid/api/worker/production-spend' },
    value => { value.gateway_repository = 'foreign/repository' },
    value => { value.gateway_source_sha = 'c'.repeat(40) },
  ]) {
    const f=fixture({ binding }); await assert.rejects(f.paidFetch(...f.directArgs()))
    assert.equal(f.controls.tokenReads,0); assert.equal(f.calls.length,0); assert.equal(f.providerCalls.length,0)
  }
  const f=fixture(); f.env.SPATIAL_PRODUCTION_SPEND_URL='https://foreign.example.invalid/api/worker/production-spend'
  await assert.rejects(f.paidFetch(...f.directArgs()))
  assert.equal(f.controls.tokenReads,0); assert.equal(f.calls.length,0); assert.equal(f.providerCalls.length,0)
})

test('missing malformed expired or overlong preflight admission windows cannot reserve', async () => {
  const cases = [
    reply => { delete reply.admission_expires_at },
    reply => { reply.admission_expires_at = '2030-02-30T00:00:00Z' },
    reply => { reply.admission_expires_at = '2030-01-01T00:00:00' },
    reply => { reply.admission_expires_at = new Date(Date.now()-1).toISOString() },
    reply => { reply.admission_expires_at = new Date(Date.now()+600000).toISOString() },
  ]
  for (const preflight of cases) {
    const f=fixture({ preflight }); await assert.rejects(f.paidFetch(...f.directArgs()))
    assert.equal(f.providerCalls.length,0); assert.equal(f.calls.some(call => call.action === 'reserve'),false)
  }
})

test('actual approval context digest caps signer and temporal fields are mandatory', async () => {
  const cases=[reply => { delete reply.envelope.job.approval }]
  for (const field of ['receipt','approver','key_id','signature','issued_at','expires_at']) cases.push(reply => { delete reply.envelope.job.approval[field] })
  cases.push(reply => { reply.envelope.job.approval.status='PENDING' },reply => { reply.envelope.job.approval.kind='UNBOUNDED' },
    reply => { reply.envelope.job.approval.job_digest='0'.repeat(64) },reply => { reply.envelope.job.approval.max_usd_micros=1 },
    reply => { reply.envelope.job.approval.max_credits=1 },reply => { reply.envelope.job.approval.signature='not a signature' },
    reply => { reply.envelope.job.approval.issued_at='2100-01-01T00:00:00Z' })
  for (const preflight of cases) {
    const f=fixture({ preflight }); await assert.rejects(f.paidFetch(...f.directArgs()))
    assert.equal(f.providerCalls.length,0); assert.equal(f.calls.some(call => call.action==='reserve'),false)
  }
})

test('actual source authority context cannot be missing untrusted foreign stale or future', async () => {
  const cases=[reply => { delete reply.envelope.authority },reply => { reply.envelope.authority.trusted_readback=false },
    reply => { reply.envelope.authority.binding.sha='c'.repeat(40) },reply => { reply.envelope.authority.expires_at='2000-01-01T00:00:00Z' },
    reply => { reply.envelope.authority.observed_at='2100-01-01T00:00:00Z' },reply => { reply.envelope.job.executor.deployment_ref='invalid' }]
  for (const preflight of cases) {
    const f=fixture({ preflight }); await assert.rejects(f.paidFetch(...f.directArgs()))
    assert.equal(f.providerCalls.length,0); assert.equal(f.calls.some(call => call.action==='reserve'),false)
  }
})

for (const window of ['approval','authority','deployment','controls','account','pricing','rates']) {
  test(`delayed reserve delivery cannot outlive the original ${window} minimum`, async () => {
    const f=fixture({
      preflight:(reply,_body,{now}) => syntheticShortWindow(reply,window,new Date(now()+1000).toISOString()),
      reserve:async (_body,{advanceTime}) => { await Promise.resolve(); advanceTime(1500) },
    })
    await assert.rejects(f.paidFetch(...f.directArgs()))
    assert.equal(f.providerCalls.length,0); assert.equal(f.calls.filter(call=>call.action==='reserve').length,1)
    assertUnsettled(f)
  })
}

test('missing malformed old future expired or extended reserve timestamps retain the hold without dispatch', async () => {
  const cases=[
    reply=>{delete reply.reserved_at},reply=>{delete reply.admission_expires_at},
    reply=>{reply.reserved_at='2030-02-30T00:00:00Z'},reply=>{reply.admission_expires_at='2030-01-01T00:00:00'},
    (reply,_body,{now})=>{reply.reserved_at=new Date(now()+1000).toISOString()},
    (reply,_body,{now})=>{reply.reserved_at=new Date(now()-60000).toISOString()},
    (reply,_body,{now})=>{reply.admission_expires_at=new Date(now()-1).toISOString()},
    reply=>{reply.admission_expires_at=new Date(Date.parse(reply.reserved_at)+3000).toISOString()},
    reply=>{reply.admission_expires_at=new Date(Date.parse(reply.reserved_at)+600000).toISOString()},
  ]
  for (const reserveReply of cases) {
    const f=fixture({reserveReply});await assert.rejects(f.paidFetch(...f.directArgs()))
    assert.equal(f.providerCalls.length,0);assertUnsettled(f)
  }
})

test('reserve round trip consumes local runtime even if the server commits late', async () => {
  const f=fixture({
    reserve:async(_body,{advanceTime})=>{await Promise.resolve();advanceTime(1500)},
    reserveReply:(reply,_body,{now})=>{reply.reserved_at=new Date(now()).toISOString();reply.admission_expires_at=new Date(now()+2000).toISOString()},
  })
  f.setProvider(async()=>{await Promise.resolve();f.advanceTime(600);return new Response('LATE OUTPUT')})
  await assert.rejects(f.paidFetch(...f.directArgs()))
  assert.equal(f.providerCalls.length,1);assertUnsettled(f)
})

test('fresh time is checked after the final blocking source read beside dispatch', async () => {
  let admitted=false
  const f=fixture({
    reserveReply:()=>{admitted=true},
    sourceCheck:(args,{advanceTime})=>{if(admitted&&args.includes('status')){admitted=false;advanceTime(2500)}},
  })
  await assert.rejects(f.paidFetch(...f.directArgs()))
  assert.equal(f.providerCalls.length,0);assertUnsettled(f)
})

for (const drift of ['source','input','body','credential','semantic headers']) {
  test(`actual ${drift} drift while provider fetch is awaiting suppresses returned output`, async () => {
    const f=fixture(),args=f.directArgs()
    f.setProvider(async(_url,init)=>{
      await Promise.resolve()
      if(drift==='source')f.env.URAI_SOURCE_SHA='c'.repeat(40)
      if(drift==='input')args[5].message='Changed source input'
      if(drift==='body')init.body[0]=0
      if(drift==='credential')init.headers.set('authorization','Bearer DRIFTED')
      if(drift==='semantic headers')init.headers.set('content-type','text/plain')
      return new Response('INVALID BOUND OUTPUT')
    })
    await assert.rejects(f.paidFetch(...args))
    assert.equal(f.providerCalls.length,1);assertUnsettled(f)
  })
}

test('a delayed provider body chunk cannot become accepted output after absolute expiry', async () => {
  const f=fixture()
  f.setProvider(async()=>new Response(new ReadableStream({
    async pull(stream){await Promise.resolve();f.advanceTime(2500);stream.enqueue(new TextEncoder().encode('LATE CHUNK'));stream.close()},
  },{highWaterMark:0})))
  await assert.rejects(async()=>{const response=await f.paidFetch(...f.directArgs());await response.text()})
  assert.equal(f.providerCalls.length,1);assertUnsettled(f)
})

test('a delayed record acknowledgement cannot close an otherwise empty successful stream', async () => {
  const f=fixture({record:async(_body,{advanceTime})=>{await Promise.resolve();advanceTime(2500)}})
  f.setProvider(async()=>new Response(''))
  const response=await f.paidFetch(...f.directArgs())
  await assert.rejects(response.text())
  assert.equal(f.calls.filter(call=>call.action==='record').length,1)
  assert.equal(f.providerCalls.length,1);assertUnsettled(f)
})

test('the original abort timer remains active while the final record acknowledgement is pending', async () => {
  const f=fixture({
    preflight:(reply,_body,{now})=>syntheticShortWindow(reply,'approval',new Date(now()+200).toISOString()),
    record:async()=>{await new Promise(resolve=>setTimeout(resolve,300))},
  })
  f.setProvider(async()=>new Response(''))
  const response=await f.paidFetch(...f.directArgs())
  await assert.rejects(response.text())
  assert.equal(f.providerCalls[0].init.signal.aborted,true)
  assert.equal(f.calls.filter(call=>call.action==='record').length,1);assertUnsettled(f)
})

for (const action of ['preflight','reserve','record']) {
  test(`expiry while consuming the ${action} gateway response body cannot renew admission`,async()=>{
    const f=fixture({gatewayResponse:(reply,current,{advanceTime})=>{
      if(current!==action)return Response.json(reply)
      return new Response(new ReadableStream({async pull(stream){
        await Promise.resolve();advanceTime(action==='preflight'?300001:2500)
        stream.enqueue(new TextEncoder().encode(JSON.stringify(reply)));stream.close()
      }},{highWaterMark:0}))
    }})
    f.setProvider(async()=>new Response(''))
    await assert.rejects(async()=>{const response=await f.paidFetch(...f.directArgs());await response.text()})
    assert.equal(f.providerCalls.length,action==='record'?1:0)
    if(action==='preflight')assert.equal(f.calls.some(call=>call.action==='reserve'),false)
    else assertUnsettled(f)
  })
}

test('source drift during awaited outcome recording suppresses successful stream completion and retains hold', async () => {
  const f=fixture({record:async (_body,{setHead})=>{await Promise.resolve();setHead('c'.repeat(40))}})
  const response=await f.paidFetch(...f.directArgs());await assert.rejects(response.text());assert.equal(f.providerCalls.length,1);assert.equal([...f.rows.values()][0].hold,2500000);assert.equal(f.calls.some(x=>x.action==='reconcile'),false)
})

test('deadline exhausted during awaited outcome recording suppresses successful stream completion and retains hold', async () => {
  const f=fixture({record:async()=>{await new Promise(resolve=>setTimeout(resolve,2100))}})
  const response=await f.paidFetch(...f.directArgs());await assert.rejects(response.text());assert.equal(f.providerCalls.length,1);assert.equal([...f.rows.values()][0].hold,2500000)
})

test('gateway credentials remain local when configured origin differs from the secret-bound gateway', async () => {
  const f = fixture(); f.env.SPATIAL_PRODUCTION_SPEND_URL = 'https://foreign.example.invalid/api/worker/production-spend'
  await assert.rejects(f.paidFetch(...f.directArgs()))
  assert.equal(f.calls.length, 0); assert.equal(f.providerCalls.length, 0)
})

test('missing or expired preflight admission deadlines deny before reservation', async () => {
  for (const mutate of [r => { delete r.admission_expires_at }, r => { r.admission_expires_at = new Date(Date.now()-1).toISOString() }]) {
    const f=fixture({ preflight:mutate }); await assert.rejects(f.paidFetch(...f.directArgs()))
    assert.equal(f.calls.some(x=>x.action==='reserve'),false); assert.equal(f.providerCalls.length,0)
  }
})

test('missing expired or extended reservation deadlines retain the hold with zero provider POSTs', async () => {
  for (const mutate of [r=>{ delete r.reserved_at },r=>{ delete r.admission_expires_at },r=>{ r.admission_expires_at=new Date(Date.now()-1).toISOString() },r=>{ r.admission_expires_at=new Date(Date.now()+5000).toISOString() }]) {
    const f=fixture({ reserveReply:mutate }); await assert.rejects(f.paidFetch(...f.directArgs()))
    assert.equal(f.providerCalls.length,0); assert.equal([...f.rows.values()][0].hold,2500000)
  }
})

test('reservation response latency consumes the approved runtime and never resets it', async () => {
  const f=fixture({ reserveReply:async()=>{ await new Promise(r=>setTimeout(r,2100)) } })
  await assert.rejects(f.paidFetch(...f.directArgs())); assert.equal(f.providerCalls.length,0)
  assert.equal([...f.rows.values()][0].hold,2500000)
})

test('source or corrected input changes while awaiting an output chunk suppress it and retain the hold', async () => {
  for (const kind of ['source','input']) {
    const f=fixture(), args=f.directArgs()
    f.setProvider(async()=>new Response(new ReadableStream({ async pull(stream) {
      await Promise.resolve()
      if(kind==='source') f.env.URAI_SOURCE_SHA='f'.repeat(40)
      else args[5].message='corrected'
      stream.enqueue(new TextEncoder().encode('must not escape')); stream.close()
    } })))
    const response=await f.paidFetch(...args).catch(()=>null)
    if(response) await assert.rejects(response.text())
    assert.equal([...f.rows.values()][0].hold,2500000); assert.equal(f.providerCalls.length,1)
  }
})

test('secret issuer origin cannot diverge even when protected binding and environment agree', async () => {
  const f=fixture({secretOrigin:'https://foreign.example.invalid'});await assert.rejects(f.paidFetch(...f.directArgs()));assert.equal(f.calls.length,0);assert.equal(f.providerCalls.length,0)
})
test('monotonic elapsed runtime suppresses output when wall clock remains before expiry', async () => {
  const f=fixture();f.setProvider(async()=>{await Promise.resolve();f.advanceMonotonic(2500);return new Response('LATE OUTPUT')});await assert.rejects(f.paidFetch(...f.directArgs()));assert.equal(f.providerCalls.length,1);assertUnsettled(f)
})

test('semantic input identity hashes normalized actual JSON independently of transport formatting and source labels', async () => {
  const bodies = [
    '{"model":"synthetic-model","input":{"b":["café 😀",2],"a":{"y":false,"x":1}}}',
    '{ "input": {"a":{"x":1,"y":false}, "b":["café 😀",2]}, "model":"synthetic-model" }',
    '{"model":"synthetic-model","input":{"a":{"x":1,"y":false},"b":[2,"café 😀"]}}',
  ]
  const observed=[]
  for(const body of bodies){
    const f=fixture(),args=f.directArgs();args[7].body=body
    const response=await f.paidFetch(...args);await response.text()
    const field=f.calls[0].semantic_input_sha256
    assert.equal(field,digest(stable(JSON.parse(body))))
    assert.notEqual(field,f.calls[0].source_input_sha256)
    assert.ok(f.calls.every(call=>call.semantic_input_sha256===field))
    observed.push({semantic:field,request:f.calls[0].request_sha256})
  }
  assert.equal(observed[0].semantic,observed[1].semantic)
  assert.notEqual(observed[0].request,observed[1].request)
  assert.notEqual(observed[0].semantic,observed[2].semantic)
})

test('missing or changed protected semantic input identity blocks before reading the worker token', async () => {
  for(const binding of [value=>{delete value.semantic_input_sha256},value=>{value.semantic_input_sha256='c'.repeat(64)}]){
    const f=fixture({binding});await assert.rejects(f.paidFetch(...f.directArgs()))
    assert.equal(f.controls.tokenReads,0);assert.equal(f.calls.length,0);assert.equal(f.providerCalls.length,0)
  }
})

for(const location of ['executor','protected_controls','protected_pricing']){
  test(`missing or changed ${location} semantic input identity blocks before reserve`,async()=>{
    for(const value of [undefined,'c'.repeat(64)]){
      const f=fixture({preflight:reply=>{
        const target=location==='executor'?reply.envelope.job.executor:reply.envelope[location]
        if(value===undefined)delete target.semantic_input_sha256;else target.semantic_input_sha256=value
      }})
      await assert.rejects(f.paidFetch(...f.directArgs()))
      assert.equal(f.calls.some(call=>call.action==='reserve'),false);assert.equal(f.providerCalls.length,0)
    }
  })
}

test('missing or changed reserve semantic identity retains the full hold without a provider POST',async()=>{
  for(const value of [undefined,'c'.repeat(64)]){
    const f=fixture({reserveReply:reply=>{if(value===undefined)delete reply.semantic_input_sha256;else reply.semantic_input_sha256=value}})
    await assert.rejects(f.paidFetch(...f.directArgs()))
    assert.equal(f.providerCalls.length,0);assertUnsettled(f)
  }
})

for (const location of ['account', 'budget', 'approval', 'protected_controls']) {
  test(`canonical shared account concurrency must be bounded and matched in ${location}`, async () => {
    for (const value of [undefined, 0, 21, 3, '2']) {
      const f = fixture({ preflight: reply => {
        const target = ['budget', 'approval'].includes(location) ? reply.envelope.job[location] : reply.envelope[location]
        if (value === undefined) delete target.max_concurrency; else target.max_concurrency = value
        reply.envelope.job.approval.job_digest = syntheticJobDigest(reply.envelope.job)
      } })
      await assert.rejects(f.paidFetch(...f.directArgs()))
      assert.equal(f.calls.some(call => call.action === 'reserve'), false); assert.equal(f.providerCalls.length, 0)
    }
  })
}
test('a missing or frozen protected account cannot reserve or dispatch', async () => {
  for (const value of [undefined, true, 'false']) {
    const f = fixture({ preflight: reply => { if (value === undefined) delete reply.envelope.account.frozen; else reply.envelope.account.frozen = value } })
    await assert.rejects(f.paidFetch(...f.directArgs()))
    assert.equal(f.calls.some(call => call.action === 'reserve'), false); assert.equal(f.providerCalls.length, 0)
  }
})
