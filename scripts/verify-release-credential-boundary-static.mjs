#!/usr/bin/env node
import { readFileSync } from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const normalizeNewlines = (source) => source.replace(/\r\n?/g, '\n')
const workflow = normalizeNewlines(readFileSync(path.join(root, '.github', 'workflows', 'spatial-live-deploy.yml'), 'utf8'))
const operator = normalizeNewlines(readFileSync(path.join(root, 'scripts', 'live-release.mjs'), 'utf8'))
const bundleBuilder = normalizeNewlines(readFileSync(path.join(root, 'scripts', 'create-static-release-bundle.mjs'), 'utf8'))
const failures = []

const immutableActions = {
  checkout: 'actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683',
  setupNode: 'actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020',
  uploadArtifact: 'actions/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02',
  downloadArtifact: 'actions/download-artifact@d3f86a106a0bac45b974a628896c90dbdf5c8093',
}

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

const verifyJob = jobSection(workflow, 'verify')
const rollbackJob = jobSection(workflow, 'rollback-verify')
const buildJob = jobSection(workflow, 'build-release-output')
const attestJob = jobSection(workflow, 'attest-release-bundle')
const deployJob = jobSection(workflow, 'deploy')
for (const [name, section] of Object.entries({ verifyJob, rollbackJob, buildJob, attestJob, deployJob })) {
  if (!section) {
    failures.push(`Workflow is missing ${name}`)
    continue
  }
  const stepsStart = section.indexOf('\n    steps:')
  const jobScope = stepsStart >= 0 ? section.slice(0, stepsStart) : section
  if (/\$\{\{\s*runner\./.test(jobScope)) {
    failures.push(`Workflow ${name} uses runner context before steps; runner context is not allowed at job scope`)
  }
}

for (const [name, action] of Object.entries(immutableActions)) requireMarker(`Immutable ${name} action`, workflow, action)
forbid('Workflow', workflow, /uses:\s+actions\/(?:checkout|setup-node|upload-artifact|download-artifact)@v\d+(?:\.\d+){0,2}/, 'mutable release action tag')
forbid('Workflow', workflow, /uses:\s+actions\/(?:checkout|setup-node|upload-artifact|download-artifact)@(?![0-9a-f]{40}(?:\s|#|$))[^\s]+/, 'non-immutable release action reference')
const approvedActions = new Set(Object.values(immutableActions))
for (const match of workflow.matchAll(/uses:\s+(actions\/(?:checkout|setup-node|upload-artifact|download-artifact)@[^\s]+)/g)) {
  if (!approvedActions.has(match[1])) failures.push(`Workflow uses an unapproved action reference: ${match[1]}`)
}

for (const marker of [
  'name: Exact-head release verification',
  'Verify target credential boundary',
  "if: github.event_name != 'workflow_dispatch' || inputs.confirm != 'ROLLBACK_URAI_APP'",
]) requireMarker('Exact-head verify job', verifyJob, marker)

for (const marker of [
  'name: Prove rollback target with current authority',
  'Checkout current release authority',
  'Verify current credential boundary',
  'working-directory: authority',
  'node scripts/verify-release-credential-boundary.mjs',
]) requireMarker('Rollback authority job', rollbackJob, marker)
forbid('Rollback authority job', rollbackJob, /working-directory:\s*target[\s\S]{0,200}verify-release-credential-boundary/, 'target-owned credential-boundary verification')

const secretMarker = 'FIREBASE_SERVICE_ACCOUNT_JSON: ${{ secrets.FIREBASE_SERVICE_ACCOUNT_JSON }}'
const secretOccurrences = workflow.split(secretMarker).length - 1
if (secretOccurrences !== 1) failures.push(`Workflow must scope the service-account secret to exactly one step; found ${secretOccurrences}`)
if (!deployJob.includes(secretMarker)) failures.push('Raw service-account secret must occur only inside the protected deploy job')
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
  immutableActions.downloadArtifact,
  'Download unattested raw static output',
  'node scripts/verify-release-credential-boundary.mjs',
  'node scripts/create-static-release-bundle.mjs',
  'Upload authority-attested static release bundle',
]) requireMarker('Authority attestation job', attestJob, marker)
forbid('Authority attestation job', attestJob, /environment:\s*production|FIREBASE_SERVICE_ACCOUNT_JSON|GOOGLE_APPLICATION_CREDENTIALS/, 'production authority or credentials')
forbid('Authority attestation job', attestJob, /path:\s*target|working-directory:\s*target|pnpm\s+(?:install|build:static)/, 'target checkout or execution')

const protectedDeployCommand = 'node scripts/live-release.mjs --' + 'deploy-prebuilt'
for (const marker of [
  'name: Deploy or roll back verified static bundle on urai.app',
  'needs: [verify, rollback-verify, attest-release-bundle]',
  'Checkout current release authority only',
  'pnpm install --frozen-lockfile --ignore-scripts',
  immutableActions.downloadArtifact,
  'node scripts/verify-release-credential-boundary.mjs',
  'node scripts/live-release.mjs --verify-prebuilt',
  protectedDeployCommand,
  'node scripts/urai-release-control-smoke.mjs',
  'GOOGLE_APPLICATION_CREDENTIALS: ${{ runner.temp }}/urai-firebase-service-account.json',
  'URAI_FIREBASE_CLI: ${{ github.workspace }}/node_modules/.bin/firebase',
  'Remove temporary credentials',
  'BOOTSTRAP_LEGACY_URAI_APP',
  'URAI_LEGACY_BOOTSTRAP:',
  'URAI_LEGACY_BOOTSTRAP_CONFIRM:',
]) requireMarker('Protected deploy job', deployJob, marker)
forbid('Protected deploy job', deployJob, /path:\s*target|working-directory:\s*target|Checkout (?:frozen|exact) (?:release )?target/, 'target checkout')
forbid('Protected deploy job', deployJob, /pnpm\s+build:static|node\s+\.\.\/authority\//, 'target build or cross-checkout authority execution')
forbid('Protected deploy job', deployJob, /pnpm\s+install\s+--frozen-lockfile(?!\s+--ignore-scripts)/, 'lifecycle-enabled dependency install')

const deployStepsStart = deployJob.indexOf('\n    steps:')
const deployJobEnvironment = deployStepsStart >= 0 ? deployJob.slice(0, deployStepsStart) : deployJob
if (deployStepsStart < 0) failures.push('Workflow is missing protected deploy steps')
else if (deployJobEnvironment.includes('FIREBASE_SERVICE_ACCOUNT_JSON')) failures.push('Workflow exposes raw service-account secret at deploy-job scope')

const sequence = [
  'Checkout current release authority only',
  'Install current authority dependencies with lifecycle scripts disabled',
  'Download exact static release bundle',
  'Revalidate current credential boundary',
  'Verify downloaded bundle before production credentials exist',
  secretMarker,
  protectedDeployCommand,
  'Run canonical live smoke with current authority',
].map((marker) => deployJob.indexOf(marker))
if (sequence.some((index) => index < 0) || sequence.some((value, index) => index > 0 && value <= sequence[index - 1])) {
  failures.push('Protected deploy job must preserve authority, download, verify, secret, deploy, and smoke ordering')
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
  'function resolveManagedCredentialPath({ required = false } = {})',
  'Credential path must stay inside RUNNER_TEMP',
  'function validateAndMaterializePrebuiltBundle',
  "manifest.schemaVersion !== 'urai-static-release-bundle-1'",
  'manifest.authoritySha !== authoritySha',
  'Release bundle file set, sizes, or hashes do not match the manifest',
  'Release bundle manifest totals do not match the verified files',
  'Materialized hosting output does not match the verified release bundle',
  'function resolveAuthorityFirebaseCli()',
  'Firebase CLI must resolve inside current authority',
  'function writeTemporaryServiceAccount()',
  "flag: 'wx'",
  'function removeTemporaryServiceAccount()',
  'function deployHostingWithTemporaryCredentials()',
  'childEnvironment({ GOOGLE_APPLICATION_CREDENTIALS: credentialFile }, true)',
  'shell: false',
  'finally {\n    removeTemporaryServiceAccount()',
]) requireMarker('Release operator', operator, marker)
forbid('Release operator', operator, /pnpm\s+exec\s+firebase/, 'package-manager-resolved Firebase CLI')

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
  'fileCount',
  'totalBytes',
]) requireMarker('Authority bundle attester', bundleBuilder, marker)

const report = {
  schemaVersion: 'urai-release-credential-boundary-static-4',
  ok: failures.length === 0,
  secretOccurrences,
  rawSecretJobScoped: deployJobEnvironment.includes('FIREBASE_SERVICE_ACCOUNT_JSON'),
  lineEndingsNormalized: true,
  thirdPartyActionsPinned: true,
  rollbackAuthorityVerifierUsesCurrentAuthority: true,
  targetBuildIsolated: true,
  authorityAttestationIsolated: true,
  targetCodeExecutesInProductionJob: false,
  releaseOperatorVerifiesFullBundleManifest: true,
  credentialsMaterializedByAuthorityOnly: true,
  unmanagedLocalCredentialPathsIgnoredDuringVerification: true,
  managedCredentialPathRequiredForProductionWrite: true,
  firebaseCliResolvedFromCurrentAuthority: true,
  failures,
}

console.log(JSON.stringify(report, null, 2))
if (failures.length) process.exitCode = 1
