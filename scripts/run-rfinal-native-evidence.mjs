#!/usr/bin/env node
// URAI R-FINAL: read-only remote-pin discovery, isolated source checkout,
// native verification, and local-only receipts. NEVER deploys or mutates the
// pre-existing, founder-approved Windows production-build workspace.
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { createHash } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { createServer } from 'node:net'
import { createWriteStream, existsSync, mkdirSync, readFileSync, realpathSync, statSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import process from 'node:process'
import { once } from 'node:events'
import { pathToFileURL } from 'node:url'

export const CONTROLLER = Object.freeze({
  repository: 'https://github.com/LifeLoggerAI/urai-spatial.git',
  branch: 'repair/rfinal-convergence-candidate-20261020',
  lastVerifiedSha: '18bd6f3dfc9363f3764fa8011a67072b35902741',
  protectedBaseline: path.join(os.homedir(), 'Downloads', 'URAI_RFINAL_EXACT_20261020-031817', 'source'),
})

export const PINNED_FILES = Object.freeze([
  'scripts/vendor/meshopt_decoder.module.mjs',
  'scripts/vendor/meshopt_encoder.module.mjs',
  'operations/assets/normal-repair-receipts/home-entry-chamber-v1.json',
  'apps/functions/src/privateLifeModelReview.ts',
  'urai-tier1/src/spatial/adam/adamClient.ts',
  'urai-tier1/src/spatial/adam/AdamPresenceRuntime.tsx',
])

export const STAGES = Object.freeze([
  { id: 'source_integrity', command: ['node', 'scripts/check-source-integrity.mjs'], requiresInstall: false },
  { id: 'lockfile_check', command: ['node', 'scripts/check-lockfile-present.mjs'], requiresInstall: false },
  { id: 'frozen_install', command: ['corepack', 'pnpm', 'install', '--frozen-lockfile'], requiresInstall: false },
  { id: 'bootstrap_check', command: ['corepack', 'pnpm', 'bootstrap:check'], requiresInstall: true },
  { id: 'functions_build', command: ['corepack', 'pnpm', '--filter', 'urai-functions', 'build'], requiresInstall: true },
  { id: 'functions_tests', command: ['corepack', 'pnpm', '--filter', 'urai-functions', 'test'], requiresInstall: true },
  { id: 'tier1_typecheck', command: ['corepack', 'pnpm', 'typecheck'], requiresInstall: true },
  { id: 'tier1_unit_tests', command: ['corepack', 'pnpm', '--filter', 'urai-tier1', 'test:unit'], requiresInstall: true },
  // Full focused test runner is separate from the sequential compact suite.
  { id: 'focused_contracts_full', command: ['corepack', 'pnpm', '--dir', 'urai-tier1', 'exec', 'node', 'scripts/run-unit-contract-tests.mjs'], requiresInstall: true },
  { id: 'canonical_contracts', command: ['corepack', 'pnpm', 'test:canon'], requiresInstall: true },
  { id: 'privacy_firestore_rules', command: ['corepack', 'pnpm', 'test:firestore-rules'], requiresInstall: true },
  { id: 'runtime_boundary', command: ['corepack', 'pnpm', 'check:runtime-boundary'], requiresInstall: true },
  { id: 'production_assets', command: ['corepack', 'pnpm', 'verify:assets'], requiresInstall: true },
  { id: 'root_maintained_tests', command: ['corepack', 'pnpm', 'test'], requiresInstall: true },
  { id: 'production_build', command: ['corepack', 'pnpm', 'build'], requiresInstall: true },
])

// HTTP readiness must cover every canonical route, not only Home.
export const REQUIRED_HTTP_ROUTES = Object.freeze(['/', '/life-map', '/focus', '/replay', '/login', '/privacy'])
const PROTECTED_HTTP_ROUTES = new Set(['/life-map', '/focus', '/replay'])
export function assessHttpRoutes(checks) {
  const failures = [], authorizedDenials = []
  for (const route of REQUIRED_HTTP_ROUTES) {
    const result = checks.find(check => check.path === route)
    const status = result?.status
    if (!Number.isInteger(status)) { failures.push({path:route,reason:result?.error||'ROUTE_NOT_TESTED'});continue }
    if (status >= 200 && status < 400) continue
    if (PROTECTED_HTTP_ROUTES.has(route) && (status === 401 || status === 403)) {
      authorizedDenials.push({path:route,status});continue
    }
    failures.push({path:route,status,reason:'UNEXPECTED_HTTP_STATUS'})
  }
  return {passed:failures.length===0,failures,authorizedDenials}
}

function normalize(p) {
  const canonical = path.resolve(p)
  const normalized = existsSync(canonical) ? realpathSync(canonical) : canonical
  return process.platform === 'win32' ? normalized.toLowerCase() : normalized
}
export function inside(parent, child) {
  const relative = path.relative(normalize(parent), normalize(child))
  return relative === '' || (relative !== '..' && !relative.startsWith('..' + path.sep) && !path.isAbsolute(relative))
}
export function refuseProtectedOverlap(candidate, baseline = CONTROLLER.protectedBaseline) {
  if (inside(candidate, baseline) || inside(baseline, candidate)) {
    throw new Error('PROTECTED_BASELINE_OVERLAP: refusing any action inside or above ' + baseline)
  }
}
export function parseRemoteHead(output, branch = CONTROLLER.branch) {
  const lines = String(output).trim().split(/\r?\n/)
  const expected = 'refs/heads/' + branch
  const hit = lines.find(line => line.trim().split(/\s+/)[1] === expected)
  const sha = hit?.trim().split(/\s+/)[0] ?? ''
  if (!/^[0-9a-f]{40}$/.test(sha)) throw new Error('REMOTE_REF_INVALID: expected exactly one branch SHA')
  return sha
}
export function verifyRefHead(observed, planned) {
  if (!/^[0-9a-f]{40}$/.test(observed) || observed !== planned) {
    throw new Error('SOURCE_HEAD_CHANGED: expected ' + planned + ', received ' + observed)
  }
}
export function safeVerificationEnvironment(input = process.env) {
  const clean = { ...input }
  const removed = []
  for (const key of Object.keys(clean)) {
    // Provider/customer/cloud credentials never enter build/test or browser
    // subprocesses. Git credential helpers remain available to clone only.
    if (/^(OPENAI|ELEVENLABS|STRIPE|TWILIO|SENDGRID|RUNWAY|RUNPOD|ANTHROPIC|FAL_|STABILITY|XAI_|GEMINI_|GOOGLE_APPLICATION_CREDENTIALS|GCLOUD_PROJECT|GOOGLE_CLOUD_PROJECT|FIREBASE_|NEXT_PUBLIC_FIREBASE_|GITHUB_TOKEN|GH_TOKEN)/i.test(key) ||
        /(?:^|_)(?:API_KEY|SECRET|AUTH_TOKEN|PASSWORD|PRIVATE_KEY|SERVICE_ACCOUNT|CREDENTIALS?)(?:_|$)/i.test(key)) {
      removed.push(key)
      delete clean[key]
    }
  }
  clean.CI = '1'
  return { env: clean, removedKeys: removed.sort() }
}

export function formatCommand(argv) {
  // Stages contain fixed literal commands only; never print environment/secrets.
  return argv.map(arg => (/^[A-Za-z0-9_./:@=-]+$/.test(arg) ? arg : JSON.stringify(arg))).join(' ')
}

function options(argv) {
  const parsed = { source: null, evidence: null, selftest: false, help: false }
  for (let i = 0; i < argv.length; ++i) {
    const arg = argv[i]
    if (arg === '--help') parsed.help = true
    else if (arg === '--selftest') parsed.selftest = true
    else if (arg === '--source' || arg === '--evidence-dir') {
      if (!argv[i + 1] || argv[i + 1].startsWith('--')) throw new Error('Missing value for ' + arg)
      parsed[arg === '--source' ? 'source' : 'evidence'] = path.resolve(argv[++i])
    } else throw new Error('Unknown option: ' + arg)
  }
  return parsed
}

function sha256(file) { return createHash('sha256').update(readFileSync(file)).digest('hex') }
function saveReceipt(file, data) { writeFileSync(file, JSON.stringify(data, null, 2) + '\n', { flag: 'w' }) }

async function command(argv, { cwd, log, timeoutMinutes = 50, env = {} } = {}) {
  const [executable, ...args] = argv
  // On Windows corepack is a .cmd shim. Only repository-owned LITERAL commands
  // enter cmd.exe; paths and untrusted arguments are never interpolated in it.
  const useShell = process.platform === 'win32' && executable === 'corepack'
  if (useShell && args.some(a => !/^[a-z0-9:._/@=-]+$/i.test(a))) {
    throw new Error('Unsafe corepack shell argument')
  }
  const actual = useShell ? 'cmd.exe' : executable
  const actualArgs = useShell ? ['/d', '/s', '/c', ['corepack', ...args].join(' ')] : args
  mkdirSync(path.dirname(log), { recursive: true })
  const stream = createWriteStream(log, { flags: 'w' })
  const safeBase = (executable === 'node' || executable === 'corepack')
    ? safeVerificationEnvironment().env : process.env
  const child = spawn(actual, actualArgs, {
    cwd,
    env: { ...safeBase, GIT_TERMINAL_PROMPT: '0', ...env },
    shell: false,
    windowsHide: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  const start = Date.now()
  let captured = 0, timedOut = false, spawnError = null
  const append = data => {
    const buffer = Buffer.from(data)
    captured += buffer.length
    stream.write(buffer)
  }
  child.stdout?.on('data', append)
  child.stderr?.on('data', append)
  child.once('error', error => { spawnError = error.message })
  const timer = setTimeout(() => {
    timedOut = true
    child.kill()
    // Do not kill arbitrary user processes; only the child created above.
  }, timeoutMinutes * 60_000)
  let code = null, signal = null
  try {
    const [exitCode, exitSignal] = await once(child, 'close')
    code = exitCode
    signal = exitSignal
  } catch (e) {
    spawnError ||= String(e)
  } finally {
    clearTimeout(timer)
    stream.end()
    await once(stream, 'finish')
  }
  return { exitCode: typeof code === 'number' ? code : null, signal, timedOut,
    spawnError, elapsedSeconds: Math.round((Date.now() - start) / 1000),
    logPath: log, logSha256: sha256(log), logBytes: captured }
}

async function shortGit(args, source, outDir, name) {
  const response = await command(['git', ...args], {
    cwd: source,
    log: path.join(outDir, name + '.log'), timeoutMinutes: 4,
  })
  if (response.exitCode !== 0) throw new Error(name + ' failed; inspect ' + response.logPath)
  return readFileSync(response.logPath, 'utf8').trim()
}

async function pinnedIntegrity(source, outDir) {
  const mismatches = []
  const records = []
  for (const rel of PINNED_FILES) {
    const gitEntry = await shortGit(['-C', source, 'ls-tree', '-r', 'HEAD', '--', rel], source, outDir,
      'tree_' + path.basename(rel).replace(/[^a-z0-9]/ig, '_'))
    const sha = gitEntry.split(/\s+/)[2] || ''
    const file = path.join(source, ...rel.split('/'))
    if (!sha || !existsSync(file) || !statSync(file).isFile()) {
      mismatches.push(rel + ': missing tracked bytes')
      continue
    }
    const actual = await shortGit(['-C', source, 'hash-object', '--no-filters', file], source, outDir,
      'bytes_' + path.basename(rel).replace(/[^a-z0-9]/ig, '_'))
    records.push({ path: rel, gitBlob: sha, rawDiskBlob: actual, match: sha === actual })
    if (sha !== actual) mismatches.push(rel + ': raw working bytes differ from committed blob')
  }
  return { passed: mismatches.length === 0, records, mismatches }
}

async function availablePort() {
  const server = createServer()
  await new Promise((resolve, reject) => {server.once('error', reject);server.listen(0, '127.0.0.1', resolve)})
  const port = server.address().port
  await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()))
  return port
}

async function runtimeSmoke(source, outDir) {
  const port = await availablePort()
  const argv = process.platform === 'win32'
    ? ['cmd.exe', '/d', '/s', '/c', `corepack pnpm --dir urai-tier1 exec next start --hostname 127.0.0.1 --port ${port}`]
    : ['corepack', 'pnpm', '--dir', 'urai-tier1', 'exec', 'next', 'start', '--hostname', '127.0.0.1', '--port', String(port)]
  const log = path.join(outDir, 'runtime_server.log')
  const output = createWriteStream(log)
  const child = spawn(argv[0], argv.slice(1), { cwd: source, windowsHide: true,
    stdio: ['ignore', 'pipe', 'pipe'], env: { ...safeVerificationEnvironment().env, GIT_TERMINAL_PROMPT: '0' } })
  child.stdout?.on('data', v => output.write(v))
  child.stderr?.on('data', v => output.write(v))
  let launchError = null
  child.on('error', e => { launchError = e.message })
  const checks = [], browserChecks = {}
  try {
    const target = 'http://127.0.0.1:' + port
    let ready = false
    const until = Date.now() + 75_000
    while (Date.now() < until && child.exitCode === null && !launchError) {
      try {
        const reply = await fetch(target + '/', { signal: AbortSignal.timeout(4000), redirect: 'manual' })
        ready = reply.status > 0
        if (ready) break
      } catch {}
      await new Promise(resolve => setTimeout(resolve, 850))
    }
    if (!ready) return { passed: false, blocker: launchError || 'Next production server did not start within 75 s', checks, browserChecks }
    for (const route of ['/', '/life-map', '/focus', '/replay', '/login', '/privacy']) {
      try {
        const reply = await fetch(target + route, { signal: AbortSignal.timeout(12000), redirect: 'manual' })
        checks.push({ path: route, status: reply.status, redirect: reply.headers.get('location') || null })
      } catch (e) { checks.push({ path: route, error: String(e) }) }
    }
    const browserEnv = {
      URAI_SPATIAL_BASE_URL: target,
      URAI_SPATIAL_USE_EXISTING_SERVER: 'true',
      URAI_SPATIAL_ARTIFACT_DIR: path.join(outDir, 'browser-artifacts'),
    }
    const browserReady = await command(['corepack', 'pnpm', 'playwright:ensure'], {
      cwd: source, env: browserEnv, log: path.join(outDir, 'playwright_preflight.log'), timeoutMinutes: 18,
    })
    browserChecks.playwright_preflight = browserReady
    if (browserReady.exitCode === 0 && !browserReady.timedOut) {
      for (const suite of ['navigation', 'camera', 'race', 'data']) {
        browserChecks['browser_' + suite] = await command(
          ['node', 'tests/spatial-tier-lock-hardening.mjs', '--suite=' + suite], {
            cwd: source, env: browserEnv, log: path.join(outDir, 'browser_' + suite + '.log'),
            timeoutMinutes: 25,
          })
      }
    }
    const httpAudit = assessHttpRoutes(checks)
    return { passed: httpAudit.passed, checks, httpAudit, browserChecks,
      scope: 'HTTP route health with signed-out owner denials; private auth and human art acceptance remain separate' }
  } finally {
    if (process.platform === 'win32' && child.pid) {
      // Terminate exactly the process tree created by this runner.
      spawnSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], { windowsHide: true, timeout: 15000 })
    } else if (child.pid) child.kill()
    output.end()
    await once(output, 'finish')
  }
}

async function main() {
  const cfg = options(process.argv.slice(2))
  if (cfg.help || cfg.selftest) {
    console.log('URAI R-FINAL native evidence runner. Options: --source <isolated checkout> --evidence-dir <new directory> --help --selftest')
    console.log('Never runs against ' + CONTROLLER.protectedBaseline)
    if (cfg.selftest) {
      assert.equal(parseRemoteHead(CONTROLLER.lastVerifiedSha + '\trefs/heads/' + CONTROLLER.branch), CONTROLLER.lastVerifiedSha)
      assert.throws(() => refuseProtectedOverlap(CONTROLLER.protectedBaseline), /PROTECTED_BASELINE/)
      assert.throws(() => verifyRefHead('0'.repeat(40), CONTROLLER.lastVerifiedSha), /SOURCE_HEAD_CHANGED/)
      console.log('SELFTEST_PASS')
    }
    return
  }
  if (process.platform !== 'win32') throw new Error('WINDOWS_REQUIRED: this runner is for founder-side native Windows verification')
  if (!process.version.startsWith('v22.')) throw new Error('NODE_22_REQUIRED: found ' + process.version)
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  const homeDownloads = path.join(os.homedir(), 'Downloads')
  const runRoot = path.join(homeDownloads, 'URAI_RFINAL_NATIVE_' + stamp)
  const evidence = cfg.evidence || path.join(runRoot, 'evidence')
  const source = cfg.source || path.join(runRoot, 'source')
  refuseProtectedOverlap(source)
  refuseProtectedOverlap(evidence)
  if (inside(source, evidence) || inside(evidence, source))
    throw new Error('SOURCE_EVIDENCE_OVERLAP: receipt must be independent of test/build-generated source files')
  if (existsSync(evidence)) throw new Error('EVIDENCE_DIR_EXISTS: refusing to overwrite prior receipts: ' + evidence)
  if (!cfg.source && existsSync(source)) throw new Error('NEW_SOURCE_EXISTS: refusing to overwrite source')
  mkdirSync(path.dirname(evidence), { recursive: true })
  mkdirSync(evidence, { recursive: false })
  const receiptPath = path.join(evidence, 'execution-receipt.json')
  const receipt = {schema: 'URAI_RFINAL_NATIVE_V1',startedAt:new Date().toISOString(),
    releaseAuthority: 'NO_DEPLOYMENT_NO_MERGE_NO_BILLING_NO_PRIVATE_MEDIA',
    platform: process.platform, node: process.version, knownPriorHead: CONTROLLER.lastVerifiedSha,
    origin: CONTROLLER.repository, branch: CONTROLLER.branch, source,
    gitHead: null, tree: null, results: [], byteIntegrity: null,
    sanitizedCredentialVariables: safeVerificationEnvironment().removedKeys,
    fullCurrentHeadGreen: false, privateBetaReady: false, globalLaunchReady: false }
  const record = (id, outcome, details={}) => {
    const entry = {id,outcome,...details}
    receipt.results.push(entry)
    saveReceipt(receiptPath, receipt)
    console.log('[URAI] ' + id + ': ' + outcome + (details.exitCode !== undefined ? ' (exit ' + details.exitCode + ')' : ''))
  }
  saveReceipt(receiptPath, receipt)
  try {
    const gitRemote = await command(['git','ls-remote','--heads',CONTROLLER.repository,
      'refs/heads/' + CONTROLLER.branch], {cwd:homeDownloads,log:path.join(evidence,'remote_head.log'),timeoutMinutes:5})
    if (gitRemote.exitCode !== 0) throw new Error('REMOTE_GIT_ACCESS_BLOCKED: see ' + gitRemote.logPath)
    const head = parseRemoteHead(readFileSync(gitRemote.logPath, 'utf8'))
    receipt.gitHead = head
    record('remote_head','PASS',{head})
    if (!cfg.source) {
      const clone = await command(['git','-c','core.autocrlf=false','-c','core.longpaths=true',
        'clone','--filter=blob:none','--depth=200','--single-branch','--branch',CONTROLLER.branch,
        '--no-checkout',CONTROLLER.repository,source], {cwd:homeDownloads,log:path.join(evidence,'clone.log'),timeoutMinutes:60})
      record('isolated_clone',clone.exitCode===0?'PASS':'FAIL',clone)
      if (clone.exitCode !== 0) throw new Error('EXACT_SOURCE_CLONE_FAILED')
      await shortGit(['-C',source,'config','core.autocrlf','false'],source,evidence,'config_autocrlf')
      await shortGit(['-C',source,'config','core.longpaths','true'],source,evidence,'config_longpaths')
      const checkout=await command(['git','-C',source,'-c','core.autocrlf=false',
        '-c','core.longpaths=true','checkout','--detach',head],{cwd:source,
          log:path.join(evidence,'checkout.log'),timeoutMinutes:60})
      record('exact_checkout',checkout.exitCode===0?'PASS':'FAIL',checkout)
      if (checkout.exitCode !== 0) throw new Error('BYTE_SAFE_CHECKOUT_FAILED')
    }
    const actual = await shortGit(['-C',source,'rev-parse','HEAD'],source,evidence,'rev_parse_head')
    verifyRefHead(actual,head)
    const tree = await shortGit(['-C',source,'rev-parse','HEAD^{tree}'],source,evidence,'rev_parse_tree')
    receipt.tree = tree
    record('verified_source_identity','PASS',{head:actual,tree})
    // Reject a historical or unrelated change masquerading as an advanced PR.
    if (actual !== CONTROLLER.lastVerifiedSha) {
      const ancestry=await command(['git','-C',source,'merge-base','--is-ancestor',
        CONTROLLER.lastVerifiedSha,head],{cwd:source,log:path.join(evidence,'ancestry.log'),timeoutMinutes:5})
      record('historical_known_head_ancestry',ancestry.exitCode===0?'PASS':'FAIL',ancestry)
      if (ancestry.exitCode!==0) throw new Error('UNVERIFIED_BRANCH_ANCESTRY')
    }
    const remoteCheck=await command(['git','ls-remote','--heads',CONTROLLER.repository,
      'refs/heads/'+CONTROLLER.branch],{cwd:homeDownloads,log:path.join(evidence,'remote_head_second.log'),timeoutMinutes:5})
    if (remoteCheck.exitCode!==0 || parseRemoteHead(readFileSync(remoteCheck.logPath,'utf8'))!==head)
      throw new Error('CONCURRENT_PR_HEAD_CHANGED: safe abort; previous workspace retained')
    record('remote_head_unchanged','PASS')
    const dirty=await shortGit(['-C',source,'status','--porcelain','--untracked-files=no'],source,evidence,'tracked_status')
    if (dirty) throw new Error('TRACKED_SOURCE_DIRTY: source changes present before tests')
    record('clean_tracked_checkout','PASS')
    const byteReport=await pinnedIntegrity(source,evidence)
    receipt.byteIntegrity=byteReport
    record('pinned_committed_byte_identity',byteReport.passed?'PASS':'FAIL',{mismatches:byteReport.mismatches})
    if (!byteReport.passed) throw new Error('PINNED_SOURCE_BYTES_MISMATCH')
    let installPassed=false, buildPassed=false
    for (const item of STAGES) {
      if (item.requiresInstall && !installPassed) {
        record(item.id,'NOT_RUN',{reason:'Frozen installation did not pass; no substitute green'})
        continue
      }
      const r=await command(item.command,{cwd:source,log:path.join(evidence,item.id+'.log'),
        timeoutMinutes: item.id==='production_build'?85:item.id==='frozen_install'?65:55})
      let outcome=r.exitCode===0&&!r.timedOut?'PASS':'FAIL'
      let qualification=null
      if(outcome==='PASS' && item.id==='privacy_firestore_rules' &&
         readFileSync(r.logPath,'utf8').includes('Running static Firestore rules boundary tests instead')) {
        outcome='LIMITED'
        qualification='Static fallback only; actual Firestore emulator authorization not proved'
      }
      if(outcome==='PASS' && item.id==='root_maintained_tests' &&
         readFileSync(r.logPath,'utf8').includes('Skipping e2e in this local/rootless environment')) {
        outcome='LIMITED'
        qualification='Root suite skipped browser E2E despite exit zero'
      }
      record(item.id,outcome,{...r,command:formatCommand(item.command),qualification})
      if(item.id==='frozen_install')installPassed=outcome==='PASS'
      if(item.id==='production_build')buildPassed=outcome==='PASS'
    }
    if(buildPassed) {
      const smoke=await runtimeSmoke(source,evidence)
      const { browserChecks, ...runtimeFacts } = smoke
      record('actual_production_http_runtime',smoke.passed?'PASS':'FAIL',runtimeFacts)
      for(const suite of ['playwright_preflight','browser_navigation','browser_camera','browser_race','browser_data']) {
        const result = browserChecks?.[suite]
        record(suite,!result?'NOT_RUN':result.exitCode===0&&!result.timedOut?'PASS':'FAIL',
          result||{reason:'Browser not available or runtime did not start'})
      }
    } else {
      record('actual_production_http_runtime','NOT_RUN',{reason:'Current exact-head production build did not pass'})
      for(const suite of ['playwright_preflight','browser_navigation','browser_camera','browser_race','browser_data'])
        record(suite,'NOT_RUN',{reason:'Production runtime never started'})
    }
    receipt.fullCurrentHeadGreen = receipt.results.filter(r=>
      r.id!=='actual_production_http_runtime' && r.id!=='remote_head').every(r=>r.outcome==='PASS') &&
      receipt.results.some(r=>r.id==='actual_production_http_runtime' && r.outcome==='PASS')
    // Even this only proves native tests and basic HTTP; private data, cinematic
    // artistry, XR and human acceptance are independent gates.
    receipt.privateBetaReady=false
    receipt.globalLaunchReady=false
  } catch(error) {
    record('execution_stop','BLOCKED',{error:String(error)})
  } finally {
    receipt.finishedAt=new Date().toISOString()
    saveReceipt(receiptPath,receipt)
    console.log('[URAI] evidence: '+receiptPath)
    if(!receipt.fullCurrentHeadGreen)process.exitCode=1
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch(e => {console.error('URAI_RFINAL_RUNNER_ERROR:',e.message);process.exitCode=1})
}
