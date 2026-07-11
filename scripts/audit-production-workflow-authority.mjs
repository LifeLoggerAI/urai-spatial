#!/usr/bin/env node
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const workflowDirectory = path.join(root, '.github', 'workflows')
const scriptsDirectory = path.join(root, 'scripts')
const canonicalWorkflowFile = 'spatial-live-deploy.yml'
const canonicalWorkflowName = 'URAI Canonical Production Release'
const canonicalRepository = 'LifeLoggerAI/urai-spatial'
const allowedProductionScript = 'scripts/live-release.mjs'
const bundleScriptPath = 'scripts/create-static-release-bundle.mjs'
const credentialBoundaryPath = 'scripts/verify-release-credential-boundary.mjs'
const releaseSmokePath = 'scripts/urai-release-control-smoke.mjs'
const auditScript = 'scripts/audit-production-workflow-authority.mjs'
const proofRunner = 'scripts/aaa-launch-proof.mjs'
const steeringPlanPath = 'docs/aaa-machine/steering-plan.json'
const steeringScriptPath = 'scripts/urai-aaa-steer.mjs'
const steeringCompatibilityPath = 'scripts/urai-aaa-steer.cjs'
const proofGuidePaths = ['docs/aaa-launch-proof-runner.md', 'docs/receipts/URAI_PROOF_MACHINE.md']
const steeringSnapshots = ['docs/receipts/machine-steering/latest.json', 'docs/receipts/machine-steering/latest.txt']
const retiredExecutables = [
  'scripts/deploy-exact-static-release.mjs',
  'scripts/firebase-studio-polish-deploy-node.sh',
  'scripts/urai-aaa-proof-loop.sh',
  'scripts/urai-firebase-studio-static-release.mjs',
  'scripts/urai-proof-loop.mjs',
  'scripts/urai-v1-autopilot-retry.sh',
  'scripts/urai-v1-autopilot.sh',
]
const failures = []

function walk(directory) {
  if (!existsSync(directory)) return []
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolute = path.join(directory, entry.name)
    return entry.isDirectory() ? walk(absolute) : entry.isFile() ? [absolute] : []
  })
}

function relative(file) {
  return path.relative(root, file).replaceAll('\\', '/')
}

function read(relativePath) {
  const absolute = path.join(root, relativePath)
  if (!existsSync(absolute)) {
    failures.push(`Missing required authority file: ${relativePath}`)
    return ''
  }
  return readFileSync(absolute, 'utf8')
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
for (const file of walk(scriptsDirectory)) {
  if (!/\.(?:mjs|cjs|js|sh)$/.test(file)) continue
  const name = relative(file)
  if (name === auditScript) continue
  const source = readFileSync(file, 'utf8')
  if (scriptCanDeploy(source)) productionCapableScripts.push(name)
}
for (const script of productionCapableScripts) {
  if (script !== allowedProductionScript) failures.push(`Competing production-capable script: ${script}`)
}

let canonicalSource = ''
if (!existsSync(workflowDirectory)) {
  failures.push('Missing .github/workflows directory')
} else {
  const workflowFiles = readdirSync(workflowDirectory).filter((name) => /\.ya?ml$/.test(name))
  if (!workflowFiles.includes(canonicalWorkflowFile)) failures.push(`Missing canonical production workflow: ${canonicalWorkflowFile}`)
  for (const name of workflowFiles) {
    const source = readFileSync(path.join(workflowDirectory, name), 'utf8')
    if (workflowCanDeploy(source, productionCapableScripts) && name !== canonicalWorkflowFile) {
      failures.push(`Competing production-capable workflow: ${name}`)
    }
  }
  canonicalSource = workflowFiles.includes(canonicalWorkflowFile)
    ? readFileSync(path.join(workflowDirectory, canonicalWorkflowFile), 'utf8')
    : ''
}

requireTokens('Canonical workflow', canonicalSource, [
  `name: ${canonicalWorkflowName}`,
  "inputs.confirm == 'DEPLOY_URAI_APP' || inputs.confirm == 'ROLLBACK_URAI_APP'",
  "github.event_name == 'workflow_dispatch' && inputs.release_sha || github.sha",
  'rollback-verify:',
  'name: Prove rollback target with current authority',
  'prepare-release-bundle:',
  'name: Prepare exact static release bundle without production credentials',
  'needs: [verify, rollback-verify, prepare-release-bundle]',
  'node ../authority/scripts/create-static-release-bundle.mjs',
  'actions/upload-artifact@v4',
  'actions/download-artifact@v4',
  'Checkout current release authority only',
  'pnpm install --frozen-lockfile --ignore-scripts',
  'node scripts/live-release.mjs --verify-prebuilt',
  'node scripts/live-release.mjs --deploy-prebuilt',
  'node scripts/urai-release-control-smoke.mjs',
  'environment: production',
  'git merge-base --is-ancestor',
  'test "$RELEASE_SHA" = "$CURRENT_MAIN_SHA"',
  'test "$ROLLBACK_SHA" = "$CURRENT_MAIN_SHA"',
  'URAI_RELEASE_OPERATION:',
  'GITHUB_WORKFLOW',
  'GITHUB_REPOSITORY',
  'GITHUB_REF',
  'FIREBASE_SERVICE_ACCOUNT_JSON: ${{ secrets.FIREBASE_SERVICE_ACCOUNT_JSON }}',
  'test -n "$FIREBASE_SERVICE_ACCOUNT_JSON"',
  'printf \'%s\' "$FIREBASE_SERVICE_ACCOUNT_JSON"',
  'gh workflow run spatial-live-deploy.yml --ref main',
  'if: always()',
])

const prepareSource = jobSection(canonicalSource, 'prepare-release-bundle')
const deploySource = jobSection(canonicalSource, 'deploy')
requireTokens('Bundle preparation job', prepareSource, [
  'path: authority',
  'path: target',
  'pnpm install --frozen-lockfile',
  'pnpm build:static',
  'node ../authority/scripts/create-static-release-bundle.mjs',
  'urai-static-release-bundle-${{ env.RELEASE_SHA }}',
])
forbidTokens('Bundle preparation job', prepareSource, [
  'environment: production',
  'FIREBASE_SERVICE_ACCOUNT_JSON',
  'GOOGLE_APPLICATION_CREDENTIALS',
])
requireTokens('Production deploy job', deploySource, [
  'Checkout current release authority only',
  'pnpm install --frozen-lockfile --ignore-scripts',
  'actions/download-artifact@v4',
  'node scripts/verify-release-credential-boundary.mjs',
  'node scripts/live-release.mjs --verify-prebuilt',
  'node scripts/live-release.mjs --deploy-prebuilt',
  'node scripts/urai-release-control-smoke.mjs',
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
for (const forbidden of [
  "test -n '${{ secrets.FIREBASE_SERVICE_ACCOUNT_JSON }}'",
  'cat > "$GOOGLE_APPLICATION_CREDENTIALS" <<\'JSON\'',
  'run: pnpm live:deploy',
  'NEXT_PUBLIC_URAI_BUILD_SHA=$ROLLBACK_SHA',
]) {
  if (canonicalSource.includes(forbidden)) failures.push(`Canonical workflow contains forbidden authority pattern: ${forbidden}`)
}

const releaseSource = read(allowedProductionScript)
requireTokens('Deploy executable', releaseSource, [
  'fileURLToPath(import.meta.url)',
  "const postDeploySmoke = path.join(authorityDirectory, 'urai-post-deploy-smoke.mjs')",
  'requireFile(postDeploySmoke)',
  "run('node', [postDeploySmoke]",
  "process.env.URAI_DEPLOY_CONFIRM !== 'DEPLOY_STATIC_URAI'",
  "process.env.GITHUB_ACTIONS !== 'true'",
  "process.env.GITHUB_EVENT_NAME !== 'workflow_dispatch'",
  'process.env.GITHUB_WORKFLOW !== canonicalWorkflow',
  'process.env.GITHUB_REPOSITORY !== canonicalRepository',
  "process.env.GITHUB_REF !== 'refs/heads/main'",
  "['deploy', 'rollback'].includes(releaseOperation)",
  'project !== expectedProject',
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
  "flag: 'wx'",
])
if (releaseSource.includes("run('node', ['scripts/urai-post-deploy-smoke.mjs']")) failures.push('Deploy executable invokes a checkout-relative post-deploy smoke instead of current authority')
if (!releaseSource.includes(`const canonicalWorkflow = '${canonicalWorkflowName}'`)) failures.push('Deploy executable workflow name does not match the canonical workflow')
if (!releaseSource.includes(`const canonicalRepository = '${canonicalRepository}'`)) failures.push('Deploy executable repository does not match the canonical repository')
if (/pnpm\s+exec\s+firebase/.test(releaseSource)) failures.push('Deploy executable resolves Firebase through a package manager instead of current authority')

const bundleSource = read(bundleScriptPath)
requireTokens('Static release bundle builder', bundleSource, [
  "schemaVersion: 'urai-static-release-bundle-1'",
  'authoritySha',
  'targetSha',
  'rollbackSha',
  'Release bundle source must not contain symlinks',
  'sha256',
  'fileCount',
  'totalBytes',
  'release-fingerprint.json',
])

const credentialBoundarySource = read(credentialBoundaryPath)
requireTokens('Credential boundary verifier', credentialBoundarySource, [
  "schemaVersion: 'urai-release-credential-boundary-1'",
  'targetCodeExecutesInProductionJob: false',
  'targetBuildIsolatedOnNoSecretRunner: true',
  'prebuiltArtifactHashVerified: true',
  'targetFirebaseCliReceivesCredentials: false',
])

const releaseSmokeSource = read(releaseSmokePath)
requireTokens('Release-control smoke', releaseSmokeSource, [
  "createRequire(path.join(process.cwd(), 'package.json'))",
  "requireFromTarget('playwright')",
  "waitUntil: 'domcontentloaded'",
  "page.locator('body').waitFor",
  "animations: 'disabled'",
  'pageErrors',
  "'/mirror'",
  "'/location-map'",
  "schemaVersion: 'urai-release-control-smoke-2'",
])
if (/from ['"]playwright['"]/.test(releaseSmokeSource)) failures.push('Release-control smoke must resolve Playwright through the current authority workspace')
if (/waitUntil:\s*['"]networkidle['"]/.test(releaseSmokeSource)) failures.push('Release-control smoke relies on networkidle and can hang on persistent connections')

const packagePath = path.join(root, 'package.json')
if (!existsSync(packagePath)) {
  failures.push('Missing package.json')
} else {
  const packageJson = JSON.parse(readFileSync(packagePath, 'utf8'))
  const scripts = packageJson.scripts || {}
  const forbiddenAliases = [
    'studio:deploy:static',
    'deploy:xr:firebase',
    'deploy:xr:firebase:static',
    'deploy:staging',
    'deploy:prod',
    'frb',
    'live:deploy:static',
    'publish:live:static',
  ]
  for (const name of forbiddenAliases) {
    if (name in scripts) failures.push(`Forbidden deploy alias remains in package.json: ${name}`)
  }
  if (scripts['live:deploy'] !== 'node scripts/live-release.mjs --deploy-prebuilt') failures.push('package.json live:deploy must point only to the protected prebuilt release executable')
  if (scripts['publish:live'] !== 'node scripts/run-pnpm.mjs live:deploy') failures.push('package.json publish:live must delegate to live:deploy')
  for (const [name, command] of Object.entries(scripts)) {
    if (hasDirectDeployCommand(command)) failures.push(`Direct Firebase deploy command remains in package script: ${name}`)
    if (name !== 'live:deploy' && /live-release\.mjs\s+--deploy(?:-prebuilt)?/.test(command)) failures.push(`Package script bypasses canonical live:deploy alias: ${name}`)
  }
}

const proofSource = read(proofRunner)
requireTokens('Proof runner', proofSource, [
  "if (args.has('--deploy'))",
  'process.exit(64)',
  "git', ['rev-parse', 'HEAD']",
  "git', ['status', '--porcelain']",
  'sourceIdentityVerified',
  'cleanWorkingTree',
  'productionDeploymentAttempted: false',
  "productionDeploymentAuthority: '.github/workflows/spatial-live-deploy.yml'",
  "join(receiptDir, 'live-visual-audit')",
])
if (hasDirectDeployCommand(proofSource)) failures.push('Proof runner contains a direct Firebase deploy command')

for (const guidePath of proofGuidePaths) {
  const guide = read(guidePath)
  requireTokens(guidePath, guide, ['scripts/aaa-launch-proof.mjs', '.github/workflows/spatial-live-deploy.yml'])
  if (/bash\s+scripts\/urai-aaa-proof-loop\.sh/.test(guide)) failures.push(`${guidePath} invokes retired urai-aaa-proof-loop.sh`)
  if (/node\s+scripts\/urai-proof-loop\.mjs/.test(guide)) failures.push(`${guidePath} invokes retired urai-proof-loop.mjs`)
  if (/aaa-launch-proof\.mjs[^\n`]*--deploy/.test(guide)) failures.push(`${guidePath} tells operators to deploy through the proof runner`)
}

const steeringSource = read(steeringScriptPath)
requireTokens('Machine steering', steeringSource, [
  "screenshotDirectory || 'live-visual-audit/screenshots'",
  'receipt.sourceIdentityVerified === true',
  'receipt.cleanWorkingTree === true',
  'receipt.productionDeploymentAttempted === false',
  'machineProofGreen',
])
const compatibilitySource = read(steeringCompatibilityPath)
if (!compatibilitySource.includes("import('./urai-aaa-steer.mjs')")) failures.push(`${steeringCompatibilityPath} must delegate to the canonical steering implementation`)

const steeringPlanSource = read(steeringPlanPath)
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
  failures.push(`Invalid ${steeringPlanPath}: ${error instanceof Error ? error.message : String(error)}`)
}

for (const snapshotPath of steeringSnapshots) {
  const snapshot = read(snapshotPath)
  if (/urai-aaa-proof-loop\.sh|node\s+scripts\/urai-proof-loop\.mjs|aaa-launch-proof\.mjs[^\n"]*--deploy/.test(snapshot)) failures.push(`${snapshotPath} contains a retired or deploy-capable proof command`)
  requireTokens(snapshotPath, snapshot, ['scripts/aaa-launch-proof.mjs', '.github/workflows/spatial-live-deploy.yml'])
}

const report = {
  schemaVersion: 'urai-production-authority-audit-3',
  ok: failures.length === 0,
  canonicalWorkflow: canonicalWorkflowFile,
  canonicalProductionScript: allowedProductionScript,
  staticBundleBuilder: bundleScriptPath,
  credentialBoundaryVerifier: credentialBoundaryPath,
  releaseSmoke: releaseSmokePath,
  protectedOperations: ['deploy', 'rollback'],
  rollbackTargetProofRequired: true,
  targetBuildIsolatedFromProductionRunner: true,
  prebuiltArtifactHashVerified: true,
  currentAuthorityExecutesTarget: false,
  currentAuthorityPostDeploySmoke: true,
  authorityResolvedSmokeDependencies: true,
  rawServiceAccountSecretOccurrences: secretOccurrences,
  proofRunner,
  steeringPlan: steeringPlanPath,
  retiredExecutables,
  productionCapableScripts: productionCapableScripts.sort(),
  failures,
}

console.log(JSON.stringify(report, null, 2))
if (failures.length) process.exitCode = 1
