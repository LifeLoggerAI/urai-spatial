import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const providerFunctions = fs.readFileSync(new URL('../../apps/functions/src/providerFunctions.ts', import.meta.url), 'utf8')
const openAiClient = fs.readFileSync(new URL('../src/spatial/orb/openaiClient.ts', import.meta.url), 'utf8')
const orbPanel = fs.readFileSync(new URL('../src/spatial/orb/OrbConversationPanel.tsx', import.meta.url), 'utf8')
const narratorClient = fs.readFileSync(new URL('../src/spatial/narrator/elevenlabsClient.ts', import.meta.url), 'utf8')
const narratorPlayback = fs.readFileSync(new URL('../src/spatial/narrator/narratorPlayback.ts', import.meta.url), 'utf8')
const companion = fs.readFileSync(new URL('../src/spatial/world/PersistentWorldCompanion.tsx', import.meta.url), 'utf8')

test('OpenAI Orb is authenticated, moderated, non-stored, structured and cancellation-bounded', () => {
  assert.match(providerFunctions, /api\.openai\.com\/v1\/moderations/)
  assert.match(providerFunctions, /omni-moderation-latest/)
  assert.match(providerFunctions, /api\.openai\.com\/v1\/responses/)
  assert.match(providerFunctions, /store: false/)
  assert.match(providerFunctions, /stream: true/)
  assert.match(providerFunctions, /safety_identifier/)
  assert.match(providerFunctions, /type: 'json_schema'/)
  assert.match(providerFunctions, /strict: true/)
  assert.match(providerFunctions, /response\.output_text\.delta/)
  assert.match(providerFunctions, /Idempotency-Key/)
})

test('Orb UI keeps external consent off and exposes text, stop, mute and replay', () => {
  assert.match(openAiClient, /getAuth\(app\)\.currentUser/)
  assert.match(openAiClient, /Authorization/)
  assert.match(openAiClient, /deterministicOrbFallback/)
  assert.equal((orbPanel.match(/useState\(false\)/g) ?? []).length >= 2, true)
  assert.match(orbPanel, /Allow this message and bounded recent context to be processed by OpenAI/)
  assert.match(orbPanel, /role="status"/)
  assert.match(orbPanel, /aria-live="polite"/)
  assert.match(orbPanel, />Stop</)
  assert.match(orbPanel, /Voice muted/)
  assert.match(orbPanel, /Replay/)
  assert.match(companion, /<OrbConversationPanel \/>/)
})

test('ElevenLabs is rights-bound, duration-bounded, single-attempt and session-consented', () => {
  assert.match(providerFunctions, /ELEVENLABS_ALLOWED_VOICE_IDS/)
  assert.match(providerFunctions, /VOICE_NOT_AUTHORIZED/)
  assert.match(providerFunctions, /Math\.ceil\(text\.length \/ 14\) > 120/)
  assert.match(providerFunctions, /text-to-speech\/\$\{encodeURIComponent\(voiceId\)\}\/stream/)
  assert.match(providerFunctions, /enable_logging/)
  assert.doesNotMatch(narratorClient, /for \(let attempt/)
  assert.match(narratorClient, /MAX_MEMORY_CACHE_ENTRIES = 12/)
  assert.match(narratorPlayback, /private externalVoiceConsent = false/)
  assert.match(narratorPlayback, /setExternalVoiceConsent/)
})
