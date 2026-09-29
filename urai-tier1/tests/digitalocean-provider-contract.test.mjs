import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const adapter = fs.readFileSync(new URL('../../apps/functions/src/digitalOceanProvider.ts', import.meta.url), 'utf8')
const router = fs.readFileSync(new URL('../../apps/functions/src/providerCanaryRouter.ts', import.meta.url), 'utf8')
const client = fs.readFileSync(new URL('../src/spatial/providers/providerCanaryClient.ts', import.meta.url), 'utf8')

test('DigitalOcean adapter is bounded, synthetic-only, server-side and cost constrained', () => {
  assert.match(adapter, /https:\/\/inference\.do-ai\.run\/v1/)
  assert.match(adapter, /openai-gpt-oss-20b/)
  assert.match(adapter, /max_completion_tokens: 32/)
  assert.match(adapter, /temperature: 0/)
  assert.match(adapter, /store: false/)
  assert.match(adapter, /setTimeout\(\(\) => controller\.abort\(\), 10_000\)/)
  assert.match(adapter, /DIGITALOCEAN_TIMEOUT/)
  assert.match(adapter, /DIGITALOCEAN_RATE_LIMITED/)
  assert.match(adapter, /DIGITALOCEAN_CANARY_MISMATCH/)
  assert.doesNotMatch(adapter, /NEXT_PUBLIC_/)
})

test('DigitalOcean router is authenticated, consented, throttled and disabled by default', () => {
  assert.match(router, /defineSecret\('DIGITALOCEAN_MODEL_ACCESS_KEY'\)/)
  assert.match(router, /URAI_ENABLE_DIGITALOCEAN !== 'true'/)
  assert.match(router, /verifyIdToken\([^,]+, true\)/)
  assert.match(router, /privacyPolicy\/current/)
  assert.match(router, /fully-enforced/)
  assert.match(router, /providerConnections/)
  assert.match(router, /providerRateLimits/)
  assert.match(router, /syntheticTest !== true/)
  assert.match(router, /dataClass !== 'synthetic'/)
  assert.match(router, /private, no-store, max-age=0/)
  assert.match(router, /X-URAI-Provider/)
  assert.doesNotMatch(router, /console\.(log|info|warn|error)\(/)
})

test('browser canary client is same-origin, authenticated and never carries arbitrary user content', () => {
  assert.match(client, /getAuth\(app\)\.currentUser/)
  assert.match(client, /getIdToken\(\)/)
  assert.match(client, /Authorization/)
  assert.match(client, /fetch\('\/api\/urai\/providers\/canary'/)
  assert.match(client, /syntheticTest: true/)
  assert.match(client, /dataClass: 'synthetic'/)
  assert.doesNotMatch(client, /message:/)
  assert.doesNotMatch(client, /context:/)
  assert.doesNotMatch(client, /inference\.do-ai\.run/)
})
