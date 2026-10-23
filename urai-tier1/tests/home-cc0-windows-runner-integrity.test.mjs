import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import test from 'node:test'
const read=(name)=>readFileSync(new URL('../../scripts/'+name,import.meta.url),'utf8')
const runner=read('RUN_HOME_CC0_REAL_PIXEL_PROOF_20261022.ps1')
const starter=read('START_HOME_CC0_ISOLATED_PROOF_20261022.ps1')
test('exact one clean proof runner, no prior duplicated malformed source',()=>{
 assert.equal((runner.match(/\[CmdletBinding\(\)\]/g)||[]).length,1)
 assert.equal((runner.match(/function NodeStep/g)||[]).length,1)
 assert.equal((runner.match(/REVIEW_STAGE_ALREADY_EXISTS/g)||[]).length,1)
 assert.match(runner,/PINNED_SOURCE_HEAD_MISMATCH/)
 assert.match(runner,/VISUAL_OWNER_OR_ISOLATED_DETACHED_HEAD_REQUIRED/)
 assert.match(runner,/BROWSER_EVIDENCE_FAIL_EXIT/)
 assert.match(runner,/ConvertTo-Json -Depth 8/)
 assert.ok(!runner.includes("  if($ExpectedHead -ne '' -and ($ExpectedHead -notmatch '^[a-f0-9]{40}\n"))
})
test('isolated runner allows source-pinned detached checkout only',()=>{
 assert.match(starter,/worktree add --detach --no-checkout/)
 assert.match(starter,/sparse-checkout set urai-tier1 scripts operations apps packages tests/)
 assert.match(starter,/ISOLATED_HEAD_DRIFT/)
 assert.match(starter,/--frozen-lockfile --ignore-scripts/)
 assert.match(starter,/check-install-disk-space.mjs/)
 assert.match(starter,/URAI_HOME_CC0_NONPRODUCTION_BOOTSTRAP/)
 assert.match(runner,/ExpectedHead -ne ''/)
})
test('runner retains failure receipts and rejects release approval',()=>{
 assert.match(runner,/BLOCKED_NO_ART_APPROVAL/)
 assert.match(runner,/RELEASE=NO-GO/)
 assert.match(runner,/CANDIDATE_STAGE_CLEAN_FAILED/)
 assert.match(runner,/assert-excluded/)
 assert.match(runner,/ORIGINAL_HOME_HTTP_200_NOT_OBSERVED/)
 assert.match(runner,/PORT_ALREADY_OWNED/)
});
