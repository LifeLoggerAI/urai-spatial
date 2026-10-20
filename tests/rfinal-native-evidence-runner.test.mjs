import assert from 'node:assert/strict'
import test from 'node:test'
import os from 'node:os'
import path from 'node:path'
import { mkdtempSync, mkdirSync, rmSync, readFileSync, writeFileSync, existsSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { CONTROLLER, STAGES, PINNED_FILES, inside, refuseProtectedOverlap,
  parseRemoteHead, verifyRefHead, formatCommand, safeVerificationEnvironment,
  REQUIRED_HTTP_ROUTES, assessHttpRoutes, WINDOWS_SAFE_SPARSE_PATTERNS,
  auditWindowsSparsePaths } from '../scripts/run-rfinal-native-evidence.mjs'

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
  for(const required of ['frozen_install','functions_build','functions_tests','tier1_typecheck','tier1_unit_tests','focused_contracts_full','canonical_contracts','production_assets','production_build'])assert.ok(names.includes(required))
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

function httpCases(overrides={}) {return REQUIRED_HTTP_ROUTES.map(path=>({path,status:overrides[path]??200}))}
test('all canonical production HTTP routes must be covered',()=>{
  assert.equal(assessHttpRoutes(httpCases()).passed,true)
  assert.equal(assessHttpRoutes(httpCases().filter(x=>x.path!=='/replay')).passed,false)
})
test('Home 200 cannot hide broken Replay, privacy or login',()=>{
  for(const path of ['/replay','/privacy','/login']){
    const result=assessHttpRoutes(httpCases({[path]:500}))
    assert.equal(result.passed,false)
    assert.ok(result.failures.some(x=>x.path===path))
  }
})
test('signed-out 401 and 403 protected denies are recognized without private acceptance',()=>{
  const result=assessHttpRoutes(httpCases({'/life-map':401,'/focus':403}))
  assert.equal(result.passed,true);assert.equal(result.authorizedDenials.length,2)
  assert.equal(assessHttpRoutes(httpCases({'/login':403})).passed,false)
})
test('network errors fail HTTP runtime verification',()=>{
  const checks=httpCases().map(x=>x.path==='/focus'?{path:'/focus',error:'ECONNRESET'}:x)
  assert.equal(assessHttpRoutes(checks).passed,false)
})
test('HTTP runtime code uses complete route audit, never Home-only check',()=>{
  const source=readFileSync(new URL('../scripts/run-rfinal-native-evidence.mjs',import.meta.url),'utf8')
  assert.match(source,/const httpAudit = assessHttpRoutes\(checks\)/)
  assert.doesNotMatch(source,/checks\.some\(x => x\.path === '\/'/)
})

test('native full focused contracts are executed, not inferred from compact unit tests', () => {
  const compact = STAGES.findIndex(stage => stage.id === 'tier1_unit_tests')
  const full = STAGES.findIndex(stage => stage.id === 'focused_contracts_full')
  const build = STAGES.findIndex(stage => stage.id === 'production_build')
  assert.ok(compact >= 0 && full > compact && build > full)
  assert.equal(STAGES[full].requiresInstall, true)
  assert.deepEqual(STAGES[full].command, [
    'corepack', 'pnpm', '--dir', 'urai-tier1', 'exec', 'node',
    'scripts/run-unit-contract-tests.mjs',
  ])
  const original = readFileSync(new URL('../urai-tier1/scripts/run-unit-contract-tests.mjs', import.meta.url), 'utf8')
  assert.match(original, /const focusedContractTests = \[/)
  assert.match(original, /\['--import', 'tsx', '--test', \.\.\.focusedContractTests\]/)
})

test('native checkout excludes Windows-illegal audit archives before materializing the app', () => {
  assert.deepEqual([...WINDOWS_SAFE_SPARSE_PATTERNS], [
    '/*','!/*audit/**','!/urai-tier1/*audit/**',
    '!/.ai-backups/**','!/_quarantine/**',
  ])
  const script = readFileSync(new URL('../scripts/run-rfinal-native-evidence.mjs',import.meta.url),'utf8')
  const sparse = script.indexOf("record('windows_safe_sparse_checkout'")
  const checkout = script.indexOf("record('exact_checkout'")
  assert.ok(sparse > 0 && checkout > sparse, 'sparse rules must apply before Windows checkout')
  assert.match(script, /sparse-checkout','set','--no-cone'/)
  assert.match(script, /WINDOWS_SAFE_SPARSE_CHECKOUT_FAILED/)
})

test('reviewed Windows sparse exclusions preserve real sources, codecs and Home proof', () => {
  const root = mkdtempSync(path.join(os.tmpdir(), 'urai-native-sparse-'))
  const git = (cwd, args) => {
    const result = spawnSync('git', args, { cwd, encoding: 'utf8', windowsHide: true })
    assert.equal(result.status, 0, args.join(' ') + ': ' + result.stderr)
    return result.stdout
  }
  try {
    const origin = path.join(root, 'origin')
    const checked = path.join(root, 'checked')
    mkdirSync(origin)
    git(origin, ['init','-q'])
    git(origin, ['config','user.email','fixture@example.invalid'])
    git(origin, ['config','user.name','Fixture'])
    const excluded = [
      'archived-audit/old.txt',
      'urai-tier1/legacy-audit/old.txt',
      '.ai-backups/old.txt',
      '_quarantine/old.txt',
    ]
    const required = [
      'package.json','pnpm-lock.yaml',
      'urai-tier1/src/app/home/page.tsx',
      'scripts/vendor/meshopt_encoder.module.mjs',
      'scripts/vendor/meshopt_decoder.module.mjs',
      'operations/assets/normal-repair-receipts/home-entry-chamber-v1.json',
    ]
    for (const entry of [...excluded,...required]) {
      const file = path.join(origin,...entry.split('/'))
      mkdirSync(path.dirname(file), { recursive: true })
      writeFileSync(file, entry + '\n')
    }
    git(origin, ['add','-A'])
    git(origin, ['commit','-qm','fixture'])
    git(root, ['clone','-q','--no-checkout',origin,checked])
    git(checked, ['sparse-checkout','set','--no-cone',...WINDOWS_SAFE_SPARSE_PATTERNS])
    git(checked, ['-c','core.protectNTFS=false','checkout','-q','--detach','HEAD'])
    assert.equal(git(checked, ['config','--local','--get','core.protectNTFS']).trim(), '')
    for (const entry of excluded)
      assert.equal(existsSync(path.join(checked,...entry.split('/'))),false,entry)
    for (const entry of required)
      assert.equal(existsSync(path.join(checked,...entry.split('/'))),true,entry)
    assert.equal(git(checked,['status','--porcelain','--untracked-files=no']),'')
  } finally {
    rmSync(root,{recursive:true,force:true})
  }
})

test('only excluded historical Windows-invalid names are allowed in the exact Git tree', () => {
  const allowed = [
    '*audit/20260402*legacy/backup/page.tsx',
    'urai-tier1/*audit/20260419*legacy/run.log',
    '.ai-backups/20260320*legacy/payload.ts',
    '_quarantine/_archive/VolumetricNebulaNoise.tsx:',
  ]
  const preserved = [
    'package.json', 'pnpm-lock.yaml',
    'urai-tier1/src/app/page.tsx',
    'scripts/vendor/meshopt_decoder.module.mjs',
    'operations/assets/normal-repair-receipts/home-entry-chamber-v1.json',
  ]
  const good = auditWindowsSparsePaths([...allowed, ...preserved])
  assert.equal(good.tracked, allowed.length+preserved.length)
  assert.equal(good.excludedUnsafe, 4)
  assert.deepEqual(good.unexpected,[])
  assert.deepEqual(good.collisions,[])
  const rejected = auditWindowsSparsePaths([...preserved,
    'urai-tier1/src/app/bad:stream.tsx',
    'scripts/CON.txt',
    'operations/private*.json',
    'urai-tier1/src/app/PAGE.tsx',
    'urai-tier1/src/app/page.tsx',
  ])
  assert.equal(rejected.unexpected.length, 3)
  assert.equal(rejected.collisions.length, 1)
})

test('NTFS early-path bypass is command-local, preceded by a fail-closed Git tree audit', () => {
  const source=readFileSync(new URL('../scripts/run-rfinal-native-evidence.mjs',import.meta.url),'utf8')
  const audit=source.indexOf("record('windows_sparse_tree_audit'")
  const checkout=source.indexOf("record('exact_checkout'")
  assert.ok(audit>0 && checkout>audit)
  assert.match(source,/WINDOWS_UNEXCLUDED_UNSAFE_TREE_PATH/)
  assert.match(source,/'-c','core.protectNTFS=false'/)
  assert.doesNotMatch(source,/config','core.protectNTFS','false'/)
})
