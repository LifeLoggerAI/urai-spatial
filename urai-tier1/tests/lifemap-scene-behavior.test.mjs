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
  assert.match(compact, /emitNarratorEvent\(\{event:'lifemap\.star\.focus',starId:star\.id,chapterId:star\.chapterId,emotion:star\.emotion,\}\)/)
  assert.match(compact, /emitTimelineSync\(\{phase:'focus',activeStarId:star\.id,activeChapterId:star\.chapterId,\}\)/)
  assert.match(compact, /emitNarratorEvent\(\{event:'lifemap\.star\.resolved',starId:activeStar\.id,chapterId:activeStar\.chapterId,emotion:activeStar\.emotion,action:'resolve',\}\)/)
  assert.match(compact, /emitTimelineSync\(\{phase:'focus',activeStarId:activeStar\.id,activeChapterId:activeStar\.chapterId,\}\)/)
})
