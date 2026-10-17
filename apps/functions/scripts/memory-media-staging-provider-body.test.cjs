'use strict'
const {test}=require('node:test')
const assert=require('node:assert/strict')
const http=require('node:http')
const {gzipSync}=require('node:zlib')
const {readBoundedProviderBody,readBoundedProviderJson,MAX_JSON_BYTES}=require('./memory-media-staging-provider-body.cjs')
const response=(body,opts={})=>new Response(body,{status:opts.status||200,headers:opts.headers||{}})
const denies=(p,code)=>assert.rejects(p,e=>e?.message==='STAGING_UPLOAD_ORIGIN_UNVERIFIED:'+code)
test('valid bounded Google JSON and uncompressed object media readback',async()=>{
 assert.deepEqual(await readBoundedProviderJson(response('{"generation":"42"}')),{generation:'42'})
 assert.deepEqual(await readBoundedProviderBody(response(Buffer.from([0,255,42]),{headers:{'content-encoding':'identity','x-goog-stored-content-encoding':'identity','x-goog-stored-content-length':'3'}}),10),Buffer.from([0,255,42]))
})
test('JSON and media reject compressed or ambiguous encodings',async()=>{
 for(const value of ['gzip','br','deflate','gzip, br','garbage','']){
  await denies(readBoundedProviderBody(response('payload',{headers:{'content-encoding':value}}),1024),'PROVIDER_CONTENT_ENCODING_UNSAFE')
  await denies(readBoundedProviderBody(response('payload',{headers:{'x-goog-stored-content-encoding':value}}),1024),'PROVIDER_CONTENT_ENCODING_UNSAFE')
 }
})
test('GCS decompressive transcoding with only stored gzip header rejects',async()=>{
 await denies(readBoundedProviderBody(response('uncompressed',{headers:{'x-goog-stored-content-encoding':'gzip'}}),1024),'PROVIDER_CONTENT_ENCODING_UNSAFE')
})
test('JSON cannot exceed one MiB or forged oversized length',async()=>{
 await denies(readBoundedProviderJson(response('x'.repeat(MAX_JSON_BYTES+1))),'PROVIDER_BODY_TOO_LARGE')
 await denies(readBoundedProviderJson(response('{"ok":true}',{headers:{'content-length':String(MAX_JSON_BYTES+1)}})),'PROVIDER_BODY_TOO_LARGE')
})
test('strict lengths reject shorter, longer, malformed, and conflicting stored data',async()=>{
 for(const value of ['2','22'])await denies(readBoundedProviderBody(response('hello',{headers:{'content-length':value}}),100),'PROVIDER_CONTENT_LENGTH_MISMATCH')
 await denies(readBoundedProviderBody(response('hello',{headers:{'content-length':'NaN'}}),100),'PROVIDER_CONTENT_LENGTH_INVALID')
 await denies(readBoundedProviderBody(response('hello',{headers:{'x-goog-stored-content-length':'4'}}),100),'PROVIDER_CONTENT_LENGTH_MISMATCH')
 await denies(readBoundedProviderBody(response('hello',{headers:{'x-goog-stored-content-length':'7','content-length':'5'}}),100),'PROVIDER_CONTENT_LENGTH_MISMATCH')
})
test('no content-length accepts complete bounded uncompressed chunks',async()=>{
 assert.deepEqual(await readBoundedProviderBody(response('hello',{headers:{'transfer-encoding':'chunked'}}),20),Buffer.from('hello'))
})
test('partial response, empty body, malformed input, invalid JSON fail closed',async()=>{
 await denies(readBoundedProviderBody(response('partial',{status:206}),100),'PROVIDER_RESPONSE_INVALID')
 await denies(readBoundedProviderBody(response('data',{headers:{'content-range':'bytes 0-3/4'}}),100),'PROVIDER_RESPONSE_INVALID')
 await denies(readBoundedProviderBody(response(''),100),'PROVIDER_BODY_EMPTY')
 await denies(readBoundedProviderBody({status:200,headers:{get:()=>null},body:null},100),'PROVIDER_RESPONSE_INVALID')
 await denies(readBoundedProviderJson(response('{bad}')),'PROVIDER_RESPONSE_INVALID')
 await denies(readBoundedProviderJson(response('[1]')),'PROVIDER_RESPONSE_INVALID')
 await denies(readBoundedProviderBody(response('x'),0),'PROVIDER_LIMIT_INVALID')
})
test('oversized stream fails closed without length',async()=>{
 await denies(readBoundedProviderBody(response(Buffer.alloc(2048)),1024),'PROVIDER_BODY_TOO_LARGE')
})
test('stream read error fails closed and cancellation is attempted',async()=>{
 const stream=new ReadableStream({start(c){c.error(Error('simulated network error'))}})
 await denies(readBoundedProviderBody({status:200,headers:new Headers(),body:stream},100),'PROVIDER_BODY_READ_FAILED')
})
test('oversized stream cancels its upstream reader',async()=>{
 let cancelled=0
 const stream=new ReadableStream({start(c){c.enqueue(new Uint8Array(3000))},cancel(){cancelled++}})
 await denies(readBoundedProviderBody({status:200,headers:new Headers(),body:stream},100),'PROVIDER_BODY_TOO_LARGE')
 assert.equal(cancelled,1)
})
test('real loopback Node fetch auto-inflates gzip; reader rejects encoded response',async()=>{
 const raw=Buffer.from('abcdefghijk.'.repeat(10))
 const gzip=gzipSync(raw)
 const srv=http.createServer((req,res)=>{
  res.writeHead(200,{'content-type':'application/octet-stream','content-encoding':'gzip','content-length':String(gzip.length)})
  res.end(gzip)
 })
 await new Promise(resolve=>srv.listen(0,'127.0.0.1',resolve))
 try{
  const r=await fetch('http://127.0.0.1:'+srv.address().port+'/',{headers:{'accept-encoding':'identity'},redirect:'error'})
  assert.equal(r.headers.get('content-encoding'),'gzip')
  await denies(readBoundedProviderBody(r,1024),'PROVIDER_CONTENT_ENCODING_UNSAFE')
 }finally{
  srv.closeAllConnections();await new Promise(resolve=>srv.close(resolve))
 }
})
test('an explicitly aborted real loopback body never becomes accepted',async()=>{
 const srv=http.createServer((req,res)=>{res.writeHead(200,{'content-type':'application/octet-stream'});res.flushHeaders()})
 await new Promise(resolve=>srv.listen(0,'127.0.0.1',resolve))
 try{
  const controller=new AbortController()
  const r=await fetch('http://127.0.0.1:'+srv.address().port+'/',{signal:controller.signal,redirect:'error'})
  const pending=readBoundedProviderBody(r,1024)
  controller.abort()
  await denies(pending,'PROVIDER_BODY_READ_FAILED')
 }finally{srv.closeAllConnections();await new Promise(resolve=>srv.close(resolve))}
})
