#!/usr/bin/env node
import { readFileSync } from 'node:fs'
import path from 'node:path'

const workflowRelativePath = '.github/workflows/release-security-path-guard.yml'
const workflowPath = path.join(process.cwd(), workflowRelativePath)
const source = readFileSync(workflowPath, 'utf8').replace(/\r\n?/g, '\n')
const failures = []

const checkoutRef = 'actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683'
const setupNodeRef = 'actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020'
const expectedExternalActions = new Set([checkoutRef, setupNodeRef])

const requiredTokens = [
  'name: Release Security Path Guard',
  'branches: [main]',
  "'scripts/verify-release-security-path-guard.mjs'",
  `'${workflowRelativePath}'`,
  'permissions:\n  contents: read',
  'runs-on: ubuntu-24.04',
  checkoutRef,
  setupNodeRef,
  'persist-credentials: false',
  'git status --porcelain --untracked-files=all',
  'node --check scripts/write-release-fingerprint.mjs',
  'node --check scripts/verify-release-security-path-guard.mjs',
  'node --check scripts/urai-release-control-smoke.mjs',
  'node --check scripts/urai-post-deploy-smoke.mjs',
  'node scripts/verify-release-security-path-guard.mjs',
  'node scripts/audit-production-workflow-authority.mjs',
  'node scripts/verify-release-credential-boundary.mjs',
  'node scripts/verify-live-rollback-provenance.mjs --self-test',
  'node urai-tier1/tests/exact-static-release-contract.test.mjs',
]

for (const token of requiredTokens) {
  if (!source.includes(token)) failures.push(`Release security guard missing marker: ${token}`)
}

const forbiddenTokens = [
  'pull_request_target:',
  'environment: production',
  'FIREBASE_SERVICE_ACCOUNT_JSON',
  'GOOGLE_APPLICATION_CREDENTIALS',
  'firebase deploy',
  'pnpm live:deploy',
  'contents: write',
  'actions: write',
  'id-token: write',
  'deployments: write',
  'packages: write',
  'secrets:',
]

for (const token of forbiddenTokens) {
  if (source.includes(token)) failures.push(`Release security guard contains forbidden marker: ${token}`)
}

const actionRefs = [...source.matchAll(/^\s*uses:\s*([^\s#]+)(?:\s+#.*)?$/gm)].map((match) => match[1])
for (const actionRef of actionRefs) {
  if (actionRef.startsWith('./')) continue
  const separator = actionRef.lastIndexOf('@')
  const ref = separator >= 0 ? actionRef.slice(separator + 1) : ''
  if (!/^[0-9a-f]{40}$/.test(ref)) failures.push(`External action is not pinned to a full immutable commit SHA: ${actionRef}`)
  if (!expectedExternalActions.has(actionRef)) failures.push(`Unexpected external action in release security guard: ${actionRef}`)
}

for (const expected of expectedExternalActions) {
  const count = actionRefs.filter((actionRef) => actionRef === expected).length
  if (count !== 1) failures.push(`Expected external action must appear exactly once: ${expected}; found ${count}`)
}

const pathSections = source.match(/paths:\n(?:\s{6}- .+\n)+/g) || []
if (pathSections.length !== 2) failures.push(`Release security guard must define identical pull and push path filters; found ${pathSections.length}`)
if (pathSections.length === 2 && pathSections[0] !== pathSections[1]) failures.push('Pull-request and push path filters differ')

const report = {
  schemaVersion: 'urai-release-security-path-guard-1',
  ok: failures.length === 0,
  workflow: workflowRelativePath,
  externalActions: actionRefs,
  permissions: ['contents:read'],
  productionCredentialsAvailable: false,
  productionMutationAvailable: false,
  failures,
}

console.log(JSON.stringify(report, null, 2))
if (failures.length) process.exitCode = 1
