import assert from 'node:assert/strict'
import { test } from 'node:test'
import admin from 'firebase-admin'
import { requireMemoryDomainProcessingConsent } from '../src/memoryDomainConsentGuard.ts'
import { readFileSync } from 'node:fs'
import { randomBytes } from 'node:crypto'

const project = 'demo-urai-r1585-consent'
const uid = 'synthetic-' + randomBytes(8).toString('hex')
if (process.env.FIRESTORE_EMULATOR_HOST !== '127.0.0.1:40442') throw new Error('REFUSE_NONLOCAL_FIRESTORE')
if (!admin.apps.length) admin.initializeApp({ projectId:project })
const db=admin.firestore()
const ref=db.doc('users/'+uid+'/privacyPolicy/current')
const policy=(mode, enforcement='fully-enforced', ownerId=uid)=>({
  ownerId,
  domains:{memory:{mode}},
  enforcement:{state:enforcement},
})
test('trusted memory-domain processing is allowed only with current fully-enforced owner grant', async()=>{
  try{
    await assert.rejects(requireMemoryDomainProcessingConsent(db,uid), e=>e.code==='permission-denied')
    await ref.set(policy('granted'))
    await requireMemoryDomainProcessingConsent(db,uid)
    await ref.set(policy('limited'))
    await requireMemoryDomainProcessingConsent(db,uid)
    for(const [mode,state,owner] of [
      ['denied','fully-enforced',uid],
      ['paused','fully-enforced',uid],
      ['granted','pending',uid],
      ['granted','partially-enforced',uid],
      ['granted','failed',uid],
      ['granted','fully-enforced','different-synthetic-owner'],
    ]){
      await ref.set(policy(mode,state,owner))
      await assert.rejects(requireMemoryDomainProcessingConsent(db,uid),e=>e.code==='permission-denied',
        'policy must reject '+mode+'/'+state)
    }
    const movie=readFileSync('src/lifeMovie.ts','utf8')
    const model=readFileSync('src/lifeModelFunctions.ts','utf8')
    assert.match(movie,/upsertLifeMovieManifest = [\s\S]*?const uid = requireUid\(context\)\s*await requireMemoryDomainProcessingConsent\(db, uid\)/)
    assert.match(model,/getReplayLifeModelAuthority = [\s\S]*?const uid = requireUid\(context\)\s*await requireMemoryDomainProcessingConsent\(db, uid\)/)
  } finally {
    await ref.delete()
  }
})
