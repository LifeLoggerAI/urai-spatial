import { readFileSync } from 'node:fs'

function read(path) {
  return readFileSync(path, 'utf8')
}

function assertIncludes(path, content, expected) {
  if (!content.includes(expected)) {
    throw new Error(`${path} must include: ${expected}`)
  }
}

function assertNotIncludes(path, content, forbidden) {
  if (content.includes(forbidden)) {
    throw new Error(`${path} must not include: ${forbidden}`)
  }
}

const replayPagePath = 'urai-tier1/src/app/replay/page.tsx'
const replayClientPath = 'urai-tier1/src/app/replay/CinematicReplayClient.tsx'
const replayStatePath = 'urai-tier1/src/spatial/scene/replayState.ts'
const autonomousIsolationPath = 'urai-tier1/src/app/urai-autonomous-v1-isolation.css'

const replayPage = read(replayPagePath)
const replayClient = read(replayClientPath)
const replayState = read(replayStatePath)
const autonomousIsolation = read(autonomousIsolationPath)

for (const token of [
  'CinematicReplayClient',
  'replay-route-launch-fingerprint',
  'cinematic-memory-camera-film',
  'ReplayRouteProofSurface',
  'data-proof-only="true"',
  'aria-hidden="true"',
  'data-replay-phase="replay_playing"',
  'data-testid="urai-replay-timeline"',
  'data-testid="urai-replay-meta-panel"',
  'style={proofSurfaceStyle}',
]) {
  assertIncludes(replayPagePath, replayPage, token)
}

for (const token of [
  'data-testid="cinematic-replay-client"',
  'data-memory-status={result.status}',
  'data-memory-id={memory.id}',
  'data-star-id={memory.star.id}',
  'data-manifest-id={memory.replayManifest.id}',
  "data-playing={playing ? 'true' : 'false'}",
  'useSelectedMemory()',
  'requestUraiWorldReturn()',
  "event.key === 'Escape'",
  "event.key === ' ' || event.key === 'Enter'",
  'type="range"',
  "aria-label={playing ? 'Pause replay' : 'Play replay'}",
  'Replay timeline, ${percent} percent complete',
  'DEMO FIXTURE · NOT PERSONAL DATA',
  'memory.replayManifest.transcript',
  'prefers-reduced-motion:reduce',
  'forced-colors:active',
  'assetCssStack(replayAssets.primary)',
]) {
  assertIncludes(replayClientPath, replayClient, token)
}

for (const forbidden of [
  'READINESS 87%',
  'INTENSITY 88%',
  'BOUNDARY 75%',
  'sessionStorage',
  'window.location.assign',
  'quiet-reset',
  'seed-memory-bloom',
]) {
  assertNotIncludes(replayClientPath, replayClient, forbidden)
}

for (const token of [
  "'replay_ready'",
  "'replay_playing'",
  "'replay_paused'",
  "'replay_scrubbing'",
  "'replay_complete'",
  "'memory'",
  "'emotion'",
  "'pattern'",
  "'return'",
  'resolveReplayPhase',
  'getReplaySegmentAt',
  'selected Life Map node',
]) {
  assertIncludes(replayStatePath, replayState, token)
}

for (const token of [
  'body:has(> .uraiAutoWorld:not(.uraiAutoReplay))',
  'body > .uraiAutoReplay',
  'display: none !important',
  'CinematicReplayClient owns /replay',
]) {
  assertIncludes(autonomousIsolationPath, autonomousIsolation, token)
}

assertNotIncludes(
  autonomousIsolationPath,
  autonomousIsolation,
  'body:has(> .uraiAutoWorld) > :not(.uraiAutoWorld):not(script):not(style)',
)

console.log('Replay authenticated cinematic owner, identity, playback, accessibility, and route-proof contract passed.')
