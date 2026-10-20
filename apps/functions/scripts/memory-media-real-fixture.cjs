'use strict'
const assert = require('node:assert/strict')
const { createHash } = require('node:crypto')
const { spawnSync } = require('node:child_process')
const { mkdtempSync, readFileSync, rmSync, writeFileSync } = require('node:fs')
const { tmpdir } = require('node:os')
const path = require('node:path')

const MAX_MEMORY_MEDIA_BYTES = 4 * 1024 * 1024
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex')

function run(command, args) {
  const process = spawnSync(command, args, {
    encoding: 'utf8', timeout: 30000, maxBuffer: 2 * 1024 * 1024,
    windowsHide: true,
  })
  if (process.error || process.status !== 0) {
    throw new Error("disposable emulator recording " + command + " failed: " + (process.error?.code || process.status || "unknown"))
  }
  return process.stdout
}

function inspectEncodedMp4(bytes) {
  assert.ok(Buffer.isBuffer(bytes) && bytes.length > 0 && bytes.length <= MAX_MEMORY_MEDIA_BYTES,
    'The isolated media proof requires a bounded, nonempty MP4 source')
  assert.equal(bytes.toString('ascii', 4, 8), 'ftyp', 'This is not an MP4 container')
  const workdir = mkdtempSync(path.join(tmpdir(), 'urai-encoded-memory-'))
  try {
    const file = path.join(workdir, 'disposable-sample.mp4')
    writeFileSync(file, bytes, { flag: 'wx', mode: 0o600 })
    const info = JSON.parse(run('ffprobe', [
      '-v', 'error', '-count_frames', '-show_entries',
      'stream=codec_type,codec_name,nb_read_frames:format=duration', '-of', 'json', file,
    ]))
    const video = info.streams?.find(s => s.codec_type === 'video')
    const audio = info.streams?.find(s => s.codec_type === 'audio')
    assert.equal(video?.codec_name, 'h264', 'Source video must be H.264')
    assert.equal(audio?.codec_name, 'aac', 'Source audio must be AAC')
    const frames = Number(video.nb_read_frames)
    assert.ok(Number.isSafeInteger(frames) && frames >= 24, 'Source must contain decoded video frames')
    const durationSeconds = Number(info.format?.duration)
    assert.ok(Number.isFinite(durationSeconds) && durationSeconds >= 1 && durationSeconds < 20,
      'Source must be an actual short recording, not only an MP4 header')
    // Probe metadata alone is insufficient; decode the recorded video and audio.
    run('ffmpeg', ['-nostdin', '-v', 'error', '-i', file, '-map', '0:v:0', '-map', '0:a:0',
      '-f', 'null', '-'])
    return Object.freeze({ sha256: sha256(bytes), byteLength: bytes.length,
      videoCodec: 'h264', audioCodec: 'aac', decodedVideoFrames: frames,
      durationSeconds })
  } finally {
    rmSync(workdir, { recursive: true, force: true })
  }
}

/** A short generated recording is deliberately non-personal. It is only an
 * exact-byte ingress, Storage and decode test, never a real human memory. */
function createDisposableEncodedMp4() {
  const workdir = mkdtempSync(path.join(tmpdir(), 'urai-media-synthetic-'))
  try {
    const file = path.join(workdir, 'disposable-sample.mp4')
    run('ffmpeg', [
      '-nostdin', '-y', '-hide_banner', '-loglevel', 'error',
      '-f', 'lavfi', '-i', 'testsrc2=size=320x180:rate=24',
      '-f', 'lavfi', '-i', 'sine=frequency=560:sample_rate=44100',
      '-t', '3', '-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '32',
      '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '80k',
      '-movflags', '+faststart', '-shortest', file,
    ])
    const bytes = readFileSync(file)
    return Object.freeze({ bytes, receipt: inspectEncodedMp4(bytes) })
  } finally {
    rmSync(workdir, { recursive: true, force: true })
  }
}

module.exports = { inspectEncodedMp4, createDisposableEncodedMp4 }
