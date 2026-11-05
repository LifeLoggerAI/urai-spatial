import assert from 'node:assert/strict'
import test from 'node:test'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { NativeGoogleSignInUnavailable, performUraiGoogleSignIn, performUraiGoogleSignOut } from '../src/lib/firebase/googleSignInPolicy.ts'
import { configureAndroidGoogleAuth, validateAndroidGoogleServices } from '../../scripts/prepare-android-native-google-auth.mjs'

const native = { native: true, platform: 'android', nativeConfigured: true }

function signInActions(options = {}) {
  const token = Object.hasOwn(options, 'token') ? options.token : 'synthetic-id-token'
  const { failure } = options
  const calls = []
  return { calls, actions: {
    web: async () => { calls.push('popup'); return 'web-user' },
    native: async () => { calls.push('credential-manager'); if (failure) throw failure; return token },
    exchange: async idToken => { calls.push(['firebase-credential', idToken]); return 'native-user' },
  } }
}

test('browser Google sign-in retains the Firebase popup without native calls', async () => {
  const { actions, calls } = signInActions()
  assert.equal(await performUraiGoogleSignIn({ ...native, native: false, platform: 'web' }, actions), 'web-user')
  assert.deepEqual(calls, ['popup'])
})

test('configured Android exchanges the native Google credential through Firebase JS authority', async () => {
  const { actions, calls } = signInActions()
  assert.equal(await performUraiGoogleSignIn(native, actions), 'native-user')
  assert.deepEqual(calls, ['credential-manager', ['firebase-credential', 'synthetic-id-token']])
})

test('unconfigured Android and unsupported native platforms never open an embedded Google popup', async () => {
  for (const environment of [{ ...native, nativeConfigured: false }, { ...native, platform: 'visionos' }]) {
    const { actions, calls } = signInActions()
    await assert.rejects(performUraiGoogleSignIn(environment, actions), NativeGoogleSignInUnavailable)
    assert.deepEqual(calls, [])
  }
})

test('native cancellation, missing credentials and token-exchange failure never fall back to a popup', async () => {
  const { actions, calls } = signInActions({ failure: new Error('cancelled') })
  await assert.rejects(performUraiGoogleSignIn(native, actions), /cancelled/)
  assert.deepEqual(calls, ['credential-manager'])
  for (const token of [null, undefined, '', '   ']) {
    const attempt = signInActions({ token })
    await assert.rejects(performUraiGoogleSignIn(native, attempt.actions), /identity credential/)
    assert.deepEqual(attempt.calls, ['credential-manager'])
  }
  const failedExchange = signInActions()
  failedExchange.actions.exchange = async () => { failedExchange.calls.push('exchange-failed'); throw new Error('exchange-failed') }
  await assert.rejects(performUraiGoogleSignIn(native, failedExchange.actions), /exchange-failed/)
  assert.deepEqual(failedExchange.calls, ['credential-manager', 'exchange-failed'])
})

test('sign-out closes Firebase authority before resetting configured native account selection', async () => {
  const calls = []
  const actions = { closeSession: async () => { calls.push('firebase-sign-out') }, resetNativeAccount: async () => { calls.push('native-reset') } }
  assert.equal(await performUraiGoogleSignOut(native, actions), true)
  assert.deepEqual(calls, ['firebase-sign-out', 'native-reset'])
  for (const environment of [{ ...native, native: false }, { ...native, nativeConfigured: false }, { ...native, platform: 'visionos' }]) {
    calls.length = 0
    assert.equal(await performUraiGoogleSignOut(environment, actions), true)
    assert.deepEqual(calls, ['firebase-sign-out'])
  }
  await assert.rejects(performUraiGoogleSignOut(native, { ...actions, closeSession: async () => { throw new Error('session-close-failed') } }), /session-close-failed/)
  assert.equal(await performUraiGoogleSignOut(native, { ...actions, resetNativeAccount: async () => { throw new Error('chooser-reset-failed') } }), false)
})

function nativeConfig() {
  return {
    project_info: { project_id: 'urai-4dc1d', project_number: '123456789' },
    client: [{
      client_info: { mobilesdk_app_id: '1:123456789:android:aabbccdd', android_client_info: { package_name: 'com.urailabs.urai' } },
      oauth_client: [
        { client_type: 3, client_id: '123456789-synthetic.apps.googleusercontent.com' },
        { client_type: 1, client_id: '123456789-native.apps.googleusercontent.com', android_info: { package_name: 'com.urailabs.urai', certificate_hash: 'A'.repeat(40) } },
      ],
      api_key: [{ current_key: 'synthetic-public-api-key' }],
    }],
  }
}

test('native provider configuration requires canonical project, Android package, web client and Android certificate', () => {
  assert.equal(validateAndroidGoogleServices(nativeConfig(), '123456789').projectId, 'urai-4dc1d')
  assert.throws(() => validateAndroidGoogleServices(nativeConfig(), '987654321'), /PROJECT_NUMBER_MISMATCH/)
  for (const [mutate, error] of [
    [config => { config.project_info.project_id = 'another-project' }, /PROJECT_MISMATCH/],
    [config => { config.client[0].client_info.android_client_info.package_name = 'another.package' }, /PACKAGE_MISSING/],
    [config => { config.client[0].client_info.mobilesdk_app_id = '1:123456789:web:aabbccdd' }, /APP_ID_INVALID/],
    [config => { config.client[0].oauth_client = config.client[0].oauth_client.filter(client => client.client_type !== 3) }, /WEB_CLIENT_MISSING/],
    [config => { config.client[0].oauth_client[0].client_id = '987654321-synthetic.apps.googleusercontent.com' }, /WEB_CLIENT_MISSING/],
    [config => { config.client[0].oauth_client[1].android_info.certificate_hash = 'not-a-certificate' }, /CERTIFICATE_CLIENT_MISSING/],
    [config => { config.client[0].api_key = [] }, /PUBLIC_API_KEY_MISSING/],
  ]) {
    const config = nativeConfig(); mutate(config)
    assert.throws(() => validateAndroidGoogleServices(config), error)
  }
})

test('unsigned preparation without native config explicitly disables auth while governed preparation fails closed', async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'urai-native-auth-test-'))
  try {
    const environment = { ...process.env, URAI_EXACT_HEAD: 'a'.repeat(40), ANDROID_FIREBASE_GOOGLE_SERVICES_JSON: '', URAI_ANDROID_FIREBASE_CONFIG_PATH: '', GITHUB_ENV: path.join(directory, 'env') }
    const script = new URL('../../scripts/prepare-android-native-google-auth.mjs', import.meta.url).pathname
    const receiptPath = path.join(directory, 'receipt.json')
    const prepared = spawnSync(process.execPath, [script, '--optional', '--receipt-output', receiptPath], { env: environment, encoding: 'utf8' })
    assert.equal(prepared.status, 0, prepared.stderr)
    const receipt = JSON.parse(await fs.readFile(receiptPath, 'utf8'))
    assert.equal(receipt.nativeConfigValid, false)
    assert.equal(receipt.nativePluginRequested, false)
    assert.equal(receipt.nativeSignInAccepted, false)
    assert.match(await fs.readFile(environment.GITHUB_ENV, 'utf8'), /NEXT_PUBLIC_URAI_NATIVE_GOOGLE_AUTH_READY=false/)
    const governed = spawnSync(process.execPath, [script], { env: environment, encoding: 'utf8' })
    assert.notEqual(governed.status, 0)
    assert.match(governed.stderr, /CANONICAL_ANDROID_FIREBASE_CONFIG_REQUIRED/)
  } finally { await fs.rm(directory, { recursive: true, force: true }) }
})

test('native generated project receives canonical config and one Google dependency declaration', async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'urai-native-project-test-'))
  try {
    await fs.mkdir(path.join(directory, 'app'))
    await fs.writeFile(path.join(directory, 'variables.gradle'), 'ext { minSdkVersion = 24 }\n')
    await fs.writeFile(path.join(directory, 'build.gradle'), "dependencies { classpath 'com.google.gms:google-services:4.4.2' }\n")
    await fs.writeFile(path.join(directory, 'app/build.gradle'), "apply plugin: 'com.google.gms.google-services'\n")
    const config = JSON.stringify(nativeConfig())
    await configureAndroidGoogleAuth(directory, config)
    await configureAndroidGoogleAuth(directory, config)
    assert.equal(await fs.readFile(path.join(directory, 'app/google-services.json'), 'utf8'), config)
    assert.equal((await fs.readFile(path.join(directory, 'variables.gradle'), 'utf8')).match(/rgcfaIncludeGoogle/g)?.length, 1)
    await fs.writeFile(path.join(directory, 'build.gradle'), 'dependencies {}\n')
    await assert.rejects(configureAndroidGoogleAuth(directory, config), /GOOGLE_SERVICES_HOOK_MISSING/)
  } finally { await fs.rm(directory, { recursive: true, force: true }) }
})
