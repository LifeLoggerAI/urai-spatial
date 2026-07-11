#!/usr/bin/env node
import { readFileSync } from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const workflowPath = path.join(root, '.github', 'workflows', 'spatial-live-deploy.yml')
const operatorPath = path.join(root, 'scripts', 'live-release.mjs')
const workflow = readFileSync(workflowPath, 'utf8')
const operator = readFileSync(operatorPath, 'utf8')
const failures = []

function requireMarker(label, source, marker) {
  if (!source.includes(marker)) failures.push(`${label} missing marker: ${marker}`)
}

function forbid(label, source, pattern, description) {
  if (pattern.test(source)) failures.push(`${label} contains forbidden ${description}`)
}

const secretMarker = 'FIREBASE_SERVICE_ACCOUNT_JSON: ${{ secrets.FIREBASE_SERVICE_ACCOUNT_JSON }}'
const secretOccurrences = workflow.split(secretMarker).length - 1
if (secretOccurrences !== 1) failures.push(`Workflow must scope the service-account secret to exactly one step; found ${secretOccurrences}`)

const deployJobStart = workflow.indexOf('\n  deploy:')
const deployStepsStart = workflow.indexOf('\n    steps:', deployJobStart)
const deployJobEnvironment = workflow.slice(deployJobStart, deployStepsStart)
if (deployJobEnvironment.includes('FIREBASE_SERVICE_ACCOUNT_JSON')) {
  failures.push('Workflow exposes the raw service-account secret at deploy-job scope')
}

const authorityInstallIndex = workflow.indexOf('Install current authority dependencies without production credentials')
const targetInstallIndex = workflow.indexOf('Install frozen target dependencies without production credentials')
const chromiumIndex = workflow.indexOf('Install Chromium without production credentials')
const deployStepIndex = workflow.indexOf('Deploy exact target with current authority and ephemeral credentials')
const secretIndex = workflow.indexOf(secretMarker)
if ([authorityInstallIndex, targetInstallIndex, chromiumIndex, deployStepIndex, secretIndex].some((index) => index < 0)) {
  failures.push('Workflow is missing the ordered credential-boundary steps')
} else if (!(authorityInstallIndex < targetInstallIndex && targetInstallIndex < chromiumIndex && chromiumIndex < deployStepIndex && deployStepIndex < secretIndex)) {
  failures.push('Authority and target dependencies must install before the one credential-scoped deploy step')
}

for (const marker of [
  "GOOGLE_APPLICATION_CREDENTIALS: ${{ runner.temp }}/urai-firebase-service-account.json",
  "URAI_FIREBASE_CLI: ${{ github.workspace }}/authority/node_modules/.bin/firebase",
  'node scripts/verify-release-credential-boundary.mjs',
  'node ../authority/scripts/live-release.mjs --deploy',
  'Remove temporary credentials',
]) requireMarker('Workflow', workflow, marker)

forbid('Workflow', workflow, /printf\s+['"]%s['"]\s+"\$FIREBASE_SERVICE_ACCOUNT_JSON"\s*>\s*"\$GOOGLE_APPLICATION_CREDENTIALS"/, 'early credential-file write')
forbid('Workflow', workflow, /cat\s+>\s*"\$GOOGLE_APPLICATION_CREDENTIALS"/, 'credential heredoc write')
forbid('Workflow', workflow, /working-directory:\s*target[\s\S]{0,300}pnpm\s+exec\s+firebase\s+deploy/, 'target-resolved Firebase deploy')

for (const marker of [
  'const firebaseCliPath',
  'delete process.env.FIREBASE_SERVICE_ACCOUNT_JSON',
  'delete process.env.GOOGLE_APPLICATION_CREDENTIALS',
  'delete env.FIREBASE_SERVICE_ACCOUNT_JSON',
  'delete env.GOOGLE_APPLICATION_CREDENTIALS',
  'function resolveAuthorityFirebaseCli()',
  "realpathSync(path.resolve(authorityDirectory, '..'))",
  'realpathSync(firebaseCliPath)',
  'resolvedCli.startsWith(`${authorityRoot}${path.sep}`)',
  'function writeTemporaryServiceAccount()',
  'function removeTemporaryServiceAccount()',
  'function deployHostingWithTemporaryCredentials()',
  "writeFileSync(credentialsPath, `${JSON.stringify(serviceAccount)}\\n`, { encoding: 'utf8', mode: 0o600 })",
  'chmodSync(credentialsPath, 0o600)',
  'childEnvironment({ GOOGLE_APPLICATION_CREDENTIALS: credentialFile }, true)',
  'spawnSync(\n      authorityFirebaseCli',
  'shell: false',
  'if (deploy) removeTemporaryServiceAccount()',
  'finally {\n    removeTemporaryServiceAccount()',
]) requireMarker('Release operator', operator, marker)

forbid('Release operator', operator, /pnpm\s+exec\s+firebase/, 'target/package-manager-resolved Firebase CLI')
forbid('Release operator', operator, /spawnSync\(\s*['"]pnpm['"][\s\S]{0,200}['"]firebase['"]/, 'pnpm-spawned Firebase CLI')

const staleCleanupIndex = operator.indexOf('if (deploy) removeTemporaryServiceAccount()')
const verifyIndex = operator.indexOf("run('pnpm', ['verify:release:critical']")
const buildIndex = operator.indexOf("run('pnpm', ['build:static']")
const deployCallIndex = operator.lastIndexOf('deployHostingWithTemporaryCredentials()')
const smokeIndex = operator.lastIndexOf("run('node', [postDeploySmoke]")
if ([staleCleanupIndex, verifyIndex, buildIndex, deployCallIndex, smokeIndex].some((index) => index < 0)) {
  failures.push('Release operator is missing the required cleanup/verify/build/deploy/smoke sequence')
} else if (!(staleCleanupIndex < verifyIndex && verifyIndex < buildIndex && buildIndex < deployCallIndex && deployCallIndex < smokeIndex)) {
  failures.push('Release operator must remove stale credentials, verify and build without them, deploy ephemerally, then smoke after cleanup')
}

const cliResolutionIndex = operator.indexOf('const authorityFirebaseCli = resolveAuthorityFirebaseCli()')
const materializeCallIndex = operator.indexOf('const credentialFile = writeTemporaryServiceAccount()')
const materializeTryIndex = operator.lastIndexOf('try {', materializeCallIndex)
const materializeFinallyIndex = operator.indexOf('finally {', materializeCallIndex)
const authoritySpawnIndex = operator.indexOf('spawnSync(\n      authorityFirebaseCli', materializeCallIndex)
if (!(materializeTryIndex >= 0 && materializeTryIndex < cliResolutionIndex && cliResolutionIndex < materializeCallIndex && materializeCallIndex < authoritySpawnIndex && authoritySpawnIndex < materializeFinallyIndex)) {
  failures.push('Authority CLI resolution, credential materialization, and deploy must all be covered by one cleanup try/finally block')
}

const report = {
  schemaVersion: 'urai-release-credential-boundary-1',
  ok: failures.length === 0,
  secretOccurrences,
  rawSecretJobScoped: deployJobEnvironment.includes('FIREBASE_SERVICE_ACCOUNT_JSON'),
  credentialsMaterializedByAuthorityOnly: true,
  firebaseCliResolvedFromCurrentAuthority: true,
  staleCredentialsRemovedBeforeTargetCommands: true,
  materializationCoveredByCleanup: true,
  targetCommandsReceiveRawSecret: false,
  targetCommandsReceiveCredentialPath: false,
  targetFirebaseCliReceivesCredentials: false,
  failures,
}

console.log(JSON.stringify(report, null, 2))
if (failures.length) process.exitCode = 1
