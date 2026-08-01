import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const root = path.resolve(import.meta.dirname, '..', '..')
const governancePath = path.join(root, 'governance', 'urai-ecosystem-governance.json')
const requiredDocs = [
  'RUAI_ACCESS_AND_DATA_GOVERNANCE.md',
  'ORGANIZATIONAL_OPERATING_BOUNDARIES.md',
  'IP_CHAIN_OF_TITLE_READINESS.md',
  'ECONOMIC_PARTICIPATION_BOUNDARIES.md',
]

const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8')

test('ecosystem registry is fail-closed and names every governed identity', () => {
  assert.ok(fs.existsSync(governancePath), 'missing ecosystem governance registry')
  const registry = JSON.parse(fs.readFileSync(governancePath, 'utf8'))

  assert.equal(registry.schemaVersion, 'urai-ecosystem-governance-1')
  assert.equal(registry.productionAuthorityIssue, 999)
  assert.deepEqual(registry.publicNames, {
    consumer: 'UrAi',
    professional: 'RuAi',
    operator: 'URAI Labs',
    mission: 'URAI Foundation',
    ipOwner: 'URAI IP Holdings',
  })
  assert.equal(registry.providerCalls, 0)
  assert.equal(registry.spendUsd, '0.00')
  assert.equal(registry.productionMutation, false)

  const ids = new Set(registry.systems.map((item) => item.id))
  for (const expected of [
    'urai-consumer',
    'ruai-professional',
    'organizational-structure',
    'ip-chain-of-title',
    'economic-participation',
    'asset-spatial-production',
    'privacy-consent',
    'accessibility-sensory-safety',
    'deployment-proof',
    'global-future-platform',
  ]) assert.ok(ids.has(expected), `missing ecosystem system ${expected}`)
})

test('RuAi access defaults deny private data and medical automation', () => {
  const registry = JSON.parse(fs.readFileSync(governancePath, 'utf8'))
  assert.equal(registry.ruaiMinimumControls.explicitUserConsent, true)
  assert.equal(registry.ruaiMinimumControls.leastPrivilegeRoles, true)
  assert.equal(registry.ruaiMinimumControls.tenantIsolation, true)
  assert.equal(registry.ruaiMinimumControls.revocationRequired, true)
  assert.equal(registry.ruaiMinimumControls.deletionPropagationRequired, true)
  assert.equal(registry.ruaiMinimumControls.reidentificationProhibited, true)
  assert.equal(registry.ruaiMinimumControls.privateMemoryDefaultDenied, true)
  assert.equal(registry.ruaiMinimumControls.medicalDecisionAutomationAuthorized, false)

  const ruai = read('governance/RUAI_ACCESS_AND_DATA_GOVERNANCE.md')
  for (const phrase of [
    'Access is denied unless',
    'No role inherits unrestricted access',
    'Private memory content and exact location are denied unless explicitly included',
    'Cross-tenant and cross-user access must fail closed',
    'No production-ready claim is authorized',
  ]) assert.match(ruai, new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
})

test('organizational and IP claims remain conditional on executed evidence', () => {
  for (const filename of requiredDocs) {
    assert.ok(fs.existsSync(path.join(root, 'governance', filename)), `missing ${filename}`)
  }

  const organizations = read('governance/ORGANIZATIONAL_OPERATING_BOUNDARIES.md')
  assert.match(organizations, /external legal formation, filings, signatures, and officer authority are not created/i)
  assert.match(organizations, /No successor, board, officer, trustee, or transfer is created/i)
  assert.match(organizations, /URAI IP Holdings does not own user memories/i)

  const ip = read('governance/IP_CHAIN_OF_TITLE_READINESS.md')
  assert.match(ip, /does not create, assign, file, register, or perfect legal rights/i)
  assert.match(ip, /An NDA alone does not assign intellectual property/i)
  assert.match(ip, /Patent pending.*prohibited until a qualifying filing receipt exists/i)
  assert.match(ip, /User memories.*are not transferred to URAI IP Holdings/i)
})

test('economic participation is opt-in, non-guaranteed, and not production authorized', () => {
  const registry = JSON.parse(fs.readFileSync(governancePath, 'utf8'))
  assert.equal(registry.economicMinimumControls.earningsGuaranteesAllowed, false)
  assert.equal(registry.economicMinimumControls.automaticDataSaleAllowed, false)
  assert.equal(registry.economicMinimumControls.optInRequired, true)
  assert.equal(registry.economicMinimumControls.withdrawalAndRevocationRequired, true)
  assert.equal(registry.economicMinimumControls.productionActivationAuthorized, false)

  const economics = read('governance/ECONOMIC_PARTICIPATION_BOUNDARIES.md')
  assert.match(economics, /No guaranteed income/i)
  assert.match(economics, /No automatic sale, license, or sharing of user data/i)
  assert.match(economics, /Declining or withdrawing must not remove core account rights/i)
  assert.match(economics, /future scope, not required for V1/i)
})

test('registry keeps DNS, legal execution, and native review as bounded external gates', () => {
  const registry = JSON.parse(fs.readFileSync(governancePath, 'utf8'))
  const blockers = new Map(registry.externalBlockers.map((item) => [item.id, item]))
  assert.ok(blockers.has('dns-registrar'))
  assert.ok(blockers.has('legal-execution'))
  assert.ok(blockers.has('native-locale-review'))
  assert.ok(blockers.get('dns-registrar').doesNotBlock.includes('repository-work'))
  assert.ok(blockers.get('dns-registrar').doesNotBlock.includes('accessibility'))

  const prohibited = registry.claimProhibitions.join('\n')
  for (const claim of ['HIPAA', 'patent pending', 'named partnerships', 'user earnings', 'fully accessible']) {
    assert.match(prohibited, new RegExp(claim, 'i'))
  }
})
