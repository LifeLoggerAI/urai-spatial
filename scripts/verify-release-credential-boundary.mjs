#!/usr/bin/env node
import { createHash } from 'node:crypto'
import { existsSync, lstatSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  runLiveRollbackProvenanceSelfTest,
  verifyLiveRollbackProvenance,
} from './verify-live-rollback-provenance.mjs'

const directory = path.dirname(fileURLToPath(import.meta.url))
const staticVerifierPath = path.join(directory, 'verify-release-credential-boundary-static.mjs')
const liveProvenanceVerifierPath = path.join(directory, 'verify-live-rollback-provenance.mjs')
const releaseOperatorPath = path.join(directory, 'live-release.mjs')
const failures = []

function sha256(file) {
  return createHash('sha256').update(readFileSync(file)).digest('hex')
}

function requireRegularFile(label, file) {
  if (!existsSync(file)) {
    failures.push(`${label} is missing: ${file}`)
    return false
  }
  const stats = lstatSync(file)
  if (!stats.isFile() || stats.isSymbolicLink()) {
    failures.push(`${label} must be a regular file: ${file}`)
    return false
  }
  return true
}

const requiredStaticMarkers = [
  'normalizeNewlines',
  'secretOccurrences !== 1',
  'lineEndingsNormalized: true',
  'thirdPartyActionsPinned: true',
  'rollbackAuthorityVerifierUsesCurrentAuthority: true',
  'targetBuildIsolated: true',
  'authorityAttestationIsolated: true',
  'targetCodeExecutesInProductionJob: false',
  'releaseOperatorVerifiesFullBundleManifest: true',
  'credentialsMaterializedByAuthorityOnly: true',
  'unmanagedLocalCredentialPathsIgnoredDuringVerification: true',
  'managedCredentialPathRequiredForProductionWrite: true',
  'firebaseCliResolvedFromCurrentAuthority: true',
]

if (requireRegularFile('Static credential-boundary verifier', staticVerifierPath)) {
  const staticSource = readFileSync(staticVerifierPath, 'utf8').replace(/\r\n?/g, '\n')
  for (const marker of requiredStaticMarkers) {
    if (!staticSource.includes(marker)) failures.push(`Static credential-boundary verifier missing marker: ${marker}`)
  }
}

const requiredLiveProvenanceMarkers = [
  "schemaVersion: 'urai-live-rollback-provenance-1'",
  "candidate.schemaVersion !== 'urai-release-fingerprint-1'",
  'Deploy recovery SHA',
  'Rollback target',
  "redirect: 'manual'",
  "cache: 'no-store'",
  'verifiedAt',
]
if (requireRegularFile('Live rollback-provenance verifier', liveProvenanceVerifierPath)) {
  const liveVerifierSource = readFileSync(liveProvenanceVerifierPath, 'utf8').replace(/\r\n?/g, '\n')
  for (const marker of requiredLiveProvenanceMarkers) {
    if (!liveVerifierSource.includes(marker)) failures.push(`Live rollback-provenance verifier missing marker: ${marker}`)
  }
}

let releaseOperatorFullBundleVerificationPresent = false
if (requireRegularFile('Release operator', releaseOperatorPath)) {
  const releaseOperatorSource = readFileSync(releaseOperatorPath, 'utf8').replace(/\r\n?/g, '\n')
  const requiredOperatorMarkers = [
    'function validateAndMaterializePrebuiltBundle',
    'Release bundle file set, sizes, or hashes do not match the manifest',
    'Release bundle manifest totals do not match the verified files',
    'Materialized hosting output does not match the verified release bundle',
    'validateAndMaterializePrebuiltBundle(targetSha, authoritySha, false)',
    'validateAndMaterializePrebuiltBundle(targetSha, authoritySha)',
  ]
  const missing = requiredOperatorMarkers.filter((marker) => !releaseOperatorSource.includes(marker))
  if (missing.length) {
    for (const marker of missing) failures.push(`Release operator missing full-bundle verifier marker: ${marker}`)
  } else {
    releaseOperatorFullBundleVerificationPresent = true
  }
}

await import('./verify-release-credential-boundary-static.mjs')
runLiveRollbackProvenanceSelfTest()

const githubJob = (process.env.GITHUB_JOB || '').trim()
const liveRollbackProvenanceRequired =
  process.env.GITHUB_ACTIONS === 'true' &&
  process.env.GITHUB_EVENT_NAME === 'workflow_dispatch' &&
  githubJob === 'deploy' &&
  process.env.GITHUB_REF === 'refs/heads/main' &&
  ['deploy', 'rollback'].includes(String(process.env.URAI_RELEASE_OPERATION || ''))
let liveRollbackProvenanceVerified = false
if (liveRollbackProvenanceRequired) {
  await verifyLiveRollbackProvenance()
  liveRollbackProvenanceVerified = true
}

let downloadedBundlePresent = false
let downloadedBundleRunBound = false
let downloadedBundleFingerprintBound = false
const downloadedBundleRequired = githubJob === 'deploy' || (process.env.URAI_REQUIRE_RELEASE_BUNDLE || '').trim() === '1'
const bundleDirectoryValue = (process.env.URAI_RELEASE_BUNDLE_DIR || '').trim()

if (downloadedBundleRequired && !bundleDirectoryValue) {
  failures.push('URAI_RELEASE_BUNDLE_DIR must be set when a downloaded release bundle is required')
}

if (bundleDirectoryValue) {
  const bundleDirectory = path.resolve(bundleDirectoryValue)
  const manifestPath = path.join(bundleDirectory, 'manifest.json')
  if (!existsSync(manifestPath)) {
    if (downloadedBundleRequired) failures.push(`Downloaded release bundle manifest is missing: ${manifestPath}`)
  } else {
    downloadedBundlePresent = true
    if (requireRegularFile('Downloaded release bundle manifest', manifestPath)) {
      let manifest
      try {
        manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
      } catch {
        failures.push('Downloaded release bundle manifest must be valid JSON')
      }

      if (manifest) {
        const currentWorkflowRunId = (process.env.GITHUB_RUN_ID || '').trim()
        if (!/^\d+$/.test(currentWorkflowRunId)) {
          failures.push('GITHUB_RUN_ID must be present before validating a downloaded release bundle')
        } else if (manifest.workflowRunId !== currentWorkflowRunId) {
          failures.push(`Downloaded release bundle workflow run mismatch: expected ${currentWorkflowRunId}, found ${manifest.workflowRunId || 'missing'}`)
        } else {
          downloadedBundleRunBound = true
        }

        const fingerprintPath = path.join(bundleDirectory, 'urai-tier1', 'out', 'release-fingerprint.json')
        if (requireRegularFile('Downloaded release fingerprint', fingerprintPath)) {
          const actualFingerprintSha256 = sha256(fingerprintPath)
          if (!/^[0-9a-f]{64}$/.test(manifest.fingerprintSha256 || '')) {
            failures.push('Downloaded release bundle manifest has an invalid fingerprintSha256')
          } else if (manifest.fingerprintSha256 !== actualFingerprintSha256) {
            failures.push('Downloaded release bundle fingerprint hash does not match the manifest')
          } else {
            downloadedBundleFingerprintBound = true
          }
        }
      }
    }
  }
}

const report = {
  schemaVersion: 'urai-release-credential-boundary-4',
  ok:
    failures.length === 0 &&
    process.exitCode !== 1 &&
    (!liveRollbackProvenanceRequired || liveRollbackProvenanceVerified),
  lineEndingsNormalized: true,
  thirdPartyActionsPinned: true,
  rollbackAuthorityVerifierUsesCurrentAuthority: true,
  targetBuildIsolated: true,
  authorityAttestationIsolated: true,
  targetCodeExecutesInProductionJob: false,
  credentialsMaterializedByAuthorityOnly: true,
  unmanagedLocalCredentialPathsIgnoredDuringVerification: true,
  managedCredentialPathRequiredForProductionWrite: true,
  firebaseCliResolvedFromCurrentAuthority: true,
  releaseOperatorFullBundleVerificationPresent,
  liveRollbackProvenanceRequired,
  liveRollbackProvenanceVerified,
  downloadedBundleRequired,
  downloadedBundlePresent,
  downloadedBundleRunBound,
  downloadedBundleFingerprintBound,
  fullBundleVerificationStatus: downloadedBundleRequired
    ? 'pending-live-release-verify-prebuilt-step'
    : 'not-applicable-in-this-job',
  failures,
}

console.log(JSON.stringify(report, null, 2))
if (failures.length || (liveRollbackProvenanceRequired && !liveRollbackProvenanceVerified)) process.exitCode = 1
