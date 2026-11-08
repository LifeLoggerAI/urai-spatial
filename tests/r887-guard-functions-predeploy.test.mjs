import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { attestFunctionsBuild } from '../scripts/R883_VERIFY_FUNCTIONS_BUILD.mjs'
import { deriveGovernedConfig, prepareGovernedFunctions, verifyAfterFirebasePredeploy } from '../scripts/r887-guard-functions-predeploy.mjs'

const originalHooks = ['node scripts/check-spatial-export-deployment-boundary.mjs','pnpm --filter urai-functions build']
const firebase = { hosting: { public: 'urai-tier1/out' }, functions: {
  source: 'apps/functions', codebase: 'urai-spatial-functions', runtime: 'nodejs22', predeploy: originalHooks,
}}
const put = (file, data) => { mkdirSync(dirname(file),{recursive:true});writeFileSync(file,data) }
const git=(root,...args)=>execFileSync('git',args,{cwd:root,encoding:'utf8'}).trim()
function fixture(t){
  const root=mkdtempSync(join(tmpdir(),'urai-r887-'))
  t.after(()=>rmSync(root,{recursive:true,force:true}))
  git(root,'init','-q');git(root,'config','user.name','R887 fixture');git(root,'config','user.email','fixture@example.invalid')
  put(join(root,'firebase.json'),JSON.stringify(firebase,null,2)+'\n')
  put(join(root,'apps/functions/package.json'),'{}\n')
  put(join(root,'apps/functions/src/index.ts'),'export const id = 1\n')
  put(join(root,'apps/functions/lib/apps/functions/src/index.js'),'exports.id = 1\n')
  put(join(root,'packages/tier-locks/src/index.ts'),'export const tier = 1\n')
  put(join(root,'packages/tier-locks/package.json'),'{}\n')
  for (const p of ['pnpm-lock.yaml','pnpm-workspace.yaml','package.json']) put(join(root,p),'text\n')
  git(root,'add','firebase.json','apps/functions/package.json','apps/functions/src/index.ts',
    'packages/tier-locks/src/index.ts','packages/tier-locks/package.json',
    'pnpm-lock.yaml','pnpm-workspace.yaml','package.json')
  git(root,'commit','-qm','fixture')
  const RELEASE_SHA=git(root,'rev-parse','HEAD')
  const env={RELEASE_SHA,GITHUB_RUN_ID:'887001',GITHUB_REPOSITORY:'LifeLoggerAI/urai-spatial',
    FIREBASE_PROJECT:'urai-4dc1d',GCLOUD_PROJECT:'urai-4dc1d',PROJECT_DIR:root,RESOURCE_DIR:join(root,'apps/functions')}
  mkdirSync(join(root,'deployment-receipt/predeploy'),{recursive:true})
  attestFunctionsBuild({repoRoot:root,expectedSha:RELEASE_SHA,runId:env.GITHUB_RUN_ID,
    manifestPath:join(root,'deployment-receipt/predeploy/functions-build-evidence.json')})
  return {root,env}
}
test('R887 preserves both original hooks and appends verification as the last hook',()=>{
  const result=deriveGovernedConfig(firebase)
  assert.deepEqual(result.functions.predeploy,[...originalHooks,'node scripts/r887-guard-functions-predeploy.mjs --mode verify'])
  assert.deepEqual(firebase.functions.predeploy,originalHooks)
  assert.deepEqual(result.hosting,firebase.hosting)
})
test('R887 refuses removal or reordering of the original privacy/export gate',()=>{
  const bad=structuredClone(firebase)
  bad.functions.predeploy.reverse()
  assert.throws(()=>deriveGovernedConfig(bad),/predeploy hooks changed/)
  bad.functions.predeploy=[]
  assert.throws(()=>deriveGovernedConfig(bad),/predeploy hooks changed/)
})
test('R887 prepare refuses wrong repository and project',t=>{
  const {root,env}=fixture(t)
  assert.throws(()=>prepareGovernedFunctions({repoRoot:root,env:{...env,FIREBASE_PROJECT:'other'}}),/Wrong canonical/)
  assert.throws(()=>prepareGovernedFunctions({repoRoot:root,env:{...env,GITHUB_REPOSITORY:'other/repo'}}),/Wrong canonical/)
})
test('R887 preparer writes source-preserving exact config and predeploy receipt',t=>{
  const {root,env}=fixture(t)
  const original=readFileSync(join(root,'firebase.json'),'utf8')
  const result=prepareGovernedFunctions({repoRoot:root,env})
  assert.equal(result.pass,true)
  assert.equal(readFileSync(join(root,'firebase.json'),'utf8'),original)
  const actual=JSON.parse(readFileSync(join(root,'firebase.r887.governed.json'),'utf8'))
  assert.deepEqual(actual,deriveGovernedConfig(firebase))
  assert.throws(()=>prepareGovernedFunctions({repoRoot:root,env}),/overwrite/)
})
test('R887 passes after stable predeploy build and records non-production receipt',t=>{
  const {root,env}=fixture(t)
  prepareGovernedFunctions({repoRoot:root,env})
  const out=verifyAfterFirebasePredeploy({repoRoot:root,env})
  assert.equal(out.pass,true)
  const receipt=JSON.parse(readFileSync(join(root,'deployment-receipt/predeploy/r887-post-predeploy-evidence.json'),'utf8'))
  assert.equal(receipt.productionCertified,false)
  assert.equal(receipt.releaseSha,env.RELEASE_SHA)
})
test('R887 rejects changed compiled JavaScript after Firebase predeploy build',t=>{
  const {root,env}=fixture(t)
  prepareGovernedFunctions({repoRoot:root,env})
  put(join(root,'apps/functions/lib/apps/functions/src/index.js'),'exports.id = 2\n')
  assert.throws(()=>verifyAfterFirebasePredeploy({repoRoot:root,env}),/compiled bytes differ|Functions build inputs or compiled bytes differ/)
})
test('R887 rejects changed Firebase-generated config before predeploy verification',t=>{
  const {root,env}=fixture(t)
  prepareGovernedFunctions({repoRoot:root,env})
  const file=join(root,'firebase.r887.governed.json')
  const altered=JSON.parse(readFileSync(file,'utf8'))
  altered.functions.predeploy.pop()
  writeFileSync(file,JSON.stringify(altered)+'\n')
  assert.throws(()=>verifyAfterFirebasePredeploy({repoRoot:root,env}),/Governed Firebase config differs/)
})
test('R887 refuses mismatched Firebase hook project or project/resource directory',t=>{
  const {root,env}=fixture(t)
  prepareGovernedFunctions({repoRoot:root,env})
  assert.throws(()=>verifyAfterFirebasePredeploy({repoRoot:root,env:{...env,GCLOUD_PROJECT:'different'}}),/active project mismatch/)
  assert.throws(()=>verifyAfterFirebasePredeploy({repoRoot:root,env:{...env,PROJECT_DIR:'/tmp/elsewhere'}}),/PROJECT_DIR/)
  assert.throws(()=>verifyAfterFirebasePredeploy({repoRoot:root,env:{...env,RESOURCE_DIR:'/tmp/elsewhere'}}),/RESOURCE_DIR/)
})
test('R887 rejects changed canonical Firebase config after approved source commit',t=>{
  const {root,env}=fixture(t)
  const bad=structuredClone(firebase)
  bad.functions.predeploy=[]
  writeFileSync(join(root,'firebase.json'),JSON.stringify(bad)+'\n')
  assert.throws(()=>prepareGovernedFunctions({repoRoot:root,env}),/Canonical Firebase config differs/)
})