import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'

const file = (name) =>
  new URL(`../src/app/spatial/ar-vr/${name}`, import.meta.url)

const pageUrl = file('page.tsx')
const worldUrl = file('UraiQuestEntryWorldV2.tsx')
const runtimeUrl = file('xrEntryWorldRuntime.ts')
const skyUrl = file('xrEntrySkyAndParticles.ts')
const geometryUrl = file('xrEntrySanctuaryGeometry.ts')
const orbUrl = file('xrEntryLivingOrb.ts')
const environmentUrl = file('xrEntryPremiumEnvironment.ts')
const entryUrl = file('QuestVrEntryButton.tsx')

test('Quest route uses the real-time XR world', async () => {
  const page = await readFile(pageUrl, 'utf8')
  assert.ok(page.includes('UraiQuestEntryWorldV2'))
  assert.ok(!page.includes('urai-xr-portal__stars'))
})

test('XR entry builds a premium atmospheric sanctuary', async () => {
  const sources = await Promise.all([
    readFile(runtimeUrl, 'utf8'),
    readFile(skyUrl, 'utf8'),
    readFile(geometryUrl, 'utf8'),
    readFile(orbUrl, 'utf8'),
    readFile(environmentUrl, 'utf8'),
  ])
  const source = sources.join('\n')

  for (const contract of [
    'WebGLRenderer',
    'HemisphereLight',
    'DirectionalLight',
    'CircleGeometry',
    'CylinderGeometry',
    'BoxGeometry',
    'ShaderMaterial',
    'MeshPhysicalMaterial',
    'buildPremiumEnvironment',
    'createLivingOrb',
  ]) {
    assert.ok(source.includes(contract), contract)
  }
})

test('sky and ground are the primary destinations', async () => {
  const world = await readFile(worldUrl, 'utf8')
  const runtime = await readFile(runtimeUrl, 'utf8')
  const sky = await readFile(skyUrl, 'utf8')

  for (const contract of [
    'Select the sky',
    'Select the ground',
    'Ascend to Life Map',
    'Descend to Ground HQ',
    'Accessible sky and ground destinations',
  ]) {
    assert.ok(world.includes(contract), contract)
  }

  assert.ok(sky.includes('SKY_ROUTE'))
  assert.ok(sky.includes('GROUND_ROUTE'))
  assert.ok(runtime.includes('this.floor'))
  assert.ok(runtime.includes('this.environment.sky'))
  assert.ok(!runtime.includes('function makePortal'))
  assert.ok(!runtime.includes('PlaneGeometry'))
  assert.ok(!world.includes('select a portal'))
})

test('desktop, touch and Quest controls remain explicit', async () => {
  const world = await readFile(worldUrl, 'utf8')
  const runtime = await readFile(runtimeUrl, 'utf8')

  for (const contract of [
    'KeyW',
    'KeyA',
    'KeyQ',
    'getController',
    'Math.PI / 6',
    'SPAWN_Z',
  ]) {
    assert.ok(runtime.includes(contract), contract)
  }

  for (const contract of [
    'Exit VR safely',
    'Recenter',
    'Reduced motion',
    'Touch movement controls',
    'right thumbstick snaps 30°',
  ]) {
    assert.ok(world.includes(contract), contract)
  }
})

test('navigation and session cleanup remain safe', async () => {
  const world = await readFile(worldUrl, 'utf8')
  const entry = await readFile(entryUrl, 'utf8')

  for (const contract of [
    "route === '/spatial/life-map'",
    "source.handedness === 'right'",
    "source.handedness !== 'left'",
    'window.addEventListener(',
    'document.addEventListener(',
    'window.removeEventListener(',
    'document.removeEventListener(',
    'clearHeldControls',
    'runtime.session = null',
    'runtimeRef.current = null',
    'renderer.xr.setSession(',
    'runtimeSessionForRightHandTurning',
    'handleSessionEnded',
    'await runtime.session.end()',
    'data-renderer-ready',
    'QUEST_IMMERSIVE_ENTRY_SOURCE_READY_DEVICE_PROOF_PENDING',
  ]) {
    assert.ok(world.includes(contract), contract)
  }

  assert.ok(entry.includes("requiredFeatures: ['local-floor']"))
  assert.ok(entry.includes('bounded-floor'))
  assert.ok(entry.includes('hand-tracking'))
  assert.ok(!world.includes('QUEST_FULL_URAI_WORLD_VERIFIED'))
  assert.ok(!world.includes('QUEST_IMMERSIVE_ENTRY_VERIFIED_MINIMAL_SHELL'))
})
