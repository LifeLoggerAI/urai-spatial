import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')

const page = read('src/app/status/page.tsx')
const authority = read('src/app/status/StatusReleaseAuthority.tsx')
const launchTruth = read('src/data/launchTruth.ts')

test('Status renders verified live authority instead of stale production-pending copy', () => {
  assert.match(page, /StatusReleaseAuthority/)
  assert.match(page, /data-production-certification="verified-live-fingerprint"/)
  assert.match(page, /Production: verified live for the canonical Spatial web release/)
  assert.match(page, /Pending proof: physical Quest hardware/)
  assert.match(page, /\['\/status', 'verified live'/)
  assert.match(page, /\['\/privacy-controls', 'verified live'/)
  assert.doesNotMatch(page, /Production<\/span><strong[^>]*>Pending proof/)
  assert.doesNotMatch(page, /Production certification remains pending/)
  assert.doesNotMatch(page, /pending-current-main-evidence/)
})

test('Status reads and validates the protected public fingerprint without caching', () => {
  assert.match(authority, /fetch\(`\/release-fingerprint\.json\?status=\$\{Date\.now\(\)\}`/)
  assert.match(authority, /cache: 'no-store'/)
  assert.match(authority, /schemaVersion !== 'urai-release-fingerprint-1'/)
  assert.match(authority, /fullSha\.test\(String\(fingerprint\.authoritySha/)
  assert.match(authority, /fullSha\.test\(String\(fingerprint\.releaseSha/)
  assert.match(authority, /fullSha\.test\(String\(fingerprint\.rollbackSha/)
  assert.match(authority, /fingerprint\.releaseSha === fingerprint\.rollbackSha/)
  assert.match(authority, /firebaseProject !== 'urai-4dc1d'/)
  assert.match(authority, /liveUrl !== 'https:\/\/urai\.app'/)
  assert.match(authority, /No candidate SHA is displayed while live authority is unresolved/)
  assert.match(authority, /role="alert"/)
  assert.match(authority, /Live certification cannot be displayed/)
})

test('Launch truth certifies the web release while preserving separate blocked claims', () => {
  assert.match(launchTruth, /id: 'DEPLOY-SHA'[\s\S]*state: 'green'/)
  assert.match(launchTruth, /id: 'ROLLBACK-SHA'[\s\S]*state: 'green'/)
  assert.match(launchTruth, /id: 'STATUS-TRUTH'[\s\S]*state: 'green'/)
  assert.match(launchTruth, /path: '\/status'[\s\S]*state: 'certified-live'/)
  assert.match(launchTruth, /path: '\/privacy-controls'[\s\S]*state: 'certified-live'/)
  assert.match(launchTruth, /id: 'XR-DEVICE-PROOF'[\s\S]*state: 'blocked'/)
  assert.match(launchTruth, /path: '\/spatial\/ar-vr'[\s\S]*state: 'preview'/)
  assert.match(launchTruth, /supporting services retain separate gates/)
  assert.doesNotMatch(launchTruth, /Not yet recorded in an immutable deployment receipt/)
  assert.doesNotMatch(launchTruth, /No verified rollback target is recorded before deploy/)
})
