import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
const source=()=>readFileSync(new URL('../cloudbuild.urai-verify.yaml',import.meta.url),'utf8')
function verify(c){
 assert.match(c,/_SOURCE_SHA:\s*'EXPLICIT_PIN_REQUIRED'/)
 assert.doesNotMatch(c,/_SOURCE_SHA:\s*'[0-9a-f]{40}'/)
 assert.match(c,/INVALID_SOURCE_SHA/)
 assert.match(c,/SOURCE_HEAD_MOVED/)
 assert.match(c,/git clone --depth=1 --single-branch/)
 assert.match(c,/pnpm install --frozen-lockfile/)
 assert.match(c,/run_gate functions-build pnpm --filter urai-functions build/)
 assert.match(c,/run_gate functions-tests pnpm --filter urai-functions test/)
 assert.match(c,/run_gate spatial-types pnpm --filter urai-tier1 typecheck/)
 assert.match(c,/run_gate spatial-build pnpm --filter urai-tier1 build/)
 assert.match(c,/if \[\[ "\$\$failed" -ne 0 \]\]; then exit 1; fi/)
 assert.match(c,/APPROVED_NONPRODUCTION_PROJECT/)
 assert.match(c,/APPROVED_MINIMAL_NONPRODUCTION_SERVICE_ACCOUNT/)
 assert.doesNotMatch(c,/--project=urai-4dc1d/)
 assert.doesNotMatch(c,/\bfirebase deploy\b/)
}
test('Cloud Build source and execution controls fail closed',()=>verify(source()))
test('historical implicit source pin is rejected',()=>{
 assert.throws(()=>verify(source().replace("_SOURCE_SHA: 'EXPLICIT_PIN_REQUIRED'","_SOURCE_SHA: '"+'a'.repeat(40)+"'")))
})
test('production project example and dropped Functions build are rejected',()=>{
 assert.throws(()=>verify(source().replace('--project=<APPROVED_NONPRODUCTION_PROJECT>','--project=urai-4dc1d')))
 assert.throws(()=>verify(source().replace('run_gate functions-build pnpm --filter urai-functions build','echo skip')))
})
