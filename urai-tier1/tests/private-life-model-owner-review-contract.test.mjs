import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const source = fs.readFileSync(new URL('../../apps/functions/src/privateLifeModelReview.ts', import.meta.url), 'utf8')
const index = fs.readFileSync(new URL('../../apps/functions/src/index.ts', import.meta.url), 'utf8')
const privacy = fs.readFileSync(new URL('../../apps/functions/src/privacyOperations.ts', import.meta.url), 'utf8')

test('private Life Model review requires exact owner, current revision and retained fixity', () => {
  assert.match(source, /context\.auth\?\.uid/)
  assert.match(source, /uraiPrivateLifeModel/)
  assert.match(source, /currentSnapshot\.get\('revision'\) !== revision/)
  assert.match(source, /currentSnapshot\.get\('checksum'\) !== checksum/)
  assert.match(source, /PRIVATE_LIFE_MODEL_REVISION_FIXITY_MISMATCH/)
  assert.match(source, /sha256\(canonicalJson\(retained\)\) !== checksum/)
})

test('private extraction is inert until explicit owner review and cannot silently promote evidence', () => {
  assert.match(source, /OWNER_REVIEW_REQUIRED/)
  assert.match(source, /importExecutable !== false/)
  assert.match(source, /historicalSourceAuthority !== false/)
  assert.match(source, /raw\.synthetic !== true/)
  assert.match(source, /raw\.evidenceClass !== 'UNKNOWN'/)
  assert.match(source, /decision\.evidenceClass !== proposed/)
  assert.match(source, /decision\.evidenceClass !== sourceEvidenceClass/)
  assert.match(source, /status: 'accepted'/)
  assert.match(source, /synthetic: false/)
})

test('conflicted private revisions fail closed and accepted relationships require reviewed endpoints', () => {
  assert.match(source, /revisionData\.backlogState !== 'QUARANTINED_OWNER_REVIEW'/)
  assert.match(source, /acceptedEntityIds\.has\(fromEntityId\)/)
  assert.match(source, /acceptedEntityIds\.has\(toEntityId\)/)
  assert.match(source, /EDGE_KINDS/)
})

test('owner review is idempotent, audited and covered by existing Life Model data rights', () => {
  assert.match(source, /lifeModelReceipts/)
  assert.match(source, /reviewDigest/)
  assert.match(source, /life_model\.private_index_owner_reviewed/)
  assert.match(index, /reviewPrivateLifeModelCandidate/)
  assert.match(privacy, /lifeModelReceipts/)
})
