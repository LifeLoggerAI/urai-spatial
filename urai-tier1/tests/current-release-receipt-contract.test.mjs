import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const receiptPath = new URL('../src/data/currentReleaseReceipt.json', import.meta.url)
const statusPath = new URL('../src/app/status/page.tsx', import.meta.url)

const receipt = JSON.parse(fs.readFileSync(receiptPath, 'utf8'))
const statusSource = fs.readFileSync(statusPath, 'utf8')

test('release receipt identifies canonical authority', () => {
  assert.equal(receipt.schemaVersion, '1.0.0')
  assert.equal(receipt.canonicalRepository, 'LifeLoggerAI/urai-spatial')
  assert.equal(receipt.canonicalRuntime, 'urai-tier1')
  assert.equal(receipt.canonicalBranch, 'main')
  assert.equal(receipt.firebaseProject, 'urai-4dc1d')
  assert.equal(receipt.publicDomain, 'https://urai.app')
  assert.match(receipt.sourceMainShaAtAudit, /^[0-9a-f]{40}$/)
})

test('pending release receipt cannot imply deployment evidence', () => {
  assert.equal(receipt.releaseState, 'pending-current-main-evidence')
  assert.equal(receipt.testedSha, null)
  assert.equal(receipt.deployedSha, null)
  assert.equal(receipt.rollbackSha, null)
  assert.equal(receipt.assetPackVersion, null)
  assert.equal(receipt.assetManifestSha256, null)
  for (const value of Object.values(receipt.evidence)) {
    assert.equal(value, 'pending')
  }
})

test('Status reads the receipt instead of hard-coding certification', () => {
  assert.match(statusSource, /currentReleaseReceipt/)
  assert.match(statusSource, /data-production-certification=\{currentReleaseReceipt\.releaseState/)
  assert.match(statusSource, /Deployed SHA/)
  assert.match(statusSource, /Rollback SHA/)
  assert.doesNotMatch(statusSource, /data-production-certification="(?:live|complete|certified)"/i)
})
