import assert from 'node:assert/strict'
import test from 'node:test'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { NativeGoogleSignInUnavailable, performUraiAppleSignIn, performUraiGoogleSignIn } from '../src/lib/firebase/googleSignInPolicy.ts'
import { configureIosSource, validateIosFirebaseConfiguration } from '../../scripts/prepare-ios-shell.mjs'

test('configured iOS Apple identity exchanges the native ID token and SDK-generated raw nonce', async () => {
  const calls = []
  const result = await performUraiAppleSignIn({ native: true, platform: 'ios', nativeConfigured: true }, { native: async () => { calls.push('apple-native'); return { idToken: 'synthetic-apple-id-token', nonce: 'synthetic-sdk-raw-nonce' } }, exchange: async (token, nonce) => { calls.push(['firebase-apple-credential', token, nonce]); return 'ios-user' } })
  assert.equal(result, 'ios-user')
  assert.deepEqual(calls, ['apple-native', ['firebase-apple-credential', 'synthetic-apple-id-token', 'synthetic-sdk-raw-nonce']])
})

test('missing Apple configuration, cancellation, missing token or nonce never exchanges a credential', async () => {
  let exchanged = false
  const actions = { native: async () => ({ idToken: 'synthetic-token', nonce: 'synthetic-nonce' }), exchange: async () => { exchanged = true } }
  for (const environment of [{ native: false, platform: 'web', nativeConfigured: true }, { native: true, platform: 'android', nativeConfigured: true }, { native: true, platform: 'ios', nativeConfigured: false }]) await assert.rejects(performUraiAppleSignIn(environment, actions), NativeGoogleSignInUnavailable)
  for (const credential of [{}, { idToken: 'synthetic-token' }, { nonce: 'synthetic-nonce' }, { idToken: '', nonce: 'nonce' }]) await assert.rejects(performUraiAppleSignIn({ native: true, platform: 'ios', nativeConfigured: true }, { ...actions, native: async () => credential }), /nonce-bound/)
  await assert.rejects(performUraiAppleSignIn({ native: true, platform: 'ios', nativeConfigured: true }, { ...actions, native: async () => { throw new Error('cancelled') } }), /cancelled/)
  assert.equal(exchanged, false)
})

test('configured iOS Google uses the existing Firebase credential authority without a browser popup', async () => {
  let popup = false
  assert.equal(await performUraiGoogleSignIn({ native: true, platform: 'ios', nativeConfigured: true }, { native: async () => 'synthetic-google-token', exchange: async () => 'ios-user', web: async () => { popup = true } }), 'ios-user')
  assert.equal(popup, false)
})

function firebaseConfig() { return { PROJECT_ID: 'urai-4dc1d', GCM_SENDER_ID: '123456789', GOOGLE_APP_ID: '1:123456789:ios:aabbccdd', BUNDLE_ID: 'com.urailabs.urai', API_KEY: 'synthetic-public-key', CLIENT_ID: '123456789-synthetic.apps.googleusercontent.com', REVERSED_CLIENT_ID: 'com.googleusercontent.apps.123456789-synthetic', IS_SIGNIN_ENABLED: true } }

test('iOS Firebase source config requires canonical project, supplied registered bundle and OAuth callback', () => {
  assert.equal(validateIosFirebaseConfiguration(firebaseConfig(), 'com.urailabs.urai', '123456789').googleReady, true)
  for (const change of [{ PROJECT_ID: 'other' }, { BUNDLE_ID: 'com.other.app' }, { GCM_SENDER_ID: '987654321' }, { REVERSED_CLIENT_ID: 'com.other.callback' }, { IS_SIGNIN_ENABLED: false }, { API_KEY: '' }]) assert.throws(() => validateIosFirebaseConfiguration({ ...firebaseConfig(), ...change }, 'com.urailabs.urai', '123456789'))
})

test('iOS source generator configures entitlements and real plist membership without claiming compilation or signing', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'urai-ios-source-test-'))
  try {
    const source = path.join(dir, 'App/App')
    const project = path.join(dir, 'App/App.xcodeproj/project.pbxproj')
    await fs.mkdir(source, { recursive: true }); await fs.mkdir(path.dirname(project), { recursive: true })
    await fs.writeFile(project, '/* Begin PBXBuildFile section */\n/* Begin PBXFileReference section */\nroot = {children = ( APP /* App */,); };\napp = {children = ( DELEGATE /* AppDelegate.swift */,); };\n{isa = PBXResourcesBuildPhase; files = ( STORYBOARD, ); };\nPRODUCT_BUNDLE_IDENTIFIER = com.urailabs.urai;\nPRODUCT_BUNDLE_IDENTIFIER = com.urailabs.urai;')
    await fs.writeFile(path.join(source, 'Info.plist'), '<?xml version="1.0"?><plist version="1.0"><dict></dict></plist>')
    await fs.writeFile(path.join(source, 'AppDelegate.swift'), 'ApplicationDelegateProxy.shared.application')
    const noAuthority = await configureIosSource(dir)
    assert.equal(noAuthority.bundleIdentityStatus, 'PROPOSED_OWNER_CONFIRMATION_REQUIRED')
    assert.equal(noAuthority.compiled, false); assert.equal(noAuthority.signingPerformed, false)
    assert.doesNotMatch(await fs.readFile(project, 'utf8'), /DEVELOPMENT_TEAM/)
    await assert.rejects(configureIosSource(dir, undefined, undefined, { configText: 'synthetic' }), /APPLE_TEAM_AND_BUNDLE/)
    const configText = '<plist version="1.0"><dict><key>PROJECT_ID</key><string>urai-4dc1d</string></dict></plist>'
    const native = { configText, appleReady: true, googleReady: true, reversedClientId: firebaseConfig().REVERSED_CLIENT_ID }
    const receipt = await configureIosSource(dir, 'SYNTH12345', 'com.urailabs.urai', native)
    const first = await fs.readFile(project, 'utf8')
    await configureIosSource(dir, 'SYNTH12345', 'com.urailabs.urai', native)
    assert.equal(await fs.readFile(project, 'utf8'), first)
    assert.match(first, /app = \{children = \( F1A000000000000000000002/)
    assert.doesNotMatch(first, /root = \{children = \( F1A000000000000000000002/)
    assert.match(first, /GoogleService-Info.plist in Resources/)
    assert.match(await fs.readFile(path.join(source, 'App.entitlements'), 'utf8'), /com.apple.developer.applesignin/)
    assert.equal(receipt.nativeAppleAuthConfigured, true); assert.equal(receipt.providerEnabledVerified, false)
    assert.equal(await fs.readFile(path.join(source, 'GoogleService-Info.plist'), 'utf8'), configText)
    const checked = spawnSync('python3', ['-c', 'import plistlib,sys;d=plistlib.load(open(sys.argv[1],"rb"));assert d["NSAppTransportSecurity"]["NSAllowsArbitraryLoads"]==False;assert d["CFBundleURLTypes"][0]["CFBundleURLSchemes"]==[sys.argv[2]]', path.join(source, 'Info.plist'), firebaseConfig().REVERSED_CLIENT_ID])
    assert.equal(checked.status, 0)
  } finally { await fs.rm(dir, { recursive: true, force: true }) }
})

test('iOS CLI rejects missing protected config unless preparation is explicitly optional', () => {
  const script = fileURLToPath(new URL('../../scripts/prepare-ios-shell.mjs', import.meta.url))
  const env = { ...process.env, URAI_EXACT_HEAD: 'c75eb8a10aa1712fe64030d82aafeb3a1d31e702' }
  delete env.IOS_FIREBASE_GOOGLE_SERVICE_INFO_PLIST; delete env.URAI_IOS_FIREBASE_CONFIG_PATH
  assert.equal(spawnSync(process.execPath, [script, '--optional'], { env }).status, 0)
  assert.notEqual(spawnSync(process.execPath, [script], { env }).status, 0)
})
