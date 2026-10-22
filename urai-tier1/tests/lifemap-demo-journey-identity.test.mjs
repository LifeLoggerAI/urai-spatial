import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
import vm from 'node:vm'
import ts from 'typescript'
import { localizedMessage } from '../src/lib/i18n/localePreference.ts'
import { URAI_SOURCE_MESSAGES as messages } from '../src/lib/i18n/locales.ts'
import { withLifeMapSelectionIdentity } from '../src/spatial/memory/lifeMapSelectionJourney.ts'
import { buildNamedExplicitDemoMemory } from '../src/spatial/memory/explicitDemoMemory.ts'
import * as selectedMemoryContract from '../src/spatial/memory/selectedMemoryContract.ts'
import * as consentModel from '../src/app/privacy-controls/consentModel.ts'
import * as privateLifeMovieRouteSelection from '../src/spatial/life-movie/privateLifeMovieRouteSelection.ts'
import { canonicalLifeMapDemoNodes } from '../src/components/lifemap/canonicalLifeMapDemoNodes.ts'
import { DEMO_MEMORY_STAR_NODES } from '../src/spatial/memory/memoryStarSchema.ts'
import { definitionForDestination } from '../src/spatial/world/destinationRegistry.ts'
import { previousDestinationForReturn } from '../src/spatial/world/worldTypes.ts'
import { isAuthorizedFocusNeighborReturn } from '../src/app/focus/focusNeighborContinuity.ts'
// Bind the actual dependency-free runtime helpers to the isolated VM rather than
// replacing privacy, motion, coordinate, or Escape behavior with invented mocks.
import { shouldHandleRealmEscape } from '../src/spatial/world/realmEscapeEligibility.mjs'
import { lifeMapPhysicalStarAction, lifeMapPhysicalReplayAllowed } from '../src/components/lifemap/lifeMapPhysicalStarAction.mjs'
import { lifeMapRotateFlightAxes, advanceLifeMapViewOrientation, lifeMapRotatedLookTarget } from '../src/components/lifemap/lifeMapFlightOrientation.mjs'
import { lifeMapStagePoint } from '../src/components/lifemap/lifeMapStageContinuity.mjs'

const source = fs.readFileSync(process.env.URAI_LIFEMAP_NAVIGATOR_SOURCE ?? 'src/components/lifemap/LifeMapSemanticNavigator.tsx', 'utf8')
const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText
const sceneSource = fs.readFileSync(process.env.URAI_LIFEMAP_SCENE_SOURCE ?? 'src/components/lifemap/ComposedLifeMapScene.tsx', 'utf8')
const sceneCompiled = ts.transpileModule(sceneSource, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText
const adamSlotCompiled = ts.transpileModule(fs.readFileSync('src/spatial/adam/AdamLauncherSlot.tsx', 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText
const selectedMemoryCompiled = ts.transpileModule(fs.readFileSync('src/spatial/memory/useSelectedMemory.ts', 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText
const node = { id:'quiet-reset', title:'The Quiet Reset', type:'recovery', eraId:'threshold-return', connectedTo:[], summary:'Disclosed test memory', dateLabel:'Now', replayAvailable:true }
const privateNode = { ...node, type:'memory', memoryId:'quiet-reset', authorizedMemory:true, replayManifestId:'existing-source-manifest' }
function descendants(tree) {
  if (!tree || typeof tree !== 'object') return []
  const children = tree.props?.children
  return [tree, ...(Array.isArray(children) ? children.flat(Infinity) : [children]).flatMap(descendants)]
}
function fixture(search, { component = 'navigator', memoryNodes = [node] } = {}) {
  let cursor = 0, dirty = false, queued = []
  let founderOpen = false
  const slots = [], listeners = new Map(), calls = []
  const browser = { location:new URL('http://localhost/life-map' + search), addEventListener:(name, handler) => listeners.set(name, handler), removeEventListener:(name, handler) => { if (listeners.get(name) === handler) listeners.delete(name) } }
  browser.setTimeout = () => { throw Error('Reduced-motion component must avoid travel timers') }
  browser.clearTimeout = () => {}
  browser.history = { state:{}, replaceState(_state, _title, destination) { calls.push({kind:'identity', destination}); browser.location = new URL(destination, browser.location) } }
  // VM components receive this document; the real pure realm predicate must
  // evaluate the same document, including the Founder-owned Escape boundary.
  const testDocument = {body:{style:{}},querySelector:selector=>selector==='[data-urai-adam-presence]'&&founderOpen?{}:null}
  const changed = (a,b) => !a || !b || a.length !== b.length || a.some((value,index) => !Object.is(value,b[index]))
  const react = {
    useState(initial) { const index=cursor++; slots[index] ??= {value:initial}; return [slots[index].value, next => {slots[index].value=typeof next==='function'?next(slots[index].value):next; dirty=true}] },
    useRef(initial) { const index=cursor++; slots[index] ??= {value:{current:initial}}; return slots[index].value },
    useMemo(factory,deps) { const index=cursor++; if (!slots[index] || changed(slots[index].deps,deps)) slots[index]={value:factory(),deps}; return slots[index].value },
    useCallback(callback,deps) { return this.useMemo(()=>callback,deps) },
    useEffect(effect,deps) { const index=cursor++; const old=slots[index]; if (!old || changed(old.deps,deps)) {slots[index]={deps,cleanup:old?.cleanup};queued.push(()=>{slots[index].cleanup?.();slots[index].cleanup=effect()})} },
  }
  // Hook imports invoke functions without a receiver.
  react.useCallback = (callback,deps) => react.useMemo(()=>callback,deps)
  react.useLayoutEffect = react.useEffect
  react.Suspense = Symbol('synthetic-Suspense')
  const element = (type,props,key) => ({type,props:props ?? {},key})
  const router = {replace(destination,options) {calls.push({kind:'router',destination,options});browser.location=new URL(destination,browser.location)},push(destination) {calls.push({kind:'destination',destination})}}
  const imports = {
    react, 'react/jsx-runtime':{jsx:element,jsxs:element,Fragment:Symbol('fragment')},
    'react-dom':{createPortal:tree=>tree}, 'next/navigation':{useRouter:()=>router,useSearchParams:()=>browser.location.searchParams},
    './lifeMapData':{lifeMapTypeLabels:{recovery:'Recovery'}}, './lifeMapSelection':{requestLifeMapSelection(id,activation) {calls.push({kind:'world-selection',id,activation,identity:new URL(browser.location).search})}},
    './useLifeMapEvents':{useLifeMapEvents:()=>({nodes:memoryNodes,eras:[],loading:false,sourceMode:browser.location.searchParams.get('demo')==='1'?'explicit-demo':'private'})},
    '@/lib/i18n/localePreference':{localizedMessage},
    '@/lib/i18n/useUraiLocale':{useUraiLocale:()=>({preference:{requested:'en',preview:false},locale:'en',text:key=>{assert.ok(messages[key]);return messages[key].source},props:()=>({lang:'en',dir:'ltr'}),formatProps:{},number:String})},
    '@/lib/i18n/JourneyOfflineNotice':{__esModule:true,default:()=>null},
    '@/spatial/memory/lifeMapSelectionJourney':{withLifeMapSelectionIdentity},
    '@react-three/fiber':{Canvas:'synthetic-Canvas'},three:{},
    '@/spatial/performance/useAdaptiveSpatialQuality':{useAdaptiveSpatialQuality:()=>({tier:'low',pixelRatioMax:1,reducedMotion:true,documentVisible:true})},
    '@/spatial/navigation/homeSkyInteraction':{homeJourneyHref:()=>'/home'},
    './LifeMapProductionWorld':{LifeMapProductionWorld:'synthetic-production-world-boundary'},
    './lifeMapVisualSystem':{artifactFamilyLabel:()=> 'Visual memory',resolveArtifactFamily:()=> 'visual'},
    'firebase/auth':{getAuth:()=>{throw Error('No private source access belongs to a disclosed sample')}},
    'firebase/firestore':{},
    '@/lib/firebase/client':{app:{},firebasePublicEnvReady:false},
    '@/hooks/useBrowserLocation':{useBrowserLocation:()=>browser.location.pathname+browser.location.search+browser.location.hash},
    './selectedMemoryContract':selectedMemoryContract,
    '@/app/privacy-controls/consentModel':consentModel,
    '@/spatial/life-movie/privateLifeMovieRouteSelection':privateLifeMovieRouteSelection,
    './explicitDemoMemory':{buildNamedExplicitDemoMemory},
    '@/spatial/world/realmEscapeEligibility.mjs':{shouldHandleRealmEscape:event=>shouldHandleRealmEscape(event,testDocument)},
    './lifeMapPhysicalStarAction.mjs':{lifeMapPhysicalStarAction,lifeMapPhysicalReplayAllowed},
    './lifeMapFlightOrientation.mjs':{lifeMapRotateFlightAxes,advanceLifeMapViewOrientation,lifeMapRotatedLookTarget},
    './lifeMapStageContinuity.mjs':{lifeMapStagePoint},
  }
  const adamSlotModule = {exports:{}}
  vm.runInNewContext(adamSlotCompiled,{exports:adamSlotModule.exports,module:adamSlotModule,require:id=>{assert.ok(id in imports,'Unexpected import '+id);return imports[id]}},{filename:'actual-AdamLauncherSlot.tsx'})
  imports['@/spatial/adam/AdamLauncherSlot'] = adamSlotModule.exports
  const module = {exports:{}}
  vm.runInNewContext(component==='memory'?selectedMemoryCompiled:component==='scene'?sceneCompiled:compiled,{exports:module.exports,module,require:id=>{assert.ok(id in imports,'Unexpected import '+id);return imports[id]},window:browser,document:testDocument,URLSearchParams,HTMLElement:class {},Element:class {}},{filename:component==='memory'?'actual-useSelectedMemory.ts':component==='scene'?'actual-ComposedLifeMapScene.tsx':'actual-LifeMapSemanticNavigator.tsx'})
  const render = () => {
    for (let pass=0;pass<12;pass++) {cursor=0;dirty=false;const tree=component==='memory'?module.exports.useSelectedMemory():module.exports.default({authenticatedUserId:'synthetic-owner'});const effects=queued;queued=[];effects.forEach(effect=>effect());if(!dirty)return tree}
    throw Error('Actual navigator hooks did not settle')
  }
  const open = () => {descendants(render()).find(el=>el.props['data-testid']==='life-map-semantic-trigger').props.onClick();return render()}
  return {calls,browser,render,open,setFounderOpen(value) {founderOpen=value},key(key) {
    const event={key,target:null,defaultPrevented:false,altKey:false,ctrlKey:false,metaKey:false,preventDefault(){this.defaultPrevented=true}}
    assert.ok(listeners.has('keydown'))
    listeners.get('keydown')(event)
    render()
    return event
  },select(detail=1, id='quiet-reset') {
    if(component==='scene') {
      const world=descendants(render()).find(el=>el.type==='synthetic-production-world-boundary')
      const selected=memoryNodes.find(candidate=>candidate.id===id)
      assert.ok(world);assert.ok(selected)
      const locationBefore = browser.location.href
      const callsBefore = calls.length
      // Auth-gated Life Map scenes must NOT rewrite the same-route URL during
      // physical star approach: doing so unmounts the traveling camera.
      world.props.onSelect(selected)
      const selectedTree = render()
      assert.equal(browser.location.href,locationBefore,'star approach preserves current route')
      assert.deepEqual(calls.slice(callsBefore),[],'no same-route identity/navigation during physical travel')
      // Read the production-owned staged Focus URL, not the intentionally
      // unchanged in-flight Life Map URL.
      const focus = descendants(selectedTree).find(el=>el.props.className==='focus-threshold')
      assert.ok(focus,'selected star exposes its authored Focus destination')
      assert.equal(typeof focus.props['data-destination-href'],'string')
      return new URL(focus.props['data-destination-href'],browser.location).searchParams
    } else {
      const result=descendants(open()).find(el=>el.props['data-life-map-node-id']===id);assert.ok(result);result.props.onClick({detail})
    }
    return browser.location.searchParams
  },destination(route) {
    const control=descendants(render()).find(el=>el.props.className===route+'-threshold')
    assert.ok(control)
    assert.equal(control.props.disabled,false,route+' navigation cannot bypass a disabled memory threshold')
    control.props.onClick()
    return new URL(calls.at(-1).destination,'http://localhost')
  },overview() {
    const control=descendants(render()).find(el=>el.props.className==='overview-return')
    assert.ok(control);control.props.onClick();render();return browser.location.searchParams
  }}
}

test('Founder owns keyboard input above Search until its own dismissal completes', () => {
  const f=fixture('?demo=1&overview=1')
  f.open()
  const initialIdentity=f.browser.location.search
  const initialCalls=f.calls.slice()
  f.setFounderOpen(true)
  for(const key of ['Escape','ArrowRight','ArrowLeft','Home','o','/']) {
    assert.equal(f.key(key).defaultPrevented,false,key+' must reach Founder')
    assert.ok(descendants(f.render()).some(el=>el.props.id==='life-map-navigator'),'Search remains open beneath Founder')
    assert.equal(f.browser.location.search,initialIdentity)
    assert.deepEqual(f.calls,initialCalls)
  }
  f.setFounderOpen(false)
  assert.equal(f.key('Escape').defaultPrevented,true)
  assert.equal(descendants(f.render()).some(el=>el.props.id==='life-map-navigator'),false)
  assert.equal(f.browser.location.search,initialIdentity)
  assert.deepEqual(f.calls,initialCalls)
})

test('actual scene overview groups Founder with Return Home without changing its destination',()=>{
  const f=fixture('?demo=1&overview=1',{component:'scene'})
  const group=descendants(f.render()).find(el=>el.type==='nav' && el.props['aria-label']==='Life Map overview controls')
  assert.ok(group)
  const unreadyReturnHome=descendants(group).find(el=>el.props['data-life-map-overview-home-return']==='true')
  const unreadyFounder=descendants(group).find(el=>typeof el.type==='function' && el.type.name==='AdamLauncherSlot')
  assert.ok(unreadyReturnHome,'Return Home remains available during WebGL recovery')
  assert.equal(unreadyFounder,undefined,'ADAM stays unmounted until the real render-ready signal')
  // Explicitly simulate the renderer's ready-frame proof through the real
  // bridge callback; no fake unconditional "ready" default is supplied.
  const bridge=descendants(f.render()).find(el=>typeof el.type==='function' && el.type.name==='WebGLRecoveryBridge')
  assert.ok(bridge,'actual scene retains its renderer-recovery bridge')
  bridge.props.onStateChange('ready')
  const readyGroup=descendants(f.render()).find(el=>el.type==='nav' && el.props['aria-label']==='Life Map overview controls')
  assert.ok(readyGroup)
  const returnHome=descendants(readyGroup).find(el=>el.props['data-life-map-overview-home-return']==='true')
  const founder=descendants(readyGroup).find(el=>typeof el.type==='function' && el.type.name==='AdamLauncherSlot')
  assert.ok(returnHome);assert.ok(founder,'ADAM appears after render readiness')
  assert.equal(founder.props.name,'life-map-overview-controls')
  returnHome.props.onClick()
  assert.equal(f.calls.at(-1).kind,'destination')
  assert.equal(f.calls.at(-1).destination,'/home')
})

for (const [activation,detail] of [['pointer',1],['keyboard',0],['touch',1]]) test('actual '+activation+' selection after disclosed Home Ascent binds the demo movie manifest',()=>{
  const f=fixture('?demo=1&from=home-sky&entryPortal=home-sky&cameraCheckpoint=home-sky-ascent-complete')
  const q=f.select(detail)
  assert.equal(q.get('memoryId'),'quiet-reset');assert.equal(q.get('node'),'quiet-reset');assert.equal(q.get('manifestId'),'replay-recovery-thread');assert.equal(q.get('demo'),'1')
  assert.deepEqual([...q.keys()].sort(),['demo','era','manifestId','memoryId','node'])
  assert.deepEqual(f.calls.map(call=>call.kind),['identity','world-selection','router'])
  assert.equal(new URLSearchParams(f.calls[1].identity).get('manifestId'),'replay-recovery-thread')
  assert.equal(f.calls[1].activation,detail===0?'keyboard':'pointer');assert.equal(f.calls[2].destination,f.calls[0].destination);assert.equal(f.calls[2].options.scroll,false)
})
for (const search of ['', '?demo=0','?demo=true','?demo=01']) test('actual private selection does not invent demo manifest authority for '+(search||'absent demo'),()=>{
  const f=fixture(search);const q=f.select();assert.equal(q.get('manifestId'),null);assert.equal(q.get('demo'),null);assert.equal(q.get('memoryId'),null);assert.equal(q.get('node'),'quiet-reset')
})
for (const demo of [false,true]) test('actual '+(demo?'disclosed demo':'private')+' selection preserves an existing explicit manifest',()=>{
  const manifest=demo?'replay-recovery-thread':'existing-source-manifest'
  const f=fixture('?memoryId=quiet-reset&manifestId='+manifest+(demo?'&demo=1':''),{memoryNodes:demo?[node]:[{...privateNode,replayManifestId:manifest}]});const q=f.select();assert.equal(q.get('manifestId'),manifest);assert.equal(q.getAll('manifestId').length,1)
})
for (const route of ['focus','replay']) test('actual '+route+' destination carries selected demo identity without copying incoming private query',()=>{
  const f=fixture('?demo=1&node=quiet-reset&privateNote=not-for-navigation')
  const control=descendants(f.open()).find(el=>el.type==='button' && el.props.children===(route==='focus'?'Enter Focus':'Replay'))
  assert.ok(control);control.props.onClick();const destination=new URL(f.calls.at(-1).destination,'http://localhost')
  assert.equal(destination.pathname,'/'+route);assert.equal(destination.searchParams.get('manifestId'),'replay-recovery-thread');assert.equal(destination.searchParams.get('memoryId'),'quiet-reset');assert.equal(destination.searchParams.get('returnNode'),'quiet-reset');assert.equal(destination.searchParams.get('privateNote'),null)
})
test('actual demo Overview return preserves selected memory and manifest exactly once',()=>{
  const f=fixture('?demo=1&node=quiet-reset&memoryId=quiet-reset')
  const control=descendants(f.open()).find(el=>el.type==='button' && el.props.children==='Overview')
  assert.ok(control);control.props.onClick();const q=f.browser.location.searchParams
  assert.equal(q.get('overview'),'1');assert.equal(q.get('node'),'quiet-reset');assert.equal(q.get('memoryId'),'quiet-reset');assert.deepEqual(q.getAll('manifestId'),['replay-recovery-thread'])
})

for (const flag of ['onboarding','firstRun']) test('actual semantic selection retains '+flag+' until resolved Focus arrival',()=>{
  const f=fixture('?demo=1&'+flag+'=1');const q=f.select()
  assert.equal(q.get(flag),'1');assert.equal(q.get('manifestId'),'replay-recovery-thread')
})
test('selecting a different authorized private memory replaces previous manifest with canonical manifest',()=>{
  const f=fixture('?memoryId=other-private-memory&manifestId=other-private-manifest&onboarding=1',{memoryNodes:[privateNode]});const q=f.select()
  assert.equal(q.get('memoryId'),'quiet-reset');assert.equal(q.get('manifestId'),'existing-source-manifest');assert.equal(q.get('onboarding'),'1');assert.equal(q.get('demo'),null)
})

// Exercise the canonical scene's actual onSelect and destination callbacks,
// using the adopted demo builder and identity helper. React/Next/WebGL edges
// are synthetic; these tests do not claim browser or private-data acceptance.
const sceneNodes=[node,...['voice-note-home','legacy-thread'].map(id=>({...node,id,title:'Disclosed sample '+id}))]
for(const id of sceneNodes.map(sample=>sample.id)) test('canonical scene selection and Focus/Replay bind the '+id+' demo manifest',()=>{
  const f=fixture('?demo=1&memoryId=previous-sample&manifestId=previous-manifest&onboarding=1&firstRun=1&privateNote=not-for-navigation',{component:'scene',memoryNodes:sceneNodes})
  const expected=buildNamedExplicitDemoMemory('demo:'+id)
  const selected=f.select(1,id)
  assert.equal(selected.get('manifestId'),expected.replayManifest.id)
  assert.equal(selected.get('memoryId'),id);assert.equal(selected.get('node'),id)
  for(const route of ['focus','replay']) {
    const destination=f.destination(route)
    assert.equal(destination.pathname,'/'+route)
    assert.equal(destination.searchParams.get('manifestId'),expected.replayManifest.id)
    for(const key of ['memoryId','node','returnNode']) assert.equal(destination.searchParams.get(key),id)
    for(const flag of ['demo','onboarding','firstRun']) assert.equal(destination.searchParams.get(flag),'1')
    assert.equal(destination.searchParams.get('privateNote'),null)
    assert.deepEqual(destination.searchParams.getAll('manifestId'),[expected.replayManifest.id])
  }
  const returned=f.overview()
  assert.equal(returned.get('overview'),'1');assert.equal(returned.get('node'),id)
  assert.equal(returned.get('manifestId'),expected.replayManifest.id)
  for(const flag of ['onboarding','firstRun']) assert.equal(returned.get(flag),'1')
})

test('canonical scene repairs the supplied legacy-thread arrival manifest without changing selection',()=>{
  const f=fixture('?demo=1&manifestId=replay-recovery-thread&memoryId=legacy-thread&node=legacy-thread&era=legacy-deep-time',{component:'scene',memoryNodes:sceneNodes})
  const destination=f.destination('focus')
  for(const key of ['memoryId','node','returnNode']) assert.equal(destination.searchParams.get(key),'legacy-thread')
  assert.equal(destination.searchParams.get('manifestId'),buildNamedExplicitDemoMemory('demo:legacy-thread').replayManifest.id)
  assert.equal(destination.searchParams.get('demo'),'1')
})

for(const marker of ['','0','true','01']) test('canonical private scene does not invent demo authority for demo='+marker,()=>{
  const f=fixture('?demo='+marker+'&memoryId=previous-private&manifestId=previous-private-manifest&onboarding=1&firstRun=1',{component:'scene',memoryNodes:sceneNodes})
  const selected=f.select()
  assert.equal(selected.get('manifestId'),null);assert.equal(selected.get('demo'),null)
  for(const route of ['focus','replay']) {
    const control=descendants(f.render()).find(el=>el.props.className===route+'-threshold')
    assert.ok(control)
    assert.equal(control.props.disabled,true,'unverified private nodes cannot open '+route)
    const staged=new URL(control.props['data-destination-href'],'http://localhost')
    assert.equal(staged.searchParams.get('manifestId'),null);assert.equal(staged.searchParams.get('demo'),null)
    for(const flag of ['onboarding','firstRun']) assert.equal(staged.searchParams.get(flag),'1')
  }
  assert.equal(f.calls.filter(call=>call.kind==='destination').length,0,'disabled private thresholds cannot navigate')
})

test('canonical scene retains an existing manifest for the same private memory through destinations and Overview',()=>{
  const f=fixture('?memoryId=quiet-reset&node=quiet-reset&manifestId=source-bound-manifest&onboarding=1&firstRun=1',{component:'scene',memoryNodes:[{...privateNode,replayManifestId:'source-bound-manifest'},...sceneNodes.slice(1)]})
  for(const route of ['focus','replay']) {
    const destination=f.destination(route)
    assert.equal(destination.searchParams.get('manifestId'),'source-bound-manifest')
    assert.equal(destination.searchParams.get('demo'),null)
    for(const flag of ['onboarding','firstRun']) assert.equal(destination.searchParams.get(flag),'1')
  }
  assert.equal(f.overview().get('manifestId'),'source-bound-manifest')
})

test('canonical arrival describes a selected star before its Enter Focus action',()=>{
  const f=fixture('?demo=1&memoryId=legacy-thread&node=legacy-thread',{component:'scene',memoryNodes:sceneNodes})
  const tree=f.render()
  assert.equal(tree.props['data-life-map-phase'],'arrival')
  const status=descendants(tree).find(el=>el.props.className==='life-map-status')
  assert.equal(status.props.children[0].props.children,'At the selected Memory Star')
  assert.ok(descendants(tree).find(el=>el.props.className==='focus-threshold'))
})

// Extract and execute the production callbacks rather than reimplementing their
// query rules. Hook, browser, and world-state edges remain synthetic.
const printer=ts.createPrinter()
const parse=relative=>ts.createSourceFile(relative,fs.readFileSync(relative,'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX)
function declaration(file,name) {
  let result
  const visit=node=>{if((ts.isVariableDeclaration(node)||ts.isFunctionDeclaration(node))&&node.name?.getText(file)===name)result=node;ts.forEachChild(node,visit)}
  visit(file);assert.ok(result,'Production declaration missing: '+name);return result
}
const print=(file,node)=>printer.printNode(ts.EmitHint.Unspecified,node,file)
const focusFile=parse('src/app/focus/FocusChamberClient.tsx')
const replayHrefCallback=print(focusFile,declaration(focusFile,'replayHref').initializer.arguments[0])
const returnFile=parse('src/spatial/world/WorldTransitionController.tsx')
const returnDependencies=[
  'const '+print(returnFile,declaration(returnFile,'CONTEXT_KEYS'))+';',
  ...['buildTravelHref','destinationFromOriginRealm','fallbackReturnDestination'].map(name=>print(returnFile,declaration(returnFile,name))),
].join('\n')
const returnCallback=print(returnFile,declaration(returnFile,'reverseTravel').initializer.arguments[0])
function execute(source,globals) {
  const module={exports:{}}
  const compiled=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText
  vm.runInNewContext(compiled,{exports:module.exports,module,URL,URLSearchParams,...globals})
  return module.exports
}
function replayDestination(memory,current) {
  // replayHref is the actual Focus production callback, extracted unchanged.
  // Bind its actual authorization dependency, never a permissive node match.
  // This Life Map roundtrip does not model a verified Focus-neighbor selection:
  // null is deliberately fail-closed, not an invented authorized node.
  const href=execute('exports.href = ('+replayHrefCallback+')();',{
    memory, location:current.href, window:{location:current},
    selectedNode:null,
    isAuthorizedFocusNeighborReturn,
    forwardPrivateMovieRouteSelection:privateLifeMovieRouteSelection.forwardPrivateMovieRouteSelection,
  }).href
  return new URL(href,current)
}
function returnDestination(memory,destination,previousDestination,current) {
  let request
  const owner=execute(returnDependencies+'\nexports.buildTravelHref=buildTravelHref;\n('+returnCallback+')();',{
    window:{location:current},definitionForDestination,previousDestinationForReturn,
    worldRef:{current:{destination,previousDestination,memoryId:memory.id,replayManifestId:memory.replayManifest.id,demo:memory.demo}},
    phaseRef:{current:'idle'},executeTravel:value=>{request=value},
  })
  assert.ok(request);return new URL(owner.buildTravelHref(request),current)
}
function loadedMemory(destination) {
  const result=fixture(destination.search,{component:'memory'}).render()
  assert.equal(result.status,'demo');assert.ok(result.memory);return result.memory
}

for(const sample of canonicalLifeMapDemoNodes.filter(sample=>!sample.locked)) test('declared '+sample.id+' sample keeps title and tuple through Focus Replay Focus LifeMap',()=>{
  const f=fixture('?demo=1',{component:'scene',memoryNodes:canonicalLifeMapDemoNodes})
  f.select(1,sample.id)
  const focusDestination=f.destination('focus')
  const expectedManifest=sample.id==='quiet-reset'?'replay-recovery-thread':sample.id
  assert.equal(focusDestination.searchParams.get('memoryId'),sample.id)
  assert.equal(focusDestination.searchParams.get('node'),sample.id)
  const memory=loadedMemory(focusDestination)
  assert.equal(memory.title,sample.title);assert.equal(memory.id,'demo:'+sample.id);assert.equal(memory.star.id,sample.id)
  assert.equal(focusDestination.searchParams.get('manifestId'),expectedManifest)
  if(sample.id!=='quiet-reset') {
    assert.deepEqual(memory.people,[]);assert.equal(memory.place,undefined);assert.equal(memory.emotionalState,'not recorded')
    assert.ok(memory.summary.includes(sample.summary));assert.equal(memory.occurredAt,sample.occurredAt)
  }
  const replay=replayDestination(memory,focusDestination)
  const returnedFocus=returnDestination(loadedMemory(replay),'replay','focus',replay)
  assert.equal(returnedFocus.pathname,'/focus')
  const returnedLifeMap=returnDestination(loadedMemory(returnedFocus),'focus','replay',returnedFocus)
  assert.equal(returnedLifeMap.pathname,'/life-map')
  for(const destination of [replay,returnedFocus,returnedLifeMap]) {
    assert.equal(destination.searchParams.get('memoryId'),'demo:'+sample.id)
    assert.equal(destination.searchParams.get('node'),sample.id)
    assert.equal(destination.searchParams.get('manifestId'),expectedManifest)
    assert.equal(destination.searchParams.get('demo'),'1')
  }
  // Focus unwinds outward into the actual Life Map OVERVIEW. A stale URL
  // node hint must not silently reopen its memory or bypass the overview.
  // Memory identity remains in the authorized demo URL for explicit re-entry.
  assert.equal(returnedLifeMap.searchParams.get('overview'),'1')
  const restored=fixture(returnedLifeMap.search,{component:'scene',memoryNodes:canonicalLifeMapDemoNodes})
  const overviewScene=restored.render()
  assert.equal(overviewScene.props['data-life-map-mode'],'overview')
  assert.equal(overviewScene.props['data-life-map-phase'],'overview')
  const overviewTitle=descendants(overviewScene).find(element=>element.props.className==='life-map-title')
  assert.equal(overviewTitle.props.children[1].props.children,'Your living universe')
  // A deliberate second star selection, not URL hydration, restores the
  // original disclosed sample and its one canonical replay manifest.
  const reselected=restored.select(1,sample.id)
  assert.equal(reselected.get('node'),sample.id)
  assert.equal(reselected.get('memoryId'),sample.id)
  assert.deepEqual(reselected.getAll('manifestId'),[expectedManifest])
  assert.equal(reselected.get('demo'),'1')
  const selectedScene=restored.render()
  assert.equal(selectedScene.props['data-life-map-mode'],'selected')
  assert.equal(selectedScene.props['data-life-map-phase'],'arrival')
  const title=descendants(selectedScene).find(element=>element.props.className==='life-map-title')
  assert.equal(title.props.children[1].props.children,sample.title)
})

test('registered launch stars retain their existing named demo authority',()=>{
  assert.equal(DEMO_MEMORY_STAR_NODES.length,7)
  for(const star of DEMO_MEMORY_STAR_NODES) {
    const memory=buildNamedExplicitDemoMemory('demo:'+star.id)
    assert.equal(memory.title,star.title);assert.equal(memory.star.id,star.id);assert.equal(memory.replayManifest.id,star.id)
    assert.equal(memory.occurredAt,star.createdAt);assert.equal(memory.emotionalState,star.emotionalSignature.primary)
    assert.deepEqual(memory.people,[]);assert.equal(memory.place,undefined)
  }
})

test('unknown identities and locked samples retain the existing generic fallback',()=>{
  for(const id of ['demo:unknown-sample','legacy-thread',...canonicalLifeMapDemoNodes.filter(sample=>sample.locked).map(sample=>'demo:'+sample.id)]) {
    assert.deepEqual(buildNamedExplicitDemoMemory(id),selectedMemoryContract.buildExplicitDemoMemory(id))
  }
})

test('a declared sample ID does not open a demo without the exact disclosure flag',()=>{
  for(const flag of ['', '0', 'true', '01']) {
    const result=fixture('?memoryId=legacy-thread&demo='+flag,{component:'memory'}).render()
    assert.equal(result.memory,null);assert.equal(result.status,'unavailable')
  }
})
