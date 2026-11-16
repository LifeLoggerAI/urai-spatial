import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'

function source(name) {
  const custom = process.env.URAI_REPLAY_TEST_SOURCE_DIR
  return fs.readFileSync(custom ? `${custom}/${name.split('/').at(-1)}` : new URL(`../src/${name}`, import.meta.url), 'utf8')
}
function load(name) {
  const raw = source(name)
  const transpiled = ts.transpileModule(raw, { fileName: name, reportDiagnostics: true,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } })
  assert.equal(transpiled.diagnostics?.length,0,`original module ${name} must parse as TypeScript`)
  const module = {exports:{}}
  vm.runInNewContext(transpiled.outputText,{module,exports:module.exports,URLSearchParams},{filename:name})
  return module.exports
}
const { replaySessionIdentity } = load('app/replay/replayVisualAdmission.ts')
const { selectedPrivateMovieFromBrowserLocation } = load('spatial/life-movie/privateLifeMovieRouteSelection.ts')
const memory={ownerId:'owner-a',id:'memory-a',demo:false,privacy:'private',authorization:'owner',
  replayManifest:{id:'manifest-a',version:1,durationMs:20000},sourceMedia:[],sourceMediaReceipts:[]}
const plan1='lmp_abcdefghijklmnopqrstuv', plan2='lmp_abcdefghijklmnopqrstuw'
const context = {memoryId:'memory-a',manifestId:'manifest-a',authorizedOwner:true,demo:false}
const url = (movie,plan=plan1,other={}) => `/replay?memoryId=${other.memoryId||'memory-a'}&manifestId=${other.manifestId||'manifest-a'}&movieId=${movie}&lifeMoviePlanId=${plan}`
const selection=(href,scope=context)=>selectedPrivateMovieFromBrowserLocation(href,scope)

test('switching owner-approved movies inside one memory changes the Replay scene key',()=>{
  const first=selection(url('movie-a')),second=selection(url('movie-b'))
  assert.ok(first&&second)
  assert.notEqual(replaySessionIdentity(memory,first),replaySessionIdentity(memory,second))
})
test('switching plans for the same memory and movie tears down the prior scene',()=>{
  const first=selection(url('movie-a',plan1)),second=selection(url('movie-a',plan2))
  assert.ok(first&&second)
  assert.notEqual(replaySessionIdentity(memory,first),replaySessionIdentity(memory,second))
})
test('removing a private movie selector changes the scene identity',()=>{
  assert.notEqual(replaySessionIdentity(memory,selection(url('movie-a'))),replaySessionIdentity(memory,null))
})
test('same authorized movie remains the same scene and does not restart unexpectedly',()=>{
  assert.equal(replaySessionIdentity(memory,selection(url('movie-a'))),replaySessionIdentity(memory,selection(url('movie-a'))))
})
test('wrong memory, manifest, owner or demo cannot mint a private movie selection',()=>{
  for(const chosen of [selection(url('movie-a',plan1,{memoryId:'other-memory'})),
    selection(url('movie-a',plan1,{manifestId:'other-manifest'})),
    selection(url('movie-a'),{...context,authorizedOwner:false}),
    selection(url('movie-a'),{...context,demo:true})]) assert.equal(chosen,null)
})
test('existing memory-only session identity remains stable without a protected selector',()=>{
  assert.equal(replaySessionIdentity(memory),replaySessionIdentity(memory,null))
})
test('original Replay component actually keys its rendered experience by validated selected movie',()=>{
  const replay=source('app/replay/CinematicReplayClient.tsx')
  assert.match(replay,/const location = useBrowserLocation\(\)/)
  assert.match(replay,/const selectedMovie = selectedPrivateMovieFromBrowserLocation\(location,\s*\{/)
  assert.match(replay,/memoryId: memory\.id, manifestId: memory\.replayManifest\.id/)
  assert.match(replay,/authorizedOwner: memory\.authorization === 'owner' && memory\.privacy === 'private'/)
  assert.match(replay,/key=\{replaySessionIdentity\(memory, selectedMovie\)\}/)
  const compiled=ts.transpileModule(replay,{fileName:'CinematicReplayClient.tsx',reportDiagnostics:true,
    compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}})
  assert.equal(compiled.diagnostics?.length,0)
})
