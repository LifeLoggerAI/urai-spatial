import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import test from 'node:test'
import { buildPresenceReport } from './report.mjs'

const script = fileURLToPath(new URL('./report.mjs', import.meta.url))
const complete = () => ({
  generatedAt: '2026-07-05T16:38:32.905Z',
  core: { assetSwitch: true, sceneGate: true, releaseChecklist: true },
  ecosystem: { registry: true, dependencyGraph: true },
  simulation: { scenarioSchema: true, safetyBoundary: true },
})

function refusesShipping(report) {
  assert.equal(report.shipAuthorized, false)
  assert.equal(report.releaseAcceptance, 'NOT_ASSESSED')
  assert.equal(report.evidenceScope, 'SOURCE_FILE_PRESENCE_ONLY')
  assert.notEqual(report.riskClass, 'safe-to-ship')
  assert.notEqual(report.decision, 'V9_ECOSYSTEM_INTELLIGENCE_READY')
}

test('all files present with no acceptance proves source presence only', () => {
  const report = buildPresenceReport(complete())
  assert.equal(report.sourcePresence, 'COMPLETE')
  assert.deepEqual(report.missing, [])
  assert.deepEqual(report.invalid, [])
  assert.equal(report.riskClass, 'acceptance-unverified')
  refusesShipping(report)
})

test('a forged acceptance claim cannot turn the presence report into release authority', () => {
  const report = buildPresenceReport({ ...complete(), shipAuthorized: true, releaseAcceptance: 'ACCEPTED', riskClass: 'safe-to-ship' })
  assert.equal(report.sourcePresence, 'INCOMPLETE')
  assert.equal(report.invalid.length, 3)
  refusesShipping(report)
})

test('empty evidence cannot be vacuously complete', () => {
  const report = buildPresenceReport({})
  assert.equal(report.sourcePresence, 'INCOMPLETE')
  assert.equal(report.missing.length, 7)
  refusesShipping(report)
})

test('inherited required groups are not collected source evidence', () => {
  const report = buildPresenceReport(Object.create(complete()))
  assert.equal(report.sourcePresence, 'INCOMPLETE')
  assert.equal(report.missing.length, 7)
  refusesShipping(report)
})

test('inherited required checks are not collected source evidence', () => {
  const input = complete()
  input.core = Object.create(input.core)
  const report = buildPresenceReport(input)
  assert.equal(report.sourcePresence, 'INCOMPLETE')
  assert.deepEqual(report.missing, ['core.assetSwitch', 'core.sceneGate', 'core.releaseChecklist'])
  refusesShipping(report)
})

for (const bad of [null, false, [], 'all present', 1]) {
  test(`non-object evidence is incomplete: ${JSON.stringify(bad)}`, () => {
    const report = buildPresenceReport(bad)
    assert.equal(report.sourcePresence, 'INCOMPLETE')
    assert.ok(report.invalid.includes('evidence must be an object'))
    refusesShipping(report)
  })
}

test('an absent required group cannot be replaced by unrelated truthy evidence', () => {
  const input = complete()
  delete input.ecosystem
  input.approved = { everything: true }
  const report = buildPresenceReport(input)
  assert.equal(report.sourcePresence, 'INCOMPLETE')
  assert.ok(report.missing.includes('ecosystem.registry'))
  assert.ok(report.invalid.includes('unexpected evidence field: approved'))
  refusesShipping(report)
})

test('a required check must be a literal boolean, not truthy text', () => {
  const input = complete()
  input.core.sceneGate = 'false'
  const report = buildPresenceReport(input)
  assert.equal(report.sourcePresence, 'INCOMPLETE')
  assert.ok(report.invalid.includes('core.sceneGate must be a boolean'))
  refusesShipping(report)
})

test('a false required check stays incomplete', () => {
  const input = complete()
  input.simulation.safetyBoundary = false
  const report = buildPresenceReport(input)
  assert.equal(report.sourcePresence, 'INCOMPLETE')
  assert.deepEqual(report.missing, ['simulation.safetyBoundary'])
  assert.deepEqual(report.invalid, [])
  refusesShipping(report)
})

test('unexpected check names are not accepted as equivalent evidence', () => {
  const input = complete()
  input.core.acceptedVisuals = true
  const report = buildPresenceReport(input)
  assert.equal(report.sourcePresence, 'INCOMPLETE')
  assert.deepEqual(report.invalid, ['unexpected presence check: core.acceptedVisuals'])
  refusesShipping(report)
})

function runCli(t, input, { absent = false, stale = false } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'urai-v9-report-'))
  t.after(() => fs.rmSync(root, { recursive: true, force: true }))
  const dir = path.join(root, 'audit', 'v9')
  fs.mkdirSync(dir, { recursive: true })
  if (!absent) fs.writeFileSync(path.join(dir, 'ecosystem-evidence.json'), typeof input === 'string' ? input : JSON.stringify(input))
  if (stale) fs.writeFileSync(path.join(dir, 'ecosystem-intelligence-report.json'), JSON.stringify({ riskClass: 'safe-to-ship', shipAuthorized: true }))
  const result = spawnSync(process.execPath, [script], { cwd: root, encoding: 'utf8' })
  assert.equal(result.error, undefined)
  assert.equal(result.signal, null)
  const report = JSON.parse(fs.readFileSync(path.join(dir, 'ecosystem-intelligence-report.json'), 'utf8'))
  assert.deepEqual(JSON.parse(result.stdout), report)
  refusesShipping(report)
  return { result, report }
}

test('real CLI succeeds only as a source inventory when every required file is present', (t) => {
  const { result, report } = runCli(t, complete())
  assert.equal(result.status, 0)
  assert.equal(report.sourcePresence, 'COMPLETE')
})

test('real CLI fails an incomplete source inventory', (t) => {
  const input = complete()
  input.ecosystem.registry = false
  const { result, report } = runCli(t, input)
  assert.equal(result.status, 1)
  assert.equal(report.sourcePresence, 'INCOMPLETE')
})

test('missing evidence overwrites stale ready output with a non-authorizing rejection', (t) => {
  const { result, report } = runCli(t, undefined, { absent: true, stale: true })
  assert.equal(result.status, 1)
  assert.ok(report.invalid.includes('ecosystem evidence missing'))
})

test('invalid JSON overwrites stale ready output with a non-authorizing rejection', (t) => {
  const { result, report } = runCli(t, '{invalid', { stale: true })
  assert.equal(result.status, 1)
  assert.ok(report.invalid.includes('ecosystem evidence unreadable or invalid JSON'))
})
