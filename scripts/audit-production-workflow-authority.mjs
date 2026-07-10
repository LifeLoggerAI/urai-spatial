#!/usr/bin/env node
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const workflowDirectory = path.join(root, '.github', 'workflows')
const canonical = 'spatial-live-deploy.yml'
const failures = []

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
    if (isProductionCapable && name !== canonical) {
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
  ]) {
    if (!canonicalSource.includes(marker)) failures.push(`Canonical workflow missing marker: ${marker}`)
  }
}

const releaseScriptPath = path.join(root, 'scripts', 'live-release.mjs')
if (!existsSync(releaseScriptPath)) {
  failures.push('Missing scripts/live-release.mjs')
} else {
  const source = readFileSync(releaseScriptPath, 'utf8')
  if (!source.includes("process.env.URAI_DEPLOY_CONFIRM !== 'DEPLOY_STATIC_URAI'")) {
    failures.push('Deploy executable does not require the explicit production token')
  }
  if (/GITHUB_ACTIONS === 'true'\s*&&\s*process\.env\.GITHUB_EVENT_NAME === 'workflow_dispatch'/.test(source)) {
    failures.push('Deploy executable still authorizes generic workflow dispatch without the explicit token')
  }
}

const report = {
  ok: failures.length === 0,
  canonicalWorkflow: canonical,
  failures,
}

console.log(JSON.stringify(report, null, 2))
if (failures.length) process.exitCode = 1
