import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
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

 
// R454 follow-up: execute the actual original routing functions, not just
// source regexes. Browser/WebGL acceptance remains a separate release gate.
function checkOriginalRoute(fileName, functionName, oldSearch, request) {
 const source = read(fileName)
 const sourceFile = ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
 assert.equal(sourceFile.parseDiagnostics.length, 0, fileName + ' syntax')
 const functionNode = sourceFile.statements.find(
   node => ts.isFunctionDeclaration(node) && node.name?.text === functionName
 )
 assert.ok(functionNode, fileName + ':' + functionName + ' exists')
 const js = ts.transpileModule(functionNode.getText(sourceFile), {
   fileName, reportDiagnostics: true,
   compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
 })
 assert.deepEqual((js.diagnostics ?? []).map(d => `${d.code}: ${ts.flattenDiagnosticMessageText(d.messageText, ' ')}`), [], fileName + ' transpiles')
 const route = vm.runInNewContext(
   js.outputText + '\n' + functionName + '(' + JSON.stringify(request) + ')',
   {
     URL, URLSearchParams,
     window: { location: { origin: 'https://urai.test', search: oldSearch } },
     definitionForDestination: destination => ({ href: '/' + destination }),
     CONTEXT_KEYS: ['memoryId', 'node', 'thread', 'personId', 'placeId', 'manifestId', 'movieId', 'chapterId', 'privacyMode', 'demo'],
     WORLD_TRAVEL_CONTEXT_KEYS: ['memoryId', 'node', 'thread', 'personId', 'placeId', 'manifestId', 'movieId', 'chapterId', 'privacyMode', 'demo'],
   },
 )
 assert.equal(typeof route, 'string')
 return new URL(route, 'https://urai.test')
}

for (const [name, fileName, functionName] of [
 ['transition controller', 'WorldTransitionController.tsx', 'buildTravelHref'],
 ['hard fallback', 'worldEvents.ts', 'buildFallbackHref'],
 ['persistent companion', 'PersistentWorldCompanion.tsx', 'buildCompanionTravelHref'],
]) {
 test(name + ': private movie selectors cannot cross memory boundaries into Home', () => {
   const u = checkOriginalRoute(fileName, functionName,
     '?memoryId=memory-A&node=star-A&manifestId=manifest-A&movieId=movie-A&chapterId=chapter-A',
     { destination: 'home', href: '/' })
   for (const key of ['memoryId', 'node', 'manifestId', 'movieId', 'chapterId'])
     assert.equal(u.searchParams.has(key), false, name + ' leaked ' + key)
 })
 test(name + ': new canonical memory cannot inherit old movie/chapter', () => {
   const u = checkOriginalRoute(fileName, functionName,
     '?memoryId=memory-A&movieId=movie-A&chapterId=chapter-A',
     { destination: 'focus', href: '/focus?memoryId=memory-B&manifestId=manifest-B' })
   assert.equal(u.searchParams.get('memoryId'), 'memory-B')
   assert.equal(u.searchParams.get('manifestId'), 'manifest-B')
   assert.equal(u.searchParams.has('movieId'), false)
   assert.equal(u.searchParams.has('chapterId'), false)
 })
 test(name + ': a same-memory return preserves its selected movie', () => {
   const u = checkOriginalRoute(fileName, functionName,
     '?memoryId=memory-A&movieId=movie-A&chapterId=chapter-A',
     { destination: 'focus', href: '/focus?memoryId=memory-A' })
   assert.equal(u.searchParams.get('movieId'), 'movie-A')
   assert.equal(u.searchParams.get('chapterId'), 'chapter-A')
 })
 test(name + ': explicit different movie selection is not replaced by old context', () => {
   const u = checkOriginalRoute(fileName, functionName,
     '?memoryId=memory-A&movieId=movie-A&chapterId=chapter-A',
     { destination: 'replay', href: '/replay?memoryId=memory-B&movieId=movie-B&chapterId=chapter-B' })
   assert.equal(u.searchParams.get('movieId'), 'movie-B')
   assert.equal(u.searchParams.get('chapterId'), 'chapter-B')
 })
 test(name + ': even explicitly passed movie selectors clear on neutral Home', () => {
   const u = checkOriginalRoute(fileName, functionName, '?memoryId=memory-A',
     { destination: 'home', href: '/', context: { movieId: 'movie-A', chapterId: 'chapter-A' } })
   assert.equal(u.searchParams.has('movieId'), false)
   assert.equal(u.searchParams.has('chapterId'), false)
 })
}

for (const [name, fileName, functionName] of [
 ['transition controller', 'WorldTransitionController.tsx', 'buildTravelHref'],
 ['hard fallback', 'worldEvents.ts', 'buildFallbackHref'],
 ['persistent companion', 'PersistentWorldCompanion.tsx', 'buildCompanionTravelHref'],
]) {
 test(name + ': old disclosed demo cannot convert a different private memory to a sample', () => {
   const u = checkOriginalRoute(fileName, functionName,
     '?memoryId=sample-A&demo=1&thread=old-thread&personId=old-person&placeId=old-place&manifestId=old-manifest',
     { destination: 'focus', href: '/focus?memoryId=private-B&manifestId=private-manifest' })
   assert.equal(u.searchParams.get('memoryId'), 'private-B')
   assert.equal(u.searchParams.get('manifestId'), 'private-manifest')
   for (const key of ['demo', 'thread', 'personId', 'placeId'])
     assert.equal(u.searchParams.has(key), false, name + ' leaked old ' + key)
 })
 test(name + ': an explicit new disclosed sample remains disclosed', () => {
   const u = checkOriginalRoute(fileName, functionName,
     '?memoryId=sample-A&demo=1',
     { destination: 'focus', href: '/focus?memoryId=sample-B&demo=1' })
   assert.equal(u.searchParams.get('memoryId'), 'sample-B')
   assert.equal(u.searchParams.get('demo'), '1')
 })
 test(name + ': the same disclosed memory retains its demo identity through Focus', () => {
   const u = checkOriginalRoute(fileName, functionName,
     '?memoryId=sample-A&demo=1',
     { destination: 'focus', href: '/focus?memoryId=sample-A' })
   assert.equal(u.searchParams.get('demo'), '1')
 })
 test(name + ': neutral Home cannot retain demo mode even from explicit context', () => {
   const u = checkOriginalRoute(fileName, functionName,
     '?memoryId=sample-A&demo=1',
     { destination: 'home', href: '/', context: {memoryId:'sample-A', demo:true} })
   assert.equal(u.searchParams.has('demo'), false)
   assert.equal(u.searchParams.has('memoryId'), false)
 })
 test(name + ': changing memory refuses stale demo from context but preserves explicit target authority', () => {
   const u = checkOriginalRoute(fileName, functionName,
     '?memoryId=sample-A&demo=1',
     { destination: 'replay', href: '/replay?memoryId=private-B', context: {demo:true} })
   assert.equal(u.searchParams.has('demo'), false)
 })
 test(name + ': explicitly entering a sample universe without a prior selection is supported', () => {
   const u = checkOriginalRoute(fileName, functionName,
     '',
     { destination: 'life-map', href: '/life-map', context: {demo:true} })
   assert.equal(u.searchParams.get('demo'), '1')
 })
}

// R-FINAL: scoped relationship identity must not leak into neutral travel.
for (const [name, fileName, functionName] of [
 ['transition controller', 'WorldTransitionController.tsx', 'buildTravelHref'],
 ['hard fallback', 'worldEvents.ts', 'buildFallbackHref'],
 ['persistent companion', 'PersistentWorldCompanion.tsx', 'buildCompanionTravelHref'],
]) {
 const assertNoRelationshipLeak = (url) => {
   for (const key of ['thread','personId','placeId'])
     assert.equal(url.searchParams.has(key), false, name + ' leaked ' + key + ' to ' + url.pathname)
 }
 test(name + ': neutral Home and Ground discard inherited private relationship context', () => {
   for (const [destination,href] of [['home','/home'],['infrastructure-hub','/ground']]) {
     const u = checkOriginalRoute(fileName,functionName,
       '?memoryId=memory-A&thread=old-thread&personId=old-person&placeId=old-place',
       {destination,href})
     assertNoRelationshipLeak(u)
     assert.equal(u.searchParams.has('memoryId'),false)
   }
 })
 test(name + ': neutral Home discards explicit stale relationship selectors', () => {
   const u = checkOriginalRoute(fileName,functionName,'?memoryId=memory-A',
     {destination:'home',href:'/home?thread=target-old',
       context:{threadId:'context-old',personId:'context-person',placeId:'context-place'}})
   assertNoRelationshipLeak(u)
 })
 test(name + ': new selected memory does not inherit orphaned previous relationship context', () => {
   const u = checkOriginalRoute(fileName,functionName,
     '?thread=orphan-thread&personId=orphan-person&placeId=orphan-place',
     {destination:'focus',href:'/focus?memoryId=memory-B'})
   assert.equal(u.searchParams.get('memoryId'),'memory-B')
   assertNoRelationshipLeak(u)
 })
 test(name + ': same selected memory keeps its intended relationship context', () => {
   const u = checkOriginalRoute(fileName,functionName,
     '?memoryId=memory-A&thread=same-thread&personId=same-person&placeId=same-place',
     {destination:'focus',href:'/focus?memoryId=memory-A'})
   assert.equal(u.searchParams.get('thread'),'same-thread')
   assert.equal(u.searchParams.get('personId'),'same-person')
   assert.equal(u.searchParams.get('placeId'),'same-place')
 })
 test(name + ': explicitly chosen Location Map place remains available', () => {
   const u = checkOriginalRoute(fileName,functionName,'?memoryId=memory-A',
     {destination:'location-map',href:'/location-map',context:{placeId:'selected-place'}})
   assert.equal(u.searchParams.get('placeId'),'selected-place')
   assert.equal(u.searchParams.has('memoryId'),false)
 })
}
