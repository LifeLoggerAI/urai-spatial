#!/usr/bin/env node
import fs from 'node:fs'

const workflowPath = '.github/workflows/urai-spatial-deploy.yml'
const receiptWriterPath = 'scripts/write-deployment-receipt.mjs'
const failures = []

function read(path) {
  if (!fs.existsSync(path)) {
    failures.push(`missing ${path}`)
    return ''
  }
  return fs.readFileSync(path, 'utf8')
}

function requireTokens(source, path, tokens) {
  for (const token of tokens) {
    if (!source.includes(token)) failures.push(`${path} missing ${token}`)
  }
}

const workflow = read(workflowPath)
const receiptWriter = read(receiptWriterPath)

requireTokens(workflow, workflowPath, [
  'workflow_dispatch:',
  'target_sha:',
  'rollback_sha:',
  'expected_firebase_project:',
  'confirmation:',
  'ref: ${{ inputs.target_sha }}',
  'fetch-depth: 0',
  'node-version: 22',
  'corepack pnpm install --frozen-lockfile',
  'corepack pnpm verify:release',
  "'DEPLOY_URAI_PRODUCTION'",
  "'DEPLOY_URAI_STAGING'",
  "'urai-4dc1d'",
  'https://urai.app',
  'REQUIRE_LIVE_COMMIT_SHA=true',
  'corepack pnpm smoke:live',
  'corepack pnpm smoke:home-xr:live',
  'node scripts/write-deployment-receipt.mjs',
  'actions/upload-artifact@v4',
  'cancel-in-progress: false',
])

requireTokens(receiptWriter, receiptWriterPath, [
  "classification: 'VERIFIED LIVE'",
  "repository: 'LifeLoggerAI/urai-spatial'",
  'URAI_TARGET_SHA',
  'URAI_ROLLBACK_SHA',
  'FIREBASE_PROJECT_ID',
  'URAI_DEPLOY_URL',
  "execFileSync('git', ['diff', '--name-only'",
  "artifact: 'urai-spatial-deployment-receipt'",
  'rollbackSha',
])

if (/^\s*push:/m.test(workflow)) {
  failures.push(`${workflowPath} must not deploy automatically on push`)
}
if (workflow.includes('--no-frozen-lockfile')) {
  failures.push(`${workflowPath} must not bypass lockfile integrity`)
}
if (workflow.includes('firebase.static.json')) {
  failures.push(`${workflowPath} must use framework hosting because production smoke requires API routes`)
}
if (workflow.includes('cancel-in-progress: true')) {
  failures.push(`${workflowPath} must not auto-cancel an in-progress production deployment`)
}

if (failures.length) {
  console.error('[deployment-release-contract] failed')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('[deployment-release-contract] exact-SHA, rollback, project, smoke, and receipt boundaries passed')
