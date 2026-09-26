import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const authProviders = fs.readFileSync(new URL('../src/auth/uraiAuthProviders.ts', import.meta.url), 'utf8')
const login = fs.readFileSync(new URL('../src/app/login/LoginClient.tsx', import.meta.url), 'utf8')
const loginPage = fs.readFileSync(new URL('../src/app/login/page.tsx', import.meta.url), 'utf8')
const onboardingModel = fs.readFileSync(new URL('../src/app/onboardingModel.ts', import.meta.url), 'utf8')
const onboardingLayer = fs.readFileSync(new URL('../src/app/UraiV2OnboardingLayer.tsx', import.meta.url), 'utf8')
const settings = fs.readFileSync(new URL('../src/app/settings/DeviceSettingsClient.tsx', import.meta.url), 'utf8')
const settingsPage = fs.readFileSync(new URL('../src/app/settings/page.tsx', import.meta.url), 'utf8')
const homePage = fs.readFileSync(new URL('../src/app/home/page.tsx', import.meta.url), 'utf8')
const privacyPage = fs.readFileSync(new URL('../src/app/privacy-controls/page.tsx', import.meta.url), 'utf8')
const brandRegistry = fs.readFileSync(new URL('../src/brand/urai-brand.registry.ts', import.meta.url), 'utf8')

test('identity providers are explicit and provider-gated', () => {
  assert.match(authProviders, /NEXT_PUBLIC_URAI_AUTH_GOOGLE_ENABLED !== 'false'/)
  for (const flag of [
    'NEXT_PUBLIC_URAI_AUTH_APPLE_ENABLED',
    'NEXT_PUBLIC_URAI_AUTH_MICROSOFT_ENABLED',
    'NEXT_PUBLIC_URAI_AUTH_GITHUB_ENABLED',
    'NEXT_PUBLIC_URAI_AUTH_FACEBOOK_ENABLED',
  ]) assert.match(authProviders, new RegExp(flag))
  assert.match(authProviders, /new OAuthProvider\('apple\.com'\)/)
  assert.match(authProviders, /new OAuthProvider\('microsoft\.com'\)/)
  assert.match(authProviders, /new GithubAuthProvider\(\)/)
  assert.match(authProviders, /new FacebookAuthProvider\(\)/)
})

test('authentication is explicitly separate from historical context import', () => {
  assert.match(login, /Signing in proves account identity only\./)
  assert.match(login, /does not connect or import email, social posts, photos, videos, messages, contacts, files, calendar history/)
  assert.match(login, /Connected accounts/)
  assert.match(settings, /Connecting does not import history or create memories/)
  assert.match(settings, /Historical import remains off until you choose what to bring in/)
})

test('first-run setup includes a governed optional history step', () => {
  assert.match(onboardingModel, /\['welcome', 'privacy', 'history', 'comfort', 'orb'\]/)
  assert.match(onboardingLayer, /YOUR HISTORY, YOUR CHOICE/)
  assert.match(onboardingLayer, /Signing in does not import anything\./)
  assert.match(onboardingLayer, /ONBOARDING_SETUP_STEPS\.length/)
  assert.match(onboardingLayer, /href="\/settings#connected-data"/)
})

test('active consumer identity uses UrAi on canonical entry surfaces', () => {
  assert.match(brandRegistry, /name: "UrAi"/)
  for (const source of [loginPage, settingsPage, homePage, privacyPage]) {
    assert.match(source, /UrAi/)
    assert.doesNotMatch(source, /title: 'URAI/)
  }
})
