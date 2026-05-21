import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const root = process.cwd()

function read(relativePath) {
  const absolutePath = path.join(root, relativePath)
  assert.ok(fs.existsSync(absolutePath), `missing expected file: ${relativePath}`)
  return fs.readFileSync(absolutePath, 'utf8')
}

const fieldModule = read('src/lib/urai-field-reconstruction.ts')
const memorySchema = read('src/spatial/memory/memoryStarSchema.ts')

test('Phase 5 field module defines renderer-safe field contracts', () => {
  for (const snippet of [
    'export type UraiFieldSourceType',
    'export type UraiFieldRenderMode',
    'export type UraiFieldVisibility',
    'export type UraiEmotionalVector',
    'export type UraiFieldPrimitive',
    'export type UraiEmotionalSplat',
    'export type UraiFieldRenderState',
    'position: { x: number; y: number; z: number }',
    "rendererVersion: 'urai-field-v1'",
    'reducedMotionSafe: boolean',
    'primitives: UraiFieldPrimitive[]',
    'splats: UraiEmotionalSplat[]',
  ]) {
    assert.ok(fieldModule.includes(snippet), `field module missing ${snippet}`)
  }
})

test('Phase 5 field module adapts memory stars into primitives and splats', () => {
  for (const snippet of [
    'memoryStarToFieldPrimitive',
    'fieldPrimitiveToSplat',
    'createFieldRenderStateFromMemoryStars',
    'DEMO_URAI_FIELD_RENDER_STATE',
    'DEMO_MEMORY_STAR_NODES',
    "sourceType: 'memory-star'",
    "splatKind: 'emotional-field-v1'",
    'gaussian: {',
    'sigmaX',
    'sigmaY',
    'sigmaZ',
  ]) {
    assert.ok(fieldModule.includes(snippet), `field module missing adapter/splat contract ${snippet}`)
  }
})

test('Phase 5 fallback path suppresses non-renderable states and limits private identifiers', () => {
  assert.match(fieldModule, /primitive\.visibility === 'deleted'/)
  assert.match(fieldModule, /primitive\.visibility === 'vaulted'/)
  assert.match(fieldModule, /primitive\.visibility === 'locked'/)
  assert.match(fieldModule, /return null/)
  assert.match(fieldModule, /sourceId: 'limited'/)
  assert.match(fieldModule, /userId: null/)
  assert.match(fieldModule, /Source summary limited for fallback rendering\./)
})

test('Phase 5 field state remains deterministic for demo mode', () => {
  assert.match(fieldModule, /generatedAt: '2026-05-21T00:00:00\.000Z'/)
  assert.match(fieldModule, /mode: 'demo'/)
  assert.match(fieldModule, /reducedMotionSafe: true/)
  assert.match(fieldModule, /id: `urai-field:\$\{options\.mode \?\? 'demo'\}:\$\{primitives\.length\}`/)
})

test('Phase 5 field module is local and does not touch remote data stores', () => {
  assert.doesNotMatch(fieldModule, /getFirestore|collection\(|doc\(|onSnapshot|getDoc|setDoc|fetch\(/)
  assert.match(memorySchema, /DEMO_MEMORY_STAR_NODES/)
})
