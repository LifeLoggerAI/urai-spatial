import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const source=fs.readFileSync(new URL('../../apps/functions/src/personPresenceFunctions.ts',import.meta.url),'utf8')

test('only a privileged asset promoter can bind a provider resource to a person state',()=>{
  assert.match(source,/uraiAssetPromoter/)
  assert.match(source,/ASSET_PROMOTER_AUTHORITY_REQUIRED/)
  assert.match(source,/reviewReceiptHash/)
  assert.match(source,/sourceAuthorityHash/)
  assert.match(source,/consentRefs/)
})

test('render binding promotion requires current person model and enforced likeness consent',()=>{
  assert.match(source,/bundle\.get\('state'\) !== 'current'/)
  assert.match(source,/identity\.likenessEnabled !== true/)
  assert.match(source,/IDENTITY_LIKENESS_NOT_AUTHORIZED/)
  assert.match(source,/reviewState: 'ACCEPTED'/)
})

test('owner can revoke a promoted render binding without deleting its audit history',()=>{
  assert.match(source,/revokePersonRenderBinding/)
  assert.match(source,/person_render_binding\.revoked/)
  assert.match(source,/state: 'revoked'/)
  assert.match(source,/consentState: 'revoked'/)
})
