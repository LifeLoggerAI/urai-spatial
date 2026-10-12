import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFileSync, existsSync, statSync } from 'node:fs'
import { replayGroundPlacement, replayFernPlacement, replayVariation } from '../src/app/replay/replayEnvironmentPlacement.ts'
import { buildReplayLeafSprayGeometry, buildReplayMeadowTuftGeometry } from '../src/app/replay/replayBotanicalGeometry.ts'

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
  assert.match(details, /material: child\.material/)
  assert.match(details, /args=\{\[geometry, material, SCANNED_FERN_COUNT\]\}/)
  assert.doesNotMatch(details, /<icosahedronGeometry args=\{\[1, 2\]\}/)
  assert.doesNotMatch(details, /<coneGeometry args=\{\[\.075, 1, 3\]\}/)
})


test('private-memory browser proof keeps demo GLTF loading unavailable, not simulated as approved world art', () => {
  const proof = readFileSync(new URL('./owned-memory-media-playback.browser.mjs', import.meta.url), 'utf8')
  assert.ok(proof.includes("'@react-three/drei': `export const useGLTF=Object.assign"))
  assert.match(proof, /Synthetic private-memory transport must not load world art/)
  assert.ok(proof.includes("'@react-three/fiber':"))
  assert.ok(proof.includes('const Component=location.pathname==='))
})

test('curved botanical geometry uses triangle sheets with normals and instance vertex colors', () => {
  for (const [name, build, requiredVertices] of [
    ['leaf spray', buildReplayLeafSprayGeometry, 28 * 5],
    ['grass tuft', buildReplayMeadowTuftGeometry, 9 * 5],
  ]) {
    const geometry = build()
    assert.equal(geometry.isBufferGeometry, true, name + ' must create physical geometry')
    const positions = geometry.getAttribute('position')
    const colors = geometry.getAttribute('color')
    const normals = geometry.getAttribute('normal')
    assert.ok(positions.count >= requiredVertices)
    assert.equal(normals.count, positions.count)
    assert.equal(colors.count, positions.count)
    assert.ok(geometry.index.count >= requiredVertices * 2)
    assert.ok(Array.from(positions.array).every(Number.isFinite))
    assert.ok(Array.from(normals.array).every(Number.isFinite))
    assert.ok(geometry.boundingSphere && geometry.boundingSphere.radius > 0.4)
    geometry.dispose()
  }
  assert.match(details, /args=\{\[leafGeometry, undefined, trees\.length \* GROVE_FOLIAGE_PER_TREE\]\}/)
  assert.match(details, /args=\{\[tuftGeometry, undefined, GROUND_GRASS_COUNT\]\}/)
  assert.match(details, /vertexColors roughness/)
  assert.match(details, /GROVE_FOLIAGE_PER_TREE = 42/)
  assert.match(details, /GROUND_GRASS_COUNT = 840/)
})
