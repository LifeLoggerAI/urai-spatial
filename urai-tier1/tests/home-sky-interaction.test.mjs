import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import { createRequire } from 'node:module'
import test from 'node:test'
import ts from 'typescript'
import * as THREE from 'three'
import { createHomeSkyTapGate, homeJourneyHref, isUpwardHomeSkyRay, subscribeHomeSkyTaps } from '../src/spatial/navigation/homeSkyInteraction.ts'
import { assertHomeAscentArrival, proveHomeSkyAscent } from '../../scripts/home-sky-ascent-proof.mjs'
import { URAI_SOURCE_MESSAGES } from '../src/lib/i18n/locales.ts'

const require = createRequire(import.meta.url)
const pointer = (values={}) => ({pointerId:1,isPrimary:true,button:0,clientX:100,clientY:100,timeStamp:10,...values})
function fixture({ready=true,visible=true}={}) {
  const state = {ready,visible,calls:0,rayCalls:0}
  const gate = createHomeSkyTapGate({isReady:()=>state.ready,isVisibleSkyAt:()=>{state.rayCalls++;return state.visible},onAscent:()=>{state.calls++;state.ready=false}})
  const tap = (down={},up={}) => {gate.down(pointer(down));gate.up(pointer({timeStamp:50,...up}))}
  return {state,gate,tap}
}
for (const [name,direction,expected] of [
  ['up',{x:0,y:1,z:0},true],['upward oblique',{x:1,y:.4,z:-1},true],['down',{x:0,y:-1,z:0},false],
  ['level',{x:0,y:0,z:-1},false],['horizon noise',{x:0,y:.01,z:-1},false],['zero',{x:0,y:0,z:0},false],
  ['nan',{x:NaN,y:1,z:0},false],['infinity',{x:0,y:Infinity,z:0},false],['scaled up',{x:0,y:100,z:0},true],
]) test(`upward-ray authority: ${name}`,()=>assert.equal(isUpwardHomeSkyRay(direction),expected))

test('stationary primary pointer enters once and matching repeated up is inert',()=>{const f=fixture();f.tap();f.gate.up(pointer({timeStamp:55}));f.tap();assert.equal(f.state.calls,1)})
test('small tap jitter is accepted',()=>{const f=fixture();f.tap({}, {clientX:104,clientY:103});assert.equal(f.state.calls,1)})
for (const [name,down,up] of [
  ['secondary pointer',{isPrimary:false},{}],['secondary button',{button:2},{}],['wrong up ID',{}, {pointerId:2}],
  ['invalid down coordinate',{clientX:NaN},{}],['invalid up coordinate',{}, {clientY:Infinity}],
  ['invalid pointer ID',{pointerId:NaN},{}],['long hold',{}, {timeStamp:1600}],['time reversal',{}, {timeStamp:1}],
  ['release displacement',{}, {clientX:107}],['nonprimary release',{}, {isPrimary:false}],
]) test(`gesture rejects ${name}`,()=>{const f=fixture();f.tap(down,up);assert.equal(f.state.calls,0)})
test('drag excursion remains a drag after returning to the start',()=>{const f=fixture();f.gate.down(pointer());f.gate.move(pointer({clientX:150}));f.gate.move(pointer());f.gate.up(pointer({timeStamp:50}));assert.equal(f.state.calls,0);assert.equal(f.state.rayCalls,0)})
test('secondary touch cancels primary tap',()=>{const f=fixture();f.gate.down(pointer());f.gate.down(pointer({pointerId:2,isPrimary:false}));f.gate.up(pointer({timeStamp:50}));assert.equal(f.state.calls,0)})
test('cancellation and unmatched release never enter',()=>{const f=fixture();f.gate.up(pointer());f.gate.down(pointer());f.gate.cancel();f.gate.up(pointer());assert.equal(f.state.calls,0)})
test('locked or descending readiness blocks before geometry work',()=>{const f=fixture({ready:false});f.tap();assert.equal(f.state.calls,0);assert.equal(f.state.rayCalls,0)})
test('revoked readiness between down and up blocks',()=>{const f=fixture();f.gate.down(pointer());f.state.ready=false;f.gate.up(pointer({timeStamp:50}));assert.equal(f.state.calls,0)})
test('lower or occluded sky never starts Ascent',()=>{const f=fixture({visible:false});f.tap();assert.equal(f.state.calls,0)})

function skyModule(context={}) {
  const effects=[]
  const code=ts.transpileModule(fs.readFileSync(new URL('../src/spatial/navigation/HomeSkyInteraction.tsx',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText
  const module={exports:{}}
  vm.runInNewContext(code,{module,exports:module.exports,window:context.window,require:id=>{
    if(id==='three')return THREE
    if(id==='react')return {useEffect:fn=>effects.push(fn)}
    if(id==='@react-three/fiber')return {useThree:()=>context.three}
    if(id.includes('useSceneStore'))return {useSceneStore:{getState:()=>context.state}}
    if(id==='./homeSkyInteraction')return {createHomeSkyTapGate,isUpwardHomeSkyRay,subscribeHomeSkyTaps}
    return require(id)
  }})
  return {...module.exports,effects}
}
const {visibleHomeSkyAt}=skyModule()
function world() {
  const camera=new THREE.PerspectiveCamera(50,1440/900,.05,300)
  camera.position.set(0,1.68,8.4);camera.lookAt(0,1.22,0);camera.updateMatrixWorld(true)
  const scene=new THREE.Scene()
  const sky=new THREE.Mesh(new THREE.SphereGeometry(150,32,16),new THREE.MeshBasicMaterial({side:THREE.BackSide}))
  sky.name='home-original-living-sky';scene.add(sky)
  return {camera,scene,sky,rect:{left:0,top:0,width:1440,height:900},x:720,y:108}
}
function blocker(w,material=new THREE.MeshBasicMaterial()) {
  const ray=new THREE.Raycaster();ray.setFromCamera(new THREE.Vector2(0,1-w.y/900*2),w.camera)
  const mesh=new THREE.Mesh(new THREE.SphereGeometry(1),material)
  mesh.position.copy(w.camera.position).addScaledVector(ray.ray.direction,5);w.scene.add(mesh);return mesh
}
test('actual Three camera ray hits the existing painted sky',()=>assert.equal(visibleHomeSkyAt(world()),true))
test('actual lower ray remains inert',()=>assert.equal(visibleHomeSkyAt({...world(),y:820}),false))
test('painted canopy or Orb foreground blocks sky',()=>{const w=world();blocker(w);assert.equal(visibleHomeSkyAt(w),false)})
test('invisible threshold mesh cannot block painted sky',()=>{const w=world();blocker(w,new THREE.MeshBasicMaterial({transparent:true,opacity:0,colorWrite:false}));assert.equal(visibleHomeSkyAt(w),true)})
test('invisible ancestor cannot block painted sky',()=>{const w=world(),mesh=blocker(w),parent=new THREE.Group();parent.visible=false;parent.add(mesh);w.scene.add(parent);assert.equal(visibleHomeSkyAt(w),true)})
test('a layer not rendered by this camera cannot claim foreground',()=>{const w=world();blocker(w).layers.set(1);assert.equal(visibleHomeSkyAt(w),true)})
test('missing or renamed sky is fail closed',()=>{const w=world();w.sky.name='unapproved-sky';assert.equal(visibleHomeSkyAt(w),false);w.scene.remove(w.sky);assert.equal(visibleHomeSkyAt(w),false)})
for (const [name,overrides] of [['outside',{x:-1}],['invalid',{y:NaN}],['zero width',{rect:{left:0,top:0,width:0,height:900}}]]) test(`actual viewport rejects ${name}`,()=>assert.equal(visibleHomeSkyAt({...world(),...overrides}),false))

function dispatch(owner,type,target,values={}) {
  const event=new Event(type)
  for(const [key,value] of Object.entries({...pointer(),target,...values}))Object.defineProperty(event,key,{value,configurable:true})
  owner.dispatchEvent(event)
}
test('actual effect handles owner-captured up, rejects UI/drag, and cleans all listeners',()=>{
  const owner=new EventTarget(),canvas=new EventTarget(),lifecycle=new EventTarget(),w=world(),state={phase:'HOME',inputLocked:false}
  owner.dataset={homeAssetsReady:'true'};canvas.closest=()=>owner;canvas.getBoundingClientRect=()=>w.rect
  const m=skyModule({three:{camera:w.camera,scene:w.scene,gl:{domElement:canvas}},state,window:lifecycle})
  let calls=0;m.default({groundDescent:false,onAscent:()=>{calls++;state.phase='ASCENT';state.inputLocked=true}})
  const cleanup=m.effects[0]()
  dispatch(owner,'pointerdown',canvas,{clientX:w.x,clientY:w.y})
  dispatch(owner,'pointerup',owner,{clientX:w.x,clientY:w.y,timeStamp:50})
  assert.equal(calls,1)
  state.phase='HOME';state.inputLocked=false
  dispatch(owner,'pointerdown',canvas,{clientX:w.x,clientY:w.y});dispatch(owner,'pointermove',owner,{clientX:w.x+30,clientY:w.y});dispatch(owner,'pointerup',owner,{clientX:w.x,clientY:w.y,timeStamp:50});assert.equal(calls,1)
  dispatch(owner,'pointerdown',owner,{clientX:w.x,clientY:w.y});dispatch(owner,'pointerup',owner,{clientX:w.x,clientY:w.y,timeStamp:50});assert.equal(calls,1)
  dispatch(owner,'pointerdown',canvas,{clientX:w.x,clientY:w.y});lifecycle.dispatchEvent(new Event('blur'));dispatch(owner,'pointerup',owner,{clientX:w.x,clientY:w.y,timeStamp:50});assert.equal(calls,1)
  cleanup();dispatch(owner,'pointerdown',canvas,{clientX:w.x,clientY:w.y});dispatch(owner,'pointerup',owner,{clientX:w.x,clientY:w.y,timeStamp:50});assert.equal(calls,1)
})
test('actual effect cannot enter while descending or loading',()=>{
  for(const groundDescent of [false,true]) {
    const owner=new EventTarget(),canvas=new EventTarget(),w=world(),state={phase:'HOME',inputLocked:false}
    owner.dataset={homeAssetsReady:groundDescent?'true':'false'};canvas.closest=()=>owner;canvas.getBoundingClientRect=()=>w.rect
    const m=skyModule({three:{camera:w.camera,scene:w.scene,gl:{domElement:canvas}},state,window:new EventTarget()});let calls=0
    m.default({groundDescent,onAscent:()=>calls++});const cleanup=m.effects[0]()
    dispatch(owner,'pointerdown',canvas,{clientX:w.x,clientY:w.y});dispatch(owner,'pointerup',owner,{clientX:w.x,clientY:w.y,timeStamp:50});assert.equal(calls,0);cleanup()
  }
})
test('actual effect blocks current locks and every non-Home phase',()=>{
  for(const state of [{phase:'HOME',inputLocked:true},{phase:'ASCENT',inputLocked:false},{phase:'LIFEMAP',inputLocked:false}]) {
    const owner=new EventTarget(),canvas=new EventTarget(),w=world();owner.dataset={homeAssetsReady:'true'};canvas.closest=()=>owner;canvas.getBoundingClientRect=()=>w.rect
    const m=skyModule({three:{camera:w.camera,scene:w.scene,gl:{domElement:canvas}},state,window:new EventTarget()});let calls=0
    m.default({groundDescent:false,onAscent:()=>calls++});const cleanup=m.effects[0]()
    dispatch(owner,'pointerdown',canvas,{clientX:w.x,clientY:w.y});dispatch(owner,'pointerup',owner,{clientX:w.x,clientY:w.y,timeStamp:50});assert.equal(calls,0);cleanup()
  }
})
test('synthetic primary touch and pen use the actual same guarded camera path',()=>{
  for(const pointerType of ['touch','pen']) {
    const owner=new EventTarget(),canvas=new EventTarget(),w=world(),state={phase:'HOME',inputLocked:false};owner.dataset={homeAssetsReady:'true'};canvas.closest=()=>owner;canvas.getBoundingClientRect=()=>w.rect
    const m=skyModule({three:{camera:w.camera,scene:w.scene,gl:{domElement:canvas}},state,window:new EventTarget()});let calls=0
    m.default({groundDescent:false,onAscent:()=>calls++});const cleanup=m.effects[0]()
    dispatch(owner,'pointerdown',canvas,{clientX:w.x,clientY:w.y,pointerType});dispatch(owner,'pointerup',owner,{clientX:w.x,clientY:w.y,timeStamp:50,pointerType});assert.equal(calls,1);cleanup()
  }
})

test('direct Home href retains only explicit disclosed demo and existing route authority',()=>{
  const base='/life-map/?from=home-sky&entryPortal=home-sky&cameraCheckpoint=home-sky-ascent-complete'
  const target=new URL(homeJourneyHref(base,'?demo=1&memoryId=private-source&token=secret'),'https://urai.example')
  assert.equal(target.searchParams.get('demo'),'1');assert.equal(target.searchParams.get('entryPortal'),'home-sky');assert.equal(target.searchParams.get('cameraCheckpoint'),'home-sky-ascent-complete');assert.equal(target.searchParams.has('memoryId'),false);assert.equal(target.searchParams.has('token'),false)
  for(const search of ['', '?demo=0','?demo=true','?demo=1&demo=0','?demo=1&demo=1','?memoryId=private-source'])assert.equal(homeJourneyHref(base,search),base)
  assert.equal(new URL(homeJourneyHref(base+'&demo=0','?demo=1'),'https://urai.example').searchParams.get('demo'),'0')
  const ground=new URL(homeJourneyHref('/ground/?entryPortal=home-ground&cameraCheckpoint=home-ground-descent','?demo=1&token=secret'),'https://urai.example')
  assert.equal(ground.pathname,'/ground/');assert.deepEqual([...ground.searchParams.entries()],[['entryPortal','home-ground'],['cameraCheckpoint','home-ground-descent'],['demo','1']])
})
test('actual hydrated direct navigation retains disclosed demo without changing reviewed labels',()=>{
  const source=fs.readFileSync(new URL('../src/app/HomeSpatialRuntimeLayer.tsx',import.meta.url),'utf8')
  const code=ts.transpileModule(source+'\nexport { HomeSemanticNavigation }',{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText
  let search='',effects=[]
  const locale={text:id=>URAI_SOURCE_MESSAGES[id].source,props:()=>({lang:'en',dir:'ltr'})}
  const module={exports:{}}
  vm.runInNewContext(code,{module,exports:module.exports,window:{location:{search:'?demo=1&memoryId=private-source&token=secret'}},require:id=>{
    if(id==='react')return {useState:()=>[search,next=>{search=next}],useEffect:fn=>effects.push(fn)}
    if(id==='react/jsx-runtime')return require(id)
    if(id.includes('useUraiLocale'))return {useUraiLocale:()=>locale}
    if(id.includes('homeSkyInteraction'))return {homeJourneyHref}
    return {}
  }})
  const findLink=(nav,id)=>nav.props.children.find(child=>child.props['data-testid']===id)
  const ssr=module.exports.HomeSemanticNavigation()
  for(const id of ['home-semantic-life-map','home-semantic-ground'])assert.equal(new URL(findLink(ssr,id).props.href,'https://urai.example').searchParams.has('demo'),false)
  effects[0]();effects=[]
  const nav=module.exports.HomeSemanticNavigation()
  for(const [id,label] of [['home-semantic-life-map','Open Life Map directly'],['home-semantic-ground','Open Ground directly']]){
    const hydrated=findLink(nav,id),target=new URL(hydrated.props.href,'https://urai.example')
    assert.equal(target.searchParams.get('demo'),'1');assert.equal(target.searchParams.has('memoryId'),false);assert.equal(target.searchParams.has('token'),false)
    assert.equal(hydrated.props['aria-label'],label);assert.equal(hydrated.props.onClick,undefined)
  }
})
const origin='https://urai.example/home/?demo=1'
const arrival='https://urai.example/life-map/?from=home-sky&entryPortal=home-sky&cameraCheckpoint=home-sky-ascent-complete&demo=1'
test('literal driver accepts exact same-origin single-authority arrival',()=>assert.doesNotThrow(()=>assertHomeAscentArrival(origin,arrival)))
test('literal driver accepts exactly governed non-demo arrival without manufacturing disclosure',()=>assert.doesNotThrow(()=>assertHomeAscentArrival('https://urai.example/home/',arrival.replace('&demo=1',''))))
for(const [name,url] of [
 ['foreign origin',arrival.replace('urai.example','foreign.example')],['foreign protocol',arrival.replace('https:','http:')],['userinfo',arrival.replace('https://','https://person:secret@')],
 ['fragment',arrival+'#wrong'],['duplicate portal',arrival+'&entryPortal=other'],['duplicate checkpoint',arrival+'&cameraCheckpoint=other'],['lost demo',arrival.replace('&demo=1','')],['duplicate demo',arrival+'&demo=0'],['wrong route',arrival.replace('/life-map/','/focus/')],
 ['missing origin marker',arrival.replace('from=home-sky&','')],['wrong origin marker',arrival.replace('from=home-sky','from=other')],['duplicate origin marker',arrival+'&from=home-sky'],['private unexpected query',arrival+'&memoryId=private-source'],['arbitrary unexpected query',arrival+'&extra=1'],
])test(`literal driver rejects ${name}`,()=>assert.throws(()=>assertHomeAscentArrival(origin,url)))
for(const start of ['https://urai.example/home/','https://urai.example/home/?demo=0','https://urai.example/home/?demo=1&demo=0','https://urai.example/home/?demo=1&demo=1'])test(`literal driver rejects invented demo from ${new URL(start).search || 'ordinary Home'}`,()=>assert.throws(()=>assertHomeAscentArrival(start,arrival)))
test('literal driver retains sanitized failed source evidence before cleanup',async()=>{
  const page={url:()=>origin+'&memoryId=private-memory&token=secret',getByTestId:()=>({count:async()=>0}),evaluate:async()=>[]}
  const home={count:async()=>1,getAttribute:async name=>({'data-home-scene-phase':'HOME','data-home-camera-mode':'embodied-first-person','data-home-input-locked':'false','data-home-embodied-self':'wrong-body-policy'}[name]??null)}
  await assert.rejects(proveHomeSkyAscent(page,home),error=>error.proof?.ascentProven===false&&!JSON.stringify(error.proof).includes('private-memory')&&!JSON.stringify(error.proof).includes('secret'))
})

test('canonical source uses same existing scene/action/motion and current physical proof',()=>{
  const source=fs.readFileSync(new URL('../src/spatial/layout/HomeWorldProductionPolished.tsx',import.meta.url),'utf8')
  assert.match(source,/<HomeSkyInteraction groundDescent=\{props.groundDescent\} onAscent=\{props.onLifeMap\} \/>/)
  assert.match(source,/onLifeMap=\{startLifeMap\}/);assert.match(source,/camera.position.y.toFixed\(4\)/)
  assert.match(source,/const duration = reducedMotion \? \.42 : ascending \? ASCENT_DURATION_SECONDS/)
  assert.match(source,/camera.position.lerp\(new THREE.Vector3\(0, 44, -54\)/)
  assert.doesNotMatch(source,/data-home-stable-state=|AVATAR_HOME_FIRST_PERSON|SKY_ASCENT|hand-controller|first-person-arms/)
  const proof=fs.readFileSync(new URL('../../scripts/capture-canonical-journey-proof.mjs',import.meta.url),'utf8')
  assert.match(proof,/proveHomeSkyAscent\(page, home/);assert.match(proof,/journey.ascentProven = journey.ascentEvidence.ascentProven/)
  assert.match(proof,/identityStable/);assert.match(proof,/expectedAborts/);assert.match(proof,/timeout: 90_000/)
  assert.match(proof,/journey.ascentFailure = error.proof/)
})
