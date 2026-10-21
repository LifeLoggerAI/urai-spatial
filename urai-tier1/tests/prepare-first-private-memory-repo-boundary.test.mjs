import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, symlinkSync, rmSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { privatePacketWrite } from '../scripts/prepare-first-private-memory.mjs'

const packet = { memory: { fixture: true, ownerId: 'synthetic-test-only' }, upload: { fixture: true } }

test('private packets cannot be written to repository ancestor from subdirectory CWD', () => {
 const temp = mkdtempSync(join(tmpdir(), 'urai-repo-check-'))
 const checkout = join(temp, 'checkout')
 const nested = join(checkout, 'urai-tier1')
 mkdirSync(nested, { recursive: true }); mkdirSync(join(checkout, '.git'))
 const before = process.cwd()
 try {
   process.chdir(nested)
   const output = join(checkout, 'private-handoff')
   assert.throws(() => privatePacketWrite(packet, output), /PRIVATE_PACKET_MUST_STAY_OUTSIDE_REPOSITORY/)
   assert.equal(existsSync(output), false, 'no owner packet can be created inside git checkout')
 } finally { process.chdir(before); rmSync(temp, { recursive: true, force: true }) }
})

test('private packets cannot follow parent symlink into Git checkout', () => {
 const temp = mkdtempSync(join(tmpdir(), 'urai-symlink-check-'))
 const checkout = join(temp, 'checkout')
 const link = join(temp, 'external-looking-output-parent')
 mkdirSync(checkout); mkdirSync(join(checkout, '.git')); mkdirSync(join(temp, 'unrelated'))
 symlinkSync(checkout, link, 'dir')
 const before = process.cwd()
 try {
   process.chdir(join(temp, 'unrelated'))
   const output = join(link, 'private-handoff')
   assert.throws(() => privatePacketWrite(packet, output), /PRIVATE_PACKET_MUST_STAY_OUTSIDE_REPOSITORY/)
   assert.equal(existsSync(join(checkout, 'private-handoff')), false)
 } finally { process.chdir(before); rmSync(temp, { recursive: true, force: true }) }
})

test('private packet remains permitted in a new non-repository private directory', () => {
 const temp = mkdtempSync(join(tmpdir(), 'urai-output-safe-'))
 try {
  const output = join(temp, 'private-handoff')
  assert.equal(privatePacketWrite(packet, output), output)
  assert.equal(existsSync(join(output, 'memory.private.json')), true)
  assert.equal(existsSync(join(output, 'handoff.private.json')), true)
 } finally { rmSync(temp, { recursive: true, force: true }) }
})
