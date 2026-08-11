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
const root = process.cwd()
const staticVerifierPath = path.join(directory, 'verify-release-credential-boundary-static.mjs')
const liveProvenanceVerifierPath = path.join(directory, 'verify-live-rollback-provenance.mjs')
const legacyBootstrapVerifierPath = path.join(directory, 'verify-legacy-live-bootstrap.mjs')
const releaseOperatorPath = path.join(directory, 'live-release.mjs')
const workflowPath = path.join(root, '.github', 'workflows', 'spatial-live-deploy.yml')
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
function requireMarkers(label, source, markers) {
  for (const marker of markers) if (!source.includes(marker)) failures.push(`${label} missing marker: ${marker}`)
}

const workflow = requireRegularFile('Canonical release workflow', workflowPath)
  ? readFileSync(workflowPath, 'utf8').replace(/\r\n?/g, '\n')
  : ''
const operator = requireRegularFile('Release operator', releaseOperatorPath)
  ? readFileSync(releaseOperatorPath, 'utf8').replace(/\r\n?/g, '\n')
  : ''
const staticSource = requireRegularFile('Static credential-boundary verifier', staticVerifierPath)
  ? readFileSync(staticVerifierPath, 'utf8').replace(/\r\n?/g, '\n')
  : ''

const quarantineMode =
  workflow.includes('name: URAI Canonical Production Release Verification') &&
  workflow.includes('Verify canonical source with production release quarantined') &&
  workflow.includes('Classification: NO-GO') &&
  operator.includes('URAI Spatial production release is NO-GO')

if (quarantineMode) {
  requireMarkers('Quarantine static verifier', staticSource, [
    "schemaVersion: 'urai-release-credential-boundary-static-6'",
    "mode: quarantineMode ? 'quarantine-no-go' : 'active-release'",
    'productionMutationAvailable: !quarantineMode',
    'productionCredentialsAvailable: !quarantineMode',
    'secretOccurrences !== 0',
  ])
  requireMarkers('Quarantine release operator', operator, [
    "process.argv.includes('--deploy')",
    "process.argv.includes('--deploy-prebuilt')",
    "'FIREBASE_SERVICE_ACCOUNT_JSON'",
    "'FIREBASE_PRIVATE_KEY'",
    "'FIREBASE_CLIENT_EMAIL'",
    "'FIREBASE_TOKEN'",
    'Refusing long-lived Firebase credential environment variable:',
    'URAI Spatial production release is NO-GO',
    'No provider credentials were loaded and no production mutation was attempted.',
  ])
  if (/environment:\s*production|id-token:\s*write|FIREBASE_SERVICE_ACCOUNT_JSON:\s*\$\{\{\s*secrets\./.test(workflow)) {
    failures.push('Quarantine workflow must not expose production environment, OIDC write authority, or raw credential secrets')
  }
  if (/node\s+scripts\/live-release\.mjs\s+--deploy(?:-prebuilt)?|firebase(?:-tools)?(?:@[^\s]+)?\s+deploy|pnpm\s+live:deploy/.test(workflow)) {
    failures.push('Quarantine workflow must not expose a production mutation command')
  }
} else {
  requireMarkers('Active static credential-boundary verifier', staticSource, [
    'lineEndingsNormalized: true',
    'thirdPartyActionsPinned: true',
    'rollbackAuthorityVerifierUsesCurrentAuthority: true',
    'targetBuildIsolated: true',
    'authorityAttestationIsolated: true',
    'targetCodeExecutesInProductionJob: false',
    'releaseOperatorVerifiesFullBundleManifest: !quarantineMode',
    'credentialsMaterializedByAuthorityOnly: !quarantineMode',
    'managedCredentialPathRequiredForProductionWrite: !quarantineMode',
    'firebaseCliResolvedFromCurrentAuthority: !quarantineMode',
  ])
  requireMarkers('Active release operator', operator, [
    "process.argv.includes('--verify-prebuilt')",
    "process.argv.includes('--deploy-prebuilt')",
    'function validateAndMaterializePrebuiltBundle',
    'Release bundle file set, sizes, or hashes do not match the manifest',
    'Release bundle manifest totals do not match the verified files',
    'Materialized hosting output does not match the verified release bundle',
  ])
}

const requiredLiveProvenanceMarkers = [
  "schemaVersion: 'urai-live-rollback-provenance-2'",
  "candidate.schemaVersion !== 'urai-release-fingerprint-1'",
  'authoritySha must equal the release or rollback authority',
  'workflowRunId must be a numeric GitHub Actions run identifier',
  "redirect: 'manual'",
  "cache: 'no-store'",
]
if (requireRegularFile('Live rollback-provenance verifier', liveProvenanceVerifierPath)) {
  const source = readFileSync(liveProvenanceVerifierPath, 'utf8').replace(/\r\n?/g, '\n')
  requireMarkers('Live rollback-provenance verifier', source, requiredLiveProvenanceMarkers)
}
const requiredLegacyBootstrapMarkers = [
  "schemaVersion: 'urai-legacy-live-bootstrap-provenance-1'",
  'BOOTSTRAP_LEGACY_URAI_APP',
  'normalFingerprintDeployRequiredAfterBootstrap: true',
]
if (requireRegularFile('Legacy live-bootstrap verifier', legacyBootstrapVerifierPath)) {
  const source = readFileSync(legacyBootstrapVerifierPath, 'utf8').replace(/\r\n?/g, '\n')
  requireMarkers('Legacy live-bootstrap verifier', source, requiredLegacyBootstrapMarkers)
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

if (quarantineMode && (protectedDispatch || ['deploy', 'rollback'].includes(releaseOperation) || legacyBootstrapRequested)) {
  failures.push('Production release operations are forbidden while the canonical release boundary is quarantined')
}
if (!quarantineMode && legacyBootstrapRequested && (releaseOperation !== 'deploy' || process.env.URAI_LEGACY_BOOTSTRAP_CONFIRM !== 'BOOTSTRAP_LEGACY_URAI_APP')) {
  failures.push('Legacy bootstrap requires deploy operation and exact BOOTSTRAP_LEGACY_URAI_APP confirmation')
}

const liveRollbackProvenanceRequired = !quarantineMode && protectedDispatch && !legacyBootstrapRequested && ['deploy', 'rollback'].includes(releaseOperation)
const legacyBootstrapProofRequired = !quarantineMode && protectedDispatch && legacyBootstrapRequested && releaseOperation === 'deploy'
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
const downloadedBundleRequired = !quarantineMode && (githubJob === 'deploy' || (process.env.URAI_REQUIRE_RELEASE_BUNDLE || '').trim() === '1')
const canonicalDeployBundleDirectory =
  !quarantineMode && process.env.GITHUB_ACTIONS === 'true' && githubJob === 'deploy' && runnerTemp
    ? path.join(runnerTemp, 'urai-release-bundle')
    : ''
const bundleDirectoryValue = (process.env.URAI_RELEASE_BUNDLE_DIR || canonicalDeployBundleDirectory).trim()
if (downloadedBundleRequired && !bundleDirectoryValue) failures.push('URAI_RELEASE_BUNDLE_DIR must be set when a downloaded release bundle is required')
if (bundleDirectoryValue && !quarantineMode) {
  const bundleDirectory = path.resolve(bundleDirectoryValue)
  const manifestPath = path.join(bundleDirectory, 'manifest.json')
  if (!existsSync(manifestPath)) {
    if (downloadedBundleRequired) failures.push(`Downloaded release bundle manifest is missing: ${manifestPath}`)
  } else {
    downloadedBundlePresent = true
    if (requireRegularFile('Downloaded release bundle manifest', manifestPath)) {
      let manifest
      try { manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) } catch { failures.push('Downloaded release bundle manifest must be valid JSON') }
      if (manifest) {
        const currentWorkflowRunId = (process.env.GITHUB_RUN_ID || '').trim()
        if (!/^\d+$/.test(currentWorkflowRunId)) failures.push('GITHUB_RUN_ID must be present before validating a downloaded release bundle')
        else if (manifest.workflowRunId !== currentWorkflowRunId) failures.push(`Downloaded release bundle workflow run mismatch: expected ${currentWorkflowRunId}, found ${manifest.workflowRunId || 'missing'}`)
        else downloadedBundleRunBound = true
        const fingerprintPath = path.join(bundleDirectory, 'urai-tier1', 'out', 'release-fingerprint.json')
        if (requireRegularFile('Downloaded release fingerprint', fingerprintPath)) {
          const actualFingerprintSha256 = sha256(fingerprintPath)
          if (!/^[0-9a-f]{64}$/.test(manifest.fingerprintSha256 || '')) failures.push('Downloaded release bundle manifest has an invalid fingerprintSha256')
          else if (manifest.fingerprintSha256 !== actualFingerprintSha256) failures.push('Downloaded release bundle fingerprint hash does not match the manifest')
          else downloadedBundleFingerprintBound = true
        }
      }
    }
  }
}

const report = {
  schemaVersion: 'urai-release-credential-boundary-4',
  ok: failures.length === 0 && process.exitCode !== 1 && (!liveRollbackProvenanceRequired || liveRollbackProvenanceVerified) && (!legacyBootstrapProofRequired || legacyBootstrapProofVerified),
  mode: quarantineMode ? 'quarantine-no-go' : 'active-release',
  lineEndingsNormalized: true,
  thirdPartyActionsPinned: true,
  rollbackAuthorityVerifierUsesCurrentAuthority: true,
  targetBuildIsolated: true,
  authorityAttestationIsolated: true,
  targetCodeExecutesInProductionJob: false,
  credentialsMaterializedByAuthorityOnly: !quarantineMode,
  unmanagedLocalCredentialPathsIgnoredDuringVerification: true,
  managedCredentialPathRequiredForProductionWrite: !quarantineMode,
  firebaseCliResolvedFromCurrentAuthority: !quarantineMode,
  releaseOperatorFullBundleVerificationPresent: !quarantineMode,
  productionMutationAvailable: !quarantineMode,
  productionCredentialsAvailable: !quarantineMode,
  liveRollbackProvenanceRequired,
  liveRollbackProvenanceVerified,
  legacyBootstrapRequested,
  legacyBootstrapProofRequired,
  legacyBootstrapProofVerified,
  downloadedBundleRequired,
  downloadedBundlePresent,
  downloadedBundleRunBound,
  downloadedBundleFingerprintBound,
  fullBundleVerificationStatus: quarantineMode ? 'not-applicable-release-quarantined' : downloadedBundleRequired ? 'pending-live-release-verify-prebuilt-step' : 'not-applicable-in-this-job',
  failures,
}
console.log(JSON.stringify(report, null, 2))
if (failures.length || (liveRollbackProvenanceRequired && !liveRollbackProvenanceVerified) || (legacyBootstrapProofRequired && !legacyBootstrapProofVerified)) process.exitCode = 1
