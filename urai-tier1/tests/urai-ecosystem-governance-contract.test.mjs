import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const root = path.resolve(import.meta.dirname, '..', '..')
const registryPath = path.join(root, 'governance', 'urai-ecosystem-governance.json')
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8')
const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const expected = {
  main: '2c22eb8256425cce242ff61d3a2c732d492e3c5e',
  mirrorHead: 'fdf9c268f8c3425acbd8d923c6e1d53a3863e04a',
  mirrorMerge: '81bc0694bbad8abe02de9e34b3fac6b6277ade8c',
  geographyHead: '0ae5da483c05863e5b0838b0b384edfce20cf555',
  geographyMerge: '2c22eb8256425cce242ff61d3a2c732d492e3c5e',
}

const requiredDocs = [
  'RUAI_ACCESS_AND_DATA_GOVERNANCE.md',
  'ORGANIZATIONAL_OPERATING_BOUNDARIES.md',
  'IP_CHAIN_OF_TITLE_READINESS.md',
  'ECONOMIC_PARTICIPATION_BOUNDARIES.md',
]

test('registry binds the merged Mirror and geography chain', () => {
  const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'))
  assert.equal(registry.schemaVersion, 'urai-ecosystem-governance-2')
  assert.equal(registry.status, 'post-geography-governance-candidate')
  assert.equal(registry.stackedBaseCommit, expected.main)
  assert.equal(registry.currentMainAtRebuild, expected.main)

  const mirror = registry.dependencies.embodiedMirror
  assert.equal(mirror.pullRequest, 1026)
  assert.equal(mirror.exactHead, expected.mirrorHead)
  assert.equal(mirror.mergeCommit, expected.mirrorMerge)
  assert.equal(mirror.exactHeadWorkflowCount, 28)
  assert.equal(mirror.browserCaseCount, 13)
  assert.equal(mirror.mergedIntoMain, true)

  const geography = registry.dependencies.consentGatedGeography
  assert.equal(geography.pullRequest, 1034)
  assert.equal(geography.supersededPullRequest, 1027)
  assert.equal(geography.exactHead, expected.geographyHead)
  assert.equal(geography.mergeCommit, expected.geographyMerge)
  assert.equal(geography.registeredWorkflowCount, 25)
  assert.equal(geography.completedSuccessfulWorkflowCountAtAudit, 23)
  assert.equal(geography.pendingWorkflowCountAtAudit, 2)
  assert.equal(geography.mergedIntoMain, true)
  assert.equal(registry.productionAuthorityIssue, 999)
  assert.equal(registry.productionMutation, false)
})

test('RuAi and economic programs remain fail-closed', () => {
  const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'))
  for (const key of ['explicitUserConsent','purposeLimitation','leastPrivilegeRoles','tenantIsolation','auditLogRequired','revocationRequired','deletionPropagationRequired','reidentificationProhibited','privateMemoryDefaultDenied','exactLocationDefaultDenied']) assert.equal(registry.ruaiMinimumControls[key], true)
  assert.equal(registry.ruaiMinimumControls.medicalDecisionAutomationAuthorized, false)
  assert.equal(registry.economicMinimumControls.earningsGuaranteesAllowed, false)
  assert.equal(registry.economicMinimumControls.automaticDataSaleAllowed, false)
  assert.equal(registry.economicMinimumControls.productionActivationAuthorized, false)
})

test('policy documents preserve conditional legal and product claims', () => {
  for (const filename of requiredDocs) assert.ok(fs.existsSync(path.join(root, 'governance', filename)), `missing ${filename}`)
  assert.match(read('governance/RUAI_ACCESS_AND_DATA_GOVERNANCE.md'), /Access is denied unless/)
  assert.match(read('governance/ORGANIZATIONAL_OPERATING_BOUNDARIES.md'), /external legal formation, filings, signatures, and officer authority are not created/i)
  assert.match(read('governance/IP_CHAIN_OF_TITLE_READINESS.md'), /Patent pending.*prohibited until a qualifying filing receipt exists/i)
  assert.match(read('governance/ECONOMIC_PARTICIPATION_BOUNDARIES.md'), /No automatic sale, license, or sharing of user data/i)
})

test('human receipts bind every exact merged dependency', () => {
  const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'))
  const convergence = read('operations/ecosystem/URAI_ECOSYSTEM_CONVERGENCE_RECEIPT.md')
  const ledger = read('operations/spatial/SPATIAL_AAA_PROGRAM_LEDGER.md')
  const exactValues = [registry.currentMainAtRebuild, registry.dependencies.embodiedMirror.exactHead, registry.dependencies.embodiedMirror.mergeCommit, registry.dependencies.consentGatedGeography.exactHead, registry.dependencies.consentGatedGeography.mergeCommit]
  for (const source of [convergence, ledger]) {
    for (const value of exactValues) assert.match(source, new RegExp(escapeRegExp(value)))
    assert.match(source, /PR #1026/)
    assert.match(source, /PR #1034/)
    assert.match(source, /issue `?#999`?/i)
  }
  assert.match(convergence, /No stale workflow or artifact transfers authority/)
  assert.match(ledger, /No evidence from an earlier head transfers merge authority/)
})

test('governance workflow emits an exact candidate-bound receipt without deployment', () => {
  const workflow = read('.github/workflows/urai-ecosystem-governance-verify.yml')
  assert.match(workflow, /CANDIDATE_SHA: \$\{\{ github\.event\.pull_request\.head\.sha \}\}/)
  assert.match(workflow, /candidateSha: process\.env\.CANDIDATE_SHA/)
  assert.match(workflow, /exact-governance-receipt\.json/)
  assert.doesNotMatch(workflow, /firebase deploy/)
  assert.doesNotMatch(workflow, /gcloud services enable/)
})
