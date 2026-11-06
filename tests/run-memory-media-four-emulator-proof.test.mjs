import test from 'node:test'
import assert from 'node:assert/strict'
import { cpSync, existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import os from 'node:os'
import path from 'node:path'

const fixture = path.resolve(new URL('..', import.meta.url).pathname)
const safeEnv = Object.fromEntries(Object.entries(process.env).filter(([name]) =>
  !/^(?:GCLOUD_PROJECT|GOOGLE_CLOUD_PROJECT|FIREBASE_PROJECT_ID|FIREBASE_AUTH_EMULATOR_HOST|FIRESTORE_EMULATOR_HOST|FIREBASE_STORAGE_EMULATOR_HOST|STORAGE_EMULATOR_HOST|FIREBASE_FUNCTIONS_EMULATOR_HOST|GOOGLE_APPLICATION_CREDENTIALS|GOOGLE_OAUTH_ACCESS_TOKEN|GOOGLE_CLOUD_ACCESS_TOKEN|FIREBASE_TOKEN|FIREBASE_CLI_TOKEN|FIREBASE_CONFIG)$/.test(name)))
const proof = 'scripts/run-memory-media-four-emulator-proof.mjs'
function invoke(env = {}, args = ['--preflight'], change = () => {}) {
  const temp = mkdtempSync(path.join(os.tmpdir(), 'urai-demo-emulator-preflight-'))
  try {
    mkdirSync(path.join(temp, 'scripts'), { recursive: true })
    mkdirSync(path.join(temp, 'apps/functions/scripts'), { recursive: true })
    cpSync(path.join(fixture, proof), path.join(temp, proof))
    cpSync(path.join(fixture, 'package.json'), path.join(temp, 'package.json'))
    cpSync(path.join(fixture, 'firebase.memory-media-playback-test.json'), path.join(temp, 'firebase.memory-media-playback-test.json'))
    writeFileSync(path.join(temp, 'apps/functions/scripts/memory-media-playback-emulator-proof.cjs'), '')
    change(temp)
    return spawnSync(process.execPath, [path.join(temp, proof), ...args], { cwd: temp, env: { ...safeEnv, ...env }, encoding: 'utf8', timeout: 5000 })
  } finally { rmSync(temp, { recursive: true, force: true }) }
}
const changed = transform => root => {
  const f = path.join(root, 'firebase.memory-media-playback-test.json')
  const data = JSON.parse(readFileSync(f, 'utf8'))
  transform(data)
  writeFileSync(f, JSON.stringify(data))
}
test('valid isolated four-service config checks without launching emulators or certifying playback', () => {
  const r = invoke();assert.equal(r.status,0,r.stderr)
  const v = JSON.parse(r.stdout);assert.equal(v.status,'CONFIG_PREFLIGHT_ONLY')
  assert.equal(v.fourServicesConfigured,true);assert.equal(v.protectedBytesAccepted,false)
  assert.equal(v.emulatorsExecuted,false);assert.equal(v.nativeBuildExecuted,false)
})
test('wrong or missing Functions emulator fails closed', () => {
  const wrong = invoke({},['--preflight'],changed(c=>{c.emulators.functions.port=9999}))
  assert.notEqual(wrong.status,0);assert.match(wrong.stderr,/FUNCTIONS_EMULATOR_PORT_MISMATCH/)
  const missing = invoke({},['--preflight'],changed(c=>{delete c.emulators.functions}))
  assert.notEqual(missing.status,0);assert.match(missing.stderr,/FUNCTIONS_EMULATOR_HOST_MISMATCH/)
})
test('Storage port and Firestore rules paths cannot be redirected', () => {
  for(const modification of [c=>{c.emulators.storage.port=9199},c=>{c.firestore.rules='unsafe.rules'}]) {
    const r=invoke({},['--preflight'],changed(modification));assert.notEqual(r.status,0)
  }
})
test('production Firebase project or bucket environment is refused', () => {
  for (const env of [
    {FIREBASE_PROJECT_ID:'urai-4dc1d'},
    {GCLOUD_PROJECT:'urai-4dc1d'},
    {STORAGE_EMULATOR_HOST:'http://real-storage.example'},
    {FIREBASE_CONFIG:JSON.stringify({projectId:'demo-memory-media-playback',storageBucket:'urai-4dc1d.appspot.com'})}
  ]) { const r=invoke(env); assert.notEqual(r.status,0);assert.match(r.stderr,/REFUSED|MISMATCH|NONDEMO/) }
})
test('cloud service-account and CLI bearer credentials are refused', () => {
  for (const key of ['GOOGLE_APPLICATION_CREDENTIALS','FIREBASE_TOKEN']) {
    const r=invoke({[key]:'synthetic-should-not-be-used'});assert.notEqual(r.status,0)
    assert.match(r.stderr,/NOT_ALLOWED_IN_SYNTHETIC_PROOF/)
  }
})
test('unknown flags are refused without executing anything', () => {
  const r=invoke({},['--deploy']);assert.notEqual(r.status,0);assert.match(r.stderr,/UNSUPPORTED_PROOF_RUNNER_ARGUMENT/)
})
test('run mode refuses a non-repository checkout before any bootstrap', () => {
  const r=invoke({},[]);assert.notEqual(r.status,0);assert.match(r.stderr,/not a git repository|Command failed/)
})
