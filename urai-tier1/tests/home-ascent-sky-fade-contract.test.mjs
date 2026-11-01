import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { runInNewContext } from 'node:vm'

const require = createRequire(import.meta.url)
const ts = require('typescript')
const filename = new URL('../src/spatial/layout/homeAscentSkyFade.ts', import.meta.url)
const source = readFileSync(filename, 'utf8')
const transpiled = ts.transpileModule(source, {fileName:filename.pathname,reportDiagnostics:true,compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.CommonJS}})
assert.deepEqual(transpiled.diagnostics, [], 'TypeScript syntax must compile')
const out = {exports:{}}
runInNewContext(transpiled.outputText,{module:out,exports:out.exports,Math,Number})
const fade = out.exports.homeAscentSkyOpacity

test('Home sky remains fully visible during Home and other non-Ascent modes',()=>{
 for(const phase of ['HOME','LIFEMAP','FOCUS','REPLAY','GROUND'])for(const p of [-2,0,.2,.5,.9,1,2])assert.equal(fade(phase,p),1)
})
test('Ascent starts with the original sky (no abrupt dark first frame)',()=>{
 for(const p of [-1,0,.001,.02,.04])assert.equal(fade('ASCENT',p),1)
})
test('Ascent reveals real 3D sky continuously and monotonically',()=>{
 let last=1
 for(let i=0;i<=1000;i++){
   const p=i/1000
   const next=fade('ASCENT',p)
   assert.ok(next>=0&&next<=1,`opacity bounds at ${p}`)
   assert.ok(next<=last+1e-12,`sky fading backwards at ${p}`)
   last=next
 }
 assert.ok(fade('ASCENT',.15)<1&&fade('ASCENT',.15)>.75)
 assert.ok(fade('ASCENT',.5)<.65&&fade('ASCENT',.5)>.35)
 assert.ok(fade('ASCENT',.8)<.06&&fade('ASCENT',.8)>0)
 assert.equal(fade('ASCENT',.88),0)
 assert.equal(fade('ASCENT',1),0)
})
test('Invalid Ascent telemetry fails safe to the painted Home sky',()=>{
 for(const p of [NaN,Infinity,-Infinity])assert.equal(fade('ASCENT',p),1)
})
test('Opacity does not pretend to prove camera displacement or decoded video motion',()=>{
 assert.equal(typeof fade, 'function')
 assert.notEqual(fade('ASCENT',.2),fade('ASCENT',.7))
})
