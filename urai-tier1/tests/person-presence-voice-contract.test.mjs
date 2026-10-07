import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const provider=fs.readFileSync(new URL('../../apps/functions/src/personPresenceVoiceProvider.ts',import.meta.url),'utf8')
const authority=fs.readFileSync(new URL('../../apps/functions/src/personPresenceAuthority.ts',import.meta.url),'utf8')
const client=fs.readFileSync(new URL('../src/spatial/life-model/personPresenceVoiceClient.ts',import.meta.url),'utf8')
const rules=fs.readFileSync(new URL('../../firebase/firestore.rules',import.meta.url),'utf8')

test('Person voice exists only for an accepted binding to the exact current person bundle',()=>{
  assert.match(provider,/requirePersonPresenceRenderBinding\(db,uid,authority,'voice'\)/)
  assert.match(authority,/personRenderBindings/)
  assert.match(authority,/binding\.get\('bundleId'\) !== authority\.bundleId/)
  assert.match(authority,/reviewState'\) !== 'ACCEPTED'/)
  assert.match(authority,/consentState'\) !== 'authorized'/)
  assert.match(authority,/sourceAuthorityHash'\) !== authority\.bundleHash/)
  assert.match(provider,/ACCEPTED_PERSON_VOICE_NOT_READY/)
})

test('voice likeness requires explicit identity likeness and provider consent',()=>{
  assert.match(provider,/identity\.likenessEnabled!==true/)
  assert.match(provider,/externalProcessingConsent===true/)
  assert.match(provider,/PROVIDER_PROCESSING_REVOKED/)
})

test('voice auth failures and provider spend are bounded before ElevenLabs',()=>{
  assert.match(provider,/try\{[\s\S]*verifyIdToken\(bearer\(request\.headers\.authorization\),true\)[\s\S]*catch\(error\)/)
  assert.match(provider,/throw new VoiceError\(401,'UNAUTHORIZED','Authentication is required\.'\)/)
  assert.match(provider,/providerRateLimits\/elevenlabs-person-presence/)
  assert.match(provider,/VOICE_RATE_WINDOW_MS=60_000/)
  assert.match(provider,/VOICE_RATE_LIMIT_MAX=10/)
  assert.match(provider,/throw new VoiceError\(429,'RATE_LIMITED'/)
  const limiterIndex=provider.indexOf('await consumeVoiceRateLimit(uid)')
  const fetchIndex=provider.indexOf("await paidSpatialFetch(db,uid,'person-voice','elevenlabs'")
  assert.match(provider,/import \{ paidSpatialFetch, SpatialSpendError, SPATIAL_SPEND_WORKER_TOKENS_JSON \} from '\.\/protectedProviderSpend'/)
  assert.match(provider,/secrets:\[ELEVENLABS_API_KEY,SPATIAL_SPEND_WORKER_TOKENS_JSON\]/)
  assert.ok(limiterIndex>-1&&fetchIndex>limiterIndex)
})

test('provider binding identifiers are not directly readable by the client',()=>{
  const start=rules.indexOf('match /personRenderBindings/{docId}')
  assert.notEqual(start,-1)
  assert.match(rules.slice(start,start+120),/allow read, write: if false;/)
})

test('voice client fails back to text when no accepted voice exists',()=>{
  assert.match(client,/PERSON_VOICE_UNAVAILABLE/)
  assert.match(client,/blob:null/)
  assert.match(client,/cache:'no-store'/)
})
