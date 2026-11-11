import assert from 'node:assert/strict'
import test from 'node:test'
import { adamLocalEmulatorRewrites } from '../scripts/adam-local-functions-proxy.mjs'

const demo = Object.freeze({
  NODE_ENV: 'development',
  URAI_ADAM_LOCAL_EMULATOR_PROXY: 'true',
  NEXT_PUBLIC_URAI_AUTH_JOURNEY_EMULATOR: 'true',
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: 'demo-urai-auth-journey',
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: 'demo-urai-auth-journey.firebaseapp.com',
  NEXT_PUBLIC_FIREBASE_API_KEY: 'fictional-test-api-key',
  URAI_FIREBASE_STATIC_EXPORT: 'false',
})

test('Adam local routing is absent by default, including a production environment', () => {
  assert.deepEqual(adamLocalEmulatorRewrites({ NODE_ENV: 'development' }), [])
  assert.deepEqual(adamLocalEmulatorRewrites({ NODE_ENV: 'production' }), [])
  assert.deepEqual(adamLocalEmulatorRewrites({ ...demo, URAI_ADAM_LOCAL_EMULATOR_PROXY: 'false' }), [])
})

test('enabled fictional project routes only original two Adam Functions, never provider URLs', () => {
  const rewrites = adamLocalEmulatorRewrites(demo)
  assert.deepEqual(rewrites, [
    { source: '/api/urai/adam/conversation', destination: 'http://127.0.0.1:5001/demo-urai-auth-journey/us-central1/adamPresenceProvider' },
    { source: '/api/urai/adam/voice', destination: 'http://127.0.0.1:5001/demo-urai-auth-journey/us-central1/adamFounderVoiceProvider' },
  ])
  assert.ok(rewrites.every((rewrite) => new URL(rewrite.destination).hostname === '127.0.0.1'))
  assert.ok(rewrites.every((rewrite) => !rewrite.source.includes('*')))
})

for (const [label, override] of [
  ['production', { NODE_ENV: 'production' }],
  ['test runtime', { NODE_ENV: 'test' }],
  ['unknown runtime', { NODE_ENV: undefined }],
  ['static export', { URAI_FIREBASE_STATIC_EXPORT: 'true' }],
  ['live Firebase project', { NEXT_PUBLIC_FIREBASE_PROJECT_ID: 'urai-4dc1d' }],
  ['empty Firebase project', { NEXT_PUBLIC_FIREBASE_PROJECT_ID: '' }],
  ['wrong Auth domain', { NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: 'urai-4dc1d.firebaseapp.com' }],
  ['missing Auth domain', { NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: undefined }],
  ['missing public API key', { NEXT_PUBLIC_FIREBASE_API_KEY: '' }],
  ['missing Auth emulator opt-in', { NEXT_PUBLIC_URAI_AUTH_JOURNEY_EMULATOR: 'false' }],
  ['external HTTPS API override', { NEXT_PUBLIC_URAI_API_ORIGIN: 'https://urai.app' }],
  ['loopback API override', { NEXT_PUBLIC_URAI_API_ORIGIN: 'http://127.0.0.1:5001' }],
  ['live OpenAI key exposed to Next dev', { OPENAI_API_KEY: 'not-allowed' }],
  ['live ElevenLabs key exposed to Next dev', { ELEVENLABS_API_KEY: 'not-allowed' }],
  ['paid worker tokens exposed to Next dev', { SPATIAL_SPEND_WORKER_TOKENS_JSON: 'not-allowed' }],
  ['cloud credentials exposed to Next dev', { GOOGLE_APPLICATION_CREDENTIALS: 'credentials.json' }],
]) {
  test(`explicit Adam emulator proxy rejects ${label}`, () => {
    assert.throws(
      () => adamLocalEmulatorRewrites({ ...demo, ...override }),
      /Refusing Adam local emulator proxy outside the isolated fictional Firebase development project/,
    )
  })
}
