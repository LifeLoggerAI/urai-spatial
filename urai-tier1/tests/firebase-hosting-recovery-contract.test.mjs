import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  assertSiteId,
  assertVersionName,
  selectCurrentLiveRelease,
} from '../../scripts/firebase-hosting-recovery.mjs'

const testDirectory = path.dirname(fileURLToPath(import.meta.url))
const repositoryRoot = path.resolve(testDirectory, '../..')
const source = readFileSync(path.join(repositoryRoot, 'scripts/firebase-hosting-recovery.mjs'), 'utf8')

test('selects the newest default live release and ignores preview channels and disabled releases', () => {
  const selected = selectCurrentLiveRelease([
    {
      name: 'sites/urai-4dc1d/channels/preview/releases/newer-preview',
      version: { name: 'sites/urai-4dc1d/versions/preview-v2' },
      releaseTime: 'not-a-time',
      type: 'DEPLOY',
    },
    {
      name: 'sites/urai-4dc1d/releases/disabled',
      version: { name: 'sites/urai-4dc1d/versions/disabled-v1' },
      releaseTime: 'not-a-time',
      type: 'SITE_DISABLE',
    },
    {
      name: 'sites/urai-4dc1d/releases/older-live',
      version: { name: 'malformed-but-not-selected' },
      releaseTime: '2026-07-14T16:00:00Z',
      type: 'DEPLOY',
    },
    {
      name: 'sites/urai-4dc1d/releases/current-live',
      version: { name: 'sites/urai-4dc1d/versions/live-v2' },
      releaseTime: '2026-07-14T17:00:00Z',
      type: 'ROLLBACK',
    },
  ])
  assert.equal(selected.name, 'sites/urai-4dc1d/releases/current-live')
  assert.equal(selected.versionName, 'sites/urai-4dc1d/versions/live-v2')
})

test('fails closed when any active default live release has an invalid release time', () => {
  assert.throws(() => selectCurrentLiveRelease([
    {
      name: 'sites/urai-4dc1d/releases/current-live',
      version: { name: 'sites/urai-4dc1d/versions/live-v2' },
      releaseTime: '',
      type: 'DEPLOY',
    },
    {
      name: 'sites/urai-4dc1d/releases/older-live',
      version: { name: 'sites/urai-4dc1d/versions/live-v1' },
      releaseTime: '2026-07-14T16:00:00Z',
      type: 'DEPLOY',
    },
  ]), /Invalid releaseTime for live Firebase Hosting release/)
})

test('rejects cross-site or malformed selected recovery identities', () => {
  assert.equal(assertSiteId('urai-4dc1d'), 'urai-4dc1d')
  assert.throws(() => assertSiteId('another-site'), /expected urai-4dc1d/)
  assert.equal(assertVersionName('sites/urai-4dc1d/versions/live-v1'), 'sites/urai-4dc1d/versions/live-v1')
  assert.throws(() => assertVersionName('sites/another-site/versions/live-v1'), /Invalid Firebase Hosting version name/)
  assert.throws(() => assertVersionName('sites/urai-4dc1d/channels/test/versions/live-v1'), /Invalid Firebase Hosting version name/)
  assert.throws(() => selectCurrentLiveRelease([{
    name: 'sites/urai-4dc1d/releases/current-live',
    version: { name: 'malformed-current-version' },
    releaseTime: '2026-07-14T17:00:00Z',
    type: 'DEPLOY',
  }]), /Invalid Firebase Hosting version name/)
})

test('uses the official Hosting endpoints and confines recovery receipts', () => {
  assert.match(source, /firebasehosting\.googleapis\.com\/v1beta1/)
  assert.match(source, /sites\/\$\{siteId\}\/releases/)
  assert.match(source, /url\.searchParams\.set\('versionName', versionName\)/)
  assert.match(source, /RESTORE_EXACT_HOSTING_VERSION/)
  assert.match(source, /mkdirSync\(runnerTemp, \{ recursive: true \}\)/)
  assert.match(source, /Hosting recovery receipt must remain inside RUNNER_TEMP/)
  assert.doesNotMatch(source, /firebase deploy/)
})
