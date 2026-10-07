import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const source = fs.readFileSync(new URL('../../apps/functions/src/lifeModelFunctions.ts', import.meta.url), 'utf8')
const authority = fs.readFileSync(new URL('../../apps/functions/src/personPresenceAuthority.ts', import.meta.url), 'utf8')
const index = fs.readFileSync(new URL('../../apps/functions/src/index.ts', import.meta.url), 'utf8')

test('Life Model mutations are owner-bound and server authoritative', () => {
  assert.match(source, /context\.auth\?\.uid/)
  assert.match(source, /users\/\$\{uid\}\/lifeEntities/)
  assert.match(source, /users\/\$\{uid\}\/lifeClaims/)
  assert.match(source, /users\/\$\{uid\}\/personModelBundles/)
  assert.match(index, /compilePersonModelBundle/)
})

test('historical claim ingestion blocks synthetic content', () => {
  assert.match(source, /SYNTHETIC_OUTPUT_CANNOT_ENTER_HISTORICAL_CLAIMS/)
  assert.match(source, /SYNTHETIC_HISTORICAL_CLAIM_DETECTED/)
})

test('person model compilation requires enforced model and identity consent', () => {
  assert.match(source, /MODEL_CONTEXT_NOT_AUTHORIZED/)
  assert.match(source, /IDENTITY_MODEL_NOT_AUTHORIZED/)
  assert.match(source, /CONSENT_ENFORCEMENT_PENDING/)
})

test('corrections preserve history and invalidate derivatives', () => {
  assert.match(source, /lifeCorrections/)
  assert.match(source, /supersededByCorrectionId/)
  assert.match(source, /invalidateLifeModelDependencies\(db, uid, dependencyId, reasonId, revoked/)
  assert.match(authority, /personModelBundles','sceneTruthPackets','renderManifests/)
  assert.match(authority, /simulationSessions','personRenderBindings/)
  assert.match(authority, /invalidatedAt/)
})

test('entity revocation propagates a revoked derivative state', () => {
  assert.match(source, /revokeLifeEntity/)
  assert.match(authority, /revoked \? 'revoked' : 'invalidated'/)
})


test('corrections create a new accepted testimony claim instead of deleting truth', () => {
  assert.match(source, /replacementClaimId/)
  assert.match(source, /DIRECT_SUBJECT_TESTIMONY/)
  assert.match(source, /ATTRIBUTED_TESTIMONY/)
  assert.match(source, /correctsClaimId: targetClaimId/)
  assert.match(source, /status: 'accepted'/)
  assert.match(source, /supersededByClaimId: replacementClaimId/)
  assert.match(source, /synthetic: false/)
})
