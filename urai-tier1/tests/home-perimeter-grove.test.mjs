import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
import {
  HOME_PERIMETER_TREE_COUNT,
  HOME_PERIMETER_BRANCHES_PER_TREE,
  HOME_PERIMETER_LEAF_CLUSTERS_PER_TREE,
  homePerimeterTreePlacement,
} from '../src/spatial/layout/homePerimeterGrovePlacement.ts'

const read = path => fs.readFileSync(new URL(path, import.meta.url), 'utf8')
const home = read('../src/spatial/layout/HomeWorldProductionPolished.tsx')
const grove = read('../src/spatial/layout/HomeSanctuaryPerimeterGrove.tsx')

test('authored physical trees frame the sanctuary without invisible walking obstacles', () => {
  assert.equal(HOME_PERIMETER_TREE_COUNT, 18)
  const positions = Array.from({ length: HOME_PERIMETER_TREE_COUNT }, (_, i) => homePerimeterTreePlacement(i))
  const seen = new Set()
  for (const p of positions) {
    assert.ok(Number.isFinite(p.x) && Number.isFinite(p.z) && Number.isFinite(p.scale))
    assert.ok(p.x < -14.45 || p.x > 14.45 || p.z < -18.45,
      'the physical trunk remains outside the canonical first-person HOME_BOUNDS with clearance')
    assert.ok(p.scale >= .78 && p.scale <= 1.21, 'physical tree scale remains bounded')
    const key = p.x.toFixed(4) + ':' + p.z.toFixed(4)
    assert.ok(!seen.has(key), 'not two trees at the same root')
    seen.add(key)
  }
  assert.deepEqual(positions, Array.from({ length: HOME_PERIMETER_TREE_COUNT }, (_, i) => homePerimeterTreePlacement(i)))
  assert.throws(() => homePerimeterTreePlacement(-1), /bounded authored/)
  assert.throws(() => homePerimeterTreePlacement(18), /bounded authored/)
})

test('real Home rendering mounts instanced branches, foliage, licensed reuse and correct cleanup', () => {
  assert.equal(HOME_PERIMETER_BRANCHES_PER_TREE, 5)
  assert.equal(HOME_PERIMETER_LEAF_CLUSTERS_PER_TREE, 18)
  assert.ok(HOME_PERIMETER_TREE_COUNT * HOME_PERIMETER_LEAF_CLUSTERS_PER_TREE <= 360)
  assert.match(home, /<HomeSanctuaryPerimeterGrove \/>/)
  assert.match(grove, /buildReplayLeafSprayGeometry\(\)/)
  assert.match(grove, /makeReplaySurfaceTextures\('bark'\)/)
  for (const id of ['home-perimeter-tree-trunks','home-perimeter-tree-boughs','home-perimeter-tree-foliage']) assert.ok(grove.includes(id))
  assert.match(grove, /mesh\.computeBoundingSphere\(\)/)
  assert.match(grove, /leafGeometry\.dispose\(\); bark\.dispose\(\)/)
  assert.match(grove, /finalArtAdmitted: false/)
  assert.match(grove, /collisionAuthority: false/)
  assert.match(home, /<Vegetation \/>\s*<HomeSanctuaryPerimeterGrove \/>/)
})
