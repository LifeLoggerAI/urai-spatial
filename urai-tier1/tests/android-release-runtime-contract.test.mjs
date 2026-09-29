import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const unsignedWorkflow = fs.readFileSync(new URL('../../.github/workflows/android-package-prep.yml', import.meta.url), 'utf8')
const signedWorkflow = fs.readFileSync(new URL('../../.github/workflows/android-governed-signing-prep.yml', import.meta.url), 'utf8')
const apiHelper = fs.readFileSync(new URL('../src/lib/clientApiUrl.ts', import.meta.url), 'utf8')
const deviceSettings = fs.readFileSync(new URL('../src/app/settings/DeviceSettingsClient.tsx', import.meta.url), 'utf8')

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


test('native Android fails closed for optional Google Workspace OAuth until app return is certified', () => {
  assert.match(deviceSettings, /isNativeCapacitorRuntime/)
  assert.match(deviceSettings, /googleNativeBlocked/)
  assert.match(deviceSettings, /Use web to connect/)
  assert.match(deviceSettings, /Android system-browser return path is being certified/)
  assert.match(deviceSettings, /disabled=\{googleState==='working'\|\|googleState==='checking'\|\|googleNativeBlocked\}/)
})
