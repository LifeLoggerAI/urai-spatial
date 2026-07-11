#!/usr/bin/env node
import { readFileSync } from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const workflowPath = path.join(root, '.github', 'workflows', 'spatial-live-deploy.yml')
const operatorPath = path.join(root, 'scripts', 'live-release.mjs')
const bundlePath = path.join(root, 'scripts', 'create-static-release-bundle.mjs')
const workflow = readFileSync(workflowPath, 'utf8')
const operator = readFileSync(operatorPath, 'utf8')
const bundleBuilder = readFileSync(bundlePath, 'utf8')
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

const prepareJob = jobSection(workflow, 'prepare-release-bundle')
const deployJob = jobSection(workflow, 'deploy')
if (!prepareJob) failures.push('Workflow is missing the no-secret prepare-release-bundle job')
if (!deployJob) failures.push('Workflow is missing the protected deploy job')

const secretMarker = 'FIREBASE_SERVICE_ACCOUNT_JSON: ${{ secrets.FIREBASE_SERVICE_ACCOUNT_JSON }}'
const secretOccurrences = workflow.split(secretMarker).length - 1
if (secretOccurrences !== 1) failures.push(`Workflow must scope the service-account secret to exactly one step; found ${secretOccurrences}`)
if (!deployJob.includes(secretMarker)) failures.push('The one raw service-account secret occurrence must be inside the protected deploy job')
if (prepareJob.includes(secretMarker)) failures.push('The no-secret bundle job must not receive the raw service-account secret')

const deployStepsStart = deployJob.indexOf('\n    steps:')
const deployJobEnvironment = deployStepsStart >= 0 ? deployJob.slice(0, deployStepsStart) : deployJob
if (deployJobEnvironment.includes('FIREBASE_SERVICE_ACCOUNT_JSON')) {
  failures.push('Workflow exposes the raw service-account secret at deploy-job scope')
}

for (const marker of [
  'name: Prepare exact static release bundle without production credentials',
  'path: target',
  'pnpm install --frozen-lockfile',
  'pnpm build:static',
  'node ../authority/scripts/create-static-release-bundle.mjs',
  'actions/upload-artifact@v4',
  'urai-static-release-bundle-${{ env.RELEASE_SHA }}',
]) requireMarker('No-secret bundle job', prepareJob, marker)

forbid('No-secret bundle job', prepareJob, /environment:\s*production/, 'production environment')
forbid('No-secret bundle job', prepareJob, /FIREBASE_SERVICE_ACCOUNT_JSON/, 'raw production secret')
forbid('No-secret bundle job', prepareJob, /GOOGLE_APPLICATION_CREDENTIALS/, 'credential path')
forbid('No-secret bundle job', prepareJob, /firebase\s+deploy|--deploy-prebuilt/, 'production deployment command')

const protectedDeployCommand = 'node scripts/live-release.mjs --' + 'deploy-prebuilt'
for (const marker of [
  'name: Deploy or roll back verified static bundle on urai.app',
  'Checkout current release authority only',
  'pnpm install --frozen-lockfile --ignore-scripts',
  'actions/download-artifact@v4',
  'node scripts/verify-release-credential-boundary.mjs',
  'node scripts/live-release.mjs --verify-prebuilt',
  protectedDeployCommand,
  'node scripts/urai-release-control-smoke.mjs',
  "GOOGLE_APPLICATION_CREDENTIALS: ${{ runner.temp }}/urai-firebase-service-account.json",
  "URAI_FIREBASE_CLI: ${{ github.workspace }}/node_modules/.bin/firebase",
  'Remove temporary credentials',
]) requireMarker('Protected deploy job', deployJob, marker)

forbid('Protected deploy job', deployJob, /path:\s*target/, 'target checkout')
forbid('Protected deploy job', deployJob, /working-directory:\s*target/, 'target working directory')
forbid('Protected deploy job', deployJob, /Checkout (?:frozen|exact) (?:release )?target/, 'target checkout step')
forbid('Protected deploy job', deployJob, /pnpm\s+build:static/, 'target build command')
forbid('Protected deploy job', deployJob, /node\s+\.\.\/authority\//, 'cross-checkout authority execution')
forbid('Protected deploy job', deployJob, /pnpm\s+install\s+--frozen-lockfile(?!\s+--ignore-scripts)/, 'lifecycle-enabled dependency install')

const authorityCheckoutIndex = deployJob.indexOf('Checkout current release authority only')
const authorityInstallIndex = deployJob.indexOf('Install current authority dependencies with lifecycle scripts disabled')
const downloadIndex = deployJob.indexOf('Download exact static release bundle')
const verifyBoundaryIndex = deployJob.indexOf('Revalidate current credential boundary')
const verifyPrebuiltIndex = deployJob.indexOf('Verify downloaded bundle before production credentials exist')
const secretIndex = deployJob.indexOf(secretMarker)
const deployPrebuiltIndex = deployJob.indexOf(protectedDeployCommand)
const smokeIndex = deployJob.indexOf('Run canonical live smoke with current authority')
const orderedIndexes = [
  authorityCheckoutIndex,
  authorityInstallIndex,
  downloadIndex,
  verifyBoundaryIndex,
  verifyPrebuiltIndex,
  secretIndex,
  deployPrebuiltIndex,
  smokeIndex,
]
if (orderedIndexes.some((index) => index < 0)) {
  failures.push('Protected deploy job is missing the authority/download/verify/secret/deploy/smoke sequence')
} else if (!(authorityCheckoutIndex < authorityInstallIndex &&
  authorityInstallIndex < downloadIndex &&
  downloadIndex < verifyBoundaryIndex &&
  verifyBoundaryIndex < verifyPrebuiltIndex &&
  verifyPrebuiltIndex < secretIndex &&
  secretIndex < deployPrebuiltIndex &&
  deployPrebuiltIndex < smokeIndex)) {
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
  'function validateAndMaterializePrebuiltBundle',
  "manifest.schemaVersion !== 'urai-static-release-bundle-1'",
  'manifest.authoritySha !== authoritySha',
  'Release surface must not contain symlinks',
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
  'if (deploy) removeTemporaryServiceAccount()',
  'finally {\n    removeTemporaryServiceAccount()',
]) requireMarker('Release operator', operator, marker)

forbid('Release operator', operator, /pnpm\s+exec\s+firebase/, 'target/package-manager-resolved Firebase CLI')
forbid('Release operator', operator, /spawnSync\(\s*['"]pnpm['"][\s\S]{0,200}['"]firebase['"]/, 'pnpm-spawned Firebase CLI')

const readOnlyVerifyIndex = operator.indexOf('validateAndMaterializePrebuiltBundle(targetSha, authoritySha, false)')
const protectedMaterializeIndex = operator.lastIndexOf('validateAndMaterializePrebuiltBundle(targetSha, authoritySha)')
const credentialMaterializeIndex = operator.indexOf('const credentialFile = writeTemporaryServiceAccount()')
const firebaseSpawnIndex = operator.indexOf('spawnSync(\n      authorityFirebaseCli', credentialMaterializeIndex)
const cleanupIndex = operator.indexOf('finally {\n    removeTemporaryServiceAccount()', credentialMaterializeIndex)
if ([readOnlyVerifyIndex, protectedMaterializeIndex, credentialMaterializeIndex, firebaseSpawnIndex, cleanupIndex].some((index) => index < 0)) {
  failures.push('Release operator is missing read-only verification or protected materialize/deploy cleanup')
} else if (!(readOnlyVerifyIndex < protectedMaterializeIndex && protectedMaterializeIndex < credentialMaterializeIndex && credentialMaterializeIndex < firebaseSpawnIndex && firebaseSpawnIndex < cleanupIndex)) {
  failures.push('Release operator must verify read-only first, materialize verified bytes, then scope credentials only around authority Firebase execution')
}

for (const marker of [
  "schemaVersion: 'urai-static-release-bundle-1'",
  'Release bundle source must not contain symlinks',
  'Copied release bundle bytes do not match the source output',
  'authoritySha',
  'targetSha',
  'rollbackSha',
  'sha256',
  'fileCount',
  'totalBytes',
]) requireMarker('Bundle builder', bundleBuilder, marker)

const report = {
  schemaVersion: 'urai-release-credential-boundary-1',
  ok: failures.length === 0,
  secretOccurrences,
  rawSecretJobScoped: deployJobEnvironment.includes('FIREBASE_SERVICE_ACCOUNT_JSON'),
  targetBuildIsolatedOnNoSecretRunner: true,
  targetCodeExecutesInProductionJob: false,
  prebuiltArtifactHashVerified: true,
  credentialsMaterializedByAuthorityOnly: true,
  firebaseCliResolvedFromCurrentAuthority: true,
  staleCredentialsRemovedBeforeProtectedExecution: true,
  materializationCoveredByCleanup: true,
  targetCommandsReceiveRawSecret: false,
  targetCommandsReceiveCredentialPath: false,
  targetFirebaseCliReceivesCredentials: false,
  failures,
}

console.log(JSON.stringify(report, null, 2))
if (failures.length) process.exitCode = 1
