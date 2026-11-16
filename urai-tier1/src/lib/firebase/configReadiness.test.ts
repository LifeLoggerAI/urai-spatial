import test from 'node:test'
import assert from 'node:assert/strict'
import { isFirebaseBrowserConfigReady, REQUIRED_FIREBASE_BROWSER_KEYS } from './configReadiness.ts'

const good = () => ({
  NEXT_PUBLIC_FIREBASE_API_KEY: 'synthetic-key',
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: 'synthetic.firebaseapp.com',
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: 'urai-isolated-staging',
  NEXT_PUBLIC_FIREBASE_APP_ID: '1:synthetic:web:synthetic',
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: 'urai-isolated-staging.firebasestorage.app',
})

test('complete public configuration allows client initialization, not private-storage authorization', () => {
  assert.equal(isFirebaseBrowserConfigReady(good()), true)
})
test('all five keys required and no alternate key substitutes', () => {
  assert.equal(REQUIRED_FIREBASE_BROWSER_KEYS.length, 5)
  for (const key of REQUIRED_FIREBASE_BROWSER_KEYS) {
    const cfg: Record<string,string|undefined> = {...good()}
    delete cfg[key]
    assert.equal(isFirebaseBrowserConfigReady(cfg), false, `missing ${key}`)
  }
})
test('empty and whitespace-only keys are rejected', () => {
  for (const key of REQUIRED_FIREBASE_BROWSER_KEYS) {
    const cfg: Record<string,string|undefined> = {...good(), [key]: '    '}
    assert.equal(isFirebaseBrowserConfigReady(cfg), false, `blank ${key}`)
  }
})
test('legacy three-field config is insufficient for Genesis', () => {
  const cfg: Record<string,string|undefined> = {...good()}
  delete cfg.NEXT_PUBLIC_FIREBASE_APP_ID
  delete cfg.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
  assert.equal(isFirebaseBrowserConfigReady(cfg), false)
})
test('unrelated build and preview flags cannot grant client readiness', () => {
  assert.equal(isFirebaseBrowserConfigReady({
    NEXT_PUBLIC_URAI_BUILD_SHA: '7b5a9f9026b0ecf72c628c83517f146633c6c2f3',
    NEXT_PUBLIC_URAI_PREVIEW_MODE: 'true',
  }), false)
})
