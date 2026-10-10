import assert from 'node:assert/strict'
import test from 'node:test'
import vm from 'node:vm'
import { installMotionProofObserver, summarizeMotionProof } from '../scripts/motion-proof-observer.mjs'

test('recording summary reports exposed non-finite quaternion rather than passing it', () => {
  const proof = { source: 'unit-test-data-only', reducedMotion: false, frames: [{ms:16,intervalMs:16},{ms:80,intervalMs:64}], longTasks: [], samples: [
    {ms:0,realm:'focus',world:{'data-world-transition':'arriving'},focus:{'data-focus-camera-x':'1','data-focus-camera-y':'2','data-focus-camera-z':'3'}},
    {ms:70,realm:'replay',world:{'data-world-transition':'idle'},canvas:{firstFrame:{'data-replay-camera-quaternion':'0,NaN,0,1'}}},
  ] }
  const result = summarizeMotionProof(proof)
  assert.equal(result.nonFiniteCameraSamples.length,1)
  assert.equal(result.nonFiniteCameraSamples[0].realm,'replay')
  assert.equal(result.framesOver50Ms,1)
  assert.equal(result.stateFrameIntervals['focus:arriving'].count,1)
  assert.equal(result.stateFrameIntervals['replay:idle'].count,1)
})

test('empty recording remains unavailable, never an invented performance pass', () => {
  const result = summarizeMotionProof({source:'unit-test-data-only',reducedMotion:true,frames:[],longTasks:[],samples:[]})
  assert.equal(result.frameIntervalCount,0)
  assert.equal(result.frameIntervalMs.p95,null)
  assert.equal(result.numericCameraSamples,0)
  assert.equal(result.reducedMotion,true)
})

test('persistent hidden Home does not mislabel actual Map or Replay frame intervals', () => {
  const home={'data-home-scene-phase':'HOME'}
  const result=summarizeMotionProof({source:'unit-test-data-only',reducedMotion:false,longTasks:[],frames:[{ms:20,intervalMs:20},{ms:100,intervalMs:80}],samples:[
    {ms:0,realm:'life-map',home,map:{'data-life-map-phase':'acquisition'},world:{'data-world-transition':'idle'}},
    {ms:90,realm:'replay',home,map:{'data-life-map-phase':'arrival'},world:{'data-world-transition':'arriving'}},
  ]})
  assert.deepEqual(Object.keys(result.stateFrameIntervals),['life-map:acquisition','replay:arriving'])
  assert.equal(result.stateFrameIntervals['life-map:acquisition'].count,1)
  assert.equal(result.stateFrameIntervals['replay:arriving'].maxMs,80)
})

function observedDocument(storage,{realm='focus',timeOrigin=10000,invocationId='unique-test-invocation',exactHead='a'.repeat(40),origin='https://urai.example'}={}){
 const events=new Map();let now=0,nextFrame=null
 const attributes=realm==='focus'?{'data-focus-camera-x':'1','data-focus-camera-y':'2','data-focus-camera-z':'3'}:{'data-replay-camera-position':'1,2,3','data-replay-camera-quaternion':'0,0,0,1'}
 const canvas={width:640,height:400,getAttributeNames:()=>[],getAttribute:()=>null}
 const node={getAttributeNames:()=>Object.keys(attributes),getAttribute:key=>attributes[key]??null,querySelector:selector=>selector==='canvas'?canvas:null}
 const shell={getAttributeNames:()=>['data-world-transition'],getAttribute:()=>realm==='focus'?'arriving':'idle',querySelector:selector=>selector.includes(realm==='focus'?'urai-final-focus-chamber':'cinematic-replay-client')?node:null}
 const pageUrl=new URL(`/${realm}/?demo=1`,origin)
 const window={addEventListener:(name,fn)=>events.set(name,fn)}
 const context=vm.createContext({window,URL,Number,Math,JSON,location:{href:pageUrl.href,origin:pageUrl.origin,pathname:pageUrl.pathname},performance:{now:()=>now,timeOrigin},navigator:{hardwareConcurrency:2,deviceMemory:8},sessionStorage:{getItem:key=>storage.get(key)??null,setItem:(key,value)=>storage.set(key,value)},document:{querySelector:selector=>selector.includes('persistent-world-shell')?shell:null,querySelectorAll:()=>[],activeElement:null},getComputedStyle:()=>({transform:'none'}),matchMedia:()=>({matches:false}),requestAnimationFrame:fn=>(nextFrame=fn,1),cancelAnimationFrame:()=>{},PerformanceObserver:class{observe(){}disconnect(){}}})
 vm.runInContext(`(${installMotionProofObserver.toString()})(${JSON.stringify({invocationId,exactHead})})`,context)
 return {window,events,tick:ms=>{now=ms;nextFrame(ms)},proof:()=>JSON.parse(JSON.stringify(window.__uraiMotionProof.snapshot()))}
}

test('pagehide archives actual source-bound document samples and Replay retains separate clocks',()=>{
 const storage=new Map(),first=observedDocument(storage)
 first.tick(0);first.tick(16);first.tick(48);first.window.__uraiMotionProof.mark('actual-focus-before-handoff')
 first.events.get('pagehide')()
 assert.deepEqual([...storage.keys()],['__uraiReadOnlyMotionProofArchive:v2'],'read-only diagnostics never touch product checkpoint keys')
 const second=observedDocument(storage,{realm:'replay',timeOrigin:50000})
 second.tick(0);second.tick(32)
 const proof=second.proof(),result=summarizeMotionProof(proof)
 assert.equal(proof.priorDocuments.length,1)
 assert.equal(proof.priorDocuments[0].sourceUrl,'https://urai.example/focus/?demo=1')
 assert.equal(proof.priorDocuments[0].timeOrigin,10000)
 assert.equal(proof.priorDocuments[0].marks[0].id,'actual-focus-before-handoff')
 assert.equal(result.documentCount,2)
 assert.equal(result.durationMs,null,'no invented combined document duration')
 assert.equal(result.seamlessDocumentJourney,false)
 assert.equal(result.frameIntervalCount,3,'no fabricated interval bridging the 40-second document-clock gap')
 assert.equal(result.frameIntervalMs.max,32)
 assert.deepEqual(Object.keys(result.stateFrameIntervals),['focus:arriving','replay:idle'])
})

for(const [name,options] of [['old source',{exactHead:'b'.repeat(40)}],['stale invocation',{invocationId:'old-invocation'}],['foreign origin',{origin:'https://foreign.example'}]])test(`motion observer rejects ${name} archive before Replay`,()=>{
 const storage=new Map(),first=observedDocument(storage);first.tick(0);first.tick(16);first.events.get('pagehide')()
 const second=observedDocument(storage,{realm:'replay',...options}),proof=second.proof()
 assert.equal(proof.priorDocuments.length,0)
 assert.match(proof.archiveErrors.join(' '),/Rejected/)
 assert.equal(summarizeMotionProof(proof).documentCount,1)
})

test('motion observer rejects a document URL inconsistent with its claimed archive origin',()=>{
 const storage=new Map(),first=observedDocument(storage);first.tick(0);first.events.get('pagehide')()
 const key='__uraiReadOnlyMotionProofArchive:v2',archive=JSON.parse(storage.get(key));archive.documents[0].sourceUrl='https://foreign.example/focus/?demo=1';storage.set(key,JSON.stringify(archive))
 assert.equal(observedDocument(storage,{realm:'replay'}).proof().priorDocuments.length,0)
})
