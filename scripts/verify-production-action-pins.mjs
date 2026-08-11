#!/usr/bin/env node
import { readFileSync } from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const workflowPaths = [
  '.github/workflows/spatial-live-deploy.yml',
  '.github/workflows/release-security-path-guard.yml',
  '.github/workflows/capture-legacy-hosting-recovery.yml',
]
const auditPath = 'scripts/audit-production-workflow-authority.mjs'
const failures = []

const allowedActions = new Set([
  'actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683',
  'actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020',
  'actions/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02',
  'actions/download-artifact@d3f86a106a0bac45b974a628896c90dbdf5c8093',
  'google-github-actions/auth@7c6bc770dae815cd3e89ee6cdf493a5fab2cc093',
  'google-github-actions/setup-gcloud@aa5489c8933f4cc7a4f7d45035b3b1440c9c10db',
])

const workflowActions = {}
for (const workflowPath of workflowPaths) {
  const source = readFileSync(path.join(root, workflowPath), 'utf8').replace(/\r\n?/g, '\n')
  const actions = [...source.matchAll(/^\s*uses:\s*([^\s#]+)(?:\s+#.*)?$/gm)].map((match) => match[1])
  workflowActions[workflowPath] = actions
  for (const action of actions) {
    if (action.startsWith('./')) continue
    const separator = action.lastIndexOf('@')
    const ref = separator >= 0 ? action.slice(separator + 1) : ''
    if (!/^[0-9a-f]{40}$/.test(ref)) failures.push(`${workflowPath} action is not pinned to a full immutable commit SHA: ${action}`)
    if (!allowedActions.has(action)) failures.push(`${workflowPath} uses an unapproved external action: ${action}`)
  }
}

const allUsed = new Set(Object.values(workflowActions).flat())
for (const required of allowedActions) {
  if (!allUsed.has(required)) failures.push(`Approved action pin is unused across protected workflows: ${required}`)
}

const auditSource = readFileSync(path.join(root, auditPath), 'utf8').replace(/\r\n?/g, '\n')
for (const exactPin of allowedActions) {
  if (!auditSource.includes(exactPin)) failures.push(`${auditPath} does not enforce exact approved pin: ${exactPin}`)
}
if (/uses:\s+[^\s]+@v\d/.test(auditSource)) failures.push(`${auditPath} must not accept mutable action tags`)

const report = {
  schemaVersion: 'urai-production-action-pins-2',
  ok: failures.length === 0,
  workflows: workflowActions,
  allowedActions: [...allowedActions],
  audit: auditPath,
  wifActionsPinned: true,
  failures,
}

console.log(JSON.stringify(report, null, 2))
if (failures.length) process.exitCode = 1
