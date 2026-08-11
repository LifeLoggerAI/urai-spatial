#!/usr/bin/env node
import { createHash } from 'node:crypto'
import { existsSync, lstatSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  runLiveRollbackProvenanceSelfTest,
  verifyLiveRollbackProvenance,
} from './verify-live-rollback-provenance.mjs'
import {
  runLegacyLiveBootstrapSelfTest,
  verifyLegacyLiveBootstrap,
} from './verify-legacy-live-bootstrap.mjs'

const directory = path.dirname(fileURLToPath(import.meta.url))
const staticVerifierPath = path.join(directory, 'verify-release-credential-boundary-static.mjs')
const liveProvenanceVerifierPath = path.join(directory, 'verify-live-rollback-provenance.mjs')
const legacyBootstrapVerifierPath = path.join(directory, 'verify-legacy-live-bootstrap.mjs')
const releaseEntrypointPath = path.join(directory, 'live-release.mjs')
const releaseOperatorPath = path.join(directory, 'live-release-wif.mjs')
const recoveryPath = path.join(directory, 'firebase-hosting-recovery.mjs')
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
  'rawServiceAccountSecretOccurrences',
  'lineEndingsNormalized: true',
  'thirdPartyActionsPinned: true',
  'rollbackAuthorityVerifierUsesCurrentAuthority: true',
  'targetBuildIsolated: true',
  'authorityAttestationIsolated: true',
  'targetCodeExecutesInProductionJob: false',
  'releaseOperatorVerifiesFullBundleManifest: true',
  'wifOnlyProductionAuth: true',
  'longLivedServiceAccountKeyForbidden: true',
  'federatedCredentialFileRequiredForProductionWrite: true',
  'firebaseCliResolvedFromCurrentAuthority: true',
]

if (requireRegularFile('Static credential-boundary verifier', staticVerifierPath)) {
  const staticSource = readFileSync(staticVerifierPath, 'utf8').replace(/\r\n?/g, '\n')
  for (const marker of requiredStaticMarkers) {
    if (!staticSource.includes(marker)) failures.push(`Static credential-boundary verifier missing marker: ${marker}`)
  }
}

const requiredLiveProvenanceMarkers = [
  "schemaVersion: 'urai-live-rollback-provenance-2'",
  "candidate.schemaVersion !== 'urai-release-fingerprint-1'",
  'candidate.repository !== expectedRepository',
  "candidate.authoritySha || ''",
  'authoritySha must equal the release or rollback authority',
  'workflowRunId must be a numeric GitHub Actions run identifier',
  'Deploy recovery SHA',
  'Rollback target',
  "redirect: 'manual'",
  "cache: 'no-store'",
  'responseUrl.toString() !== fingerprintUrl.toString()',
  "contentType.toLowerCase().includes('application/json')",
  'liveAuthoritySha',
  'verifiedAt',
]
if (requireRegularFile('Live rollback-provenance verifier', liveProvenanceVerifierPath)) {
  const source = readFileSync(liveProvenanceVerifierPath, 'utf8').replace(/\r\n?/g, '\n')
  for (const marker of requiredLiveProvenanceMarkers) {
    if (!source.includes(marker)) failures.push(`Live rollback-provenance verifier missing marker: ${marker}`)
  }
}

const requiredLegacyBootstrapMarkers = [
  "schemaVersion: 'urai-legacy-live-bootstrap-provenance-1'",
  'BOOTSTRAP_LEGACY_URAI_APP',
  'valid release fingerprint already exists',
  'recognized-legacy-html',
  'live-rollback-provenance.json',
  'normalFingerprintDeployRequiredAfterBootstrap: true',
]
if (requireRegularFile('Legacy live-bootstrap verifier', legacyBootstrapVerifierPath)) {
  const source = readFileSync(legacyBootstrapVerifierPath, 'utf8').replace(/\r\n?/g, '\n')
  for (const marker of requiredLegacyBootstrapMarkers) {
    if (!source.includes(marker)) failures.push(`Legacy live-bootstrap verifier missing marker: ${marker}`)
  }
}

if (requireRegularFile('Release entrypoint', releaseEntrypointPath)) {
  const source = readFileSync(releaseEntrypointPath, 'utf8').replace(/\r\n?/g, '\n')
  if (!source.includes("import './live-release-wif.mjs'")) failures.push('Release entrypoint must route only through live-release-wif.mjs')
  if (/FIREBASE_SERVICE_ACCOUNT_JSON/.test(source)) failures.push('Release entrypoint contains forbidden long-lived credential logic')
}

let releaseOperatorFullBundleVerificationPresent = false
if (requireRegularFile('WIF release operator', releaseOperatorPath)) {
  const source = readFileSync(releaseOperatorPath, 'utf8').replace(/\r\n?/g, '\n')
  const required = [
    'function validateAndMaterializePrebuiltBundle',
    'Release bundle file set, sizes, or hashes do not match the manifest',
    'Release bundle manifest totals do not match the verified files',
    'Materialized hosting output does not match the verified release bundle',
    'validateAndMaterializePrebuiltBundle(targetSha, authoritySha, false)',
    'validateAndMaterializePrebuiltBundle(targetSha, authoritySha)',
    'function assertFederatedCredentialContext()',
    "config?.type !== 'external_account'",
    'deployHostingWithFederatedCredentials',
    'longLivedServiceAccountKeyUsed: false',
  ]
  const missing = required.filter((marker) => !source.includes(marker))
  for (const marker of missing) failures.push(`WIF release operator missing marker: ${marker}`)
  if (!missing.length) releaseOperatorFullBundleVerificationPresent = true
  if (/writeTemporaryServiceAccount|createServiceAccountAssertion/.test(source)) {
    failures.push('WIF release operator contains forbidden long-lived service-account key logic')
  }
}

if (requireRegularFile('WIF Hosting recovery', recoveryPath)) {
  const source = readFileSync(recoveryPath, 'utf8').replace(/\r\n?/g, '\n')
  for (const marker of [
    'function accessTokenFromFederatedAdc(options = {})',
    "gcloud(['auth', 'print-access-token'])",
    "schemaVersion: 'urai-firebase-hosting-recovery-2'",
    "authMode: 'wif'",
  ]) if (!source.includes(marker)) failures.push(`WIF Hosting recovery missing marker: ${marker}`)
  if (/createSign|createServiceAccountAssertion|accessTokenFromServiceAccount/.test(source)) {
    failures.push('WIF Hosting recovery contains forbidden private-key token minting')
  }
}

await import('./verify-release-credential-boundary-static.mjs')
runLiveRollbackProvenanceSelfTest()
runLegacyLiveBootstrapSelfTest()

const githubJob = (process.env.GITHUB_JOB || '').trim()
const runnerTemp = (process.env.RUNNER_TEMP || '').trim()
const releaseOperation = String(process.env.URAI_RELEASE_OPERATION || '')
const legacyBootstrapRequested = String(process.env.URAI_LEGACY_BOOTSTRAP || '') === '1'
const protectedDispatch =
  process.env.GITHUB_ACTIONS === 'true' &&
  process.env.GITHUB_EVENT_NAME === 'workflow_dispatch' &&
  githubJob === 'deploy' &&
  process.env.GITHUB_REF === 'refs/heads/main'

if (legacyBootstrapRequested && (releaseOperation !== 'deploy' || process.env.URAI_LEGACY_BOOTSTRAP_CONFIRM !== 'BOOTSTRAP_LEGACY_URAI_APP')) {
  failures.push('Legacy bootstrap requires deploy operation and exact BOOTSTRAP_LEGACY_URAI_APP confirmation')
}

const liveRollbackProvenanceRequired = protectedDispatch && !legacyBootstrapRequested && ['deploy', 'rollback'].includes(releaseOperation)
const legacyBootstrapProofRequired = protectedDispatch && legacyBootstrapRequested && releaseOperation === 'deploy'
const liveRollbackEvidenceDirectory =
  (liveRollbackProvenanceRequired || legacyBootstrapProofRequired) && runnerTemp
    ? path.join(runnerTemp, 'release-control-evidence')
    : path.resolve('release-control-evidence')
let liveRollbackProvenanceVerified = false
let legacyBootstrapProofVerified = false
if (liveRollbackProvenanceRequired) {
  await verifyLiveRollbackProvenance({ evidenceDirectory: liveRollbackEvidenceDirectory })
  liveRollbackProvenanceVerified = true
}
if (legacyBootstrapProofRequired) {
  await verifyLegacyLiveBootstrap({ evidenceDirectory: liveRollbackEvidenceDirectory })
  legacyBootstrapProofVerified = true
}

let downloadedBundlePresent = false
let downloadedBundleRunBound = false
let downloadedBundleFingerprintBound = false
const downloadedBundleRequired = githubJob === 'deploy' || (process.env.URAI_REQUIRE_RELEASE_BUNDLE || '').trim() === '1'
const canonicalDeployBundleDirectory = process.env.GITHUB_ACTIONS === 'true' && githubJob === 'deploy' && runnerTemp
  ? path.join(runnerTemp, 'urai-release-bundle')
  : ''
const bundleDirectoryValue = (process.env.URAI_RELEASE_BUNDLE_DIR || canonicalDeployBundleDirectory).trim()

if (downloadedBundleRequired && !bundleDirectoryValue) failures.push('URAI_RELEASE_BUNDLE_DIR must be set when a downloaded release bundle is required')

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

const federatedAuthActive = Boolean(process.env.GOOGLE_APPLICATION_CREDENTIALS && process.env.GOOGLE_GHA_CREDS_PATH)
const report = {
  schemaVersion: 'urai-release-credential-boundary-5',
  ok: failures.length === 0 && process.exitCode !== 1 && (!liveRollbackProvenanceRequired || liveRollbackProvenanceVerified) && (!legacyBootstrapProofRequired || legacyBootstrapProofVerified),
  lineEndingsNormalized: true,
  thirdPartyActionsPinned: true,
  rollbackAuthorityVerifierUsesCurrentAuthority: true,
  targetBuildIsolated: true,
  authorityAttestationIsolated: true,
  targetCodeExecutesInProductionJob: false,
  wifOnlyProductionAuth: true,
  longLivedServiceAccountKeyForbidden: true,
  federatedCredentialFileRequiredForProductionWrite: true,
  firebaseCliResolvedFromCurrentAuthority: true,
  releaseOperatorFullBundleVerificationPresent,
  protectedDispatch,
  federatedAuthActive,
  liveRollbackProvenanceRequired,
  liveRollbackProvenanceVerified,
  legacyBootstrapRequested,
  legacyBootstrapProofRequired,
  legacyBootstrapProofVerified,
  downloadedBundleRequired,
  downloadedBundlePresent,
  downloadedBundleRunBound,
  downloadedBundleFingerprintBound,
  fullBundleVerificationStatus: downloadedBundleRequired ? 'pending-live-release-verify-prebuilt-step' : 'not-applicable-in-this-job',
  failures,
}

console.log(JSON.stringify(report, null, 2))
if (failures.length || (liveRollbackProvenanceRequired && !liveRollbackProvenanceVerified) || (legacyBootstrapProofRequired && !legacyBootstrapProofVerified)) process.exitCode = 1
