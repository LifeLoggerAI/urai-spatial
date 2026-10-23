import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
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
  // Bare bash on Windows may invoke WSL, not the Git Bash workflow interpreter.
  const gitPaths = process.platform === 'win32'
    ? (spawnSync('where.exe', ['git.exe'], { encoding: 'utf8' }).stdout || '').split(/\r?\n/).filter(Boolean)
    : []
  const candidates = [
    ...gitPaths.map((location) => path.resolve(path.dirname(location), '..', 'bin', 'bash.exe')),
    path.join(process.env.ProgramFiles || 'C:\\Program Files', 'Git', 'bin', 'bash.exe'),
    path.join(process.env.ProgramW6432 || 'C:\\Program Files', 'Git', 'bin', 'bash.exe'),
  ]
  const bash = process.platform === 'win32' ? candidates.find((candidate) => fs.existsSync(candidate)) : 'bash'
  assert.ok(bash, 'Git Bash required on Windows to test the actual deployment refusal; WSL is not a substitute.')
  const result = spawnSync(bash, ['-c', script.replace(/^          /gm, '')], { encoding: 'utf8', env: { PATH: process.env.PATH } })
  assert.ifError(result.error)
  assert.equal(result.status, 1)
  assert.match(result.stderr, /retired and cannot launch production/)
  assert.match(result.stderr, /spatial-governed-wif-deploy\.yml/)
  assert.match(result.stderr, /independent exact-head approval/)
})
