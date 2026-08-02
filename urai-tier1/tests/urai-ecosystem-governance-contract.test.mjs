import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const root = path.resolve(import.meta.dirname, '..', '..')
const governancePath = path.join(root, 'governance', 'urai-ecosystem-governance.json')
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8')

const requiredDocs = [
  'RUAI_ACCESS_AND_DATA_GOVERNANCE.md',
  'ORGANIZATIONAL_OPERATING_BOUNDARIES.md',
  'IP_CHAIN_OF_TITLE_READINESS.md',
  'ECONOMIC_PARTICIPATION_BOUNDARIES.md',
]

test('ecosystem registry binds the final exact dependency chain', () => {
  const registry = JSON.parse(fs.readFileSync(governancePath, 'utf8'))
  assert.equal(registry.schemaVersion, 'urai-ecosystem-governance-1')
  assert.equal(registry.status, 'stacked-readiness-authority')
  assert.equal(registry.stackedBaseCommit, 'a48d58775afe2236c38bf52a9e98e3c566cdd0b7')
  assert.equal(registry.currentMainAtRebuild, '3e88a085e137a727aa65b4cc7e6aa107e27e2b9d')
  assert.equal(registry.dependencies.trustedPreview.pullRequest, 1018)
  assert.equal(registry.dependencies.trustedPreview.mergedIntoMain, true)
  assert.equal(registry.dependencies.embodiedMirror.pullRequest, 1026)
  assert.equal(registry.dependencies.embodiedMirror.exactHead, '804e2477719bc008cb59449e931a4fbd592a8a9f')
  assert.equal(registry.dependencies.embodiedMirror.exactHeadWorkflowCount, 24)
  assert.equal(registry.dependencies.embodiedMirror.browserCaseCount, 13)
  assert.equal(registry.dependencies.embodiedMirror.requiredBeforeEcosystemMerge, true)
  assert.equal(registry.dependencies.consentGatedGeography.pullRequest, 1027)
  assert.equal(registry.dependencies.consentGatedGeography.exactHead, 'a48d58775afe2236c38bf52a9e98e3c566cdd0b7')
  assert.equal(registry.dependencies.consentGatedGeography.exactHeadWorkflowCount, 7)
  assert.equal(registry.dependencies.consentGatedGeography.requiredBeforeEcosystemMerge, true)
  assert.equal(registry.productionAuthorityIssue, 999)
  assert.equal(registry.providerCalls, 0)
  assert.equal(registry.spendUsd, '0.00')
  assert.equal(registry.productionMutation, false)
})

test('RuAi remains consent-scoped and default-deny', () => {
  const registry = JSON.parse(fs.readFileSync(governancePath, 'utf8'))
  for (const key of ['explicitUserConsent','purposeLimitation','leastPrivilegeRoles','tenantIsolation','auditLogRequired','revocationRequired','deletionPropagationRequired','reidentificationProhibited','privateMemoryDefaultDenied','exactLocationDefaultDenied']) assert.equal(registry.ruaiMinimumControls[key], true)
  assert.equal(registry.ruaiMinimumControls.medicalDecisionAutomationAuthorized, false)
  const ruai = read('governance/RUAI_ACCESS_AND_DATA_GOVERNANCE.md')
  for (const phrase of ['Access is denied unless','No role inherits unrestricted access','Private memory content and exact location are denied unless explicitly included','Cross-tenant and cross-user access must fail closed','No production-ready claim is authorized']) assert.match(ruai, new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
})

test('organizational, IP, and economic claims remain conditional', () => {
  for (const filename of requiredDocs) assert.ok(fs.existsSync(path.join(root, 'governance', filename)), `missing ${filename}`)
  const organizations = read('governance/ORGANIZATIONAL_OPERATING_BOUNDARIES.md')
  assert.match(organizations, /external legal formation, filings, signatures, and officer authority are not created/i)
  assert.match(organizations, /URAI IP Holdings does not own user memories/i)
  const ip = read('governance/IP_CHAIN_OF_TITLE_READINESS.md')
  assert.match(ip, /does not create, assign, file, register, or perfect legal rights/i)
  assert.match(ip, /Patent pending.*prohibited until a qualifying filing receipt exists/i)
  const economics = read('governance/ECONOMIC_PARTICIPATION_BOUNDARIES.md')
  assert.match(economics, /No guaranteed income/i)
  assert.match(economics, /No automatic sale, license, or sharing of user data/i)
  assert.match(economics, /future scope, not required for V1/i)
})

test('external blockers remain bounded and claims fail closed', () => {
  const registry = JSON.parse(fs.readFileSync(governancePath, 'utf8'))
  const blockers = new Map(registry.externalBlockers.map((item) => [item.id, item]))
  for (const id of ['dns-registrar','legal-execution','native-locale-review']) assert.ok(blockers.has(id))
  assert.ok(blockers.get('dns-registrar').doesNotBlock.includes('repository-work'))
  const prohibited = registry.claimProhibitions.join(String.fromCharCode(10))
  for (const claim of ['HIPAA','patent pending','named partnerships','user earnings','fully accessible']) assert.match(prohibited, new RegExp(claim, 'i'))
})

test('receipts describe Mirror, geography, governance, and protected production truthfully', () => {
  const convergence = read('operations/ecosystem/URAI_ECOSYSTEM_CONVERGENCE_RECEIPT.md')
  const ledger = read('operations/spatial/SPATIAL_AAA_PROGRAM_LEDGER.md')
  for (const source of [convergence, ledger]) {
    assert.match(source, /PR #1026/)
    assert.match(source, /804e2477719bc008cb59449e931a4fbd592a8a9f/)
    assert.match(source, /24\/24/)
    assert.match(source, /13\/13/)
    assert.match(source, /PR #1027/)
    assert.match(source, /a48d58775afe2236c38bf52a9e98e3c566cdd0b7/)
    assert.match(source, /7\/7/)
    assert.match(source, /issue `?#999`?/i)
  }
  assert.match(convergence, /No stale workflow or artifact transfers authority/)
  assert.match(ledger, /No evidence from an earlier head transfers merge authority/)
})
