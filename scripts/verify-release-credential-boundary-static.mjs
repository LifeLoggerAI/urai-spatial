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
function requireMarker(label, source, marker) { if (!source.includes(marker)) failures.push(`${label} missing marker: ${marker}`) }
function forbid(label, source, pattern, description) { if (pattern.test(source)) failures.push(`${label} contains forbidden ${description}`) }
function jobSection(source, jobName) {
  const marker = `\n  ${jobName}:\n`; const start = source.indexOf(marker); if (start < 0) return ''
  const rest = source.slice(start + marker.length); const next = rest.search(/\n  [A-Za-z0-9_-]+:\n/)
  return next < 0 ? rest : rest.slice(0, next)
}

const verifyJob = jobSection(workflow, 'verify')
const buildTargetJob = jobSection(workflow, 'build-target')
const buildRecoveryJob = jobSection(workflow, 'build-recovery')
const attestJob = jobSection(workflow, 'attest-bundles')
const deployJob = jobSection(workflow, 'deploy')
for (const [name, section] of Object.entries({ verifyJob, buildTargetJob, buildRecoveryJob, attestJob, deployJob })) {
  if (!section) failures.push(`Workflow is missing ${name}`)
  const stepsStart = section.indexOf('\n    steps:'); const jobScope = stepsStart >= 0 ? section.slice(0, stepsStart) : section
  if (/\$\{\{\s*runner\./.test(jobScope)) failures.push(`Workflow ${name} uses runner context before steps`)
}
for (const [name, action] of Object.entries(immutableActions)) requireMarker(`Immutable ${name} action`, workflow, action)
forbid('Workflow', workflow, /uses:\s+actions\/(?:checkout|setup-node|upload-artifact|download-artifact)@v\d+/, 'mutable release action tag')

for (const marker of ['name: Exact-head v2 release verification', 'node scripts/verify-release-v2-boundary.mjs', 'pnpm verify:release:critical']) requireMarker('Verify job', verifyJob, marker)
for (const marker of ['name: Build exact target static output without production credentials', 'Checkout exact target only', 'path: target', 'pnpm build:static', 'Upload exact target raw output']) requireMarker('Target build job', buildTargetJob, marker)
for (const marker of ['name: Build exact recovery static output without production credentials', 'Checkout exact recovery target only', 'path: recovery', 'pnpm build:static', 'Upload exact recovery raw output']) requireMarker('Recovery build job', buildRecoveryJob, marker)
for (const [label, section] of [['Target build job', buildTargetJob], ['Recovery build job', buildRecoveryJob]]) {
  forbid(label, section, /environment:\s*production|FIREBASE_SERVICE_ACCOUNT_JSON|GOOGLE_APPLICATION_CREDENTIALS|--deploy-prebuilt/, 'production authority or credentials')
}
for (const marker of ['name: Attest target and recovery bundles with clean current authority', 'Download target raw output', 'Download recovery raw output', 'node scripts/create-static-release-bundle.mjs', 'Upload exact target bundle', 'Upload exact recovery bundle']) requireMarker('Attestation job', attestJob, marker)
forbid('Attestation job', attestJob, /environment:\s*production|FIREBASE_SERVICE_ACCOUNT_JSON|GOOGLE_APPLICATION_CREDENTIALS|pnpm\s+build:static/, 'production credentials or build')

const secretMarker = 'FIREBASE_SERVICE_ACCOUNT_JSON: ${{ secrets.FIREBASE_SERVICE_ACCOUNT_JSON }}'
const secretOccurrences = workflow.split(secretMarker).length - 1
if (secretOccurrences !== 1) failures.push(`Workflow must scope the service-account secret to exactly one step; found ${secretOccurrences}`)
if (!deployJob.includes(secretMarker)) failures.push('Raw service-account secret must occur only inside the protected deploy job')
const deployStepsStart = deployJob.indexOf('\n    steps:')
const deployJobEnvironment = deployStepsStart >= 0 ? deployJob.slice(0, deployStepsStart) : deployJob
if (deployJobEnvironment.includes('FIREBASE_SERVICE_ACCOUNT_JSON')) failures.push('Workflow exposes raw service-account secret at deploy-job scope')

for (const marker of [
  'name: Deploy target or restore exact attested recovery bundle on urai.app', 'environment: production',
  'Checkout current release authority only', 'pnpm install --frozen-lockfile --ignore-scripts',
  'Download exact target bundle', 'Download exact recovery bundle', 'node scripts/verify-release-credential-boundary.mjs',
  'Verify exact target bundle before production credentials exist', 'Verify exact recovery bundle before production credentials exist',
  'node scripts/live-release.mjs --verify-prebuilt', 'node scripts/live-release.mjs --deploy-prebuilt',
  'Primary operation failed with status', 'Recovery deployment succeeded; preserving failed release conclusion.',
  'Run canonical live smoke after successful target deployment',
  'GOOGLE_APPLICATION_CREDENTIALS: ${{ runner.temp }}/urai-firebase-service-account.json',
  'URAI_FIREBASE_CLI: ${{ github.workspace }}/node_modules/.bin/firebase', 'Remove temporary credentials',
]) requireMarker('Protected deploy job', deployJob, marker)
forbid('Protected deploy job', deployJob, /path:\s*target|path:\s*recovery|pnpm\s+build:static|node\s+\.\.\/authority\//, 'target execution')

const sequence = [
  'Checkout current release authority only', 'Install current authority dependencies with lifecycle scripts disabled',
  'Download exact target bundle', 'Download exact recovery bundle', 'Revalidate target credential and live provenance boundary',
  'Verify exact target bundle before production credentials exist', 'Verify exact recovery bundle before production credentials exist',
  secretMarker, 'node scripts/live-release.mjs --deploy-prebuilt', 'Run canonical live smoke after successful target deployment',
].map((marker) => deployJob.indexOf(marker))
if (sequence.some((index) => index < 0) || sequence.some((value, index) => index > 0 && value <= sequence[index - 1])) {
  failures.push('Protected deploy job must preserve authority, dual download, verification, secret, deploy, recovery, and smoke ordering')
}
const cleanupIndex = deployJob.indexOf('name: Remove temporary credentials')
if (cleanupIndex <= deployJob.indexOf('Run canonical live smoke after successful target deployment')) failures.push('Managed credential cleanup must remain after strict smoke')

for (const marker of [
  "process.argv.includes('--verify-prebuilt')", "process.argv.includes('--deploy-prebuilt')",
  'delete process.env.FIREBASE_SERVICE_ACCOUNT_JSON', 'delete process.env.GOOGLE_APPLICATION_CREDENTIALS',
  'delete env.FIREBASE_SERVICE_ACCOUNT_JSON', 'delete env.GOOGLE_APPLICATION_CREDENTIALS',
  'function resolveManagedCredentialPath({ required = false } = {})', 'Credential path must stay inside RUNNER_TEMP',
  'function validateAndMaterializePrebuiltBundle', "manifest.schemaVersion !== 'urai-static-release-bundle-1'",
  'Release bundle file set, sizes, or hashes do not match the manifest', 'Release bundle manifest totals do not match the verified files',
  'Materialized hosting output does not match the verified release bundle', 'function resolveAuthorityFirebaseCli()',
  'Firebase CLI must resolve inside current authority', 'function writeTemporaryServiceAccount()', "flag: 'wx'",
  'function deployHostingWithTemporaryCredentials()', 'childEnvironment({ GOOGLE_APPLICATION_CREDENTIALS: credentialFile }, true)',
  'shell: false', 'const credentialFile = writeTemporaryServiceAccount()',
]) requireMarker('Release operator', operator, marker)
forbid('Release operator', operator, /pnpm\s+exec\s+firebase/, 'package-manager-resolved Firebase CLI')
for (const marker of [
  "schemaVersion: 'urai-static-release-bundle-1'", 'assertCleanAuthorityCheckout()', 'writeAuthoritativeFingerprint()',
  "attestedBy: 'scripts/create-static-release-bundle.mjs'", 'Release bundle source must not contain symlinks',
  'Copied release bundle bytes do not match the source output', 'fingerprintSha256', 'authoritySha', 'targetSha',
  'rollbackSha', 'fileCount', 'totalBytes',
]) requireMarker('Authority bundle attester', bundleBuilder, marker)

const report = {
  schemaVersion: 'urai-release-credential-boundary-static-6', ok: failures.length === 0,
  secretOccurrences, rawSecretJobScoped: deployJobEnvironment.includes('FIREBASE_SERVICE_ACCOUNT_JSON'),
  lineEndingsNormalized: true, thirdPartyActionsPinned: true,
  rollbackAuthorityVerifierUsesCurrentAuthority: true, targetBuildIsolated: true,
  authorityAttestationIsolated: true, targetCodeExecutesInProductionJob: false,
  releaseOperatorVerifiesFullBundleManifest: true, credentialsMaterializedByAuthorityOnly: true,
  unmanagedLocalCredentialPathsIgnoredDuringVerification: true,
  managedCredentialPathRequiredForProductionWrite: true, firebaseCliResolvedFromCurrentAuthority: true,
  dualBundleAttestationRequired: true, artifactBackedRecoveryRequired: true,
  recoveredFailureMustRemainFailure: true, failures,
}
console.log(JSON.stringify(report, null, 2))
for (const failure of failures) console.error(`::error title=Release credential boundary::${failure.replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A')}`)
if (failures.length) process.exitCode = 1
