import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(here, '..')
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8')

test('shared embodied realm camera uses the canonical movement/collision kernel', () => {
  const source = read('src/spatial/navigation/EmbodiedRealmCamera.tsx')
  assert.match(source, /stepEmbodiedMotion/)
  assert.match(source, /cameraHeight = 1\.68/)
  assert.match(source, /bounds/)
  assert.match(source, /obstacles/)
  assert.match(source, /datasetPrefix/)
})

test('Council is a walkable human-scale hero chamber with table/person collision', () => {
  const source = read('src/spatial/council/CouncilRealm.tsx')
  assert.match(source, /data-council-embodied="true"/)
  assert.match(source, /EmbodiedRealmCamera/)
  assert.match(source, /useMovementInput/)
  assert.match(source, /useDragLook/)
  assert.match(source, /MobileMovementPad/)
  assert.match(source, /MovementHelp/)
  assert.match(source, /spawn=\{\[0, 4\.8\]\}/)
  assert.match(source, /cameraHeight=\{1\.66\}/)
  assert.match(source, /radius: 1\.95/)
  assert.match(source, /hero-realms-v2\/council-chamber-hero-v2\.glb/)
})

test('Shadow is a walkable private hero hall with basin collision', () => {
  const source = read('src/components/spatial/shadow-realm-portal.tsx')
  assert.match(source, /data-shadow-embodied="true"/)
  assert.match(source, /EmbodiedRealmCamera/)
  assert.match(source, /useMovementInput/)
  assert.match(source, /useDragLook/)
  assert.match(source, /MobileMovementPad/)
  assert.match(source, /MovementHelp/)
  assert.match(source, /spawn=\{\[0, 6\.2\]\}/)
  assert.match(source, /cameraHeight=\{1\.68\}/)
  assert.match(source, /radius: 2\.05/)
  assert.match(source, /hero-realms-v2\/shadow-hall-hero-v2\.glb/)
  assert.match(source, /Privacy: private-only/)
})
