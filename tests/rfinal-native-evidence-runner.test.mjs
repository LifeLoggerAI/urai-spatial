import assert from 'node:assert/strict'
import test from 'node:test'
import os from 'node:os'
import path from 'node:path'
import { mkdtempSync, mkdirSync, rmSync } from 'node:fs'
import { CONTROLLER, STAGES, PINNED_FILES, inside, refuseProtectedOverlap,
  parseRemoteHead, verifyRefHead, formatCommand, safeVerificationEnvironment } from '../scripts/run-rfinal-native-evidence.mjs'

test('one original repository and existing PR branch; no duplicate Gold Master', () => {
  assert.equal(CONTROLLER.repository, 'https://github.com/LifeLoggerAI/urai-spatial.git')
  assert.equal(CONTROLLER.branch, 'repair/rfinal-convergence-candidate-20261020')
  assert.match(CONTROLLER.lastVerifiedSha, /^[0-9a-f]{40}$/)
})
test('baseline and any ancestor/descendant folder cannot be used as source or evidence', () => {
  const protectedPath=CONTROLLER.protectedBaseline
  for(const p of [protectedPath,path.join(protectedPath,'urai-tier1'),path.dirname(protectedPath)]) {
    assert.throws(() => refuseProtectedOverlap(p), /PROTECTED_BASELINE_OVERLAP/)
  }
  assert.doesNotThrow(() => refuseProtectedOverlap(path.join(os.homedir(),'Downloads','NEW_ISOLATED_RFINAL','source')))
})
test('same-path and relative containment reject traversal', () => {
  const dir=mkdtempSync(path.join(os.tmpdir(),'urai-pin-test-'))
  try{
    mkdirSync(path.join(dir,'baseline'))
    assert.equal(inside(dir,path.join(dir,'baseline')),true)
    assert.equal(inside(path.join(dir,'baseline'),dir),false)
    assert.equal(inside(dir,path.join(dir,'..','other')),false)
  }finally{rmSync(dir,{recursive:true,force:true})}
})
test('remote branch identity must be an exact SHA',()=>{
  const expected=CONTROLLER.lastVerifiedSha
  assert.equal(parseRemoteHead(expected+'\trefs/heads/'+CONTROLLER.branch),expected)
  assert.throws(()=>parseRemoteHead('1234\trefs/heads/'+CONTROLLER.branch),/REMOTE_REF_INVALID/)
  assert.throws(()=>parseRemoteHead(expected+'\trefs/heads/main'),/REMOTE_REF_INVALID/)
  assert.throws(()=>verifyRefHead('0'.repeat(40),expected),/SOURCE_HEAD_CHANGED/)
})
test('pinned exact bytes include meshopt, receipt, ADAM and private Life Model',()=>{
  assert.equal(PINNED_FILES.length,6)
  assert.ok(PINNED_FILES.some(f=>f.endsWith('meshopt_decoder.module.mjs')))
  assert.ok(PINNED_FILES.some(f=>f.includes('normal-repair-receipts')))
  assert.ok(PINNED_FILES.some(f=>f.includes('privateLifeModelReview.ts')))
})
test('maintained native stages retain Functions, contracts, assets and production build',()=>{
  const names=STAGES.map(x=>x.id)
  for(const required of ['frozen_install','functions_build','functions_tests','tier1_typecheck','tier1_unit_tests','canonical_contracts','production_assets','production_build'])assert.ok(names.includes(required))
  const install=names.indexOf('frozen_install')
  assert.ok(names.indexOf('production_build')>install)
  assert.ok(STAGES.filter(x=>x.requiresInstall).every(x=>names.indexOf(x.id)>install))
})
test('command formatter logs fixed command names without evaluating code',()=>{
  assert.equal(formatCommand(['corepack','pnpm','--filter','urai-functions','test']), 'corepack pnpm --filter urai-functions test')
})

test('native execution environment strips paid-provider credentials but keeps PATH and CI',()=>{
  const result=safeVerificationEnvironment({PATH:'/bin',OPENAI_API_KEY:'sensitive',
    STRIPE_SECRET_KEY:'sensitive',NEXT_PUBLIC_FIREBASE_PROJECT_ID:'live-project',CUSTOM_SETTING:'safe'})
  assert.equal(result.env.PATH,'/bin')
  assert.equal(result.env.CUSTOM_SETTING,'safe')
  assert.equal(result.env.CI,'1')
  assert.equal(result.env.OPENAI_API_KEY,undefined)
  assert.equal(result.env.STRIPE_SECRET_KEY,undefined)
  assert.equal(result.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,undefined)
  assert.equal(result.removedKeys.length,3)
})
