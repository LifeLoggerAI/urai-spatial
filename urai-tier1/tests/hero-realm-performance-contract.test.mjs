import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(here, '..')
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8')

test('spatial quality tier keeps hero GLBs while adapting render cost', () => {
  const source = read('src/spatial/performance/useSpatialQualityTier.ts')
  assert.match(source, /'hero' \| 'balanced' \| 'mobile'/)
  assert.match(source, /deviceMemory/)
  assert.match(source, /hardwareConcurrency/)
  assert.match(source, /pointer: coarse/)
  assert.match(source, /NEXT_PUBLIC_URAI_SPATIAL_QUALITY/)
  assert.match(source, /shadowMapSize: 2048/)
  assert.match(source, /shadowMapSize: 1024/)
  assert.match(source, /realtimeShadows: false/)
})

test('Council hero runtime binds adaptive DPR and shadow cost without changing model authority', () => {
  const source = read('src/spatial/council/CouncilRealm.tsx')
  assert.match(source, /hero-realms-v2\/council-chamber-hero-v2\.glb/)
  assert.match(source, /useSpatialQualityTier/)
  assert.match(source, /dpr=\{quality\.dpr\}/)
  assert.match(source, /shadows=\{quality\.realtimeShadows\}/)
  assert.match(source, /shadow-mapSize-width=\{quality\.shadowMapSize\}/)
  assert.match(source, /quality\.contactShadows/)
  assert.match(source, /data-spatial-quality-tier/)
})

test('Shadow hero runtime binds the same adaptive quality contract', () => {
  const source = read('src/components/spatial/shadow-realm-portal.tsx')
  assert.match(source, /hero-realms-v2\/shadow-hall-hero-v2\.glb/)
  assert.match(source, /useSpatialQualityTier/)
  assert.match(source, /dpr=\{quality\.dpr\}/)
  assert.match(source, /shadows=\{quality\.realtimeShadows\}/)
  assert.match(source, /quality\.contactShadows/)
  assert.match(source, /data-spatial-quality-tier/)
  assert.doesNotMatch(source, /<img/i)
})
