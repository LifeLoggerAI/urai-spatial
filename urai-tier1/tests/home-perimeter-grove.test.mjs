import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
import { makeHomePerimeterBranchGeometry } from '../src/spatial/layout/homePerimeterBranchGeometry.ts'
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
  assert.equal(HOME_PERIMETER_TREE_COUNT, 24)
  const positions = Array.from({ length: HOME_PERIMETER_TREE_COUNT }, (_, i) => homePerimeterTreePlacement(i))
  const seen = new Set()
  for (const p of positions) {
    assert.ok(Number.isFinite(p.x) && Number.isFinite(p.z) && Number.isFinite(p.scale))
    assert.ok(p.x < -14.45 || p.x > 14.45 || p.z < -18.45,
      'the physical trunk remains outside the canonical first-person HOME_BOUNDS with clearance')
    assert.ok(p.scale >= .72 && p.scale <= 1.3, 'physical tree scale remains bounded')
    assert.ok(Number.isInteger(p.crownProfile) && p.crownProfile >= 0 && p.crownProfile <= 2, 'crown profile is bounded')
    assert.ok(Number.isFinite(p.lean) && Math.abs(p.lean) <= .07, 'trunk lean is bounded')
    const key = p.x.toFixed(4) + ':' + p.z.toFixed(4)
    assert.ok(!seen.has(key), 'not two trees at the same root')
    seen.add(key)
  }
  assert.deepEqual(positions, Array.from({ length: HOME_PERIMETER_TREE_COUNT }, (_, i) => homePerimeterTreePlacement(i)))
  assert.equal(new Set(positions.map(p => p.crownProfile)).size, 3, 'the authored composition exercises all three distinct crown profiles')
  assert.throws(() => homePerimeterTreePlacement(-1), /bounded authored/)
  assert.throws(() => homePerimeterTreePlacement(HOME_PERIMETER_TREE_COUNT), /bounded authored/)
})

test('real Home rendering mounts instanced branches, foliage, licensed reuse and correct cleanup', () => {
  assert.equal(HOME_PERIMETER_BRANCHES_PER_TREE, 5)
  assert.equal(HOME_PERIMETER_LEAF_CLUSTERS_PER_TREE, 15)
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

test('authored tapered grove wood uses bounded curved Three geometry and preserves instance submissions', () => {
  const geometry = [makeHomePerimeterBranchGeometry('trunk'), makeHomePerimeterBranchGeometry('bough')]
  try {
    for (const [index, wood] of geometry.entries()) {
      const p = wood.getAttribute('position')
      const normals = wood.getAttribute('normal')
      assert.ok(wood.getIndex().count < 1400, 'shared natural wood stays within bounded geometry budget')
      assert.equal(p.count, normals.count)
      const ring = (y) => {
        let cx = 0; let cz = 0; let count = 0; let radius = 0
        for (let vertex = 0; vertex < p.count; vertex++) if (Math.abs(p.getY(vertex) - y) < 1e-6) {
          cx += p.getX(vertex); cz += p.getZ(vertex); count++
        }
        assert.ok(count > 0)
        cx /= count; cz /= count
        for (let vertex = 0; vertex < p.count; vertex++) if (Math.abs(p.getY(vertex) - y) < 1e-6) {
          radius = Math.max(radius, Math.hypot(p.getX(vertex) - cx, p.getZ(vertex) - cz))
        }
        return { cx, cz, radius }
      }
      const base = ring(-.5); const crown = ring(.5)
      assert.ok(crown.cx - base.cx > .10, 'tree part must have a visibly curved centerline')
      assert.ok(base.radius > crown.radius * 1.3, 'tree part tapers toward its tip')
      assert.ok(wood.boundingSphere?.radius > 0)
      for (let vertex = 0; vertex < p.count; vertex++) {
        for (const value of [p.getX(vertex), p.getY(vertex), p.getZ(vertex), normals.getX(vertex), normals.getY(vertex), normals.getZ(vertex)]) {
          assert.ok(Number.isFinite(value), 'no nonfinite geometry data')
        }
      }
    }
    assert.match(grove, /args=\{\[trunkGeometry, undefined, TREE_COUNT\]\}/)
    assert.match(grove, /args=\{\[boughGeometry, undefined, TREE_COUNT \* BRANCHES\]\}/)
    assert.match(grove, /trunkGeometry\.dispose\(\); boughGeometry\.dispose\(\)/)
  } finally { for (const wood of geometry) wood.dispose() }
})
