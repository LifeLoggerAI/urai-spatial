import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, mkdir, writeFile, symlink, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { assertPrivateEvidenceDirectory } from '../scripts/genesis-private-evidence-path.mjs'

const guard = directory => assertPrivateEvidenceDirectory(directory, {
  gitError: 'PRIVATE_GIT_FORBIDDEN', symlinkError: 'PRIVATE_SYMLINK_FORBIDDEN',
})

async function fixture(callback) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'urai-genesis-path-'))
  try { await callback(root) } finally { await rm(root, { recursive: true, force: true }) }
}

test('ordinary private directory and a future child are allowed', async () => {
  await fixture(async root => {
    const privateDir = path.join(root, 'private')
    await mkdir(privateDir)
    await guard(privateDir)
    await guard(path.join(privateDir, 'fresh-evidence'))
  })
})

test('both a checkout itself and an uncreated child under it are rejected', async () => {
  await fixture(async root => {
    const checkout = path.join(root, 'checkout')
    await mkdir(checkout)
    await writeFile(path.join(checkout, '.git'), 'gitdir: private-fixture')
    await assert.rejects(guard(checkout), /PRIVATE_GIT_FORBIDDEN/)
    await assert.rejects(guard(path.join(checkout, 'fresh-evidence')), /PRIVATE_GIT_FORBIDDEN/)
  })
})

test('linked ancestors cannot redirect private artifacts into a checkout', async t => {
  await fixture(async root => {
    const checkout = path.join(root, 'checkout')
    const alias = path.join(root, 'alias')
    await mkdir(checkout)
    await writeFile(path.join(checkout, '.git'), 'gitdir: private-fixture')
    try {
      await symlink(checkout, alias, process.platform === 'win32' ? 'junction' : 'dir')
    } catch (error) {
      if (['EPERM', 'EACCES', 'ENOTSUP'].includes(error.code)) { t.skip('filesystem disallows directory links'); return }
      throw error
    }
    await assert.rejects(guard(alias), /PRIVATE_SYMLINK_FORBIDDEN/)
    await assert.rejects(guard(path.join(alias, 'fresh-evidence')), /PRIVATE_SYMLINK_FORBIDDEN/)
  })
})

test('a linked ancestor is refused even if its target is not a checkout', async t => {
  await fixture(async root => {
    const ordinary = path.join(root, 'ordinary')
    const alias = path.join(root, 'alias')
    await mkdir(ordinary)
    try {
      await symlink(ordinary, alias, process.platform === 'win32' ? 'junction' : 'dir')
    } catch (error) {
      if (['EPERM', 'EACCES', 'ENOTSUP'].includes(error.code)) { t.skip('filesystem disallows directory links'); return }
      throw error
    }
    await assert.rejects(guard(path.join(alias, 'future')), /PRIVATE_SYMLINK_FORBIDDEN/)
  })
})

test('bad or relative inputs fail closed', async () => {
  await assert.rejects(guard('relative/private'), /PRIVATE_EVIDENCE_PATH_GUARD_INVALID_INPUT/)
  await assert.rejects(guard(''), /PRIVATE_EVIDENCE_PATH_GUARD_INVALID_INPUT/)
  await assert.rejects(assertPrivateEvidenceDirectory('/tmp', { gitError:'', symlinkError:'x' }), /PRIVATE_EVIDENCE_PATH_GUARD_INVALID_INPUT/)
})
