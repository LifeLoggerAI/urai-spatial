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

const replayPage = read(replayPagePath)
const replayClient = read(replayClientPath)
const replayState = read(replayStatePath)
const replayTimeline = read(replayTimelinePath)
const replayMeta = read(replayMetaPath)
const replayRings = read(replayRingsPath)

for (const token of [
  'CinematicReplayClient',
  '<Suspense',
  'replay-route-launch-fingerprint',
  'cinematic-memory-camera-film',
]) {
  assertIncludes(replayPagePath, replayPage, token)
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

assertIncludes(replayRingsPath, replayRings, 'data-testid="urai-replay-phase-rings"')

console.log('Replay Memory Theater composed runtime contract passed.')
