import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(here, '..')
const source = fs.readFileSync(path.join(root, 'src/spatial/home/homeExperienceState.ts'), 'utf8')

const mustContain = (marker) => assert.equal(source.includes(marker), true, `missing ${marker}`)

for (const marker of [
  "'HOME_PRESENTATION'",
  "'AVATAR_HOME_FIRST_PERSON'",
  "'AVATAR_SELF_VIEW'",
  "'IMMERSIVE_CONVERSATION'",
  "'AVATAR_EMBODIMENT_TRANSITION'",
  "'EMBODIMENT_UNWIND'",
  "'GROUND_DESCENT'",
  "'GROUND_UNWIND'",
  "'SKY_ASCENT'",
  "'LIFE_MAP_UNWIND'",
  "'ORB_TRANSFORMATION'",
  "'ORB_COLLAPSE'",
  "'HOME_RESTORE'",
  "'ERROR_RECOVERY'",
  'HOME_RETURN_SESSION_KEY',
  'HomeOriginSnapshot',
  'HomeCameraSnapshot',
  'HomeEnvironmentSnapshot',
  'returnStack',
  'pendingDestination',
]) mustContain(marker)

test('Home canon has exactly two primary stable embodiment anchors plus scoped overlays', () => {
  assert.match(source, /HOME_PRESENTATION[\s\S]*AVATAR_HOME_FIRST_PERSON/)
  assert.match(source, /AVATAR_SELF_VIEW[\s\S]*IMMERSIVE_CONVERSATION/)
  assert.doesNotMatch(source, /HOME_MENU|LIFE_MAP_PORTAL|GROUND_PORTAL/)
})

test('Avatar activation is guarded to cinematic presentation and becomes a locked embodiment transition', () => {
  assert.match(source, /case 'AVATAR_ACTIVATE':[\s\S]*state\.stableState !== 'HOME_PRESENTATION'[\s\S]*'AVATAR_EMBODIMENT_TRANSITION'[\s\S]*inputLocked: true/)
  assert.match(source, /case 'AVATAR_ACTIVATE':[\s\S]*returnStack: pushReturnFrame\(state, \{ kind: 'local', origin: event\.snapshot \}\)/)
  assert.match(source, /case 'EMBODIMENT_COMPLETE':[\s\S]*'AVATAR_HOME_FIRST_PERSON'[\s\S]*inputLocked: false/)
})

test('self inspection is a one-layer overlay over first-person Home', () => {
  assert.match(source, /case 'SELF_VIEW_OPEN':[\s\S]*'AVATAR_HOME_FIRST_PERSON'[\s\S]*'AVATAR_SELF_VIEW'/)
  assert.match(source, /case 'SELF_VIEW_CLOSE':[\s\S]*'AVATAR_HOME_FIRST_PERSON'/)
  assert.match(source, /case 'ESCAPE':[\s\S]*state\.stableState === 'AVATAR_SELF_VIEW'[\s\S]*'AVATAR_HOME_FIRST_PERSON'/)
})

test('world surfaces activate only from the two stable Home world states', () => {
  assert.match(source, /function canActivateWorldSurface[\s\S]*HOME_PRESENTATION[\s\S]*AVATAR_HOME_FIRST_PERSON/)
  assert.match(source, /case 'GROUND_ACTIVATE':[\s\S]*!canActivateWorldSurface\(state\)/)
  assert.match(source, /case 'SKY_ACTIVATE':[\s\S]*!canActivateWorldSurface\(state\)/)
  assert.match(source, /case 'ORB_ACTIVATE':[\s\S]*!canActivateWorldSurface\(state\)/)
})

test('Ground and Life Map preserve origin snapshots for semantic return', () => {
  assert.match(source, /case 'GROUND_ACTIVATE':[\s\S]*destination: 'GROUND'[\s\S]*origin: event\.snapshot/)
  assert.match(source, /case 'SKY_ACTIVATE':[\s\S]*destination: 'LIFE_MAP'[\s\S]*origin: event\.snapshot/)
  assert.match(source, /case 'DESTINATION_RETURN':[\s\S]*origin\.stableState[\s\S]*'GROUND_UNWIND'[\s\S]*'LIFE_MAP_UNWIND'/)
})

test('Orb conversation unwinds to its immediate origin rather than deleting context', () => {
  assert.match(source, /case 'ORB_ACTIVATE':[\s\S]*'ORB_TRANSFORMATION'[\s\S]*kind: 'local'/)
  assert.match(source, /case 'TRANSITION_COMPLETE':[\s\S]*'IMMERSIVE_CONVERSATION'/)
  assert.match(source, /state\.stableState === 'IMMERSIVE_CONVERSATION'[\s\S]*'ORB_COLLAPSE'[\s\S]*origin\.stableState/)
})

test('first-person Home ESC pops the presentation frame before embodiment unwind', () => {
  assert.match(source, /state\.stableState === 'AVATAR_HOME_FIRST_PERSON'[\s\S]*const \{ frame, stack \} = popReturnFrame\(state\)[\s\S]*frame\?\.origin[\s\S]*makeHomeOriginSnapshot\('HOME_PRESENTATION'\)[\s\S]*returnStack: stack[\s\S]*'EMBODIMENT_UNWIND'/)
  assert.match(source, /state\.transition === 'EMBODIMENT_UNWIND' \? 'HOME_PRESENTATION'/)
})

test('interrupted Avatar, Ground or Sky transition restores its recorded origin safely', () => {
  assert.match(source, /state\.transition === 'AVATAR_EMBODIMENT_TRANSITION'[\s\S]*popReturnFrame\(state\)[\s\S]*transition: 'HOME_RESTORE'/)
  assert.match(source, /state\.transition === 'GROUND_DESCENT' \|\| state\.transition === 'SKY_ASCENT'/)
  assert.match(source, /pendingDestination: null/)
})

test('return frame persistence is session-bounded and validates full origin shape', () => {
  assert.match(source, /sessionStorage\.setItem\(HOME_RETURN_SESSION_KEY/)
  assert.match(source, /sessionStorage\.removeItem\(HOME_RETURN_SESSION_KEY\)/)
  assert.match(source, /parsed\.origin\.stableState !== 'HOME_PRESENTATION'/)
  assert.match(source, /camera\.position\.length !== 3/)
  assert.match(source, /parsed\.kind === 'destination'[\s\S]*parsed\.destination !== 'GROUND'[\s\S]*parsed\.destination !== 'LIFE_MAP'/)
  assert.match(source, /parsed\.origin\.capturedAt/)
  assert.match(source, /environment\.environmentRevision/)
})
