import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import {
  availableDiskKiB,
  assessInstallDiskBudget,
  requiredDiskMb,
} from '../scripts/install-disk-budget.mjs'

const script = fileURLToPath(new URL('../scripts/check-install-disk-space.mjs', import.meta.url))

function preflight(availableKb, minimumMb = '4096') {
  return assessInstallDiskBudget(BigInt(availableKb), minimumMb)
}

test('zero available bytes fail the unchanged default install budget', () => {
  const result = preflight(0)
  assert.equal(result.minimumMb, 4096n)
  assert.equal(result.availableMb, 0n)
  assert.equal(result.sufficient, false)
})

test('sub-megabyte available space is a measured budget failure', () => {
  const result = preflight(1)
  assert.equal(result.availableMb, 0n)
  assert.equal(result.sufficient, false)
})

test('the exact existing four-GiB budget passes and one KiB less fails', () => {
  assert.equal(preflight(4096 * 1024).sufficient, true)
  assert.equal(preflight(4096 * 1024 - 1).sufficient, false)
})

test('invalid configured budgets remain rejected rather than being rounded or bypassed', () => {
  for (const input of ['0', '-1', 'invalid', '1.5', '4096garbage', '', '9999999999999999999']) {
    assert.throws(() => requiredDiskMb(input), /INVALID_DISK_BUDGET/)
  }
})

test('missing or invalid real measurement is fail-closed, not a fake zero-space success', () => {
  assert.throws(() => availableDiskKiB({ statfs: () => { throw new Error('EIO') } }), /EIO/)
  for (const shape of [{ bsize: 0n, bavail: 1n }, { bsize: 4096n, bavail: -1n }]) {
    assert.throws(() => availableDiskKiB({ statfs: () => shape }), /INVALID_DISK_MEASUREMENT/)
  }
  assert.throws(() => assessInstallDiskBudget(-1n), /INVALID_DISK_MEASUREMENT/)
})

test('filesystem blocks use available rather than total or reserved free bytes', () => {
  const measured = availableDiskKiB({ statfs: (_location, options) => {
    assert.equal(options.bigint, true)
    return { bsize: 4096n, bavail: 1024n, bfree: 99_999n, blocks: 999_999n }
  } })
  assert.equal(measured, 4096n)
  assert.equal(assessInstallDiskBudget(measured, '4').sufficient, true)
  assert.equal(assessInstallDiskBudget(measured, '5').sufficient, false)
})

test('real Node 22 CLI rejects impossible install budget with a nonzero exit', () => {
  const actual = spawnSync(process.execPath, [script], {
    encoding: 'utf8',
    env: { ...process.env, URAI_MIN_INSTALL_FREE_MB: '9007199254740991' },
    timeout: 10000,
    shell: false,
  })
  assert.ifError(actual.error)
  assert.equal(actual.status, 1, actual.stdout + actual.stderr)
  assert.match(actual.stderr, /Not enough free disk space for install/)
  assert.doesNotMatch(actual.stdout, /preflight passed/)
})
