import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const ts = require('typescript')
const source = readFileSync(new URL('../src/lib/i18n/presenceContentStream.ts', import.meta.url), 'utf8')
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
const module = { exports: {} }
vm.runInNewContext(compiled, { module, exports: module.exports, require: name => {
  if (name === './contentLanguage') return { contentLanguage: locale => locale === 'en-US' ? { speechTag: 'en-US' } : null }
  throw Error('unexpected dependency')
}, TextDecoder, DOMException, AbortController, setInterval, clearInterval }, { filename: 'presenceContentStream.ts' })
const readPresenceContentStream = module.exports.readPresenceContentStream
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))
const options = (signal, isCurrent, events) => ({locale:'en-US', signal, isCurrent,
  onEvent: event => events.push(event), error: (code, message) => Object.assign(new Error(message), {code}),
  validateDone: () => {}, incompleteCode:'INCOMPLETE'})
const stalled = onCancel => new Response(new ReadableStream({ pull() {}, cancel() { onCancel() } }, {highWaterMark:0}))

test('stalled ADAM text stream denies owner rotation without caller abort', async () => {
  let owner = true, canceled = false
  const ctrl = new AbortController(), events = []
  const work = readPresenceContentStream(stalled(()=>{canceled=true}), options(ctrl.signal, ()=>owner, events))
  try {
    await sleep(25); owner = false
    const result = await Promise.race([work.then(()=>'accepted', error=>error.code||error.name),sleep(210).then(()=>'stalled')])
    assert.equal(result,'AUTH_SESSION_CHANGED');assert.equal(canceled,true);assert.deepEqual(events,[])
  } finally { ctrl.abort();await work.catch(()=>{}) }
})
test('stalled ADAM text stream denies throwing owner authority', async () => {
  let broken = false, canceled = false
  const ctrl = new AbortController(), events = []
  const work = readPresenceContentStream(stalled(()=>{canceled=true}),options(ctrl.signal,()=>{if(broken)throw Error('private auth state');return true},events))
  try {
    await sleep(25);broken=true
    const result=await Promise.race([work.then(()=>'accepted', error=>error.code||error.name),sleep(210).then(()=>'stalled')])
    assert.equal(result,'AUTH_SESSION_CHANGED');assert.equal(canceled,true)
  } finally {ctrl.abort();await work.catch(()=>{})}
})
test('slow but still-authorized ADAM text completes',async()=>{
  let step=0;const events=[]
  const response=new Response(new ReadableStream({async pull(c){
    if(step++===0)c.enqueue(new TextEncoder().encode(JSON.stringify({type:'status',status:'ready',locale:'en-US'})+'\n'))
    else {await sleep(100);c.enqueue(new TextEncoder().encode(JSON.stringify({type:'done',locale:'en-US',message:'ok',caption:'ok'})+'\n'));c.close()}
  }},{highWaterMark:0}))
  const result=await readPresenceContentStream(response,options(new AbortController().signal,()=>true,events))
  assert.equal(result.message,'ok');assert.equal(events.length,2)
})
