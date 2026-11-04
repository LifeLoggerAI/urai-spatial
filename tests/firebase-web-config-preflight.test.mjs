import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import test from 'node:test'
import {
  hasCanonicalFirebaseWebIdentityShape,
  matchesConfiguredFirebaseAppIdentity,
} from '../urai-tier1/src/lib/firebase/firebaseWebIdentity.mjs'

const script = fileURLToPath(new URL('../scripts/firebase-web-config-preflight.mjs', import.meta.url))
const canonical = fileURLToPath(new URL('../urai-tier1/src/lib/firebase/client.ts', import.meta.url))
const compatibility = fileURLToPath(new URL('../urai-tier1/src/lib/firebase/firebaseClient.ts', import.meta.url))

const webEnv = (project) => ({
  NEXT_PUBLIC_FIREBASE_API_KEY: 'integration-check-public-config',
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: `${project}.firebaseapp.com`,
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: project,
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: `${project}.firebasestorage.app`,
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: '1234567890',
  NEXT_PUBLIC_FIREBASE_APP_ID: '1:1234567890:web:abc123def456',
})
const check = (target, env = {}) => spawnSync(process.execPath, [script, `--target=${target}`], {
  env: { PATH: process.env.PATH ?? '', ...env },
  encoding: 'utf8',
})

test('production and staging check accept isolated complete Firebase configs', () => {
  for (const [target, project] of [['production', 'urai-4dc1d'], ['staging', 'urai-staging']]) {
    const result = check(target, webEnv(project))
    assert.equal(result.status, 0, result.stderr)
    assert.match(result.stdout, /static check only/i)
  }
})

test('web config fails closed if missing or placeholder', () => {
  const missing = check('production')
  assert.equal(missing.status, 1)
  assert.match(missing.stderr, /NEXT_PUBLIC_FIREBASE_API_KEY/)
  const placeholder = check('production', { ...webEnv('urai-4dc1d'), NEXT_PUBLIC_FIREBASE_API_KEY: 'demo' })
  assert.equal(placeholder.status, 1)
})

test('rejects known CI and local placeholder API keys', () => {
  for (const key of ['ci-firebase-api-key', 'urai-local-demo-api-key', 'dev-key', '<FIREBASE_API_KEY>']) {
    const result = check('production', { ...webEnv('urai-4dc1d'), NEXT_PUBLIC_FIREBASE_API_KEY: key })
    assert.equal(result.status, 1, key)
  }
})

test('rejects production/staging cross-target project and auth domain', () => {
  assert.equal(check('production', webEnv('urai-staging')).status, 1)
  assert.equal(check('staging', webEnv('urai-4dc1d')).status, 1)
  assert.equal(check('production', { ...webEnv('urai-4dc1d'), NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: 'urai-staging.firebaseapp.com' }).status, 1)
  assert.equal(check('production', { ...webEnv('urai-4dc1d'), URAI_SPATIAL_FIREBASE_PROJECT_ID: 'urai-staging' }).status, 1)
})

test('rejects app ID and sender mismatch without printing the public key value', () => {
  const env = { ...webEnv('urai-4dc1d'), NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: '999' }
  const result = check('production', env)
  assert.equal(result.status, 1)
  assert.match(result.stderr, /sender ID do not match/)
  assert.doesNotMatch(result.stderr + result.stdout, /integration-check-public-config/)
})

test('client readiness requires web app ID and compatibility helper shares canonical app', () => {
  const client = readFileSync(canonical, 'utf8')
  const old = readFileSync(compatibility, 'utf8')
  const ready = client.match(/export const firebasePublicEnvReady = Boolean\(([\s\S]*?)\)/)?.[1]
  assert.ok(ready)
  assert.match(ready, /configuredShapeIsCanonical/)
  assert.match(ready, /matchesConfiguredFirebaseAppIdentity/)
  assert.match(client, /appId: PUBLIC_FIREBASE_ENV\.NEXT_PUBLIC_FIREBASE_APP_ID/)
  assert.match(old, /from ['"]\.\/client['"]/)
  assert.doesNotMatch(old, /initializeApp/)
})


test('rejects arbitrary foreign Storage buckets for either target', () => {
  for (const [target, project] of [['production', 'urai-4dc1d'], ['staging', 'urai-staging']]) {
    for (const bucket of [
      'another-company-prod.firebasestorage.app',
      'unrelated.appspot.com',
      target === 'production' ? 'urai-staging.firebasestorage.app' : 'urai-4dc1d.firebasestorage.app',
    ]) {
      const result = check(target, { ...webEnv(project), NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: bucket })
      assert.equal(result.status, 1, target + ': ' + bucket)
      assert.match(result.stderr, /Storage bucket is not approved/)
    }
  }
})

test('accepts only default bucket naming forms for the selected Firebase project', () => {
  for (const [target, project] of [['production', 'urai-4dc1d'], ['staging', 'urai-staging']]) {
    for (const bucket of [`${project}.firebasestorage.app`, `${project}.appspot.com`]) {
      const result = check(target, { ...webEnv(project), NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: bucket })
      assert.equal(result.status, 0, result.stderr)
    }
  }
})

test('unknown custom and cross-project Auth domains fail closed pending provider approval', () => {
  for (const [target, project] of [['production', 'urai-4dc1d'], ['staging', 'urai-staging']]) {
    for (const domain of ['login.other-company.com', 'unrelated.firebaseapp.com']) {
      const result = check(target, { ...webEnv(project), NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: domain })
      assert.equal(result.status, 1, target + ': ' + domain)
      assert.match(result.stderr, /Auth domain is not approved/)
    }
  }
})

test('legacy Tier1 Firebase entrypoint reuses canonical app and guards seeded fallback', () => {
  const legacy = readFileSync(fileURLToPath(new URL('../urai-tier1/src/lib/firebase.ts', import.meta.url)), 'utf8')
  assert.match(legacy, /from ['"]\.\/firebase\/client['"]/)
  assert.match(legacy, /export const firebaseApp = firebasePublicEnvReady \? app : null/)
  assert.match(legacy, /export const db = firebaseApp \? getFirebaseDb\(\) : null/)
  assert.doesNotMatch(legacy, /\b(?:initializeApp|getApps|getFirestore)\s*\(/)
})


const runtimeIdentity = (project, suffix = 'firebasestorage.app') => ({
  apiKey: 'integration-check-public-config',
  authDomain: project + '.firebaseapp.com',
  projectId: project,
  storageBucket: project + '.' + suffix,
  messagingSenderId: '1234567890',
  appId: '1:1234567890:web:abc123def456',
})

test('runtime accepts only URAI first-party canonical Firebase identity shapes', () => {
  for (const project of ['urai-4dc1d', 'urai-staging']) {
    for (const suffix of ['firebasestorage.app', 'appspot.com']) {
      assert.equal(hasCanonicalFirebaseWebIdentityShape(runtimeIdentity(project, suffix)), true)
    }
  }
})

test('runtime rejects cross-project, foreign bucket, unknown Auth host, and inconsistent app ID', () => {
  const config = runtimeIdentity('urai-4dc1d')
  const mutations = {
    projectId: 'other-company',
    authDomain: 'evil.firebaseapp.com',
    storageBucket: 'other-company.firebasestorage.app',
    messagingSenderId: '234567890',
    appId: '1:234567890:web:abc',
    apiKey: 'ci-firebase-api-key',
  }
  for (const [key, bad] of Object.entries(mutations)) {
    assert.equal(hasCanonicalFirebaseWebIdentityShape({ ...config, [key]: bad }), false, key)
  }
})

test('runtime refuses missing or padded public values rather than initializing another project', () => {
  const valid = runtimeIdentity('urai-staging')
  for (const key of Object.keys(valid)) {
    assert.equal(hasCanonicalFirebaseWebIdentityShape({ ...valid, [key]: '' }), false, key)
    assert.equal(hasCanonicalFirebaseWebIdentityShape({ ...valid, [key]: ' ' + valid[key] }), false, key)
  }
  assert.equal(hasCanonicalFirebaseWebIdentityShape(null), false)
  assert.equal(hasCanonicalFirebaseWebIdentityShape({ ...valid, appId: '1:1234567890:ios:abc' }), false)
})

test('existing Firebase default app must match every public identity field', () => {
  const valid = runtimeIdentity('urai-4dc1d')
  assert.equal(matchesConfiguredFirebaseAppIdentity(valid, { ...valid }), true)
  for (const key of Object.keys(valid)) {
    assert.equal(matchesConfiguredFirebaseAppIdentity({ ...valid, [key]: 'wrong' }, valid), false, key)
  }
  assert.equal(matchesConfiguredFirebaseAppIdentity(null, valid), false)
  const source = readFileSync(canonical, 'utf8')
  assert.match(source, /hasCanonicalFirebaseWebIdentityShape/)
  assert.match(source, /matchesConfiguredFirebaseAppIdentity\(app.options, firebaseConfig\)/)
  assert.match(source, /const fallbackProjectId = 'urai-local'/)
})


test('tier-lock callable requires canonical Firebase readiness (no three-field project initialization)', () => {
  const tierLocks = readFileSync(
    fileURLToPath(new URL('../urai-tier1/src/lib/tier-locks/client.ts', import.meta.url)),
    'utf8',
  )
  assert.match(tierLocks, /import \{ functions, firebasePublicEnvReady \} from ['"]\.\.\/firebase\/client['"]/)
  assert.match(tierLocks, /if \(!firebasePublicEnvReady\) return null/)
  assert.match(tierLocks, /return httpsCallable\(functions, ['"]evaluateSpatialTierLock['"]\)/)
  assert.doesNotMatch(tierLocks, /\b(?:initializeApp|getApps|getApp|getFunctions)\s*\(/)
  assert.doesNotMatch(tierLocks, /process\.env\.NEXT_PUBLIC_FIREBASE_(?:API_KEY|APP_ID|PROJECT_ID)/)
  // A public NEXT_PUBLIC tier flag cannot imply an authenticated session.
  assert.match(tierLocks, /authenticated:\s*false/)
  // Cached allowed decisions cannot be shared by different users at the same tier.
  assert.doesNotMatch(tierLocks, /\b(?:cache\.get|cache\.set|cache\.has)\s*\(/)
  assert.doesNotMatch(tierLocks, /new Map<string,\s*TierLockDecision>/)
})


test('Life Map star writes require canonical Firebase identity, never arbitrary default app', () => {
  const starWriter = readFileSync(
    fileURLToPath(new URL('../urai-tier1/src/lib/lifemap/writeLifeMapStar.ts', import.meta.url)),
    'utf8',
  )
  assert.match(starWriter, /import \{ functions, firebasePublicEnvReady \} from ['"]\.\.\/firebase\/client['"]/)
  assert.match(starWriter, /if \(!firebasePublicEnvReady\)/)
  assert.match(starWriter, /httpsCallable<LifeMapStarWriteInput, LifeMapStarWriteResult>\(\s*functions/)
  assert.doesNotMatch(starWriter, /\b(?:getApp|getApps|initializeApp|getFunctions)\s*\(/)
  assert.doesNotMatch(starWriter, /process\.env\.NEXT_PUBLIC_FIREBASE_(?:API_KEY|APP_ID|PROJECT_ID)/)
})


test('Possible Future callable requires canonical Firebase identity before dispatch', () => {
  const scenario = readFileSync(
    fileURLToPath(new URL('../urai-tier1/src/lib/scenario/scenarioClient.ts', import.meta.url)),
    'utf8',
  )
  assert.match(scenario, /import \{ functions, firebasePublicEnvReady \} from ['"]@\/lib\/firebase\/client['"]/)
  assert.match(scenario, /if \(!firebasePublicEnvReady\) throw new Error/)
  assert.match(scenario, /httpsCallable<Record<string, unknown>, T>\(functions, name\)/)
  assert.doesNotMatch(scenario, /\b(?:getApp|getApps|initializeApp|getFunctions)\s*\(/)
})


test('launch analytics remote write is fenced by canonical Firebase identity', () => {
  const analytics = readFileSync(
    fileURLToPath(new URL('../urai-tier1/src/spatial/analytics/track.ts', import.meta.url)),
    'utf8',
  )
  assert.match(analytics, /import \{ firebasePublicEnvReady, getFirebaseDb \} from ['"]\.\.\/\.\.\/lib\/firebase\/client['"]/)
  assert.match(analytics, /if \(!firebasePublicEnvReady\) return payload/)
  assert.doesNotMatch(analytics, /\b(?:getApp|getApps|initializeApp)\s*\(/)
})


test('waitlist confirmation must be backed by a successful remote write', () => {
  const signup = readFileSync(
    fileURLToPath(new URL('../urai-tier1/src/spatial/landing/earlyAccessSignup.ts', import.meta.url)),
    'utf8',
  )
  const page = readFileSync(
    fileURLToPath(new URL('../urai-tier1/src/app/early-access/page.tsx', import.meta.url)),
    'utf8',
  )
  assert.match(signup, /if \(!firebasePublicEnvReady\) return \{ \.\.\.signup, persistedRemotely: false \}/)
  assert.match(signup, /await setDoc\([\s\S]*?return \{ \.\.\.signup, persistedRemotely: true \}/)
  assert.match(signup, /return \{ \.\.\.signup, persistedRemotely: false \};\s*\}/)
  assert.match(page, /if \(!saved\.persistedRemotely\)/)
  assert.match(page, /It has not reached the waitlist/)
  // The approved Marketing-to-UrAi handoff never caches raw emails on the device.
  assert.doesNotMatch(signup, /\b(?:localStorage|sessionStorage|writeLocal)\b/)
  assert.doesNotMatch(page, /Your email is saved only on this device/)
  assert.match(page, /did not save your email on this device/)
  assert.match(page, /trackLaunchEvent\("early_access_signup_completed"\)/)
  assert.ok(page.indexOf('if (!saved.persistedRemotely)') < page.indexOf('trackLaunchEvent("early_access_signup_completed")'))
})
