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
