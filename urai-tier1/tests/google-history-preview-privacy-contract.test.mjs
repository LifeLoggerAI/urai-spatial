import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const source = fs.readFileSync(new URL('../../apps/functions/src/googleWorkspaceOAuth.ts', import.meta.url), 'utf8')
const functionsIndex = fs.readFileSync(new URL('../../apps/functions/src/index.ts', import.meta.url), 'utf8')
const firebaseConfig = JSON.parse(fs.readFileSync(new URL('../../firebase.json', import.meta.url), 'utf8'))

test('history preview requires explicit confirmation and bounded category/window input', () => {
  assert.match(source, /PREVIEW_CONFIRMATION_REQUIRED/)
  assert.match(source, /confirmPreview !== true/)
  assert.match(source, /historyDays < 30 \|\| historyDays > 3650/)
  for (const category of ['gmail', 'calendar', 'contacts', 'drive-selected']) {
    assert.match(source, new RegExp(`['"]${category}['"]`))
  }
})

test('history preview fetches aggregate or id-only provider data and never Gmail content', () => {
  assert.match(source, /gmail\.googleapis\.com\/gmail\/v1\/users\/me\/messages/)
  assert.match(source, /resultSizeEstimate/)
  assert.doesNotMatch(source, /gmail\/v1\/users\/me\/messages\/\$\{/)
  assert.doesNotMatch(source, /format['"]?,\s*['"]?full/)
  assert.match(source, /fields', 'nextPageToken,items\(id\)'/)
  assert.match(source, /personFields', 'metadata'/)
  assert.match(source, /fields', 'nextPageToken,files\(id\),incompleteSearch'/)
})

test('preview receipt keeps raw persistence and downstream admission off', () => {
  assert.match(source, /persistedRawItems:\s*0/)
  assert.match(source, /admittedToMemory:\s*false/)
  assert.match(source, /admittedToModels:\s*false/)
  assert.match(source, /memoryAdmissionAllowed:\s*false/)
  assert.match(source, /rawContentPersisted:\s*false/)
  assert.match(source, /Explicit import and downstream memory\/media use consent are still required\./)
})

test('preview is authenticated, secret-bound, revocation-aware and routed through Hosting', () => {
  assert.match(source, /const uid = await authenticatedUid\(request\)/)
  assert.match(source, /processingAllowed['"]?\) === false|processingAllowed\) === false/)
  assert.match(source, /secrets: \[GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET, GOOGLE_OAUTH_TOKEN_ENCRYPTION_KEY\]/)
  assert.match(functionsIndex, /googleHistoricalContextPreview/)
  assert.ok(firebaseConfig.hosting.rewrites.some((entry) =>
    entry.source === '/api/google/import/preview' &&
    entry.function?.functionId === 'googleHistoricalContextPreview'
  ))
})
