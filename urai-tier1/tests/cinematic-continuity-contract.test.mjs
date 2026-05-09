import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const root = process.cwd()

function read(relativePath) {
  const absolutePath = path.join(root, relativePath)
  assert.ok(fs.existsSync(absolutePath), `missing expected file: ${relativePath}`)
  return fs.readFileSync(absolutePath, 'utf8')
}

const tierOne = read('src/spatial/layout/TierOneExperience.tsx')
const continuity = read('src/spatial/layout/SpatialCinematicContinuityLayer.tsx')
const lifemapNavigation = read('src/spatial/interaction/LifeMapNavigationOverlay.tsx')

test('TierOneExperience mounts the shared cinematic continuity layer across locked routes', () => {
  assert.match(tierOne, /import \{ SpatialCinematicContinuityLayer \} from "\.\/SpatialCinematicContinuityLayer"/)
  assert.match(tierOne, /<SpatialCinematicContinuityLayer mode=\{mode\} \/>/)
})

test('generic route card is not mounted for cinematic locked modes', () => {
  assert.match(tierOne, /function shouldShowRouteCard/)
  assert.match(tierOne, /mode === "focus"/)
  assert.match(tierOne, /mode === "replay"/)
  assert.match(tierOne, /mode === "mirror"/)
  assert.match(tierOne, /mode === "unwind"/)
  assert.match(tierOne, /return false/)
})

test('continuity layer contains shared URAI symbolic atmosphere', () => {
  for (const token of [
    'data-testid="urai-cinematic-continuity"',
    'urai-cinematic-continuity__orb-thread',
    'urai-cinematic-continuity__council',
    'urai-cinematic-continuity__threshold',
    'urai-cinematic-continuity__recovery',
    'urai-cinematic-continuity__social',
    '@media (prefers-reduced-motion: reduce)',
    '@media (max-width: 760px)',
  ]) {
    assert.match(continuity, new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
  }
})

test('Life Map navigation speaks in symbolic layer language instead of mechanical UI language only', () => {
  assert.match(lifemapNavigation, /Why am I seeing this\?/) 
  assert.match(lifemapNavigation, /emotional nebulae/) 
  assert.match(lifemapNavigation, /recovery paths/) 
  assert.match(lifemapNavigation, /ritual and threshold markers/) 
  assert.match(lifemapNavigation, /relationship clusters/) 
  assert.match(lifemapNavigation, /Council guide lights/) 
  assert.match(lifemapNavigation, /aria-label="Life Map time lens and memory explanation"/) 
})
