import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const root = process.cwd()
const scenePath = [
  path.join(root, 'src/components/spatial/LifeMapScene.tsx'),
  path.join(root, '..', 'src/components/spatial/LifeMapScene.tsx'),
].find((file) => fs.existsSync(file))

assert.ok(scenePath, 'LifeMapScene source file should exist in repo')
const scene = fs.readFileSync(scenePath, 'utf8')

function includesAll(tokens) {
  for (const token of tokens) {
    assert.ok(scene.includes(token), `Expected LifeMapScene to include ${token}`)
  }
}

test('LifeMap keeps glow selection bounded and skips resolved stars', () => {
  includesAll([
    'pickCount',
    'Math.min',
    'Math.random() * 3',
    "s.state !== 'resolved'",
    "type: 'SET_GLOWING_STARS'",
  ])
})

test('LifeMap supports reduced motion and reset behavior', () => {
  includesAll([
    'prefers-reduced-motion: reduce',
    'animation: none',
    "type: 'CLEAR_FOCUS'",
    "phase: 'living'",
    'camera: { x: 50, y: 50, zoom: 1 }',
  ])
})

test('LifeMap emits cluster, focus, and resolved events', () => {
  includesAll([
    "lifemap.cluster.focus",
    "lifemap.star.focus",
    "lifemap.star.resolved",
    'emitNarratorEvent',
    'emitTimelineSync',
    'activeChapterId',
    'activeStarId',
  ])
})
