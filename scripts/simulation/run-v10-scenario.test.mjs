import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'

const script = process.env.V10_SCRIPT_PATH || fileURLToPath(new URL('./run-v10-scenario.mjs', import.meta.url))

function runScenario(args = [], priorReport) {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'urai-v10-source-boundary-'))
  try {
    const reportPath = path.join(cwd, 'audit', 'v10', 'v10-scenario-report.json')
    if (priorReport) {
      fs.mkdirSync(path.dirname(reportPath), { recursive: true })
      fs.writeFileSync(reportPath, JSON.stringify(priorReport))
    }
    const stdout = execFileSync(process.execPath, [script, ...args], { cwd, encoding: 'utf8' })
    return { report: JSON.parse(stdout), saved: JSON.parse(fs.readFileSync(reportPath, 'utf8')) }
  } finally {
    fs.rmSync(cwd, { recursive: true, force: true })
  }
}

function assertUnaccepted(report) {
  assert.equal(report.decision, 'V10_ADVISORY_SCENARIO_SCAFFOLD')
  assert.equal(report.evidenceScope, 'STATIC_ADVISORY_EXAMPLE_ONLY')
  assert.equal(report.isGeneratedSimulation, false)
  assert.equal(report.adoptionStatus, 'NOT_ESTABLISHED_BY_THIS_REPORT')
  assert.equal(report.simulationAcceptance, 'NOT_ASSESSED')
  assert.equal(report.releaseAcceptance, 'NOT_ASSESSED')
  assert.equal(report.shipAuthorized, false)
}

const retainedCommonScenario = {
  timeHorizon: ['1 year', '5 years', '20 years'],
  actors: ['individuals', 'families', 'clinicians', 'founders', 'AI assistants'],
  institutions: ['healthcare', 'education', 'legal/IP', 'grant systems'],
  technologies: ['spatial memory interface', 'AI assistants', 'asset-driven XR scenes', 'product evolution observers'],
  constraints: ['privacy', 'consent', 'clinical validation', 'evidence quality'],
  risks: ['over-claiming', 'privacy leakage', 'manipulative personalization', 'institutional misunderstanding'],
  benefits: ['agency', 'memory continuity', 'accessibility', 'solo-founder leverage'],
  unknowns: ['adoption curve', 'regulatory pathway', 'clinical evidence requirements'],
  safetyBoundary: 'advisory simulation only',
}

const retainedOutputs = {
  nearTerm: 'Asset-active V1-V6 enables credible demonstration and evidence capture.',
  midTerm: 'V7-V9 add continuity, product evolution evidence, and ecosystem coordination.',
  longTerm: 'V10 remains a research layer for scenario comparison, not control.',
}

for (const [mode, args, id, title, scenarioSource] of [
  ['placeholder', [], 'custom-placeholder', 'Custom V10 scenario placeholder', 'RETAINED_PLACEHOLDER'],
  ['example', ['--example'], 'urai-personal-memory-os', 'Personal memory operating systems', 'RETAINED_EXAMPLE'],
]) {
  test(`${mode} output does not certify simulation or shipping`, () => {
    assertUnaccepted(runScenario(args).report)
  })
  test(`${mode} source classification identifies retained data`, () => {
    assert.equal(runScenario(args).report.scenarioSource, scenarioSource)
  })
  test(`${mode} preserves the complete advisory scenario data`, () => {
    assert.deepEqual(runScenario(args).report.scenario, { id, title, ...retainedCommonScenario })
  })
  test(`${mode} preserves fixed research output without treating it as a computation`, () => {
    const { report } = runScenario(args)
    assert.deepEqual(report.outputs, retainedOutputs)
    assert.equal(report.isGeneratedSimulation, false)
  })
  test(`${mode} persisted report has the same authority boundary as stdout`, () => {
    const { report, saved } = runScenario(args)
    assert.deepEqual(saved, report)
    assertUnaccepted(saved)
  })
}

test('extra acceptance-looking arguments cannot promote a static report', () => {
  const { report, saved } = runScenario(['--example', '--accepted', '--ship', '--simulation-ready'])
  assertUnaccepted(report)
  assertUnaccepted(saved)
})

test('a stale or forged saved report is replaced rather than accepted', () => {
  const { report, saved } = runScenario([], {
    decision: 'V10_SCENARIO_SIMULATION_READY', shipAuthorized: true,
    simulationAcceptance: 'ACCEPTED', releaseAcceptance: 'ACCEPTED',
    reviewReceipt: { status: 'APPROVED', sourceSha: '0'.repeat(40) },
  })
  assertUnaccepted(report)
  assertUnaccepted(saved)
  assert.equal(Object.hasOwn(saved, 'reviewReceipt'), false)
})
