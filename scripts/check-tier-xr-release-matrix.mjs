#!/usr/bin/env node
import fs from 'node:fs'

const matrixPath = 'release/tier-xr-release-matrix.json'
const manifestPath = 'release/urai-spatial-live-manifest.json'
const failures = []

function readJson(path) {
  if (!fs.existsSync(path)) {
    failures.push(`missing required release evidence file: ${path}`)
    return null
  }

  try {
    return JSON.parse(fs.readFileSync(path, 'utf8'))
  } catch (error) {
    failures.push(`invalid JSON in ${path}: ${error.message}`)
    return null
  }
}

const matrix = readJson(matrixPath)
const manifest = readJson(manifestPath)

function requireArrayIncludes(source, field, expectedValues, label = field) {
  const values = source?.[field]
  if (!Array.isArray(values)) {
    failures.push(`${label} must be an array`)
    return
  }

  for (const expected of expectedValues) {
    if (!values.includes(expected)) failures.push(`${label} missing ${expected}`)
  }
}

if (matrix) {
  if (matrix.repository !== 'LifeLoggerAI/urai-spatial') failures.push('tier XR matrix repository mismatch')
  if (matrix.runtimeRoot !== 'urai-tier1') failures.push('tier XR matrix runtimeRoot must be urai-tier1')
  if (matrix.releaseGate !== 'pnpm live:check') failures.push('tier XR matrix releaseGate must be pnpm live:check')

  const tiers = Array.isArray(matrix.tiers) ? matrix.tiers : []
  const xrTargets = Array.isArray(matrix.xrTargets) ? matrix.xrTargets : []

  for (const id of ['tier-1', 'tier-2', 'tier-3', 'tier-4', 'tier-5']) {
    const tier = tiers.find((entry) => entry.id === id)
    if (!tier) {
      failures.push(`tier XR matrix missing ${id}`)
      continue
    }
    for (const field of ['label', 'requiredChecks', 'evidenceSources', 'completionPolicy', 'currentEvidenceStatus']) {
      if (!tier[field] || (Array.isArray(tier[field]) && tier[field].length === 0)) failures.push(`${id} missing ${field}`)
    }
  }

  for (const id of ['web-spatial', 'webxr', 'quest-vr', 'visionos', 'ar-handheld']) {
    const target = xrTargets.find((entry) => entry.id === id)
    if (!target) {
      failures.push(`tier XR matrix missing XR target ${id}`)
      continue
    }
    for (const field of ['label', 'requiredChecks', 'requiredEvidence', 'claimPolicy', 'currentEvidenceStatus']) {
      if (!target[field] || (Array.isArray(target[field]) && target[field].length === 0)) failures.push(`${id} missing ${field}`)
    }
  }

  const liveClaimBlockedTargets = xrTargets.filter((target) => target.id !== 'web-spatial')
  for (const target of liveClaimBlockedTargets) {
    if (!String(target.currentEvidenceStatus).includes('not-validated')) {
      failures.push(`${target.id} must remain not-validated until provider/device evidence exists`)
    }
    if (!/cannot be claimed|must remain disabled/i.test(target.claimPolicy)) {
      failures.push(`${target.id} claimPolicy must block production claims without evidence`)
    }
  }
}

if (manifest) {
  if (manifest.tierXrReleaseMatrix !== matrixPath) failures.push('live manifest must reference tier-xr-release-matrix.json')
  requireArrayIncludes(manifest, 'tierReleaseScope', [
    'tier-1-runtime-authority',
    'tier-2-system-governance',
    'tier-3-feature-route-governance',
    'tier-4-implementation-governance',
    'tier-5-operational-release-governance',
  ], 'live manifest tierReleaseScope')
  requireArrayIncludes(manifest, 'xrReleaseScope', ['web-spatial', 'webxr', 'quest-vr', 'visionos', 'ar-handheld'], 'live manifest xrReleaseScope')
  requireArrayIncludes(manifest, 'releaseGuards', ['xr-contract', 'xr-navmesh-bake', 'xr-firebase-preflight', 'tier-xr-release-evidence'], 'live manifest releaseGuards')
  requireArrayIncludes(manifest, 'requiredExternalInputsBeforeLive', [
    'tier_1_5_release_gate_artifact',
    'webxr_provider_validation',
    'quest_device_lab_evidence',
    'visionos_device_or_simulator_evidence',
    'handheld_ar_privacy_review',
    'privacy_compliance_signoff',
  ], 'live manifest requiredExternalInputsBeforeLive')

  for (const [claim, value] of Object.entries(manifest.liveClaims ?? {})) {
    if (['ar', 'vr', 'xr', 'webxr', 'questVr', 'visionOs'].includes(claim) && !String(value).includes('disabled-until')) {
      failures.push(`live claim ${claim} must remain disabled until provider/device validation`)
    }
  }
}

if (failures.length) {
  console.error('Tier/XR release matrix check failed:')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('Tier/XR release matrix check passed.')
