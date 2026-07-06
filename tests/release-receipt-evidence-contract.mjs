import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const materializer = readFileSync('scripts/materialize-release-receipt.mjs', 'utf8')
const validator = readFileSync('scripts/check-release-receipt.mjs', 'utf8')
const runtimeContract = readFileSync('urai-tier1/src/lib/release-evidence.ts', 'utf8')
const receipt = JSON.parse(readFileSync('urai-tier1/src/data/release-receipt.json', 'utf8'))

const requiredEvidenceNames = [
  'canonicalContract',
  'routeContract',
  'runtimeCompile',
  'runtimeSmoke',
  'productTypecheck',
  'productBuild',
  'browserFlow',
  'mobileFlow',
  'accessibility',
  'customDomain',
  'rollback',
]

const expectedAssetContract = {
  v1: 53,
  v2: 80,
  v3: 14,
  v4: 39,
  v5: 27,
}

test('release receipt template fails closed before evidence exists', () => {
  assert.deepEqual(receipt.evidenceArtifacts, {})
  assert.equal(receipt.candidateSha, null)
  assert.equal(receipt.testedSha, null)
  assert.equal(receipt.deployedSha, null)
  assert.equal(receipt.rollbackSha, null)
  assert.equal(receipt.routes.some((route) => route.productionState === 'verified'), false)
  for (const [version, expected] of Object.entries(expectedAssetContract)) {
    assert.equal(receipt.assetContract[version], expected)
  }
})

test('materializer requires files and hashes them instead of trusting boolean flags', () => {
  assert.match(materializer, /requireEvidenceFile/)
  assert.match(materializer, /sha256File/)
  assert.match(materializer, /evidenceArtifacts\[checkName\]/)
  assert.doesNotMatch(materializer, /URAI_RELEASE_BROWSER_VERIFIED/)
  assert.doesNotMatch(materializer, /evidencePassed/)
  for (const name of requiredEvidenceNames) {
    assert.match(materializer, new RegExp(name))
  }
})

test('runtime and repository validators enforce the same fail-closed certification boundary', () => {
  assert.match(runtimeContract, /evidenceArtifacts: Record<string, EvidenceArtifact>/)
  assert.match(runtimeContract, /requiredCoreEvidenceArtifacts/)
  assert.match(runtimeContract, /requiredReleaseEvidenceArtifacts/)
  assert.match(runtimeContract, /candidateSha === receipt\.testedSha/)
  assert.match(runtimeContract, /testedSha === receipt\.deployedSha/)
  assert.match(runtimeContract, /allRoutesVerified !== certificationFieldsComplete/)
  assert.match(runtimeContract, /isSha256/)

  assert.match(validator, /requiredCoreArtifacts/)
  assert.match(validator, /requiredCertificationArtifacts/)
  assert.match(validator, /candidateSha !== receipt\.deployedSha/)
  assert.match(validator, /testedSha !== receipt\.deployedSha/)
  assert.match(validator, /allRoutesVerified !== certificationFieldsComplete/)
  assert.match(validator, /hasArtifacts/)
  assert.match(validator, /SHA-256 digest/)
})
