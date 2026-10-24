import assert from 'node:assert/strict'
import test from 'node:test'
import os from 'node:os'
import path from 'node:path'
import { mkdtempSync, mkdirSync, rmSync, readFileSync, writeFileSync, existsSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { deflateSync } from 'node:zlib'
import { pngCrc32 } from '../scripts/visual-png-integrity.mjs'
import { fileURLToPath } from 'node:url'
import { CONTROLLER, STAGES, PINNED_FILES, inside, refuseProtectedOverlap,
  parseRemoteHead, verifyRefHead, formatCommand, safeVerificationEnvironment,
  REQUIRED_HTTP_ROUTES, assessHttpRoutes, REQUIRED_VISUAL_CAPTURES,
  verifyVisualBrowserArtifacts, WINDOWS_SAFE_SPARSE_PATTERNS,
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

test('native R-FINAL stages use exact portable Node without cmd shell',()=>{
  const source=readFileSync(new URL('../scripts/run-rfinal-native-evidence.mjs',import.meta.url),'utf8')
  assert.match(source,/NATIVE_RUNNER_ONLY_PINNED_PNPM_ALLOWED/)
  assert.match(source,/\['scripts\/run-pnpm\.mjs', \.\.\.args\.slice\(1\)\]/)
  assert.match(source,/const actual = executable === 'node' \|\| executable === 'corepack'/)
  assert.match(source,/const argv = \[process\.execPath, 'scripts\/run-pnpm\.mjs'/)
  assert.doesNotMatch(source,/\['cmd\.exe'/)
  assert.doesNotMatch(source,/const useShell = process\.platform === 'win32'/)
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

function httpCases(overrides={}) {return REQUIRED_HTTP_ROUTES.map(path=>({path,status:overrides[path]??200,contentType:'text/html; charset=utf-8'}))}
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
test('required support and privacy policy routes cannot be missing or return 404',()=>{
  for(const path of ['/support','/privacy-policy']){
    const missing=assessHttpRoutes(httpCases().filter(item=>item.path!==path))
    assert.equal(missing.passed,false, path+' missing')
    assert.ok(missing.failures.some(item=>item.path===path))
    const absent=assessHttpRoutes(httpCases({[path]:404}))
    assert.equal(absent.passed,false, path+' 404')
    assert.ok(absent.failures.some(item=>item.path===path && item.status===404))
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

test('native production runtime refuses unrelated HTTP 200 and 404 startup surfaces',()=>{
  const source=readFileSync(new URL('../scripts/run-rfinal-native-evidence.mjs',import.meta.url),'utf8')
  assert.match(source,/import \{ isUraiHomeDocument \} from '\.\.\/tests\/spatial-owned-server\.mjs'/)
  assert.match(source,/reply\.status === 200/)
  assert.match(source,/isUraiHomeDocument\(await reply\.text\(\)\)/)
  assert.match(source,/ORIGINAL_URAI_HOME_NOT_READY/)
  assert.doesNotMatch(source,/ready\s*=\s*reply\.status\s*>\s*0/)
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
    // An absent Git config key returns 1, not 0. Inspect that expected
    // absence directly; the success-only helper would reject a safe checkout.
    const ntfs = spawnSync('git', ['config','--local','--get','core.protectNTFS'], {
      cwd: checked, encoding: 'utf8', windowsHide: true,
    })
    assert.equal(ntfs.status, 1, 'NTFS override must not persist in local config')
    assert.equal(ntfs.stdout, '')
    assert.equal(ntfs.stderr, '')
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
    '*audit',
    'urai-tier1/*audit',
    '.ai-backups',
    '_quarantine',
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
  // The .ai-backups and _quarantine directory names themselves are NTFS-safe;
  // only their invalid descendants contribute to the unsafe-path count.
  assert.equal(good.excludedUnsafe, 6)
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

test('Windows pnpm importer keys normalize and fixture importer authority remains intact', () => {
  const source=readFileSync(new URL('../scripts/check-lockfile-present.mjs',import.meta.url),'utf8')
  assert.match(source,/dir\.replaceAll\('\\\\', '\/'\)/)
  const root=mkdtempSync(path.join(os.tmpdir(),'urai-native-importer-'))
  try {
    const dirs=['apps/functions','packages/tier-locks','packages/release-tools','distribution/android-shell','distribution/ios-shell']
    writeFileSync(path.join(root,'package.json'),JSON.stringify({name:'fixture',private:true}))
    const entries=['  .: {}']
    for(const dir of dirs){
      const nested=path.join(root,...dir.split('/'))
      mkdirSync(nested,{recursive:true})
      writeFileSync(path.join(nested,'package.json'),JSON.stringify({name:'fixture-'+dir.replaceAll('/','-')}))
      entries.push('  '+dir+': {}')
    }
    writeFileSync(path.join(root,'pnpm-workspace.yaml'),dirs.map(dir=>'  - '+dir).join('\n')+'\n')
    writeFileSync(path.join(root,'pnpm-lock.yaml'),"lockfileVersion: '9.0'\nimporters:\n"+entries.join('\n')+'\n')
    const checker=fileURLToPath(new URL('../scripts/check-lockfile-present.mjs',import.meta.url))
    const run=spawnSync(process.execPath,[checker],{cwd:root,encoding:'utf8',windowsHide:true})
    assert.equal(run.status,0,run.stdout+' '+run.stderr)
  }finally{rmSync(root,{recursive:true,force:true})}
})

test('Firestore uses pinned CLI entry and retains one emulator script argv without shell',()=>{
  const source=readFileSync(new URL('../scripts/run-firestore-rules-tests.mjs',import.meta.url),'utf8')
  assert.match(source,/require\.resolve\('firebase-tools\/package\.json'\)/)
  assert.match(source,/resolve\(dirname\(firebaseManifestPath\), firebaseEntry\)/)
  assert.match(source,/run\(process\.execPath, \[/)
  assert.match(source,/shell: false/)
  assert.doesNotMatch(source,/shell: process\.platform === 'win32'/)
  const command='node --test tests/firestore.assetManifests.rules.test.mjs tests/firestore.privacyConsent.rules.test.mjs tests/firestore.lifeModel.rules.test.mjs'
  const dir=mkdtempSync(path.join(os.tmpdir(),'urai-firestore-argv-'))
  try{
    const capture=path.join(dir,'argv.cjs')
    writeFileSync(capture,'process.stdout.write(JSON.stringify(process.argv.slice(2)))')
    const run=spawnSync(process.execPath,[capture,'emulators:exec','--only','firestore',command],{encoding:'utf8',shell:false})
    assert.equal(run.status,0,run.stderr)
    assert.deepEqual(JSON.parse(run.stdout),['emulators:exec','--only','firestore',command])
  }finally{rmSync(dir,{recursive:true,force:true})}
})

test('browser resolves Playwright public API from owning tier1 workspace',()=>{
  const browser=readFileSync(new URL('../tests/spatial-tier-lock-hardening.mjs',import.meta.url),'utf8')
  assert.match(browser,/createRequire\(new URL\('\.\.\/urai-tier1\/package\.json', import\.meta\.url\)\)/)
  assert.match(browser,/workspaceRequire\('playwright'\)/)
  assert.doesNotMatch(browser,/node_modules\/playwright\/index\.js/)
  assert.doesNotMatch(browser,/import \{ chromium \} from 'playwright'/)
})

test('Replay tier5 server boots through pinned Node 22 workspace pnpm, never ambient shell', () => {
  const replay = readFileSync(new URL('./replay-tier5-lock.mjs', import.meta.url), 'utf8')
  assert.match(replay, /spawn\(process\.execPath, \[/)
  assert.match(replay, /'scripts\/run-pnpm\.mjs', '--filter', 'urai-tier1'/)
  assert.match(replay, /shell: false/)
  assert.match(replay, /serverScript, '--hostname', '127\.0\.0\.1', '--port'/)
  assert.doesNotMatch(replay, /spawn\('pnpm'/)
  assert.doesNotMatch(replay, /shell: process\.platform === 'win32'/)
  assert.match(replay, /if \(SERVER_MODE === 'production'\)/)
  assert.match(replay, /if \(consoleErrors\.length\) throw new Error/)
})

test('portable Node authority reaches pnpm grandchildren even when ambient PATH has no Node', () => {
  const root = mkdtempSync(path.join(os.tmpdir(), 'urai-pnpm-node-authority-'))
  try {
    mkdirSync(path.join(root, 'scripts'), { recursive: true })
    mkdirSync(path.join(root, 'node_modules/pnpm/bin'), { recursive: true })
    writeFileSync(path.join(root, 'scripts/run-pnpm.mjs'), readFileSync(new URL('../scripts/run-pnpm.mjs', import.meta.url)))
    writeFileSync(path.join(root, 'scripts/pnpm-bootstrap-resolver.mjs'), readFileSync(new URL('../scripts/pnpm-bootstrap-resolver.mjs', import.meta.url)))
    // Disclosed CLI boundary fixture; the grandchild is a real Node process,
    // resolved by name exactly as pnpm's Next/tsc shims resolve their runtime.
    const pinnedBin = path.join(root, 'node_modules/.pnpm/pnpm@10.0.0/node_modules/pnpm/bin')
    mkdirSync(pinnedBin, { recursive: true })
    writeFileSync(path.join(pinnedBin, 'pnpm.cjs'), `
      const {spawnSync}=require('node:child_process');
      const result=spawnSync('node',['-p','process.execPath'],{encoding:'utf8'});
      if(result.error)console.error(result.error.code);
      if(result.stdout)process.stdout.write(result.stdout);
      process.exit(result.status??1);
    `)
    const env = { ...process.env }
    delete env.npm_execpath
    const pathKey = Object.keys(env).find(key => key.toLowerCase() === 'path') || 'PATH'
    env[pathKey] = root
    const result = spawnSync(process.execPath, ['scripts/run-pnpm.mjs', 'exec', 'node', '--version'], {
      cwd: root, env, encoding: 'utf8', shell: false,
    })
    assert.equal(result.status, 0, result.stdout + result.stderr)
    const actual = result.stdout.trim().split(/\r?\n/).at(-1)
    assert.equal(path.resolve(actual), path.resolve(process.execPath))
    assert.equal(env[pathKey], root, 'caller environment remains unchanged')
  } finally { rmSync(root, { recursive: true, force: true }) }
})

test('R-FINAL executes full maintained, native platform and XR lanes without substituting static browser assertions', () => {
  const byId = new Map(STAGES.map(stage => [stage.id, stage.command.join(' ')]))
  for (const id of ['tier1_complete_all_tests', 'android_native_identity_tests',
    'ios_native_preparation_tests', 'ios_source_archive_tests',
    'native_static_provenance_tests', 'xr_release_matrix_source', 'xr_runtime_contracts'])
    assert.ok(byId.has(id), id + ' must execute on the native candidate')
  assert.match(byId.get('tier1_complete_all_tests'), /test:all/)
  assert.match(byId.get('xr_runtime_contracts'), /xr:contract/)
  const source = readFileSync(new URL('../scripts/run-rfinal-native-evidence.mjs', import.meta.url), 'utf8')
  assert.match(source, /'navigation', 'camera', 'race', 'data', 'visual'/)
  assert.match(source, /'browser_visual'/)
  assert.match(source, /verifyVisualBrowserArtifacts\(evidence\)/)
})
test('R-FINAL visual evidence rejects an absent suite report and incomplete capture', () => {
  const evidence = mkdtempSync(path.join(os.tmpdir(), 'urai-visual-evidence-'))
  try {
    assert.equal(verifyVisualBrowserArtifacts(evidence).passed, false)
    const dir = path.join(evidence, 'browser-artifacts')
    mkdirSync(dir)
    writeFileSync(path.join(dir, 'spatial-tier-lock-hardening-report-visual.json'),
      JSON.stringify({suite:'visual',checks:[{name:'visual',status:'passed'}],screenshots:[]}))
    const incomplete = verifyVisualBrowserArtifacts(evidence)
    assert.equal(incomplete.passed, false)
    assert.equal(incomplete.capturesVerified, 0)
    assert.ok(incomplete.failures.some(reason => reason.includes('MISSING_CAPTURE')))
  } finally {rmSync(evidence,{recursive:true,force:true})}
})
test('R-FINAL visual evidence requires each screenshot and never confers physical approval', () => {
  const evidence = mkdtempSync(path.join(os.tmpdir(), 'urai-visual-captures-'))
  try {
    const dir = path.join(evidence, 'browser-artifacts')
    mkdirSync(dir)
    const captures = []
    for (const name of REQUIRED_VISUAL_CAPTURES) {
      const screenshot = path.join(dir, name + '.png')
      writeFileSync(screenshot, Buffer.alloc(4096, 137))
      captures.push(screenshot)
    }
    writeFileSync(path.join(dir, 'spatial-tier-lock-hardening-report-visual.json'),
      JSON.stringify({suite:'visual',checks:[{name:'visual',status:'passed'}],screenshots:captures}))
    const accepted = verifyVisualBrowserArtifacts(evidence)
    assert.equal(accepted.passed, false, 'arbitrary 4096-byte fixtures must never qualify as real screenshots')
    assert.equal(accepted.capturesVerified, 0)
    assert.ok(accepted.failures.every(failure => failure.includes('VISUAL_CAPTURE_INVALID_PNG')))
    assert.match(accepted.scope, /not physical-device/)
    writeFileSync(captures[0], Buffer.alloc(10))
    assert.equal(verifyVisualBrowserArtifacts(evidence).passed, false)
  } finally {rmSync(evidence,{recursive:true,force:true})}
})

test('R-FINAL validates all real encoded PNG captures and preserves evidence-only scope', () => {
  const evidence = mkdtempSync(path.join(os.tmpdir(), 'urai-visual-valid-png-'))
  const pngChunk = (type, payload) => {
    const result = Buffer.alloc(12 + payload.length)
    result.writeUInt32BE(payload.length, 0)
    result.write(type, 4, 4, 'ascii')
    payload.copy(result, 8)
    result.writeUInt32BE(pngCrc32(result.subarray(4, result.length - 4)), result.length - 4)
    return result
  }
  try {
    const dir = path.join(evidence, 'browser-artifacts')
    mkdirSync(dir)
    const width = 390, height = 844, ihdr = Buffer.alloc(13)
    ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4)
    ihdr[8] = 8; ihdr[9] = 6
    const rows = Buffer.alloc((width * 4 + 1) * height)
    const png = Buffer.concat([
      Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
      pngChunk('IHDR', ihdr),
      pngChunk('IDAT', deflateSync(rows)),
      pngChunk('IEND', Buffer.alloc(0)),
    ])
    const images = []
    for (const name of REQUIRED_VISUAL_CAPTURES) {
      const file = path.join(dir, name + '.png')
      writeFileSync(file, png)
      images.push(file)
    }
    writeFileSync(path.join(dir, 'spatial-tier-lock-hardening-report-visual.json'),
      JSON.stringify({suite: 'visual', checks: [{name: 'visual', status: 'passed'}], screenshots: images}))
    const result = verifyVisualBrowserArtifacts(evidence)
    assert.equal(result.passed, true, JSON.stringify(result))
    assert.equal(result.capturesVerified, REQUIRED_VISUAL_CAPTURES.length)
    assert.match(result.scope, /not physical-device/)
    assert.match(result.scope, /independent visual approval/)
  } finally { rmSync(evidence, { recursive: true, force: true }) }
})

test('R-FINAL visual evidence requires original owned files, not symlinks or external path aliases', () => {
  const source = readFileSync(new URL('../scripts/run-rfinal-native-evidence.mjs', import.meta.url), 'utf8')
  assert.match(source, /isOwnedVisualEvidencePath\(evidenceDir, dir, 'directory'\)/)
  assert.match(source, /isOwnedVisualEvidencePath\(evidenceDir, reportFile\)/)
  assert.match(source, /isOwnedVisualEvidencePath\(evidenceDir, file\)/)
  assert.match(source, /visual_artifact_ownership_tests/)
  // This check guards screenshot admission, not unrelated source-file audits.
  const visualSource = source.slice(source.indexOf('export function verifyVisualBrowserArtifacts('), source.indexOf('\nfunction normalize('))
  assert.ok(visualSource.length > 0)
  assert.doesNotMatch(visualSource, /!statSync\(file\)\.isFile\(\)/)
})

test('portable pnpm bootstrap regression is native-tested before frozen dependency install', () => {
  const ids = STAGES.map(stage => stage.id)
  assert.ok(ids.includes('pnpm_bootstrap_tests'))
  assert.ok(ids.indexOf('pnpm_bootstrap_tests') < ids.indexOf('frozen_install'))
  const bootstrap = STAGES.find(stage => stage.id === 'pnpm_bootstrap_tests')
  assert.equal(bootstrap.requiresInstall, false)
  assert.deepEqual(bootstrap.command, ['node', '--test', 'tests/pnpm-bootstrap-resolver.test.mjs'])
})
