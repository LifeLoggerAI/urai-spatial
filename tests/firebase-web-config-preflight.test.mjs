import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import test from 'node:test'

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
  assert.match(ready, /NEXT_PUBLIC_FIREBASE_APP_ID/)
  assert.match(old, /from ['"]\.\/client['"]/)
  assert.doesNotMatch(old, /initializeApp/)
})

test('R591: accept only canonical same-project default Storage bucket forms', () => {
  for (const [target, project] of [['production', 'urai-4dc1d'], ['staging', 'urai-staging']]) {
    for (const bucket of [`${project}.appspot.com`, `${project}.firebasestorage.app`]) {
      const result = check(target, { ...webEnv(project), NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: bucket })
      assert.equal(result.status, 0, `${target}: ${bucket}: ${result.stderr}`)
    }
  }
})

test('R591: reject unknown, cross-project, malformed and self-declared Storage buckets', () => {
  for (const [target, project, other] of [
    ['production', 'urai-4dc1d', 'urai-staging'],
    ['staging', 'urai-staging', 'urai-4dc1d'],
  ]) {
    for (const bucket of [
      `${other}.appspot.com`,
      `${other}.firebasestorage.app`,
      'unrelated-enterprise.firebasestorage.app',
      'my-company-custom-bucket',
      `${project}.appspot.com.untrusted.example`,
      `gs://${project}.firebasestorage.app`,
      `${project}.appspot.com/`,
    ]) {
      const result = check(target, { ...webEnv(project), NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: bucket })
      assert.equal(result.status, 1, `${target} incorrectly accepted ${bucket}`)
      assert.match(result.stderr, /Storage bucket is not a reviewed default/)
      assert.doesNotMatch(result.stdout, /configuration verified/)
    }
  }
})

test('R591: unknown Firebase Auth custom domains fail closed until independently reviewed', () => {
  for (const [target, project, other] of [
    ['production', 'urai-4dc1d', 'urai-staging'],
    ['staging', 'urai-staging', 'urai-4dc1d'],
  ]) {
    for (const domain of [
      `${other}.firebaseapp.com`,
      'login.urai.app',
      'unrelated-enterprise.example',
      `${project}.firebaseapp.com.untrusted.example`,
      `https://${project}.firebaseapp.com`,
      `${project}.firebaseapp.com:443`,
    ]) {
      const result = check(target, { ...webEnv(project), NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: domain })
      assert.equal(result.status, 1, `${target} incorrectly accepted ${domain}`)
      assert.match(result.stderr, /Auth domain is not a reviewed default/)
    }
  }
})
