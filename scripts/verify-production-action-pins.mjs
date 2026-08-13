#!/usr/bin/env node
import { readFileSync } from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const workflowPaths = [
  '.github/workflows/spatial-live-deploy.yml',
  '.github/workflows/release-security-path-guard.yml',
]
const failures = []

const allowedActions = new Set([
  'actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683',
  'actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020',
  'actions/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02',
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

const protectedActions = new Set(Object.values(workflowActions).flat().filter((action) => !action.startsWith('./')))
for (const required of allowedActions) {
  if (!protectedActions.has(required)) failures.push(`Approved action pin is unused across protected workflows: ${required}`)
}

const report = {
  schemaVersion: 'urai-production-action-pins-2',
  ok: failures.length === 0,
  workflows: workflowActions,
  allowedActions: [...allowedActions],
  enforcement: 'protected-workflow-source-direct',
  failures,
}

console.log(JSON.stringify(report, null, 2))
if (failures.length) process.exitCode = 1
