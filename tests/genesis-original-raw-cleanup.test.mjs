import test from 'node:test'
import assert from 'node:assert/strict'
import path from 'node:path'
import os from 'node:os'
import { mkdtemp, mkdir, writeFile, readFile, lstat, symlink, rm } from 'node:fs/promises'
import { cleanupUnsealedCapture, cleanupUnsealedFallbackCapture } from '../scripts/genesis-original-raw-cleanup.mjs'

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

// Additional independent-route capture cleanup: these are fake test bytes only.
test('remove independent scene raw WebM and CDP JPEGs while preserving encrypted proof', async () => {
  await underTemp(async root => {
    const frames = path.join(root, 'ascent', 'cdp-frames')
    await mkdir(frames, { recursive: true })
    await writeFile(path.join(frames, '000001.jpg'), 'SYNTHETIC FRAME FIXTURE')
    await writeFile(path.join(root, 'ascent', 'cdp-frames.txt'), 'TEST CONCAT')
    await writeFile(path.join(root, 'ascent', 'playwright-video.webm'), 'TEST MEDIA')
    await writeFile(path.join(root, 'ascent.webm'), 'TEST MEDIA')
    await writeFile(path.join(root, 'ascent.sealed'), 'ENCRYPTED TEST SEAL')
    await writeFile(path.join(root, 'native-capture-receipt.json'), 'RECEIPT')
    assert.deepEqual(await cleanupUnsealedFallbackCapture(root, 'ascent'), { cleaned: true, removedFolder: true, removedVideo: true })
    await assert.rejects(lstat(path.join(root, 'ascent')), {code:'ENOENT'})
    await assert.rejects(lstat(path.join(root, 'ascent.webm')), {code:'ENOENT'})
    assert.equal(await readFile(path.join(root, 'ascent.sealed'), 'utf8'), 'ENCRYPTED TEST SEAL')
    assert.equal(await readFile(path.join(root, 'native-capture-receipt.json'), 'utf8'), 'RECEIPT')
  })
})

test('fallback scene cleanup is idempotent', async () => {
  await underTemp(async root => {
    assert.deepEqual(await cleanupUnsealedFallbackCapture(root, 'orb'), { cleaned: true, removedFolder: false, removedVideo: false })
    await writeFile(path.join(root, 'orb.webm'), 'TEST MEDIA')
    assert.deepEqual(await cleanupUnsealedFallbackCapture(root, 'orb'), { cleaned: true, removedFolder: false, removedVideo: true })
    assert.deepEqual(await cleanupUnsealedFallbackCapture(root, 'orb'), { cleaned: true, removedFolder: false, removedVideo: false })
  })
})

test('fallback cleanup rejects paths outside exact supported scene allowlist', async () => {
  await underTemp(async root => {
    const protectedFile = path.join(root, 'recording.webm')
    await writeFile(protectedFile, 'DO NOT DELETE')
    for (const name of ['../../other', 'recording', '../home', '', '.git', 'orb.webm']) {
      await assert.rejects(cleanupUnsealedFallbackCapture(root, name), /SCENE_INVALID/)
    }
    assert.equal(await readFile(protectedFile, 'utf8'), 'DO NOT DELETE')
  })
})

test('fallback cleanup refuses symlinked raw video and scene folder without following them', async () => {
  await underTemp(async root => {
    const protectedDir = path.join(root, 'keep')
    await mkdir(protectedDir)
    await writeFile(path.join(protectedDir, 'data.txt'), 'SAVE')
    await symlink(protectedDir, path.join(root, 'replay'), 'dir')
    await assert.rejects(cleanupUnsealedFallbackCapture(root, 'replay'), /FOLDER_UNSAFE/)
    assert.equal(await readFile(path.join(protectedDir, 'data.txt'),'utf8'), 'SAVE')
    await symlink(path.join(protectedDir,'data.txt'), path.join(root, 'home.webm'))
    await assert.rejects(cleanupUnsealedFallbackCapture(root, 'home'), /VIDEO_UNSAFE/)
    assert.equal(await readFile(path.join(protectedDir, 'data.txt'),'utf8'), 'SAVE')
  })
})

test('fallback cleanup refuses a symlinked output root', async () => {
  await underTemp(async base => {
    const actual = path.join(base, 'real')
    await mkdir(actual)
    const alias = path.join(base, 'alias')
    await symlink(actual, alias, 'dir')
    await assert.rejects(cleanupUnsealedFallbackCapture(alias, 'home'), /ROOT_UNSAFE/)
  })
})

test('fallback source integrates a final cleanup gate and hashes sealed rather than deleted raw files', async () => {
  const source = await readFile(new URL('../scripts/genesis-original-native-motion-hold.mjs', import.meta.url), 'utf8')
  assert.match(source, /async function captureUnsealed\(/)
  assert.match(source, /async function capture\([\s\S]*?finally\s*\{[\s\S]*?cleanupUnsealedFallbackCapture\(destination, spec\.name\)/)
  assert.match(source, /if\s*\(scene\.accepted && !scene\.sealed\)/)
  assert.match(source, /for\(const scene of receipt\.scenes\)if\(scene\.sealed\)hashes\.push\(/)
  assert.doesNotMatch(source, /if\(scene\.video\)hashes\.push/)
})
