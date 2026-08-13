import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(here, '..')
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8')

test('Legacy routes own an embodied archive instead of redirect-only Life Map convergence', () => {
  for (const route of ['src/app/legacy/page.tsx', 'src/app/spatial/legacy/page.tsx']) {
    const source = read(route)
    assert.match(source, /LegacyArchiveWorld/)
    assert.doesNotMatch(source, /LifeMapSemanticRoute/)
  }
})

test('Legacy archive is sub-budget model-backed, walkable and mobile-accessible', () => {
  const source = read('src/spatial/legacy/LegacyArchiveWorld.tsx')
  assert.match(source, /legacy-archive-foundation-v1\.glb/)
  assert.match(source, /ArchiveFurniture/)
  assert.match(source, /stepEmbodiedMotion/)
  assert.match(source, /useMovementInput/)
  assert.match(source, /useDragLook/)
  assert.match(source, /MobileMovementPad/)
  assert.match(source, /MovementHelp/)
  assert.match(source, /minX: -4\.7, maxX: 4\.7, minZ: -7\.1, maxZ: 7\.0/)
  assert.match(source, /\/life-map\?from=legacy&overview=1/)
  assert.match(source, /data-legacy-model-authority="legacy-archive-foundation-v1"/)
})

test('Legacy archive does not depend on placeholder or network availability probing', () => {
  const source = read('src/spatial/legacy/LegacyArchiveWorld.tsx')
  assert.doesNotMatch(source, /method: 'HEAD'/)
  assert.doesNotMatch(source, /placeholder/i)
  assert.doesNotMatch(source, /physical-fallback-until-binary-receipt/)
})
