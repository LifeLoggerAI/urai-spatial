import assert from 'node:assert/strict'
import { test } from 'node:test'
import fs from 'node:fs'

const source = fs.readFileSync(new URL('../src/spatial/lifemap/LifeMapScene.tsx', import.meta.url), 'utf8')
const flat = source.replace(/\s+/g, ' ')

function assertEventContract(label, requiredTerms) {
  for (const term of requiredTerms) {
    assert.ok(
      flat.includes(term),
      `${label} is missing contract term: ${term}`,
    )
  }
}

test('3D LifeMap scene preserves node topology and focus camera behavior', () => {
  assert.match(source, /DEMO_MEMORY_STARS/)
  assert.match(source, /export type LifeMapNodeType =/)
  assert.match(source, /type FocusApi = \{\s*focus: \(node: LifeMapNode\) => void;\s*reset: \(\) => void;\s*\}/)
  assert.match(source, /const TYPE_BY_MANIFEST/)
  assert.match(source, /const POSITIONS/)
  assert.match(source, /const EDGES: LifeMapEdge\[\]/)
  assert.match(source, /function FocusCameraRig/)
  assert.match(source, /camera\.position\.lerp/)
  assert.match(source, /camera\.lookAt\(target\.current\)/)
})

test('focus and selection actions route users into Focus with manifest identity', () => {
  assert.match(source, /function MemoryNode/)
  assert.match(source, /onClick=\{\(event: ThreeEvent<MouseEvent>\) => \{/)
  assert.match(source, /event\.stopPropagation\(\)/)
  assert.match(source, /onSelect\(node\)/)
  assert.match(source, /onPointerOver=\{\(event: ThreeEvent<PointerEvent>\) => \{/)
  assert.match(source, /onHover\(node\)/)
  assert.match(source, /lm3d-node-label/)
  assert.match(source, /function openFocus\(node: LifeMapNode\)/)
  assert.match(flat, /router\.push\(`\/focus\?manifestId=\$\{encodeURIComponent\(node\.manifestId\)\}`\)/)
})

test('LifeMap HUD exposes reset, status, and Focus entry copy', () => {
  assert.match(source, /function HUDOverlay/)
  assert.match(source, /LIFE MAP 3D V1/)
  assert.match(source, /A living universe of remembered moments\./)
  assert.match(source, /Reset View/)
  assert.match(source, /Memory focus open/)
  assert.match(source, /Constellation awake/)
  assert.match(source, /Choose a star to open Focus/)
  assert.match(source, /function MemoryFocusModal/)
  assert.match(source, /Open Focus/)
  assert.match(source, /Return Galaxy/)
})

test('chapter anchors trigger cluster focus and emit narrator/timeline events', () => {
  assertEventContract('cluster focus', [
    "type: 'FOCUS_CLUSTER'",
    'chapterId: chapter.id',
    'camera,',
    'companionLine: CHAPTER_LINES[chapter.id]',
    'lifemap.cluster.focus',
    'activeChapterId: chapter.id',
  ])
})

test('focus and resolve actions emit narrator/timeline payloads', () => {
  assertEventContract('star focus event', [
    'lifemap.star.focus',
    'starId: star.id',
    'chapterId: star.chapterId',
    'emotion: star.emotion',
  ])

  assertEventContract('star focus timeline sync', [
    "phase: 'focus'",
    'activeStarId: star.id',
    'activeChapterId: star.chapterId',
  ])

  assertEventContract('star resolved event', [
    'lifemap.star.resolved',
    'starId: activeStar.id',
    'chapterId: activeStar.chapterId',
    'emotion: activeStar.emotion',
    "action: 'resolve'",
  ])

  assertEventContract('star resolved timeline sync', [
    'activeStarId: activeStar.id',
    'activeChapterId: activeStar.chapterId',
  ])
})
