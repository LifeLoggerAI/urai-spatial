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
const replayTimelinePath = 'urai-tier1/src/spatial/replay/ReplayTimeline.tsx'
const replayMetaPath = 'urai-tier1/src/spatial/replay/ReplayMetaPanel.tsx'
const replayRingsPath = 'urai-tier1/src/spatial/replay/ReplayPhaseRings.tsx'
const autonomousIsolationPath = 'urai-tier1/src/app/urai-autonomous-v1-isolation.css'

const replayPage = read(replayPagePath)
const replayClient = read(replayClientPath)
const replayState = read(replayStatePath)
const replayTimeline = read(replayTimelinePath)
const replayMeta = read(replayMetaPath)
const replayRings = read(replayRingsPath)
const autonomousIsolation = read(autonomousIsolationPath)

for (const token of [
  'CinematicReplayClient',
  'replay-route-launch-fingerprint',
  'cinematic-memory-camera-film',
  'proofSurfaceStyle',
  'data-proof-only="true"',
  'aria-hidden="true"',
  'opacity: 0',
  "pointerEvents: 'none'",
  'style={proofSurfaceStyle}',
]) {
  assertIncludes(replayPagePath, replayPage, token)
}

for (const forbidden of [
  '<Suspense',
  "background: 'rgba(3, 7, 19, 0.72)'",
  "border: '1px solid rgba(155, 231, 255, 0.28)'",
  'maxWidth: 320',
]) {
  assertNotIncludes(replayPagePath, replayPage, forbidden)
}

for (const token of [
  'data-testid="cinematic-replay-client"',
  'data-replay-phase={replayPhase}',
  'data-replay-segment={activeSegment.id}',
  'ReplayMetaPanel',
  'ReplayTimeline',
  'ReplayPhaseRings',
  'onScrubbingChange={setScrubbing}',
  'returnToFocus',
]) {
  assertIncludes(replayClientPath, replayClient, token)
}

for (const forbidden of [
  'READINESS 87%',
  'INTENSITY 88%',
  'BOUNDARY 75%',
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
  'Pause',
  'Play',
  'Esc returns to Focus',
  'type="range"',
  'onScrubbingChange',
  'data-testid="urai-replay-timeline"',
]) {
  assertIncludes(replayTimelinePath, replayTimeline, token)
}

for (const token of [
  'Pattern Replay',
  '<dt>Source</dt>',
  'LifeMap ·',
  'Why this appeared',
  'Private · Only visible to you',
  'Save',
  'Hide',
  'Correct',
  'Return to Focus',
  'data-testid="urai-replay-meta-panel"',
]) {
  assertIncludes(replayMetaPath, replayMeta, token)
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

assertIncludes(replayRingsPath, replayRings, 'data-testid="urai-replay-phase-rings"')

console.log('Replay Memory Theater composed runtime, visibility ownership, and proof-presentation contract passed.')
