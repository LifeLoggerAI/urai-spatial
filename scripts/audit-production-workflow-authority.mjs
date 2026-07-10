#!/usr/bin/env node
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const workflowDirectory = path.join(root, '.github', 'workflows')
const scriptsDirectory = path.join(root, 'scripts')
const canonical = 'spatial-live-deploy.yml'
const allowedProductionScript = 'scripts/live-release.mjs'
const auditScript = 'scripts/audit-production-workflow-authority.mjs'
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

const report = {
  ok: failures.length === 0,
  canonicalWorkflow: canonical,
  canonicalProductionScript: allowedProductionScript,
  productionCapableScripts: productionCapableScripts.sort(),
  failures,
}

console.log(JSON.stringify(report, null, 2))
if (failures.length) process.exitCode = 1
