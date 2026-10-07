import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import { createRequire } from 'node:module'
import test from 'node:test'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import ts from 'typescript'
import { URAI_CATALOGS, URAI_LAUNCH_LOCALES, URAI_NATIVE_REVIEWED_LOCALES, URAI_SOURCE_MESSAGES, runtimeUraiLocale } from '../src/lib/i18n/locales.ts'
import { URAI_JOURNEY_MESSAGES } from '../src/lib/i18n/journeyMessages.ts'
import { localizedMessage, localeNumber, localeDate } from '../src/lib/i18n/localePreference.ts'
import { homeJourneyHref } from '../src/spatial/navigation/homeSkyInteraction.ts'
import * as homeGeometry from '../src/spatial/layout/HomeSanctuaryGeometry.ts'
import { localizationMessageBindings } from '../../scripts/lib/localization-message-bindings.mjs'

const require = createRequire(import.meta.url)
const journeyIds = Object.keys(URAI_JOURNEY_MESSAGES)
const codeCache = new Map()
const quality = {tier:'fixture',pixelRatioMax:1,documentVisible:false,reducedMotion:true,shadows:false,antialias:false}

function fixture(preference, {memory=null,status='unavailable',message='No selected memory was provided.',states=[],webgl=false,phase='HOME',nodes=[],loading=false,online=true}={}) {
  let stateIndex = 0
  const travels = []
  const locale = {
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
    if(id.includes('useUraiLocale')) return {useUraiLocale:()=>locale}
    if(id.includes('JourneyOfflineNotice')) return {__esModule:true,default:load('../src/lib/i18n/JourneyOfflineNotice.tsx').default}
    if(id.includes('homeSkyInteraction')) return {homeJourneyHref}
    if(id.includes('HomeSpatialCanvas')) return {useWebGLAvailable:()=>webgl}
    if(id.includes('useSelectedMemory')) return {useSelectedMemory:()=>({memory,status,message})}
    if(id.includes('useAdaptiveSpatialQuality')) return {useAdaptiveSpatialQuality:()=>quality}
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
  assert.equal(Object.keys(URAI_SOURCE_MESSAGES).length,64)
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
  const memory={id:'private-fixture',title:malicious,narrator:{focus:malicious},privacy:'private',demo:false,occurredAt:'2026-10-07T00:00:00Z',visuals:{accent:'#fff',light:'#fff',sky:'#000',ground:'#000'},star:{id:'private-fixture'},replayManifest:{id:'manifest'},people:[],emotionalState:'fixture',place:null}
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
  const memory={id:'private-fixture',title:'Private <script>title</script>',narrator:{replay:'Private caption'},privacy:'private',demo:false,visuals:{accent:'#fff',light:'#fff',sky:'#000',ground:'#000'},star:{id:'private-fixture'},replayManifest:{id:'manifest',durationMs:1000,segments:[]}}
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
