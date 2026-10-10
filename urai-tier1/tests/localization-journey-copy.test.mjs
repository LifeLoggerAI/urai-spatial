import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import { createRequire } from 'node:module'
import test from 'node:test'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import ts from 'typescript'
import { URAI_CATALOGS, URAI_LAUNCH_LOCALES, URAI_NATIVE_REVIEWED_LOCALES, URAI_SOURCE_MESSAGES, runtimeUraiLocale } from '../src/lib/i18n/locales.ts'
import { URAI_JOURNEY_CONTROL_MESSAGES } from '../src/lib/i18n/journeyControlMessages.ts'
import { URAI_GEOGRAPHIC_MESSAGES } from '../src/lib/i18n/geographicMessages.ts'
import { URAI_FOUNDER_MESSAGES } from '../src/lib/i18n/founderMessages.ts'
import { URAI_FOCUS_COMPATIBILITY_MESSAGES } from '../src/lib/i18n/focusCompatibilityMessages.ts'
import * as journeyControlCopy from '../src/lib/i18n/journeyControlCopy.ts'
import { URAI_JOURNEY_MESSAGES } from '../src/lib/i18n/journeyMessages.ts'
import { localizedMessage, localeNumber, localeDate } from '../src/lib/i18n/localePreference.ts'
import { homeJourneyHref } from '../src/spatial/navigation/homeSkyInteraction.ts'
import * as homeGeometry from '../src/spatial/layout/HomeSanctuaryGeometry.ts'
import * as homeRenderCostPolicy from '../src/spatial/performance/homeRenderCostPolicy.ts'
import * as focusMemoryAppearance from '../src/app/focus/focusMemoryAppearance.ts'
import { localizationMessageBindings } from '../../scripts/lib/localization-message-bindings.mjs'

const require = createRequire(import.meta.url)
const journeyIds = Object.keys(URAI_JOURNEY_MESSAGES)
const codeCache = new Map()
const quality = {tier:'fixture',pixelRatioMax:1,documentVisible:false,reducedMotion:true,shadows:false,antialias:false}

function fixture(preference, {memory=null,status='unavailable',message='No selected memory was provided.',states=[],webgl=false,phase='HOME',nodes=[],loading=false,online=true}={}) {
  let stateIndex = 0
  const travels = []
  const locale = {
    preference,
    locale:preference.preview ? preference.requested : 'en',
    text:(id,values) => localizedMessage(preference,id,values).text,
    props:id => {const m=localizedMessage(preference,id); return {lang:m.locale,dir:m.direction,'data-urai-translation-preview':String(m.preview)}},
    formatProps:{lang:'en',dir:'ltr'}, number:n=>localeNumber(preference,n), date:(v,o)=>localeDate(preference,v,o),
  }
  const browser = new EventTarget()
  browser.navigator = {onLine:online}
  const params = new URLSearchParams()
  const hooks = {...React,
    useState:initial => [stateIndex in states ? states[stateIndex++] : (stateIndex++, typeof initial==='function' ? initial() : initial),()=>{}],
    useEffect:()=>{}, useLayoutEffect:()=>{}, useMemo:fn=>fn(), useCallback:fn=>fn, useRef:value=>({current:value}),
    useSyncExternalStore:(_subscribe,snapshot)=>snapshot(),
  }
  const unknown = new Proxy({__esModule:true,default:()=>null},{get:(target,key)=>key in target ? target[key] : ()=>{throw new Error(`UNEXPECTED_FIXTURE_CALL:${String(key)}`)}})
  const imports = id => {
    if(id==='react') return hooks
    if(id==='react/jsx-runtime') return require(id)
    if(id==='react-dom') return {createPortal:children=>children}
    if(id==='three') return require('three')
    if(id.includes('RoundedBoxGeometry')) return {RoundedBoxGeometry:require('three').BoxGeometry}
    if(id==='next/navigation') return {usePathname:()=>'/home',useSearchParams:()=>params,useRouter:()=>({push:href=>travels.push(href),replace:href=>travels.push(href)})}
    if(id.includes('ownedMemoryMediaClient')) return {MEMORY_MEDIA_TYPES:'image/png,audio/mpeg,video/mp4',attachOwnedMemoryFile:async()=>{throw new Error('INERT_NO_UPLOAD')}}
    if(id.includes('localePreference')) return {localizedMessage}
    if(id.includes('journeyControlCopy')) return journeyControlCopy
    if(id.includes('replayServerTransport')) return {createAuthenticatedReplayTransport:()=>async()=>{throw new Error('INERT_NO_TRANSPORT')},readAuthenticatedReplayServerState:async()=>{throw new Error('INERT_NO_TRANSPORT')}}
    if(id.includes('useUraiLocale')) return {useUraiLocale:()=>locale}
    if(id.includes('JourneyOfflineNotice')) return {__esModule:true,default:load('../src/lib/i18n/JourneyOfflineNotice.tsx').default}
    if(id.includes('homeSkyInteraction')) return {homeJourneyHref}
    if(id.includes('HomeSpatialCanvas')) return {useWebGLAvailable:()=>webgl}
    if(id.includes('useSelectedMemory')) return {useSelectedMemory:()=>({memory,status,message})}
    if(id.includes('useReplayMemoryVisibility')) return {useReplayMemoryVisibility:()=>memory ? 'visible' : 'unavailable'}
    if(id.includes('useOwnedMemoryMediaPlayback')) return {useOwnedMemoryMediaPlayback:()=>({status:'absent',media:[]})}
    if(id.includes('useAdaptiveSpatialQuality')) return {useAdaptiveSpatialQuality:()=>quality}
    if(id.includes('homeRenderCostPolicy')) return homeRenderCostPolicy
    if(id.includes('useReducedMotion')) return {useReducedMotion:()=>true}
    if(id.includes('useReplayLifeModelAuthority')) return {useReplayLifeModelAuthority:()=>({available:false,status:'blocked',decision:'fixture',people:[]})}
    if(id.includes('useCapturedRealityReplayEntry')) return {useCapturedRealityReplayLookup:()=>({entry:null,status:'unavailable'})}
    if(id.includes('useInterpretiveWorldReplayEntry')) return {useInterpretiveWorldReplayEntry:()=>null}
    if(id.includes('WorldStateProvider')) return {useUraiWorldState:()=>({world:{previousDestination:'focus'}})}
    if(id.includes('replayVisualAdmission')) return {replayVisualAdmission:()=>({kind:'neutral',media:null}),replaySessionIdentity:()=> 'fixture'}
    if(id.includes('replayMediaSession')) return {initialReplayVideoSnapshot:()=>({status:'paused',error:null,durationMs:1000,ready:true,audioAllowed:false,muted:true})}
    if(id.includes('uraiAssets')) return {assetCssStack:()=>'',focusAssets:{primary:{src:'fixture://focus'}},replayAssets:{primary:{src:'fixture://replay'}}}
    if(id.includes('useLifeMapEvents')) return {useLifeMapEvents:()=>({nodes,eras:[],loading,sourceMode:'private'})}
    if(id.includes('lifeMapData')) return {lifeMapTypeLabels:{memory:'Memory'}}
    if(id.includes('worldEvents')) return {requestUraiWorldTravel:request=>travels.push(request),requestUraiWorldReturn:()=>travels.push('return'),requestUraiWorldOrbOpen:()=>travels.push('orb')}
    if(id.includes('useSceneStore')) {const scene={phase,progress:0,inputLocked:false}; return {useSceneStore:Object.assign(selector=>selector(scene),{getState:()=>scene})}}
    if(id.includes('EmbodiedNavigation')) return {useMovementInput:()=>({}),useDragLook:()=>({}),MobileMovementPad:()=>null}
    if(id.includes('orbStateController')) return {resolveOrbSensoryOutput:()=>({animation:'settled',material:'neutral',movement:'settled',caption:''})}
    if(id.includes('HomeInterpretiveSplat')) return {resolveHomeInterpretiveSplatAsset:()=>null,HomeInterpretiveSplatEnvironment:()=>null}
    if(id.includes('HomeSanctuaryGeometry')) return homeGeometry
    if(id.includes('focusMemoryAppearance')) return focusMemoryAppearance
    if(id==='@react-three/drei') return {useGLTF:Object.assign(()=>({}),{preload:()=>{},clear:()=>{}})}
    if(id.endsWith('.module.css')) return {__esModule:true,default:new Proxy({},{get:(_target,key)=>String(key)})}
    return unknown
  }
  const modules = new Map()
  function load(file) {
    if(modules.has(file)) return modules.get(file)
    if(!codeCache.has(file)) {
      const source=fs.readFileSync(new URL(file,import.meta.url),'utf8')
      codeCache.set(file,ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText)
    }
    const module={exports:{}}
    vm.runInNewContext(codeCache.get(file),{module,exports:module.exports,require:imports,window:browser,document:{body:{}},process:{env:{NODE_ENV:'test'}},URLSearchParams,console},{filename:file})
    modules.set(file,module.exports)
    return module.exports
  }
  function expand(element) {
    if(element===null || element===undefined || typeof element==='boolean') return null
    if(Array.isArray(element)) return element.map(expand)
    if(!React.isValidElement(element)) return element
    if(typeof element.type==='function') {
      if(['HomeSemanticNavigation','ReplayMemoryHorizon','ReplayMemoryExperience','JourneyOfflineNotice'].includes(element.type.name)) {stateIndex=0;return expand(element.type(element.props))}
      return null // Synthetic copy/controls fixture does not certify scene, device or providers.
    }
    const props={...element.props};delete props.jsx;delete props.global
    return React.createElement(element.type,props,expand(element.props.children))
  }
  function render(file,exportName='default',props={}) {
    stateIndex=0
    return expand(load(file)[exportName](props))
  }
  return {render,load,browser,travels}
}

function elements(tree, predicate) {
  const found=[]
  function visit(node) {
    if(Array.isArray(node)) {for(const child of node)visit(child);return}
    if(!React.isValidElement(node)) return
    if(predicate(node)) found.push(node)
    visit(node.props.children)
  }
  visit(tree);return found
}
function text(node) {
  if(Array.isArray(node)) return node.map(text).join('')
  if(React.isValidElement(node)) return text(node.props.children)
  return node===null || node===undefined || typeof node==='boolean' ? '' : String(node)
}
const focus='../src/app/focus/FocusChamberClient.tsx'
const replay='../src/app/replay/CinematicReplayClient.tsx'
const home='../src/app/HomeSpatialRuntimeLayer.tsx'
const ascent='../src/spatial/layout/HomeWorldProductionPolished.tsx'
const lifeMap='../src/components/lifemap/LifeMapSemanticNavigator.tsx'

test('new journey catalog is exact, nonempty and prepared for the twenty governed locales',()=>{
  assert.equal(journeyIds.length,44)
  assert.equal(URAI_LAUNCH_LOCALES.length,20)
  assert.deepEqual([...URAI_NATIVE_REVIEWED_LOCALES],['en'])
  assert.equal(Object.keys(URAI_SOURCE_MESSAGES).length,64 + Object.keys(URAI_JOURNEY_CONTROL_MESSAGES).length + Object.keys(URAI_GEOGRAPHIC_MESSAGES).length + Object.keys(URAI_FOUNDER_MESSAGES).length + Object.keys(URAI_FOCUS_COMPATIBILITY_MESSAGES).length)
  for(const locale of URAI_LAUNCH_LOCALES) for(const id of journeyIds) {
    assert.ok(URAI_CATALOGS[locale][id]?.trim(),`${locale}:${id}`)
    assert.equal(URAI_SOURCE_MESSAGES[id].id,id)
    if(locale==='en') assert.equal(URAI_CATALOGS[locale][id],URAI_SOURCE_MESSAGES[id].source)
    const placeholders=value=>(value.match(/\{[a-zA-Z]+\}/g)??[]).sort()
    assert.deepEqual(placeholders(URAI_CATALOGS[locale][id]),placeholders(URAI_SOURCE_MESSAGES[id].source))
  }
})

for(const requested of URAI_LAUNCH_LOCALES) {
  test(`${requested}: unreviewed preference leaves every journey message in reviewed English`,()=>{
    for(const id of journeyIds) {
      const result=localizedMessage({requested,preview:false},id)
      assert.equal(result.text,URAI_SOURCE_MESSAGES[id].source)
      assert.equal(result.locale,'en');assert.equal(result.direction,'ltr');assert.equal(result.preview,false)
    }
    assert.equal(runtimeUraiLocale(requested),'en')
  })
  test(`${requested}: actual core TSX copy branches use scoped working preview and preserve navigation`,()=>{
    const pref={requested,preview:true}
    const f=fixture(pref,{states:[false,0,false,true,null,'ready']})
    const focusTree=f.render(focus)
    const heading=elements(focusTree,n=>n.type==='h2')[0]
    assert.equal(text(heading),localizedMessage(pref,'focus.heading').text)
    assert.equal(heading.props.lang,requested)
    assert.equal(heading.props.dir,['ar','ur','fa'].includes(requested)?'rtl':'ltr')
    assert.equal(elements(focusTree,n=>n.type==='main')[0].props.lang,undefined,'private descendants must not inherit a preview language')
    assert.ok(text(focusTree).includes(localizedMessage(pref,'focus.instructions').text))
    assert.ok(text(focusTree).includes(localizedMessage(pref,'common.spatialUnavailable').text))
    const r=fixture(pref,{states:['unavailable',0]})
    const replayTree=r.render(replay)
    assert.equal(text(elements(replayTree,n=>n.type==='h1')[0]),localizedMessage(pref,'replay.choosePrompt').text)
    const choose=elements(replayTree,n=>n.type==='button' && text(n)===localizedMessage(pref,'replay.chooseMemory').text)[0]
    choose.props.onClick()
    assert.deepEqual(JSON.parse(JSON.stringify(r.travels)),[{destination:'life-map',href:'/life-map/',entryPortal:'replay-memory-horizon',cameraCheckpoint:'life-map-overview'}])
    const h=fixture(pref).render(home)
    assert.ok(text(h).includes(localizedMessage(pref,'home.webglUnavailable').text))
    assert.equal(elements(h,n=>n.props['data-testid']==='home-semantic-life-map')[0].props.href,'/life-map/?from=home-sky&entryPortal=home-sky&cameraCheckpoint=home-sky-ascent-complete')
    const a=fixture(pref,{phase:'ASCENT'}).render(ascent,'HomeWorldProductionPolished')
    assert.equal(text(elements(a,n=>String(n.props.className).includes('home-world-context'))[0]),localizedMessage(pref,'ascent.progress').text)
    const l=fixture(pref,{states:['','all','all',true,true]}).render(lifeMap)
    assert.ok(text(l).includes(localizedMessage(pref,'lifeMap.noResults').text))
    assert.equal(elements(l,n=>n.type==='input')[0].props.placeholder,localizedMessage(pref,'lifeMap.searchHint').text)
    const pending=fixture(pref,{states:['','all','all',true,true],loading:true}).render(lifeMap)
    assert.ok(text(pending).includes(localizedMessage(pref,'lifeMap.opening').text))
  })
}

test('sensitive private-world and policy copy retain reviewed fallback during all working previews',()=>{
  for(const requested of URAI_LAUNCH_LOCALES) for(const id of ['home.forming','privacy.reviewRequired']) {
    const result=localizedMessage({requested,preview:true},id)
    assert.equal(result.locale,'en');assert.equal(result.direction,'ltr');assert.equal(result.preview,false)
    assert.equal(result.text,URAI_SOURCE_MESSAGES[id].source)
  }
})

test('missing prepared entry falls back with matching English language and direction',()=>{
  const previous=URAI_CATALOGS.ar['focus.heading']
  try {
    delete URAI_CATALOGS.ar['focus.heading']
    const f=fixture({requested:'ar',preview:true},{states:[false,0,false,true,null,'ready']})
    const h=elements(f.render(focus),n=>n.type==='h2')[0]
    assert.equal(text(h),'Focus Memory Star');assert.equal(h.props.lang,'en');assert.equal(h.props.dir,'ltr')
  } finally {URAI_CATALOGS.ar['focus.heading']=previous}
})

test('actual Focus text leaves preserve long RTL/private strings and React escapes markup',()=>{
  const malicious='<img src=x onerror="alert(1)"> & private <script>identity</script>'
  const memory={id:'private-fixture',title:malicious,narrator:{focus:malicious},privacy:'private',demo:false,occurredAt:'2026-10-07T00:00:00Z',visuals:{accent:'#fff',light:'#fff',sky:'#000',ground:'#000'},star:{id:'private-fixture'},replayManifest:{id:'manifest'},people:[],emotionalState:'fixture',place:null,sourceMedia:[]}
  const rendered=fixture({requested:'ar',preview:true},{memory,states:[false,0,false,true,null,'ready']}).render(focus)
  const heading=elements(rendered,n=>n.type==='h2')[0]
  assert.equal(text(heading),malicious);assert.equal(heading.props.lang,undefined);assert.equal(heading.props.dir,'auto')
  const html=renderToStaticMarkup(rendered)
  assert.ok(html.includes('&lt;img'));assert.ok(html.includes('&lt;script&gt;'));assert.ok(!html.includes('<script>identity'))
  const previous=URAI_CATALOGS.ar['focus.heading']
  const long='ذاكرة '.repeat(600)+'<svg onload=alert(1)>'
  try {
    URAI_CATALOGS.ar['focus.heading']=long
    const h=elements(fixture({requested:'ar',preview:true},{states:[false,0,false,true,null,'ready']}).render(focus),n=>n.type==='h2')[0]
    assert.equal(text(h),long);assert.equal(h.props.dir,'rtl');assert.equal(h.props.style.overflowWrap,'anywhere')
    const markup=renderToStaticMarkup(h)
    assert.ok(markup.includes('&lt;svg'));assert.ok(!markup.includes('<svg onload'))
  } finally {URAI_CATALOGS.ar['focus.heading']=previous}
})

test('offline notice follows actual browser events, preserves SSR truth and removes subscriptions',()=>{
  const f=fixture({requested:'ar',preview:true},{online:true})
  const module=f.load('../src/lib/i18n/JourneyOfflineNotice.tsx')
  assert.equal(module.journeyServerOnlineSnapshot(),true)
  assert.equal(module.journeyOnlineSnapshot(),true)
  let changed=0
  const stop=module.subscribeJourneyNetwork(()=>{changed++})
  f.browser.navigator.onLine=false;f.browser.dispatchEvent(new Event('offline'))
  assert.equal(changed,1);assert.equal(module.journeyOnlineSnapshot(),false)
  const notice=f.render('../src/lib/i18n/JourneyOfflineNotice.tsx')
  assert.equal(text(notice),URAI_CATALOGS.ar['common.offline']);assert.equal(notice.props.dir,'rtl');assert.equal(notice.props.role,'status')
  assert.equal(notice.props.style.whiteSpace,'normal');assert.equal(notice.props.style.overflowWrap,'anywhere')
  f.browser.navigator.onLine=true;f.browser.dispatchEvent(new Event('online'))
  assert.equal(changed,2);assert.equal(f.render('../src/lib/i18n/JourneyOfflineNotice.tsx'),null)
  stop();f.browser.dispatchEvent(new Event('offline'));assert.equal(changed,2)
  delete f.browser.navigator.onLine;assert.equal(module.journeyOnlineSnapshot(),true)
})

test('actual private Replay play/pause labels retain exact English and scoped French/Arabic preview',()=>{
  const memory={id:'private-fixture',occurredAt:'2026-01-01T12:00:00.000Z',title:'Private <script>title</script>',narrator:{replay:'Private caption'},privacy:'private',demo:false,visuals:{accent:'#fff',light:'#fff',sky:'#000',ground:'#000'},star:{id:'private-fixture'},replayManifest:{id:'manifest',durationMs:1000,segments:[]}}
  for(const requested of ['en','fr','ar']) for(const preview of [false,true]) for(const playing of [false,true]) {
    const preference={requested,preview}
    const tree=fixture(preference,{memory,status:'ready',states:['unavailable',0,playing,0]}).render(replay)
    const button=elements(tree,n=>n.props.className==='memoryPulse')[0]
    const id=playing?'replay.pause':'replay.continue'
    const expected=localizedMessage(preference,id)
    assert.equal(button.props['aria-label'],expected.text)
    assert.equal(button.props.lang,expected.locale);assert.equal(button.props.dir,expected.direction)
    assert.equal(button.props['aria-pressed'],playing)
    assert.equal(text(button),(playing?'Ⅱ':'›')+expected.text)
    assert.equal(elements(tree,n=>n.type==='main')[0].props.lang,undefined)
    assert.equal(text(elements(tree,n=>n.type==='h1')[0]),memory.title)
    const occurredAt=elements(tree,n=>n.type==='time')[0]
    assert.equal(occurredAt.props.dateTime,memory.occurredAt)
    assert.equal(text(occurredAt),localeDate(preference,memory.occurredAt,{dateStyle:'medium'}))
    assert.equal(elements(tree,n=>n.props.className==='replayMemoryOrigin')[0].props.children.filter(Boolean).length,1)
    assert.ok(renderToStaticMarkup(tree).includes('&lt;script&gt;title&lt;/script&gt;'))
  }
})

test('both native unit runners and readiness workflow execute this nonempty journey suite',()=>{
  for(const file of ['../scripts/run-unit-contract-tests.mjs','../scripts/run-unit-contract-tests-compact.mjs']) {
    const source=fs.readFileSync(new URL(file,import.meta.url),'utf8')
    assert.ok(source.includes("'tests/localization-journey-copy.test.mjs'"))
    assert.ok(source.includes("'tests/operational-export-client.test.mjs'"))
  }
  const workflow=fs.readFileSync(new URL('../../.github/workflows/localization-readiness-evidence.yml',import.meta.url),'utf8')
  assert.ok(workflow.includes('tests/localization-journey-copy.test.mjs'))
})

test('every new journey message is reached by an actual literal or const-branch consumer',()=>{
  const wired=new Set()
  for(const file of [focus,replay,home,ascent,lifeMap,'../src/lib/i18n/JourneyOfflineNotice.tsx']) {
    const source=fs.readFileSync(new URL(file,import.meta.url),'utf8')
    for(const id of localizationMessageBindings(source,URAI_SOURCE_MESSAGES,file)) wired.add(id)
  }
  for(const id of journeyIds) assert.ok(wired.has(id),`new key is not actually wired:${id}`)
})

test('readiness resolves lexical const branches while rejecting false and unresolved coverage',()=>{
  const source=`
    // locale.text('privacy.reviewRequired')
    const unused='privacy.reviewRequired';
    const key = selected ? 'focus.heading' : 'focus.resting';
    function another(){ const key='nav.home'; return locale.text(key); }
    function nested(){ const key=loading?'focus.loading':null; return key?locale.props(key):null; }
    locale.text(key); locale.props(ready?'focus.ready':'focus.neutral');
    const privateText="locale.text('privacy.reviewRequired')";
  `
  assert.deepEqual(localizationMessageBindings(source,URAI_SOURCE_MESSAGES),['focus.heading','focus.loading','focus.neutral','focus.ready','focus.resting','nav.home'])
  assert.throws(()=>localizationMessageBindings("locale.text('not.registered')",URAI_SOURCE_MESSAGES),/LOCALIZATION_UNREGISTERED_MESSAGE_ID/)
  assert.throws(()=>localizationMessageBindings('locale.text(providerOutput)',URAI_SOURCE_MESSAGES),/LOCALIZATION_UNRESOLVED_MESSAGE_ID/)
  assert.throws(()=>localizationMessageBindings("let key='nav.home';locale.props(key)",URAI_SOURCE_MESSAGES),/LOCALIZATION_MUTABLE_MESSAGE_ID/)
})


test('remaining journey catalogs are prepared for twenty locales without granting runtime or sensitive-copy acceptance',()=>{
  const ids=Object.keys(URAI_JOURNEY_CONTROL_MESSAGES)
  assert.equal(ids.length,99)
  const values={title:'عنوان خاص <script>private</script>',count:'2',action:'save',percent:'50',elapsed:'0:10',duration:'0:20'}
  for(const requested of URAI_LAUNCH_LOCALES) for(const id of ids) {
    const definition=URAI_JOURNEY_CONTROL_MESSAGES[id]
    const runtime=localizedMessage({requested,preview:false},id,values)
    assert.equal(runtime.locale,'en');assert.equal(runtime.direction,'ltr');assert.equal(runtime.preview,false)
    const copy=localizedMessage({requested,preview:true},id,values)
    const expectedLocale=definition.sensitivity==='general' ? requested : 'en'
    assert.equal(copy.locale,expectedLocale);assert.equal(copy.direction,['ar','ur','fa'].includes(expectedLocale)?'rtl':'ltr')
    assert.equal(copy.preview,expectedLocale!=='en');assert.ok(copy.text.trim())
    assert.equal(URAI_CATALOGS.en[id],definition.source)
    assert.ok(URAI_CATALOGS[requested][id]?.trim())
    const placeholders=value=>(value.match(/\{[a-zA-Z]+\}/g)??[]).sort()
    assert.deepEqual(placeholders(URAI_CATALOGS[requested][id]),placeholders(definition.source))
  }
})

test('actual Replay controls/correction preserve disabled demo actions and raw private values in every locale fallback',()=>{
  const malicious='<img src=x onerror="alert(1)"> نص خاص'
  for(const requested of URAI_LAUNCH_LOCALES) {
    const memory={id:'memory-fixture',ownerId:'owner-fixture',authorization:'owner',demo:true,summary:malicious,replayManifest:{id:'manifest-fixture'}}
    const state={saved:false,hidden:false,pending:[],audit:[]}
    const rendered=fixture({requested,preview:true},{states:[state,true,malicious,true,{id:'replay.demoReadOnly'}]}).render('../src/app/replay/ReplayProductControls.tsx','ReplayProductControls',{memory})
    const summary=elements(rendered,n=>n.type==='summary' && n.props['aria-label']===localizedMessage({requested,preview:true},'replay.controls').text)[0]
    const label=localizedMessage({requested,preview:true},'replay.controlSummary')
    assert.equal(text(summary),label.text);assert.equal(summary.props.lang,label.locale);assert.equal(summary.props.dir,label.direction)
    for(const name of ['Save','Hide','Correct']) assert.equal(elements(rendered,n=>n.type==='button'&&text(n)===name)[0].props.disabled,true)
    const textarea=elements(rendered,n=>n.type==='textarea')[0]
    assert.equal(textarea.props.value,malicious);assert.equal(textarea.props.dir,'auto');assert.equal(textarea.props.lang,undefined)
    assert.ok(text(rendered).includes('The original memory remains unchanged. Your correction updates only URAI’s interpretation.'))
    const html=renderToStaticMarkup(rendered)
    assert.ok(html.includes('&lt;img'));assert.equal(html.includes('<img src=x'),false)
  }
})

test('Replay status identities reformat pending counts without mutation and keep raw errors out of translated copy',()=>{
  const status={id:'replay.waitingChanges',count:12345}
  const before=JSON.stringify(status)
  for(const requested of URAI_LAUNCH_LOCALES) {
    const copy=journeyControlCopy.replayStatusCopy({requested,preview:true},status)
    assert.equal(copy.locale,'en');assert.equal(copy.direction,'ltr')
    assert.ok(copy.text.includes(new Intl.NumberFormat(copy.locale).format(12345)))
    const error={id:'replay.failedOperation',action:'replay.operationCorrect',detail:'خطأ خاص <script>private</script>'}
    const errorCopy=journeyControlCopy.replayStatusCopy({requested,preview:true},error)
    assert.equal(errorCopy.text,'correct failed.');assert.equal(errorCopy.text.includes(error.detail),false)
  }
  assert.equal(JSON.stringify(status),before)
  assert.throws(()=>journeyControlCopy.replayStatusCopy({requested:'en',preview:false},{id:'nav.home'}),/UNREGISTERED_REPLAY_STATUS/)
})

test('real Life Map labels resolve bounded type maps and preserve semantic result titles',()=>{
  const node={id:'private-node',type:'memory',title:'عنوان خاص',summary:'Private <script>value</script>',occurredAt:'2026-01-01T12:00:00Z',dateLabel:'private date',eraId:'fixture',connectedTo:[]}
  const rendered=fixture({requested:'ar',preview:true},{nodes:[node],states:['','all','all',true,true]}).render(lifeMap)
  const filter=elements(rendered,n=>n.props.id==='life-map-type-label')[0]
  const expected=localizedMessage({requested:'ar',preview:true},'lifeMap.filterType')
  assert.equal(text(filter),expected.text);assert.equal(filter.props.lang,'ar');assert.equal(filter.props.dir,'rtl')
  const result=elements(rendered,n=>n.props['data-life-map-node-id']==='private-node')[0]
  assert.equal(result.props['aria-label'],node.title);assert.equal(result.props.lang,undefined)
  assert.equal(elements(result,n=>n.type==='strong')[0].props.dir,'auto')
})

test('owned media copy migration preserves owner gate and explicit source fallback',()=>{
  const memory={id:'memory-fixture',ownerId:'owner-fixture',privacy:'private',demo:false}
  for(const requested of URAI_LAUNCH_LOCALES) {
    const rendered=fixture({requested,preview:true},{states:['owner-fixture',null,false,'memoryMedia.attached']}).render('../src/spatial/memory/MemoryMediaAttachment.tsx','default',{memory})
    assert.ok(text(rendered).includes('Attach a file'))
    const status=elements(rendered,n=>n.props.role==='status')[0]
    assert.equal(status.props.lang,'en');assert.equal(status.props.dir,'ltr')
    assert.match(text(status),/Preview is not available here/)
    const denied=fixture({requested,preview:true},{states:['other-owner',null,false,null]}).render('../src/spatial/memory/MemoryMediaAttachment.tsx','default',{memory})
    assert.equal(denied,null)
  }
})

test('message binding evidence admits actual immutable maps/helpers and rejects mutable or unregistered lookup contents',()=>{
  assert.deepEqual(localizationMessageBindings("const ids={first:'replay.save',second:'replay.hide'} as const; locale.text(ids[value])",URAI_SOURCE_MESSAGES),['replay.hide','replay.save'])
  assert.deepEqual(localizationMessageBindings("import { localizedMessage } from './localePreference'; localizedMessage(pref,'replay.save')",URAI_SOURCE_MESSAGES),['replay.save'])
  assert.throws(()=>localizationMessageBindings("let ids={first:'replay.save'}; locale.text(ids[value])",URAI_SOURCE_MESSAGES),/LOCALIZATION_MUTABLE_MESSAGE_ID/)
  assert.throws(()=>localizationMessageBindings("const ids={first:'unknown'}; locale.text(ids[value])",URAI_SOURCE_MESSAGES),/LOCALIZATION_UNREGISTERED_MESSAGE_ID/)
  assert.throws(()=>localizationMessageBindings("const ids={...other}; locale.text(ids[value])",URAI_SOURCE_MESSAGES),/LOCALIZATION_UNRESOLVED_MESSAGE_ID/)
})


test('sensitive status copy stays in reviewed English even when an RTL working translation exists, including blank fallback',()=>{
  const previous=URAI_CATALOGS.ar['replay.waitingChanges']
  try {
    URAI_CATALOGS.ar['replay.waitingChanges']='تغييرات تنتظر المزامنة: {count}.'
    const translated=journeyControlCopy.replayStatusCopy({requested:'ar',preview:true},{id:'replay.waitingChanges',count:12345})
    assert.equal(translated.locale,'en');assert.equal(translated.direction,'ltr');assert.equal(translated.preview,false)
    assert.equal(translated.text,'Changes waiting to sync: 12,345.')
    URAI_CATALOGS.ar['replay.waitingChanges']='   '
    const fallback=journeyControlCopy.replayStatusCopy({requested:'ar',preview:true},{id:'replay.waitingChanges',count:12345})
    assert.equal(fallback.locale,'en');assert.equal(fallback.direction,'ltr');assert.equal(fallback.preview,false)
    assert.equal(fallback.text,'Changes waiting to sync: 12,345.')
  } finally {if(previous===undefined) delete URAI_CATALOGS.ar['replay.waitingChanges'];else URAI_CATALOGS.ar['replay.waitingChanges']=previous}
})


test('new general-interface missing/blank translations report the actual gap and preserve English label direction',()=>{
  const id='lifeMap.filterEra', previous=URAI_CATALOGS.ar[id]
  try {
    for(const value of [undefined,'   ']) {
      if(value===undefined) delete URAI_CATALOGS.ar[id]; else URAI_CATALOGS.ar[id]=value
      const copy=localizedMessage({requested:'ar',preview:true},id)
      assert.deepEqual(copy,{text:'Filter by era',locale:'en',direction:'ltr',preview:false})
    }
  } finally {URAI_CATALOGS.ar[id]=previous}
})


test('actual Life Map search finds its displayed translated type while preserving private titles and original enum filters',()=>{
  const node={id:'private-node',type:'memory',title:'عنوان خاص',summary:'Private unchanged content',occurredAt:'2026-01-01T12:00:00Z',dateLabel:'private date',eraId:'fixture',connectedTo:[]}
  for(const requested of URAI_LAUNCH_LOCALES) {
    const label=localizedMessage({requested,preview:true},'lifeMap.type.memory').text
    const rendered=fixture({requested,preview:true},{nodes:[node],states:[label,'all','all',true,true]}).render(lifeMap)
    assert.equal(elements(rendered,n=>n.props['data-life-map-node-id']==='private-node').length,1,requested)
    const result=elements(rendered,n=>n.props['data-life-map-node-id']==='private-node')[0]
    assert.equal(result.props['aria-label'],node.title)
  }
  const turkish=fixture({requested:'tr',preview:true},{nodes:[{...node,type:'relationship'}],states:['ilişki','all','all',true,true]}).render(lifeMap)
  assert.equal(elements(turkish,n=>n.props['data-life-map-node-id']==='private-node').length,1,'Turkish dotted-I case folding must match the displayed relationship label')
})
