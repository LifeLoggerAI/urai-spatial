#!/usr/bin/env node
// Bounded synthetic Firebase proof runner. NOT a private playback, IAM, or release certificate.
import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const project = 'demo-memory-media-playback'
const configFile = 'firebase.memory-media-playback-test.json'
const proofFile = 'apps/functions/scripts/memory-media-playback-emulator-proof.cjs'
const expectedPorts = { auth: 9549, firestore: 8249, storage: 9249, functions: 5549, hub: 4549, logging: 4649 }
const readonly = process.argv.includes('--preflight')
const args = process.argv.slice(2)
const expectedOptions = args.filter(arg => arg.startsWith('--expected-head='))
const expectedOption = expectedOptions[0]
assert.ok(args.every(arg => arg === '--preflight' || /^--expected-head=[a-f0-9]{40}$/.test(arg)), 'UNSUPPORTED_PROOF_RUNNER_ARGUMENT')
assert.ok(expectedOptions.length <= 1, 'MULTIPLE_SOURCE_HEAD_FLAGS_REFUSED')
// Preflight checks configuration only. Actual execution MUST match an explicit,
// independently reviewed SHA instead of silently accepting whichever HEAD exists.
assert.ok(readonly || expectedOptions.length === 1, 'EXPECTED_SOURCE_HEAD_REQUIRED')
assert.ok(existsSync(path.join(root, configFile)) && existsSync(path.join(root, proofFile)), 'FOUR_EMULATOR_SOURCE_MISSING')
const config = JSON.parse(readFileSync(path.join(root, configFile), 'utf8'))
const pkg = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'))
assert.equal(config.functions?.source, 'apps/functions', 'FUNCTIONS_SOURCE_MISMATCH')
assert.equal(config.firestore?.rules, 'firebase/firestore.rules', 'FIRESTORE_RULES_MISMATCH')
assert.equal(config.storage?.rules, 'firebase/storage.rules', 'STORAGE_RULES_MISMATCH')
assert.equal(pkg.devDependencies?.['firebase-tools'], '15.32.1', 'FIREBASE_CLI_PIN_REQUIRED')
for (const [service, port] of Object.entries(expectedPorts)) {
  assert.equal(config.emulators?.[service]?.host, '127.0.0.1', `${service.toUpperCase()}_EMULATOR_HOST_MISMATCH`)
  assert.equal(config.emulators[service].port, port, `${service.toUpperCase()}_EMULATOR_PORT_MISMATCH`)
}
assert.equal(config.emulators?.singleProjectMode, true, 'SINGLE_DEMO_PROJECT_REQUIRED')
const locked = {
  GCLOUD_PROJECT: project,
  GOOGLE_CLOUD_PROJECT: project,
  FIREBASE_PROJECT_ID: project,
  FIREBASE_AUTH_EMULATOR_HOST: '127.0.0.1:9549',
  FIRESTORE_EMULATOR_HOST: '127.0.0.1:8249',
  FIREBASE_STORAGE_EMULATOR_HOST: '127.0.0.1:9249',
  STORAGE_EMULATOR_HOST: 'http://127.0.0.1:9249',
  FIREBASE_FUNCTIONS_EMULATOR_HOST: '127.0.0.1:5549',
}
for (const [key, required] of Object.entries(locked)) {
  assert.ok(!process.env[key] || process.env[key] === required, `${key}_NONDEMO_ENVIRONMENT_REFUSED`)
}
for (const key of ['GOOGLE_APPLICATION_CREDENTIALS', 'GOOGLE_OAUTH_ACCESS_TOKEN', 'GOOGLE_CLOUD_ACCESS_TOKEN', 'FIREBASE_TOKEN', 'FIREBASE_CLI_TOKEN']) {
  assert.ok(!process.env[key], `${key}_NOT_ALLOWED_IN_SYNTHETIC_PROOF`)
}
if (process.env.FIREBASE_CONFIG) {
  const target = JSON.parse(process.env.FIREBASE_CONFIG)
  assert.equal(target.projectId, project, 'LIVE_FIREBASE_CONFIG_REFUSED')
  if (target.storageBucket) assert.equal(target.storageBucket, `${project}.appspot.com`, 'NONDEMO_STORAGE_BUCKET_REFUSED')
}
if (readonly) {
  console.log(JSON.stringify({ status: 'CONFIG_PREFLIGHT_ONLY', fourServicesConfigured: true, project, protectedBytesAccepted: false, nativeBuildExecuted: false, emulatorsExecuted: false }))
  process.exit(0)
}
const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8', timeout: 5000 }).trim()
assert.equal(path.resolve(git('rev-parse', '--show-toplevel')), root, 'WRONG_CHECKOUT_ROOT')
const head = git('rev-parse', 'HEAD')
assert.match(head, /^[a-f0-9]{40}$/, 'SOURCE_HEAD_NOT_PINNED')
assert.equal(head, expectedOption.slice('--expected-head='.length), 'SOURCE_HEAD_MISMATCH')
assert.equal(git('status', '--porcelain', '--untracked-files=all'), '', 'DIRTY_CHECKOUT_SOURCE')
const env = {
  ...process.env, ...locked, URAI_EXACT_HEAD: head,
  FIREBASE_CONFIG: JSON.stringify({ projectId: project, storageBucket: `${project}.appspot.com` }),
}
const run = (label, args, timeout) => {
  console.log(`[One UrAi synthetic 4-emulator proof] ${label} on ${head}`)
  const result = spawnSync(process.execPath, ['scripts/run-pnpm.mjs', ...args], { cwd: root, env, stdio: 'inherit', timeout, shell: false })
  assert.equal(result.error, undefined, `${label}: ${result.error?.message}`)
  assert.equal(result.status, 0, `${label}: command failed, signal=${result.signal || 'none'}`)
}
run('native workspace bootstrap', ['bootstrap:check'], 90_000)
run('original Functions TypeScript build', ['--filter', 'urai-functions', 'build'], 180_000)
run('genuine Firebase Auth + Firestore + Storage + Functions emulators', [
  'exec', 'firebase', 'emulators:exec', '--config', configFile, '--project', project,
  '--only', 'auth,firestore,storage,functions', `node ${proofFile}`,
], 360_000)
console.log(JSON.stringify({ status: 'FOUR_EMULATOR_BOUNDED_SCRIPT_EXIT_ZERO', sourceHead: head, project,
  nativePositivePlaybackAccepted: false, cloudIamAttested: false, completeGenesisLifecycleCertified: false, productionAccepted: false }))
