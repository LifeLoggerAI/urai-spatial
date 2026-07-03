import { readFileSync } from 'node:fs';

function read(path) {
  return readFileSync(path, 'utf8');
}

function assertIncludes(path, content, expected) {
  if (!content.includes(expected)) {
    throw new Error(`${path} must include: ${expected}`);
  }
}

function assertNotIncludes(path, content, forbidden) {
  if (content.includes(forbidden)) {
    throw new Error(`${path} must not include: ${forbidden}`);
  }
}

const replayPagePath = 'urai-tier1/src/app/replay/page.tsx';
const finalMemoryPath = 'urai-tier1/src/app/FinalMemorySurfaces.tsx';
const replayClientPath = 'urai-tier1/src/app/replay/CinematicReplayClient.tsx';
const replayStatePath = 'urai-tier1/src/spatial/scene/replayState.ts';
const replayTimelinePath = 'urai-tier1/src/spatial/replay/ReplayTimeline.tsx';
const replayMetaPath = 'urai-tier1/src/spatial/replay/ReplayMetaPanel.tsx';
const replayRingsPath = 'urai-tier1/src/spatial/replay/ReplayPhaseRings.tsx';

const replayPage = read(replayPagePath);
const usesFinalReplayFilm = replayPage.includes('FinalReplayFilm');
const usesCinematicReplayClient = replayPage.includes('CinematicReplayClient');
const usesCanonicalTierOneReplay = replayPage.includes('TierOneExperience') && replayPage.includes('mode="replay"');

if (!usesFinalReplayFilm && !usesCinematicReplayClient && !usesCanonicalTierOneReplay) {
  throw new Error(
    `${replayPagePath} must include FinalReplayFilm, CinematicReplayClient, or canonical TierOneExperience mode="replay"`,
  );
}

if (usesFinalReplayFilm) {
  const finalMemory = read(finalMemoryPath);
  for (const token of [
    'export function FinalReplayFilm()',
    'data-testid="urai-final-replay-film"',
    'data-route-polish="cinematic-memory-camera-film"',
    'data-canon="camera-from-focus-no-avatar-orb"',
    'Memory film.',
    'The Quiet Reset',
    'aria-label="Film beats"',
    'replay-recovery-thread',
    'href="/mirror"',
    'unwind=replay',
    '@media (prefers-reduced-motion: reduce)',
  ]) {
    assertIncludes(finalMemoryPath, finalMemory, token);
  }

  for (const forbidden of [
    'READINESS 87%',
    'INTENSITY 88%',
    'BOUNDARY 75%',
    'static poster',
  ]) {
    assertNotIncludes(finalMemoryPath, finalMemory, forbidden);
  }
} else if (usesCinematicReplayClient) {
  const replayClient = read(replayClientPath);
  const replayState = read(replayStatePath);
  const replayTimeline = read(replayTimelinePath);
  const replayMeta = read(replayMetaPath);
  const replayRings = read(replayRingsPath);

  for (const token of [
    'data-testid="cinematic-replay-client"',
    'data-replay-phase={replayPhase}',
    'data-replay-segment={activeSegment.id}',
    'Pattern Replay',
    'Source: LifeMap · {nodeName}',
    'Center Replay',
    'Return to Focus',
    'ReplayMetaPanel',
    'ReplayTimeline',
    'ReplayPhaseRings',
    'onScrubbingChange={setScrubbing}',
  ]) {
    assertIncludes(replayClientPath, replayClient, token);
  }

  for (const forbidden of [
    'Unwind to Focus',
    'ESC unwinds to focus',
    'READINESS 87%',
    'INTENSITY 88%',
    'BOUNDARY 75%',
  ]) {
    assertNotIncludes(replayClientPath, replayClient, forbidden);
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
  ]) {
    assertIncludes(replayStatePath, replayState, token);
  }

  for (const token of ['Pause', 'Play', 'Esc returns to Focus', 'type="range"', 'onScrubbingChange']) {
    assertIncludes(replayTimelinePath, replayTimeline, token);
  }

  for (const token of [
    'Why this appeared',
    'Private · Only visible to you',
    'Save',
    'Hide',
    'Correct',
    'Return to Focus',
  ]) {
    assertIncludes(replayMetaPath, replayMeta, token);
  }

  assertIncludes(replayRingsPath, replayRings, 'data-testid="urai-replay-phase-rings"');
}

console.log('Replay Memory Theater static contract passed.');
