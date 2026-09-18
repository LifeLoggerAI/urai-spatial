import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(here, '..')
const source = fs.readFileSync(path.join(root, 'src/spatial/home/useHomeExperienceController.ts'), 'utf8')

const has = (marker) => assert.equal(source.includes(marker), true, `missing ${marker}`)

test('controller captures stable mode and physical camera origin before travel', () => {
  for (const marker of [
    'HomeRuntimeSnapshotSource',
    "stableMode: 'HOME_PRESENTATION' | 'AVATAR_HOME_FIRST_PERSON'",
    'cameraPosition: THREE.Vector3',
    'yaw: number',
    'pitch: number',
    'snapshotHomeOrigin',
  ]) has(marker)
})

test('controller exposes embodiment, self view, Ground, Sky, Orb and semantic unwind actions', () => {
  for (const marker of [
    'activateAvatar',
    'completeEmbodiment',
    'openSelfView',
    'closeSelfView',
    'activateGround',
    'activateSky',
    'activateOrb',
    'completeOrbTransformation',
    'commitDestination',
    'escape',
    'completeRestore',
  ]) has(marker)
})

test('destination handoff persists only the validated semantic return frame before route commit', () => {
  assert.match(source, /persistHomeReturnFrame\(frame\)[\s\S]*onDestinationCommit\(destination, frame\.origin\)/)
  assert.match(source, /state\.pendingDestination !== destination/)
  assert.match(source, /frame\.kind !== 'destination'/)
  assert.match(source, /frame\.destination !== destination/)
})

test('destination return is consumed from session bridge into reducer authority', () => {
  assert.match(source, /consumeHomeReturnFrame\(\)/)
  assert.match(source, /type: 'DESTINATION_RETURN'/)
})

test('Passport and Settings capture exact Home origin through the same session return authority', () => {
  assert.match(source, /HOME_PASSPORT_ORIGIN_CAPTURE_EVENT/)
  assert.match(source, /HOME_SETTINGS_ORIGIN_CAPTURE_EVENT/)
  assert.match(source, /const controlRealmOrigin = \(\) =>/)
  assert.match(source, /state\.stableState === 'HOME_PRESENTATION' \|\| state\.stableState === 'AVATAR_HOME_FIRST_PERSON'[\s\S]*currentOrigin\(\)/)
  assert.match(source, /state\.stableState === 'IMMERSIVE_CONVERSATION'[\s\S]*state\.returnStack\[state\.returnStack\.length - 1\][\s\S]*frame\?\.kind === 'local' \? frame\.origin : null/)
  assert.match(source, /destination: 'PASSPORT'[\s\S]*origin \}/)
  assert.match(source, /destination: 'SETTINGS'[\s\S]*origin \}/)
})

test('Escape ignores editable text fields and yields modal ownership to Avatar Self View', () => {
  assert.match(source, /closest\('input,textarea,select,\[contenteditable="true"\]'\)/)
  assert.match(source, /event\.key !== 'Escape'/)
  assert.match(source, /event\.defaultPrevented/)
  assert.match(source, /querySelector\('\[data-home-layer="AVATAR_SELF_VIEW"\]'\)/)
})

test('browser Back follows semantic unwind and closes Self View only when that layer owns focus', () => {
  assert.match(source, /window\.addEventListener\('popstate'/)
  assert.match(source, /closeSelfView\(\)[\s\S]*return[\s\S]*escape\(\)/)
})
