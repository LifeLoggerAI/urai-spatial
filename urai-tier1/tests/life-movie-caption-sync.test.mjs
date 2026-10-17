import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
import { captionSegmentForMediaTime } from '../src/spatial/life-movie/lifeMovieCaptionTimeline.ts'

const segments = Object.freeze([
  Object.freeze({startsAtMs: 0, durationMs: 2400, caption: 'The recorded scene opens.'}),
  Object.freeze({startsAtMs: 2400, durationMs: 2600, caption: 'The remembered feeling.'}),
  Object.freeze({startsAtMs: 5000, durationMs: 2800, caption: 'A sourced pattern.'}),
  Object.freeze({startsAtMs: 7800, durationMs: 2200, caption: 'The quiet return.'}),
])
const caption = (ms, expected=10000, recorded=10000) => captionSegmentForMediaTime(segments, ms, expected, recorded)

test('timed recorded source advances captions at real memory boundaries', () => {
  assert.equal(caption(0)?.caption, segments[0].caption)
  assert.equal(caption(2399)?.caption, segments[0].caption)
  assert.equal(caption(2400)?.caption, segments[1].caption)
  assert.equal(caption(5000)?.caption, segments[2].caption)
  assert.equal(caption(7800)?.caption, segments[3].caption)
  assert.equal(caption(9999)?.caption, segments[3].caption)
  assert.equal(caption(10000), null)
})

test('seeking backward restores the correct authored caption without mutating segments', () => {
  assert.equal(caption(8900)?.caption, segments[3].caption)
  assert.equal(caption(1300)?.caption, segments[0].caption)
  assert.equal(segments[0].startsAtMs, 0)
  assert.ok(Object.isFrozen(segments[0]))
})

test('a source of a different duration cannot borrow this Replay caption timeline', () => {
  assert.equal(caption(4900, 10000, 18500), null)
  assert.equal(caption(4900, 10000, null), null)
  assert.equal(caption(4900, 10000, 10300)?.caption, segments[1].caption)
  assert.equal(caption(4900, 10000, 12300), null)
})

test('invalid timestamps, gaps, and unsupported caption content fail closed', () => {
  for (const t of [-1, Number.NaN, Number.POSITIVE_INFINITY]) assert.equal(caption(t), null)
  assert.equal(captionSegmentForMediaTime(segments, 1200, 0, 10000), null)
  const gapped = [segments[0], {...segments[1], startsAtMs: 3300}]
  assert.equal(captionSegmentForMediaTime(gapped, 2600, 10000, 10000), null)
  assert.equal(captionSegmentForMediaTime([{...segments[0], caption:''}], 10, 10000, 10000), null)
  assert.equal(captionSegmentForMediaTime([{...segments[0], durationMs: 20000}], 10, 10000, 10000), null)
})

test('media-clock bindings are present in the actual Life Movie consumer', (t) => {
  const path = new URL('../src/app/life-movie/LifeMovieClient.tsx', import.meta.url)
  if (!fs.existsSync(path)) return t.skip('full consumer source unavailable in the focused local extraction')
  const client = fs.readFileSync(path, 'utf8')
  assert.match(client, /captionSegmentForMediaTime\(/)
  assert.match(client, /mediaSnapshot\.currentTimeMs/)
  assert.match(client, /mediaSnapshot\.durationMs/)
  assert.match(client, /Timed captions are unavailable for this recording/)
  assert.match(client, /expectsPrivateSource\s*&&\s*ownedPlayback\.status\s*!==\s*'ready'/)
})
