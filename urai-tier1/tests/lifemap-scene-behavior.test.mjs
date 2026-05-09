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
