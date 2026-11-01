import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import test from 'node:test';
const ts=createRequire(import.meta.url)('typescript');
const source=readFileSync(new URL('../src/spatial/store/useSceneStore.ts',import.meta.url),'utf8');
const result=ts.transpileModule(source,{reportDiagnostics:true,compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}});
assert.equal((result.diagnostics||[]).filter(x=>x.category===ts.DiagnosticCategory.Error).length,0);
const module={exports:{}};
function createStore(init){let state;const set=u=>{const patch=typeof u==='function'?u(state):u;state={...state,...patch}};state=init(set,()=>state);const fn=()=>state;fn.getState=()=>state;return fn}
vm.runInNewContext(result.outputText,{module,exports:module.exports,require(name){if(name==='zustand')return {create:createStore};throw Error(name)},Math,Number,Object,Error},{filename:'useSceneStore.js'});
const s=module.exports.useSceneStore;
function reset(){s.getState().setPlaceFromRoute('/');s.getState().clearFocusedStar()}
for(const [name,transition,expected] of [
  ['enterGround',()=>s.getState().enterGround(),'GROUND'],
  ['enterPassport',()=>s.getState().enterPassport(),'PASSPORT'],
  ['enterStatus',()=>s.getState().enterStatus(),'STATUS'],
  ['setPhase(HOME)',()=>s.getState().setPhase('HOME'),'HOME'],
  ['setMode(GROUND)',()=>s.getState().setMode('GROUND'),'GROUND'],
  ['enterLifeMap',()=>s.getState().enterLifeMap(),'ASCENT'],
]){
  test(name+' clears obsolete Focus/Replay selected star before subsequent Replay',()=>{
    reset();s.getState().focusStar('star-private',[1,2,3]);s.getState().enterReplay();transition();
    assert.equal(s.getState().phase,expected);
    assert.equal(s.getState().selectedStarId,null);
    assert.equal(s.getState().selectedStarPosition,null);
    s.getState().enterReplay();assert.equal(s.getState().phase,expected);
  });
}
test('Replay-to-Focus keeps a valid star selection',()=>{
  reset();s.getState().focusStar('star-keep',[1,2,3]);s.getState().enterReplay();
  s.getState().setPhase('FOCUS');assert.equal(s.getState().selectedStarId,'star-keep');
  s.getState().enterReplay();assert.equal(s.getState().phase,'REPLAY');
});
test('direct Replay from Home is denied when an old star is set independently',()=>{
  reset();s.getState().setSelectedStar('stale-star',[1,2,3]);s.getState().enterReplay();
  assert.equal(s.getState().phase,'HOME');
});
