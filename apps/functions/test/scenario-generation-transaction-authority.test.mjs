import assert from 'node:assert/strict'
import fs from 'node:fs'
import { createHash } from 'node:crypto'
import { createRequire } from 'node:module'
const localRequire = createRequire(import.meta.url)
const scenarioOwnerAuthorityDecision = localRequire('../lib/apps/functions/src/scenarioOwnerAuthority.js').scenarioOwnerAuthorityDecision
const resolveManualBranchMutation = localRequire('../lib/apps/functions/src/manualScenarioReceipt.js').resolveManualBranchMutation
import test from 'node:test'
import vm from 'node:vm'
import ts from 'typescript'

// Extract executable Functions handlers from the original source, not copies.
const source = fs.readFileSync(new URL('../src/scenarioOperations.ts', import.meta.url), 'utf8')
const ast = ts.createSourceFile('scenarioOperations.ts', source, ts.ScriptTarget.Latest, true)
assert.equal(ast.parseDiagnostics.length, 0)
function handler(name) {
  const node = ast.statements.find(n => ts.isVariableStatement(n) &&
    n.declarationList.declarations.some(d => d.name.getText(ast) === name))
  assert.ok(node, 'Missing original ' + name)
  return node.getText(ast)
}
const ownerGuardNode = ast.statements.find(n => ts.isFunctionDeclaration(n) && n.name?.getText(ast) === 'requireCurrentScenarioOwner')
assert.ok(ownerGuardNode, 'Original owner guard must exist')
const compiled = ts.transpileModule(ownerGuardNode.getText(ast) + '\n' + handler('generatePossibleFutureBranches') + '\n' + handler('discardPossibleFuture'), {
  compilerOptions: {module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022},reportDiagnostics:true,
})
assert.deepEqual(compiled.diagnostics ?? [], [])
class HttpsError extends Error {constructor(code,message){super(message);this.code=code}}
const owner='synthetic-owner',id='scn_synthetic_001',base='users/'+owner+'/scenarios/'+id
const samples=[{summary:'Branch one',evidenceRefIds:['known']},{summary:'Branch two'}]
function setup({status='awaiting-assumptions',scenario=true,foreign=false,basis=true,foreignBasis=false,race=false,revision=1}={}) {
  const rows=new Map(),writes=[],reads=[]
  if(scenario)rows.set(base,{ownerId:foreign?'foreign':owner,status,basisRevision:revision,branchIds:[]})
  if(basis)rows.set(base+'/basis/current',{ownerId:foreignBasis?'foreign':owner,evidenceRefs:[{id:'known'}]})
  rows.set('users/'+owner,{deleted:false,accountStatus:'active'})
  const snap=r=>({exists:rows.has(r.path),data:()=>rows.get(r.path),id:r.id,get:key=>key.split('.').reduce((value,part)=>value?.[part],rows.get(r.path))})
  const mutate=(action,r,value,opt)=>{writes.push({action,path:r.path});
    if(action==='create')assert.equal(rows.has(r.path),false)
    if(action==='update')assert.equal(rows.has(r.path),true)
    rows.set(r.path,action==='update'||opt?.merge?{...rows.get(r.path),...value}:value)}
  const ref=path=>({path,id:path.split('/').at(-1),collection:name=>({doc:nameId=>ref(path+'/'+name+'/'+nameId)}),
    async get(){reads.push(path);return snap(this)},
    async set(value,opt){mutate('set',this,value,opt)},
  })
  let transactions=0,sequence=0
  const db={doc:ref,batch(){const items=[];return{create:(r,v)=>items.push(['create',r,v]),
    set:(r,v,o)=>items.push(['set',r,v,o]),async commit(){
      if(race && rows.has(base))rows.set(base,{...rows.get(base),status:'discarded'})
      for(const [a,r,v,o] of items)mutate(a,r,v,o)}}},
    async runTransaction(callback){transactions++
      if(race && rows.has(base))rows.set(base,{...rows.get(base),status:'discarded'})
      const items=[],tx={get:async r=>{reads.push(r.path);return snap(r)},
        create:(r,v)=>items.push(['create',r,v]),update:(r,v)=>items.push(['update',r,v]),
        set:(r,v,o)=>items.push(['set',r,v,o])}
      const result=await callback(tx)
      for(const [a,r,v,o] of items)mutate(a,r,v,o)
      return result
    }}
  const exports={}
  vm.runInNewContext(compiled.outputText,{exports,Promise,Set,db,createHash,scenarioOwnerAuthorityDecision,resolveManualBranchMutation,
    functions:{https:{onCall:fn=>fn,HttpsError}},uid:c=>c.auth.uid,
    operationId:x=>x,ensureScenarioId:x=>x,scenarioRef:(u,s)=>{assert.equal(u,owner);assert.equal(s,id);return ref(base)},
    BRANCH_LIMIT:3,evidenceIdsFromBasis:v=>new Set((v?.evidenceRefs??[]).map(x=>x.id)),
    asStringArray:(v,max=64)=>Array.isArray(v)?v.filter(x=>typeof x==='string').slice(0,max):[],
    stableReceipt:()=> 'receipt-synthetic',scenarioProviderState:'provider-unavailable',
    fv:{serverTimestamp:()=> 'TIME'},opaque:prefix=>prefix+(++sequence)})
  const call=(name,payload={})=>exports[name]({scenarioId:id,operationId:'op_123456789012',expectedRevision:1,...payload},{auth:{uid:owner}})
  return {rows,writes,reads,call,get transactions(){return transactions}}
}

test('manual branches and scenario status commit as one transaction',async()=>{
  const f=setup(),result=await f.call('generatePossibleFutureBranches',{manualBranches:samples})
  assert.equal(result.status,'ready');assert.equal(result.branchIds.length,2)
  assert.ok(f.transactions>0);assert.equal(f.rows.get(base).branchIds.length,2)
})
for(const [name,config,code] of [
  ['discarded',{status:'discarded'},'not-found'],['saved',{status:'saved'},'failed-precondition'],
  ['foreign',{foreign:true},'not-found'],['missing',{scenario:false},'not-found'],
  ['foreign basis',{foreignBasis:true},'not-found'],['missing basis',{basis:false},'not-found'],
  ['concurrent discard',{race:true},'not-found'],['old revision',{revision:3},'aborted'],
])test('generation rejects '+name+' without writes',async()=>{
  const f=setup(config)
  await assert.rejects(f.call('generatePossibleFutureBranches',{manualBranches:samples}),e=>e.code===code)
  assert.equal(f.writes.length,0)
})
test('too many branches are rejected, not truncated',async()=>{
  const f=setup();await assert.rejects(f.call('generatePossibleFutureBranches',{manualBranches:[...samples,...samples]}),e=>e.code==='invalid-argument')
  assert.equal(f.writes.length,0)
})
test('out-of-basis evidence cannot enter manual scenario',async()=>{
  const f=setup();await assert.rejects(f.call('generatePossibleFutureBranches',{manualBranches:[{summary:'No',evidenceRefIds:['foreign']}]}),e=>e.code==='failed-precondition')
  assert.equal(f.writes.length,0)
})
test('provider unavailable returns a receipt without recreating a missing scenario',async()=>{
  const f=setup({scenario:false});await assert.rejects(f.call('generatePossibleFutureBranches'),e=>e.code==='not-found')
  assert.equal(f.rows.has(base),false);assert.equal(f.writes.length,0)
})
test('provider unavailable never resets saved scenario',async()=>{
  const f=setup({status:'saved'});await assert.rejects(f.call('generatePossibleFutureBranches'),e=>e.code==='failed-precondition')
  assert.equal(f.rows.get(base).status,'saved');assert.equal(f.writes.length,0)
})
test('provider unavailable valid fallback is recorded once',async()=>{
  const f=setup();await f.call('generatePossibleFutureBranches');await f.call('generatePossibleFutureBranches')
  assert.equal(f.rows.get('scenarioProviderReceipts/receipt-synthetic').validationResult,'provider-unavailable')
  assert.equal(f.writes.filter(x=>x.path==='scenarioProviderReceipts/receipt-synthetic').length,1)
})
test('discard cannot resurrect missing or overwrite foreign scenario',async()=>{
  for(const config of [{scenario:false},{foreign:true}]){
    const f=setup(config);await assert.rejects(f.call('discardPossibleFuture'),e=>e.code==='not-found')
    assert.equal(f.writes.length,0)
  }
})
test('authorized discard commits transactionally and can be repeated',async()=>{
  const f=setup();await f.call('discardPossibleFuture');await f.call('discardPossibleFuture')
  assert.equal(f.rows.get(base).status,'discarded');assert.equal(f.writes.length,1);assert.equal(f.writes[0].action,'update')
  assert.equal(f.transactions,2)
})
