import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const unsignedWorkflow = fs.readFileSync(new URL('../../.github/workflows/android-package-prep.yml', import.meta.url), 'utf8')
const signedWorkflow = fs.readFileSync(new URL('../../.github/workflows/android-governed-signing-prep.yml', import.meta.url), 'utf8')
const apiHelper = fs.readFileSync(new URL('../src/lib/clientApiUrl.ts', import.meta.url), 'utf8')
const nativeOAuthSource = fs.readFileSync(new URL('../src/lib/nativeGoogleOAuth.ts', import.meta.url), 'utf8')
const settingsSource = fs.readFileSync(new URL('../src/app/settings/DeviceSettingsClient.tsx', import.meta.url), 'utf8')
const shellPackage = fs.readFileSync(new URL('../../distribution/android-shell/package.json', import.meta.url), 'utf8')
const shellConfigScript = fs.readFileSync(new URL('../../distribution/android-shell/configure-app-links.mjs', import.meta.url), 'utf8')

const requiredPublicVars = [
  'NEXT_PUBLIC_FIREBASE_API_KEY',
  'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
  'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
  'NEXT_PUBLIC_FIREBASE_APP_ID',
  'NEXT_PUBLIC_URAI_API_ORIGIN',
]

test('Android package evidence fails closed on real public Firebase and hosted API configuration', () => {
  for (const variable of requiredPublicVars) {
    assert.match(unsignedWorkflow, new RegExp(variable))
    assert.match(signedWorkflow, new RegExp(variable))
  }
  assert.match(unsignedWorkflow, /NEXT_PUBLIC_FIREBASE_PROJECT_ID" = "urai-4dc1d"/)
  assert.match(signedWorkflow, /NEXT_PUBLIC_FIREBASE_PROJECT_ID" = "urai-4dc1d"/)
  assert.match(unsignedWorkflow, /NEXT_PUBLIC_URAI_API_ORIGIN" = "https:\/\/urai\.app"/)
  assert.match(signedWorkflow, /NEXT_PUBLIC_URAI_API_ORIGIN" = "https:\/\/urai\.app"/)
  assert.doesNotMatch(unsignedWorkflow, /ci-firebase-api-key|ci\.firebaseapp\.com|ci-urai-spatial/)
  assert.doesNotMatch(signedWorkflow, /ci-firebase-api-key|ci\.firebaseapp\.com|ci-urai-spatial/)
})

test('Android release version is explicit and survives regenerated Capacitor projects', () => {
  assert.match(unsignedWorkflow, /ANDROID_VERSION_CODE/)
  assert.match(unsignedWorkflow, /Apply governed Android version/)
  assert.match(unsignedWorkflow, /versionCode\\s\+\\d\+/)
  assert.match(signedWorkflow, /version_code:/)
  assert.match(signedWorkflow, /version_name:/)
  assert.match(signedWorkflow, /ANDROID_VERSION_CODE/)
  assert.match(signedWorkflow, /Apply governed Android version/)
  assert.match(signedWorkflow, /versionCode\\s\+\\d\+/)
})

test('native API routing allows only HTTPS configured origins and API paths', () => {
  assert.match(apiHelper, /NEXT_PUBLIC_URAI_API_ORIGIN/)
  assert.match(apiHelper, /candidate\.protocol !== 'https:'/)
  assert.match(apiHelper, /candidate\.username/)
  assert.match(apiHelper, /candidate\.password/)
  assert.match(apiHelper, /path\.startsWith\('\/api\/'\)/)
})


test('native Google OAuth uses the system browser and exact HTTPS return boundary', () => {
  assert.match(nativeOAuthSource, /@capacitor\/browser/)
  assert.match(nativeOAuthSource, /@capacitor\/app/)
  assert.match(nativeOAuthSource, /Capacitor\.isNativePlatform\(\)/)
  assert.match(nativeOAuthSource, /https:\/\/accounts\.google\.com/)
  assert.match(nativeOAuthSource, /https:\/\/urai\.app/)
  assert.match(nativeOAuthSource, /appUrlOpen/)
  assert.match(nativeOAuthSource, /Browser\.close/)
  assert.match(settingsSource, /openNativeGoogleAuthorization/)
  assert.match(settingsSource, /registerNativeGoogleOAuthReturn/)
  assert.match(shellPackage, /"@capacitor\/app": "8\.1\.1"/)
  assert.match(shellPackage, /"@capacitor\/browser": "8\.0\.4"/)
})

test('generated Android shell receives a verified HTTPS settings App Link', () => {
  assert.match(shellConfigScript, /android:autoVerify="true"/)
  assert.match(shellConfigScript, /android:scheme="https"/)
  assert.match(shellConfigScript, /android:host="urai\.app"/)
  assert.match(shellConfigScript, /android:pathPrefix="\/settings"/)
  assert.match(shellConfigScript, /singleTask/)
  assert.match(unsignedWorkflow, /Configure verified Android App Link/)
  assert.match(signedWorkflow, /Configure verified Android App Link/)
  assert.match(signedWorkflow, /Render verified App Link association/)
  assert.match(signedWorkflow, /android-assetlinks\.json/)
  assert.match(signedWorkflow, /exact_head_release_governance_guard_not_green/)
})
