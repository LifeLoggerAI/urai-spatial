import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import test from 'node:test'

// Generated encoding fixtures exercise the actual installed FFmpeg lifecycle.
// They do not certify a real place, camera calibration, reconstruction or device.
const script = process.env.URAI_SOURCE_PREPARATION_TEST_SCRIPT
  ?? fileURLToPath(new URL('../../scripts/prepare-captured-reality-source.mjs', import.meta.url))
const hasFfmpeg = ['ffmpeg', 'ffprobe'].every((name) => spawnSync(name, ['-version']).status === 0)
const hash = (file) => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')
const run = (name, args) => {
  const result = spawnSync(name, args, { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 })
  assert.equal(result.status, 0, result.stderr)
  return result.stdout
}
const packetHashes = (file) => JSON.parse(run('ffprobe', [
  '-v', 'error', '-select_streams', 'v:0', '-show_packets', '-show_data_hash', 'sha256',
  '-show_entries', 'packet=data_hash', '-of', 'json', file,
])).packets.map((packet) => packet.data_hash)
function directory(fn) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'urai-captured-timeline-'))
  try { fn(dir) } finally { fs.rmSync(dir, { recursive: true, force: true }) }
}

test('stream-copy preserves encoded evidence through multiple source-bound intervals', { skip: !hasFfmpeg }, () => directory((dir) => {
  const source = path.join(dir, 'original.mp4'), out = path.join(dir, 'derivatives')
  run('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-f', 'lavfi', '-i', 'testsrc2=s=64x64:r=10:d=42',
    '-c:v', 'libx264', '-crf', '7', '-g', '100', '-bf', '0', '-force_key_frames', 'expr:gte(t,n_forced*10)', source])
  const originalHash = hash(source)
  run(process.execPath, [script, '--source', source, '--out-dir', out, '--segment-seconds', '20'])
  const receipt = JSON.parse(fs.readFileSync(path.join(out, 'original_DERIVATIVE_RECEIPT.json'), 'utf8'))
  assert.equal(hash(source), originalHash)
  assert.equal(receipt.derivativePolicy.mode, 'stream-copy')
  assert.equal(receipt.derivatives.length, 3)
  assert.deepEqual(receipt.derivatives.flatMap((item) => packetHashes(path.join(out, item.fileName))), packetHashes(source))
  let end = 0
  for (const item of receipt.derivatives) {
    assert.ok(Math.abs(item.sourceTimeline.startSeconds - end) <= .11)
    assert.ok(item.sourceTimeline.endSeconds > item.sourceTimeline.startSeconds)
    assert.equal(item.sourceTimeline.outputTimestampsReset, true)
    assert.equal(item.sourceTimeline.precision, 'CONTAINER_TIMING_NOT_FRAME_OR_SAMPLE_CORRESPONDENCE')
    assert.equal(item.sha256, hash(path.join(out, item.fileName)))
    end = item.sourceTimeline.endSeconds
  }
  assert.ok(Math.abs(end - 42) <= .11)
  assert.deepEqual(fs.readdirSync(out).filter((name) => name.startsWith('.source-preparation-')), [])
}))

test('bounded preparation retains an original-linked prefix and reports its bound', { skip: !hasFfmpeg }, () => directory((dir) => {
  const source = path.join(dir, 'original.mp4'), out = path.join(dir, 'derivatives')
  run('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-f', 'lavfi', '-i', 'testsrc2=s=64x64:r=10:d=4',
    '-c:v', 'libx264', '-crf', '7', '-g', '10', '-bf', '0', source])
  const originalHash = hash(source)
  run(process.execPath, [script, '--source', source, '--out-dir', out, '--segment-seconds', '20', '--duration-seconds', '1.5'])
  const receipt = JSON.parse(fs.readFileSync(path.join(out, 'original_DERIVATIVE_RECEIPT.json'), 'utf8'))
  assert.equal(hash(source), originalHash)
  assert.equal(receipt.original.sha256, originalHash)
  assert.equal(receipt.derivativePolicy.requestedSourceDurationSeconds, 1.5)
  assert.equal(receipt.derivatives.length, 1)
  const copied = packetHashes(path.join(out, receipt.derivatives[0].fileName))
  assert.equal(copied.length, 15)
  assert.deepEqual(copied, packetHashes(source).slice(0, 15))
  assert.ok(receipt.derivatives[0].sourceTimeline.endSeconds < 1.61)
}))

test('unsupported copy codec falls back explicitly without mixing attempts', { skip: !hasFfmpeg }, () => directory((dir) => {
  const source = path.join(dir, 'original.mkv'), out = path.join(dir, 'derivatives')
  run('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-f', 'lavfi', '-i', 'testsrc2=s=64x64:r=10:d=0.4',
    '-f', 'lavfi', '-i', 'sine=frequency=300:duration=0.4', '-c:v', 'ffv1', '-c:a', 'pcm_s16le', source])
  const originalHash = hash(source)
  run(process.execPath, [script, '--source', source, '--out-dir', out, '--segment-seconds', '20'])
  const receipt = JSON.parse(fs.readFileSync(path.join(out, 'original_DERIVATIVE_RECEIPT.json'), 'utf8'))
  assert.equal(hash(source), originalHash)
  assert.equal(receipt.derivativePolicy.mode, 'analysis-proxy')
  assert.equal(receipt.derivativePolicy.copyFallbackReason, 'STREAM_COPY_CONTAINER_INCOMPATIBLE_OR_FAILED')
  assert.equal(receipt.derivatives.length, 1)
  assert.ok(receipt.derivatives[0].probe.streams.some((stream) => stream.codec_type === 'audio' && stream.codec_name === 'aac'))
  assert.equal(receipt.derivatives[0].sha256, hash(path.join(out, receipt.derivatives[0].fileName)))
  run('ffmpeg', ['-v', 'error', '-i', path.join(out, receipt.derivatives[0].fileName), '-f', 'null', '-'])
  assert.deepEqual(fs.readdirSync(out).filter((name) => name.startsWith('.source-preparation-')), [])
}))

test('missing or invalid duration cannot become unbounded processing', { skip: !hasFfmpeg }, () => directory((dir) => {
  const source = path.join(dir, 'original.mp4')
  run('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-f', 'lavfi', '-i', 'color=s=32x32:d=0.1', '-c:v', 'libx264', source])
  for (const suffix of [[], ['0'], ['-1'], ['NaN'], ['Infinity']]) {
    const result = spawnSync(process.execPath, [script, '--source', source, '--out-dir', path.join(dir, 'never-created'), '--duration-seconds', ...suffix], { encoding: 'utf8' })
    assert.notEqual(result.status, 0)
    assert.equal(fs.existsSync(path.join(dir, 'never-created')), false)
  }
}))
