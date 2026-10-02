import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const provider=fs.readFileSync(new URL('../../apps/functions/src/personPresenceVoiceProvider.ts',import.meta.url),'utf8')
const client=fs.readFileSync(new URL('../src/spatial/life-model/personPresenceVoiceClient.ts',import.meta.url),'utf8')
const rules=fs.readFileSync(new URL('../../firebase/firestore.rules',import.meta.url),'utf8')

test('Person voice exists only for an accepted binding to the exact current person bundle',()=>{
  assert.match(provider,/personRenderBindings/)
  assert.match(provider,/binding\.get\('bundleId'\)!==bundleId/)
  assert.match(provider,/reviewState'\)!=='ACCEPTED'/)
  assert.match(provider,/consentState'\)!=='authorized'/)
  assert.match(provider,/ACCEPTED_PERSON_VOICE_NOT_READY/)
})

test('voice likeness requires explicit identity likeness and provider consent',()=>{
  assert.match(provider,/identity\.likenessEnabled!==true/)
  assert.match(provider,/externalProcessingConsent===true/)
  assert.match(provider,/PROVIDER_PROCESSING_REVOKED/)
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
