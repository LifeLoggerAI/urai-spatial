import { test } from 'node:test'
import assert from 'node:assert/strict'
import path from 'node:path'
import os from 'node:os'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { resolvePinnedPnpm } from '../scripts/pnpm-bootstrap-resolver.mjs'

function fixture(run) {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'urai-pnpm-bootstrap-'))
  try { run(dir) } finally { rmSync(dir, { recursive: true, force: true }) }
}
const fakeNode = root => path.join(root, 'node-bin', 'node.exe')

test('portable Node22 missing Corepack chooses npm JS CLI with exact pinned pnpm and frozen install', () => fixture(dir => {
  const npm = path.join(dir, 'npm', 'bin', 'npm-cli.js')
  mkdirSync(path.dirname(npm), { recursive: true })
  writeFileSync(npm, '')
  const selected = resolvePinnedPnpm({ root: dir, nodeExecutable: fakeNode(dir),
    env: { npm_execpath: npm }, fileExists: c => c === npm })
  assert.equal(selected.command, fakeNode(dir))
  assert.deepEqual([...selected.argsPrefix, 'install', '--frozen-lockfile'],
    [npm, 'exec', '--yes', '--package=pnpm@10.0.0', '--', 'pnpm', 'install', '--frozen-lockfile'])
  assert.equal(selected.bootstrap, 'npm-cache')
}))

test('portable npx-cli bootstrap resolves sibling npm CLI without starting cmd shim', () => fixture(dir => {
  const npm = path.join(dir, 'npm', 'bin', 'npm-cli.js')
  const npx = path.join(dir, 'npm', 'bin', 'npx-cli.js')
  const selected = resolvePinnedPnpm({ root: dir, nodeExecutable: fakeNode(dir),
    env: { npm_execpath: npx }, fileExists: c => c === npm })
  assert.equal(selected.argsPrefix[0], npm)
  assert.equal(selected.command, fakeNode(dir))
}))

test('Windows-style npm directory on PATH resolves JS directly without npm.cmd', () => fixture(dir => {
  const cli = path.join(dir, 'node_modules', 'npm', 'bin', 'npm-cli.js')
  const selected = resolvePinnedPnpm({ root: path.join(dir, 'candidate'),
    nodeExecutable: fakeNode(dir), env: { PATH: dir }, fileExists: c => c === cli })
  assert.equal(selected.argsPrefix[0], cli)
  assert.equal(selected.bootstrap, 'npm-cache')
}))

test('exact-workspace-pinned pnpm is preferred over npm cache even without Corepack', () => fixture(dir => {
  const local = path.join(dir, 'node_modules', '.pnpm','pnpm@10.0.0','node_modules','pnpm','bin','pnpm.cjs')
  const cli = path.join(dir, 'npm-cli.js')
  const selected = resolvePinnedPnpm({ root: dir, nodeExecutable: fakeNode(dir),
    env: { npm_execpath: cli }, fileExists: c => c === local || c === cli })
  assert.equal(selected.bootstrap,'workspace')
  assert.deepEqual(selected.argsPrefix,[local])
}))

test('Corepack JS entrypoint works without any shell shim and precedes npm cache', () => fixture(dir => {
  const corepack = path.join(path.dirname(fakeNode(dir)), 'node_modules','corepack','dist','pnpm.js')
  const selected = resolvePinnedPnpm({ root: dir, nodeExecutable: fakeNode(dir),
    env: { npm_execpath: path.join(dir,'npm-cli.js') }, fileExists: c => c === corepack })
  assert.equal(selected.bootstrap,'corepack')
  assert.equal(selected.command,fakeNode(dir))
}))

test('no trusted Corepack, npm JS, or pinned pnpm refuses instead of giving a passing install', () => fixture(dir => {
  const selected = resolvePinnedPnpm({ root: dir, nodeExecutable: fakeNode(dir),
    env: { PATH: '' }, fileExists: () => false })
  assert.equal(selected,null)
}))

test('npm JS fallback runs under the same Node binary, preserving pinned frozen-install arguments', () => fixture(dir => {
  const npm = path.join(dir,'npm-cli.js')
  const capture = path.join(dir,'arguments.json')
  writeFileSync(npm, "const fs=require('node:fs');fs.writeFileSync(process.env.URAI_TEST_CAPTURE,JSON.stringify({node:process.execPath,args:process.argv.slice(2)}));")
  const selected = resolvePinnedPnpm({ root: dir, nodeExecutable: process.execPath,
    env: { npm_execpath:npm }, fileExists:c=>c===npm })
  const result = spawnSync(selected.command,[...selected.argsPrefix,'install','--frozen-lockfile'],
    { encoding:'utf8',env:{...process.env,URAI_TEST_CAPTURE:capture} })
  assert.equal(result.status,0,result.stderr)
  const inspected = JSON.parse(readFileSync(capture,'utf8'))
  assert.equal(inspected.node,process.execPath)
  assert.deepEqual(inspected.args,
    ['exec','--yes','--package=pnpm@10.0.0','--','pnpm','install','--frozen-lockfile'])
}))
