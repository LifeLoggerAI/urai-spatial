import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')
const page = read('src/app/status/page.tsx')
const authority = read('src/app/status/StatusReleaseAuthority.tsx')
const launchTruth = read('src/data/launchTruth.ts')

test('Status replaces stale production-pending copy with bounded verified-live truth', () => {
  assert.match(page, /StatusReleaseAuthority/)
  assert.match(page, /data-production-certification="verified-live-fingerprint"/)
  assert.match(page, /Production: verified live for the canonical Spatial web release/)
  assert.match(page, /Pending proof: physical Quest hardware/)
  assert.match(page, /Autonomous real-world actions are not enabled and remain human-approved only/)
  assert.match(page, /\['\/status', 'verified live'/)
  assert.match(page, /\['\/privacy-controls', 'verified live'/)
  assert.doesNotMatch(page, /Production certification remains pending/)
  assert.doesNotMatch(page, /pending-current-main-evidence/)
})

test('Only canonical production requests and validates the protected fingerprint', () => {
  assert.match(authority, /window\.location\.origin !== 'https:\/\/urai\.app'/)
  assert.match(authority, /setState\(\{ kind: 'preview' \}\)/)
  assert.match(authority, /fetch\(`\/release-fingerprint\.json\?status=\$\{Date\.now\(\)\}`/)
  assert.match(authority, /cache: 'no-store'/)
  assert.match(authority, /schemaVersion !== 'urai-release-fingerprint-1'/)
  assert.match(authority, /\['authoritySha', 'releaseSha', 'rollbackSha'\]/)
  assert.match(authority, /shaPattern\.test\(String\(item\[field\]/)
  assert.match(authority, /item\.releaseSha === item\.rollbackSha/)
  assert.match(authority, /item\.firebaseProject !== 'urai-4dc1d'/)
  assert.match(authority, /item\.liveUrl !== 'https:\/\/urai\.app'/)
  assert.match(authority, /does not request or substitute a live or candidate SHA/)
  assert.match(authority, /No candidate SHA is displayed while live authority is unresolved/)
  assert.match(authority, /role="alert"/)
})

test('Launch truth certifies web scope and preserves separate blocks', () => {
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
