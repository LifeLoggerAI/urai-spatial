import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(here, '..')
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8')
const avatar = read('src/spatial/home/HomeEmbodiedAvatar.tsx')
const selfView = read('src/spatial/home/AvatarSelfView.tsx')
const activeHome = read('src/spatial/layout/HomeWorldProductionV223.tsx')

const has = (source, marker) => assert.equal(source.includes(marker), true, `missing ${marker}`)

test('presentation Avatar uses the governed skinned human candidate as a physical embodiment anchor', () => {
  for (const marker of [
    'home-human-makehuman-v4.glb',
    'cloneSkeleton',
    'three/addons/utils/SkeletonUtils.js',
    'urai-home-user-avatar',
    'embodiedAnchor: true',
    "semanticOwner: 'avatar'",
    'urai-home-user-avatar-hit-volume',
    "'hidden-first-person'",
  ]) has(avatar, marker)
  assert.doesNotMatch(avatar, /portal|Life Map|ground hotspot/i)
})

test('Avatar living presence remains restrained, non-repetitive and reduced-motion safe', () => {
  for (const marker of [
    'non-harmonic-weight-shift',
    'idle_breath-plus-restrained-micro-presence',
    'procedural-breath-plus-restrained-micro-presence',
    'Math.sin(time * 0.31 + 0.42)',
    'Math.sin(time * 0.173 + 1.83)',
    'Math.sin(time * 0.227 + 0.77)',
    "microPresence: reducedMotion ? 'settled'",
  ]) has(avatar, marker)
  assert.match(avatar, /const weightShift = reducedMotion\s*\? 0/)
  assert.match(avatar, /const microYaw = reducedMotion \|\| targeted \|\| state === 'embodying'\s*\? 0/)
})

test('Avatar targeting stays restrained and does not introduce RPG selection geometry', () => {
  has(avatar, 'urai-home-avatar-target-response')
  assert.doesNotMatch(avatar, /ringGeometry|torusGeometry|outline|selection-ring/i)
})

test('self view is an accessible one-layer dialog with explicit personal-data boundary', () => {
  for (const marker of [
    'role="dialog"',
    'aria-modal="true"',
    'aria-labelledby="urai-avatar-self-view-title"',
    'data-home-layer="AVATAR_SELF_VIEW"',
    'data-personal-data-boundary="explicit-safe-fields-only"',
    'Return to first-person Home',
    "event.key === 'Escape'",
    'event.stopImmediatePropagation()',
    "event.key !== 'Tab'",
    'surfaceRef.current?.querySelectorAll',
  ]) has(selfView, marker)
})

test('self-view fields carry provenance and visibility classifications', () => {
  for (const marker of [
    'provenance: string',
    "'private'",
    "'user-approved-profile'",
    "'system-state'",
    'field.provenance',
    'field.visibility',
  ]) has(selfView, marker)
})

test('self view preserves minimum touch target and responsive mobile shell', () => {
  assert.match(selfView, /min-width:48px;min-height:48px/)
  assert.match(selfView, /@media\(max-width:680px\)/)
  assert.match(selfView, /env\(safe-area-inset-/)
})

test('active non-XR Home presents the governed Avatar before transitioning to bodyless first-person', () => {
  for (const marker of [
    'HomeEmbodiedAvatar',
    'visible-avatar-presentation-activation-gate',
    'bodyless-first-person-home',
    'data-home-non-xr-body-policy="camera-only-no-hands-body-rig"',
    'data-home-presence-policy="presentation-avatar-then-first-person-camera-only-no-hands-body-rig"',
    'data-home-avatar-activation-gate="required-before-first-person-home"',
    'avatar-presentation-to-bodyless-first-person-authored-living-memory-orb-sculpted-sanctuary-and-broad-sky-threshold',
    'home-living-memory-orb',
    'visible-sky-broad-interaction',
    '/life-map/?from=home-sky',
  ]) has(activeHome, marker)
  assert.match(activeHome, /<HomeEmbodiedAvatar/)
  assert.match(activeHome, /CURRENT_HOME_PRESENCE_ROOTS = new Set\(\['home-living-memory-orb', 'home-orb-v288-visible-authority', 'urai-home-user-avatar'\]\)/)
  assert.doesNotMatch(activeHome, /HOME_AVATAR_MODEL|visible-cinematic-avatar|visible-avatar-third-person/)
  assert.doesNotMatch(activeHome, /first-person-hand|fps-hand|weapon-rig|player-hands/i)
})