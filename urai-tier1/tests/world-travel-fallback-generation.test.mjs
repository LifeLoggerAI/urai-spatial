import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import { createRequire } from 'node:module'
const ts = createRequire(import.meta.url)('typescript')
const source = fs.readFileSync(new URL('../src/spatial/world/worldEvents.ts', import.meta.url), 'utf8')
const tree = ts.createSourceFile('worldEvents.ts',source,ts.ScriptTarget.Latest,true)
assert.equal(tree.parseDiagnostics.length,0)
const functions = new Set(['cancelPendingWorldTravelFallback','requestUraiWorldTravel','requestUraiWorldReturn'])
const vars = new Set(['fallbackGeneration','pendingFallbackTimeout','pendingFallbackObserver','pendingFallbackPopstateListener'])
const declarations = tree.statements.filter(n => ts.isFunctionDeclaration(n)&&functions.has(n.name?.text) || ts.isVariableStatement(n)&&n.declarationList.declarations.some(d=>ts.isIdentifier(d.name)&&vars.has(d.name.text)))
const js=ts.transpileModule(declarations.map(n=>n.getText(tree)).join('\n'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText
function fixture(onTravel){
 let now=1000,id=0,current='/home'
 const navigation=[],timers=new Map(),listeners=new Map()
 const location={origin:'https://urai.invalid',get pathname(){return new URL(current,this.origin).pathname},get search(){return new URL(current,this.origin).search},get hash(){return ''},assign(href){navigation.push(href);current=href},jump(href){current=href},back(href){current=href;for(const fn of listeners.get('popstate')??[])fn({type:'popstate'})}}
 const schedule=(fn,ms,interval=0)=>{const i=++id;timers.set(i,{fn,when:now+ms,interval});return i}
 function advance(ms){const end=now+ms;for(let k=0;k<10000;k++){const due=[...timers.entries()].filter(([,v])=>v.when<=end).sort((a,b)=>a[1].when-b[1].when)[0];if(!due){now=end;return}const [i,t]=due;now=t.when;if(t.interval)t.when+=t.interval;else timers.delete(i);t.fn()}throw Error('timer loop')}
 let h
 const window={location,setTimeout:(fn,ms)=>schedule(fn,ms),clearTimeout:i=>timers.delete(i),setInterval:(fn,ms)=>schedule(fn,ms,ms),clearInterval:i=>timers.delete(i),addEventListener(type,fn){const group=listeners.get(type)??new Set();group.add(fn);listeners.set(type,group)},removeEventListener(type,fn){listeners.get(type)?.delete(fn)},dispatchEvent(e){if(e.type==='urai:world-travel')onTravel?.(e.detail,h)}}
 const module={exports:{}},ctx={module,exports:module.exports,window,URL,URLSearchParams,Date:{now:()=>now},Event:class{constructor(type){this.type=type}},CustomEvent:class{constructor(type,{detail}){this.type=type;this.detail=detail}},WORLD_TRAVEL_DEBOUNCE_MS:1500,WORLD_TRAVEL_FALLBACK_MS:2400,WORLD_TRAVEL_OBSERVE_MS:50,URAI_WORLD_TRAVEL_EVENT:'urai:world-travel',URAI_WORLD_RETURN_EVENT:'urai:world-return',URAI_HOME_ASCENT_EVENT:'urai:home-ascent',lastTravelAt:0,lastTravelFingerprint:'',useSceneStore:{getState:()=>({phase:'IDLE',enterLifeMap(){}})},shouldBeginHomeAscent:r=>r.entryPortal==='home-sky'&&r.cameraCheckpoint==='home-sky-ascent',markHomeAscentClosing(){},dispatchSpatialAudioCue(){},buildFallbackHref:r=>r.href,destinationSurfaceReady:()=>false,commitHardFallback:href=>location.assign(href)}
 vm.runInNewContext(js,ctx)
 h={...module.exports,navigation,location,advance,get timers(){return timers.size},get popstateListeners(){return listeners.get('popstate')?.size??0}}
 return h
}
const A={destination:'focus',href:'/focus?memoryId=A'},B={destination:'focus',href:'/focus?memoryId=B'}
test('newer travel supersedes old fallback',()=>{const f=fixture();f.requestUraiWorldTravel(A);f.advance(100);f.requestUraiWorldTravel(B);f.advance(2300);assert.deepEqual(f.navigation,[]);f.advance(100);assert.deepEqual(f.navigation,[B.href])})
test('Unwind invalidates pending fallback',()=>{const f=fixture();f.requestUraiWorldTravel(A);f.advance(100);f.requestUraiWorldReturn();f.advance(4000);assert.deepEqual(f.navigation,[]);assert.equal(f.timers,0)})
test('missing destination still falls back',()=>{const f=fixture();f.requestUraiWorldTravel(A);f.advance(2400);assert.deepEqual(f.navigation,[A.href])})
test('duplicate request remains debounced',()=>{const f=fixture();f.requestUraiWorldTravel(A);f.advance(100);f.requestUraiWorldTravel(A);f.advance(2300);assert.deepEqual(f.navigation,[A.href])})
test('home ascent supersedes pending fallback',()=>{const f=fixture();f.requestUraiWorldTravel(A);f.advance(100);f.requestUraiWorldTravel({destination:'life-map',href:'/life-map',entryPortal:'home-sky',cameraCheckpoint:'home-sky-ascent'});f.advance(4000);assert.deepEqual(f.navigation,[])})
test('reentrant later request wins',()=>{let entered=false;const f=fixture((_request,h)=>{if(!entered){entered=true;h.requestUraiWorldTravel(B)}});f.requestUraiWorldTravel(A);f.advance(2400);assert.deepEqual(f.navigation,[B.href])})
test('direct route elsewhere cancels stale recovery',()=>{const f=fixture();f.requestUraiWorldTravel(A);f.advance(100);f.location.jump('/home?changed=1');f.advance(4000);assert.deepEqual(f.navigation,[])})
test('intended location without surface still recovers',()=>{const f=fixture();f.requestUraiWorldTravel(A);f.advance(100);f.location.jump(A.href);f.advance(2300);assert.deepEqual(f.navigation,[A.href])})

test('Back after reaching target does not resurrect obsolete Focus fallback', () => {
  const f = fixture()
  f.requestUraiWorldTravel(A)
  f.advance(100)
  f.location.jump(A.href)
  f.advance(100)
  f.location.jump('/home')
  f.advance(4000)
  assert.deepEqual(f.navigation, [], 'history Back must not force the prior Focus target')
  assert.equal(f.timers, 0)
  assert.equal(f.popstateListeners, 0)
})

test('fast browser Back between polling ticks cancels stale Focus fallback',()=>{
 const f=fixture()
 f.requestUraiWorldTravel(A)
 f.advance(10)
 f.location.jump(A.href)
 f.location.back('/home')
 f.advance(4000)
 assert.deepEqual(f.navigation,[])
 assert.equal(f.timers,0)
 assert.equal(f.popstateListeners,0)
})
test('legitimate hard fallback removes history observer after recovery',()=>{
 const f=fixture()
 f.requestUraiWorldTravel(A)
 f.advance(2400)
 assert.deepEqual(f.navigation,[A.href])
 assert.equal(f.popstateListeners,0)
})

test('browser Back permits immediate new attempt to the same destination',()=>{
 const f=fixture()
 f.requestUraiWorldTravel(A)
 f.advance(100)
 f.location.jump(A.href)
 f.location.back('/home')
 f.advance(100)
 f.requestUraiWorldTravel(A)
 f.advance(2400)
 assert.deepEqual(f.navigation,[A.href], 'a new user selection after Back must not be suppressed by stale debounce')
})
