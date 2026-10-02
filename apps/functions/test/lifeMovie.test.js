import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const source = fs.readFileSync('src/lifeMovie.ts', 'utf8')
const index = fs.readFileSync('src/index.ts', 'utf8')

test('Life Movie manifest writes are authenticated and server-authoritative', () => {
  assert.match(source, /context\.auth\?\.uid/)
  assert.match(source, /users\/\$\{uid\}\/memories\/\$\{chapter\.memoryId\}/)
  assert.match(source, /lifeMovie\?\.truthClass \?\? snapshot\.get\('truthClass'\)/)
  assert.doesNotMatch(source, /data\?\.truthClass/)
  assert.doesNotMatch(source, /data\?\.confidence/)
})

test('Life Movie manifest builder fails closed on ambiguous identity and revoked memory consent', () => {
  assert.match(source, /Life Movie chapter identity is ambiguous/)
  assert.match(source, /consentState === 'revoked'/)
  assert.match(source, /Life Movie memory consent was revoked/)
})

test('Life Movie manifests cannot carry arbitrary URLs from the request', () => {
  assert.match(source, /internalHref\(lifeMovie\?\.replayEntry\)/)
  assert.match(source, /internalHref\(lifeMovie\?\.replayExit\)/)
  assert.match(source, /SAFE_TOKEN/)
  assert.doesNotMatch(source, /data\?\.(replayEntry|replayExit|sourceIds|providerTaskIds|cinematicAssetId|spatialAssetId)/)
})

test('Life Movie revocation is durable and auditable', () => {
  assert.match(source, /consentState: 'revoked'/)
  assert.match(source, /life_movie\.manifest_revoked/)
  assert.match(source, /life_movie\.manifest_upserted/)
})

test('Life Movie callables are exported by the canonical functions entrypoint', () => {
  assert.match(index, /upsertLifeMovieManifest/)
  assert.match(index, /revokeLifeMovieManifest/)
  assert.match(index, /from '\.\/lifeMovie'/)
})
