import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const root = process.cwd()

function read(relativePath) {
  const absolute = path.join(root, relativePath)
  assert.ok(fs.existsSync(absolute), `missing expected file: ${relativePath}`)
  return fs.readFileSync(absolute, 'utf8')
}

const route = read('src/app/life-map/page.tsx')
const galaxy = read('src/components/lifemap/RealLifeMapGalaxy.tsx')
const focusPage = read('src/app/focus/page.tsx')
const replayPage = read('src/app/replay/page.tsx')
const memorySurfaces = read('src/app/FinalMemorySurfaces.tsx')

function includesAll(source, terms) {
  for (const term of terms) assert.ok(source.includes(term), `missing contract term: ${term}`)
}

test('Life Map route uses the final cinematic private galaxy owner', () => {
  assert.match(route, /RealLifeMapGalaxy/)
  assert.doesNotMatch(route, /LifeMapAscentGate|TierOneExperience|CinematicLifeMapScene/)
  assert.match(galaxy, /className="lifeGalaxy"/)
  assert.match(galaxy, /aria-label="URAI Life Map spatial memory constellation"/)
  assert.match(galaxy, /Private memory constellation/)
})

test('memory stars select in place before Focus or Replay navigation', () => {
  includesAll(galaxy, [
    'selected, setSelected',
    'setSelected(node)',
    '--pull-x',
    '--pull-y',
    'Enter Focus',
    'Replay',
    'Recenter',
  ])
  assert.match(galaxy, /const focusHref = \(memoryId: string\)/)
  assert.match(galaxy, /const replayHref = \(memoryId: string\)/)
  assert.match(galaxy, /focusHref\(selected\.id\)/)
  assert.match(galaxy, /replayHref\(selected\.id\)/)
})

test('Life Map keeps camera, keyboard, motion, and safe route contracts', () => {
  includesAll(galaxy, [
    'onPointerMove',
    'onPointerLeave',
    "event.key !== 'Enter'",
    'onDoubleClick',
    'Double click / Enter Focus',
    '@media (prefers-reduced-motion: reduce)',
    "['Home', '/home']",
  ])
})

test('Focus and Replay use final static-export-safe cinematic owners', () => {
  assert.match(focusPage, /FinalFocusChamber/)
  assert.match(replayPage, /FinalReplayFilm/)
  assert.match(memorySurfaces, /selected-memory-camera-chamber/)
  assert.match(memorySurfaces, /cinematic-memory-camera-film/)
  assert.match(memorySurfaces, /Camera into Replay/)
  assert.match(memorySurfaces, /Film beats/)
  assert.doesNotMatch(focusPage, /\[memoryId\]/)
  assert.doesNotMatch(replayPage, /\[memoryId\]/)
})
