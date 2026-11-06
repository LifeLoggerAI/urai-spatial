'use strict'
// Test-only, six-second original tone. Never uses a provider, customer media, or network.
const assert = require('node:assert/strict')
const { spawnSync } = require('node:child_process')
function generateDecodableSyntheticOgg() {
  const result = spawnSync('ffmpeg', [
    '-hide_banner','-loglevel','error','-nostdin',
    '-f','lavfi','-i','sine=frequency=440:sample_rate=16000:duration=6',
    '-af','volume=0.02','-ac','1','-ar','16000',
    '-fflags','+bitexact','-flags:a','+bitexact',
    '-c:a','libvorbis','-q:a','-1','-map_metadata','-1','-f','ogg','pipe:1',
  ], { encoding: null, timeout: 20000, maxBuffer: 1024*1024, shell: false })
  assert.equal(result.error, undefined, 'SYNTHETIC_AUDIO_FFMPEG_UNAVAILABLE')
  assert.equal(result.status, 0, 'SYNTHETIC_AUDIO_FFMPEG_FAILED: ' + String(result.stderr))
  const audio = Buffer.from(result.stdout)
  assert.ok(audio.length > 512 && audio.length < 4*1024*1024, 'SYNTHETIC_AUDIO_INVALID_LENGTH')
  assert.equal(audio.toString('ascii', 0, 4), 'OggS', 'SYNTHETIC_AUDIO_OGG_HEADER_REQUIRED')
  return audio
}
module.exports = { generateDecodableSyntheticOgg }
