import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'

const source = fs.readFileSync(new URL('../src/app/replay/useProtectedLifeMovieReplay.ts', import.meta.url), 'utf8')
const timelineSource = fs.readFileSync(new URL('../src/app/replay/privateLifeMovieSegmentTimeline.ts', import.meta.url), 'utf8')
const expiryHelper = timelineSource.match(/export function privateLifeMovieTimelineCurrent\([\s\S]*?\n}/)
assert.ok(expiryHelper, 'production segmented timeline expiry guard must exist')
const compiled = ts.transpileModule(source, { fileName: 'useProtectedLifeMovieReplay.ts', reportDiagnostics: true,
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } })
assert.equal(compiled.diagnostics?.length, 0)

const match = source.match(/function scopedPlaybackForSelection\([\s\S]*?\n}/)
assert.ok(match, 'original private Replay hook must enforce a selection-specific media boundary')
const moduleSource = [
  "type Playback = { status: string; media: unknown; captions: unknown; selectionKey?: string; timeline?: unknown; segment?: unknown };",
  "const EMPTY = { status: 'absent', media: null, captions: null };",
  expiryHelper[0].replace(/^export /, ''),
  match[0],
  "globalThis.scope = scopedPlaybackForSelection;",
].join('\n')
const transpiled = ts.transpileModule(moduleSource, { fileName: 'selectionScope.ts', reportDiagnostics: true,
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } })
assert.equal(transpiled.diagnostics?.length, 0)
const context = {}
vm.runInNewContext(transpiled.outputText, context)
const scope = context.scope
const old = {status:'ready',selectionKey:'owner|memory|movie-a',media:{kind:'video',url:'blob:old-private-movie'},captions:'PRIVATE',timeline:{durationMs:123, expiresAt:Date.now()+60_000},segment:{index:2}}

test('private Replay selection changes never expose stale video or captions', () => {
  for (const selection of ['owner|memory|movie-b','owner|memory|new-plan','other-owner|memory|movie-a','owner|other-memory|movie-a','owner|memory|revoked','owner|memory|new-manifest']) {
    const result = scope(old, selection)
    assert.equal(result.status, 'absent')
    assert.equal(result.media, null)
    assert.equal(result.captions, null)
    assert.equal(result.timeline, undefined)
    assert.equal(result.segment, undefined)
  }
})
test('identical authorized selection retains its current protected source',()=>{
  assert.equal(scope(old,old.selectionKey),old)
})
test('unscoped previous legacy state is rejected',()=>{
  const result=scope({...old,selectionKey:undefined},old.selectionKey)
  assert.equal(result.status,'absent')
  assert.equal(result.media,null)
})
test('actual hook publishes owner-keyed state and blocks stale media controls before effect cleanup',()=>{
  assert.match(source,/const key = JSON\.stringify\(\[memory\?\.ownerId, memory\?\.id, memory\?\.replayManifest\.id/)
  assert.match(source,/memory\?\.authorization, memory\?\.demo, memory\?\.privacy, planId, movieId/)
  assert.match(source,/const publish = \(next: Playback\) => setState\(\{ \.\.\.next, selectionKey: key \}\)/)
  assert.match(source,/const scoped = scopedPlaybackForSelection\(state, key\)/)
  assert.match(source,/seekTo: scoped\.status === 'ready' \? seekTo : \(\) => \{\}/)
  assert.match(source,/advance: scoped\.status === 'ready' \? advance : \(\) => \{\}/)
})

test('a signed segment timeline expiring before timer delivery cannot expose private Blob or captions', () => {
  for (const expiresAt of [Date.now()-1, Date.now(), Number.NaN, Infinity, 5000.5]) {
    const stale = { ...old, timeline: { durationMs:123, expiresAt } }
    const result = scope(stale, stale.selectionKey)
    assert.equal(result.status, 'unavailable')
    assert.equal(result.media, null)
    assert.equal(result.captions, null)
    assert.equal(result.timeline, undefined)
    assert.equal(result.segment, undefined)
  }
})
test('the separate authorized final-file path without segmented timeline stays available', () => {
  const final = { ...old, timeline: undefined }
  assert.equal(scope(final, final.selectionKey), final)
})
