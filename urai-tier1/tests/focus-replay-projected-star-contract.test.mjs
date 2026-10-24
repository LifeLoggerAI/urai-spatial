import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { createRequire } from 'node:module'
const ts = createRequire(import.meta.url)('typescript')
const source = fs.readFileSync(new URL('../src/app/focus/FocusChamberClient.tsx', import.meta.url),'utf8')
test('Focus Replay forwards the selected canonical Memory Star without minting memory authority',()=>{
 assert.match(source,/const projectedSelection = node === `canonical-memory:\$\{memory.id\}`/)
 assert.match(source,/const sameMemory = incoming.get\('memoryId'\) === memory.id && incoming.get\('manifestId'\) === memory.replayManifest.id/)
 assert.match(source,/const originalSelection = fromLifeMap && node === incoming.get\('returnNode'\)/)
 assert.match(source,/const verifiedNeighborSelection = isAuthorizedFocusNeighborReturn\(node, incoming\.get\('from'\), selectedNode\)/)
 assert.match(source,/const returnNode = sameMemory && validNode && \(originalSelection \|\| projectedSelection \|\| verifiedNeighborSelection\)/)
 assert.match(source,/next.set\('returnNode', returnNode\)/)
 assert.match(source,/data-star-id=\{memory\?\.star\.id\} data-node=\{selectedNode\?\.id \?\? memory\?\.star\.id\}/)
 assert.match(source,/cameraCheckpoint: `focus:\$\{selectedNode\?\.id \?\? memory\.star\.id\}`/)
 assert.match(source,/\[committed, memory, replayHref, selectedNode\]/)

 assert.match(source,/forwardPrivateMovieRouteSelection\(next, incoming,/)
})
test('Original Focus TSX syntax compiles',()=>{
 const c=ts.transpileModule(source,{fileName:'FocusChamberClient.tsx',reportDiagnostics:true,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}})
 assert.equal(c.diagnostics?.length,0)
})
