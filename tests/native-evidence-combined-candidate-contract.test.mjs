import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { CONTROLLER, parseRemoteHead } from '../scripts/run-rfinal-native-evidence.mjs'
import { selectNativeEvidenceTarget, COMBINED_CANDIDATE_BRANCH } from '../scripts/lib/native-evidence-target.mjs'
const source=readFileSync(new URL('../scripts/run-rfinal-native-evidence.mjs',import.meta.url),'utf8')
const pin='c66bd053be0d1620d10802bf79aed5fdec8c9799'
test('native candidate mode has explicit SHA and keeps old R-FINAL default',()=>{
  assert.equal(CONTROLLER.branch,'repair/rfinal-convergence-candidate-20261020')
  assert.equal(selectNativeEvidenceTarget({defaultBranch:CONTROLLER.branch}).branch,CONTROLLER.branch)
  assert.throws(()=>selectNativeEvidenceTarget({defaultBranch:CONTROLLER.branch,combined:true}),/COMBINED_EXACT_SHA_REQUIRED/)
  assert.equal(selectNativeEvidenceTarget({defaultBranch:CONTROLLER.branch,combined:true,pinnedSha:pin}).branch,COMBINED_CANDIDATE_BRANCH)
})
test('all Git remote and ancestry checks honor selected branch instead of the old R-FINAL branch',()=>{
  assert.match(source,/const target = selectNativeEvidenceTarget/)
  assert.match(source,/refs\/heads\/.*target\.branch/)
  assert.match(source,/--branch',target\.branch/)
  assert.match(source,/parseRemoteHead\(readFileSync\(gitRemote\.logPath, 'utf8'\), target\.branch\)/)
  assert.match(source,/parseRemoteHead\(readFileSync\(remoteCheck\.logPath,'utf8'\),target\.branch\)/)
  assert.match(source,/parseRemoteHead\(readFileSync\(lastRemote\.logPath,'utf8'\),target\.branch\)/)
  assert.equal(parseRemoteHead(pin+'\trefs/heads/'+COMBINED_CANDIDATE_BRANCH,COMBINED_CANDIDATE_BRANCH),pin)
})
test('combined evidence cannot become current release GO',()=>{
  assert.match(source,/receipt\.currentReleaseHeadVerified=false/)
  assert.match(source,/receipt\.fullCurrentHeadGreen=false/)
  assert.match(source,/receipt\.combinedDraftOnly=true/)
  assert.match(source,/receipt\.globalLaunchReady=false/)
  assert.match(source,/receipt\.privateBetaReady=false/)
})
test('Windows checkout and full native journey stages stay intact',()=>{
  for(const marker of ['WINDOWS_SAFE_SPARSE_PATTERNS','auditWindowsSparsePaths','frozen_install','functions_tests','tier1_typecheck','production_build','browser_visual','privacy_firestore_rules','refuseProtectedOverlap'])
    assert.ok(source.includes(marker),marker)
  assert.doesNotMatch(source,/shell:\s*true/)
})

test('runtime probes the same eight routes the final acceptance audit requires',()=>{
  assert.match(source,/for \(const route of REQUIRED_HTTP_ROUTES\) \{/)
  assert.match(source,/const httpAudit = assessHttpRoutes\(checks\)/)
  assert.doesNotMatch(source,/for \(const route of \['\/', '\/life-map', '\/focus', '\/replay', '\/login', '\/privacy'\]\)/)
})
