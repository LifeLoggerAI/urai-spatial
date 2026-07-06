import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const receiptPath = new URL('../src/data/currentReleaseReceipt.json', import.meta.url)
const statusPagePath = new URL('../src/app/status/page.tsx', import.meta.url)
const receipt = JSON.parse(fs.readFileSync(receiptPath, 'utf8'))
const statusPage = fs.readFileSync(statusPagePath, 'utf8')

const shaPattern = /^[0-9a-f]{40}$/
const requiredEvidenceKeys = [
  'staticGate',
  'buildGate',
  'browserGate',
  'deployedSmoke',
  'desktopVisualQa',
  'mobileVisualQa',
  'questDeviceProof',
  'rollbackSmoke',
]

test('release receipt identifies the canonical runtime without inventing evidence', () => {
  assert.equal(receipt.schemaVersion, '1.0.0')
  assert.equal(receipt.canonicalRepository, 'LifeLoggerAI/urai-spatial')
  assert.equal(receipt.canonicalRuntime, 'urai-tier1')
  assert.equal(receipt.canonicalBranch, 'main')
  assert.equal(receipt.firebaseProject, 'urai-4dc1d')
  assert.equal(receipt.publicDomain, 'https://urai.app')

  for (const field of ['sourceMainShaAtAudit', 'testedSha', 'deployedSha', 'rollbackSha']) {
    const value = receipt[field]
    assert.ok(value === null || shaPattern.test(value), `${field} must be null or a full commit SHA`)
  }

  for (const key of requiredEvidenceKeys) {
    assert.equal(typeof receipt.evidence?.[key], 'string', `missing evidence state: ${key}`)
  }
})

test('production certification requires matching tested and deployed SHAs plus complete evidence', () => {
  if (receipt.releaseState !== 'production-certified') {
    assert.equal(receipt.routeSummary.productionCertified, 0)
    return
  }

  assert.match(receipt.testedSha, shaPattern)
  assert.match(receipt.deployedSha, shaPattern)
  assert.match(receipt.rollbackSha, shaPattern)
  assert.equal(receipt.testedSha, receipt.deployedSha)
  assert.ok(receipt.generatedAt)
  assert.ok(receipt.assetPackVersion)
  assert.ok(receipt.assetManifestSha256)
  assert.ok(receipt.routeSummary.productionCertified > 0)

  for (const key of requiredEvidenceKeys) {
    assert.equal(receipt.evidence[key], 'pass', `${key} must pass before production certification`)
  }
})

test('Status route renders from the receipt boundary', () => {
  assert.match(statusPage, /currentReleaseReceipt from '@\/data\/currentReleaseReceipt\.json'/)
  assert.match(statusPage, /data-production-certification=\{currentReleaseReceipt\.releaseState/)
  assert.match(statusPage, /Tested SHA/)
  assert.match(statusPage, /Deployed SHA/)
  assert.match(statusPage, /Rollback SHA/)
  assert.match(statusPage, /Blank SHA fields mean the evidence has not been established/)
})
