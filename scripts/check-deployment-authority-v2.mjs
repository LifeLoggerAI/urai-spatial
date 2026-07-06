#!/usr/bin/env node

import { existsSync, readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const workflowsDir = path.join(root, '.github', 'workflows')
const canonicalPath = '.github/workflows/urai-spatial-deploy.yml'
const operatorPath = 'scripts/deploy-exact-static-release.mjs'
const failures = []

function read(relativePath) {
  const absolutePath = path.join(root, relativePath)
  if (!existsSync(absolutePath)) {
    failures.push(`Missing required file: ${relativePath}`)
    return ''
  }
  return readFileSync(absolutePath, 'utf8')
}

function requireText(source, value, label) {
  if (!source.includes(value)) failures.push(`${label} is missing: ${value}`)
}

function hasTrigger(source, trigger) {
  return new RegExp(`^  ${trigger}:`, 'm').test(source)
}

function hasProductionCommand(source) {
  return [
    'node scripts/deploy-exact-static-release.mjs',
    'firebase deploy',
    'firebase-tools deploy',
    'pnpm live:deploy',
    'pnpm publish:live',
    'action-hosting-deploy@',
  ].some((value) => source.includes(value))
}

const canonical = read(canonicalPath)
const operator = read(operatorPath)

if (!hasTrigger(canonical, 'workflow_dispatch')) failures.push(`${canonicalPath} must be manual-only`)
if (hasTrigger(canonical, 'push')) failures.push(`${canonicalPath} must not run on push`)
if (hasTrigger(canonical, 'pull_request')) failures.push(`${canonicalPath} must not run on pull requests`)

for (const value of [
  'target_sha:',
  'rollback_sha:',
  'certification_run_id:',
  'expected_firebase_project:',
  'deploy_url:',
  'confirmation:',
  'environment: production',
  'ref: ${{ inputs.target_sha }}',
  'git merge-base --is-ancestor "$TARGET_SHA" origin/main',
  'git merge-base --is-ancestor "$ROLLBACK_SHA" "$TARGET_SHA"',
  'v50-canonical-evidence-${{ inputs.target_sha }}',
  'tested-commit-sha.txt',
  'pnpm install --frozen-lockfile',
  'node-version: 22',
  'FIREBASE_SERVICE_ACCOUNT_JSON',
  'node scripts/deploy-exact-static-release.mjs',
  'DEPLOY VERIFIED URAI',
  'https://urai.app',
  'rollback_sha must differ from target_sha',
]) requireText(canonical, value, canonicalPath)

for (const forbidden of ['--no-frozen-lockfile', 'FIREBASE_TOKEN', 'static_export:', 'DEPLOY_URAI_STAGING']) {
  if (canonical.includes(forbidden)) failures.push(`${canonicalPath} contains forbidden value: ${forbidden}`)
}

for (const value of [
  "const CONFIRMATION = 'DEPLOY VERIFIED URAI'",
  "const CANONICAL_PROJECT = 'urai-4dc1d'",
  "const CANONICAL_URL = 'https://urai.app'",
  "run('pnpm', ['install', '--frozen-lockfile'])",
  "run('pnpm', ['lock:static'])",
  "run('pnpm', ['typecheck'])",
  "run('pnpm', ['build:static']",
  'NEXT_PUBLIC_URAI_BUILD_SHA: targetSha',
  "'--config', 'firebase.static.json', '--only', 'hosting'",
  'Post-deploy live content or SHA verification failed',
  "schemaVersion: 'urai-exact-static-release-1'",
  'rollbackCommand:',
]) requireText(operator, value, operatorPath)

for (const forbidden of ['firestore:rules', 'firestore:indexes', 'hosting,firestore', "'functions'"]) {
  if (operator.includes(forbidden)) failures.push(`${operatorPath} contains non-Hosting scope: ${forbidden}`)
}

const authorities = []
for (const name of readdirSync(workflowsDir).filter((entry) => /\.ya?ml$/.test(entry)).sort()) {
  const relativePath = `.github/workflows/${name}`
  const source = readFileSync(path.join(workflowsDir, name), 'utf8')
  if (!hasProductionCommand(source)) continue
  if (source.includes('hosting:channel:deploy') || source.includes('firebase hosting:channel:deploy')) continue
  authorities.push(relativePath)
  if (hasTrigger(source, 'push')) failures.push(`${relativePath} has a production command and push trigger`)
  if (hasTrigger(source, 'pull_request')) failures.push(`${relativePath} has a production command and pull_request trigger`)
}

if (authorities.length !== 1 || authorities[0] !== canonicalPath) {
  failures.push(`Expected one production authority (${canonicalPath}); found ${authorities.join(', ') || 'none'}`)
}

if (failures.length) {
  console.error('Deployment authority v2 failed:')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('Deployment authority v2 passed')
console.log(`Sole production authority: ${canonicalPath}`)
console.log(`Static release operator: ${operatorPath}`)
console.log('Deployment scope: Firebase Hosting only')
