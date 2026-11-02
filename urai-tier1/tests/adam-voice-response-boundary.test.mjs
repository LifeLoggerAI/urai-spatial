import test from 'node:test'
import assert from 'node:assert/strict'
import { readAuthorizedAdamVoice } from '../src/spatial/adam/adamVoiceResponseBoundary.mjs'

function voice(chunks, {type='audio/mpeg', length}={}) {
  const headers = {'content-type':type}
  if (length !== undefined) headers['content-length'] = String(length)
  return new Response(new ReadableStream({
    pull(controller) {
      if (chunks.length) controller.enqueue(chunks.shift())
      else controller.close()
    },
  }), {status:200,headers})
}
const approved = () => ({signal:new AbortController().signal,isAuthorized:()=>true})
const bytes = count => new Uint8Array(count).fill(77)
const denies = code => error => { assert.equal(error?.code,code); return true }

test('authorized MP3 streams into a bounded Blob with exactly matched length', async () => {
  const data = await readAuthorizedAdamVoice(voice([bytes(8),bytes(6)],{length:14}),approved())
  assert.equal(data.type,'audio/mpeg')
  assert.equal(data.size,14)
})
test('chunked voice without Content-Length remains bounded', async () => {
  const data = await readAuthorizedAdamVoice(voice([bytes(12)],{type:'audio/mpeg; charset=binary'}),approved())
  assert.equal(data.size,12)
})
test('empty voice is denied',async()=>{
  await assert.rejects(readAuthorizedAdamVoice(voice([]),approved()),denies('ADAM_VOICE_TRUNCATED'))
})
test('non-audio response is refused before reading its body',async()=>{
  await assert.rejects(readAuthorizedAdamVoice(voice([bytes(12)],{type:'text/html'}),approved()),denies('ADAM_VOICE_MIME_INVALID'))
})
test('oversized advertised length is denied before accepting bytes',async()=>{
  await assert.rejects(readAuthorizedAdamVoice(voice([bytes(1)],{length:8*1024*1024+1}),approved()),denies('ADAM_VOICE_LENGTH_INVALID'))
})
test('unadvertised streaming output above eight MiB is denied',async()=>{
  await assert.rejects(readAuthorizedAdamVoice(voice([bytes(8*1024*1024),bytes(1)]),approved()),denies('ADAM_VOICE_LIMIT_EXCEEDED'))
})
test('false Content-Length is rejected rather than playing truncated audio',async()=>{
  await assert.rejects(readAuthorizedAdamVoice(voice([bytes(3)],{length:8}),approved()),denies('ADAM_VOICE_TRUNCATED'))
})
test('owner change between chunks discards the entire response',async()=>{
  let calls=0
  await assert.rejects(readAuthorizedAdamVoice(voice([bytes(6),bytes(5)]),{signal:new AbortController().signal,isAuthorized:()=>++calls<3}),denies('ADAM_VOICE_SESSION_CHANGED'))
})
test('aborted session cannot create voice media',async()=>{
  const controller=new AbortController();controller.abort()
  await assert.rejects(readAuthorizedAdamVoice(voice([bytes(6)]),{signal:controller.signal,isAuthorized:()=>true}),denies('ADAM_VOICE_SESSION_CHANGED'))
})
test('missing stream is refused',async()=>{
  await assert.rejects(readAuthorizedAdamVoice(new Response(null,{status:200,headers:{'content-type':'audio/mpeg'}}),approved()),denies('ADAM_VOICE_RESPONSE_INVALID'))
})

test('immediately denied owner cancels unread private voice body',async()=>{
  let cancels=0
  const response=new Response(new ReadableStream({cancel(){cancels++}}),
    {headers:{'content-type':'audio/mpeg'}})
  await assert.rejects(readAuthorizedAdamVoice(response,{signal:new AbortController().signal,
    isAuthorized:()=>false}),denies('ADAM_VOICE_SESSION_CHANGED'))
  assert.equal(cancels,1)
})
test('malformed MIME cancels unread private voice body before playback',async()=>{
  let cancels=0
  const response=new Response(new ReadableStream({cancel(){cancels++}}),
    {headers:{'content-type':'text/html'}})
  await assert.rejects(readAuthorizedAdamVoice(response,approved()),denies('ADAM_VOICE_MIME_INVALID'))
  assert.equal(cancels,1)
})
test('invalid advertised length cancels unread private voice body',async()=>{
  let cancels=0
  const response=new Response(new ReadableStream({cancel(){cancels++}}),
    {headers:{'content-type':'audio/mpeg','content-length':'999999999'}})
  await assert.rejects(readAuthorizedAdamVoice(response,approved()),denies('ADAM_VOICE_LENGTH_INVALID'))
  assert.equal(cancels,1)
})

for (const result of [undefined, null, 1, 'approved', Promise.resolve(true)]) {
  test(`authorization must be literal true (${String(result)})`, {timeout:500}, async () => {
    let cancels = 0
    const response = new Response(new ReadableStream({cancel(){cancels++}}),
      {headers:{'content-type':'audio/mpeg'}})
    await assert.rejects(readAuthorizedAdamVoice(response, {
      signal:new AbortController().signal, isAuthorized:()=>result,
    }), denies('ADAM_VOICE_SESSION_CHANGED'))
    assert.equal(cancels,1)
  })
}
test('throwing authorization denies and cancels unread voice with a redacted error', async () => {
  let cancels = 0
  const response = new Response(new ReadableStream({cancel(){cancels++}}),
    {headers:{'content-type':'audio/mpeg'}})
  await assert.rejects(readAuthorizedAdamVoice(response, {
    signal:new AbortController().signal,
    isAuthorized:()=>{throw new Error('private authorization details')},
  }), denies('ADAM_VOICE_SESSION_CHANGED'))
  assert.equal(cancels,1)
})
