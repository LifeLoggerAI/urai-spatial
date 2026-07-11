#!/usr/bin/env node
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const workflowsDir = path.join(root, '.github', 'workflows')
const scriptsDir = path.join(root, 'scripts')
const canonicalWorkflowPath = '.github/workflows/spatial-live-deploy.yml'
const securityWorkflowPath = '.github/workflows/release-security-path-guard.yml'
const canonicalProductionScript = 'scripts/live-release.mjs'
const failures = []

function normalize(source) {
  return source.replace(/\r\n?/g, '\n')
}

function read(relativePath) {
  const absolute = path.join(root, relativePath)
  if (!existsSync(absolute)) {
    failures.push(`Missing required authority file: ${relativePath}`)
    return ''
  }
  return normalize(readFileSync(absolute, 'utf8'))
}

function walk(directory) {
  if (!existsSync(directory)) return []
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolute = path.join(directory, entry.name)
    if (entry.isDirectory()) return walk(absolute)
    return entry.isFile() ? [absolute] : []
  })
}

function relative(file) {
  return path.relative(root, file).replaceAll('\\', '/')
}

function requireAll(label, source, markers) {
  for (const marker of markers) {
    if (!source.includes(marker)) failures.push(`${label} missing marker: ${marker}`)
  }
}

function forbidAny(label, source, markers) {
  for (const marker of markers) {
    if (source.includes(marker)) failures.push(`${label} contains forbidden marker: ${marker}`)
  }
}

function jobSection(source, jobName) {
  const marker = `\n  ${jobName}:\n`
  const start = source.indexOf(marker)
  if (start < 0) return ''
  const remainder = source.slice(start + marker.length)
  const nextJob = remainder.search(/\n  [A-Za-z0-9_-]+:\n/)
  return nextJob < 0 ? remainder : remainder.slice(0, nextJob)
}

function containsDirectFirebaseDeploy(source) {
  return [
    /\bfirebase(?:-tools)?(?:@[^\s'"`]+)?\s+deploy\b/i,
    /\b(?:run|spawnSync|execFileSync)\(\s*['"]firebase['"]\s*,\s*\[\s*['"]deploy['"]/i,
  ].some((pattern) => pattern.test(source))
}

function workflowExecutesProductionMutation(source) {
  return containsDirectFirebaseDeploy(source) ||
    /(?:run:\s*|\n\s*)node\s+scripts\/live-release\.mjs\s+--deploy-prebuilt\b/.test(source) ||
    /(?:run:\s*|\n\s*)pnpm\s+live:deploy\b/.test(source)
}

function scriptExecutesProductionMutation(source) {
  return containsDirectFirebaseDeploy(source) ||
    /process\.env\.URAI_DEPLOY_CONFIRM\s*!==\s*['"]DEPLOY_STATIC_URAI['"]/.test(source)
}

for (const retired of [
  'scripts/deploy-exact-static-release.mjs',
  'scripts/firebase-studio-polish-deploy-node.sh',
  'scripts/urai-aaa-proof-loop.sh',
  'scripts/urai-firebase-studio-static-release.mjs',
  'scripts/urai-proof-loop.mjs',
  'scripts/urai-v1-autopilot-retry.sh',
  'scripts/urai-v1-autopilot.sh',
]) {
  if (existsSync(path.join(root, retired))) failures.push(`Retired executable was restored: ${retired}`)
}

const productionScripts = []
for (const file of walk(scriptsDir)) {
  if (!/\.(?:mjs|cjs|js|sh)$/.test(file)) continue
  const name = relative(file)
  if (name === 'scripts/audit-production-workflow-authority.mjs') continue
  if (scriptExecutesProductionMutation(readFileSync(file, 'utf8'))) productionScripts.push(name)
}
if (productionScripts.length !== 1 || productionScripts[0] !== canonicalProductionScript) {
  failures.push(`Exactly one production mutation script is allowed (${canonicalProductionScript}); found ${productionScripts.sort().join(', ') || 'none'}`)
}

const productionWorkflows = []
if (!existsSync(workflowsDir)) {
  failures.push('Missing .github/workflows directory')
} else {
  for (const name of readdirSync(workflowsDir).filter((entry) => /\.ya?ml$/.test(entry))) {
    const source = normalize(readFileSync(path.join(workflowsDir, name), 'utf8'))
    if (workflowExecutesProductionMutation(source)) productionWorkflows.push(`.github/workflows/${name}`)
  }
}
if (productionWorkflows.length !== 1 || productionWorkflows[0] !== canonicalWorkflowPath) {
  failures.push(`Exactly one workflow may execute production mutation (${canonicalWorkflowPath}); found ${productionWorkflows.sort().join(', ') || 'none'}`)
}

const workflow = read(canonicalWorkflowPath)
const securityWorkflow = read(securityWorkflowPath)
const verifyJob = jobSection(workflow, 'verify')
const rollbackJob = jobSection(workflow, 'rollback-verify')
const buildJob = jobSection(workflow, 'build-release-output')
const attestJob = jobSection(workflow, 'attest-release-bundle')
const deployJob = jobSection(workflow, 'deploy')

requireAll('Canonical production workflow', workflow, [
  'name: URAI Canonical Production Release',
  "inputs.confirm == 'DEPLOY_URAI_APP' || inputs.confirm == 'ROLLBACK_URAI_APP'",
  'name: Exact-head release verification',
  'name: Prove rollback target with current authority',
  'name: Build exact static target without production authority or credentials',
  'name: Attest raw static output with clean current authority',
  'name: Deploy or roll back verified static bundle on urai.app',
  'actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683',
  'actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020',
  'actions/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02',
  'actions/download-artifact@d3f86a106a0bac45b974a628896c90dbdf5c8093',
  'git merge-base --is-ancestor',
  'gh workflow run spatial-live-deploy.yml --ref main',
])

for (const [name, section] of Object.entries({ verifyJob, rollbackJob, buildJob, attestJob, deployJob })) {
  if (!section) failures.push(`Canonical production workflow is missing job: ${name}`)
}

requireAll('Target-only build job', buildJob, [
  'Checkout exact release target only',
  'path: target',
  'pnpm install --frozen-lockfile',
  'pnpm build:static',
  'Upload unattested raw static output',
])
forbidAny('Target-only build job', buildJob, [
  'environment: production',
  'FIREBASE_SERVICE_ACCOUNT_JSON',
  'GOOGLE_APPLICATION_CREDENTIALS',
  '--deploy-prebuilt',
])

requireAll('Clean authority attestation job', attestJob, [
  'Checkout clean current release authority only',
  'Download unattested raw static output',
  'node scripts/verify-release-credential-boundary.mjs',
  'node scripts/create-static-release-bundle.mjs',
  'Upload authority-attested static release bundle',
])
forbidAny('Clean authority attestation job', attestJob, [
  'environment: production',
  'FIREBASE_SERVICE_ACCOUNT_JSON',
  'GOOGLE_APPLICATION_CREDENTIALS',
  'working-directory: target',
  'pnpm build:static',
])

requireAll('Protected deploy job', deployJob, [
  'environment: production',
  'Checkout current release authority only',
  'pnpm install --frozen-lockfile --ignore-scripts',
  'node scripts/verify-release-credential-boundary.mjs',
  'node scripts/live-release.mjs --verify-prebuilt',
  'node scripts/live-release.mjs --deploy-prebuilt',
  'node scripts/urai-release-control-smoke.mjs',
  'Remove temporary credentials',
])
forbidAny('Protected deploy job', deployJob, [
  'path: target',
  'working-directory: target',
  'pnpm build:static',
  'node ../authority/',
])

const secretMarker = 'FIREBASE_SERVICE_ACCOUNT_JSON: ${{ secrets.FIREBASE_SERVICE_ACCOUNT_JSON }}'
const secretOccurrences = workflow.split(secretMarker).length - 1
if (secretOccurrences !== 1) failures.push(`Raw service-account secret must occur exactly once; found ${secretOccurrences}`)
if (!deployJob.includes(secretMarker)) failures.push('Raw service-account secret must exist only in the protected deploy job')
if (buildJob.includes(secretMarker) || attestJob.includes(secretMarker)) failures.push('Build and attestation jobs must not receive the raw service-account secret')

requireAll('Release security workflow', securityWorkflow, [
  'name: Release Security Path Guard',
  'permissions:\n  contents: read',
  'runs-on: ubuntu-24.04',
  'persist-credentials: false',
  'show-progress: false',
  'node scripts/verify-release-security-path-guard.mjs',
  'node scripts/verify-production-action-pins.mjs',
  'node scripts/audit-production-workflow-authority.mjs',
  'node scripts/verify-release-credential-boundary.mjs',
  'node scripts/verify-live-rollback-provenance.mjs --self-test',
  'node urai-tier1/tests/exact-static-release-contract.test.mjs',
])
forbidAny('Release security workflow', securityWorkflow, [
  'pull_request_target:',
  'environment: production',
  'FIREBASE_SERVICE_ACCOUNT_JSON',
  'GOOGLE_APPLICATION_CREDENTIALS',
  'contents: write',
  'actions: write',
  'id-token: write',
])
if (workflowExecutesProductionMutation(securityWorkflow)) failures.push('Release security workflow must not execute production mutation')

const operator = read(canonicalProductionScript)
requireAll('Canonical production operator', operator, [
  "const canonicalWorkflow = 'URAI Canonical Production Release'",
  "const canonicalRepository = 'LifeLoggerAI/urai-spatial'",
  "process.env.URAI_DEPLOY_CONFIRM !== 'DEPLOY_STATIC_URAI'",
  "process.env.GITHUB_ACTIONS !== 'true'",
  "process.env.GITHUB_EVENT_NAME !== 'workflow_dispatch'",
  "process.env.GITHUB_REF !== 'refs/heads/main'",
  "process.argv.includes('--verify-prebuilt')",
  "process.argv.includes('--deploy-prebuilt')",
  'validateAndMaterializePrebuiltBundle',
  "manifest.schemaVersion !== 'urai-static-release-bundle-1'",
  'manifest.authoritySha !== authoritySha',
  'Release bundle file set, sizes, or hashes do not match the manifest',
  'Firebase CLI must resolve inside current authority',
  'delete process.env.FIREBASE_SERVICE_ACCOUNT_JSON',
  'writeFileSync(managedCredentialsPath',
  "flag: 'wx'",
])
if (/pnpm\s+exec\s+firebase/.test(operator)) failures.push('Canonical production operator resolves Firebase through a package manager')

const bundle = read('scripts/create-static-release-bundle.mjs')
requireAll('Authority bundle attester', bundle, [
  "schemaVersion: 'urai-static-release-bundle-1'",
  'assertCleanAuthorityCheckout()',
  'writeAuthoritativeFingerprint()',
  'repository: canonicalRepository',
  'authoritySha',
  'targetSha',
  'rollbackSha',
  "certification: 'pending-post-deploy-smoke'",
  'workflowRunId',
  'Release bundle source must not contain symlinks',
  'Copied release bundle bytes do not match the source output',
  'fingerprintSha256',
])

const bundleAlias = read('scripts/attest-static-release-bundle.mjs')
if (!bundleAlias.includes("import './create-static-release-bundle.mjs'")) failures.push('Bundle alias must delegate to the canonical authority attester')

const credentialBoundary = read('scripts/verify-release-credential-boundary.mjs')
requireAll('Credential boundary verifier', credentialBoundary, [
  "schemaVersion: 'urai-release-credential-boundary-4'",
  'targetBuildIsolated: true',
  'authorityAttestationIsolated: true',
  'targetCodeExecutesInProductionJob: false',
  'downloadedBundleRunBound',
  'downloadedBundleFingerprintBound',
  'credentialsMaterializedByAuthorityOnly: true',
  'firebaseCliResolvedFromCurrentAuthority: true',
])

const smoke = read('scripts/urai-release-control-smoke.mjs')
requireAll('Release-control smoke', smoke, [
  "schemaVersion: 'urai-release-control-smoke-5'",
  'assertExactQueryIdentity',
  "await context.route('**/*'",
  "await route.abort('blockedbyclient')",
  'blockedExternalRequests',
  "waitUntil: 'domcontentloaded'",
  "animations: 'disabled'",
  "'/mirror'",
  "'/location-map'",
])
if (/from ['"]playwright['"]/.test(smoke)) failures.push('Release-control smoke must resolve Playwright through the current authority workspace')
if (/waitUntil:\s*['"]networkidle['"]/.test(smoke)) failures.push('Release-control smoke must not rely on networkidle')

const packageJson = JSON.parse(read('package.json') || '{}')
const scripts = packageJson.scripts || {}
if (scripts['live:deploy'] !== 'node scripts/live-release.mjs --deploy-prebuilt') failures.push('package.json live:deploy must route only through --deploy-prebuilt')
for (const forbiddenAlias of ['studio:deploy:static', 'deploy:xr:firebase', 'deploy:xr:firebase:static', 'deploy:staging', 'deploy:prod', 'frb', 'live:deploy:static', 'publish:live:static']) {
  if (forbiddenAlias in scripts) failures.push(`Forbidden deploy alias remains in package.json: ${forbiddenAlias}`)
}
for (const [name, command] of Object.entries(scripts)) {
  if (containsDirectFirebaseDeploy(command)) failures.push(`Direct Firebase deploy command remains in package script: ${name}`)
  if (name !== 'live:deploy' && /live-release\.mjs\s+--deploy(?:-prebuilt)?/.test(command)) failures.push(`Package script bypasses canonical live:deploy alias: ${name}`)
}

const proof = read('scripts/aaa-launch-proof.mjs')
requireAll('Proof-only runner', proof, [
  "if (args.has('--deploy'))",
  'process.exit(64)',
  'sourceIdentityVerified',
  'cleanWorkingTree',
  'productionDeploymentAttempted: false',
  "productionDeploymentAuthority: '.github/workflows/spatial-live-deploy.yml'",
])
if (containsDirectFirebaseDeploy(proof)) failures.push('Proof-only runner contains a direct deploy command')

for (const guidePath of ['docs/aaa-launch-proof-runner.md', 'docs/receipts/URAI_PROOF_MACHINE.md']) {
  const guide = read(guidePath)
  requireAll(guidePath, guide, ['scripts/aaa-launch-proof.mjs', canonicalWorkflowPath])
  if (/urai-aaa-proof-loop\.sh|node\s+scripts\/urai-proof-loop\.mjs|aaa-launch-proof\.mjs[^\n`]*--deploy/.test(guide)) failures.push(`${guidePath} references a retired or deploy-capable proof path`)
}

const steering = read('scripts/urai-aaa-steer.mjs')
requireAll('Machine steering', steering, [
  "screenshotDirectory || 'live-visual-audit/screenshots'",
  'receipt.sourceIdentityVerified === true',
  'receipt.cleanWorkingTree === true',
  'receipt.productionDeploymentAttempted === false',
  'machineProofGreen',
])
const steeringCompatibility = read('scripts/urai-aaa-steer.cjs')
if (!steeringCompatibility.includes("import('./urai-aaa-steer.mjs')")) failures.push('Steering compatibility wrapper must delegate to canonical implementation')

const steeringPlanText = read('docs/aaa-machine/steering-plan.json')
try {
  const plan = JSON.parse(steeringPlanText)
  if (Number(plan.version) < 2) failures.push('Steering plan version must be at least 2')
  if (plan.proofRequirements?.productionDeploymentAttempted !== false) failures.push('Steering plan must require productionDeploymentAttempted=false')
  if (plan.proofRequirements?.screenshotsPng !== 28) failures.push('Steering plan must require the current 28-screen visual matrix')
  if (plan.receiptContract?.screenshotDirectory !== 'live-visual-audit/screenshots') failures.push('Steering plan screenshot directory does not match proof output')
  if (plan.receiptContract?.productionAuthority !== canonicalWorkflowPath) failures.push('Steering plan production authority is not canonical')
  if ('deployExit' in (plan.proofRequirements || {})) failures.push('Steering plan still expects a local deploy exit code')
  for (const loop of plan.loops || []) {
    const command = String(loop.runCommand || '')
    if (!command.includes('node scripts/aaa-launch-proof.mjs --screenshots')) failures.push(`Steering loop ${loop.id || 'unknown'} does not use the proof-only runner`)
    if (/--deploy\b|urai-aaa-proof-loop\.sh|urai-proof-loop\.mjs/.test(command)) failures.push(`Steering loop ${loop.id || 'unknown'} references a retired or deploy-capable path`)
  }
} catch (error) {
  failures.push(`Invalid steering plan: ${error instanceof Error ? error.message : String(error)}`)
}

for (const snapshotPath of ['docs/receipts/machine-steering/latest.json', 'docs/receipts/machine-steering/latest.txt']) {
  const snapshot = read(snapshotPath)
  requireAll(snapshotPath, snapshot, ['scripts/aaa-launch-proof.mjs', canonicalWorkflowPath])
  if (/urai-aaa-proof-loop\.sh|node\s+scripts\/urai-proof-loop\.mjs|aaa-launch-proof\.mjs[^\n"]*--deploy/.test(snapshot)) failures.push(`${snapshotPath} contains a retired or deploy-capable proof command`)
}

const report = {
  schemaVersion: 'urai-production-authority-audit-6',
  ok: failures.length === 0,
  canonicalWorkflow: canonicalWorkflowPath,
  canonicalProductionScript,
  productionWorkflows: productionWorkflows.sort(),
  productionScripts: productionScripts.sort(),
  releaseSmokeSchema: 'urai-release-control-smoke-5',
  preRequestNetworkBlockingRequired: true,
  exactQueryIdentityRequired: true,
  rawServiceAccountSecretOccurrences: secretOccurrences,
  failures,
}

console.log(JSON.stringify(report, null, 2))
for (const failure of failures) {
  const escaped = failure.replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A')
  console.error(`::error title=Production authority audit::${escaped}`)
}
if (failures.length) process.exitCode = 1
