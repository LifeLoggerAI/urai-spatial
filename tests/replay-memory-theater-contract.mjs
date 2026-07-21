import { readFileSync } from 'node:fs'

function read(path) {
  return readFileSync(path, 'utf8')
}

function assertIncludes(path, content, expected) {
  if (!content.includes(expected)) throw new Error(`${path} must include: ${expected}`)
}

function assertNotIncludes(path, content, forbidden) {
  if (content.includes(forbidden)) throw new Error(`${path} must not include: ${forbidden}`)
}

const replayPagePath = 'urai-tier1/src/app/replay/page.tsx'
const replayClientPath = 'urai-tier1/src/app/replay/CinematicReplayClient.tsx'
const replayWorldPath = 'urai-tier1/src/app/replay/ReplaySpatialWorld.tsx'
const replayRecoveryPath = 'urai-tier1/src/app/replay/ReplayRecoveryState.tsx'
const replayModelPath = 'urai-tier1/src/spatial/replay/replaySpatialModel.ts'
const replayStatePath = 'urai-tier1/src/spatial/scene/replayState.ts'
const autonomousIsolationPath = 'urai-tier1/src/app/urai-autonomous-v1-isolation.css'

const replayPage = read(replayPagePath)
const replayClient = read(replayClientPath)
const replayWorld = read(replayWorldPath)
const replayRecovery = read(replayRecoveryPath)
const replayModel = read(replayModelPath)
const replayState = read(replayStatePath)
const autonomousIsolation = read(autonomousIsolationPath)

for (const token of [
  'CinematicReplayClient',
  'replay-route-launch-fingerprint',
  'cinematic-memory-camera-film',
  'ReplayRouteProofSurface',
  'data-proof-only="true"',
  'data-replay-phase="replay_playing"',
  'data-testid="urai-replay-timeline"',
  'data-testid="urai-replay-meta-panel"',
]) assertIncludes(replayPagePath, replayPage, token)

for (const token of [
  "dynamic(() => import('./ReplaySpatialWorld')",
  'ReplayRecoveryState',
  'data-testid="cinematic-replay-client"',
  'data-memory-status={result.status}',
  'data-memory-id={memory.id}',
  'data-star-id={memory.star.id}',
  'data-manifest-id={memory.replayManifest.id}',
  "data-playing={playing ? 'true' : 'false'}",
  'useSelectedMemory()',
  'requestUraiWorldReturn()',
  "event.key === 'Escape'",
  'ReplayProductControls',
  'type="range"',
  "aria-label={playing ? 'Pause replay' : 'Play replay'}",
  'Replay timeline, ${percent} percent complete',
  'DEMO FIXTURE · NOT PERSONAL DATA',
  'memory.replayManifest.transcript',
  'Reduce sensory',
  'data-evidence-level={selectedAnchor.evidenceLevel}',
]) assertIncludes(replayClientPath, replayClient, token)

for (const token of [
  "from '@react-three/fiber'",
  '<Canvas',
  'ReplayCamera',
  'ReplayFloor',
  'MemoryArchitecture',
  'AnchorPresence',
  'CompanionOrb',
  'stepEmbodiedMotion',
  'useMovementInput',
  'useDragLook',
  'MobileMovementPad',
  'data-replay-spatial-renderer="webgl-r3f"',
  'shell.dataset.replayCameraX',
  'shell.dataset.replayCameraZ',
  'data-testid="replay-webgl-fallback"',
  "ReplayNavigationMode = 'guided' | 'explore'",
]) assertIncludes(replayWorldPath, replayWorld, token)

for (const token of [
  'Choose a memory',
  'Return to Focus',
  'Open sample Replay',
  '/life-map?from=replay-recovery',
  'demo:sample-replay',
  'Sample Replay uses demonstration data only',
]) assertIncludes(replayRecoveryPath, replayRecovery, token)

for (const token of [
  "'confirmed'",
  "'inferred'",
  "'unknown'",
  "'user-corrected'",
  "'disputed'",
  "'abstract-only'",
  'buildReplaySpatialScene',
  'Current memory records do not contain likeness or voice consent',
]) assertIncludes(replayModelPath, replayModel, token)

for (const forbidden of [
  'replayBackdrop',
  'replayPortal',
  '--replay-media',
  'READINESS 87%',
  'INTENSITY 88%',
  'BOUNDARY 75%',
  'sessionStorage',
  'window.location.assign',
  'quiet-reset',
  'seed-memory-bloom',
]) assertNotIncludes(replayClientPath, replayClient, forbidden)

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
]) assertIncludes(replayStatePath, replayState, token)

for (const token of [
  'body:has(> .uraiAutoWorld:not(.uraiAutoReplay))',
  'body > .uraiAutoReplay',
  'display: none !important',
  'CinematicReplayClient owns /replay',
]) assertIncludes(autonomousIsolationPath, autonomousIsolation, token)

console.log('Replay embodied spatial owner, recovery, evidence, playback, accessibility, and route-proof contract passed.')
