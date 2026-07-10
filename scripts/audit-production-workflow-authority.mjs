#!/usr/bin/env node
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const workflowDirectory = path.join(root, '.github', 'workflows')
const canonical = 'spatial-live-deploy.yml'
const failures = []
const warnings = []

function read(relative) {
  const absolute = path.join(root, relative)
  if (!existsSync(absolute)) {
    failures.push(`Missing required file: ${relative}`)
    return ''
  }
  return readFileSync(absolute, 'utf8')
}

function walk(directory) {
  if (!existsSync(directory)) return []
  return readdirSync(directory).flatMap((name) => {
    const absolute = path.join(directory, name)
    const stat = statSync(absolute)
    return stat.isDirectory() ? walk(absolute) : [absolute]
  })
}

if (!existsSync(workflowDirectory)) {
  failures.push('Missing .github/workflows directory')
} else {
  const workflowFiles = readdirSync(workflowDirectory).filter((name) => /\.ya?ml$/.test(name))
  if (!workflowFiles.includes(canonical)) failures.push(`Missing canonical production workflow: ${canonical}`)

  for (const name of workflowFiles) {
    const source = readFileSync(path.join(workflowDirectory, name), 'utf8')
    const productionSignals = [
      /firebase(?:-tools)?\s+deploy/i,
      /pnpm\s+live:deploy/i,
      /environment:\s*production/i,
      /DEPLOY_STATIC_URAI/,
      /DEPLOY_URAI_APP/,
    ]
    const isProductionCapable = productionSignals.some((pattern) => pattern.test(source))
    if (isProductionCapable && name !== canonical) failures.push(`Competing production-capable workflow: ${name}`)
  }

  const canonicalSource = workflowFiles.includes(canonical)
    ? readFileSync(path.join(workflowDirectory, canonical), 'utf8')
    : ''

  for (const marker of [
    'name: URAI Canonical Production Release',
    'options: [release, rollback]',
    "inputs.confirm == 'DEPLOY_URAI_APP'",
    "URAI_CANONICAL_DEPLOY_WORKFLOW: 'true'",
    'URAI_DEPLOY_CONFIRM: DEPLOY_STATIC_URAI',
    'environment: production',
    "test \"$RELEASE_SHA\" = \"$DISPATCH_SHA\"",
    "test \"$MODE\" = 'rollback'",
    'git merge-base --is-ancestor "$ROLLBACK_SHA" "$RELEASE_SHA"',
    'service_account.get',
    'scripts/urai-release-control-smoke.mjs',
    'Do not deploy from a workstation.',
  ]) {
    if (!canonicalSource.includes(marker)) failures.push(`Canonical workflow missing marker: ${marker}`)
  }

  if (!canonicalSource.includes('ref: ${{ env.TARGET_SHA }}')) failures.push('Canonical verification does not check out the exact target SHA')
  if (!canonicalSource.includes('test "$(git rev-parse HEAD)" = "$TARGET_SHA"')) failures.push('Canonical verification does not prove the exact target SHA')
  if (/git checkout \$ROLLBACK_SHA\s+pnpm install/s.test(canonicalSource)) failures.push('Canonical workflow still records a workstation rollback command')
}

const releaseSource = read('scripts/live-release.mjs')
for (const marker of [
  "process.env.GITHUB_ACTIONS !== 'true'",
  "process.env.GITHUB_EVENT_NAME !== 'workflow_dispatch'",
  "process.env.GITHUB_REPOSITORY !== canonicalRepository",
  "process.env.GITHUB_REF !== 'refs/heads/main'",
  "process.env.GITHUB_WORKFLOW !== canonicalWorkflowName",
  'process.env.GITHUB_WORKFLOW_REF?.includes(canonicalWorkflowPath)',
  "process.env.URAI_CANONICAL_DEPLOY_WORKFLOW !== 'true'",
  "process.env.URAI_DEPLOY_CONFIRM !== 'DEPLOY_STATIC_URAI'",
  "run('pnpm', ['exec', 'firebase', 'deploy'",
]) {
  if (!releaseSource.includes(marker)) failures.push(`Deploy executable missing authority marker: ${marker}`)
}
if (/GITHUB_ACTIONS === 'true'\s*&&\s*process\.env\.GITHUB_EVENT_NAME === 'workflow_dispatch'/.test(releaseSource)) {
  failures.push('Deploy executable still treats generic workflow dispatch as sufficient authority')
}

const packageSource = read('package.json')
let packageJson = null
try {
  packageJson = JSON.parse(packageSource)
} catch (error) {
  failures.push(`package.json is invalid JSON: ${error instanceof Error ? error.message : String(error)}`)
}
if (packageJson) {
  const scripts = packageJson.scripts || {}
  if (scripts['live:deploy'] !== 'node scripts/live-release.mjs --deploy') failures.push('live:deploy must use the guarded canonical executable')
  if (scripts['publish:live'] !== 'node scripts/run-pnpm.mjs live:deploy') failures.push('publish:live must route through guarded live:deploy')
  if (scripts['audit:production-authority'] !== 'node scripts/audit-production-workflow-authority.mjs') failures.push('Missing package authority audit command')
  if (!String(scripts['lock:static'] || '').includes('audit:production-authority')) failures.push('lock:static does not enforce production authority audit')

  const deniedAliases = [
    'studio:deploy:static',
    'deploy:xr:firebase',
    'deploy:xr:firebase:static',
    'deploy:staging',
    'deploy:prod',
    'frb',
    'live:deploy:static',
    'publish:live:static',
  ]
  for (const name of deniedAliases) {
    if (scripts[name] !== 'node scripts/deny-direct-production-deploy.mjs') failures.push(`Package deploy alias is not fail-closed: ${name}`)
  }
  for (const [name, command] of Object.entries(scripts)) {
    if (/\bfirebase(?:-tools)?\s+deploy\b/i.test(String(command))) failures.push(`Direct Firebase deploy remains in package script ${name}`)
  }
}

const activeScriptExtensions = new Set(['.mjs', '.js', '.cjs', '.sh', '.bash', '.zsh', '.ps1', '.cmd', '.bat'])
const allowedDirectDeployScript = path.join(root, 'scripts', 'live-release.mjs')
const auditScript = path.join(root, 'scripts', 'audit-production-workflow-authority.mjs')
const scriptFiles = walk(path.join(root, 'scripts')).filter((file) => activeScriptExtensions.has(path.extname(file).toLowerCase()))
const directDeployPatterns = [
  /\bfirebase(?:-tools)?\s+deploy\b/i,
  /(?:spawnSync|execFileSync|spawn|execFile)\(\s*['"]firebase['"]\s*,\s*\[[^\]]*['"]deploy['"]/is,
  /run\(\s*['"]firebase['"]\s*,\s*\[[^\]]*['"]deploy['"]/is,
]
for (const file of scriptFiles) {
  if (file === allowedDirectDeployScript || file === auditScript) continue
  const source = readFileSync(file, 'utf8')
  if (directDeployPatterns.some((pattern) => pattern.test(source))) {
    failures.push(`Active script contains a direct Firebase deploy path: ${path.relative(root, file).replaceAll('\\', '/')}`)
  }
}

const denySource = read('scripts/deny-direct-production-deploy.mjs')
if (!denySource.includes('Production may be deployed only by .github/workflows/spatial-live-deploy.yml')) {
  failures.push('Direct deploy denial guard does not name the canonical workflow')
}
if (!denySource.includes('process.exit(1)')) failures.push('Direct deploy denial guard does not fail closed')

const firebaserc = read('.firebaserc')
if (!firebaserc.includes('urai-4dc1d')) warnings.push('.firebaserc does not visibly identify the protected Firebase project')

const report = {
  ok: failures.length === 0,
  canonicalWorkflow: canonical,
  canonicalRepository: 'LifeLoggerAI/urai-spatial',
  productionRuntime: 'urai-tier1/main',
  workstationDeployAllowed: false,
  scannedActiveScripts: scriptFiles.length,
  failures,
  warnings,
}

console.log(JSON.stringify(report, null, 2))
if (failures.length) process.exitCode = 1
