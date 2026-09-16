import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(here, '..')
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8')

const guide = read('src/spatial/ground/GroundSemanticGuide.tsx')
const orbBridge = read('src/spatial/ground/GroundOrbCompanion.tsx')
const page = read('src/app/ground/page.tsx')
const ground = read('src/app/GroundSpatialWorldClean.tsx')

test('canonical Ground mounts a nonvisual relative-language spatial guide', () => {
  assert.match(page, /<GroundSemanticGuide \/>/)
  assert.match(guide, /data-ground-semantic-guide="relative-language-no-raw-coordinates"/)
  assert.match(guide, /Ground spatial description/)
  assert.match(guide, /human eye height/)
  assert.match(guide, /No visible body, hands, reticle, or artificial head bob/)
  assert.match(guide, /Home is always available through the Return Home control/)
  assert.match(guide, /Private place and memory content remains absent unless the required consent and authorized data are available/)
  assert.match(guide, /without a follower Orb/)
  assert.doesNotMatch(guide, /\b[xyz]\s*[:=]\s*-?\d/i)
})

test('Ground semantic guide exposes relative Home and landmark orientation without raw coordinates', () => {
  assert.match(orbBridge, /urai:ground-relative-navigation/)
  assert.match(orbBridge, /returnDirection/)
  assert.match(orbBridge, /returnDistanceMeters/)
  assert.match(orbBridge, /landmarkDirection/)
  assert.match(orbBridge, /landmarkDistanceMeters/)
  assert.match(orbBridge, /relativeDirection/)
  assert.match(guide, /data-ground-return-orientation/)
  assert.match(guide, /Home arrival is \{navigation\.returnDirection\}, about \{navigation\.returnDistanceMeters\} meters away/)
  assert.match(guide, /data-ground-landmark-orientation/)
  assert.match(guide, /distant terrain mass is \{navigation\.landmarkDirection\}/)
  assert.doesNotMatch(guide, /position\.x|position\.y|position\.z|coordinates/i)
})

test('Ground semantic guide announces meaningful movement and return events without leaking coordinates', () => {
  assert.match(guide, /urai:ground-surface-commit/)
  assert.match(guide, /Moving toward the selected terrain at human eye height/)
  assert.match(guide, /Home is \$\{current\.returnDirection\}, about \$\{current\.returnDistanceMeters\} meters/)
  assert.match(guide, /urai:world-return/)
  assert.match(guide, /Returning toward Home through the physical Ground transition/)
  assert.match(guide, /role="status" aria-live="polite" aria-atomic="true"/)
})

test('visual Ground owner remains privacy-empty by default beside the semantic guide', () => {
  assert.match(ground, /data-ground-place-layer="consent-aware-empty-by-default"/)
  assert.match(ground, /data-ground-private-location-mounted="false"/)
  assert.match(ground, /data-ground-visible-avatar="false"/)
  assert.match(ground, /data-ground-visible-hands="false"/)
})
