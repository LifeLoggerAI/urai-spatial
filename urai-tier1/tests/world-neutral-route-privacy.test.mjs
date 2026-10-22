import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'

const cases = [
  ['../src/spatial/world/WorldTransitionController.tsx', 'buildTravelHref'],
  ['../src/spatial/world/worldEvents.ts', 'buildFallbackHref'],
  ['../src/spatial/world/PersistentWorldCompanion.tsx', 'buildCompanionTravelHref'],
]
const sensitive = ['memoryId','node','manifestId','movieId','chapterId','thread','personId','placeId','privacyMode','originRealm','returnToken','fidelity','scenario','branch','basisRevision','truthMode','scenarioOrigin','demo']
for (const [path, name] of cases) {
  const source = readFileSync(new URL(path, import.meta.url), 'utf8')
  const ast = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true)
  assert.equal(ast.parseDiagnostics.length, 0)
  const fn = ast.statements.find(n => ts.isFunctionDeclaration(n) && n.name?.text === name)
  assert.ok(fn, name + ' source missing')
  const js = ts.transpileModule(fn.getText(ast), {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText
  function build(request) {
    const module = {exports:{}}
    const window = {location:{origin:'https://urai.invalid',search:'?memoryId=secret&node=secret-node&manifestId=secret-manifest&returnToken=secret-token&privacyMode=held-private&scenario=private-scenario&demo=1&thread=secret-thread'}}
    const ctx = {module,exports:module.exports,window,URL,URLSearchParams,CONTEXT_KEYS:sensitive,WORLD_TRAVEL_CONTEXT_KEYS:sensitive,definitionForDestination: destination => ({href:'/'+destination})}
    vm.runInNewContext(js + '\nmodule.exports.' + name + ' = ' + name,ctx)
    return module.exports[name](request)
  }
  test(name+' strips private context from neutral Home and Infrastructure Hub', () => {
    for (const destination of ['home','infrastructure-hub']) {
      const href = build({destination,href:'/'+destination+'?returnToken=explicit&scenario=explicit',context:{memoryId:'secret',replayManifestId:'secret-manifest',privacyMode:'held-private',returnToken:'private-token',scenarioId:'private-scenario',truthMode:'memory',demo:true}})
      const url = new URL(href,'https://urai.invalid')
      for (const key of sensitive) assert.equal(url.searchParams.has(key),false,name+' '+destination+' leaked '+key)
    }
  })
  test(name+' preserves explicit memory identity on Focus', () => {
    const url = new URL(build({destination:'focus',href:'/focus?memoryId=chosen&manifestId=allowed',context:{memoryId:'chosen',replayManifestId:'allowed'}}),'https://urai.invalid')
    assert.equal(url.searchParams.get('memoryId'),'chosen')
    assert.equal(url.searchParams.get('manifestId'),'allowed')
  })
}

for (const [path, name] of cases) {
  const source = readFileSync(new URL(path, import.meta.url), 'utf8')
  const ast = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true)
  const fn = ast.statements.find(n => ts.isFunctionDeclaration(n) && n.name?.text === name)
  const js = ts.transpileModule(fn.getText(ast), {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText
  test(name + ' neutral routes discard visual camera, portal and return-node identity', () => {
    const module = {exports:{}}
    const window = {location:{origin:'https://urai.invalid',search:'?memoryId=private-5&node=private-5'}}
    const ctx = {module,exports:module.exports,window,URL,URLSearchParams,CONTEXT_KEYS:sensitive,WORLD_TRAVEL_CONTEXT_KEYS:sensitive,definitionForDestination:d=>({href:'/'+d})}
    vm.runInNewContext(js + '\nmodule.exports.' + name + ' = ' + name,ctx)
    const request = {destination:'home',href:'/home?entryPortal=old-private-world&cameraCheckpoint=focus:private-star&returnNode=secret-return',entryPortal:'focus-memory-aperture',cameraCheckpoint:'focus:private-star'}
    const url = new URL(module.exports[name](request),'https://urai.invalid')
    for (const key of ['entryPortal','cameraCheckpoint','returnNode']) assert.equal(url.searchParams.has(key),false,name+' leaked '+key)
  })
}
