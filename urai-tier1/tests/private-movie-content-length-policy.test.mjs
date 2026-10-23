import test from 'node:test'
import assert from 'node:assert/strict'
import {
  privateMovieContentLengthAllowed,
  PRIVATE_MOVIE_MAX_VIDEO_BYTES,
  PRIVATE_MOVIE_MAX_SUBTITLE_BYTES,
} from '../src/app/replay/privateMovieContentLengthPolicy.ts'

test('real mp4 payloads are accepted only in the original 64 MiB range', () => {
  assert.equal(PRIVATE_MOVIE_MAX_VIDEO_BYTES, 64 * 1024 * 1024)
  assert.equal(privateMovieContentLengthAllowed('mp4', 1), true)
  assert.equal(privateMovieContentLengthAllowed('mp4', PRIVATE_MOVIE_MAX_VIDEO_BYTES), true)
  assert.equal(privateMovieContentLengthAllowed('mp4', PRIVATE_MOVIE_MAX_VIDEO_BYTES + 1), false)
})

test('final and segmented SRT payloads share the strict 2 MiB ceiling', () => {
  assert.equal(PRIVATE_MOVIE_MAX_SUBTITLE_BYTES, 2 * 1024 * 1024)
  assert.equal(privateMovieContentLengthAllowed('srt', 1), true)
  assert.equal(privateMovieContentLengthAllowed('srt', PRIVATE_MOVIE_MAX_SUBTITLE_BYTES), true)
  assert.equal(privateMovieContentLengthAllowed('srt', PRIVATE_MOVIE_MAX_SUBTITLE_BYTES + 1), false)
  assert.equal(privateMovieContentLengthAllowed('srt', 64 * 1024 * 1024), false)
})

test('zero, negative and noninteger content lengths fail closed', () => {
  for (const size of [0, -1, 0.5, 1.5, -0.5, -12]) {
    assert.equal(privateMovieContentLengthAllowed('mp4', size), false)
    assert.equal(privateMovieContentLengthAllowed('srt', size), false)
  }
})

test('nonfinite and unsafe content lengths fail closed', () => {
  for (const size of [Number.NaN, Infinity, -Infinity, Number.MAX_SAFE_INTEGER + 1]) {
    assert.equal(privateMovieContentLengthAllowed('mp4', size), false)
    assert.equal(privateMovieContentLengthAllowed('srt', size), false)
  }
})

test('unknown media kinds do not inherit mp4 or subtitle access', () => {
  for (const kind of ['', 'zip', 'mp3', 'MP4', 'SRT', null, undefined]) {
    assert.equal(Reflect.apply(privateMovieContentLengthAllowed, null, [kind, 50]), false)
  }
})
