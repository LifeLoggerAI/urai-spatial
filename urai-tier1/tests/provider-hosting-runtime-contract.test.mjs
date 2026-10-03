import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const firebaseConfig = JSON.parse(fs.readFileSync(new URL('../../firebase.json', import.meta.url), 'utf8'))
const functionsIndex = fs.readFileSync(new URL('../../apps/functions/src/index.ts', import.meta.url), 'utf8')
const providerFunctions = fs.readFileSync(new URL('../../apps/functions/src/providerFunctions.ts', import.meta.url), 'utf8')
const adamFunctions = fs.readFileSync(new URL('../../apps/functions/src/adamPresenceFunctions.ts', import.meta.url), 'utf8')
const adamClient = fs.readFileSync(new URL('../src/spatial/adam/adamClient.ts', import.meta.url), 'utf8')
const googleFunctions = fs.readFileSync(new URL('../../apps/functions/src/googleWorkspaceOAuth.ts', import.meta.url), 'utf8')
const apiUrlHelper = fs.readFileSync(new URL('../src/lib/clientApiUrl.ts', import.meta.url), 'utf8')
const settingsClient = fs.readFileSync(new URL('../src/app/settings/DeviceSettingsClient.tsx', import.meta.url), 'utf8')
const audioClient = fs.readFileSync(new URL('../src/spatial/audio/useAudioController.ts', import.meta.url), 'utf8')
const openAiClient = fs.readFileSync(new URL('../src/spatial/orb/openaiClient.ts', import.meta.url), 'utf8')
const narratorClient = fs.readFileSync(new URL('../src/spatial/narrator/elevenlabsClient.ts', import.meta.url), 'utf8')
const staticProviderRoutes = [
  new URL('../src/app/api/google/oauth/start/route.ts', import.meta.url),
  new URL('../src/app/api/google/oauth/callback/route.ts', import.meta.url),
  new URL('../src/app/api/google/oauth/status/route.ts', import.meta.url),
  new URL('../src/app/api/google/oauth/disconnect/route.ts', import.meta.url),
  new URL('../src/app/api/urai/orb/openai/route.ts', import.meta.url),
  new URL('../src/app/api/urai/narrator/elevenlabs/route.ts', import.meta.url),
  new URL('../src/app/api/voice/elevenlabs/route.ts', import.meta.url),
  new URL('../src/app/api/urai/adam/conversation/route.ts', import.meta.url),
  new URL('../src/app/api/urai/adam/voice/route.ts', import.meta.url),
  new URL('../src/app/api/urai/council/anthropic/route.ts', import.meta.url),
  new URL('../src/app/api/urai/council/gemini/route.ts', import.meta.url),
  new URL('../src/app/api/urai/council/xai/route.ts', import.meta.url),
  new URL('../src/app/api/urai/council/mistral/route.ts', import.meta.url),
]

test('static Hosting rewrites every live provider URL to secret-bound Firebase Functions', () => {
  assert.deepEqual(firebaseConfig.hosting.rewrites, [
    { source: '/api/google/oauth/start', function: { functionId: 'googleOAuthStart', region: 'us-central1' } },
    { source: '/api/google/oauth/callback', function: { functionId: 'googleOAuthCallback', region: 'us-central1' } },
    { source: '/api/google/oauth/status', function: { functionId: 'googleOAuthStatus', region: 'us-central1' } },
    { source: '/api/google/oauth/disconnect', function: { functionId: 'googleOAuthDisconnect', region: 'us-central1' } },
    { source: '/api/urai/orb/openai', function: { functionId: 'openAiOrbProvider', region: 'us-central1' } },
    { source: '/api/urai/narrator/elevenlabs', function: { functionId: 'elevenLabsVoiceProvider', region: 'us-central1' } },
    { source: '/api/voice/elevenlabs', function: { functionId: 'elevenLabsVoiceProvider', region: 'us-central1' } },
    { source: '/api/urai/adam/conversation', function: { functionId: 'adamPresenceProvider', region: 'us-central1' } },
    { source: '/api/urai/adam/voice', function: { functionId: 'adamFounderVoiceProvider', region: 'us-central1' } },
    { source: '/api/urai/council/anthropic', function: { functionId: 'anthropicCouncilProvider', region: 'us-central1' } },
    { source: '/api/urai/council/gemini', function: { functionId: 'geminiCouncilProvider', region: 'us-central1' } },
    { source: '/api/urai/council/xai', function: { functionId: 'xaiCouncilProvider', region: 'us-central1' } },
    { source: '/api/urai/council/mistral', function: { functionId: 'mistralCouncilProvider', region: 'us-central1' } },
  ])
  assert.match(functionsIndex, /elevenLabsVoiceProvider, openAiOrbProvider/)
  assert.match(functionsIndex, /adamFounderVoiceProvider, adamPresenceProvider/)
  for (const handler of ['anthropicCouncilProvider', 'geminiCouncilProvider', 'mistralCouncilProvider', 'xaiCouncilProvider']) {
    assert.match(functionsIndex, new RegExp(`\\b${handler}\\b`))
  }
  for (const handler of ['googleOAuthCallback', 'googleOAuthDisconnect', 'googleOAuthStart', 'googleOAuthStatus']) {
    assert.match(functionsIndex, new RegExp(`\\b${handler}\\b`))
  }
})

test('provider functions bind secrets, auth, consent, throttling, privacy and cancellation', () => {
  assert.match(providerFunctions, /defineSecret\('OPENAI_API_KEY'\)/)
  assert.match(providerFunctions, /defineSecret\('ELEVENLABS_API_KEY'\)/)
  assert.match(providerFunctions, /secrets: \[OPENAI_API_KEY\]/)
  assert.match(providerFunctions, /secrets: \[ELEVENLABS_API_KEY\]/)
  assert.match(providerFunctions, /WEB_CLIENT_ORIGINS = \['https:\/\/urai\.app', 'https:\/\/www\.urai\.app', \/\^https:\\\/\\\/localhost/)
  assert.equal((providerFunctions.match(/cors: WEB_CLIENT_ORIGINS/g) ?? []).length, 2)
  assert.match(googleFunctions, /WEB_CLIENT_ORIGINS = \['https:\/\/urai\.app', 'https:\/\/www\.urai\.app', \/\^https:\\\/\\\/localhost/)
  assert.equal((googleFunctions.match(/cors: WEB_CLIENT_ORIGINS/g) ?? []).length, 3)
  assert.equal((googleFunctions.match(/cors: false/g) ?? []).length, 1)
  assert.match(providerFunctions, /verifyIdToken\([^,]+, true\)/)
  assert.match(providerFunctions, /privacyPolicy\/current/)
  assert.match(providerFunctions, /providerRateLimits/)
  assert.match(providerFunctions, /store: false/)
  assert.match(providerFunctions, /request\.on\('close', \(\) => controller\.abort\(\)\)/)
  assert.match(providerFunctions, /private, no-store, max-age=0/)
  assert.doesNotMatch(providerFunctions, /console\.(log|info|warn|error)\([^)]*(message|text|context)/)
  assert.match(adamFunctions, /verifyIdToken\([^,]+, true\)/)
  assert.match(adamFunctions, /privacyPolicy\/current/)
  assert.match(adamFunctions, /providerRateLimits/)
  assert.match(adamFunctions, /store: false/)
  assert.match(adamFunctions, /ADAM_PRESENCE_ENABLED/)
  assert.match(adamFunctions, /FOUNDER_VOICE_ENABLED/)
  assert.match(adamFunctions, /FOUNDER_ELEVENLABS_VOICE_ID/)
  assert.doesNotMatch(adamFunctions, /NEXT_PUBLIC_(OPENAI|ELEVENLABS)/)
})

test('browser and native clients resolve provider APIs through the governed hosted origin', () => {
  assert.match(apiUrlHelper, /NEXT_PUBLIC_URAI_API_ORIGIN/)
  assert.match(apiUrlHelper, /candidate\.protocol !== 'https:'/)
  assert.match(apiUrlHelper, /path\.startsWith\('\/api\/'\)/)
  assert.match(openAiClient, /fetch\(clientApiUrl\('\/api\/urai\/orb\/openai'\)/)
  assert.match(narratorClient, /fetch\(clientApiUrl\("\/api\/urai\/narrator\/elevenlabs"\)/)
  assert.match(settingsClient, /fetch\(clientApiUrl\(path\)/)
  assert.match(audioClient, /fetch\(clientApiUrl\("\/api\/voice\/elevenlabs"\)/)
  assert.match(adamClient, /clientApiUrl\('\/api\/urai\/adam\/conversation'\)/)
  assert.match(adamClient, /clientApiUrl\('\/api\/urai\/adam\/voice'\)/)
  for (const route of staticProviderRoutes) assert.equal(fs.existsSync(route), false)
})