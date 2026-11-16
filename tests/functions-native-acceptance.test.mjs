import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import test from 'node:test'
import { validateNativeEnvironment } from '../scripts/run-functions-native-acceptance.mjs'

const source = fileURLToPath(new URL('../scripts/run-functions-native-acceptance.mjs', import.meta.url))
const cleanEnv = () => {
  const env = { ...process.env }
  for (const key of ['GCLOUD_PROJECT', 'GOOGLE_CLOUD_PROJECT', 'GOOGLE_APPLICATION_CREDENTIALS', 'FIREBASE_CONFIG',
    'FIREBASE_TOKEN', 'GOOGLE_OAUTH_ACCESS_TOKEN', 'FIRESTORE_EMULATOR_HOST', 'FIREBASE_AUTH_EMULATOR_HOST',
    'FIREBASE_STORAGE_EMULATOR_HOST', 'FIREBASE_EMULATOR_HUB']) delete env[key]
  return env
}

test('native acceptance permits only the supported runtime and explicit demo project', () => {
  assert.doesNotThrow(() => validateNativeEnvironment({}, '22.23.4'))
  assert.doesNotThrow(() => validateNativeEnvironment({ GCLOUD_PROJECT: 'demo-urai-passive-consent-proof' }, '22.23.4'))
  assert.throws(() => validateNativeEnvironment({}, '24.22.1'), /requires_node22/)
})

for (const [name, injection, error] of [
  ['live project', { GOOGLE_CLOUD_PROJECT: 'synthetic-live-project' }, 'live_project_forbidden'],
  ['credential', { GOOGLE_APPLICATION_CREDENTIALS: '/synthetic/private-key.json' }, 'inherited_cloud_credentials_forbidden'],
  ['borrowed emulator', { FIRESTORE_EMULATOR_HOST: '127.0.0.1:8089' }, 'borrowed_emulator_forbidden'],
]) {
  test(`CLI rejects ${name} before creating output or invoking a tool`, () => {
    const output = fs.mkdtempSync(path.join(os.tmpdir(), 'urai-native-guard-'))
    try {
      const result = spawnSync(process.execPath, [source], {
        env: { ...cleanEnv(), ...injection, URAI_NATIVE_ACCEPTANCE_OUTPUT_PARENT: output }, encoding: 'utf8',
      })
      assert.equal(result.status, 1)
      assert.ok(result.stderr.includes(error), result.stderr)
      assert.deepEqual(fs.readdirSync(output), [])
      assert.equal(result.stdout, '')
    } finally { fs.rmSync(output, { recursive: true, force: true }) }
  })
}

test('all inherited credential and borrowed-service aliases are refused', () => {
  for (const key of ['GOOGLE_APPLICATION_CREDENTIALS', 'FIREBASE_CONFIG', 'FIREBASE_TOKEN', 'GOOGLE_OAUTH_ACCESS_TOKEN']) {
    assert.throws(() => validateNativeEnvironment({ [key]: 'synthetic-value' }, '22.23.4'), /credentials_forbidden/)
  }
  for (const key of ['FIRESTORE_EMULATOR_HOST', 'FIREBASE_AUTH_EMULATOR_HOST', 'FIREBASE_STORAGE_EMULATOR_HOST', 'FIREBASE_EMULATOR_HUB']) {
    assert.throws(() => validateNativeEnvironment({ [key]: '127.0.0.1:9999' }, '22.23.4'), /borrowed_emulator_forbidden/)
  }
})

test('dirty tracked source is rejected before creating evidence or resolving dependencies', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'urai-native-dirty-'))
  try {
    fs.mkdirSync(path.join(root, 'scripts'))
    fs.mkdirSync(path.join(root, 'evidence'))
    const runner = path.join(root, 'scripts/run-functions-native-acceptance.mjs')
    fs.copyFileSync(source, runner)
    const git = (...args) => {
      const result = spawnSync('git', args, { cwd: root, encoding: 'utf8' })
      assert.equal(result.status, 0, result.stderr)
    }
    git('init', '--quiet')
    git('add', 'scripts')
    git('-c', 'user.name=Synthetic test', '-c', 'user.email=synthetic@example.invalid', 'commit', '--quiet', '-m', 'fixture')
    fs.appendFileSync(runner, '\n// synthetic dirty tracked source\n')
    const result = spawnSync(process.execPath, [runner], {
      env: { ...cleanEnv(), URAI_NATIVE_ACCEPTANCE_OUTPUT_PARENT: path.join(root, 'evidence') }, encoding: 'utf8',
    })
    assert.equal(result.status, 1)
    assert.match(result.stderr, /source_check_failed/)
    assert.deepEqual(fs.readdirSync(path.join(root, 'evidence')), [])
  } finally { fs.rmSync(root, { recursive: true, force: true }) }
})
