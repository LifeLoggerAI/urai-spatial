import assert from 'node:assert/strict'
import fs from 'node:fs'
import { spawnSync } from 'node:child_process'
import test from 'node:test'

const dispatcher = fs.readFileSync(new URL('../../.github/workflows/dispatch-production-once.yml', import.meta.url), 'utf8')

test('retired one-shot dispatcher fails closed without dispatch or deployment authority', () => {
  assert.match(dispatcher, /^name: RETIRED - Dispatch URAI Production Once/m)
  assert.match(dispatcher, /permissions:\n  contents: read/)
  assert.doesNotMatch(dispatcher, /(?:actions|id-token|contents): write/)
  assert.doesNotMatch(dispatcher, /uses:|createWorkflowDispatch|gh workflow run|firebase deploy|curl /)
  const script = dispatcher.split('        run: |\n')[1]
  assert.ok(script, 'retired workflow must retain an explicit refusal step')
  const result = spawnSync('bash', ['-c', script.replace(/^          /gm, '')], { encoding: 'utf8', env: { PATH: process.env.PATH } })
  assert.equal(result.status, 1)
  assert.match(result.stderr, /retired and cannot launch production/)
  assert.match(result.stderr, /spatial-governed-wif-deploy\.yml/)
  assert.match(result.stderr, /independent exact-head approval/)
})
