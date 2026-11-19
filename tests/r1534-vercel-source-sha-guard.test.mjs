import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import test from 'node:test'

const root = path.resolve(import.meta.dirname, '..')
const config = path.join(root, 'urai-tier1', 'next.config.mjs')
const one = 'a'.repeat(40)
const two = 'b'.repeat(40)
function evaluate(env) {
  const result = spawnSync(process.execPath, ['--input-type=module', '-e', 'await import(process.argv[1])', config], {
    cwd: root,
    env: { PATH: process.env.PATH || '/usr/bin:/bin', HOME: process.env.HOME || '/tmp', ...env },
    encoding: 'utf8',
    timeout: 12000,
  })
  return { status: result.status, stderr: result.stderr }
}
test('Vercel source labels must match provider Git SHA exactly', () => {
  assert.equal(evaluate({ VERCEL: '1', VERCEL_GIT_COMMIT_SHA: one, NEXT_PUBLIC_URAI_BUILD_SHA: one }).status, 0)
  for (const env of [
    { VERCEL: '1', VERCEL_GIT_COMMIT_SHA: one, NEXT_PUBLIC_URAI_BUILD_SHA: two },
    { VERCEL: '1', VERCEL_GIT_COMMIT_SHA: one },
    { VERCEL: '1', NEXT_PUBLIC_URAI_BUILD_SHA: one },
    { VERCEL: '1', VERCEL_GIT_COMMIT_SHA: 'not-a-sha', NEXT_PUBLIC_URAI_BUILD_SHA: one },
    { VERCEL: '1', VERCEL_GIT_COMMIT_SHA: one.toUpperCase(), NEXT_PUBLIC_URAI_BUILD_SHA: one },
  ]) {
    const result = evaluate(env)
    assert.notEqual(result.status, 0)
    assert.match(result.stderr, /URAI_SOURCE_SHA_MISMATCH/)
  }
})
test('Local development does not require Vercel Git SHA; strict local check can be enabled', () => {
  assert.equal(evaluate({}).status, 0)
  assert.equal(evaluate({ URAI_ENFORCE_SOURCE_SHA_MATCH: 'true', VERCEL_GIT_COMMIT_SHA: one, NEXT_PUBLIC_URAI_BUILD_SHA: one }).status, 0)
  assert.notEqual(evaluate({ URAI_ENFORCE_SOURCE_SHA_MATCH: 'true', VERCEL_GIT_COMMIT_SHA: two, NEXT_PUBLIC_URAI_BUILD_SHA: one }).status, 0)
})
