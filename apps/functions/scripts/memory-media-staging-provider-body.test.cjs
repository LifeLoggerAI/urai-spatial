'use strict'
const {test}=require('node:test')
const assert=require('node:assert/strict')
const {readBoundedProviderBody,readBoundedProviderJson,MAX_JSON_BYTES}=require('./memory-media-staging-provider-body.cjs')
const response=(body,opts={})=>new Response(body,{status:opts.status||200,headers:opts.headers||{}})
const denies=(p,code)=>assert.rejects(p,e=>e?.message==='STAGING_UPLOAD_ORIGIN_UNVERIFIED:'+code)
test('valid bounded Google JSON and object media readback',async()=>{
 const j=await readBoundedProviderJson(response('{"name":"source","generation":"42"}'))
 assert.deepEqual(j,{name:'source',generation:'42'})
 const raw=await readBoundedProviderBody(response(Buffer.from([0,255,42])),10)
 assert.deepEqual(raw,Buffer.from([0,255,42]))
})
test('JSON cannot exceed one MiB even with absent length header',async()=>{
 await denies(readBoundedProviderJson(response('x'.repeat(MAX_JSON_BYTES+1))),'PROVIDER_BODY_TOO_LARGE')
})
test('claimed oversized length fails before reading any source bytes',async()=>{
 await denies(readBoundedProviderJson(response('{"ok":true}',{headers:{'content-length':String(MAX_JSON_BYTES+1)}})),'PROVIDER_BODY_TOO_LARGE')
})
test('short body with forged declared length fails closed',async()=>{
 await denies(readBoundedProviderJson(response('{"ok":true}',{headers:{'content-length':'2'}})),'PROVIDER_CONTENT_LENGTH_MISMATCH')
})
test('malformed content length fails closed',async()=>{
 await denies(readBoundedProviderJson(response('{"ok":true}',{headers:{'content-length':'NaN'}})),'PROVIDER_CONTENT_LENGTH_INVALID')
})
test('partial HTTP 206 response never passes archive byte verification',async()=>{
 await denies(readBoundedProviderBody(response('partial',{status:206}),100),'PROVIDER_RESPONSE_INVALID')
})
test('invalid JSON and JSON array fail closed',async()=>{
 for(const value of ['{oops}', '[1,2]', 'false'])
  await denies(readBoundedProviderJson(response(value)),'PROVIDER_RESPONSE_INVALID')
})
test('zero byte or missing streaming body never grants provider readback',async()=>{
 await denies(readBoundedProviderBody(response(''),1024),'PROVIDER_BODY_EMPTY')
 await denies(readBoundedProviderBody({status:200,headers:{get:()=>null},body:null},1024),'PROVIDER_RESPONSE_INVALID')
})
test('oversized streaming media rejects even without content-length',async()=>{
 await denies(readBoundedProviderBody(response(Buffer.alloc(2048)),1024),'PROVIDER_BODY_TOO_LARGE')
})
test('invalid caller limits are rejected',async()=>{
 await denies(readBoundedProviderBody(response('x'),0),'PROVIDER_LIMIT_INVALID')
})
