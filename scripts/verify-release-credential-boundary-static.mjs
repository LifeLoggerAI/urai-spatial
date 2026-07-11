#!/usr/bin/env node
import { readFileSync } from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const workflowPath = path.join(root, '.github', 'workflows', 'spatial-live-deploy.yml')
const operatorPath = path.join(root, 'scripts', 'live-release.mjs')
const bundlePath = path.join(root, 'scripts', 'create-static-release-bundle.mjs')
const normalizeNewlines = (source) => source.replace(/\r\n?/g, '\n')
const workflow = normalizeNewlines(readFileSync(workflowPath, 'utf8'))
const operator = normalizeNewlines(readFileSync(operatorPath, 'utf8'))
const bundleBuilder = normalizeNewlines(readFileSync(bundlePath, 'utf8'))
const failures = []

function requireMarker(label, source, marker) {
  if (!source.includes(marker)) failures.push(`${label} missing marker: ${marker}`)
}

function forbid(label, source, pattern, description) {
  if (pattern.test(source)) failures.push(`${label} contains forbidden ${description}`)
}

function jobSection(source, jobName) {
  const marker = `\n  ${jobName}:\n`
  const start = source.indexOf(marker)
  if (start < 0) return ''
  const rest = source.slice(start + marker.length)
  const next = rest.search(/\n  [A-Za-z0-9_-]+:\n/)
  return next < 0 ? rest : rest.slice(0, next)
}

const buildJob = jobSection(workflow, 'build-release-output')
const attestJob = jobSection(workflow, 'attest-release-bundle')
const deployJob = jobSection(workflow, 'deploy')
if (!buildJob) failures.push('Workflow is missing the target-only build-release-output job')
if (!attestJob) failures.push('Workflow is missing the clean authority attest-release-bundle job')
if (!deployJob) failures.push('Workflow is missing the protected deploy job')

const secretMarker = 'FIREBASE_SERVICE_ACCOUNT_JSON: ${{ secrets.FIREBASE_SERVICE_ACCOUNT_JSON }}'
const secretOccurrences = workflow.split(secretMarker).length - 1
if (secretOccurrences !== 1) failures.push(`Workflow must scope the service-account secret to exactly one step; found ${secretOccurrences}`)
if (!deployJob.includes(secretMarker)) failures.push('The raw service-account secret must occur only inside the protected deploy job')
if (buildJob.includes(secretMarker) || attestJob.includes(secretMarker)) failures.push('Build and attestation jobs must not receive the raw service-account secret')

for (const marker of [
  'name: Build exact static target without production authority or credentials',
  'needs: [verify, rollback-verify]',
  'Checkout exact release target only',
  'path: target',
  'pnpm install --frozen-lockfile',
  'pnpm build:static',
  'Upload unattested raw static output',
  'urai-raw-static-output-${{ env.RELEASE_SHA }}',
]) requireMarker('Target-only build job', buildJob, marker)
forbid('Target-only build job', buildJob, /environment:\s*production/, 'production environment')
forbid('Target-only build job', buildJob, /FIREBASE_SERVICE_ACCOUNT_JSON|GOOGLE_APPLICATION_CREDENTIALS/, 'production credentials')
forbid('Target-only build job', buildJob, /Checkout .*authority|node\s+scripts\/create-static-release-bundle\.mjs/, 'authority execution')
forbid('Target-only build job', buildJob, /firebase\s+deploy|--deploy-prebuilt/, 'deployment command')

for (const marker of [
  'name: Attest raw static output with clean current authority',
  'needs: [verify, rollback-verify, build-release-output]',
  'Checkout clean current release authority only',
  'Download unattested raw static output',
  'node scripts/verify-release-credential-boundary.mjs',
  'node scripts/create-static-release-bundle.mjs',
  'Upload authority-attested static release bundle',
  'urai-static-release-bundle-${{ env.RELEASE_SHA }}',
]) requireMarker('Clean authority attestation job', attestJob, marker)
forbid('Clean authority attestation job', attestJob, /environment:\s*production/, 'production environment')
forbid('Clean authority attestation job', attestJob, /FIREBASE_SERVICE_ACCOUNT_JSON|GOOGLE_APPLICATION_CREDENTIALS/, 'production credentials')
forbid('Clean authority attestation job', attestJob, /path:\s*target|working-directory:\s*target|pnpm\s+(?:install|build:static)/, 'target checkout or execution')
forbid('Clean authority attestation job', attestJob, /firebase\s+deploy|--deploy-prebuilt/, 'deployment command')

const protectedDeployCommand = 'node scripts/live-release.mjs --' + 'deploy-prebuilt'
for (const marker of [
  'name: Deploy or roll back verified static bundle on urai.app',
  'needs: [verify, rollback-verify, attest-release-bundle]',
  'Checkout current release authority only',
  'pnpm install --frozen-lockfile --ignore-scripts',
  'actions/download-artifact@v4',
  'node scripts/verify-release-credential-boundary.mjs',
  'node scripts/live-release.mjs --verify-prebuilt',
  protectedDeployCommand,
  'node scripts/urai-release-control-smoke.mjs',
  'GOOGLE_APPLICATION_CREDENTIALS: ${{ runner.temp }}/urai-firebase-service-account.json',
  'URAI_FIREBASE_CLI: ${{ github.workspace }}/node_modules/.bin/firebase',
  'Remove temporary credentials',
]) requireMarker('Protected deploy job', deployJob, marker)
forbid('Protected deploy job', deployJob, /path:\s*target|working-directory:\s*target|Checkout (?:frozen|exact) (?:release )?target/, 'target checkout')
forbid('Protected deploy job', deployJob, /pnpm\s+build:static|node\s+\.\.\/authority\//, 'target build or cross-checkout authority execution')
forbid('Protected deploy job', deployJob, /pnpm\s+install\s+--frozen-lockfile(?!\s+--ignore-scripts)/, 'lifecycle-enabled dependency install')

const deployStepsStart = deployJob.indexOf('\n    steps:')
const deployJobEnvironment = deployStepsStart >= 0 ? deployJob.slice(0, deployStepsStart) : deployJob
if (!deployJob || deployStepsStart < 0) failures.push('Workflow is missing the protected deploy job steps definition')
else if (deployJobEnvironment.includes('FIREBASE_SERVICE_ACCOUNT_JSON')) failures.push('Workflow exposes the raw service-account secret at deploy-job scope')

const authorityCheckoutIndex = deployJob.indexOf('Checkout current release authority only')
const authorityInstallIndex = deployJob.indexOf('Install current authority dependencies with lifecycle scripts disabled')
const downloadIndex = deployJob.indexOf('Download exact static release bundle')
const verifyBoundaryIndex = deployJob.indexOf('Revalidate current credential boundary')
const verifyPrebuiltIndex = deployJob.indexOf('Verify downloaded bundle before production credentials exist')
const secretIndex = deployJob.indexOf(secretMarker)
const deployPrebuiltIndex = deployJob.indexOf(protectedDeployCommand)
const smokeIndex = deployJob.indexOf('Run canonical live smoke with current authority')
const orderedIndexes = [authorityCheckoutIndex, authorityInstallIndex, downloadIndex, verifyBoundaryIndex, verifyPrebuiltIndex, secretIndex, deployPrebuiltIndex, smokeIndex]
if (orderedIndexes.some((index) => index < 0)) failures.push('Protected deploy job is missing the authority/download/verify/secret/deploy/smoke sequence')
else if (!(authorityCheckoutIndex < authorityInstallIndex && authorityInstallIndex < downloadIndex && downloadIndex < verifyBoundaryIndex && verifyBoundaryIndex < verifyPrebuiltIndex && verifyPrebuiltIndex < secretIndex && secretIndex < deployPrebuiltIndex && deployPrebuiltIndex < smokeIndex)) {
  failures.push('Protected deploy job must verify the artifact before secret scope and smoke only after deployment cleanup')
}

forbid('Workflow', workflow, /printf\s+['"]%s['"]\s+"\$FIREBASE_SERVICE_ACCOUNT_JSON"\s*>\s*"\$GOOGLE_APPLICATION_CREDENTIALS"/, 'early credential-file write')
forbid('Workflow', workflow, /cat\s+>\s*"\$GOOGLE_APPLICATION_CREDENTIALS"/, 'credential heredoc write')
forbid('Workflow', workflow, /working-directory:\s*target[\s\S]{0,300}pnpm\s+exec\s+firebase\s+deploy/, 'target-resolved Firebase deploy')

for (const marker of [
  "process.argv.includes('--verify-prebuilt')",
  "process.argv.includes('--deploy-prebuilt')",
  'delete process.env.FIREBASE_SERVICE_ACCOUNT_JSON',
  'delete process.env.GOOGLE_APPLICATION_CREDENTIALS',
  'delete env.FIREBASE_SERVICE_ACCOUNT_JSON',
  'delete env.GOOGLE_APPLICATION_CREDENTIALS',
  'const managedCredentialFilename',
  'function resolveManagedCredentialPath({ required = false } = {})',
  'resolveManagedCredentialPath({ required: true })',
  'Credential path must stay inside RUNNER_TEMP',
  'function validateAndMaterializePrebuiltBundle',
  "manifest.schemaVersion !== 'urai-static-release-bundle-1'",
  'manifest.authoritySha !== authoritySha',
  'Release bundle file set, sizes, or hashes do not match the manifest',
  'function resolveAuthorityFirebaseCli()',
  'realpathSync(firebaseCliPath)',
  'Firebase CLI must resolve inside current authority',
  'function writeTemporaryServiceAccount()',
  "flag: 'wx'",
  'function removeTemporaryServiceAccount()',
  'function deployHostingWithTemporaryCredentials()',
  'childEnvironment({ GOOGLE_APPLICATION_CREDENTIALS: credentialFile }, true)',
  'spawnSync(\n      authorityFirebaseCli',
  'shell: false',
  '\nremoveTemporaryServiceAccount()\nconst authoritySha',
  'finally {\n    removeTemporaryServiceAccount()',
]) requireMarker('Release operator', operator, marker)
forbid('Release operator', operator, /pnpm\s+exec\s+firebase/, 'package-manager-resolved Firebase CLI')
forbid('Release operator', operator, /spawnSync\(\s*['"]pnpm['"][\s\S]{0,200}['"]firebase['"]/, 'pnpm-spawned Firebase CLI')

const unconditionalCleanupIndex = operator.indexOf('\nremoveTemporaryServiceAccount()\nconst authoritySha')
const authorityResolutionIndex = operator.indexOf('const authoritySha = resolveAuthoritySha()')
const readOnlyVerifyIndex = operator.indexOf('validateAndMaterializePrebuiltBundle(targetSha, authoritySha, false)')
const protectedMaterializeIndex = operator.lastIndexOf('validateAndMaterializePrebuiltBundle(targetSha, authoritySha)')
const deployCallIndex = operator.lastIndexOf('\ndeployHostingWithTemporaryCredentials()')
const credentialMaterializeIndex = operator.indexOf('const credentialFile = writeTemporaryServiceAccount()')
const firebaseSpawnIndex = operator.indexOf('spawnSync(\n      authorityFirebaseCli', credentialMaterializeIndex)
const cleanupIndex = operator.indexOf('finally {\n    removeTemporaryServiceAccount()', credentialMaterializeIndex)
if ([unconditionalCleanupIndex, authorityResolutionIndex, readOnlyVerifyIndex, protectedMaterializeIndex, deployCallIndex, credentialMaterializeIndex, firebaseSpawnIndex, cleanupIndex].some((index) => index < 0)) {
  failures.push('Release operator is missing cleanup, prebuilt verification/materialization, deploy call, or credential-scoped Firebase execution')
} else {
  const mainOrderOk = unconditionalCleanupIndex < authorityResolutionIndex && authorityResolutionIndex < readOnlyVerifyIndex && readOnlyVerifyIndex < protectedMaterializeIndex && protectedMaterializeIndex < deployCallIndex
  const helperOrderOk = credentialMaterializeIndex < firebaseSpawnIndex && firebaseSpawnIndex < cleanupIndex
  if (!mainOrderOk || !helperOrderOk) failures.push('Release operator must clean before verification, verify read-only, materialize verified bytes, call deploy, and scope credentials only around authority Firebase execution')
}

for (const marker of [
  "schemaVersion: 'urai-static-release-bundle-1'",
  'assertCleanAuthorityCheckout()',
  'writeAuthoritativeFingerprint()',
  "attestedBy: 'scripts/create-static-release-bundle.mjs'",
  'Release bundle source must not contain symlinks',
  'Copied release bundle bytes do not match the source output',
  'fingerprintSha256',
  'authoritySha',
  'targetSha',
  'rollbackSha',
  'sha256',
  'fileCount',
  'totalBytes',
  'Release bundle live URL is invalid or missing',
]) requireMarker('Authority bundle attester', bundleBuilder, marker)

const report = {
  schemaVersion: 'urai-release-credential-boundary-2',
  ok: failures.length === 0,
  secretOccurrences,
  rawSecretJobScoped: deployJobEnvironment.includes('FIREBASE_SERVICE_ACCOUNT_JSON'),
  lineEndingsNormalized: true,
  targetBuildIsolated: true,
  authorityAttestationIsolated: true,
  targetCodeExecutesInProductionJob: false,
  prebuiltArtifactHashVerified: true,
  credentialsMaterializedByAuthorityOnly: true,
  unmanagedLocalCredentialPathsIgnoredDuringVerification: true,
  managedCredentialPathRequiredForProductionWrite: true,
  firebaseCliResolvedFromCurrentAuthority: true,
  failures,
}

console.log(JSON.stringify(report, null, 2))
if (failures.length) process.exitCode = 1
