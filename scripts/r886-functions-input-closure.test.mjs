import test from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { tmpdir } from 'node:os'
import { attestFunctionsBuild, verifyFunctionsBuild } from './R883_VERIFY_FUNCTIONS_BUILD.mjs'

function git(root, ...args) {
  return execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim()
}
function write(path, bytes) {
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, bytes)
}
function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'urai-r886-build-closure-'))
  t.after(() => rmSync(root, { recursive: true, force: true }))
  git(root, 'init', '-q')
  git(root, 'config', 'user.email', 'test@example.invalid')
  git(root, 'config', 'user.name', 'R886 Fixture')
  write(join(root, 'apps/functions/src/index.ts'), 'export const x = 1\n')
  write(join(root, 'apps/functions/tsconfig.json'), '{}\n')
  write(join(root, 'apps/functions/package.json'), '{"name":"urai-functions"}\n')
  write(join(root, 'apps/functions/lib/apps/functions/src/index.js'), 'exports.x = 1\n')
  write(join(root, 'packages/tier-locks/src/index.ts'), 'export const tier = 1\n')
  write(join(root, 'packages/tier-locks/package.json'), '{"name":"@urai/tier-locks","version":"0.0.0"}\n')
  write(join(root, 'pnpm-lock.yaml'), 'lockfileVersion: 10.0\n')
  write(join(root, 'pnpm-workspace.yaml'), 'packages: []\n')
  write(join(root, 'package.json'), '{}\n')
  write(join(root, 'firebase.json'), '{}\n')
  git(root, 'add', 'apps/functions/src', 'apps/functions/tsconfig.json', 'apps/functions/package.json',
    'packages/tier-locks/src', 'packages/tier-locks/package.json', 'pnpm-lock.yaml',
    'pnpm-workspace.yaml', 'package.json', 'firebase.json')
  git(root, 'commit', '-qm', 'R886 synthetic fixture')
  const options = { repoRoot: root, expectedSha: git(root, 'rev-parse', 'HEAD'),
    runId: '886001', manifestPath: join(root, 'receipt.json') }
  return { root, options }
}

test('R886 Functions attestation includes Tier Locks package metadata', t => {
  const f = fixture(t)
  const result = attestFunctionsBuild(f.options)
  assert.equal(result.pass, true)
  assert.equal(verifyFunctionsBuild(f.options).pass, true)
})

test('R886 changed Tier Locks package metadata invalidates attestation', t => {
  const f = fixture(t)
  attestFunctionsBuild(f.options)
  write(join(f.root, 'packages/tier-locks/package.json'),
    '{"name":"@urai/tier-locks","version":"0.0.1"}\n')
  assert.throws(() => verifyFunctionsBuild(f.options), /Source build inputs differ/)
})

test('R886 re-committed Tier Locks metadata changes source identity', t => {
  const f = fixture(t)
  attestFunctionsBuild(f.options)
  const oldFunctionsTree = git(f.root, 'rev-parse', 'HEAD:apps/functions')
  write(join(f.root, 'packages/tier-locks/package.json'),
    '{"name":"@urai/tier-locks","version":"0.0.1"}\n')
  git(f.root, 'add', 'packages/tier-locks/package.json')
  git(f.root, 'commit', '-qm', 'Tier Locks metadata changed')
  assert.equal(git(f.root, 'rev-parse', 'HEAD:apps/functions'), oldFunctionsTree)
  assert.throws(() => verifyFunctionsBuild(f.options), /Checkout HEAD does not match/)
})
