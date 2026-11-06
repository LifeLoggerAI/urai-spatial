import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import vm from 'node:vm'
const require = createRequire(import.meta.url)
const ts = require('typescript')
const code = readFileSync(new URL('../src/spatial/life-movie/lifeMovieConsentEpoch.ts', import.meta.url), 'utf8')
const client = readFileSync(new URL('../src/app/life-movie/LifeMovieClient.tsx', import.meta.url), 'utf8')
const hook = readFileSync(new URL('../src/spatial/life-movie/useLifeMovieConsentEpoch.ts', import.meta.url), 'utf8')
const output = ts.transpileModule(code, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } })
const exports = {}
vm.runInNewContext(output.outputText, { exports, require(id) {
  assert.equal(id, '@/app/privacy-controls/consentModel')
  return { isConsentPolicy: (raw, owner) => raw?.ownerId === owner && Number.isSafeInteger(raw.revision) }
}, Number, Math })
const { initialLifeMovieConsentEpoch: start, advanceLifeMovieConsentEpoch: advance, sameLifeMovieConsentEpoch: same } = exports
const owner = 'synthetic-movie-owner'
const policy = (revision = 7, overrides = {}) => ({ownerId:owner,revision,
  enforcement:{state:'fully-enforced'},domains:{memory:{mode:'granted',replayVisible:true}},...overrides})
const activated = () => advance(start(owner),owner,policy())

test('fresh current owner grant admits correct revision',()=>{
  const state=activated();assert.equal(state.allowed,true);assert.equal(state.revision,7)
  assert.equal(same(state,owner,7),true);assert.equal(same(state,owner,6),false)
})
test('wrong actor never inherits an existing owner authorization',()=>{
  const next=advance(activated(),'different-owner',policy());assert.equal(next.allowed,false)
  assert.equal(next.ownerId,'different-owner');assert.equal(same(next,owner,7),false)
})
for(const [label,value] of [
  ['revoked',policy(8,{domains:{memory:{mode:'denied',replayVisible:false}}})],
  ['paused',policy(8,{domains:{memory:{mode:'paused',replayVisible:true}}})],
  ['hidden replay',policy(8,{domains:{memory:{mode:'limited',replayVisible:false}}})],
  ['pending enforcement',policy(8,{enforcement:{state:'pending'}})],
]){
 test(`canonical policy ${label} revokes chapter admission`,()=>{
  const denied=advance(activated(),owner,value);assert.equal(denied.allowed,false);assert.equal(same(denied,owner,7),false)
  assert.equal(advance(denied,owner,policy(8)).allowed,false,'same epoch cannot regrant')
  assert.equal(advance(denied,owner,policy(9)).allowed,true,'newer authorized revision can regrant')
 })
}
test('stale cached earlier policy after a renewal cannot restore an old grant',()=>{
  const renewed=advance(activated(),owner,policy(8));const stale=advance(renewed,owner,policy(7))
  assert.equal(stale.allowed,false);assert.equal(same(stale,owner,7),false)
  assert.equal(advance(stale,owner,policy(8)).allowed,false, 'cached current revision after stale glitch cannot regrant')
  assert.equal(advance(stale,owner,policy(9)).allowed,true)
})
test('malformed policy invalidates visible chapter state; same revision cannot regrant',()=>{
  const denied=advance(activated(),owner,undefined);assert.equal(denied.allowed,false)
  assert.equal(advance(denied,owner,policy(7)).allowed,false)
  assert.equal(advance(denied,owner,policy(8)).allowed,true)
})
test('zero and unsafe revision cannot authorize a newly activated first memory',()=>{
  assert.equal(advance(start(owner),owner,policy(0)).allowed,false)
  assert.equal(same(activated(),owner,Number.NaN),false)
})
test('UI hook subscribes to owner policy, rejects switched actor, and rejects stale async completion',()=>{
  assert.match(hook,/onSnapshot\(doc\(getFirebaseDb\(\), 'users', user\.uid, 'privacyPolicy', 'current'\)/)
  assert.match(hook,/auth\.currentUser === user/)
  assert.match(hook,/current\.current = next/)
  assert.match(hook,/sameLifeMovieConsentEpoch/)
})
test('both Life Movie source reads provide the exact authorized policy epoch',()=>{
  assert.match(client,/parseSelectedMemory\(snapshot\.data\(\), user\.uid, chapter\.memoryId, process\.env\.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET, consentRevision\)/)
  assert.match(client,/parseSelectedMemory\(item\.data\(\), user\.uid, item\.id, process\.env\.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET, consentRevision\)/)
})
test('Life Movie keeps chapter state bound to owner and policy epoch',()=>{
  assert.match(client,/batch\.ownerId === user\.uid && batch\.revision === consentRevision/)
  assert.match(client,/consent\.isCurrent\(user\.uid, consentRevision\)/)
  assert.match(client,/if \(!stillAuthorized\(\)\) return/)
  assert.match(client,/useLifeMovieRuntimeManifest\(identityReady && consentAllowed \? requestedMovieId : null\)/)
})
test('real original consent and media protections remain in play',()=>{
  assert.match(client,/useReplayMemoryVisibility\(active\)/)
  assert.match(client,/useOwnedMemoryMediaPlayback\(/)
  assert.match(client,/getDoc\(doc\(getFirebaseDb\(\), 'users', user\.uid, 'memories'/)
})
