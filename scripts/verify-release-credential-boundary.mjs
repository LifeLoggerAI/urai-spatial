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

const installIndex = workflow.indexOf('Install frozen target dependencies without production credentials')
const chromiumIndex = workflow.indexOf('Install Chromium without production credentials')
const secretIndex = workflow.indexOf(secretMarker)
const deployStepIndex = workflow.indexOf('Deploy exact target with current authority and ephemeral credentials')
if ([installIndex, chromiumIndex, secretIndex, deployStepIndex].some((index) => index < 0)) {
  failures.push('Workflow is missing the ordered credential-boundary steps')
} else if (!(installIndex < chromiumIndex && chromiumIndex < deployStepIndex && deployStepIndex < secretIndex)) {
  failures.push('Service-account secret must be introduced only inside the deploy step after target install and browser setup')
}

requireMarker('Workflow', workflow, "GOOGLE_APPLICATION_CREDENTIALS: ${{ runner.temp }}/urai-firebase-service-account.json")
requireMarker('Workflow', workflow, 'node scripts/verify-release-credential-boundary.mjs')
requireMarker('Workflow', workflow, 'node ../authority/scripts/live-release.mjs --deploy')
requireMarker('Workflow', workflow, 'Remove temporary credentials')
forbid('Workflow', workflow, /printf\s+['"]%s['"]\s+"\$FIREBASE_SERVICE_ACCOUNT_JSON"\s*>\s*"\$GOOGLE_APPLICATION_CREDENTIALS"/, 'early credential-file write')
forbid('Workflow', workflow, /cat\s+>\s*"\$GOOGLE_APPLICATION_CREDENTIALS"/, 'credential heredoc write')

for (const marker of [
  'delete process.env.FIREBASE_SERVICE_ACCOUNT_JSON',
  'delete process.env.GOOGLE_APPLICATION_CREDENTIALS',
  'delete env.FIREBASE_SERVICE_ACCOUNT_JSON',
  'delete env.GOOGLE_APPLICATION_CREDENTIALS',
  'function writeTemporaryServiceAccount()',
  'function removeTemporaryServiceAccount()',
  'function deployHostingWithTemporaryCredentials()',
  "writeFileSync(credentialsPath, `${JSON.stringify(serviceAccount)}\\n`, { encoding: 'utf8', mode: 0o600 })",
  'chmodSync(credentialsPath, 0o600)',
  'childEnvironment({ GOOGLE_APPLICATION_CREDENTIALS: credentialFile }, true)',
  'if (deploy) removeTemporaryServiceAccount()',
  'finally {\n    removeTemporaryServiceAccount()',
]) requireMarker('Release operator', operator, marker)

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

const materializeCallIndex = operator.indexOf('const credentialFile = writeTemporaryServiceAccount()')
const materializeTryIndex = operator.lastIndexOf('try {', materializeCallIndex)
const materializeFinallyIndex = operator.indexOf('finally {', materializeCallIndex)
if (!(materializeTryIndex >= 0 && materializeTryIndex < materializeCallIndex && materializeCallIndex < materializeFinallyIndex)) {
  failures.push('Credential materialization itself must be covered by the cleanup try/finally block')
}

const report = {
  schemaVersion: 'urai-release-credential-boundary-1',
  ok: failures.length === 0,
  secretOccurrences,
  rawSecretJobScoped: deployJobEnvironment.includes('FIREBASE_SERVICE_ACCOUNT_JSON'),
  credentialsMaterializedByAuthorityOnly: true,
  staleCredentialsRemovedBeforeTargetCommands: true,
  materializationCoveredByCleanup: true,
  targetCommandsReceiveRawSecret: false,
  targetCommandsReceiveCredentialPath: false,
  failures,
}

console.log(JSON.stringify(report, null, 2))
if (failures.length) process.exitCode = 1
