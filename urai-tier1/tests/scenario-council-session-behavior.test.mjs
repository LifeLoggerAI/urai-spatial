import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import test from 'node:test'
import ts from 'typescript'

const source = fs.readFileSync(new URL('../src/spatial/scenario/ScenarioCouncilPanel.tsx', import.meta.url), 'utf8')
const code = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText
const scenarioId = 'scn_synthetic_scenario_a', branchId = 'br_synthetic_branch_a'
const defaults = { scenarioId, branchId }
const bundle = (overrides = {}) => ({ scenarioId, branchId, truthKind:'scenario', question:'Synthetic what-if', branchLabel:'Synthetic branch A', branchSummary:'A disclosed assumption', uncertainty:['Synthetic unknown'], assumptionOnly:true, evidenceCount:0, evidenceKinds:[], disclosure:'Possible Future only. Not a memory, prediction, consensus, or authority decision.', ...overrides })
const answer = { message:'Synthetic advisory answer', disclosure:'Synthetic provider receipt' }
function deferred() { let resolve, reject; const promise = new Promise((yes,no) => { resolve=yes; reject=no }); return { promise, resolve, reject } }
function nodes(tree) {
  if (!tree || typeof tree !== 'object') return []
  const children = tree.props?.children
  return [tree, ...(Array.isArray(children) ? children.flat(Infinity) : [children]).flatMap(nodes)]
}
function text(tree) {
  if (tree == null || typeof tree === 'boolean') return ''
  if (typeof tree !== 'object') return String(tree)
  const children = tree.props?.children
  return (Array.isArray(children) ? children.flat(Infinity) : [children]).map(text).join('')
}
function fixture() {
  let cursor=0, dirty=false, queued=[], mounted=true, tree, props={ ...defaults }, observed
  const slots=[], authListeners=new Set(), bundleCalls=[], providerCalls=[], state={ owner:{ uid:'synthetic-owner' }, onBundle:async () => bundle(), onProvider:async () => answer }
  const auth={ get currentUser() { return state.owner } }
  const changed=(a,b)=>!a || !b || a.length!==b.length || a.some((v,i)=>!Object.is(v,b[i]))
  const react={
    useState(initial) { const i=cursor++; slots[i] ??= { value:typeof initial==='function'?initial():initial }; return [slots[i].value, next=>{ slots[i].value=typeof next==='function'?next(slots[i].value):next; dirty=true }] },
    useRef(initial) { const i=cursor++; slots[i] ??= { value:{ current:initial } }; return slots[i].value },
    useMemo(factory,deps) { const i=cursor++; if (!slots[i] || changed(slots[i].deps,deps)) slots[i]={ value:factory(),deps }; return slots[i].value },
    useEffect(effect,deps) { const i=cursor++; const old=slots[i]; if (!old || changed(old.deps,deps)) { slots[i]={ deps,cleanup:old?.cleanup }; queued.push(()=>{ slots[i].cleanup?.();slots[i].cleanup=effect() }) } },
  }
  const element=(type,props,key)=>({ type,props:props??{},key })
  class NotConnected extends Error { constructor(provider) { super('not connected');this.provider=provider } }
  const registry={ openai:{ label:'OpenAI' }, anthropic:{ label:'Anthropic' } }
  const imports={
    react,'react/jsx-runtime':{ jsx:element,jsxs:element,Fragment:Symbol('fragment') },
    'firebase/auth':{ getAuth:()=>auth,onAuthStateChanged:(_auth,listener)=>{ authListeners.add(listener);listener(auth.currentUser);return()=>authListeners.delete(listener) } },
    '@/lib/firebase/client':{ app:{} },
    '@/lib/scenario/scenarioClient':{ getPossibleFutureCouncilBundleClient:async (id,branch)=>{ bundleCalls.push({ id,branch });return state.onBundle(id,branch) } },
    '@/spatial/council/councilAgentSchema':{ COUNCIL_AGENTS:[{ id:'guardian',name:'Guardian',role:'guardian',focus:'Care' },{ id:'skeptic',name:'Skeptic',role:'skeptic',focus:'Evidence' }] },
    '@/spatial/council/councilProviderRegistry':{ COUNCIL_PROVIDER_REGISTRY:registry,REQUESTABLE_COUNCIL_PROVIDER_IDS:['openai','anthropic'],PENDING_COUNCIL_PROVIDER_IDS:[],CouncilProviderNotConnectedError:NotConnected,requestCouncilProvider:async input=>{ providerCalls.push(input);return state.onProvider(input) } },
  }
  const module={ exports:{} }
  vm.runInNewContext(code,{ exports:module.exports,module,require:name=>{ assert.ok(name in imports,'Unexpected import '+name);return imports[name] },AbortController },{ filename:'actual-ScenarioCouncilPanel.tsx' })
  function render(next=props, runEffects=true) {
    props=next
    for (let pass=0;pass<20;pass++) {
      cursor=0;dirty=false;tree=module.exports.ScenarioCouncilPanel(props)
      if (!runEffects) return tree
      const effects=queued;queued=[];effects.forEach(effect=>effect())
      if (!dirty) return tree
    }
    throw new Error('Actual Council hooks did not settle')
  }
  const find=(predicate)=>nodes(tree).find(predicate)
  const button=(label)=>find(node=>node.type==='button' && text(node)===label)
  const consent=checked=>{ const node=find(node=>node.type==='input' && node.props.type==='checkbox');node.props.onChange({ currentTarget:{ checked } });render() }
  const status=()=>text(find(node=>node.props.role==='status'))
  const visibleAnswer=()=>find(node=>node.props['data-testid']==='possible-futures-council-answer')
  const click=label=>{ const node=button(label);assert.ok(node,'Button missing '+label);node.props.onClick(); }
  const flush=async()=>{ for(let i=0;i<10;i++){ await Promise.resolve();if(mounted) render() } }
  render()
  return { state,auth,bundleCalls,providerCalls,render,button,click,consent,status,visibleAnswer,flush,
    ask() { consent(true);click('Ask Council') },
    setOwner(owner) { state.owner=owner;authListeners.forEach(listener=>listener(owner));render() },
    editQuestion(value) { find(node=>node.type==='textarea').props.onChange({ currentTarget:{ value } });render() },
    chooseRole(value) { const node=nodes(tree).filter(node=>node.type==='select')[0];node.props.onChange({ currentTarget:{ value } });render() },
    question:()=>find(node=>node.type==='textarea').props.value,
    consentChecked:()=>find(node=>node.type==='input' && node.props.type==='checkbox').props.checked,
    unmount() { mounted=false;slots.forEach(slot=>slot.cleanup?.());queued=[] },
  }
}
test('actual consented Council request binds the selected Scenario and preserves advisory disclosure',async()=>{
  const f=fixture();f.ask();await f.flush()
  assert.deepEqual(f.bundleCalls,[{ id:scenarioId,branch:branchId }]);assert.equal(f.providerCalls.length,1)
  assert.match(f.providerCalls[0].message,/Selected branch: Synthetic branch A/);assert.match(f.providerCalls[0].message,/Not a memory, prediction/);assert.equal(f.providerCalls[0].aiProcessingConsent,true)
  assert.match(text(f.visibleAnswer()),/GuardianSynthetic advisory answerSynthetic provider receipt/)
})
test('actual Stop before the bundle returns prevents any provider dispatch',async()=>{
  const f=fixture(), pending=deferred();f.state.onBundle=()=>pending.promise;f.ask();await f.flush();f.click('Stop');await f.flush();pending.resolve(bundle());await f.flush()
  assert.equal(f.providerCalls.length,0);assert.equal(f.visibleAnswer(),undefined);assert.equal(f.status(),'Council request stopped.');assert.equal(f.button('Ask Council').props.disabled,false)
})
test('actual Stop drops a provider result that ignores abort',async()=>{
  const f=fixture(),pending=deferred();f.state.onProvider=()=>pending.promise;f.ask();await f.flush();f.click('Stop');await f.flush();pending.resolve(answer);await f.flush()
  assert.equal(f.providerCalls[0].signal.aborted,true);assert.equal(f.visibleAnswer(),undefined);assert.equal(f.status(),'Council request stopped.')
})
for(const target of ['branch','scenario']) test('actual '+target+' transition cancels a late trusted bundle and requires renewed consent',async()=>{
  const f=fixture(),pending=deferred();f.state.onBundle=()=>pending.promise;f.ask();await f.flush();f.render({ ...defaults,[target==='branch'?'branchId':'scenarioId']:target+'-new' });pending.resolve(bundle());await f.flush()
  assert.equal(f.providerCalls.length,0);assert.equal(f.consentChecked(),false);assert.equal(f.visibleAnswer(),undefined);assert.equal(f.status(),'Council has not reviewed this Scenario.')
})
for(const target of ['branch','scenario']) test('actual '+target+' transition cannot relabel a late external answer',async()=>{
  const f=fixture(),pending=deferred();f.state.onProvider=()=>pending.promise;f.ask();await f.flush();f.render({ ...defaults,[target==='branch'?'branchId':'scenarioId']:target+'-new' });pending.resolve(answer);await f.flush()
  assert.equal(f.providerCalls[0].signal.aborted,true);assert.equal(f.visibleAnswer(),undefined);assert.equal(f.status(),'Council has not reviewed this Scenario.')
})
test('actual existing answer is hidden on a new branch before effects run',async()=>{
  const f=fixture();f.ask();await f.flush();assert.ok(f.visibleAnswer());f.render({ ...defaults,branchId:'branch-new' },false);assert.equal(f.visibleAnswer(),undefined)
})
for(const wrong of [{ scenarioId:'scenario-other' },{ branchId:'branch-other' },{ truthKind:'observation' }]) test('actual Council refuses a mismatched trusted bundle '+JSON.stringify(wrong),async()=>{
  const f=fixture();f.state.onBundle=async()=>bundle(wrong);f.ask();await f.flush();assert.equal(f.providerCalls.length,0);assert.equal(f.visibleAnswer(),undefined);assert.match(f.status(),/No provider answer is being substituted/)
})
test('actual consent withdrawal aborts an in-flight provider and drops its late answer',async()=>{
  const f=fixture(),pending=deferred();f.state.onProvider=()=>pending.promise;f.ask();await f.flush();f.consent(false);pending.resolve(answer);await f.flush()
  assert.equal(f.providerCalls[0].signal.aborted,true);assert.equal(f.consentChecked(),false);assert.equal(f.visibleAnswer(),undefined);assert.equal(f.status(),'Council consent withdrawn. No further answer will be shown.')
})
for(const sameUid of [false,true]) test('actual '+(sameUid?'replacement':'different')+' auth session during bundle wait fences dispatch and clears private question',async()=>{
  const f=fixture(),pending=deferred();f.state.onBundle=()=>pending.promise;f.editQuestion('Private fixture question');f.ask();await f.flush();f.setOwner({ uid:sameUid?'synthetic-owner':'synthetic-other' });pending.resolve(bundle());await f.flush()
  assert.equal(f.providerCalls.length,0);assert.equal(f.visibleAnswer(),undefined);assert.equal(f.consentChecked(),false);assert.doesNotMatch(f.question(),/Private fixture/)
})
test('actual account transition during provider wait hides old answer',async()=>{
  const f=fixture(),pending=deferred();f.state.onProvider=()=>pending.promise;f.ask();await f.flush();f.setOwner({ uid:'synthetic-other' });pending.resolve(answer);await f.flush()
  assert.equal(f.providerCalls[0].signal.aborted,true);assert.equal(f.visibleAnswer(),undefined);assert.equal(f.consentChecked(),false)
})
test('actual unmount before bundle return prevents provider dispatch',async()=>{
  const f=fixture(),pending=deferred();f.state.onBundle=()=>pending.promise;f.ask();await f.flush();f.unmount();pending.resolve(bundle());await f.flush();assert.equal(f.providerCalls.length,0)
})
test('actual old provider completion cannot clear a replacement request busy/status',async()=>{
  const f=fixture(),old=deferred(),next=deferred();f.state.onProvider=()=>old.promise;f.ask();await f.flush()
  f.render({ ...defaults,branchId:'br_new' });f.state.onBundle=async()=>bundle({ branchId:'br_new' });f.state.onProvider=()=>next.promise;f.ask();await f.flush();old.resolve(answer);await f.flush()
  assert.equal(f.button('Considering…').props.disabled,true);assert.match(f.status(),/Sending this bounded Scenario context/)
  next.resolve({ message:'New branch answer',disclosure:'New receipt' });await f.flush();assert.match(text(f.visibleAnswer()),/New branch answer/);assert.doesNotMatch(text(f.visibleAnswer()),/Synthetic advisory answer/)
})
test('actual repeated activation before rerender dispatches only one bundle request',async()=>{
  const f=fixture(),pending=deferred();f.state.onBundle=()=>pending.promise;f.consent(true);f.click('Ask Council');f.click('Ask Council');await f.flush();assert.equal(f.bundleCalls.length,1);pending.resolve(bundle());await f.flush();assert.equal(f.providerCalls.length,1)
})
test('actual signed-out panel cannot ask for a private Scenario',async()=>{
  const f=fixture();f.setOwner(null);f.ask();await f.flush();assert.equal(f.bundleCalls.length,0);assert.equal(f.providerCalls.length,0);assert.equal(f.visibleAnswer(),undefined);assert.match(f.status(),/Sign in/)
})
test('actual answer keeps the role that produced it when the role picker changes',async()=>{
  const f=fixture();f.ask();await f.flush();f.chooseRole('skeptic');assert.match(text(f.visibleAnswer()),/^Guardian/);assert.doesNotMatch(text(f.visibleAnswer()),/^Skeptic/)
})
test('actual implicit branch accepts the server-selected branch without claiming a different explicit one',async()=>{
  const f=fixture();f.render({ scenarioId });f.ask();await f.flush();assert.equal(f.providerCalls.length,1);assert.ok(f.visibleAnswer())
})
test('actual unavailable provider yields no invented Council answer',async()=>{
  const f=fixture();f.state.onProvider=async()=>null;f.ask();await f.flush();assert.equal(f.visibleAnswer(),undefined);assert.equal(f.status(),'No external Council response was used.')
})

