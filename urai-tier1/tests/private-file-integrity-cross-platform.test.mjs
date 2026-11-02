import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, writeFileSync, lstatSync, openSync, fstatSync, closeSync, rmSync } from 'node:fs'
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
