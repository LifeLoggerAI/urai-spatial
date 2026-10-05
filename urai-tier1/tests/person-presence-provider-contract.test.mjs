import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const provider=fs.readFileSync(new URL('../../apps/functions/src/personPresenceProvider.ts',import.meta.url),'utf8')
const client=fs.readFileSync(new URL('../src/spatial/life-model/personPresenceClient.ts',import.meta.url),'utf8')
const firebase=fs.readFileSync(new URL('../../firebase.json',import.meta.url),'utf8')

test('generic Person Presence is bound to active canonical simulation sessions',()=>{
  assert.match(provider,/simulationSessions/)
  assert.match(provider,/personModelBundles/)
  assert.match(provider,/urai-life-model-v1/)
  assert.match(provider,/historicalSourceAuthority/)
  assert.match(provider,/PERSON_MODEL_STALE/)
})

test('provider sends only bounded accepted evidence and refuses invention',()=>{
  assert.match(provider,/MAX_EVIDENCE_CLAIMS = 40/)
  assert.match(provider,/MAX_EVIDENCE_CHARS = 14_000/)
  assert.match(provider,/claim\.get\('synthetic'\) === true/)
  assert.match(provider,/If evidence does not answer the question/)
  assert.match(provider,/Do not invent memories/)
  assert.match(provider,/store: false/)
})

test('historical mode carries compiled knowledge cutoff and simulation never becomes testimony',()=>{
  assert.match(provider,/Historical knowledge cutoff/)
  assert.match(provider,/Generated dialogue is simulation and can never become historical testimony/)
  assert.match(provider,/syntheticOutputMayBecomeHistoricalSource:false/)
})

test('rejected Firebase person-presence tokens remain authentication failures',()=>{
  assert.match(provider,/try \{[\s\S]*verifyIdToken\(bearerToken\(request\.headers\.authorization\), true\)[\s\S]*catch \(error\)/)
  assert.match(provider,/throw new PresenceError\(401, 'UNAUTHORIZED', 'Authentication is required\.'\)/)
})

test('client route is private no-store streaming and checks returned truth boundary',()=>{
  assert.match(firebase,/\/api\/urai\/person-presence\/conversation/)
  assert.match(client,/cache:'no-store'/)
  assert.match(client,/historicalSourceAuthority!==false/)
  assert.match(client,/syntheticOutputMayBecomeHistoricalSource!==false/)
})
