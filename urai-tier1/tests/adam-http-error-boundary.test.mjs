import test from 'node:test'
import assert from 'node:assert/strict'
import { readBoundedAdamErrorCode as read } from '../src/spatial/adam/adamVoiceResponseBoundary.mjs'
const sleep=ms=>new Promise(r=>setTimeout(r,ms))
const args=(current=()=>true,signal=new AbortController().signal,fallbackCode='ADAM_PROVIDER_BOUNDARY_FAILURE')=>({isAuthorized:current,signal,fallbackCode})
test('ADAM rejects raw error message and preserves valid machine code',async()=>{
 const response=new Response(JSON.stringify({error:'CONSENT_REQUIRED',message:'SECRET PERSON INFO'}),{status:403})
 assert.equal(await read(response,args()),'CONSENT_REQUIRED')
})
test('ADAM rejects excessive provider error bytes',async()=>{
 let canceled=false
 const response=new Response(new ReadableStream({start(c){c.enqueue(new Uint8Array(8192))},pull(){},cancel(){canceled=true}},{highWaterMark:0}),{status:503})
 assert.equal(await read(response,args()),'ADAM_PROVIDER_BOUNDARY_FAILURE')
 assert.equal(canceled,true)
})
test('ADAM error stream cancels on owner switch without abort signal',async()=>{
 let owner=true,canceled=false
 const ac=new AbortController()
 const body=new ReadableStream({pull(){},cancel(){canceled=true}},{highWaterMark:0})
 const work=read(new Response(body,{status:403}),args(()=>owner,ac.signal))
 await sleep(15);owner=false
 const code=await Promise.race([work,sleep(200).then(()=>'STALLED')])
 ac.abort();await work.catch(()=>{})
 assert.equal(code,'AUTH_SESSION_CHANGED');assert.equal(canceled,true)
})
test('ADAM error authority exceptions fail closed while read stalls',async()=>{
 let broken=false
 const ac=new AbortController()
 const body=new ReadableStream({pull(){},cancel(){}},{highWaterMark:0})
 const work=read(new Response(body,{status:401}),args(()=>{if(broken)throw Error('private state');return true},ac.signal))
 await sleep(15);broken=true
 const code=await Promise.race([work,sleep(200).then(()=>'STALLED')]);ac.abort();await work.catch(()=>{})
 assert.equal(code,'AUTH_SESSION_CHANGED')
})
test('ADAM valid slow error response accepted',async()=>{
 const body=new ReadableStream({async pull(c){await sleep(110);c.enqueue(new TextEncoder().encode('{"error":"RATE_LIMITED"}'));c.close()}},{highWaterMark:0})
 assert.equal(await read(new Response(body,{status:429}),args()),'RATE_LIMITED')
})
test('ADAM malformed provider errors default safely',async()=>{
 for(const body of ['BAD DATA','{"error":"BAD;CODE"}','{"error":17}']){
  assert.equal(await read(new Response(body,{status:502}),args()),'ADAM_PROVIDER_BOUNDARY_FAILURE')
 }
})

for (const header of ['4097', '999999999', '-1', 'Infinity']) {
  test(`ADAM refuses excessive/malformed Content-Length ${header} without waiting for private bytes`, async () => {
    let canceled=false
    const ac=new AbortController()
    const body=new ReadableStream({pull(){}, cancel(){canceled=true}},{highWaterMark:0})
    const resp=new Response(body,{status:403,headers:{'content-length':header}})
    const pending=read(resp,{signal:ac.signal,isAuthorized:()=>true,fallbackCode:'ADAM_PROVIDER_BOUNDARY_FAILURE'})
    try {
      const outcome=await Promise.race([pending,sleep(160).then(()=> 'STALLED')])
      assert.equal(outcome,'ADAM_PROVIDER_BOUNDARY_FAILURE')
      assert.equal(canceled,true)
    } finally {ac.abort();await pending.catch(()=>{})}
  })
}
