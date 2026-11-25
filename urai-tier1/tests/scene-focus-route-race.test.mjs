import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import test from 'node:test';
const require = createRequire(import.meta.url);
const ts = require('typescript');
const source = readFileSync(new URL('../src/spatial/store/useSceneStore.ts', import.meta.url),'utf8');
const compiled = ts.transpileModule(source, {reportDiagnostics:true, compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}});
assert.equal((compiled.diagnostics||[]).filter(x=>x.category===ts.DiagnosticCategory.Error).length,0);
const module={exports:{}};
function createStore(init){let state;const set=u=>{const patch=typeof u==='function'?u(state):u;state={...state,...patch}};state=init(set,()=>state);const hook=()=>state;hook.getState=()=>state;return hook}
vm.runInNewContext(compiled.outputText,{module,exports:module.exports,require(name){if(name==='zustand')return {create:createStore};throw Error(name)},Math,Number,Object,Error},{filename:'useSceneStore.js'});
const {useSceneStore:s}=module.exports;
const reset=()=>{s.getState().setPlaceFromRoute('/');s.getState().clearFocusedStar();s.getState().setPlaceFromRoute('/')};
test('leaving replay for Home clears stale star and blocks direct replay',()=>{
  reset();s.getState().focusStar('star-1',[1,2,3]);s.getState().enterReplay();
  s.getState().setPlaceFromRoute('/');assert.equal(s.getState().phase,'HOME');
  assert.equal(s.getState().selectedStarId,null);
  assert.equal(s.getState().selectedStarPosition,null);
  s.getState().enterReplay();assert.equal(s.getState().phase,'HOME');
});
test('stale focus cleanup never pulls a routed Home user back into LifeMap',()=>{
  reset();s.getState().focusStar('star-2',[1,2,3]);s.getState().enterReplay();
  s.getState().setPlaceFromRoute('/');s.getState().clearFocusedStar();
  assert.equal(s.getState().phase,'HOME');assert.equal(s.getState().selectedStarId,null);
});
test('Replay to Focus retains selected star and Focus to LifeMap clears it',()=>{
  reset();s.getState().focusStar('star-3',[1,2,3]);s.getState().enterReplay();
  s.getState().setPlaceFromRoute('/focus');assert.equal(s.getState().phase,'FOCUS');
  assert.equal(s.getState().selectedStarId,'star-3');
  s.getState().setPlaceFromRoute('/life-map');assert.equal(s.getState().phase,'LIFEMAP');
  assert.equal(s.getState().selectedStarId,null);
  s.getState().enterReplay();assert.equal(s.getState().phase,'LIFEMAP');
});
test('late stale focus-clear does not replace Ground or Passport',()=>{
  reset();s.getState().focusStar('star-4',[1,2,3]);s.getState().setPlaceFromRoute('/ground');s.getState().clearFocusedStar();
  assert.equal(s.getState().phase,'GROUND');
  s.getState().setPlaceFromRoute('/passport');s.getState().clearFocusedStar();
  assert.equal(s.getState().phase,'PASSPORT');
});
