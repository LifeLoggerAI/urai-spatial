#!/usr/bin/env node
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const workflowsDir = path.join(root, '.github', 'workflows')
const scriptsDir = path.join(root, 'scripts')
const canonicalWorkflowFile = 'spatial-live-deploy.yml'
const canonicalWorkflowName = 'URAI Canonical Production Release'
const canonicalRepository = 'LifeLoggerAI/urai-spatial'
const allowedProductionScript = 'scripts/live-release.mjs'
const failures = []

const retiredExecutables = [
  'scripts/deploy-exact-static-release.mjs',
  'scripts/firebase-studio-polish-deploy-node.sh',
  'scripts/urai-aaa-proof-loop.sh',
  'scripts/urai-firebase-studio-static-release.mjs',
  'scripts/urai-proof-loop.mjs',
  'scripts/urai-v1-autopilot-retry.sh',
  'scripts/urai-v1-autopilot.sh',
]

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

function requireTokens(label, source, tokens) {
  for (const token of tokens) {
    if (!source.includes(token)) failures.push(`${label} missing marker: ${token}`)
  }
}

function forbidTokens(label, source, tokens) {
  for (const token of tokens) {
    if (source.includes(token)) failures.push(`${label} contains forbidden marker: ${token}`)
  }
}

function hasDirectDeployCommand(source) {
  return [
    /\bfirebase(?:-tools)?(?:@[^\s'"`]+)?\s+deploy\b/i,
    /\brun\(\s*['"]firebase['"]\s*,\s*\[\s*['"]deploy['"]/i,
    /\bspawnSync\(\s*['"]firebase['"]\s*,\s*\[\s*['"]deploy['"]/i,
    /\bexecFileSync\(\s*['"]firebase['"]\s*,\s*\[\s*['"]deploy['"]/i,
  ].some((pattern) => pattern.test(source))
}

function scriptCanDeploy(source) {
  return hasDirectDeployCommand(source) ||
    /\blive-release\.mjs\s+--deploy(?:-prebuilt)?\b/.test(source) ||
    /\bprocess\.env\.URAI_DEPLOY_CONFIRM\b/.test(source)
}

function workflowCanDeploy(source, productionCapableScripts) {
  return hasDirectDeployCommand(source) ||
    /\bpnpm\s+live:deploy\b/i.test(source) ||
    /\benvironment:\s*production\b/i.test(source) ||
    /\bDEPLOY_URAI_APP\b/.test(source) ||
    /\bROLLBACK_URAI_APP\b/.test(source) ||
    productionCapableScripts.some((script) => source.includes(script))
}

function jobSection(source, jobName) {
  const marker = `\n  ${jobName}:\n`
  const start = source.indexOf(marker)
  if (start < 0) return ''
  const rest = source.slice(start + marker.length)
  const next = rest.search(/\n  [A-Za-z0-9_-]+:\n/)
  return next < 0 ? rest : rest.slice(0, next)
}

for (const retired of retiredExecutables) {
  if (existsSync(path.join(root, retired))) failures.push(`Retired executable was restored: ${retired}`)
}

const productionCapableScripts = []
for (const file of walk(scriptsDir)) {
  if (!/\.(?:mjs|cjs|js|sh)$/.test(file)) continue
  const name = relative(file)
  if (name === 'scripts/audit-production-workflow-authority.mjs') continue
  if (scriptCanDeploy(readFileSync(file, 'utf8'))) productionCapableScripts.push(name)
}
for (const script of productionCapableScripts) {
  if (script !== allowedProductionScript) failures.push(`Competing production-capable script: ${script}`)
}

let canonicalSource = ''
if (!existsSync(workflowsDir)) {
  failures.push('Missing .github/workflows directory')
} else {
  const workflowFiles = readdirSync(workflowsDir).filter((name) => /\.ya?ml$/.test(name))
  if (!workflowFiles.includes(canonicalWorkflowFile)) failures.push(`Missing canonical production workflow: ${canonicalWorkflowFile}`)
  for (const name of workflowFiles) {
    const source = normalize(readFileSync(path.join(workflowsDir, name), 'utf8'))
    if (workflowCanDeploy(source, productionCapableScripts) && name !== canonicalWorkflowFile) {
      failures.push(`Competing production-capable workflow: ${name}`)
    }
  }
  canonicalSource = workflowFiles.includes(canonicalWorkflowFile)
    ? normalize(readFileSync(path.join(workflowsDir, canonicalWorkflowFile), 'utf8'))
    : ''
}

requireTokens('Canonical workflow', canonicalSource, [
  `name: ${canonicalWorkflowName}`,
  "inputs.confirm == 'DEPLOY_URAI_APP' || inputs.confirm == 'ROLLBACK_URAI_APP'",
  "github.event_name == 'workflow_dispatch' && inputs.release_sha || github.sha",
  'name: Exact-head release verification',
  'name: Prove rollback target with current authority',
  'name: Build exact static target without production authority or credentials',
  'name: Attest raw static output with clean current authority',
  'name: Deploy or roll back verified static bundle on urai.app',
  'needs: [verify, rollback-verify, build-release-output]',
  'needs: [verify, rollback-verify, attest-release-bundle]',
  'actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683',
  'actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020',
  'actions/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02',
  'actions/download-artifact@d3f86a106a0bac45b974a628896c90dbdf5c8093',
  'node scripts/verify-release-credential-boundary.mjs',
  'node scripts/create-static-release-bundle.mjs',
  'node scripts/live-release.mjs --verify-prebuilt',
  'node scripts/live-release.mjs --deploy-prebuilt',
  'node scripts/urai-release-control-smoke.mjs',
  'environment: production',
  'git merge-base --is-ancestor',
  'test "$RELEASE_SHA" = "$CURRENT_MAIN_SHA"',
  'test "$ROLLBACK_SHA" = "$CURRENT_MAIN_SHA"',
  'gh workflow run spatial-live-deploy.yml --ref main',
  'if: always()',
])

const buildSource = jobSection(canonicalSource, 'build-release-output')
const attestSource = jobSection(canonicalSource, 'attest-release-bundle')
const deploySource = jobSection(canonicalSource, 'deploy')

requireTokens('Target-only build job', buildSource, [
  'Checkout exact release target only',
  'path: target',
  'pnpm install --frozen-lockfile',
  'pnpm build:static',
  'Upload unattested raw static output',
  'urai-raw-static-output-${{ env.RELEASE_SHA }}',
])
forbidTokens('Target-only build job', buildSource, [
  'environment: production',
  'FIREBASE_SERVICE_ACCOUNT_JSON',
  'GOOGLE_APPLICATION_CREDENTIALS',
  'node scripts/create-static-release-bundle.mjs',
  '--deploy-prebuilt',
])

requireTokens('Clean authority attestation job', attestSource, [
  'Checkout clean current release authority only',
  'Download unattested raw static output',
  'node scripts/verify-release-credential-boundary.mjs',
  'node scripts/create-static-release-bundle.mjs',
  'Upload authority-attested static release bundle',
  'urai-static-release-bundle-${{ env.RELEASE_SHA }}',
])
forbidTokens('Clean authority attestation job', attestSource, [
  'environment: production',
  'FIREBASE_SERVICE_ACCOUNT_JSON',
  'GOOGLE_APPLICATION_CREDENTIALS',
  'working-directory: target',
  'pnpm build:static',
])

requireTokens('Production deploy job', deploySource, [
  'Checkout current release authority only',
  'pnpm install --frozen-lockfile --ignore-scripts',
  'node scripts/verify-release-credential-boundary.mjs',
  'node scripts/live-release.mjs --verify-prebuilt',
  'node scripts/live-release.mjs --deploy-prebuilt',
  'node scripts/urai-release-control-smoke.mjs',
  'Remove temporary credentials',
])
forbidTokens('Production deploy job', deploySource, [
  'path: target',
  'working-directory: target',
  'pnpm build:static',
  'node ../authority/',
  'Checkout frozen target',
])

const secretMarker = 'FIREBASE_SERVICE_ACCOUNT_JSON: ${{ secrets.FIREBASE_SERVICE_ACCOUNT_JSON }}'
const secretOccurrences = canonicalSource.split(secretMarker).length - 1
if (secretOccurrences !== 1) failures.push(`Canonical workflow must expose the raw service-account secret exactly once; found ${secretOccurrences}`)
if (!deploySource.includes(secretMarker)) failures.push('Raw service-account secret must exist only in the production deploy job')
if (buildSource.includes(secretMarker) || attestSource.includes(secretMarker)) failures.push('Build and attestation jobs must not receive the raw service-account secret')

forbidTokens('Canonical workflow', canonicalSource, [
  "test -n '${{ secrets.FIREBASE_SERVICE_ACCOUNT_JSON }}'",
  'run: pnpm live:deploy',
  'NEXT_PUBLIC_URAI_BUILD_SHA=$ROLLBACK_SHA',
])

const releaseSource = read(allowedProductionScript)
requireTokens('Deploy executable', releaseSource, [
  'fileURLToPath(import.meta.url)',
  "const postDeploySmoke = path.join(authorityDirectory, 'urai-post-deploy-smoke.mjs')",
  "process.env.URAI_DEPLOY_CONFIRM !== 'DEPLOY_STATIC_URAI'",
  "process.env.GITHUB_ACTIONS !== 'true'",
  "process.env.GITHUB_EVENT_NAME !== 'workflow_dispatch'",
  'process.env.GITHUB_WORKFLOW !== canonicalWorkflow',
  'process.env.GITHUB_REPOSITORY !== canonicalRepository',
  "process.env.GITHUB_REF !== 'refs/heads/main'",
  "['deploy', 'rollback'].includes(releaseOperation)",
  "productionAuthority: '.github/workflows/spatial-live-deploy.yml'",
  "process.argv.includes('--verify-prebuilt')",
  "process.argv.includes('--deploy-prebuilt')",
  'validateAndMaterializePrebuiltBundle',
  "manifest.schemaVersion !== 'urai-static-release-bundle-1'",
  'manifest.authoritySha !== authoritySha',
  'Release surface must not contain symlinks',
  'Release bundle file set, sizes, or hashes do not match the manifest',
  'Firebase CLI must resolve inside current authority',
  'delete process.env.FIREBASE_SERVICE_ACCOUNT_JSON',
  'writeFileSync(managedCredentialsPath',
  "flag: 'wx'",
])
if (/pnpm\s+exec\s+firebase/.test(releaseSource)) failures.push('Deploy executable resolves Firebase through a package manager instead of current authority')
if (!releaseSource.includes(`const canonicalWorkflow = '${canonicalWorkflowName}'`)) failures.push('Deploy executable workflow name does not match the canonical workflow')
if (!releaseSource.includes(`const canonicalRepository = '${canonicalRepository}'`)) failures.push('Deploy executable repository does not match the canonical repository')

const bundleSource = read('scripts/create-static-release-bundle.mjs')
requireTokens('Authority static release attester', bundleSource, [
  "schemaVersion: 'urai-static-release-bundle-1'",
  'assertCleanAuthorityCheckout()',
  'writeAuthoritativeFingerprint()',
  "attestedBy: 'scripts/create-static-release-bundle.mjs'",
  'repository: canonicalRepository',
  'authoritySha',
  'targetSha',
  'rollbackSha',
  "certification: 'pending-post-deploy-smoke'",
  'workflowRunId',
  'Release bundle source must not contain symlinks',
  'Copied release bundle bytes do not match the source output',
  'fingerprintSha256',
  'fileCount',
  'totalBytes',
])

const bundleAliasSource = read('scripts/attest-static-release-bundle.mjs')
if (!bundleAliasSource.includes("import './create-static-release-bundle.mjs'")) failures.push('Bundle alias must delegate to the canonical authority attester')

const credentialBoundarySource = read('scripts/verify-release-credential-boundary.mjs')
requireTokens('Credential boundary verifier', credentialBoundarySource, [
  "schemaVersion: 'urai-release-credential-boundary-4'",
  'targetBuildIsolated: true',
  'authorityAttestationIsolated: true',
  'targetCodeExecutesInProductionJob: false',
  'downloadedBundleRunBound',
  'downloadedBundleFingerprintBound',
  'releaseOperatorFullBundleVerificationPresent',
  'credentialsMaterializedByAuthorityOnly: true',
  'firebaseCliResolvedFromCurrentAuthority: true',
])

const releaseSmokeSource = read('scripts/urai-release-control-smoke.mjs')
requireTokens('Release-control smoke', releaseSmokeSource, [
  "schemaVersion: 'urai-release-control-smoke-5'",
  "createRequire(path.join(process.cwd(), 'package.json'))",
  "requireFromTarget('playwright')",
  "waitUntil: 'domcontentloaded'",
  "page.locator('body').waitFor",
  "animations: 'disabled'",
  'assertExactQueryIdentity',
  "await context.route('**/*'",
  "await route.abort('blockedbyclient')",
  'blockedExternalRequests',
  'pageErrors',
  "'/mirror'",
  "'/location-map'",
])
if (/from ['"]playwright['"]/.test(releaseSmokeSource)) failures.push('Release-control smoke must resolve Playwright through the current authority workspace')
if (/waitUntil:\s*['"]networkidle['"]/.test(releaseSmokeSource)) failures.push('Release-control smoke relies on networkidle and can hang on persistent connections')

const packagePath = path.join(root, 'package.json')
if (!existsSync(packagePath)) {
  failures.push('Missing package.json')
} else {
  const scripts = JSON.parse(readFileSync(packagePath, 'utf8')).scripts || {}
  for (const name of ['studio:deploy:static', 'deploy:xr:firebase', 'deploy:xr:firebase:static', 'deploy:staging', 'deploy:prod', 'frb', 'live:deploy:static', 'publish:live:static']) {
    if (name in scripts) failures.push(`Forbidden deploy alias remains in package.json: ${name}`)
  }
  if (scripts['live:deploy'] !== 'node scripts/live-release.mjs --deploy-prebuilt') failures.push('package.json live:deploy must route only through --deploy-prebuilt')
  for (const [name, command] of Object.entries(scripts)) {
    if (hasDirectDeployCommand(command)) failures.push(`Direct Firebase deploy command remains in package script: ${name}`)
    if (name !== 'live:deploy' && /live-release\.mjs\s+--deploy(?:-prebuilt)?/.test(command)) failures.push(`Package script bypasses canonical live:deploy alias: ${name}`)
  }
}

const proofSource = read('scripts/aaa-launch-proof.mjs')
requireTokens('Proof runner', proofSource, [
  "if (args.has('--deploy'))",
  'process.exit(64)',
  'sourceIdentityVerified',
  'cleanWorkingTree',
  'productionDeploymentAttempted: false',
  "productionDeploymentAuthority: '.github/workflows/spatial-live-deploy.yml'",
  "join(receiptDir, 'live-visual-audit')",
])
if (hasDirectDeployCommand(proofSource)) failures.push('Proof runner contains a direct Firebase deploy command')

for (const guidePath of ['docs/aaa-launch-proof-runner.md', 'docs/receipts/URAI_PROOF_MACHINE.md']) {
  const guide = read(guidePath)
  requireTokens(guidePath, guide, ['scripts/aaa-launch-proof.mjs', '.github/workflows/spatial-live-deploy.yml'])
  if (/urai-aaa-proof-loop\.sh|node\s+scripts\/urai-proof-loop\.mjs|aaa-launch-proof\.mjs[^\n`]*--deploy/.test(guide)) failures.push(`${guidePath} references a retired or deploy-capable proof path`)
}

const steeringSource = read('scripts/urai-aaa-steer.mjs')
requireTokens('Machine steering', steeringSource, [
  "screenshotDirectory || 'live-visual-audit/screenshots'",
  'receipt.sourceIdentityVerified === true',
  'receipt.cleanWorkingTree === true',
  'receipt.productionDeploymentAttempted === false',
  'machineProofGreen',
])
const compatibilitySource = read('scripts/urai-aaa-steer.cjs')
if (!compatibilitySource.includes("import('./urai-aaa-steer.mjs')")) failures.push('Steering compatibility wrapper must delegate to canonical implementation')

const steeringPlanSource = read('docs/aaa-machine/steering-plan.json')
try {
  const steeringPlan = JSON.parse(steeringPlanSource)
  if (Number(steeringPlan.version) < 2) failures.push('Steering plan version must be at least 2')
  if (steeringPlan.proofRequirements?.productionDeploymentAttempted !== false) failures.push('Steering plan must require productionDeploymentAttempted=false')
  if (steeringPlan.proofRequirements?.screenshotsPng !== 28) failures.push('Steering plan must require the current 28-screen visual matrix')
  if (steeringPlan.receiptContract?.screenshotDirectory !== 'live-visual-audit/screenshots') failures.push('Steering plan screenshot directory does not match live-visual-audit output')
  if (steeringPlan.receiptContract?.productionAuthority !== '.github/workflows/spatial-live-deploy.yml') failures.push('Steering plan production authority is not canonical')
  if ('deployExit' in (steeringPlan.proofRequirements || {})) failures.push('Steering plan still expects a local deploy exit code')
  for (const loop of steeringPlan.loops || []) {
    const command = String(loop.runCommand || '')
    if (!command.includes('node scripts/aaa-launch-proof.mjs --screenshots')) failures.push(`Steering loop ${loop.id || 'unknown'} does not use the proof-only runner`)
    if (/--deploy\b|urai-aaa-proof-loop\.sh|urai-proof-loop\.mjs/.test(command)) failures.push(`Steering loop ${loop.id || 'unknown'} references a retired or deploy-capable proof path`)
  }
} catch (error) {
  failures.push(`Invalid docs/aaa-machine/steering-plan.json: ${error instanceof Error ? error.message : String(error)}`)
}

for (const snapshotPath of ['docs/receipts/machine-steering/latest.json', 'docs/receipts/machine-steering/latest.txt']) {
  const snapshot = read(snapshotPath)
  if (/urai-aaa-proof-loop\.sh|node\s+scripts\/urai-proof-loop\.mjs|aaa-launch-proof\.mjs[^\n"]*--deploy/.test(snapshot)) failures.push(`${snapshotPath} contains a retired or deploy-capable proof command`)
  requireTokens(snapshotPath, snapshot, ['scripts/aaa-launch-proof.mjs', '.github/workflows/spatial-live-deploy.yml'])
}

const report = {
  schemaVersion: 'urai-production-authority-audit-5',
  ok: failures.length === 0,
  canonicalWorkflow: canonicalWorkflowFile,
  canonicalProductionScript: allowedProductionScript,
  releaseSmokeSchema: 'urai-release-control-smoke-5',
  protectedOperations: ['deploy', 'rollback'],
  rollbackTargetProofRequired: true,
  targetBuildIsolatedFromAuthorityAttestation: true,
  authorityAttestationIsolatedFromProductionRunner: true,
  prebuiltArtifactHashVerified: true,
  currentAuthorityExecutesTarget: false,
  currentAuthorityPostDeploySmoke: true,
  authorityResolvedSmokeDependencies: true,
  preRequestNetworkBlockingRequired: true,
  exactQueryIdentityRequired: true,
  rawServiceAccountSecretOccurrences: secretOccurrences,
  retiredExecutables,
  productionCapableScripts: productionCapableScripts.sort(),
  failures,
}

console.log(JSON.stringify(report, null, 2))
if (failures.length) process.exitCode = 1
