#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const presenceChecks = {
  core: ['assetSwitch', 'sceneGate', 'releaseChecklist'],
  ecosystem: ['registry', 'dependencyGraph'],
  simulation: ['scenarioSchema', 'safetyBoundary'],
}

const isRecord = (value) => value !== null && typeof value === 'object' && !Array.isArray(value)

// collect-evidence.mjs supplies file-existence booleans, not accepted runtime,
// visual, device, provider or review receipts. This reporter has no authority
// to authenticate a release and never promotes those booleans to permission.
export function buildPresenceReport(evidence, { generatedAt = new Date().toISOString(), inputError } = {}) {
  const missing = []
  const invalid = []
  if (inputError) invalid.push(inputError)
  if (!isRecord(evidence)) invalid.push('evidence must be an object')
  const input = isRecord(evidence) ? evidence : {}
  for (const key of Object.keys(input)) {
    if (key !== 'generatedAt' && !Object.hasOwn(presenceChecks, key)) invalid.push(`unexpected evidence field: ${key}`)
  }
  for (const [group, keys] of Object.entries(presenceChecks)) {
    const values = Object.hasOwn(input, group) ? input[group] : undefined
    if (!isRecord(values)) invalid.push(`${group} must be an object`)
    for (const key of keys) {
      const value = isRecord(values) && Object.hasOwn(values, key) ? values[key] : undefined
      if (value !== true) missing.push(`${group}.${key}`)
      if (value !== true && value !== false) invalid.push(`${group}.${key} must be a boolean`)
    }
    if (isRecord(values)) {
      for (const key of Object.keys(values)) {
        if (!keys.includes(key)) invalid.push(`unexpected presence check: ${group}.${key}`)
      }
    }
  }
  const complete = missing.length === 0 && invalid.length === 0
  return {
    generatedAt,
    decision: complete ? 'V9_ECOSYSTEM_SOURCE_PRESENT' : 'V9_ECOSYSTEM_SOURCE_INCOMPLETE',
    evidenceScope: 'SOURCE_FILE_PRESENCE_ONLY',
    sourcePresence: complete ? 'COMPLETE' : 'INCOMPLETE',
    missing,
    invalid,
    riskClass: complete ? 'acceptance-unverified' : 'evidence-missing',
    releaseAcceptance: 'NOT_ASSESSED',
    shipAuthorized: false,
    releaseAuthority: 'EXISTING_RELEASE_GOVERNANCE_REQUIRED',
    acceptanceReason: 'File presence does not prove runtime, visual, privacy, security, accessibility, device, provider or independent release acceptance.',
  }
}

export function writePresenceReport(root) {
  const outDir = path.join(root, 'audit', 'v9')
  const evidencePath = path.join(outDir, 'ecosystem-evidence.json')
  let evidence
  let inputError
  try {
    evidence = JSON.parse(fs.readFileSync(evidencePath, 'utf8'))
  } catch (error) {
    inputError = error?.code === 'ENOENT' ? 'ecosystem evidence missing' : 'ecosystem evidence unreadable or invalid JSON'
  }
  const report = buildPresenceReport(evidence, { inputError })
  fs.mkdirSync(outDir, { recursive: true })
  fs.writeFileSync(path.join(outDir, 'ecosystem-intelligence-report.json'), JSON.stringify(report, null, 2) + '\n')
  return report
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const report = writePresenceReport(process.cwd())
  console.log(JSON.stringify(report, null, 2))
  // A successful source inventory is only a successful source inventory.
  // Release authorization continues to require the existing protected gates.
  process.exitCode = report.sourcePresence === 'COMPLETE' ? 0 : 1
}
