import test from 'node:test'
import assert from 'node:assert/strict'
import path from 'node:path'
import os from 'node:os'
import { mkdtemp, mkdir, writeFile, readFile, lstat, symlink, rm } from 'node:fs/promises'
import { cleanupUnsealedCapture } from '../scripts/genesis-original-raw-cleanup.mjs'

async function underTemp(fn) {
  const base = await mkdtemp(path.join(os.tmpdir(), 'urai-genesis-raw-test-'))
  try { await fn(base) } finally { await rm(base, { recursive: true, force: true }) }
}

test('discard interrupted unencrypted raw footage without touching encrypted artifacts', async () => {
  await underTemp(async root => {
    const raw = path.join(root, 'raw')
    await mkdir(raw)
    await writeFile(path.join(raw, 'home.webm'), 'TEST ONLY: pretend unencrypted bytes')
    await writeFile(path.join(raw, 'capture-video.webm'), 'TEST ONLY: pretend raw continuous recording')
    await writeFile(path.join(root, 'home.sealed'), 'SEALED TEST ARTIFACT')
    const result = await cleanupUnsealedCapture(root, raw)
    assert.deepEqual(result, { cleaned: true, existed: true })
    await assert.rejects(lstat(raw), { code: 'ENOENT' })
    assert.equal(await readFile(path.join(root, 'home.sealed'), 'utf8'), 'SEALED TEST ARTIFACT')
  })
})

test('cleanup is idempotent when no recording was started', async () => {
  await underTemp(async root => {
    assert.deepEqual(await cleanupUnsealedCapture(root, path.join(root, 'raw')), { cleaned: true, existed: false })
  })
})

test('refuses to remove any folder other than the output/raw child', async () => {
  await underTemp(async root => {
    const other = path.join(root, 'retained-approved-evidence')
    await mkdir(other)
    await writeFile(path.join(other, 'receipt.json'), 'DO NOT DELETE')
    await assert.rejects(cleanupUnsealedCapture(root, other), /UNSEALED_CAPTURE_CLEANUP_PATH_MISMATCH/)
    await assert.rejects(cleanupUnsealedCapture(root, root), /UNSEALED_CAPTURE_CLEANUP_PATH_MISMATCH/)
    assert.equal(await readFile(path.join(other, 'receipt.json'), 'utf8'), 'DO NOT DELETE')
  })
})

test('does not follow a raw directory symlink into another directory', async () => {
  await underTemp(async root => {
    const retained = path.join(root, 'retained')
    await mkdir(retained)
    await writeFile(path.join(retained, 'evidence.txt'), 'SAVE')
    await symlink(retained, path.join(root, 'raw'), 'dir')
    await assert.rejects(cleanupUnsealedCapture(root, path.join(root, 'raw')), /UNSAFE_DIRECTORY/)
    assert.equal(await readFile(path.join(retained, 'evidence.txt'), 'utf8'), 'SAVE')
  })
})

test('refuses unexpected regular file instead of a raw directory', async () => {
  await underTemp(async root => {
    const raw = path.join(root, 'raw')
    await writeFile(raw, 'TEST')
    await assert.rejects(cleanupUnsealedCapture(root, raw), /UNSAFE_DIRECTORY/)
    assert.equal(await readFile(raw, 'utf8'), 'TEST')
  })
})
