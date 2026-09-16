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
})

test('destination return is consumed from session bridge into reducer authority', () => {
  assert.match(source, /consumeHomeReturnFrame\(\)/)
  assert.match(source, /type: 'DESTINATION_RETURN'/)
})

test('Escape ignores editable text fields so Orb chat and forms keep native editing semantics', () => {
  assert.match(source, /closest\('input,textarea,select,\[contenteditable="true"\]'\)/)
  assert.match(source, /event\.key !== 'Escape'/)
})
