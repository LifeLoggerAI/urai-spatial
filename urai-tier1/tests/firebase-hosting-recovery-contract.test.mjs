import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  discoverCurrentLiveRelease,
  restoreDiscoveredVersion,
  verifyRestoredVersion,
} from '../../scripts/firebase-hosting-recovery.mjs'

const testDirectory = path.dirname(fileURLToPath(import.meta.url))
const repositoryRoot = path.resolve(testDirectory, '../..')
const source = readFileSync(path.join(repositoryRoot, 'scripts/firebase-hosting-recovery.mjs'), 'utf8')

test('all exported Hosting recovery operations fail closed', async () => {
  await assert.rejects(discoverCurrentLiveRelease(), /Firebase Hosting recovery is NO-GO/)
  await assert.rejects(restoreDiscoveredVersion(), /Firebase Hosting recovery is NO-GO/)
  await assert.rejects(verifyRestoredVersion(), /Firebase Hosting recovery is NO-GO/)
})

test('quarantined recovery contains no provider authentication or mutation path', () => {
  assert.match(source, /function refuseRecovery\(\)/)
  assert.match(source, /throw new Error\(quarantineMessage\)/)
  assert.match(source, /process\.exitCode = 1/)
  assert.doesNotMatch(source, /FIREBASE_|GOOGLE_APPLICATION_CREDENTIALS|credential\.cert\s*\(|createSign\s*\(|accessToken|fetch\s*\(|https?:\/\//)
  assert.doesNotMatch(source, /firebase(?:-tools)?(?:@[^\s]+)?\s+deploy|hosting\/releases|RESTORE_EXACT_HOSTING_VERSION/)
})
