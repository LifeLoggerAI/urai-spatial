import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const ts = require('typescript')
const source = fs.readFileSync(new URL('../src/components/lifemap/useLifeMapEvents.ts', import.meta.url), 'utf8')
const result = ts.transpileModule(source, {fileName:'useLifeMapEvents.ts',reportDiagnostics:true,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}})
test('real private memories enter Life Map without inventing graph source', () => {
  assert.equal(result.diagnostics?.length, 0)
  assert.match(source,/for \(const memory of visibleMemories\.values\(\)\)/)
  assert.match(source,/id = `canonical-memory:\$\{memory\.id\}`/)
  assert.match(source,/replayManifestId: memory\.replayManifest\.id/)
  assert.match(source,/title: memory\.title, summary: memory\.summary/)
  assert.match(source,/connectedTo: \[\]/)
})
test('projection is gated by owner consent, current snapshots, and privacy',()=>{
  assert.match(source,/nodesAuthority !== authorityKey \|\| erasAuthority !== authorityKey \|\| memoriesAuthority !== authorityKey/)
  assert.match(source,/memory\.privacy === 'hidden' \|\| memory\.demo \|\| memory\.ownerId !== resolvedUserId/)
  assert.match(source,/parsed\.memory\.privacy !== 'hidden'/)
  assert.match(source,/eventMemoryIds\.has\(memory\.id\)/)
  assert.match(source,/fromEvents\.length >= 240/)
})
