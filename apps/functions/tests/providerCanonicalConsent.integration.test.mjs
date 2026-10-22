import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { createHash } from 'node:crypto'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const ts = require('typescript')

const root = new URL('../src/', import.meta.url)
async function load(path) {
  const source = fs.readFileSync(new URL(path, root), 'utf8')
  const compiled = ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022
  }, reportDiagnostics: true })
  assert.deepEqual(compiled.diagnostics ?? [], [], "Cannot transpile " + path)
  return import('data:text/javascript;charset=utf-8,' + encodeURIComponent(compiled.outputText))
}
const { isCanonicalStoredPolicy, CONSENT_DOMAINS } = await load('consentPolicyAuthority.ts')
const { providerOwnerAuthorityDecision } = await load('providerOwnerAuthority.ts')
const original = fs.readFileSync(new URL('providerFunctions.ts', root), 'utf8')
const start = original.indexOf('function assertProviderConsent(')
const end = original.indexOf('function readBody(', start)
assert.ok(start > 0 && end > start)
const providerSource = ts.transpileModule(original.slice(start, end), {
  compilerOptions: { module: ts.ModuleKind.None, target: ts.ScriptTarget.ES2022 }, reportDiagnostics: true
})
assert.deepEqual(providerSource.diagnostics ?? [], [])
const mk = (exists, row={}) => ({ exists, get: key => exists?row[key]:undefined, data: () => exists ? row : undefined })
const domain = () => ({
  mode:'denied', retentionDays:null, precise:false, replayVisible:false,
  lifeMapVisible:false, modelContext:false, sharingEnabled:false,
  automationEnabled:false, likenessEnabled:false
})
function policy(overrides={}) {
  const domains = Object.fromEntries(CONSENT_DOMAINS.map(key=>[key,domain()]))
  domains.models.mode = 'granted'; domains.models.modelContext = true
  domains.memory.mode = 'granted'; domains.memory.modelContext = true
  return { version:2, revision:12, ownerId:'owner', domains,
    enforcement:{state:'fully-enforced',jobId:null,affectedTargets:[],providerState:'complete'},
    ...overrides }
}
class ProviderError extends Error {
  constructor(status,code,message) {super(message); this.status=status; this.code=code}
}
class Timestamp {
  constructor(v){this.v=v}
  toMillis(){return this.v}
  static fromMillis(v){return new Timestamp(v)}
}
const admin={firestore:{Timestamp,FieldValue:{serverTimestamp:()=>0,increment:(v)=>({increment:v})}}}
const isRecord=(v)=>!!v&&typeof v==='object'&&!Array.isArray(v)
function runtime(updates={}) {
  const records = {
    'users/owner':mk(true,{deleted:false,accountStatus:'active',privacyRevision:12}),
    'users/owner/privacyPolicy/current':mk(true,policy()),
    'users/owner/providerConnections/elevenlabs':mk(true,{processingAllowed:true}),
    'users/owner/privacyRuntime/exportAuthority':mk(true,{pendingDeletions:{}}),
    'privacyDeletionTombstones/owner':mk(false),
    'users/owner/providerRateLimits/elevenlabs':mk(false),
    ...updates,
  }
  const writes=[]
  const db={doc:(path)=>({path}),runTransaction:async fn=>fn({
    get:async ref=>records[ref.path]||mk(false),
    set:(ref,value,opts)=>writes.push({path:ref.path,value,opts})
  })}
  const construct = new Function('db','admin','ProviderError','RATE_WINDOW_MS','createHash',
    'providerOwnerAuthorityDecision','isCanonicalStoredPolicy','isRecord',
    providerSource.outputText+'\nreturn {consumeRateLimit,recordTelemetry};')
  return {...construct(db,admin,ProviderError,60000,createHash,providerOwnerAuthorityDecision,
    isCanonicalStoredPolicy,isRecord),writes}
}

test('real canonical saved policy accepts complete owner schema',()=>{
  assert.equal(isCanonicalStoredPolicy(policy(),'owner'),true)
  assert.equal(isCanonicalStoredPolicy(policy(),'another-owner'),false)
})
test('real canonical validator rejects missing domains and unknown fields',()=>{
  const p=policy();delete p.domains.workforce
  assert.equal(isCanonicalStoredPolicy(p,'owner'),false)
  const extra=policy();extra.domains.models.unreviewedPermission=true
  assert.equal(isCanonicalStoredPolicy(extra,'owner'),false)
})
test('current owner with real canonical policy can reserve one voice rate operation',async()=>{
  const {consumeRateLimit,writes}=runtime()
  await consumeRateLimit('owner','elevenlabs',6)
  assert.equal(writes.length,1)
  assert.equal(writes[0].path,'users/owner/providerRateLimits/elevenlabs')
})
test('canonical models consent paused or enforcement pending rejects paid rate write',async()=>{
  for(const change of [p=>{p.domains.models.mode='paused'},p=>{p.enforcement.state='pending'}]){
    const altered=policy();change(altered)
    const {consumeRateLimit,writes}=runtime({'users/owner/privacyPolicy/current':mk(true,altered)})
    await assert.rejects(consumeRateLimit('owner','elevenlabs',6), e=>e.code==='MODEL_PROCESSING_NOT_AUTHORIZED'||e.code==='CONSENT_ENFORCEMENT_PENDING')
    assert.equal(writes.length,0)
  }
})
test('canonical policy with stale projection or deletion marker blocks reads and writes',async()=>{
  for(const updates of [
    {'users/owner':mk(true,{accountStatus:'active',privacyRevision:11})},
    {'users/owner/privacyRuntime/exportAuthority':mk(true,{pendingDeletions:{job:true}})},
    {'privacyDeletionTombstones/owner':mk(true,{})},
  ]){
    const {consumeRateLimit,writes}=runtime(updates)
    await assert.rejects(consumeRateLimit('owner','elevenlabs',6), e=>e.code==='PROVIDER_OWNER_INACTIVE')
    assert.equal(writes.length,0)
  }
})
test('real canonical policy disallows undeclared schema even for otherwise active account',async()=>{
  const invalid=policy(); invalid.domains.models.extraUnknown = true
  const {consumeRateLimit,writes}=runtime({'users/owner/privacyPolicy/current':mk(true,invalid)})
  await assert.rejects(consumeRateLimit('owner','elevenlabs',6), e=>e.code==='CONSENT_POLICY_REQUIRED')
  assert.equal(writes.length,0)
})
test('current owner telemetry remains aggregate-only using actual canonical policy',async()=>{
  const {recordTelemetry,writes}=runtime()
  await recordTelemetry({uid:'owner',provider:'elevenlabs',outcome:'success',inputUnits:12,latencyMs:31})
  assert.equal(writes.length,1)
  assert.equal(writes[0].path,'users/owner/providerTelemetry/elevenlabs')
  assert.equal('message' in writes[0].value,false)
})
