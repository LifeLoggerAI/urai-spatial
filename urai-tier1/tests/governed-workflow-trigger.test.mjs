import assert from 'node:assert/strict'
import test from 'node:test'
import { governedWorkflowIsManualOnly } from '../../scripts/governed-workflow-trigger.mjs'

const workflow = (events) => `on:\n${events}\npermissions:\n  contents: read\n`
test('manual input named pull_request does not grant an automatic PR trigger', () => {
  assert.equal(governedWorkflowIsManualOnly(workflow('  workflow_dispatch:\n    inputs:\n      pull_request:\n        type: string')), true)
})
test('automatic and unknown top-level triggers fail closed beside manual dispatch', () => {
  for (const event of ['push', 'pull_request', 'pull_request_target', 'schedule', 'workflow_run', '"push"', "'pull_request'"]) {
    assert.equal(governedWorkflowIsManualOnly(workflow(`  workflow_dispatch:\n  ${event}:`)), false, event)
  }
})
test('duplicate dispatch and malformed or inline trigger blocks fail closed', () => {
  for (const source of [workflow('  workflow_dispatch:\n  workflow_dispatch:'), workflow('    workflow_dispatch:'), 'on: [push]\npermissions:\n  contents: read', '', workflow('  push:')]) {
    assert.equal(governedWorkflowIsManualOnly(source), false)
  }
})
