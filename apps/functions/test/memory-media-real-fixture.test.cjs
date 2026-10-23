'use strict'
const assert = require('node:assert/strict')
const { spawnSync } = require('node:child_process')
const test = require('node:test')
const { inspectEncodedMp4, createDisposableEncodedMp4 } = require('../scripts/memory-media-real-fixture.cjs')
const ffmpegAvailable = ['ffmpeg', 'ffprobe'].every(binary => spawnSync(binary, ['-version'],
  { encoding: 'utf8', timeout: 5000 }).status === 0)
const codecTest = ffmpegAvailable ? test : test.skip

codecTest('an original-Functions compatible disposable source has real decoded H264 video and AAC audio', () => {
  const fixture = createDisposableEncodedMp4()
  assert.ok(fixture.bytes.length > 1000 && fixture.bytes.length <= 4 * 1024 * 1024)
  assert.ok(fixture.receipt.decodedVideoFrames >= 24)
  assert.equal(fixture.receipt.videoCodec, 'h264')
  assert.equal(fixture.receipt.audioCodec, 'aac')
  assert.deepEqual(inspectEncodedMp4(fixture.bytes), fixture.receipt)
})

codecTest('an MP4-looking fake that cannot decode is not an accepted recording', () => {
  const fake = Buffer.alloc(131072)
  fake.write('ftyp', 4)
  assert.throws(() => inspectEncodedMp4(fake))
})

codecTest('truncated and altered private source bytes cannot be misclassified as intact', () => {
  const fixture = createDisposableEncodedMp4()
  const damaged = Buffer.from(fixture.bytes.subarray(0, 40))
  assert.throws(() => inspectEncodedMp4(damaged))
  const changed = Buffer.from(fixture.bytes)
  changed[changed.length - 2] ^= 1
  assert.notEqual(inspectEncodedMp4(changed).sha256, fixture.receipt.sha256)
})
