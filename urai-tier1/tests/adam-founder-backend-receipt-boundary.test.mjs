import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
const backend = readFileSync(new URL('../../apps/functions/src/adamPresenceFunctions.ts', import.meta.url),'utf8')
const runtime = readFileSync(new URL('../src/spatial/adam/AdamPresenceRuntime.tsx', import.meta.url),'utf8')
const client = readFileSync(new URL('../src/spatial/adam/adamClient.ts', import.meta.url),'utf8')
const runner = readFileSync(new URL('../scripts/run-unit-contract-tests-compact.mjs', import.meta.url),'utf8')
const voiceStart = backend.indexOf('export const adamFounderVoiceProvider')
assert.ok(voiceStart > 0, 'must test actual original Founder endpoint')
const voice = backend.slice(voiceStart)

test('authenticated Founder endpoint rejects before rate limit, spend and provider output',()=>{
  const auth = voice.indexOf('uid = await authenticatedUid(request)')
  const issuer = voice.indexOf('const issuance = founderVoiceIssuerReadiness()')
  const refusal = voice.indexOf("throw new ProviderError(409, issuance.code, issuance.message)")
  const rate = voice.indexOf("await consumeRateLimit(uid, 'elevenlabs'")
  const spend = voice.indexOf('await paidSpatialFetch(')
  assert.ok(auth >= 0 && issuer > auth && refusal > issuer && rate > refusal && spend > rate,
    'Trusted issuer must deny before any paid synthesis or publication')
})
test('text conversation does not depend on Founder voice authorization',()=>{
  const conversation = backend.slice(0,voiceStart)
  assert.ok(conversation.includes('export const adamPresenceProvider'))
  assert.equal(conversation.includes('founderVoiceIssuerReadiness()'),false)
})
test('unconfigured runtime never calls voice provider or direct audio.play()',()=>{
  assert.match(runtime,/createAdamFounderVoicePlaybackBridge\(\)/)
  assert.match(runtime,/if \(!founderVoiceBridge\.current\?\.ready\(\)\)\s*\{/)
  assert.doesNotMatch(runtime,/\baudio\.play\s*\(/)
  assert.match(client,/playbackEvidence\?: null/)
})
test('typed issuer refusal remains a text-only user status',()=>{
  assert.match(runtime,/FOUNDER_PLAYBACK_AUTHORITY_NOT_READY/)
  assert.match(runtime,/Adam text is live/)
  assert.match(client,/response\.ok/)
})
test('both new Founder receipt suites are included in the compact runner',()=>{
  assert.equal((runner.match(/tests\/adam-founder-server-receipt-contract\.test\.mjs/g)||[]).length,1)
  assert.equal((runner.match(/tests\/adam-founder-backend-receipt-boundary\.test\.mjs/g)||[]).length,1)
  assert.match(runner,/tests\/adam-founder-voice-playback-bridge\.test\.mjs/)
  assert.match(runner,/tests\/digital-human-founder-playback-gate\.test\.mjs/)
})
