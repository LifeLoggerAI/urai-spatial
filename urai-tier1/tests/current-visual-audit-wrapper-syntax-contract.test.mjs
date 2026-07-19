import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import test from 'node:test'

test('current-canon visual audit wrapper remains valid JavaScript', () => {
  const result = spawnSync(process.execPath, ['--check', '../scripts/run-live-visual-audit-current.mjs'], {
    cwd: process.cwd(),
    encoding: 'utf8',
  })

  assert.equal(
    result.status,
    0,
    `run-live-visual-audit-current.mjs failed node --check:\n${result.stderr || result.stdout}`,
  )
})
