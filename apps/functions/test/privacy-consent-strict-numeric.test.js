'use strict'
const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const crypto = require('node:crypto')
const vm = require('node:vm')
const ts = require('typescript')

const root = path.resolve(__dirname, '../src')
function source(name) {
  return fs.readFileSync(path.join(root, name), 'utf8')
}
function compile(s, name) {
  return ts.transpileModule(s, { fileName: name, compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText
}
const helper = { exports: {} }
vm.runInNewContext(compile(source('consentPolicyAuthority.ts'), 'consentPolicyAuthority.ts'),
  { module: helper, exports: helper.exports }, { filename: 'original-consentPolicyAuthority.js' })
const ast = ts.createSourceFile('privacyOperations.ts', source('privacyOperations.ts'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TS)
const selected = ast.statements.filter(n => ts.isFunctionDeclaration(n) || (ts.isVariableStatement(n) && n.declarationList.declarations.some(d => d.name.getText(ast) === 'applyConsentPolicy')))
assert.ok(selected.some(n => ts.isFunctionDeclaration(n) && n.name?.text === 'parseStoredPolicy'))
assert.ok(selected.some(n => ts.isFunctionDeclaration(n) && n.name?.text === 'consentDeletionEpoch'))
const code = compile(selected.map(n => n.getText(ast)).join('\n') + '\nexports.testParseStoredPolicy = parseStoredPolicy; exports.testDefaultPolicy = defaultPolicy; exports.testTargets = affectedTargets;', 'privacyOperations-source-fragment.ts')
const uid='synthetic-consent-owner', other='synthetic-other-owner', operationId='consent_number_001'
const sha=x=>crypto.createHash('sha256').update(x).digest('hex').slice(0,40)
const policyPath=owner=>'users/'+owner+'/privacyPolicy/current'
const jobPath=(owner,op)=>'privacyEnforcementJobs/'+sha('consent:'+owner+':'+op)
const receiptPath=(owner,op)=>'users/'+owner+'/privacyReceipts/'+sha('consent-receipt:'+owner+':'+op)
const fencePath=owner=>'users/'+owner+'/privacyRuntime/exportAuthority'
const copy=x=>x===undefined?undefined:structuredClone(x)
function snapshot(p,records) {
  const exists=records.has(p), data=copy(records.get(p))
  return {exists,ref:{path:p},data:()=>copy(data),get:key=>key.split('.').reduce((o,k)=>o?.[k], data),id:p.split('/').at(-1)}
}
function fixture(options={}) {
  const records=new Map(), commits=[], reads=[]
  if ('policy' in options)records.set(policyPath(uid),copy(options.policy))
  if ('fence' in options)records.set(fencePath(uid),copy(options.fence))
  let transactions=0
  const db={
    doc:p=>({path:p}),
    async runTransaction(callback) {
      transactions++
      const pending=[]
      const transaction={
        get:async ref=>{reads.push(ref.path); return snapshot(ref.path,records)},
        set(ref,value){pending.push({operation:'set',path:ref.path,value:copy(value)})},
        create(ref,value){pending.push({operation:'create',path:ref.path,value:copy(value)})},
      }
      const result=await callback(transaction)
      for(const write of pending) {
        if(write.operation==='create' && records.has(write.path))throw Error('synthetic Firestore create collision')
        records.set(write.path,write.value)
        commits.push(write)
      }
      return result
    },
  }
  const functions={https:{onCall:handler=>handler,HttpsError:class HttpsError extends Error{constructor(code,message,details){super(message);this.code=code;this.details=details}}}}
  const module={exports:{}}
  const noNetwork=()=>assert.fail('No external connection allowed')
  vm.runInNewContext(code,{exports:module.exports,module,require: name=>{
    if(name==='./consentPolicyAuthority')return helper.exports
    throw Error('Unexpected actual source import '+name)
  },...helper.exports,functions,db,fieldValue:{serverTimestamp:()=>({syntheticTimestamp:true})},createHash:crypto.createHash,Date,Buffer,console,
  },{filename:'source-privacyOperations.ts'})
  const invoke=(payload={},owner=uid)=>module.exports.applyConsentPolicy({
    domain:'location', operationId, expectedRevision:0, next:{mode:'limited',retentionDays:30,precise:false,
      replayVisible:false,lifeMapVisible:false,modelContext:false,sharingEnabled:false,automationEnabled:false,likenessEnabled:false},
    ...payload,
  },owner===null?{}:{auth:{uid:owner,token:{auth_time:Math.floor(Date.now()/1000)}}})
  return {records,commits,reads,db,invoke,module:module.exports,transactions:()=>transactions}
}

// Real callable source, with a deterministic in-memory Firestore transaction.
// This is a source-bound unit/contract test, NOT a Firebase emulator proof.
test('primitive revision zero and numeric retention produce exactly one pending consent record', async () => {
  const f = fixture(), result = await f.invoke()
  assert.equal(result.revision, 1)
  assert.equal(f.commits.length, 3)
  assert.equal(f.records.get(policyPath(uid)).domains.location.retentionDays, 30)
  assert.equal(f.records.get(policyPath(uid)).enforcement.state, 'pending')
})
for (const [name, value] of [
  ['null', null], ['numeric-string', '0'], ['blank-string', ''],
  ['boolean', false], ['empty-array', []], ['boxed-zero', { valueOf: () => 0 }],
  ['missing', undefined], ['fractional', 0.5], ['negative', -1],
  ['unsafe-integer', Number.MAX_SAFE_INTEGER + 1], ['NaN', NaN], ['infinite', Infinity],
]) {
  test('reject malformed expectedRevision '+name+' without persistence', async () => {
    const f = fixture()
    await assert.rejects(f.invoke({ expectedRevision: value }), {
      code: 'invalid-argument', message: 'Invalid expected revision.',
    })
    assert.equal(f.commits.length, 0)
    assert.equal(f.reads.length, 0)
  })
}
for (const [name, value] of [
  ['numeric-string', '30'], ['blank-string', ''], ['zero-string', '0'],
  ['boolean', true], ['empty-array', []], ['boxed-30', { valueOf: () => 30 }],
  ['missing', undefined], ['zero', 0], ['nonfinite', Infinity],
]) {
  test('reject malformed retentionDays '+name+' without persistence', async () => {
    const f = fixture()
    await assert.rejects(f.invoke({ next: {
      mode: 'limited', retentionDays: value, precise: false, replayVisible: false,
      lifeMapVisible: false, modelContext: false, sharingEnabled: false,
      automationEnabled: false, likenessEnabled: false,
    } }), { code: 'invalid-argument', message: 'Invalid retention period.' })
    assert.equal(f.commits.length, 0)
    assert.equal(f.reads.length, 0)
  })
}
for (const retentionDays of [null, 30, 90, 365]) {
  test('accept authorized primitive retention '+String(retentionDays), async () => {
    const f = fixture()
    const result = await f.invoke({ next: {
      mode: 'limited', retentionDays, precise: false, replayVisible: false,
      lifeMapVisible: false, modelContext: false, sharingEnabled: false,
      automationEnabled: false, likenessEnabled: false,
    } })
    assert.equal(result.revision, 1)
    assert.equal(f.records.get(policyPath(uid)).domains.location.retentionDays, retentionDays)
    assert.equal(f.commits.length, 3)
  })
}
test('unauthenticated caller denied before any Firestore reads', async () => {
  const f = fixture()
  await assert.rejects(f.invoke({}, null), { code: 'unauthenticated' })
  assert.equal(f.reads.length, 0)
  assert.equal(f.commits.length, 0)
})
test('stale valid numeric revision remains a conflict without writes', async () => {
  const f = fixture()
  await f.invoke()
  const before = f.commits.length
  await assert.rejects(f.invoke({ operationId: 'consent_number_002', expectedRevision: 0 }), {
    code: 'aborted', message: 'CONSENT_REVISION_CONFLICT',
  })
  assert.equal(f.commits.length, before)
})
test('duplicate operation remains idempotent with same receipt', async () => {
  const f = fixture()
  const first = await f.invoke(), second = await f.invoke()
  assert.equal(second.receiptId, first.receiptId)
  assert.equal(f.commits.length, 3)
})
