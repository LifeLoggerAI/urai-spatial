import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
import vm from 'node:vm'
import ts from 'typescript'
import { localizedMessage } from '../src/lib/i18n/localePreference.ts'

const source = fs.readFileSync('src/components/lifemap/LifeMapSemanticNavigator.tsx', 'utf8')
const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText
function loadMessages(name, imports = {}) {
  const code = ts.transpileModule(fs.readFileSync('src/lib/i18n/' + name + '.ts', 'utf8'), {compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText
  const module = {exports:{}}
  vm.runInNewContext(code,{exports:module.exports,module,require:id=>{assert.ok(id in imports);return imports[id]}},{filename:'actual-'+name+'.ts'})
  return module.exports
}
const messages = loadMessages('locales', {'./coreMessages':loadMessages('coreMessages'),'./journeyMessages':loadMessages('journeyMessages'),'./journeyControlMessages':loadMessages('journeyControlMessages',{'./journeyControlTranslations':loadMessages('journeyControlTranslations')})}).URAI_SOURCE_MESSAGES
const node = { id:'quiet-reset', title:'The Quiet Reset', type:'recovery', eraId:'threshold-return', connectedTo:[], summary:'Disclosed test memory', dateLabel:'Now', replayAvailable:true }
function descendants(tree) {
  if (!tree || typeof tree !== 'object') return []
  const children = tree.props?.children
  return [tree, ...(Array.isArray(children) ? children.flat(Infinity) : [children]).flatMap(descendants)]
}
function fixture(search) {
  let cursor = 0, dirty = false, queued = []
  const slots = [], listeners = new Map(), calls = []
  const browser = { location:new URL('http://localhost/life-map' + search), addEventListener:(name, handler) => listeners.set(name, handler), removeEventListener:(name, handler) => { if (listeners.get(name) === handler) listeners.delete(name) } }
  browser.history = { state:{}, replaceState(_state, _title, destination) { calls.push({kind:'identity', destination}); browser.location = new URL(destination, browser.location) } }
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
  const element = (type,props,key) => ({type,props:props ?? {},key})
  const router = {replace(destination,options) {calls.push({kind:'router',destination,options})},push(destination) {calls.push({kind:'destination',destination})}}
  const imports = {
    react, 'react/jsx-runtime':{jsx:element,jsxs:element,Fragment:Symbol('fragment')},
    'react-dom':{createPortal:tree=>tree}, 'next/navigation':{useRouter:()=>router,useSearchParams:()=>browser.location.searchParams},
    './lifeMapData':{lifeMapTypeLabels:{recovery:'Recovery'}}, './lifeMapSelection':{requestLifeMapSelection(id,activation) {calls.push({kind:'world-selection',id,activation,identity:new URL(browser.location).search})}},
    './useLifeMapEvents':{useLifeMapEvents:()=>({nodes:[node],eras:[],loading:false,sourceMode:search.includes('demo=1')?'explicit-demo':'private'})},
    '@/lib/i18n/localePreference':{localizedMessage},
    '@/lib/i18n/useUraiLocale':{useUraiLocale:()=>({preference:{requested:'en',preview:false},locale:'en',text:key=>{assert.ok(messages[key]);return messages[key].source},props:()=>({lang:'en',dir:'ltr'}),formatProps:{},number:String})},
    '@/lib/i18n/JourneyOfflineNotice':{__esModule:true,default:()=>null},
  }
  const module = {exports:{}}
  vm.runInNewContext(compiled,{exports:module.exports,module,require:id=>{assert.ok(id in imports,'Unexpected import '+id);return imports[id]},window:browser,document:{body:{}},URLSearchParams,HTMLElement:class {},Element:class {}},{filename:'actual-LifeMapSemanticNavigator.tsx'})
  const render = () => {
    for (let pass=0;pass<12;pass++) {cursor=0;dirty=false;const tree=module.exports.default({authenticatedUserId:'synthetic-owner'});const effects=queued;queued=[];effects.forEach(effect=>effect());if(!dirty)return tree}
    throw Error('Actual navigator hooks did not settle')
  }
  const open = () => {descendants(render()).find(el=>el.props['data-testid']==='life-map-semantic-trigger').props.onClick();return render()}
  return {calls,browser,render,open,select(detail=1) {const result=descendants(open()).find(el=>el.props['data-life-map-node-id']==='quiet-reset');assert.ok(result);result.props.onClick({detail});return browser.location.searchParams}}
}

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
  const f=fixture(search);const q=f.select();assert.equal(q.get('manifestId'),null);assert.equal(q.get('demo'),null);assert.equal(q.get('memoryId'),'quiet-reset')
})
for (const demo of [false,true]) test('actual '+(demo?'disclosed demo':'private')+' selection preserves an existing explicit manifest',()=>{
  const f=fixture('?manifestId=existing-source-manifest'+(demo?'&demo=1':''));const q=f.select();assert.equal(q.get('manifestId'),'existing-source-manifest');assert.equal(q.getAll('manifestId').length,1)
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
