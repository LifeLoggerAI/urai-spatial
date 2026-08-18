import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const firebaseConfig = JSON.parse(fs.readFileSync(new URL('../../firebase.json', import.meta.url), 'utf8'))
const firebasePreviewConfig = JSON.parse(fs.readFileSync(new URL('../../.github/firebase.preview.json', import.meta.url), 'utf8'))
const functionsIndex = fs.readFileSync(new URL('../../apps/functions/src/index.ts', import.meta.url), 'utf8')
const providerFunctions = fs.readFileSync(new URL('../../apps/functions/src/providerFunctions.ts', import.meta.url), 'utf8')
const openAiClient = fs.readFileSync(new URL('../src/spatial/orb/openaiClient.ts', import.meta.url), 'utf8')
const narratorClient = fs.readFileSync(new URL('../src/spatial/narrator/elevenlabsClient.ts', import.meta.url), 'utf8')
const staticProviderRoutes = [
  new URL('../src/app/api/urai/orb/openai/route.ts', import.meta.url),
  new URL('../src/app/api/urai/narrator/elevenlabs/route.ts', import.meta.url),
  new URL('../src/app/api/voice/elevenlabs/route.ts', import.meta.url),
]

const providerRewrites = [
  { source: '/api/urai/orb/openai', function: { functionId: 'openAiOrbProvider', region: 'us-central1' } },
  { source: '/api/urai/narrator/elevenlabs', function: { functionId: 'elevenLabsVoiceProvider', region: 'us-central1' } },
  { source: '/api/voice/elevenlabs', function: { functionId: 'elevenLabsVoiceProvider', region: 'us-central1' } },
]

test('static Hosting rewrites every live provider URL to secret-bound Firebase Functions', () => {
  assert.deepEqual(firebaseConfig.hosting.rewrites, providerRewrites)
  assert.match(functionsIndex, /elevenLabsVoiceProvider, openAiOrbProvider/)
})

test('governed Firebase preview preserves the same provider routing contract', () => {
  assert.deepEqual(firebasePreviewConfig.hosting.rewrites, providerRewrites)
  assert.equal(firebasePreviewConfig.hosting.public, 'urai-tier1/out')
})

test('provider functions bind secrets, auth, consent, throttling, privacy and cancellation', () => {
  assert.match(providerFunctions, /defineSecret\('OPENAI_API_KEY'\)/)
  assert.match(providerFunctions, /defineSecret\('ELEVENLABS_API_KEY'\)/)
  assert.match(providerFunctions, /secrets: \[OPENAI_API_KEY\]/)
  assert.match(providerFunctions, /secrets: \[ELEVENLABS_API_KEY\]/)
  assert.equal((providerFunctions.match(/cors: false/g) ?? []).length, 2)
  assert.match(providerFunctions, /verifyIdToken\([^,]+, true\)/)
  assert.match(providerFunctions, /privacyPolicy\/current/)
  assert.match(providerFunctions, /providerRateLimits/)
  assert.match(providerFunctions, /store: false/)
  assert.match(providerFunctions, /request\.on\('close', \(\) => controller\.abort\(\)\)/)
  assert.match(providerFunctions, /private, no-store, max-age=0/)
  assert.doesNotMatch(providerFunctions, /console\.(log|info|warn|error)\([^)]*(message|text|context)/)
})

test('browser clients are same-origin and no static route can shadow provider rewrites', () => {
  assert.match(openAiClient, /fetch\('\/api\/urai\/orb\/openai'/)
  assert.match(narratorClient, /fetch\("\/api\/urai\/narrator\/elevenlabs"/)
  for (const route of staticProviderRoutes) assert.equal(fs.existsSync(route), false)
})
