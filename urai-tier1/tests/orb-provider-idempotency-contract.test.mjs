import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const client = fs.readFileSync(new URL('../src/spatial/orb/openaiClient.ts', import.meta.url), 'utf8')
const provider = fs.readFileSync(new URL('../../apps/functions/src/providerFunctions.ts', import.meta.url), 'utf8')

test('Orb derives a stable request identity from unchanged intent before provider dispatch', () => {
  assert.match(client, /stableIntentRequestId/)
  assert.match(client, /crypto\.subtle\.digest\('SHA-256'/)
  assert.match(client, /JSON\.stringify\(\{ message, context: context\.slice\(-8\), locale \}\)/)
  assert.match(client, /requestId,/)
  assert.doesNotMatch(client, /randomUUID\(\)/)
})

test('server binds upstream idempotency to authenticated user and stable client identity', () => {
  assert.match(provider, /function requireRequestId/)
  assert.match(provider, /\^\[a-f0-9\]\{64\}\$/)
  assert.match(provider, /providerIdempotencyKey\(uid, requestId, locale\)/)
  assert.match(provider, /urai-openai-provider:\$\{uid\}:\$\{requestId\}:\$\{locale\}/)
  assert.match(provider, /'Idempotency-Key': upstreamIdempotencyKey/)
  assert.doesNotMatch(provider, /'Idempotency-Key': randomUUID\(\)/)
})
