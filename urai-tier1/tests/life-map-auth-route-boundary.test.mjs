import assert from 'node:assert/strict'
import test from 'node:test'
import fs from 'node:fs'
import vm from 'node:vm'
import {createRequire} from 'node:module'

const require = createRequire(import.meta.url)
const ts = require('typescript')
const source = fs.readFileSync(new URL('../src/spatial/lifemap/SpatialLifeMapCanonical.tsx', import.meta.url), 'utf8')
const compiled = ts.transpileModule(source + '\nexport { LifeMapAccessGate };\n', {fileName:'SpatialLifeMapCanonical.tsx',reportDiagnostics:true,compilerOptions:{jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}})
assert.equal(compiled.diagnostics?.length,0)
function simulate() {
  let cursor=0, currentQuery='', dirty=false, authListener=null
  const historicalListeners=[]
  const slots=[], pending=[], cleanup=[], router={push(){},replace(){}}
  const react={
    useState(initial) {const i=cursor++;if(!(i in slots))slots[i]={value:typeof initial==='function'?initial():initial};return[slots[i].value,next=>{const v=typeof next==='function'?next(slots[i].value):next;if(!Object.is(v,slots[i].value)){slots[i].value=v;dirty=true}}]},
    useMemo(fn,deps){const i=cursor++,old=slots[i];if(!old||old.deps.length!==deps.length||deps.some((d,j)=>!Object.is(d,old.deps[j])))slots[i]={deps:[...deps],value:fn()};return slots[i].value},
    useCallback(fn,deps){const i=cursor++,old=slots[i];if(!old||old.deps.length!==deps.length||deps.some((d,j)=>!Object.is(d,old.deps[j])))slots[i]={deps:[...deps],value:fn};return slots[i].value},
    useEffect(fn,deps){const i=cursor++;const old=slots[i]?.deps;if(!old||old.length!==deps.length||deps.some((d,j)=>!Object.is(old[j],d))){slots[i]={deps:[...deps]};pending.push(()=>{cleanup[i]?.();cleanup[i]=fn()})}}
  }
  const jsx=(type,props)=>({type,props:props||{}})
  const fakeComponent=(name)=>Object.assign(()=>null,{displayName:name})
  const boundary=fakeComponent('LifeMapRouteBoundary')
  const stubs={
    react,
    'react/jsx-runtime':{jsx,jsxs:jsx,Fragment:Symbol.for('react.fragment')},
    'next/navigation':{useRouter:()=>router,useSearchParams:()=>new URLSearchParams(currentQuery)},
    'firebase/auth':{getAuth:()=>({}),onAuthStateChanged:()=>()=>{}},
    '@/spatial/adam/AdamLauncherSlot':{__esModule:true,default:fakeComponent('AdamLauncherSlot')},
    '@/spatial/assets/uraiAssets':{assetCssStack:()=>'',lifeMapAssets:{primary:{src:'/fake.png'},mobile:{src:'/fake.png'}}},
    '@/spatial/world/worldEvents':{requestUraiWorldReturn:()=>{}},
    '@/components/lifemap/LifeMapRouteBoundary':{__esModule:true,default:boundary},
    '@/components/lifemap/LifeMapSemanticNavigator':{__esModule:true,default:fakeComponent('LifeMapSemanticNavigator')},
    '@/lib/firebase/client':{getUraiAuth:()=>({}),firebasePublicEnvReady:true},
    './lifeMapAuthGate':{subscribeLifeMapAuth:({onResolved})=>{authListener=onResolved;historicalListeners.push(onResolved);return()=>{authListener=null}}},
  }
  const mod={exports:{}}
  const env={module:mod,exports:mod.exports,URLSearchParams,URL,document:{createElement:()=>({width:1,height:1,getContext:()=>({getExtension:()=>null})})},process:{env:{}},window:{location:{pathname:'/life-map'}},HTMLElement:class {}}
  vm.runInNewContext(compiled.outputText,{...env,require(name){assert.ok(name in stubs,'Unexpected dependency: '+name);return stubs[name]}},{filename:'SpatialLifeMapCanonical.original.tsx'})
  const component=mod.exports.LifeMapAccessGate
  const render=(query,runEffects=true)=>{
    currentQuery=query
    let frame=null
    for(let i=0;i<14;i++){
      cursor=0;dirty=false;frame=component()
      if(!runEffects)return frame
      const q=pending.splice(0);for(const effect of q)effect()
      if(!dirty&&!pending.length)return frame
    }
    throw new Error('Unsettled Life Map gate')
  }
  const locate=(tree,needle)=>{if(!tree||typeof tree!=='object')return null;if(tree.type===needle)return tree;const children=tree.props?.children;return (Array.isArray(children)?children:[children]).map(c=>locate(c,needle)).find(Boolean)||null}
  return {render,boundary,locate,historicalListeners,auth(uid){assert.ok(authListener,'Missing auth listener');authListener(uid)}}
}

test('a query transition synchronously removes previous private owner before auth cleanup or effects',()=>{
  const h=simulate()
  h.render('')
  h.auth('owner-verified-A')
  const privateFrame=h.render('')
  assert.equal(h.locate(privateFrame,h.boundary)?.props.authenticatedUserId,'owner-verified-A')
  // React renders new URL props BEFORE useEffect cleanup/subscribe. The current gate
  // must not expose any stale private owner during this render.
  const beforeEffects=h.render('demo=1',false)
  assert.equal(h.locate(beforeEffects,h.boundary)?.props.authenticatedUserId??null,null,
    'Previous private owner leaked into a new disclosed-demo URL before effects')
  assert.notEqual(beforeEffects.props?.['data-life-map-access'],'private',
    'Previous private mode leaked into the new disclosed-demo URL before effects')
  const demoFrame=h.render('demo=1')
  assert.equal(h.locate(demoFrame,h.boundary)?.props.authenticatedUserId??null,null)
})

test('query change from verified private to a different non-demo query awaits fresh Firebase authority',()=>{
  const h=simulate();h.render('journey=1');h.auth('owner-old');h.render('journey=1')
  const before=h.render('journey=2',false)
  assert.equal(h.locate(before,h.boundary)?.props.authenticatedUserId??null,null)
  const during=h.render('journey=2')
  assert.equal(h.locate(during,h.boundary)?.props.authenticatedUserId??null,null)
  h.auth('owner-current')
  const verified=h.render('journey=2')
  assert.equal(h.locate(verified,h.boundary)?.props.authenticatedUserId,'owner-current')
})


test('a delayed callback for a previous query cannot certify the new route as private',()=>{
  const h=simulate();h.render('source=first');h.auth('owner-first');h.render('source=first')
  const staleCallback=h.historicalListeners.at(-1)
  h.render('source=second')
  // This call is deliberately stronger than the production helper's cleanup
  // contract. Even a stale callback must not reuse the newer URL's authority.
  staleCallback('owner-stale')
  const frame=h.render('source=second',false)
  assert.equal(h.locate(frame,h.boundary)?.props.authenticatedUserId??null,null)
  h.auth('owner-second')
  assert.equal(h.locate(h.render('source=second'),h.boundary)?.props.authenticatedUserId,'owner-second')
})
