import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFileSync, existsSync, statSync } from 'node:fs'
import { replayGroundPlacement, replayFernPlacement, replayVariation } from '../src/app/replay/replayEnvironmentPlacement.ts'

const replay = readFileSync(new URL('../src/app/replay/CinematicReplayClient.tsx', import.meta.url), 'utf8')
const details = readFileSync(new URL('../src/app/replay/ReplayEnvironmentDetails.tsx', import.meta.url), 'utf8')

test('demo forest keeps the walk corridor clear, with bounded deterministic plants', () => {
  for (const maker of [replayGroundPlacement, replayFernPlacement]) {
    for (let i = 0; i < 700; i++) {
      const a = maker(i), b = maker(i)
      assert.deepEqual(a, b)
      assert.ok([a.x, a.z, a.scale, a.yaw].every(Number.isFinite))
      assert.ok(Math.abs(a.x) >= 2.65 && Math.abs(a.x) <= 12.5)
      assert.ok(a.z >= -30 && a.z <= 4)
      assert.ok(a.scale > .2 && a.scale < 1.4)
    }
  }
  assert.equal(replayVariation(42, 11), replayVariation(42, 11))
})

test('Replay actually mounts instanced trunks, branches, canopy, forest-floor and a source-controlled CC0 geometry', () => {
  assert.match(replay, /<ReplayMemoryGrove trees=\{trees\} groundHeight=\{replayGroundHeight\}/)
  assert.match(replay, /<ReplayForestFloor groundHeight=\{replayGroundHeight\}/)
  assert.match(replay, /<ReplayScannedUnderstory groundHeight=\{replayGroundHeight\}/)
  assert.match(details, /useGLTF\(REPLAY_CC0_FERN_MODEL\)/)
  assert.match(details, /mesh\.setMatrixAt|trunks\.current!\.setMatrixAt/)
  assert.match(details, /truthClass: 'disclosed-demonstration'/)
  assert.match(replay, /memory\.demo \? <DemoMemoryLandscape memory=\{memory\}/)
  const file = new URL('../public/assets/urai/home-production/cc0/polyhaven-fern-02-geometry-v1.glb', import.meta.url)
  assert.ok(existsSync(file), 'existing CC0 fern geometry must be packaged')
  assert.ok(statSync(file).size > 100, 'model must contain actual geometry bytes')
})

test('new demo forest must not substitute source media or impersonate an approved final asset', () => {
  assert.match(replay, /admission\.kind !== 'recorded-source'/)
  assert.match(replay, /<ReplayRecordedSource/)
  assert.match(details, /finalArtAdmitted: false/)
  assert.doesNotMatch(details, /localStorage|sessionStorage|fetch\(|requestCouncilProvider/)
  assert.match(details, /SCANNED_FERN_COUNT = 52/)
})
