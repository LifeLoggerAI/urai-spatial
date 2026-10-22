import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
const ts = createRequire(import.meta.url)('typescript')
const source = readFileSync(new URL('../src/spatial/world/worldEvents.ts', import.meta.url), 'utf8')
const start = source.indexOf('export function destinationSurfaceReady(')
const end = source.indexOf('\nfunction shouldBeginHomeAscent(', start)
assert.ok(start >= 0 && end > start)
const code = ts.transpileModule(source.slice(start,end), { compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText
function readiness({route='/focus?memoryId=new&manifestId=manifest-new', surfaces={}}={}) {
  const module={exports:{}}
  const url=new URL(route, 'https://urai.invalid')
  const window={location:{search:url.search}}
  const document={querySelector(selector){const values=surfaces[selector];return values ? {getAttribute(name){return values[name]??null}} : null}}
  new Function('module','exports','window','document',code)(module,module.exports,window,document)
  return module.exports.destinationSurfaceReady
}
const focus='[data-testid="urai-final-focus-chamber"]'
const replay='[data-testid="cinematic-replay-client"]'
function surface(id,manifest){return {'data-memory-id':id,'data-manifest-id':manifest}}
test('stale Focus cannot satisfy newer same-route selected memory',()=>{
 assert.equal(readiness({surfaces:{[focus]:surface('old','manifest-old')}})('focus'),false)
 assert.equal(readiness({surfaces:{[focus]:surface('new','manifest-new')}})('focus'),true)
})
test('stale Replay cannot satisfy newer same-route selected memory',()=>{
 assert.equal(readiness({route:'/replay?memoryId=new&manifestId=manifest-new',surfaces:{[replay]:surface('old','manifest-old')}})('replay'),false)
})
test('different manifest under same memory does not satisfy route identity',()=>{
 assert.equal(readiness({surfaces:{[focus]:surface('new','manifest-old')}})('focus'),false)
})
test('demo route matches canonical demo memory ID',()=>{
 assert.equal(readiness({route:'/focus?demo=1&memoryId=voice-note-home',surfaces:{[focus]:surface('demo:voice-note-home','voice-note-home')}})('focus'),true)
})
test('truthful loading and authorization fallback can mount without a selected memory',()=>{
 assert.equal(readiness({surfaces:{[focus]:{'data-memory-id':null}}})('focus'),true)
})
test('neutral destination cannot mistake a stale mounted private memory for its own Focus screen',()=>{
 assert.equal(readiness({route:'/focus',surfaces:{[focus]:surface('old','manifest-old')}})('focus'),false)
})
