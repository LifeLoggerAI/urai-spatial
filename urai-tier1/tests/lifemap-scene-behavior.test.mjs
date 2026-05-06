import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const root = process.cwd()
const candidates = [
  path.join(root, 'src/components/spatial/LifeMapScene.tsx'),
  path.join(root, '..', 'src/components/spatial/LifeMapScene.tsx'),
]
const scenePath = candidates.find((file) => fs.existsSync(file))
assert.ok(scenePath, 'LifeMapScene source file should exist in repo')
const scene = fs.readFileSync(scenePath, 'utf8')

const normalize = (code) => code.replace(/\s+/g, ' ')
const flat = normalize(scene)

test('glow scheduler limits random glowing stars to at most 3', () => {
  assert.match(flat, /const pickCount = Math\.min\(1 \+ Math\.floor\(Math\.random\(\) \* 3\), candidates\.length\)/)
  assert.match(flat, /slice\(0, pickCount\)/)
})

test('resolved stars are excluded from glow candidates and protected by reducer', () => {
  assert.match(flat, /s\.id !== state\.activeStarId && s\.state !== 'resolved'/)
  assert.match(flat, /s\.state === 'resolved' \? s : \{ \.\.\.s, state: action\.ids\.includes\(s\.id\) \? 'glowing' : 'idle' \}/)
})

test('reduced-motion disables pulsing and line flow loops', () => {
  assert.match(flat, /@media \(prefers-reduced-motion: reduce\)/)
  assert.match(flat, /\.memory-star, \.connection-line, \.lifemap-space \{ animation: none !important; transition-duration: 0\.01ms !important; \}/)
  assert.match(flat, /\.connection-line\.is-flowing \{ animation: none; \}/)
  assert.match(flat, /state\.reducedMotion \? 14000 : 8000 \+ Math\.floor\(Math\.random\(\) \* 6000\)/)
})

test('reset action clears focus and restores phase and camera', () => {
  assert.match(flat, /dispatch\(\{ type: 'CLEAR_FOCUS' \}\)/)
  assert.match(flat, /case 'CLEAR_FOCUS': return \{ \.\.\.state, phase: 'living', activeStarId: null, activeChapterId: null, camera: \{ x: 50, y: 50, zoom: 1 \}/)
})

test('chapter anchors trigger cluster focus and emit narrator/timeline events', () => {
  assert.match(flat, /type: 'FOCUS_CLUSTER'/)
  assert.match(flat, /chapterId: chapter\.id/)
  assert.match(flat, /camera,/)
  assert.match(flat, /companionLine: CHAPTER_LINES\[chapter\.id\]/)
  assert.match(flat, /event: 'lifemap\.cluster\.focus'/)
  assert.match(flat, /emitTimelineSync\(\{ phase: 'cluster', activeChapterId: chapter\.id \}\)/)
})

test('focus and resolve actions emit narrator/timeline payloads', () => {
  assert.match(flat, /event: 'lifemap\.star\.focus'/)
  assert.match(flat, /starId: star\.id/)
  assert.match(flat, /chapterId: star\.chapterId/)
  assert.match(flat, /emotion: star\.emotion/)
  assert.match(flat, /emitTimelineSync\(\{ phase: 'focus', activeStarId: star\.id, activeChapterId: star\.chapterId \}\)/)
  assert.match(flat, /event: 'lifemap\.star\.resolved'/)
  assert.match(flat, /starId: activeStar\.id/)
  assert.match(flat, /chapterId: activeStar\.chapterId/)
  assert.match(flat, /emotion: activeStar\.emotion/)
  assert.match(flat, /action: 'resolve'/)
  assert.match(flat, /emitTimelineSync\(\{ phase: 'focus', activeStarId: activeStar\.id, activeChapterId: activeStar\.chapterId \}\)/)
})
