#!/usr/bin/env node
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const workflowDirectory = path.join(root, '.github', 'workflows')
const scriptsDirectory = path.join(root, 'scripts')
const canonical = 'spatial-live-deploy.yml'
const allowedProductionScript = 'scripts/live-release.mjs'
const auditScript = 'scripts/audit-production-workflow-authority.mjs'
const proofRunner = 'scripts/aaa-launch-proof.mjs'
const steeringPlanPath = 'docs/aaa-machine/steering-plan.json'
const steeringScriptPath = 'scripts/urai-aaa-steer.mjs'
const steeringCompatibilityPath = 'scripts/urai-aaa-steer.cjs'
const proofGuidePaths = ['docs/aaa-launch-proof-runner.md', 'docs/receipts/URAI_PROOF_MACHINE.md']
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
    /\blive-release\.mjs\s+--deploy\b/.test(source) ||
    /\bprocess\.env\.URAI_DEPLOY_CONFIRM\b/.test(source)
}

function workflowCanDeploy(source, productionCapableScripts) {
  return hasDirectDeployCommand(source) ||
    /\bpnpm\s+live:deploy\b/i.test(source) ||
    /\benvironment:\s*production\b/i.test(source) ||
    /\bDEPLOY_URAI_APP\b/.test(source) ||
    productionCapableScripts.some((script) => source.includes(script))
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

if (!existsSync(workflowDirectory)) {
  failures.push('Missing .github/workflows directory')
} else {
  const workflowFiles = readdirSync(workflowDirectory).filter((name) => /\.ya?ml$/.test(name))
  if (!workflowFiles.includes(canonical)) failures.push(`Missing canonical production workflow: ${canonical}`)

  for (const name of workflowFiles) {
    const source = readFileSync(path.join(workflowDirectory, name), 'utf8')
    if (workflowCanDeploy(source, productionCapableScripts) && name !== canonical) {
      failures.push(`Competing production-capable workflow: ${name}`)
    }
  }

  const canonicalSource = workflowFiles.includes(canonical)
    ? readFileSync(path.join(workflowDirectory, canonical), 'utf8')
    : ''

  for (const marker of [
    "inputs.confirm == 'DEPLOY_URAI_APP'",
    'URAI_DEPLOY_CONFIRM: DEPLOY_STATIC_URAI',
    'environment: production',
    'inputs.release_sha == github.sha',
    'git merge-base --is-ancestor',
    'service_account.get',
    'scripts/urai-release-control-smoke.mjs',
    'if: always()',
  ]) {
    if (!canonicalSource.includes(marker)) failures.push(`Canonical workflow missing marker: ${marker}`)
  }
}

const releaseScriptPath = path.join(root, allowedProductionScript)
if (!existsSync(releaseScriptPath)) {
  failures.push(`Missing ${allowedProductionScript}`)
} else {
  const source = readFileSync(releaseScriptPath, 'utf8')
  if (!source.includes("process.env.URAI_DEPLOY_CONFIRM !== 'DEPLOY_STATIC_URAI'")) {
    failures.push('Deploy executable does not require the explicit production token')
  }
  if (/GITHUB_ACTIONS === 'true'\s*&&\s*process\.env\.GITHUB_EVENT_NAME === 'workflow_dispatch'/.test(source)) {
    failures.push('Deploy executable still authorizes generic workflow dispatch without the explicit token')
  }
  if (!source.includes("process.env.GITHUB_EVENT_NAME !== 'workflow_dispatch'")) {
    failures.push('Deploy executable does not reject non-dispatch GitHub Actions events')
  }
  if (!source.includes('project !== expectedProject')) {
    failures.push('Deploy executable does not lock the Firebase project')
  }
}

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
  if (scripts['live:deploy'] !== 'node scripts/live-release.mjs --deploy') {
    failures.push('package.json live:deploy must point only to scripts/live-release.mjs --deploy')
  }
  if (scripts['publish:live'] !== 'node scripts/run-pnpm.mjs live:deploy') {
    failures.push('package.json publish:live must delegate to live:deploy')
  }
  for (const [name, command] of Object.entries(scripts)) {
    if (hasDirectDeployCommand(command)) failures.push(`Direct Firebase deploy command remains in package script: ${name}`)
    if (name !== 'live:deploy' && /live-release\.mjs\s+--deploy/.test(command)) {
      failures.push(`Package script bypasses canonical live:deploy alias: ${name}`)
    }
  }
}

const proofSource = read(proofRunner)
requireTokens('Proof runner', proofSource, [
  "if (args.has('--deploy'))",
  "process.exit(64)",
  "git', ['rev-parse', 'HEAD']",
  "git', ['status', '--porcelain']",
  'sourceIdentityVerified',
  'cleanWorkingTree',
  "productionDeploymentAttempted: false",
  "productionDeploymentAuthority: '.github/workflows/spatial-live-deploy.yml'",
  "join(receiptDir, 'live-visual-audit')",
])
if (hasDirectDeployCommand(proofSource)) failures.push('Proof runner contains a direct Firebase deploy command')

for (const guidePath of proofGuidePaths) {
  const guide = read(guidePath)
  requireTokens(guidePath, guide, [
    'scripts/aaa-launch-proof.mjs',
    '.github/workflows/spatial-live-deploy.yml',
  ])
  if (/bash\s+scripts\/urai-aaa-proof-loop\.sh/.test(guide)) failures.push(`${guidePath} invokes retired urai-aaa-proof-loop.sh`)
  if (/node\s+scripts\/urai-proof-loop\.mjs/.test(guide)) failures.push(`${guidePath} invokes retired urai-proof-loop.mjs`)
  if (/aaa-launch-proof\.mjs[^\n`]*--deploy/.test(guide)) failures.push(`${guidePath} tells operators to deploy through the proof runner`)
}

const steeringSource = read(steeringScriptPath)
requireTokens('Machine steering', steeringSource, [
  "screenshotDirectory || 'live-visual-audit/screenshots'",
  "receipt.sourceIdentityVerified === true",
  "receipt.cleanWorkingTree === true",
  "receipt.productionDeploymentAttempted === false",
  'machineProofGreen',
])

const compatibilitySource = read(steeringCompatibilityPath)
if (!compatibilitySource.includes("import('./urai-aaa-steer.mjs')")) {
  failures.push(`${steeringCompatibilityPath} must delegate to the canonical steering implementation`)
}

const steeringPlanSource = read(steeringPlanPath)
try {
  const steeringPlan = JSON.parse(steeringPlanSource)
  if (Number(steeringPlan.version) < 2) failures.push('Steering plan version must be at least 2')
  if (steeringPlan.proofRequirements?.productionDeploymentAttempted !== false) {
    failures.push('Steering plan must require productionDeploymentAttempted=false')
  }
  if (steeringPlan.proofRequirements?.screenshotsPng !== 28) {
    failures.push('Steering plan must require the current 28-screen visual matrix')
  }
  if (steeringPlan.receiptContract?.screenshotDirectory !== 'live-visual-audit/screenshots') {
    failures.push('Steering plan screenshot directory does not match live-visual-audit output')
  }
  if (steeringPlan.receiptContract?.productionAuthority !== '.github/workflows/spatial-live-deploy.yml') {
    failures.push('Steering plan production authority is not canonical')
  }
  if ('deployExit' in (steeringPlan.proofRequirements || {})) failures.push('Steering plan still expects a local deploy exit code')
  for (const loop of steeringPlan.loops || []) {
    const command = String(loop.runCommand || '')
    if (!command.includes('node scripts/aaa-launch-proof.mjs --screenshots')) {
      failures.push(`Steering loop ${loop.id || 'unknown'} does not use the proof-only runner`)
    }
    if (/--deploy\b|urai-aaa-proof-loop\.sh|urai-proof-loop\.mjs/.test(command)) {
      failures.push(`Steering loop ${loop.id || 'unknown'} references a retired or deploy-capable proof path`)
    }
  }
} catch (error) {
  failures.push(`Invalid ${steeringPlanPath}: ${error instanceof Error ? error.message : String(error)}`)
}

const report = {
  ok: failures.length === 0,
  canonicalWorkflow: canonical,
  canonicalProductionScript: allowedProductionScript,
  proofRunner,
  steeringPlan: steeringPlanPath,
  retiredExecutables,
  productionCapableScripts: productionCapableScripts.sort(),
  failures,
}

console.log(JSON.stringify(report, null, 2))
if (failures.length) process.exitCode = 1
