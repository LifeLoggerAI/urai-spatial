import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const workflowSource = fs.readFileSync(
  path.resolve(process.cwd(), '..', '.github', 'workflows', 'xr-static-gate-diagnostics.yml'),
  'utf8',
)

test('XR diagnostic workflow is exact-head and immutable-action bound', () => {
  assert.match(workflowSource, /actions\/checkout@11bd71901bbe5b1630ceea73d27597364c9af683/)
  assert.match(workflowSource, /actions\/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020/)
  assert.match(workflowSource, /actions\/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02/)
  assert.match(workflowSource, /fetch-depth: 1/)
  assert.match(workflowSource, /persist-credentials: false/)
  assert.match(workflowSource, /show-progress: false/)
  assert.match(workflowSource, /corepack prepare pnpm@10\.0\.0 --activate/)
})

test('every static gate is retained in the independent matrix', () => {
  for (const gate of [
    'check:source-integrity',
    'check:production-routes',
    'check:spatial-copy',
    'check:launch-boundary-contract',
    'check:spatial',
    'typecheck',
  ]) assert.match(workflowSource, new RegExp(gate.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
})

test('workflow aggregates failures and cannot end report-only green', () => {
  assert.match(workflowSource, /overall=0/)
  assert.match(workflowSource, /code=\$\{PIPESTATUS\[0\]\}/)
  assert.match(workflowSource, /overall=1/)
  assert.match(workflowSource, /XR static gate failed/)
  assert.match(workflowSource, /exit "\$overall"/)
  assert.doesNotMatch(workflowSource, /\n\s*exit 0\s*\n/)
})

test('diagnostic artifact is retained even when a gate fails', () => {
  assert.match(workflowSource, /if: always\(\)/)
  assert.match(workflowSource, /xr-static-gates\.log/)
  assert.match(workflowSource, /if-no-files-found: error/)
  assert.match(workflowSource, /retention-days: 30/)
})
