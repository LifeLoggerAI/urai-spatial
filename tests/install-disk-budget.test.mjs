import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const script = fileURLToPath(new URL('../scripts/check-install-disk-space.mjs', import.meta.url))

function preflight(availableKb, minimumMb = '4096') {
  const directory = mkdtempSync(path.join(tmpdir(), 'urai-install-disk-'))
  try {
    const df = path.join(directory, 'df')
    writeFileSync(df, '#!/bin/sh\nprintf "Filesystem 1024-blocks Used Available Capacity Mounted on\\nfixture 8388608 4194304 %s 50%% /\\n" "$URAI_TEST_AVAILABLE_KB"\n', { mode: 0o755 })
    return spawnSync(process.execPath, [script], {
      encoding: 'utf8',
      env: { ...process.env, PATH: `${directory}:${process.env.PATH}`, URAI_TEST_AVAILABLE_KB: String(availableKb), URAI_MIN_INSTALL_FREE_MB: minimumMb },
    })
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
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
