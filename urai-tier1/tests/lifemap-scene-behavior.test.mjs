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
  assert.match(flat, /const count = 1 \+ Math\.floor\(Math\.random\(\) \* 3\)/)
  assert.match(flat, /slice\(0, count\)/)
})

test('resolved stars are heavily deprioritized and not re-glowed aggressively', () => {
  assert.match(flat, /\(s\.state === 'resolved' \? 4 : 0\)/)
  assert.match(flat, /s\.state === 'resolved' \? s : \{ \.\.\.s, state: action\.ids\.includes\(s\.id\) \? 'glowing' : 'idle' \}/)
})

test('reduced-motion disables pulsing and line flow loops', () => {
  assert.match(flat, /@media \(prefers-reduced-motion:reduce\)\{\.memory-star,\.connection-line,\.lifemap-space\{animation:none!important;transition-duration:\.01ms!important\}\.connection-line\.is-flowing\{animation:none\}\}/)
  assert.match(flat, /state\.reducedMotion \? 14000 : 8000 \+ Math\.floor\(Math\.random\(\) \* 6000\)/)
})

test('Escape clears focus and reset reducer restores phase and camera', () => {
  assert.match(flat, /e\.key === 'Escape' && dispatch\(\{ type: 'CLEAR_FOCUS' \}\)/)
  assert.match(flat, /case 'CLEAR_FOCUS': return \{ \.\.\.state, phase: 'living', activeStarId: null, activeChapterId: null, camera: \{ x: 50, y: 50, zoom: 1 \}/)
})

test('chapter anchors trigger cluster focus and emit narrator/timeline events', () => {
  assert.match(flat, /type: 'FOCUS_CLUSTER'/)
  assert.match(flat, /event: 'lifemap\.cluster\.focus'/)
  assert.match(flat, /phase: 'cluster'/)
})

test('focus and resolve actions emit narrator/timeline payloads', () => {
  assert.match(flat, /event: 'lifemap\.star\.focus'/)
  assert.match(flat, /phase: 'focus'/)
  assert.match(flat, /event: 'lifemap\.star\.resolved'/)
  assert.match(flat, /action: 'resolve'/)
})
