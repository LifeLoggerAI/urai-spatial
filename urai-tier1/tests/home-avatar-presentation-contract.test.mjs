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

const has = (source, marker) => assert.equal(source.includes(marker), true, `missing ${marker}`)

test('presentation Avatar uses the governed human candidate as a physical embodiment anchor', () => {
  for (const marker of [
    'home-human-makehuman-v4.glb',
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
    "event.key !== 'Escape'",
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
