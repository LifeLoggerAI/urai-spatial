import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import crypto from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import test from 'node:test'

const script = fileURLToPath(new URL('../../scripts/prepare-captured-reality-source.mjs', import.meta.url))
const hasFfmpeg = ['ffmpeg', 'ffprobe'].every((name) => spawnSync(name, ['-version']).status === 0)
const hash = (file) => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')

test('real source preparation preserves originals and refuses to reuse or overwrite prior provenance', { skip: !hasFfmpeg }, () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'urai-captured-source-'))
  try {
    const source = path.join(dir, 'test.mp4')
    const out = path.join(dir, 'derivatives')
    const generated = spawnSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-f', 'lavfi', '-i', 'color=c=blue:s=32x32:d=0.2', '-c:v', 'libx264', source], { encoding: 'utf8' })
    assert.equal(generated.status, 0, generated.stderr)
    const originalHash = hash(source)
    const args = [script, '--source', source, '--out-dir', out, '--segment-seconds', '20']
    const first = spawnSync(process.execPath, args, { encoding: 'utf8' })
    assert.equal(first.status, 0, first.stderr)
    const receiptPath = path.join(out, 'test_DERIVATIVE_RECEIPT.json')
    const receipt = JSON.parse(fs.readFileSync(receiptPath, 'utf8'))
    assert.equal(receipt.original.sha256, originalHash)
    assert.equal(hash(source), originalHash)
    assert.equal(receipt.derivatives.length, 1)
    assert.equal(receipt.derivatives[0].sha256, hash(path.join(out, receipt.derivatives[0].fileName)))
    const receiptHash = hash(receiptPath)
    // A leftover from another run must never be incorporated as source truth.
    const stale = path.join(out, 'test_PART999.mp4')
    fs.writeFileSync(stale, 'unrelated footage')
    const second = spawnSync(process.execPath, args, { encoding: 'utf8' })
    assert.notEqual(second.status, 0)
    assert.match(second.stderr, /select a fresh --out-dir/)
    assert.equal(hash(source), originalHash)
    assert.equal(hash(receiptPath), receiptHash)
    assert.equal(fs.readFileSync(stale, 'utf8'), 'unrelated footage')
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})
