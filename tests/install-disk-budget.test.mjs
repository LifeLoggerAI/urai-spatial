import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import test from 'node:test'
import { fileURLToPath, pathToFileURL } from 'node:url'

const script = fileURLToPath(new URL('../scripts/check-install-disk-space.mjs', import.meta.url))

// Patch Node's built-in child_process only in the disposable test subprocess.
// Production retains its real df probe and unchanged 4096-MB install threshold.
// On Windows a temporary Unix '#!/bin/sh' df shim is not executable by spawnSync.
const mockProbe = [
  "import { createRequire, syncBuiltinESMExports } from 'node:module'",
  'const require = createRequire(import.meta.url)',
  "const childProcess = require('node:child_process')",
  'childProcess.spawnSync = (command, args, options) => {',
  "  if (command !== 'df' || args.length !== 2 || args[0] !== '-Pk' || args[1] !== '.' || options.encoding !== 'utf8') throw Error('UNEXPECTED_DISK_MEASUREMENT_COMMAND')",
  "  return { status: 0, stdout: 'Filesystem 1024-blocks Used Available Capacity Mounted on\nfixture 8388608 4194304 ' + process.env.URAI_TEST_AVAILABLE_KB + ' 50% /\n', stderr: '' }",
  '}',
  'syncBuiltinESMExports()',
  `await import(${JSON.stringify(pathToFileURL(script).href)})`,
].join('\n')

function preflight(availableKb, minimumMb = '4096') {
  return spawnSync(process.execPath, ['--input-type=module', '--eval', mockProbe], {
    encoding: 'utf8',
    shell: false,
    env: { ...process.env, URAI_TEST_AVAILABLE_KB: String(availableKb), URAI_MIN_INSTALL_FREE_MB: minimumMb },
  })
}

test('zero available bytes fail the unchanged default install budget', () => {
  const result = preflight(0)
  assert.equal(result.status, 1)
  assert.match(result.stderr, /Required at least 4096 MB; found 0 MB/)
  assert.doesNotMatch(result.stderr, /Could not parse/)
})

test('sub-megabyte available space is a measured budget failure', () => {
  const result = preflight(1)
  assert.equal(result.status, 1)
  assert.match(result.stderr, /found 0 MB/)
})

test('the exact existing four-GiB budget passes and one KiB less fails', () => {
  assert.equal(preflight(4096 * 1024).status, 0)
  assert.equal(preflight(4096 * 1024 - 1).status, 1)
})

test('invalid configured budgets remain rejected', () => {
  assert.equal(preflight(4096 * 1024, '0').status, 1)
  assert.equal(preflight(4096 * 1024, 'invalid').status, 1)
})

test('unavailable measurements do not masquerade as zero-space success', () => {
  const result = preflight('invalid')
  assert.equal(result.status, 0)
  assert.match(result.stderr, /Could not parse free disk space/)
  assert.doesNotMatch(result.stdout, /preflight passed/)
})
