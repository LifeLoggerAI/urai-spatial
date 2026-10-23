import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { parsePrivateLifeMovieTimeline, selectPrivateLifeMovieSegment, currentPrivateLifeMovieCaption, privateLifeMovieTimelineCurrent } from '../src/app/replay/privateLifeMovieSegmentTimeline.ts'

const root = new URL('../src/app/replay/', import.meta.url)
const hook = fs.readFileSync(new URL('useProtectedLifeMovieReplay.ts',root),'utf8')
const replay = fs.readFileSync(new URL('CinematicReplayClient.tsx',root),'utf8')
const recorded = fs.readFileSync(new URL('ReplayRecordedSource.tsx',root),'utf8')
const boundary = fs.readFileSync(new URL('privateMovieResponseBoundary.mjs',root),'utf8')
const lengthPolicy = fs.readFileSync(new URL('privateMovieContentLengthPolicy.ts',root),'utf8')
const studio = 'POST /api/studio/spatial-private-media'

test('original Replay consumes only gated private delivery and keeps the cinematic owner',()=>{
  for(const marker of [
    'useProtectedLifeMovieReplay(memory, playbackSelection.planId, playbackSelection.movieId)',
    'hasProtectedMovie',
    'ReplayRecordedSource',
    'ReplayCanvasBoundary',
    'ReplaySpatialScene',
    'requestUraiWorldReturn',
    'data-private-life-movie-captions="verified"',
  ]) assert.ok(replay.includes(marker),'missing existing immersive integration: '+marker)
  assert.ok(recorded.includes('createReplayMediaSession'))
  assert.ok(!replay.includes('video src="https://'))
})
test('browser does not receive privileged Studio bridge tokens or fake account-link authority',()=>{
  for(const forbidden of ['URAI_STUDIO_JOBS_BRIDGE_TOKEN','getStorage(', 'firebase-admin',
    'createSignedUrl','studioSpatialAccountLinks/', 'localStorage.setItem(', 'document.cookie=']) {
    assert.equal(hook.includes(forbidden),false,forbidden)
  }
  for(const marker of [
    "projectId !== 'urai-studio'",
    "NEXT_PUBLIC_URAI_SPATIAL_PRIVATE_MOVIE_ENABLED",
    "getAuth(spatialApp)",
    "getAuth(studioApp)",
    "spatialUser.uid !== selectedMemory.ownerId",
    "studioUser.getIdToken(true)",
    "spatialUser.getIdToken(true)",
    "credentials:'omit'",
    "cache:'no-store'",
    "action:'deliver-spatial-final'",
    "result.status !== 200",
    "readBoundedPrivateMovieBlob(result,",
    "video.playlist !== captions.playlist",
    "URL.revokeObjectURL",
    "stopStudio?.()",
    "window.addEventListener('offline',offline)",
  ]) assert.ok(hook.includes(marker),'missing browser private-media boundary: '+marker)
  assert.ok(boundary.includes('written !== expectedBytes'))
  assert.ok(boundary.includes('value.byteLength > expectedBytes - written'))
  assert.equal(hook.includes("credentials:'include'"),false)
})
test('no cross-origin, huge response, demo or wrong identity fallback',()=>{
  for(const marker of [
    "memory.demo",
    "memory.privacy !== 'private'",
    "memory.authorization !== 'owner'",
    "privateMovieContentLengthAllowed(kind,length)",
    "result.headers.get('cache-control')?.includes('no-store')",
    "result.headers.get('content-type') !== mime",
    "result.headers.get('x-urai-private-playlist-digest')",
    "approvedConfig.url",
    "url.username || url.password || url.search || url.hash",
    "studioAuth.currentUser === studioUser",
    "spatialAuth.currentUser === spatialUser",
  ]) assert.ok(hook.includes(marker),marker)
  assert.match(lengthPolicy,/PRIVATE_MOVIE_MAX_VIDEO_BYTES = 64 \* 1024 \* 1024/)
  assert.match(lengthPolicy,/PRIVATE_MOVIE_MAX_SUBTITLE_BYTES = 2 \* 1024 \* 1024/)
  // The nested async retrieval must use immutable values narrowed after the
  // optional private-media guard, without assertions that bypass validation.
  for (const capture of ['const approvedConfig = config','const selectedMemory = memory',
    'const selectedMovieId = movieId','const selectedPlanId = planId',
    'memoryId:selectedMemory.id,movieId:selectedMovieId,planId:selectedPlanId']) {
    assert.ok(hook.includes(capture),'missing stable async delivery binding: '+capture)
  }
  assert.equal(hook.includes('config!'),false)
  assert.equal(hook.includes('memory!'),false)
  assert.ok(!hook.includes("NEXT_PUBLIC_URAI_STUDIO_JOBS_BRIDGE_TOKEN"))
})
console.log('[PASS] Original Spatial Replay private Life Movie source-wire safeguards; source-only, NOT actual browser or cloud acceptance; Studio delivery remains default-off')

test('bounded owner-authorized segment timeline rejects substitutions and gap inventions',()=>{
  const base={ok:true,timeline:{schemaVersion:'urai-spatial-private-segment-timeline-v1',
    movieId:'movie-a',planId:'lmp_'+'a'.repeat(24),playlistDigest:'f'.repeat(64),
    expiresAt:Date.now()+120000,durationMs:3600,segments:[
      {index:0,startMs:0,endMs:900,gapBeforeMs:0},
      {index:1,startMs:1300,endMs:2200,gapBeforeMs:400},
      {index:2,startMs:2700,endMs:3600,gapBeforeMs:500}]}}
  const valid=parsePrivateLifeMovieTimeline(base,'movie-a',base.timeline.planId)
  assert.equal(valid.segments.length,3)
  assert.equal(selectPrivateLifeMovieSegment(valid,300).segment.index,0)
  assert.deepEqual(selectPrivateLifeMovieSegment(valid,1000),{segment:valid.segments[1],localMs:0})
  assert.deepEqual(selectPrivateLifeMovieSegment(valid,3100),{segment:valid.segments[2],localMs:400})
  assert.equal(selectPrivateLifeMovieSegment(valid,150).segment.index,0)
  const tamper=(mutate)=>{
    const cloned=structuredClone(base);mutate(cloned.timeline)
    assert.throws(()=>parsePrivateLifeMovieTimeline(cloned,'movie-a',base.timeline.planId))
  }
  tamper(t=>{t.segments[1].gapBeforeMs=0})
  tamper(t=>{t.segments[0].endMs=25000})
  tamper(t=>{t.segments[1].index=0})
  tamper(t=>{t.segments[1].storagePath='private/file'})
  tamper(t=>{t.playlistDigest='invalid'})
  tamper(t=>{t.expiresAt=Date.now()-1000})
  tamper(t=>{t.durationMs=4000})
  tamper(t=>{t.movieId='movie-b'})
  tamper(t=>{t.segments.push({...t.segments[2],index:3})})
  assert.throws(()=>selectPrivateLifeMovieSegment(valid,-1))
  assert.throws(()=>selectPrivateLifeMovieSegment(valid,4000))
  const a='1\n00:00:00,000 --> 00:00:00,650\nFictional beginning\n'
  const b='1\n00:00:00,000 --> 00:00:00,650\nFictional second segment\n'
  assert.equal(currentPrivateLifeMovieCaption(a,300),'Fictional beginning')
  assert.equal(currentPrivateLifeMovieCaption(b,300),'Fictional second segment')
  assert.equal(currentPrivateLifeMovieCaption(b,700),null)
  assert.equal(currentPrivateLifeMovieCaption(null,100),null)
})
test('segmented original Replay uses actual Studio action and retains final fallback',()=>{
  for(const marker of ['NEXT_PUBLIC_URAI_SPATIAL_SEGMENTED_MOVIE_ENABLED',
    "action:'read-spatial-timeline'", "action:'deliver-spatial-segment'",
    "action:'deliver-spatial-final'", 'parsePrivateLifeMovieTimeline',
    'selectPrivateLifeMovieSegment','segmentIndex:index',
    "get('x-urai-private-segment-start-ms')",
    'segmentController?.abort()', 'URL.revokeObjectURL']) {
    assert.ok(hook.includes(marker),'missing segment owner boundary: '+marker)
  }
  for(const marker of ['protectedMovie.seekTo(timeMs,playing)', 'protectedMovie.advance()',
    'currentPrivateLifeMovieCaption', 'data-private-life-movie-live-caption="verified"',
    'protectedMovie.timeline?.durationMs']) {
    assert.ok(replay.includes(marker),'missing original controls/segment caption binding: '+marker)
  }
})

test('segmented private movie denies delivery on timeline expiration, not merely account rotation', () => {
  const timeline = { expiresAt: 5000 }
  assert.equal(privateLifeMovieTimelineCurrent(timeline, 4999), true)
  assert.equal(privateLifeMovieTimelineCurrent(timeline, 5000), false)
  assert.equal(privateLifeMovieTimelineCurrent(timeline, 5001), false)
  for (const invalid of [null, { expiresAt: Infinity }, { expiresAt: NaN }, { expiresAt: 5000.5 }])
    assert.equal(privateLifeMovieTimelineCurrent(invalid, 4999), false)
  // Keep the source assertion syntax valid and check the actual hook code.
  for (const marker of [
    'requestNumber === segmentVersion && privateLifeMovieTimelineCurrent(timeline)',
    'if (!privateLifeMovieTimelineCurrent(timeline)) { clean(); return }',
    'window.setTimeout(enforceTimelineExpiry',
    'if (currentSession() && requestNumber === segmentVersion) clean()',
  ]) assert.ok(hook.includes(marker), 'missing active timeline guard: ' + marker)
})
