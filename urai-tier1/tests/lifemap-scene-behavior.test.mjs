import assert from 'node:assert/strict'
import { test } from 'node:test'
import fs from 'node:fs'

const source = fs.readFileSync(new URL('../src/spatial/lifemap/LifeMapScene.tsx', import.meta.url), 'utf8')
const compact = source.replace(/\s+/g, '')
const flat = source.replace(/\s+/g, ' ')

test('chapter anchors trigger cluster focus and emit narrator/timeline events', () => {
  assert.match(flat, /type: 'FOCUS_CLUSTER'/)
  assert.match(flat, /chapterId: chapter\.id/)
  assert.match(flat, /camera,/)
  assert.match(flat, /companionLine: CHAPTER_LINES\[chapter\.id\]/)
  assert.match(compact, /emitNarratorEvent\(\{event:'lifemap\.cluster\.focus',chapterId:chapter\.id,\}\)/)
  assert.match(compact, /emitTimelineSync\(\{phase:'cluster',activeChapterId:chapter\.id,\}\)/)
})

test('focus and resolve actions emit narrator/timeline payloads', () => {
  assert.match(source, /emitNarratorEvent/)
  assert.match(source, /lifemap\.star\.focus|lifemap\.star\.focus/)
  assert.match(source, /starId:\s*star\.id/)
  assert.match(source, /chapterId:\s*star\.chapterId/)
  assert.match(source, /emotion:\s*star\.emotion/)
  assert.match(compact, /emitTimelineSync\(\{phase:'focus',activeStarId:star\.id,activeChapterId:star\.chapterId,\}\)/)
  assert.match(source, /lifemap\.star\.resolved|lifemap\.star\.resolved/)
  assert.match(source, /starId:\s*activeStar\.id/)
  assert.match(source, /chapterId:\s*activeStar\.chapterId/)
  assert.match(source, /emotion:\s*activeStar\.emotion/)
  assert.match(source, /action:\s*'resolve'/)
  assert.match(compact, /emitTimelineSync\(\{phase:'focus',activeStarId:activeStar\.id,activeChapterId:activeStar\.chapterId,\}\)/)
})
