import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const pnpmWrapper = path.join(repositoryRoot, 'scripts', 'run-pnpm.mjs')

function withIsolatedCheckout(callback) {
  const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'urai-pnpm-fallback-'))
  try {
    const binaries = path.join(scratch, 'fake-bin')
    fs.mkdirSync(binaries)
    return callback({ scratch, binaries })
  } finally {
    fs.rmSync(scratch, { recursive: true, force: true })
  }
}

function runWrapper({ scratch, binaries }) {
  return spawnSync(process.execPath, [pnpmWrapper, '--filter', 'urai-tier1', 'dev'], {
    cwd: scratch,
    encoding: 'utf8',
    env: { ...process.env, PATH: binaries, npm_execpath: '' },
  })
}

test('Firebase Studio provisions the Node 22 engine required by package.json', () => {
  const nix = fs.readFileSync(path.join(repositoryRoot, '.idx', 'dev.nix'), 'utf8')
  assert.match(nix, /packages\s*=\s*\[\s*pkgs\.nodejs_22\s*\]/)
  assert.doesNotMatch(nix, /pkgs\.nodejs_20\b/)
})

test('pnpm wrapper uses Corepack when no standalone pnpm or local pnpm exists', { skip: process.platform === 'win32' }, () => {
  withIsolatedCheckout(({ scratch, binaries }) => {
    const corepack = path.join(binaries, 'corepack')
    fs.writeFileSync(corepack, '#!/bin/sh\nprintf "FAKE_COREPACK:%s\\n" "$*"\n', { mode: 0o755 })
    const result = runWrapper({ scratch, binaries })
    assert.equal(result.status, 0, result.stdout + '\n' + result.stderr)
    assert.match(result.stdout, /FAKE_COREPACK:pnpm --filter urai-tier1 dev/)
  })
})

test('pnpm wrapper still prefers the original checkout-local pinned pnpm entrypoint', { skip: process.platform === 'win32' }, () => {
  withIsolatedCheckout(({ scratch, binaries }) => {
    const localPnpm = path.join(scratch, 'node_modules', '.pnpm', 'pnpm@10.0.0', 'node_modules', 'pnpm', 'bin', 'pnpm.cjs')
    fs.mkdirSync(path.dirname(localPnpm), { recursive: true })
    fs.writeFileSync(localPnpm, 'console.log("LOCAL_PNPM:" + process.argv.slice(2).join(" "))\n')
    const corepack = path.join(binaries, 'corepack')
    fs.writeFileSync(corepack, '#!/bin/sh\nprintf "FAKE_COREPACK:%s\\n" "$*"\n', { mode: 0o755 })
    const result = runWrapper({ scratch, binaries })
    assert.equal(result.status, 0, result.stdout + '\n' + result.stderr)
    assert.match(result.stdout, /LOCAL_PNPM:--filter urai-tier1 dev/)
    assert.doesNotMatch(result.stdout, /FAKE_COREPACK/)
  })
})
