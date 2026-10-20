import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import { createHash } from 'node:crypto'
import ts from 'typescript'

const source = fs.readFileSync(new URL('../src/scenarioOperations.ts', import.meta.url), 'utf8')
const begin = source.indexOf('async function resolveAuthorizedScenarioEvidence(')
const end = source.indexOf('function evidenceIdsFromBasis(', begin)
assert.ok(begin >= 0 && end > begin, 'Use original source function, never duplicate its implementation')
const compiled = ts.transpileModule(source.slice(begin, end) + '\nexports.resolveAuthorizedScenarioEvidence = resolveAuthorizedScenarioEvidence', {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
}).outputText
const owner = 'synthetic-owner-current', base = 'users/' + owner
const validMemory = () => ({ ownerId:owner, privacy:'private', consentState:'granted', synthetic:false })
const validEntity = kind => ({ ownerId:owner, kind, revoked:false, synthetic:false })
const consent = { ownerId:owner, revision:4, enforcement:{state:'fully-enforced'},
  domains:{ memory:{mode:'granted',modelContext:true}, models:{mode:'granted',modelContext:true} } }

async function evidence(changes={}) {
 const records = new Map([[base+'/privacyPolicy/current',consent],
   [base+'/memories/memory-one',changes.memory ?? validMemory()],
   [base+'/lifeEntities/person-one',changes.person ?? validEntity('person')],
   [base+'/lifeEntities/place-one',changes.place ?? validEntity('place')]])
 const exports = {}
 vm.runInNewContext(compiled, {
  exports, createHash, db:{doc:path=>({path})},SCENARIO_PURPOSE:'scenario.explore',
  safeContextId:value=>/^[A-Za-z0-9:_-]{1,160}$/.test(String(value??'')) ? String(value) : '',
  isCanonicalStoredPolicy:(value,uid)=>value?.ownerId===uid,
 })
 return exports.resolveAuthorizedScenarioEvidence(owner,{
  memoryId:'memory-one',personId:'person-one',placeId:'place-one',
 },{async get(ref){const data=records.get(ref.path);return {exists:data!==undefined,data:()=>data}}})
}

test('valid owner, consented memory and life entities remain usable for future scenario',async()=>{
 const result=await evidence()
 assert.equal(result.evidenceRefs.length,3)
 assert.equal(result.permissionReceiptIds.length,0)
})
for(const [name,changes] of [
 ['deleted memory',{memory:{...validMemory(),deleted:true}}],
 ['revoked memory',{memory:{...validMemory(),consentState:'revoked'}}],
 ['pending memory',{memory:{...validMemory(),consentState:'pending'}}],
 ['foreign memory',{memory:{...validMemory(),ownerId:'synthetic-foreign'}}],
 ['synthetic memory',{memory:{...validMemory(),synthetic:true}}],
 ['revoked person',{person:{...validEntity('person'),revoked:true}}],
 ['foreign person',{person:{...validEntity('person'),ownerId:'synthetic-foreign'}}],
 ['synthetic place',{place:{...validEntity('place'),synthetic:true}}],
 ['wrong entity kind',{person:{...validEntity('person'),kind:'place'}}],
 ['superseded place',{place:{...validEntity('place'),status:'superseded'}}],
]){
 test(name+' cannot become possible-future evidence',async()=>{
  const result=await evidence(changes)
  assert.equal(result.evidenceRefs.length,2)
 })
}
