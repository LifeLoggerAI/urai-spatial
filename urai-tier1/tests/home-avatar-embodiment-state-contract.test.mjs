import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(here, '..')
const source = fs.readFileSync(path.join(root, 'src/spatial/home/homeExperienceState.ts'), 'utf8')
const runtimeSource = fs.readFileSync(path.join(root, 'src/spatial/layout/HomeWorldProductionV223.tsx'), 'utf8')

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
  assert.match(source, /case 'EMBODIMENT_COMPLETE':[\s\S]*'AVATAR_HOME_FIRST_PERSON'[\s\S]*inputLocked: false/)
})

test('self inspection is a one-layer overlay over first-person Home', () => {
  assert.match(source, /case 'SELF_VIEW_OPEN':[\s\S]*'AVATAR_HOME_FIRST_PERSON'[\s\S]*'AVATAR_SELF_VIEW'/)
  assert.match(source, /case 'SELF_VIEW_CLOSE':[\s\S]*'AVATAR_HOME_FIRST_PERSON'/)
  assert.match(source, /case 'ESCAPE':[\s\S]*state\.stableState === 'AVATAR_SELF_VIEW'[\s\S]*'AVATAR_HOME_FIRST_PERSON'/)
})

test('world surfaces activate only after Avatar embodiment reaches bodyless first-person Home', () => {
  assert.match(source, /function canActivateWorldSurface\(state: HomeExperienceState\) \{[\s\S]*state\.stableState === 'AVATAR_HOME_FIRST_PERSON'[\s\S]*\}/)
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

test('first-person Home ESC unwinds exactly one layer to Home presentation', () => {
  assert.match(source, /state\.stableState === 'AVATAR_HOME_FIRST_PERSON' && !state\.transition[\s\S]*transition: 'EMBODIMENT_UNWIND'[\s\S]*inputLocked: true/)
  assert.match(source, /state\.transition === 'EMBODIMENT_UNWIND' \? 'HOME_PRESENTATION'/)
  assert.doesNotMatch(source, /state\.transition === 'EMBODIMENT_UNWIND' \? 'AVATAR_HOME_FIRST_PERSON'/)
})

test('interrupted Ground or Sky transition restores the recorded origin safely', () => {
  assert.match(source, /state\.transition === 'GROUND_DESCENT' \|\| state\.transition === 'SKY_ASCENT'/)
  assert.match(source, /transition: 'HOME_RESTORE'/)
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

test('active non-XR Home starts in governed Avatar presentation and transitions to bodyless first-person Home', () => {
  assert.match(source, /origin = makeHomeOriginSnapshot\('HOME_PRESENTATION'\)/)
  assert.match(source, /stableState: 'HOME_PRESENTATION'/)
  assert.match(runtimeSource, /<HomeEmbodiedAvatar/)
  assert.match(runtimeSource, /homeApi\.activateAvatar\(\)/)
  assert.match(runtimeSource, /data-home-non-xr-body-policy="camera-only-no-hands-body-rig"/)
  assert.match(runtimeSource, /data-home-presence-policy="presentation-avatar-then-first-person-camera-only-no-hands-body-rig"/)
  assert.match(runtimeSource, /data-home-avatar-activation-gate="required-before-first-person-home"/)
  assert.match(runtimeSource, /data-home-scanned-composition="avatar-presentation-to-bodyless-first-person-authored-living-memory-orb-sculpted-sanctuary-and-broad-sky-threshold"/)
  assert.match(runtimeSource, /data-testid="urai-home-avatar-enter-first-person"/)
  assert.doesNotMatch(runtimeSource, /URAI_HOME_AVATAR_ACTIVATE_EVENT|HOME_AVATAR_MODEL/)
})

