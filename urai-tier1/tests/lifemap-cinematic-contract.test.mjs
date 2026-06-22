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

const scene = read('src/spatial/v1/CinematicLifeMapScene.tsx')
const tierOne = read('src/spatial/layout/TierOneExperience.tsx')
const focusPage = read('src/app/focus/page.tsx')
const replayPage = read('src/app/replay/page.tsx')

function includesAll(source, terms) {
  for (const term of terms) assert.ok(source.includes(term), `missing contract term: ${term}`)
}

test('Life Map route uses the cinematic spatial constellation scene', () => {
  assert.match(tierOne, /CinematicLifeMapScene/)
  assert.match(tierOne, /mode === "life-map" \|\| mode === "demo"/)
  assert.match(scene, /data-testid="urai-cinematic-lifemap"/)
  assert.match(scene, /aria-label="URAI Life Map cinematic spatial memory universe"/)
})

test('memory stars select in place before Focus or Replay navigation', () => {
  includesAll(scene, [
    'data-testid="urai-lifemap-memory-star"',
    'data-testid="urai-lifemap-memory-capsule"',
    'selectNode(node.id)',
    'setCamera(cameraForNode(node, 1.28))',
    'Open Focus',
    'Replay',
    'Return galaxy',
  ])
  assert.match(scene, /function focusHref\(nodeId: string\)/)
  assert.match(scene, /function replayHref\(nodeId: string, replayPathId: string\)/)
})

test('Life Map keeps camera, keyboard, motion, and safe return contracts', () => {
  includesAll(scene, [
    'onPointerDown={onPointerDown}',
    'onPointerMove={onPointerMove}',
    'onWheel={onWheel}',
    "event.key === 'Escape'",
    "event.key === 'ArrowRight'",
    "prefers-reduced-motion: reduce",
    "router.push('/home')",
  ])
})

test('Focus and Replay remain query-based and static-export safe', () => {
  assert.match(focusPage, /MemoryRouteClient mode="focus"/)
  assert.match(replayPage, /MemoryRouteClient mode="replay"/)
  assert.doesNotMatch(focusPage, /\[memoryId\]/)
  assert.doesNotMatch(replayPage, /\[memoryId\]/)
})
