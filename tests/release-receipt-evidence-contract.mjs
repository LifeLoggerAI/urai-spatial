import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
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

const requiredCheckNames = [
  'canonicalContract',
  'runtimeCompile',
  'runtimeSmoke',
  'productTypecheck',
  'productBuild',
  'browserFlow',
  'mobileFlow',
  'accessibility',
  'customDomain',
  'rollback',
  'physicalXr',
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
  for (const name of requiredCheckNames) {
    assert.ok(name in receipt.checks, `template is missing required check ${name}`)
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
  assert.match(runtimeContract, /requiredNonXrChecks/)
  assert.match(runtimeContract, /requiredCheckNames/)
  assert.match(runtimeContract, /candidateSha === receipt\.testedSha/)
  assert.match(runtimeContract, /testedSha === receipt\.deployedSha/)
  assert.match(runtimeContract, /allRoutesVerified !== certificationFieldsComplete/)
  assert.match(runtimeContract, /isSha256/)

  assert.match(validator, /requiredCoreArtifacts/)
  assert.match(validator, /requiredCertificationArtifacts/)
  assert.match(validator, /requiredNonXrChecks/)
  assert.match(validator, /requiredCheckNames/)
  assert.match(validator, /candidateSha !== receipt\.deployedSha/)
  assert.match(validator, /testedSha !== receipt\.deployedSha/)
  assert.match(validator, /allRoutesVerified !== certificationFieldsComplete/)
  assert.match(validator, /hasArtifacts/)
  assert.match(validator, /SHA-256 digest/)
})

test('validator rejects a receipt that omits a required check', () => {
  const temp = mkdtempSync(join(tmpdir(), 'urai-release-receipt-'))
  try {
    const dataDir = join(temp, 'urai-tier1', 'src', 'data')
    mkdirSync(dataDir, { recursive: true })
    const mutated = structuredClone(receipt)
    delete mutated.checks.mobileFlow
    writeFileSync(
      join(dataDir, 'release-receipt.json'),
      JSON.stringify(mutated, null, 2),
    )

    const result = spawnSync(
      process.execPath,
      [resolve('scripts/check-release-receipt.mjs')],
      { cwd: temp, encoding: 'utf8' },
    )
    assert.notEqual(result.status, 0)
    assert.match(result.stderr, /missing required check mobileFlow/)
  } finally {
    rmSync(temp, { recursive: true, force: true })
  }
})
