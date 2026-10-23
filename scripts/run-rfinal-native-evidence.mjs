#!/usr/bin/env node
// URAI R-FINAL: read-only remote-pin discovery, isolated source checkout,
// native verification, and local-only receipts. NEVER deploys or mutates the
// pre-existing, founder-approved Windows production-build workspace.
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { createHash } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { createServer } from 'node:net'
import { createWriteStream, copyFileSync, existsSync, mkdirSync, readFileSync, realpathSync, statSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import process from 'node:process'
import { once } from 'node:events'
import { pathToFileURL } from 'node:url'
import { resolveCandidate, assessCandidateCompletion, requireCommitSha } from './rfinal-source-authority.mjs'
import { selectNativeEvidenceTarget } from './lib/native-evidence-target.mjs'
import { assessNativeHttpRoute } from './lib/native-http-route-acceptance.mjs'
import { planNativeEvidenceStages, assertCombinedPreflightOutcome, nativeCombinedPreflightEnvironment } from './lib/native-combined-preflight.mjs'
import { inspectVisualPng } from './visual-png-integrity.mjs'
import { isOwnedVisualEvidencePath } from './rfinal-visual-evidence-paths.mjs'
import { isUraiHomeDocument } from '../tests/spatial-owned-server.mjs'
import { planMissingTrackedRepair, isIsolatedRfinalSource } from './rfinal-missing-tracked-repair.mjs'

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

// Git for Windows cannot materialize 650 tracked historical audit paths containing
// '*' or ':' at this source head. Preserve every runtime source/asset and skip only
// nonproduction audit/backups before checkout; never rewrite tracked Git objects.
export const WINDOWS_SAFE_SPARSE_PATTERNS = Object.freeze([
  '/*',
  '!/*audit/**',
  '!/urai-tier1/*audit/**',
  '!/.ai-backups/**',
  '!/_quarantine/**',
])


export function auditWindowsSparsePaths(entries) {
  // Git for Windows performs NTFS filename checks before applying sparse
  // skip-worktree bits. Before the temporary per-command compatibility override,
  // verify every unsafe path belongs ONLY to a reviewed historical exclusion.
  const historical = (p) => /^(?:[^/]*audit|\.ai-backups|_quarantine)(?:\/|$)/.test(p)
    || /^urai-tier1\/[^/]*audit(?:\/|$)/.test(p);
  const invalid = (p) => p.split('/').some((part) =>
    !part || /[<>:"\\|?*\x00-\x1f]/.test(part) || /[. ]$/.test(part)
    || /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\..*)?$/i.test(part)
    || /^(?:\.git|git~1)$/i.test(part));
  const unexpected = [], seen = new Map(), collisions = [];
  let excludedUnsafe = 0;
  for (const p of entries) {
    if (typeof p !== 'string' || !p || p.startsWith('/')) { unexpected.push(String(p)); continue }
    if (invalid(p)) {
      if (historical(p)) excludedUnsafe++;
      else unexpected.push(p);
    }
    if (!historical(p)) {
      const key = p.toLowerCase();
      const former = seen.get(key);
      if (former && former !== p) collisions.push([former, p]);
      else seen.set(key, p);
    }
  }
  return { tracked: entries.length, excludedUnsafe, unexpected, collisions };
}

export const STAGES = Object.freeze([
  { id: 'source_integrity', command: ['node', 'scripts/check-source-integrity.mjs'], requiresInstall: false },
  { id: 'lockfile_check', command: ['node', 'scripts/check-lockfile-present.mjs'], requiresInstall: false },
  { id: 'pnpm_bootstrap_tests', command: ['node', '--test', 'tests/pnpm-bootstrap-resolver.test.mjs'], requiresInstall: false },
  { id: 'frozen_install', command: ['corepack', 'pnpm', 'install', '--frozen-lockfile'], requiresInstall: false },
  { id: 'bootstrap_check', command: ['corepack', 'pnpm', 'bootstrap:check'], requiresInstall: true },
  { id: 'functions_build', command: ['corepack', 'pnpm', '--filter', 'urai-functions', 'build'], requiresInstall: true },
  { id: 'functions_tests', command: ['corepack', 'pnpm', '--filter', 'urai-functions', 'test'], requiresInstall: true },
  { id: 'tier1_typecheck', command: ['corepack', 'pnpm', 'typecheck'], requiresInstall: true },
  { id: 'tier1_unit_tests', command: ['corepack', 'pnpm', '--filter', 'urai-tier1', 'test:unit'], requiresInstall: true },
  // Full focused test runner is separate from the sequential compact suite.
  // Full test glob is separate from the compact maintained unit runner; each
  // native/platform boundary also receives an individually identifiable receipt.
  { id: 'visual_png_integrity_tests', command: ['node', '--test', 'tests/visual-png-integrity.test.mjs'], requiresInstall: false },
  { id: 'visual_artifact_ownership_tests', command: ['node', '--test', 'tests/rfinal-visual-evidence-paths.test.mjs'], requiresInstall: false },
  { id: 'tier1_complete_all_tests', command: ['corepack', 'pnpm', '--dir', 'urai-tier1', 'test:all'], requiresInstall: true },
  { id: 'android_native_identity_tests', command: ['corepack', 'pnpm', '--dir', 'urai-tier1', 'exec', 'node', '--import', 'tsx', '--test', 'tests/android-native-google-auth.test.mjs'], requiresInstall: true },
  { id: 'ios_native_preparation_tests', command: ['corepack', 'pnpm', '--dir', 'urai-tier1', 'exec', 'node', '--import', 'tsx', '--test', 'tests/ios-native-preparation.test.mjs'], requiresInstall: true },
  { id: 'ios_source_archive_tests', command: ['corepack', 'pnpm', '--dir', 'urai-tier1', 'exec', 'node', '--import', 'tsx', '--test', 'tests/ios-source-archive.test.mjs'], requiresInstall: true },
  { id: 'native_static_provenance_tests', command: ['corepack', 'pnpm', '--dir', 'urai-tier1', 'exec', 'node', '--import', 'tsx', '--test', 'tests/native-static-provenance.test.mjs'], requiresInstall: true },
  { id: 'xr_release_matrix_source', command: ['node', 'scripts/check-tier-xr-release-matrix.mjs'], requiresInstall: true },
  { id: 'xr_runtime_contracts', command: ['corepack', 'pnpm', '--dir', 'urai-tier1', 'xr:contract'], requiresInstall: true },
  { id: 'focused_contracts_full', command: ['corepack', 'pnpm', '--dir', 'urai-tier1', 'exec', 'node', 'scripts/run-unit-contract-tests.mjs'], requiresInstall: true },
  { id: 'canonical_contracts', command: ['corepack', 'pnpm', 'test:canon'], requiresInstall: true },
  { id: 'privacy_firestore_rules', command: ['corepack', 'pnpm', 'test:firestore-rules'], requiresInstall: true },
  { id: 'runtime_boundary', command: ['corepack', 'pnpm', 'check:runtime-boundary'], requiresInstall: true },
  { id: 'production_assets', command: ['corepack', 'pnpm', 'verify:assets'], requiresInstall: true },
  { id: 'root_maintained_tests', command: ['corepack', 'pnpm', 'test'], requiresInstall: true },
  { id: 'production_build', command: ['corepack', 'pnpm', 'build'], requiresInstall: true },
])

// HTTP readiness must cover every canonical route, not only Home.
export const REQUIRED_HTTP_ROUTES = Object.freeze(['/', '/life-map', '/focus', '/replay', '/login', '/privacy', '/privacy-policy', '/support'])
const PROTECTED_HTTP_ROUTES = new Set(['/life-map', '/focus', '/replay'])
export function assessHttpRoutes(checks) {
  const failures = [], authorizedDenials = []
  for (const route of REQUIRED_HTTP_ROUTES) {
    const result = checks.find(check => check.path === route)
    const status = result?.status
    const verdict = assessNativeHttpRoute({
      path: route, status, redirect: result?.redirect, error: result?.error,
      protectedRoute: PROTECTED_HTTP_ROUTES.has(route),
      requestedUrl: result?.requestedUrl,
    })
    if (verdict.allowed) {
      if (verdict.kind !== 'SUCCESS') authorizedDenials.push({path:route,status,reason:verdict.kind})
      continue
    }
    failures.push({path:route,status,reason:verdict.reason})
  }
  return {passed:failures.length===0,failures,authorizedDenials}
}

// A successful Playwright exit alone is insufficient for the final visual
// lane: require actual per-suite report bytes and each existing desktop,
// mobile, and reduced-motion capture from the mounted application. This is
// capture integrity only; it never substitutes for independent artistic QA.
export const REQUIRED_VISUAL_CAPTURES = Object.freeze([
  'real-home-desktop',
  'real-lifemap-desktop',
  'real-focus-desktop',
  'real-replay-desktop',
  'real-life-map-mobile',
  'real-mirror-mobile',
  'real-home-touch-portrait-reduced-motion',
  'real-home-touch-landscape-reduced-motion',
])

export function verifyVisualBrowserArtifacts(evidenceDir) {
  const dir = path.join(evidenceDir, 'browser-artifacts')
  const reportFile = path.join(dir, 'spatial-tier-lock-hardening-report-visual.json')
  const failures = []
  let report
  try {
    if (!isOwnedVisualEvidencePath(evidenceDir, dir, 'directory') ||
        !isOwnedVisualEvidencePath(evidenceDir, reportFile)) {
      return { passed: false, failures: ['VISUAL_REPORT_NOT_OWNED'], capturesVerified: 0 }
    }
    report = JSON.parse(readFileSync(reportFile, 'utf8'))
  } catch {
    return { passed: false, failures: ['VISUAL_REPORT_ABSENT_OR_INVALID'], capturesVerified: 0 }
  }
  if (report?.suite !== 'visual' || report.error ||
      !Array.isArray(report.checks) ||
      !report.checks.some(item => item.name === 'visual' && item.status === 'passed')) {
    failures.push('VISUAL_SUITE_NOT_COMPLETED')
  }
  const named = Array.isArray(report?.screenshots)
    ? new Set(report.screenshots.filter(item => typeof item === 'string').map(item => path.resolve(item)))
    : new Set()
  let capturesVerified = 0
  for (const name of REQUIRED_VISUAL_CAPTURES) {
    const file = path.resolve(dir, name + '.png')
    if (!named.has(file)) {
      failures.push('VISUAL_REPORT_MISSING_CAPTURE:' + name)
      continue
    }
    try {
      if (!isOwnedVisualEvidencePath(evidenceDir, file)) {
        failures.push('VISUAL_CAPTURE_MISSING_OR_EMPTY:' + name)
        continue
      }
      const verifiedPng = inspectVisualPng(file)
      if (!verifiedPng.ok) {
        failures.push('VISUAL_CAPTURE_INVALID_PNG:' + name + ':' + verifiedPng.reason)
        continue
      }
      capturesVerified += 1
    } catch {
      failures.push('VISUAL_CAPTURE_UNREADABLE:' + name)
    }
  }
  return { passed: failures.length === 0, failures, capturesVerified,
    scope: 'Rendered capture integrity only; not physical-device or independent visual approval' }
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
  const parsed = { source: null, evidence: null, pinnedSha: null, combined: false, selftest: false, help: false }
  for (let i = 0; i < argv.length; ++i) {
    const arg = argv[i]
    if (arg === '--help') parsed.help = true
    else if (arg === '--combined-candidate') parsed.combined = true
    else if (arg === '--selftest') parsed.selftest = true
    else if (arg === '--pinned-sha') {
      if (!argv[i + 1]) throw new Error('Missing value for --pinned-sha')
      parsed.pinnedSha = requireCommitSha(argv[++i], 'pinned')
    } else if (arg === '--source' || arg === '--evidence-dir') {
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
  // Execute the repository's pinned pnpm wrapper under the exact Node 22
  // binary instead of relying on the Windows corepack.cmd shell shim.
  if (executable === 'corepack' && args[0] !== 'pnpm') {
    throw new Error('NATIVE_RUNNER_ONLY_PINNED_PNPM_ALLOWED')
  }
  const actual = executable === 'node' || executable === 'corepack'
    ? process.execPath : executable
  const actualArgs = executable === 'corepack'
    ? ['scripts/run-pnpm.mjs', ...args.slice(1)] : args
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
  const argv = [process.execPath, 'scripts/run-pnpm.mjs',
    '--dir', 'urai-tier1', 'exec', 'next', 'start',
    '--hostname', '127.0.0.1', '--port', String(port)]
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
    let lastResponse = 'no verified UrAi Home document'
    const until = Date.now() + 75_000
    while (Date.now() < until && child.exitCode === null && child.signalCode === null && !launchError) {
      try {
        const reply = await fetch(target + '/home', { signal: AbortSignal.timeout(4000), redirect: 'manual' })
        lastResponse = 'HTTP ' + reply.status
        if (reply.status === 200 && /text\/html/i.test(reply.headers.get('content-type') || '') &&
            isUraiHomeDocument(await reply.text())) {
          ready = true
          break
        }
        lastResponse += ': original UrAi Home document identity not verified'
      } catch (error) {
        lastResponse = error instanceof Error ? error.message : String(error)
      }
      await new Promise(resolve => setTimeout(resolve, 850))
    }
    if (!ready) return { passed: false,
      blocker: launchError || 'ORIGINAL_URAI_HOME_NOT_READY: ' + lastResponse,
      checks, browserChecks }
    for (const route of REQUIRED_HTTP_ROUTES) {
      try {
        const reply = await fetch(target + route, { signal: AbortSignal.timeout(12000), redirect: 'manual' })
        checks.push({ path: route, status: reply.status, redirect: reply.headers.get('location') || null, requestedUrl: target + route })
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
      for (const suite of ['navigation', 'camera', 'race', 'data', 'visual']) {
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
  const target = selectNativeEvidenceTarget({ combined: cfg.combined, pinnedSha: cfg.pinnedSha, defaultBranch: CONTROLLER.branch })
  if (cfg.help || cfg.selftest) {
    console.log('URAI R-FINAL native evidence runner. Options: --source <isolated checkout> --evidence-dir <new directory> --pinned-sha <40-char git SHA> --combined-candidate --help --selftest')
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
  const runRoot = path.join(homeDownloads, (cfg.combined ? 'URAI_RFINAL_NATIVE_COMBINED_' : 'URAI_RFINAL_NATIVE_') + stamp)
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
    origin: CONTROLLER.repository, branch: target.branch, targetMode: target.sourceMode, source,
    gitHead: null, tree: null, results: [], byteIntegrity: null,
    requestedPinnedSha: cfg.pinnedSha, verificationMode: cfg.pinnedSha ? 'PINNED_CANDIDATE' : 'LIVE_BRANCH',
    liveHeadAtStart: null, liveHeadAtFinish: null,
    pinnedCandidateVerified: false, currentIntegrationHeadVerified: false, currentReleaseHeadVerified: false,
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
      'refs/heads/' + target.branch], {cwd:homeDownloads,log:path.join(evidence,'remote_head.log'),timeoutMinutes:5})
    if (gitRemote.exitCode !== 0) throw new Error('REMOTE_GIT_ACCESS_BLOCKED: see ' + gitRemote.logPath)
    const remoteAtStart = parseRemoteHead(readFileSync(gitRemote.logPath, 'utf8'), target.branch)
    const chosen = resolveCandidate({remoteHead: remoteAtStart,pinnedSha:cfg.pinnedSha})
    const head = chosen.sourceHead
    receipt.gitHead = head
    receipt.liveHeadAtStart = chosen.liveHeadAtStart
    record('remote_head','PASS',{head:remoteAtStart,chosenSourceHead:head,mode:chosen.mode})
    if (!cfg.source) {
      const clone = await command(['git','-c','core.autocrlf=false','-c','core.longpaths=true',
        'clone','--filter=blob:none','--depth=200','--single-branch','--branch',target.branch,
        '--no-checkout',CONTROLLER.repository,source], {cwd:homeDownloads,log:path.join(evidence,'clone.log'),timeoutMinutes:60})
      record('isolated_clone',clone.exitCode===0?'PASS':'FAIL',clone)
      if (clone.exitCode !== 0) throw new Error('EXACT_SOURCE_CLONE_FAILED')
      await shortGit(['-C',source,'config','core.autocrlf','false'],source,evidence,'config_autocrlf')
      await shortGit(['-C',source,'config','core.longpaths','true'],source,evidence,'config_longpaths')
      // Configure the reviewed historical exclusions BEFORE Git tries to write
      // Windows-illegal filenames. --no-cone keeps the rest of the original
      // repository and all eight production GLBs included.
      const sparse=await command([
        'git','-C',source,'sparse-checkout','set','--no-cone',...WINDOWS_SAFE_SPARSE_PATTERNS,
      ], {cwd:source,log:path.join(evidence,'sparse_checkout.log'),timeoutMinutes:5})
      record('windows_safe_sparse_checkout',sparse.exitCode===0&&!sparse.timedOut?'PASS':'FAIL',sparse)
      if(sparse.exitCode!==0||sparse.timedOut) throw new Error('WINDOWS_SAFE_SPARSE_CHECKOUT_FAILED')
      // Read tree objects without checking out historical Windows-invalid names.
      // Fail closed unless the only unsafe entries are excluded audit archives.
      const scan=await command(['git','-C',source,'ls-tree','-rz','--name-only',head],
        {cwd:source,log:path.join(evidence,'windows_tree_paths.log'),timeoutMinutes:8})
      if (scan.exitCode!==0 || scan.timedOut) throw new Error('WINDOWS_SPARSE_TREE_READ_FAILED')
      const rawTree=readFileSync(scan.logPath,'utf8')
      if (!rawTree.endsWith('\0')) throw new Error('WINDOWS_SPARSE_TREE_INCOMPLETE')
      const trackedPaths=rawTree.slice(0,-1).split('\0')
      const audit=auditWindowsSparsePaths(trackedPaths)
      const missingPinned=PINNED_FILES.filter(p=>!trackedPaths.includes(p))
      const treeSafe=audit.unexpected.length===0 && audit.collisions.length===0
        && missingPinned.length===0
      record('windows_sparse_tree_audit',treeSafe?'PASS':'FAIL',
        {tracked:audit.tracked,excludedUnsafe:audit.excludedUnsafe,
          unexpected:audit.unexpected.slice(0,12),collisions:audit.collisions.slice(0,12),missingPinned})
      if(!treeSafe) throw new Error('WINDOWS_UNEXCLUDED_UNSAFE_TREE_PATH')
      // Git for Windows checks NTFS path syntax before honoring sparse excludes.
      // Suppress that early check ONLY for this detached checkout command, after
      // auditing the exact Git tree. The repository config is never weakened.
      // In pinned mode the original branch checkout is deliberately detached at
      // the older exact SHA, provided the branch still contains that commit.
      const checkout=await command(['git','-C',source,'-c','core.protectNTFS=false',
        '-c','core.autocrlf=false','-c','core.longpaths=true','checkout','--detach',head],
        {cwd:source,log:path.join(evidence,'checkout.log'),timeoutMinutes:60})
      record('exact_checkout',checkout.exitCode===0?'PASS':'FAIL',checkout)
      if (checkout.exitCode !== 0) throw new Error('BYTE_SAFE_CHECKOUT_FAILED')
    }
    const actual = await shortGit(['-C',source,'rev-parse','HEAD'],source,evidence,'rev_parse_head')
    verifyRefHead(actual,head)
    if (cfg.pinnedSha) {
      const ancestryPin = await command(['git','-C',source,'merge-base','--is-ancestor',head,remoteAtStart],
        {cwd:source,log:path.join(evidence,'pinned_branch_ancestry.log'),timeoutMinutes:5})
      record('pinned_branch_ancestry',ancestryPin.exitCode===0?'PASS':'FAIL',ancestryPin)
      if(ancestryPin.exitCode!==0)throw new Error('PINNED_SOURCE_NOT_IN_CURRENT_BRANCH_HISTORY')
    }
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
      'refs/heads/'+target.branch],{cwd:homeDownloads,log:path.join(evidence,'remote_head_second.log'),timeoutMinutes:5})
    if (remoteCheck.exitCode!==0) throw new Error('SECOND_REMOTE_GIT_ACCESS_BLOCKED: see '+remoteCheck.logPath)
    const secondLiveHead = parseRemoteHead(readFileSync(remoteCheck.logPath,'utf8'),target.branch)
    if (!cfg.pinnedSha && secondLiveHead !== head)
      throw new Error('CONCURRENT_PR_HEAD_CHANGED: safe abort; previous workspace retained')
    // Do not test ancestry against an un-fetched newer ref: the isolated
    // source may lack its objects. The pinned commit was already proven inside
    // the original branch head before byte-safe checkout. A moved branch
    // stays explicitly non-current, without invalidating exact pinned tests.
    if (cfg.pinnedSha && secondLiveHead !== remoteAtStart) {
      receipt.pinnedBranchDriftObserved=true
      receipt.liveHeadAtSecondCheck=secondLiveHead
      saveReceipt(receiptPath,receipt)
      console.log('[URAI] pinned_branch_drift_observed: INFO (pinned SHA remains the checkout)')
    }
    record('remote_head_unchanged',secondLiveHead===remoteAtStart?'PASS':'PINNED_BRANCH_ADVANCED',
      {liveHeadAtStart:remoteAtStart,liveHeadAtSecondCheck:secondLiveHead,sourceHead:head})
    const initialStatus=spawnSync('git',['-C',source,'status','--porcelain=v1','-z','--untracked-files=no'],{encoding:null,windowsHide:true,timeout:120000})
    if(initialStatus.status!==0)throw new Error('TRACKED_STATUS_READ_FAILED')
    if(initialStatus.stdout.length) {
      // Only this isolated Windows checkout may restore unstaged tracked
      // deletions. No checkout reset, staged mutation, exclusion bypass,
      // or user worktree modification is permitted.
      if(!isIsolatedRfinalSource(source,homeDownloads))throw new Error('TRACKED_SOURCE_DIRTY_UNSAFE_LOCATION')
      const planned=planMissingTrackedRepair(initialStatus.stdout)
      const treeBefore=await shortGit(['-C',source,'write-tree'],source,evidence,'index-tree-before-repair')
      if(treeBefore!==tree)throw new Error('DIRTY_SOURCE_INDEX_TREE_MISMATCH')
      const restored=spawnSync('git',['-C',source,'restore','--source=HEAD','--worktree','--pathspec-from-file=-','--pathspec-file-nul'],{
        input:planned.pathspecBytes,encoding:null,windowsHide:true,timeout:300000,
      })
      writeFileSync(path.join(evidence,'missing-tracked-repair.json'),JSON.stringify({
        count:planned.count,exitCode:restored.status,
        operation:'restore exact tracked missing paths in disposable worktree only',
      },null,2)+'\n')
      if(restored.status!==0)throw new Error('MISSING_TRACKED_REPAIR_FAILED')
      const treeAfter=await shortGit(['-C',source,'write-tree'],source,evidence,'index-tree-after-repair')
      if(treeAfter!==treeBefore)throw new Error('DIRTY_SOURCE_INDEX_CHANGED_DURING_REPAIR')
      record('missing_tracked_worktree_restore','PASS',{count:planned.count,scope:'isolated source only'})
    }
    const dirty=await shortGit(['-C',source,'status','--porcelain','--untracked-files=no'],source,evidence,'tracked_status')
    if (dirty) throw new Error('TRACKED_SOURCE_DIRTY: source changes present before tests')
    record('clean_tracked_checkout','PASS')
    const byteReport=await pinnedIntegrity(source,evidence)
    receipt.byteIntegrity=byteReport
    record('pinned_committed_byte_identity',byteReport.passed?'PASS':'FAIL',{mismatches:byteReport.mismatches})
    if (!byteReport.passed) throw new Error('PINNED_SOURCE_BYTES_MISMATCH')
    let installPassed=false, buildPassed=false
    for (const item of planNativeEvidenceStages(STAGES, cfg.combined)) {
      if (item.requiresInstall && !installPassed) {
        record(item.id,'NOT_RUN',{reason:'Frozen installation did not pass; no substitute green'})
        continue
      }
      const r=await command(item.command,{cwd:source,env:nativeCombinedPreflightEnvironment({combined:cfg.combined,stageId:item.id,pinnedSha:head}),log:path.join(evidence,item.id+'.log'),
        timeoutMinutes: item.id==='production_build'?85:item.id==='frozen_install'?65:55})
      // Preserve the actual Firebase emulator diagnosis in the evidence bundle.
      // The synthetic demo-project tests can fail after Firestore starts; without
      // the emulator's own debug log the root cause is otherwise lost at packaging.
      // Do not reinterpret emulator failures as passing static-rule checks.
      if (item.id === 'privacy_firestore_rules' && r.exitCode !== 0) {
        const emulatorDebugLog = path.join(source, 'firestore-debug.log')
        if (existsSync(emulatorDebugLog)) {
          copyFileSync(emulatorDebugLog, path.join(evidence, 'firestore-debug.log'))
        }
      }
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
      assertCombinedPreflightOutcome({combined:cfg.combined,stageId:item.id,outcome})
      if(item.id==='frozen_install')installPassed=outcome==='PASS'
      if(item.id==='production_build')buildPassed=outcome==='PASS'
    }
    if(buildPassed) {
      const smoke=await runtimeSmoke(source,evidence)
      const { browserChecks, ...runtimeFacts } = smoke
      record('actual_production_http_runtime',smoke.passed?'PASS':'FAIL',runtimeFacts)
      for(const suite of ['playwright_preflight','browser_navigation','browser_camera','browser_race','browser_data','browser_visual']) {
        const result = browserChecks?.[suite]
        const visualAudit = suite === 'browser_visual' ? verifyVisualBrowserArtifacts(evidence) : null
        const passed = result && result.exitCode === 0 && !result.timedOut &&
          (!visualAudit || visualAudit.passed)
        record(suite, !result ? 'NOT_RUN' : passed ? 'PASS' : 'FAIL',
          { ...(result || { reason: 'Browser not available or runtime did not start' }),
            ...(visualAudit ? { visualAudit } : {}) })
      }
    } else {
      record('actual_production_http_runtime','NOT_RUN',{reason:'Current exact-head production build did not pass'})
      for(const suite of ['playwright_preflight','browser_navigation','browser_camera','browser_race','browser_data','browser_visual'])
        record(suite,'NOT_RUN',{reason:'Production runtime never started'})
    }
    // The original matrix can pass for a pinned SHA without becoming a false
    // claim about a concurrently advancing integration or deployed source.
    const matrixGreen = receipt.results.filter(r=>
      r.id!=='actual_production_http_runtime' && r.id!=='remote_head' && r.id!=='remote_head_unchanged').every(r=>r.outcome==='PASS') &&
      receipt.results.some(r=>r.id==='actual_production_http_runtime' && r.outcome==='PASS')
    const lastRemote=await command(['git','ls-remote','--heads',CONTROLLER.repository,
      'refs/heads/'+target.branch],{cwd:homeDownloads,
        log:path.join(evidence,'remote_head_finish.log'),timeoutMinutes:5})
    if(lastRemote.exitCode===0){
      try{receipt.liveHeadAtFinish=parseRemoteHead(readFileSync(lastRemote.logPath,'utf8'),target.branch)}
      catch{receipt.liveHeadAtFinish=null}
    }
    const authority=assessCandidateCompletion({sourceHead:head,liveHeadAtStart:remoteAtStart,
      liveHeadAtFinish:receipt.liveHeadAtFinish,
      allStagesPass:matrixGreen,bytesVerified:byteReport.passed})
    receipt.pinnedCandidateVerified=authority.pinnedCandidateVerified
    receipt.currentIntegrationHeadVerified=authority.currentIntegrationHeadVerified
    receipt.currentReleaseHeadVerified=authority.currentReleaseHeadVerified
    receipt.fullCurrentHeadGreen=authority.currentReleaseHeadVerified
    receipt.liveBranchChanged=authority.liveBranchChanged
    record('final_source_authority',authority.pinnedCandidateVerified?'PASS':'INCOMPLETE',authority)
    // Even this only proves native tests and basic HTTP; private data, cinematic
    // artistry, XR and human acceptance are independent gates.
    receipt.privateBetaReady=false
    receipt.globalLaunchReady=false
    if (cfg.combined) {
      receipt.currentReleaseHeadVerified=false
      receipt.fullCurrentHeadGreen=false
      receipt.combinedDraftOnly=true
      saveReceipt(receiptPath,receipt)
    }
  } catch(error) {
    record('execution_stop','BLOCKED',{error:String(error)})
  } finally {
    receipt.finishedAt=new Date().toISOString()
    saveReceipt(receiptPath,receipt)
    console.log('[URAI] evidence: '+receiptPath)
    // A pinned, byte-verified full matrix has its own exit status. A moving
    // integration branch cannot turn that snapshot into CURRENT_RELEASE_HEAD_GREEN.
    // Keep original live-head mode strict and preserve separate release flags.
    if(!(cfg.pinnedSha ? receipt.pinnedCandidateVerified : receipt.currentIntegrationHeadVerified))process.exitCode=1
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch(e => {console.error('URAI_RFINAL_RUNNER_ERROR:',e.message);process.exitCode=1})
}
