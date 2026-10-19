import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { createRequire } from 'node:module'
const ts = createRequire(import.meta.url)('typescript')
const read = path => fs.readFileSync(new URL('../src/spatial/world/' + path, import.meta.url), 'utf8')
const world = read('worldEvents.ts')
const companion = read('PersistentWorldCompanion.tsx')
const provider = read('WorldStateProvider.tsx')
for (const [name, source, fileName] of [['world hard fallback',world,'worldEvents.ts'],['persistent companion',companion,'PersistentWorldCompanion.tsx'],['world state',provider,'WorldStateProvider.tsx']]) {
 test(name+' parses as original TypeScript',()=>{
   const transpiled=ts.transpileModule(source,{fileName,reportDiagnostics:true,compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}})
   assert.equal(transpiled.diagnostics?.length,0)
 })
}
for (const [name,source] of [['world hard fallback',world],['persistent companion',companion]]) {
 test(name+' refuses visual-node-to-private-memory promotion',()=>{
   assert.doesNotMatch(source,/target\.searchParams\.set\('memoryId', nodeId\)/)
   assert.doesNotMatch(source,/target\.searchParams\.set\('node', memoryId\)/)
   assert.match(source,/selectedMemoryId = context\?\.memoryId \?\? target\.searchParams\.get\('memoryId'\)/)
   assert.match(source,/sameMemory = Boolean\(selectedMemoryId && currentMemoryId && selectedMemoryId === currentMemoryId\)/)
 })
 test(name+' isolates neutral destinations and preserves scoped canonical memory return',()=>{
   assert.match(source,/if \(!memoryDestination\) \{\s*target\.searchParams\.delete\('memoryId'\)/)
   assert.match(source,/key === 'node' \|\| key === 'manifestId'/)
   assert.match(source,/if \(memoryDestination && context\?\.replayManifestId && selectedMemoryId\)/)
 })
}
test('route state cannot mint private memory identity from an event-only node',()=>{
 assert.doesNotMatch(provider,/params\.get\('memoryId'\) \?\? params\.get\('node'\)/)
 assert.match(provider,/const memoryId = params\.get\('memoryId'\) \?\? undefined/)
})
test('route synchronization clears prior owner/movie and private context before replacing with current location',()=>{
 const at=provider.indexOf("if (action.type === 'SYNC_ROUTE')")
 const end=provider.indexOf("if (action.type === 'BEGIN_TRAVEL')",at)
 const block=provider.slice(at,end)
 for(const key of ['memoryId','threadId','personId','placeId','replayManifestId','movieId','chapterId','demo'])assert.match(block,new RegExp(key+': undefined'))
 assert.ok(block.indexOf('memoryId: undefined') < block.indexOf('...action.context'))
})
