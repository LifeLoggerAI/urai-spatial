import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import crypto from 'node:crypto'
import { createRequire } from 'node:module'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const PROJECT = 'demo-urai-passive-consent-proof'
const repository = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

// Validate before creating output, compiling source, or starting any provider SDK.
export function validateNativeEnvironment(env, nodeVersion = process.versions.node) {
  if (Number(nodeVersion.split('.')[0]) !== 22) throw new Error('native_acceptance_requires_node22')
  for (const name of ['GCLOUD_PROJECT', 'GOOGLE_CLOUD_PROJECT']) {
    if (env[name] && env[name] !== PROJECT) throw new Error('live_project_forbidden')
  }
  for (const name of ['GOOGLE_APPLICATION_CREDENTIALS', 'FIREBASE_CONFIG', 'FIREBASE_TOKEN', 'GOOGLE_OAUTH_ACCESS_TOKEN']) {
    if (env[name]) throw new Error('inherited_cloud_credentials_forbidden')
  }
  for (const name of ['FIRESTORE_EMULATOR_HOST', 'FIREBASE_AUTH_EMULATOR_HOST', 'FIREBASE_STORAGE_EMULATOR_HOST', 'FIREBASE_EMULATOR_HUB']) {
    if (env[name]) throw new Error('borrowed_emulator_forbidden')
  }
}

export function runNativeAcceptance() {
  validateNativeEnvironment(process.env)
  const git = (...args) => {
    const result = spawnSync('git', args, { cwd: repository, encoding: 'utf8' })
    if (result.status !== 0) throw new Error('native_acceptance_source_check_failed')
    return result.stdout.trim()
  }
  git('diff', '--quiet', 'HEAD', '--')
  const sourceSha = git('rev-parse', 'HEAD')
  const sourceTree = git('rev-parse', 'HEAD^{tree}')
  const parent = path.resolve(process.env.URAI_NATIVE_ACCEPTANCE_OUTPUT_PARENT || os.tmpdir())
  const output = fs.mkdtempSync(path.join(parent, 'urai-functions-native-'))
  const proof = path.join(output, 'passive-firestore-proof')
  const env = {
    ...process.env,
    PATH: path.dirname(process.execPath) + path.delimiter + process.env.PATH,
    GCLOUD_PROJECT: PROJECT,
    GOOGLE_CLOUD_PROJECT: PROJECT,
    URAI_PASSIVE_SIGNAL_EMULATOR_TEST: '1',
    URAI_PROOF_SOURCE_SHA: sourceSha,
    URAI_PASSIVE_SIGNAL_PROOF_OUTPUT_DIR: proof,
    FIREBASE_EMULATORS_PATH: process.env.FIREBASE_EMULATORS_PATH || path.join(output, 'emulator-cache'),
    JAVA_TOOL_OPTIONS: '-Xms64m -Xmx256m',
    CI: 'true',
  }
  const receipt = { schemaVersion: 'urai-functions-native-command-v1', sourceSha, sourceTree,
    nodeVersion: process.version, project: PROJECT, steps: [], state: 'STARTED', shipAuthorized: false }
  const write = () => fs.writeFileSync(path.join(output, 'native-command.json'), JSON.stringify(receipt, null, 2) + '\n')
  write()
  console.log('Native Functions evidence: ' + output)
  const run = (label, executable, args, cwd = repository) => {
    const result = spawnSync(executable, args, { cwd, env, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024, timeout: 600000 })
    const text = (result.stdout || '') + (result.stderr || '')
    const filename = label + '.log'
    fs.writeFileSync(path.join(output, filename), text)
    receipt.steps.push({ label, exitCode: result.status, signal: result.signal, log: filename,
      logSha256: crypto.createHash('sha256').update(text).digest('hex') })
    write()
    process.stdout.write(text)
    if (result.status !== 0) throw new Error('native_acceptance_stage_failed:' + label)
    return text
  }
  try {
    const requireFunctions = createRequire(path.join(repository, 'apps/functions/package.json'))
    const requireRoot = createRequire(path.join(repository, 'package.json'))
    const tsc = requireFunctions.resolve('typescript/bin/tsc')
    const firebase = requireRoot.resolve('firebase-tools/lib/bin/firebase.js')
    run('native-runner-guards', process.execPath, ['--test', 'tests/functions-native-acceptance.test.mjs'])
    const java = run('java-version', 'java', ['-version'])
    if (!/version "(?:2[1-9]|[3-9]\d)\./.test(java)) throw new Error('native_acceptance_requires_java21_or_newer')
    run('functions-build', process.execPath, [tsc, '-p', 'apps/functions/tsconfig.json'])
    run('original-build', process.execPath, [tsc, 'test/fixtures/passiveSignals-before-consent-transaction.ts',
      '--target', 'ES2020', '--module', 'commonjs', '--moduleResolution', 'node', '--strict',
      '--esModuleInterop', '--skipLibCheck', '--outDir', 'test/proof-original'], path.join(repository, 'apps/functions'))
    run('prepare-proof', process.execPath, ['scripts/prepare-passive-firestore-proof.cjs'])
    // Paths are shell-quoted because firebase emulators:exec accepts a command string.
    const quote = value => "'" + value.replaceAll("'", "'\\''") + "'"
    run('firestore-and-functions', process.execPath, [firebase, 'emulators:exec', '--only', 'firestore',
      '--project', PROJECT, '--non-interactive', '--config', path.join(proof, 'emulator/firebase.json'),
      quote(process.execPath) + ' ' + quote(path.join(proof, 'run-real-firestore.cjs'))])
    const proofReceipt = JSON.parse(fs.readFileSync(path.join(proof, 'receipt.json'), 'utf8'))
    if (proofReceipt.sourceSha !== sourceSha || proofReceipt.state !== 'ACTUAL_EMULATOR_ORDERING_VERIFIED'
      || proofReceipt.functionsSuite?.passed !== true) throw new Error('native_acceptance_receipt_invalid')
    const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')
    const runIds = new Set()
    for (const item of proofReceipt.results) {
      const casesPath = path.join(proof, item.mode + '-cases.json')
      if (hash(casesPath) !== item.casesSha256 || hash(path.join(proof, item.mode + '.tap')) !== item.tapSha256) {
        throw new Error('native_acceptance_artifact_hash_mismatch')
      }
      const cases = JSON.parse(fs.readFileSync(casesPath, 'utf8'))
      if (cases.sourceSha !== sourceSha || !cases.runId || runIds.has(cases.runId)) throw new Error('native_acceptance_run_identity_invalid')
      runIds.add(cases.runId)
    }
    const fullCasesPath = path.join(proof, 'functions-suite/passive-firestore-proof/repaired-cases.json')
    const fullCases = JSON.parse(fs.readFileSync(fullCasesPath, 'utf8'))
    if (hash(fullCasesPath) !== proofReceipt.functionsSuite.casesSha256
      || hash(path.join(proof, 'functions-suite.tap')) !== proofReceipt.functionsSuite.tapSha256
      || fullCases.sourceSha !== sourceSha || !fullCases.runId || runIds.has(fullCases.runId)) {
      throw new Error('native_acceptance_full_suite_evidence_invalid')
    }
    receipt.proofReceiptSha256 = hash(path.join(proof, 'receipt.json'))
    receipt.independentRunIds = runIds.size + 1
    receipt.state = 'PASSED'
  } catch (error) {
    receipt.state = 'FAILED'
    receipt.error = error.message
  }
  write()
  console.log('Native Functions acceptance: ' + receipt.state)
  return receipt.state === 'PASSED' ? 0 : 1
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { process.exitCode = runNativeAcceptance() }
  catch (error) { console.error(error.message); process.exitCode = 1 }
}
