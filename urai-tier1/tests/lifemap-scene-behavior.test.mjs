import assert from 'node:assert/strict'
import { test } from 'node:test'
import fs from 'node:fs'

const source = fs.readFileSync(new URL('../src/spatial/lifemap/LifeMapScene.tsx', import.meta.url), 'utf8')
const compact = source.replace(/\s+/g, '')
const flat = source.replace(/\s+/g, ' ')

test('Life Map 3D scene is built from centralized demo memory stars', () => {
  assert.match(flat, /import \{ DEMO_MEMORY_STARS \} from "\.\.\/demo\/demoMemoryStars"/)
  assert.match(flat, /const LIFE_MAP_NODES: LifeMapNode\[\] = DEMO_MEMORY_STARS\.map/)
  assert.match(flat, /id: star\.manifestId/)
  assert.match(flat, /manifestId: star\.manifestId/)
  assert.match(flat, /title: star\.label/)
  assert.match(flat, /description: star\.description/)
})

test('Life Map star selection opens focus state and camera lock', () => {
  assert.match(flat, /function selectNode\(node: LifeMapNode\)/)
  assert.match(compact, /setSelected\(node\);cameraApi\.current\?\.focus\(node\);/)
  assert.match(flat, /selected \? "Memory focus open" : "Constellation awake"/)
  assert.match(flat, /selected \? "Camera locked to selected star" : "Choose a star to open Focus"/)
  assert.match(flat, /<MemoryFocusModal node=\{selected\} onOpenFocus=\{onOpenFocus\} onReset=\{onReset\} \/>/)
})

test('focus and reset actions preserve launch navigation contract', () => {
  assert.match(flat, /function reset\(\)/)
  assert.match(compact, /setSelected\(null\);setHovered\(null\);cameraApi\.current\?\.reset\(\);/)
  assert.match(flat, /function openFocus\(node: LifeMapNode\)/)
  assert.match(compact, /router\.push\(`\/focus\?manifestId=\$\{encodeURIComponent\(node\.manifestId\)\}`\);/)
  assert.match(flat, /onPointerMissed=\{reset\}/)
  assert.match(flat, /aria-label="Reset Life Map camera"/)
})
