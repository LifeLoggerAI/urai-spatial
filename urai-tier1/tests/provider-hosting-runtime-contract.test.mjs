import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const firebaseConfig = JSON.parse(fs.readFileSync(new URL('../../firebase.json', import.meta.url), 'utf8'))
const functionsIndex = fs.readFileSync(new URL('../../apps/functions/src/index.ts', import.meta.url), 'utf8')
const providerFunctions = fs.readFileSync(new URL('../../apps/functions/src/providerFunctions.ts', import.meta.url), 'utf8')
const openAiClient = fs.readFileSync(new URL('../src/spatial/orb/openaiClient.ts', import.meta.url), 'utf8')
const narratorClient = fs.readFileSync(new URL('../src/spatial/narrator/elevenlabsClient.ts', import.meta.url), 'utf8')

test('static Hosting rewrites every live provider URL to secret-bound Firebase Functions', () => {
  const rewrites = firebaseConfig.hosting.rewrites
  assert.deepEqual(rewrites, [
    { source: '/api/urai/orb/openai', function: { functionId: 'openAiOrbProvider', region: 'us-central1' } },
    { source: '/api/urai/narrator/elevenlabs', function: { functionId: 'elevenLabsVoiceProvider', region: 'us-central1' } },
    { source: '/api/voice/elevenlabs', function: { functionId: 'elevenLabsVoiceProvider', region: 'us-central1' } },
  ])
  assert.match(functionsIndex, /elevenLabsVoiceProvider, openAiOrbProvider/)
})

test('deployed provider functions bind Cloud Secret Manager values and reject open CORS', () => {
  assert.match(providerFunctions, /defineSecret\('OPENAI_API_KEY'\)/)
  assert.match(providerFunctions, /defineSecret\('ELEVENLABS_API_KEY'\)/)
  assert.match(providerFunctions, /secrets: \[OPENAI_API_KEY\]/)
  assert.match(providerFunctions, /secrets: \[ELEVENLABS_API_KEY\]/)
  assert.equal((providerFunctions.match(/cors: false/g) ?? []).length, 2)
  assert.match(providerFunctions, /verifyIdToken\([^,]+, true\)/)
  assert.match(providerFunctions, /privacyPolicy\/current/)
  assert.match(providerFunctions, /providerRateLimits/)
  assert.match(providerFunctions, /store: false/)
  assert.match(providerFunctions, /text\/event-stream/)
  assert.match(providerFunctions, /request\.on\('close', \(\) => controller\.abort\(\)\)/)
  assert.match(providerFunctions, /private, no-store, max-age=0/)
  assert.doesNotMatch(providerFunctions, /console\.(log|info|warn|error)\([^)]*(message|text|context)/)
})

test('browser clients use only same-origin rewritten endpoints', () => {
  assert.match(openAiClient, /fetch\('\/api\/urai\/orb\/openai'/)
  assert.match(narratorClient, /fetch\("\/api\/urai\/narrator\/elevenlabs"/)
  assert.doesNotMatch(openAiClient, /api\.openai\.com/)
  assert.doesNotMatch(narratorClient, /api\.elevenlabs\.io/)
  assert.doesNotMatch(openAiClient, /OPENAI_API_KEY/)
  assert.doesNotMatch(narratorClient, /ELEVENLABS_API_KEY/)
})
