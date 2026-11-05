import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
import vm from 'node:vm'
import ts from 'typescript'
import { sanitizeMemoryId } from '../src/spatial/memory/selectedMemoryContract.ts'

const source=fs.readFileSync(process.env.URAI_LIFEMAP_BOUNDARY_SOURCE ?? 'src/components/lifemap/LifeMapRouteBoundary.tsx','utf8')
const compiled=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText
const resolvedHref='/focus?demo=1&manifestId=legacy-thread&memoryId=legacy-thread&node=legacy-thread&returnNode=legacy-thread&artifactFamily=archive&from=life-map&onboarding=1&firstRun=1'
const arrival={lifeMapPhase:'arrival',lifeMapCameraX:'-3.3645',lifeMapCameraY:'1.4480',lifeMapCameraZ:'-3.7760',lifeMapTargetX:'-4.4791',lifeMapTargetY:'0.9616',lifeMapTargetZ:'-9.4660',lifeMapFov:'44.000'}

// Execute the actual mounted Boundary and its document capture handler. DOM,
// React, and navigation edges are synthetic; this is not browser visual proof.
function fixture({href=resolvedHref,software='true',disabled=false,label='Enter Focus',data={}}={}) {
  const listeners=[],cleanups=[],assigned=[],canceled=[]
  let frame=0,bubbleClicks=0
  class Element {
    closest(selector) {
      if(selector==='[data-testid="urai-true-3d-life-map"]')return root
      if(selector==='.life-map-thresholds button'||selector==='button')return button
      return null
    }
  }
  const root=new Element()
  root.dataset={softwareRenderer:software,...data}
  const button=new Element()
  Object.assign(button,{disabled,textContent:label,dataset:{destinationHref:href}})
  const child=new Element()
  const location=new URL('http://localhost/life-map?demo=0&memoryId=unrelated-browser-memory&manifestId=unrelated-browser-manifest')
  location.assign=href=>assigned.push(href)
  const browser={location,requestAnimationFrame:()=>++frame,cancelAnimationFrame:id=>canceled.push(id),dispatchEvent:()=>{}}
  const document={
    addEventListener:(type,listener,capture)=>listeners.push({type,listener,capture}),
    removeEventListener:(type,listener,capture)=>{const index=listeners.findIndex(item=>item.type===type&&item.listener===listener&&item.capture===capture);if(index>=0)listeners.splice(index,1)},
    // An unrelated first scene must never supply the clicked button's camera.
    querySelector:()=>({dataset:{...arrival,lifeMapCameraX:'999'}}),
  }
  const element=(type,props)=>({type,props})
  const imports={
    react:{useEffect:effect=>cleanups.push(effect())},
    'react/jsx-runtime':{jsx:element,jsxs:element,Fragment:Symbol('fragment')},
    'next/navigation':{useRouter:()=>({replace:()=>{}})},
    './installR3FDataProps':{},'./lifeMapMobileTravelDensity.css':{},'./lifeMapSemanticNavigatorOwnership.css':{},
    './ComposedLifeMapScene':{__esModule:true,default:()=>null},
    './LifeMapSemanticNavigator':{__esModule:true,default:()=>null},
    './lifeMapSelection':{LIFE_MAP_SELECTION_EVENT:'urai:life-map-select-node'},
    '@/spatial/memory/selectedMemoryContract':{sanitizeMemoryId},
  }
  const module={exports:{}}
  vm.runInNewContext(compiled,{exports:module.exports,module,require:id=>{assert.ok(id in imports,'Unexpected dependency '+id);return imports[id]},window:browser,document,Element,URL,URLSearchParams})
  module.exports.default({authenticatedUserId:null})
  return {root,button,assigned,listeners,canceled,get bubbleClicks(){return bubbleClicks},click(target=child) {
    const event={target,prevented:false,stopped:false,preventDefault(){this.prevented=true},stopImmediatePropagation(){this.stopped=true}}
    for(const item of [...listeners])if(item.type==='click'&&item.capture===true){item.listener(event);if(event.stopped)break}
    if(!event.stopped&&!button.disabled)bubbleClicks+=1
    return event
  },unmount(){cleanups.forEach(cleanup=>cleanup?.())}}
}

test('actual software capture handoff reads the current arrival frame after the button href rendered',()=>{
  const f=fixture()
  assert.equal(f.listeners.filter(listener=>listener.type==='click'&&listener.capture===true).length,2)
  Object.assign(f.root.dataset,arrival)
  const event=f.click()
  assert.equal(event.prevented,true);assert.equal(event.stopped,true);assert.equal(f.bubbleClicks,0)
  assert.equal(f.assigned.length,1)
  const destination=new URL(f.assigned[0],'http://localhost')
  assert.equal(destination.pathname,'/focus')
  assert.equal(destination.searchParams.get('entryCamera'),'-3.3645,1.4480,-3.7760')
  assert.equal(destination.searchParams.get('entryTarget'),'-4.4791,0.9616,-9.4660')
  assert.equal(destination.searchParams.get('entryFov'),'44.000')
  assert.equal(destination.searchParams.get('cameraCheckpoint'),'life-map-arrival:legacy-thread')
  for(const [key,value] of new URL(resolvedHref,'http://localhost').searchParams)assert.equal(destination.searchParams.get(key),value)
  assert.equal(f.button.dataset.destinationHref,resolvedHref,'the render-time destination stays unchanged while live camera data advances')
})

test('current arrival replaces an older render-time checkpoint without duplicate fields',()=>{
  const href=resolvedHref+'&entryCamera=99,99,99&entryTarget=0,0,0&entryFov=46&cameraCheckpoint=life-map-arrival:old-star'
  const f=fixture({href,data:arrival});f.click()
  const destination=new URL(f.assigned[0],'http://localhost')
  assert.equal(destination.searchParams.get('entryCamera'),'-3.3645,1.4480,-3.7760')
  assert.equal(destination.searchParams.get('cameraCheckpoint'),'life-map-arrival:legacy-thread')
  for(const key of ['entryCamera','entryTarget','entryFov','cameraCheckpoint'])assert.equal(destination.searchParams.getAll(key).length,1)
})

test('private selection keeps its resolved identity and flags without acquiring demo authority',()=>{
  const href='/focus?memoryId=synthetic-private-memory&manifestId=source-bound-manifest&node=synthetic-private-memory&returnNode=synthetic-private-memory&onboarding=1&firstRun=1'
  const f=fixture({href,data:arrival});f.click()
  const destination=new URL(f.assigned[0],'http://localhost')
  for(const [key,value] of new URL(href,'http://localhost').searchParams)assert.equal(destination.searchParams.get(key),value)
  assert.equal(destination.searchParams.get('demo'),null)
  assert.equal(destination.searchParams.get('cameraCheckpoint'),'life-map-arrival:synthetic-private-memory')
})

for(const [name,patch] of [
  ['missing coordinate',{lifeMapCameraX:undefined}],['blank coordinate',{lifeMapCameraX:' '}],
  ['nonfinite coordinate',{lifeMapTargetZ:'Infinity'}],['nonnumeric coordinate',{lifeMapTargetZ:'NaN'}],
  ['missing FOV',{lifeMapFov:undefined}],['zero FOV',{lifeMapFov:'0'}],['invalid FOV',{lifeMapFov:'180'}],
  ['coincident camera and target',{lifeMapCameraX:arrival.lifeMapTargetX,lifeMapCameraY:arrival.lifeMapTargetY,lifeMapCameraZ:arrival.lifeMapTargetZ}],
])test('invalid '+name+' retains the resolved native-navigation fallback',()=>{
  const f=fixture({data:{...arrival,...patch}})
  const event=f.click()
  assert.equal(event.stopped,true);assert.deepEqual(f.assigned,[resolvedHref]);assert.equal(f.bubbleClicks,0)
})

test('Replay and nonarrival Focus thresholds preserve their existing destination',()=>{
  for(const options of [{href:resolvedHref.replace('/focus?','/replay?'),label:'Replay',data:arrival},{data:{...arrival,lifeMapPhase:'approach'}}]) {
    const f=fixture(options);f.click()
    assert.deepEqual(f.assigned,[options.href??resolvedHref])
  }
})

test('hardware and disabled thresholds keep their existing click ownership',()=>{
  const hardware=fixture({software:'false',data:arrival})
  assert.equal(hardware.click().stopped,false);assert.deepEqual(hardware.assigned,[]);assert.equal(hardware.bubbleClicks,1)
  const disabled=fixture({disabled:true,data:arrival})
  assert.equal(disabled.click().stopped,false);assert.deepEqual(disabled.assigned,[]);assert.equal(disabled.bubbleClicks,0)
})

test('invalid destination authority is never intercepted for a software handoff',()=>{
  for(const href of ['https://other.example/focus?memoryId=legacy-thread&manifestId=legacy-thread','/replay?memoryId=legacy-thread&manifestId=legacy-thread','/focus?memoryId=legacy-thread']) {
    const f=fixture({href,data:arrival})
    assert.equal(f.click().stopped,false);assert.deepEqual(f.assigned,[])
  }
})

test('unmount removes both capture listeners and cancels the boundary frames',()=>{
  const f=fixture({data:arrival});f.unmount()
  assert.deepEqual(f.listeners,[]);assert.deepEqual(f.canceled,[1,2])
})
