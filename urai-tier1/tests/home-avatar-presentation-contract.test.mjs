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

test('active Home still preserves visible Avatar, authored Orb and broad-sky Life Map ownership while convergence proceeds', () => {
  for (const marker of [
    'home-visible-user-avatar',
    'home-living-memory-orb',
    'visible-sky-broad-interaction',
    '/life-map/?from=home-sky',
    'data-home-presence-presentation="visible-avatar-third-person"',
  ]) has(activeHome, marker)
  assert.doesNotMatch(activeHome, /first-person-hand|fps-hand|weapon-rig|player-hands/i)
})
