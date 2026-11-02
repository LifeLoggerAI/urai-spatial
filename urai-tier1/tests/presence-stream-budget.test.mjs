import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const ts = require('typescript')
const source = fs.readFileSync(new URL('../src/lib/i18n/presenceContentStream.ts', import.meta.url), 'utf8')
const compiled = ts.transpileModule(source, {compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022}})
assert.deepEqual(compiled.diagnostics ?? [], [])
function loader(Decoder = TextDecoder) {
  const module = {exports:{}}
  vm.runInNewContext(compiled.outputText, {module, exports:module.exports,
    require: name => {if(name === './contentLanguage') return {contentLanguage: x => x === 'en-US' ? {speechTag:'en-US'} : null}; throw Error('unexpected import '+name)},
    TextDecoder:Decoder, DOMException, AbortController, Uint8Array, setInterval, clearInterval,
  }, {filename:'presenceContentStream.ts'})
  return module.exports.readPresenceContentStream
}
const encoder = new TextEncoder()
function opts(events = []) {return {locale:'en-US',signal:new AbortController().signal,isCurrent:()=>true,
  error:(code,message)=>Object.assign(new Error(message),{code}),incompleteCode:'INCOMPLETE',
  validateDone:()=>{},onEvent:e=>events.push(e)}}
const packet = (event) => JSON.stringify(event)+'\n'
const response = (body, onCancel=()=>{}) => new Response(new ReadableStream({start(c){c.enqueue(encoder.encode(body));c.close()},cancel:onCancel},{highWaterMark:0}))
const complete = packet({type:'done',message:'ok',caption:'ok',locale:'en-US'})
test('rejects excessive small valid status frames before completion',async()=>{
 const events=[]
 const lines=Array.from({length:280},(_,i)=>packet({type:'status',status:'working',locale:'en-US'})).join('')+complete
 await assert.rejects(loader()(response(lines),opts(events)),e=>e.code==='INVALID_PROVIDER_RESPONSE')
 assert.ok(events.length<=256,'no more than 256 provider events may reach UI')
})
test('rejects oversized network chunks before UTF-8 decoding',async()=>{
 let largeDecodes=0
 class GuardedDecoder extends TextDecoder {decode(value,...args){if(value?.byteLength > 64*1024)largeDecodes++;return super.decode(value,...args)}}
 const large=packet({type:'status',status:'ready',locale:'en-US'})+' '.repeat(100000)+complete
 await assert.rejects(loader(GuardedDecoder)(response(large),opts()),e=>e.code==='INVALID_PROVIDER_RESPONSE')
 assert.equal(largeDecodes,0,'untrusted oversized chunk cannot reach decoder')
})
test('accepts normal status delta and completion',async()=>{
 const events=[]
 const s=packet({type:'status',status:'working',locale:'en-US'})+packet({type:'delta',text:'ok',locale:'en-US'})+complete
 const data=await loader()(response(s),opts(events))
 assert.equal(data.message,'ok')
 assert.equal(events.length,3)
})
