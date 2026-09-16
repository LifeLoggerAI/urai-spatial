import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const provider = fs.readFileSync(new URL('../../apps/functions/src/founderVoiceProvider.ts', import.meta.url), 'utf8')
const client = fs.readFileSync(new URL('../src/spatial/narrator/founderVoiceClient.ts', import.meta.url), 'utf8')
const envExample = fs.readFileSync(new URL('../../.env.example', import.meta.url), 'utf8')
const firebase = JSON.parse(fs.readFileSync(new URL('../../firebase.json', import.meta.url), 'utf8'))

const performanceModes = [
  'natural',
  'neutral',
  'warm',
  'reflective',
  'serious',
  'curious',
  'excited',
  'quiet',
  'reassuring',
  'authoritative',
]

test('founder voice is fail closed until a server-only model id is explicitly enabled', () => {
  assert.match(provider, /FOUNDER_VOICE_ENABLED/)
  assert.match(provider, /FOUNDER_VOICE_ID/)
  assert.match(provider, /FOUNDER_VOICE_NOT_CONFIGURED/)
  assert.match(envExample, /FOUNDER_VOICE_ENABLED=false/)
  assert.match(envExample, /FOUNDER_VOICE_ID=\n/)
  assert.doesNotMatch(envExample, /NEXT_PUBLIC_FOUNDER_VOICE/)
  assert.doesNotMatch(client, /FOUNDER_VOICE_ID|ELEVENLABS_ALLOWED_VOICE_IDS/)
})

test('founder voice remains authenticated, consent-gated, rate-limited, allowlisted, and private', () => {
  assert.match(provider, /verifyIdToken\([^,]+, true\)/)
  assert.match(provider, /privacyPolicy\/current/)
  assert.match(provider, /fully-enforced/)
  assert.match(provider, /providerRateLimits\/elevenlabs-founder/)
  assert.match(provider, /ELEVENLABS_ALLOWED_VOICE_IDS/)
  assert.match(provider, /defineSecret\('ELEVENLABS_API_KEY'\)/)
  assert.match(provider, /private, no-store, max-age=0/)
  assert.doesNotMatch(provider, /NEXT_PUBLIC_/)
})

test('client uses same-origin founder route and never sends a voice id', () => {
  assert.match(client, /\/api\/urai\/founder-voice\/elevenlabs/)
  assert.match(client, /getAuth\(app\)\.currentUser/)
  assert.match(client, /getIdToken\(\)/)
  assert.match(client, /externalProcessingConsent = false/)
  assert.match(client, /cache: "no-store"/)
  assert.doesNotMatch(client, /voiceId/)
  assert.doesNotMatch(client, /api\.elevenlabs\.io/)
})

test('all locked founder performance modes are represented server side', () => {
  for (const mode of performanceModes) assert.match(provider, new RegExp(`['"]${mode}['"]`))
})

test('production hosting routes founder voice to the isolated Firebase function', () => {
  const found = firebase.hosting.rewrites?.some((rewrite) => (
    rewrite.source === '/api/urai/founder-voice/elevenlabs'
    && rewrite.function?.functionId === 'founderVoiceProvider'
    && rewrite.function?.region === 'us-central1'
  ))
  assert.equal(found, true)
})

test('runtime implementation contains no human-source corpus or holdout material', () => {
  const source = `${provider}\n${client}`
  assert.doesNotMatch(source, /URAI_VOICE_MASTER_V1_RAW|provider_enrollment_manifest|EVALUATION_HOLDOUT|\.wav|\.mp3/)
})
