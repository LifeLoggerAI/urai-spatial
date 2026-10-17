import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const root = new URL('../src/app/replay/', import.meta.url)
const hook = fs.readFileSync(new URL('useProtectedLifeMovieReplay.ts',root),'utf8')
const replay = fs.readFileSync(new URL('CinematicReplayClient.tsx',root),'utf8')
const studio = 'POST /api/studio/spatial-private-media'

test('original Replay consumes only gated private delivery and keeps the cinematic owner',()=>{
  for(const marker of [
    'useProtectedLifeMovieReplay(memory, playbackSelection.planId, playbackSelection.movieId)',
    'hasProtectedMovie',
    'ReplayRecordedSource',
    'ReplayCanvasBoundary',
    'ReplaySpatialScene',
    'requestUraiWorldReturn',
    'createReplayMediaSession',
    'data-private-life-movie-captions="verified"',
  ]) assert.ok(replay.includes(marker),'missing existing immersive integration: '+marker)
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
    "spatialUser.uid !== memory.ownerId",
    "studioUser.getIdToken(true)",
    "spatialUser.getIdToken(true)",
    "credentials:'omit'",
    "cache:'no-store'",
    "action:'deliver-spatial-final'",
    "result.status !== 200",
    "bytes.byteLength !== length",
    "video.playlist !== captions.playlist",
    "URL.revokeObjectURL",
    "stopStudio?.()",
    "window.addEventListener('offline',offline)",
  ]) assert.ok(hook.includes(marker),'missing browser private-media boundary: '+marker)
  assert.equal(hook.includes("credentials:'include'"),false)
})
test('no cross-origin, huge response, demo or wrong identity fallback',()=>{
  for(const marker of [
    "memory.demo",
    "memory.privacy !== 'private'",
    "memory.authorization !== 'owner'",
    "MAX_BYTES = 64 * 1024 * 1024",
    "result.headers.get('cache-control')?.includes('no-store')",
    "result.headers.get('content-type') !== mime",
    "result.headers.get('x-urai-private-playlist-digest')",
    "config.url",
    "url.username || url.password || url.search || url.hash",
    "studioAuth.currentUser === studioUser",
    "spatialAuth.currentUser === spatialUser",
  ]) assert.ok(hook.includes(marker),marker)
  assert.ok(!hook.includes("NEXT_PUBLIC_URAI_STUDIO_JOBS_BRIDGE_TOKEN"))
})
console.log('[PASS] Original Spatial Replay private Life Movie source-wire safeguards; source-only, NOT actual browser or cloud acceptance; Studio delivery remains default-off')
