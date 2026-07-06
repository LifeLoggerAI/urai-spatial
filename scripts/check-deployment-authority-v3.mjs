#!/usr/bin/env node
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const workflowsDir = path.join(root, '.github', 'workflows')
const authorityPath = '.github/workflows/spatial-live-deploy.yml'
const verificationPath = '.github/workflows/live-release.yml'
const operatorPath = 'scripts/deploy-exact-static-release.mjs'
const failures = []

const read = (relativePath) => {
  const absolutePath = path.join(root, relativePath)
  if (!existsSync(absolutePath)) {
    failures.push(`missing ${relativePath}`)
    return ''
  }
  return readFileSync(absolutePath, 'utf8')
}
const requireAll = (source, values, label) => {
  for (const value of values) if (!source.includes(value)) failures.push(`${label} missing ${value}`)
}
const hasTopLevel = (source, trigger) => new RegExp(`^  ${trigger}:`, 'm').test(source)
const deployMarkers = [
  'node scripts/deploy-exact-static-release.mjs',
  'firebase deploy',
  'firebase-tools deploy',
  'pnpm live:deploy',
  'pnpm publish:live',
  'action-hosting-deploy@',
]
const containsDeploy = (source) => deployMarkers.some((marker) => source.includes(marker))
const manualGuard = "if: github.event_name == 'workflow_dispatch' && github.event.inputs.deploy == 'DEPLOY'"

const authority = read(authorityPath)
const verification = read(verificationPath)
const operator = read(operatorPath)

if (!hasTopLevel(authority, 'push')) failures.push(`${authorityPath} must verify merged main`)
if (!hasTopLevel(authority, 'workflow_dispatch')) failures.push(`${authorityPath} must retain manual dispatch`)
if (hasTopLevel(authority, 'pull_request')) failures.push(`${authorityPath} must not run heavy release work on pull requests`)
if (!authority.includes(manualGuard)) failures.push(`${authorityPath} deploy job must be manual-only`)

requireAll(authority, [
  'target_sha:',
  'rollback_sha:',
  'certification_run_id:',
  'expected_firebase_project:',
  'live_url:',
  'confirmation:',
  'environment: production',
  'ref: ${{ inputs.target_sha }}',
  'v50-canonical-evidence-${{ inputs.target_sha }}',
  'tested-commit-sha.txt',
  'git merge-base --is-ancestor "$TARGET_SHA" origin/main',
  'git merge-base --is-ancestor "$ROLLBACK_SHA" "$TARGET_SHA"',
  'pnpm install --frozen-lockfile',
  'FIREBASE_SERVICE_ACCOUNT_JSON',
  'materialize-release-receipt.mjs',
  'node scripts/deploy-exact-static-release.mjs',
  'DEPLOY VERIFIED URAI',
  'https://urai.app',
], authorityPath)

for (const value of ['--no-frozen-lockfile', 'FIREBASE_TOKEN', 'DEPLOY_URAI_STAGING']) {
  if (authority.includes(value)) failures.push(`${authorityPath} contains forbidden ${value}`)
}

requireAll(operator, [
  "const CONFIRMATION = 'DEPLOY VERIFIED URAI'",
  "const CANONICAL_PROJECT = 'urai-4dc1d'",
  "const CANONICAL_URL = 'https://urai.app'",
  "run('pnpm', ['install', '--frozen-lockfile'])",
  "run('pnpm', ['lock:static'])",
  "run('pnpm', ['typecheck'])",
  "run('pnpm', ['build:static']",
  'NEXT_PUBLIC_URAI_BUILD_SHA: targetSha',
  "run('pnpm', ['exec', 'firebase', 'deploy'",
  "'firebase.static.json'",
  "'hosting'",
  'Post-deploy live content or SHA verification failed',
  "schemaVersion: 'urai-exact-static-release-1'",
  "schemaVersion: 'urai-static-artifact-manifest-1'",
  'rollbackCommand:',
], operatorPath)
for (const value of ['firestore:rules', 'firestore:indexes', 'hosting,firestore']) {
  if (operator.includes(value)) failures.push(`${operatorPath} contains non-Hosting scope ${value}`)
}

if (containsDeploy(verification)) failures.push(`${verificationPath} must remain verification-only`)
requireAll(verification, ['This workflow performs verification only.', authorityPath], verificationPath)

const authorities = []
for (const name of readdirSync(workflowsDir).filter((entry) => /\.ya?ml$/.test(entry)).sort()) {
  const relativePath = `.github/workflows/${name}`
  const source = readFileSync(path.join(workflowsDir, name), 'utf8')
  if (!containsDeploy(source)) continue
  if (source.includes('hosting:channel:deploy')) continue
  authorities.push(relativePath)
  if (relativePath !== authorityPath) failures.push(`${relativePath} is a competing production authority`)
  else if (!source.includes(manualGuard)) failures.push(`${relativePath} deploy command is not manual-only`)
}
if (authorities.length !== 1 || authorities[0] !== authorityPath) {
  failures.push(`expected sole authority ${authorityPath}; found ${authorities.join(', ') || 'none'}`)
}

if (failures.length) {
  console.error('Deployment authority v3 failed:')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}
console.log(`Deployment authority v3 passed: ${authorityPath}`)
console.log(`Static operator: ${operatorPath}`)
