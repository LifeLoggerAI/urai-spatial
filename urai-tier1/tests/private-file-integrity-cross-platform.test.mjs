import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, writeFileSync, lstatSync, openSync, fstatSync, closeSync, rmSync, renameSync, symlinkSync, mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { samePrivateRegularFile, verifiedPrivateFileHash } from '../scripts/private-file-integrity.mjs'

test('same private source matches precise path and descriptor identity', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'urai-private-identity-'))
  const file = join(dir, 'source.ogg')
  try {
    writeFileSync(file, Buffer.from('synthetic only'))
    const before = lstatSync(file, { bigint: true })
    const fd = openSync(file, 'r')
    try {
      assert.equal(samePrivateRegularFile(before, fstatSync(fd, { bigint: true })), true)
    } finally { closeSync(fd) }
    assert.match(await verifiedPrivateFileHash(file, before), /^[0-9a-f]{64}$/)
    writeFileSync(file, Buffer.from('mutated source content'))
    await assert.rejects(verifiedPrivateFileHash(file, before), /PRIVATE_SOURCE_CHANGED_DURING_PREFLIGHT/)
  } finally { rmSync(dir, { recursive: true, force: true }) }
})

test('Windows path-stat dev zero matches only a pinned nonzero descriptor dev with same precise ID', () => {
  const dir = mkdtempSync(join(tmpdir(), 'urai-private-win-'))
  const file = join(dir, 'file')
  try {
    writeFileSync(file, Buffer.from('synthetic'))
    const base = lstatSync(file, { bigint: true })
    const pathStat = Object.assign(Object.create(Object.getPrototypeOf(base)), base, { dev: 0n })
    const handleStat = Object.assign(Object.create(Object.getPrototypeOf(base)), base, { dev: 123n })
    assert.equal(samePrivateRegularFile(pathStat, handleStat, 'win32'), true)
    assert.equal(samePrivateRegularFile(pathStat, handleStat, 'linux'), false)
    assert.equal(samePrivateRegularFile(pathStat, Object.assign(Object.create(Object.getPrototypeOf(base)), handleStat, { ino: base.ino + 1n }), 'win32'), false)
    assert.equal(samePrivateRegularFile(pathStat, Object.assign(Object.create(Object.getPrototypeOf(base)), handleStat, { size: base.size + 1n }), 'win32'), false)
    assert.equal(samePrivateRegularFile(pathStat, Object.assign(Object.create(Object.getPrototypeOf(base)), handleStat, { mtimeNs: base.mtimeNs + 1n }), 'win32'), false)
  } finally { rmSync(dir, { recursive: true, force: true }) }
})


test('a replaced private path is denied even when its bytes and length match', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'urai-private-replacement-'))
  const file = join(dir, 'source.ogg')
  const replacement = join(dir, 'replacement.ogg')
  try {
    writeFileSync(file, Buffer.from('same synthetic bytes'))
    writeFileSync(replacement, Buffer.from('same synthetic bytes'))
    const pinned = lstatSync(file, { bigint: true })
    rmSync(file)
    renameSync(replacement, file)
    assert.equal(samePrivateRegularFile(pinned, lstatSync(file, { bigint: true })), false)
    await assert.rejects(verifiedPrivateFileHash(file, pinned), /PRIVATE_SOURCE_CHANGED_DURING_PREFLIGHT/)
  } finally { rmSync(dir, { recursive: true, force: true }) }
})

test('a symlink substituted for an already-pinned source is denied before hashing', { skip: process.platform === 'win32' }, async () => {
  const dir = mkdtempSync(join(tmpdir(), 'urai-private-link-'))
  const file = join(dir, 'source.ogg')
  const moved = join(dir, 'moved.ogg')
  try {
    writeFileSync(file, Buffer.from('local synthetic source'))
    const pinned = lstatSync(file, { bigint: true })
    renameSync(file, moved)
    symlinkSync(moved, file)
    await assert.rejects(verifiedPrivateFileHash(file, pinned), /PRIVATE_SOURCE_CHANGED_DURING_PREFLIGHT/)
  } finally { rmSync(dir, { recursive: true, force: true }) }
})

test('comparison rejects all unsafe timestamp and hardlink metadata changes', () => {
  const dir = mkdtempSync(join(tmpdir(), 'urai-private-stat-fields-'))
  const file = join(dir, 'source.ogg')
  try {
    writeFileSync(file, Buffer.from('synthetic'))
    const stat = lstatSync(file, { bigint: true })
    const copy = patch => Object.assign(Object.create(Object.getPrototypeOf(stat)), stat, patch)
    for (const key of ['size', 'mtimeNs', 'ctimeNs', 'birthtimeNs', 'nlink']) {
      assert.equal(samePrivateRegularFile(stat, copy({ [key]: stat[key] + 1n })), false, `${key} cannot drift`)
    }
    assert.equal(samePrivateRegularFile(stat, copy({ ino: stat.ino + 2n ** 54n })), false, 'full-width inode must be compared')
    assert.equal(samePrivateRegularFile(stat, copy({ ino: 0n })), false, 'zero inode must deny')
    assert.equal(samePrivateRegularFile(stat, copy({ dev: stat.dev + 1n }), 'linux'), false, 'foreign volume must deny')
    assert.equal(samePrivateRegularFile(stat, copy({ dev: stat.dev + 1n }), 'win32'), false, 'two positive unequal Windows volumes must deny')
    assert.equal(samePrivateRegularFile(stat, copy({ mtimeNs: Number(stat.mtimeNs) })), false, 'numeric rounding cannot authenticate source')
  } finally { rmSync(dir, { recursive: true, force: true }) }
})

test('non-regular paths and unsupported file identity fail closed', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'urai-private-types-'))
  const file = join(dir, 'source.ogg')
  const folder = join(dir, 'folder')
  try {
    writeFileSync(file, Buffer.from('synthetic'))
    mkdirSync(folder)
    const pinned = lstatSync(file, { bigint: true })
    const directoryStat = lstatSync(folder, { bigint: true })
    assert.equal(samePrivateRegularFile(pinned, directoryStat), false)
    await assert.rejects(verifiedPrivateFileHash(folder, directoryStat), /PRIVATE_SOURCE_CHANGED_DURING_PREFLIGHT/)
    assert.equal(samePrivateRegularFile(pinned, { ...pinned }), false, 'plain record is not an authentic stat')
    assert.equal(samePrivateRegularFile(pinned, null), false)
  } finally { rmSync(dir, { recursive: true, force: true }) }
})

test('verified private hash matches independent SHA-256 for synthetic bytes', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'urai-private-digest-'))
  const file = join(dir, 'source.ogg')
  try {
    const bytes = Buffer.from('immutable synthetic audio source for integrity verification')
    writeFileSync(file, bytes)
    const { createHash } = await import('node:crypto')
    const expected = createHash('sha256').update(bytes).digest('hex')
    assert.equal(await verifiedPrivateFileHash(file, lstatSync(file, { bigint: true })), expected)
  } finally { rmSync(dir, { recursive: true, force: true }) }
})
