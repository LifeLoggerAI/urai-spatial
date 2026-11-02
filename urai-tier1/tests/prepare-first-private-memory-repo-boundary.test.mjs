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


import { copyFileSync, linkSync } from 'node:fs'
import { dirname } from 'node:path'
import { pathToFileURL } from 'node:url'
import { prepareFirstPrivateMemory } from '../scripts/prepare-first-private-memory.mjs'

// Reconstruct a source distribution without a .git marker, so this test
// fails if the guard depends on the execution CWD or git metadata.
async function exportedSourceFixture() {
  const temp = mkdtempSync(join(tmpdir(), 'urai-private-export-'))
  const source = join(temp, 'exported-source')
  const script = join(source, 'urai-tier1', 'scripts', 'prepare-first-private-memory.mjs')
  mkdirSync(dirname(script), { recursive: true })
  copyFileSync(new URL('../scripts/prepare-first-private-memory.mjs', import.meta.url), script)
  const module = await import(pathToFileURL(script).href)
  return { temp, source, write: module.privatePacketWrite }
}

test('private packet rejects source export without .git when launched from another directory', async () => {
  const f = await exportedSourceFixture()
  const target = join(f.source, 'private-synthetic-no-output')
  try {
    assert.throws(() => f.write(packet, target), /PRIVATE_PACKET_MUST_STAY_OUTSIDE_REPOSITORY/)
    assert.equal(existsSync(target), false)
  } finally { rmSync(f.temp, { recursive: true, force: true }) }
})

test('private packet rejects symlinked destination into source export without .git', async () => {
  const f = await exportedSourceFixture()
  const alias = join(f.temp, 'innocent-looking-output')
  symlinkSync(f.source, alias, 'dir')
  try {
    assert.throws(() => f.write(packet, join(alias, 'private-synthetic-no-output')), /PRIVATE_PACKET_MUST_STAY_OUTSIDE_REPOSITORY/)
    assert.equal(existsSync(join(f.source, 'private-synthetic-no-output')), false)
  } finally { rmSync(f.temp, { recursive: true, force: true }) }
})

test('outside-repository private output under current working directory is allowed', () => {
  const temp = mkdtempSync(join(tmpdir(), 'urai-allowed-private-'))
  const previous = process.cwd()
  try {
    process.chdir(temp)
    const target = join(temp, 'owner-packet-synthetic')
    assert.equal(privatePacketWrite(packet, target), target)
    assert.equal(existsSync(join(target, 'memory.private.json')), true)
  } finally { process.chdir(previous); rmSync(temp, { recursive: true, force: true }) }
})

test('private memory rejects a derivative hard-linked to the original', async () => {
  const temp = mkdtempSync(join(tmpdir(), 'urai-same-file-'))
  try {
    const original = join(temp, 'original.mp3')
    const derivative = join(temp, 'derivative.mp3')
    writeFileSync(original, Buffer.from('ID3 synthetic only'))
    linkSync(original, derivative)
    await assert.rejects(prepareFirstPrivateMemory({
      ownerId: 'syntheticowner', memoryId: 'syntheticmemory', originalPath: original,
      sourcePath: derivative, sourceRef: 'source:synthetic-fake',
      occurredAt: '2026-10-21T00:00:00.000Z', occurredAtBasis: 'verified-event-time',
      durationMs: 12000, title: 'Synthetic test',
      summary: 'Completely synthetic regression material only.',
    }), /DERIVATIVE_MUST_NOT_OVERWRITE_ORIGINAL/)
  } finally { rmSync(temp, { recursive: true, force: true }) }
})
