import test from 'node:test'
import assert from 'node:assert/strict'
import { HOME_GROUND_COVER_INSTANCE_BUDGET, inspectHomeVisualStudyScene } from '../src/spatial/layout/homeVisualStudyEvidence.mjs'

function scene({ sky = false, cover = 0, vertices = 75, hasMaterial = true } = {}) {
  const objects = {
    'home-golden-hour-sky': sky ? { children: [{ isMesh: true, visible: true, geometry: {}, material: {} }] } : undefined,
    'home-authored-ground-cover-study': cover ? { isInstancedMesh: true, count: cover, geometry: { getAttribute: () => ({ count: vertices }) }, material: hasMaterial ? {} : null } : undefined,
  }
  return { getObjectByName: (key) => objects[key] }
}

test('ordinary Home requires no nonproduction review assets', () => {
  assert.equal(inspectHomeVisualStudyScene(scene(), { goldenHour: false, groundCover: false, qualityTier: 'high' }).ready, true)
})

test('golden-hour review does not report ready without a mounted actual Sky mesh', () => {
  const opts = { goldenHour: true, groundCover: false, qualityTier: 'high' }
  assert.equal(inspectHomeVisualStudyScene(scene(), opts).ready, false)
  assert.equal(inspectHomeVisualStudyScene(scene({ sky: true }), opts).ready, true)
})

for (const [tier, count] of Object.entries(HOME_GROUND_COVER_INSTANCE_BUDGET)) {
  test(`${tier} meadow refuses missing, incomplete and unmaterialized instances`, () => {
    const opts = { goldenHour: true, groundCover: true, qualityTier: tier }
    assert.equal(inspectHomeVisualStudyScene(scene({ sky: true }), opts).ready, false)
    assert.equal(inspectHomeVisualStudyScene(scene({ sky: true, cover: count - 1 }), opts).ready, false)
    assert.equal(inspectHomeVisualStudyScene(scene({ sky: true, cover: count, vertices: 0 }), opts).ready, false)
    assert.equal(inspectHomeVisualStudyScene(scene({ sky: true, cover: count, hasMaterial: false }), opts).ready, false)
    assert.equal(inspectHomeVisualStudyScene(scene({ sky: true, cover: count }), opts).ready, true)
  })
}

test('daytime scene does not claim validated Sky while missing geometry', () => {
  const opts = { goldenHour: true, groundCover: false, qualityTier: 'medium' }
  assert.equal(inspectHomeVisualStudyScene({ getObjectByName: () => ({ children: [{ isMesh: true, visible: true }] }) }, opts).skyReady, false)
})

test('sky study cannot pass with invisible sky group, child or ancestor', () => {
  const opts = { goldenHour: true, groundCover: false, qualityTier: 'high' }
  const group = { visible: false, children: [{ isMesh: true, visible: true, geometry: {} }] }
  group.children[0].parent = group
  assert.equal(inspectHomeVisualStudyScene({ getObjectByName: () => group }, opts).ready, false)
  group.visible = true
  group.children[0].visible = false
  assert.equal(inspectHomeVisualStudyScene({ getObjectByName: () => group }, opts).ready, false)
  group.children[0].visible = true
  group.parent = { visible: false }
  assert.equal(inspectHomeVisualStudyScene({ getObjectByName: () => group }, opts).ready, false)
})

test('meadow study cannot pass with hidden mesh or hidden ancestor', () => {
  const opts = { goldenHour: false, groundCover: true, qualityTier: 'high' }
  const cover = { isInstancedMesh: true, visible: false, count: 1600,
    geometry: { getAttribute: () => ({ count: 75 }) }, material: {} }
  const scene = { getObjectByName: () => cover }
  assert.equal(inspectHomeVisualStudyScene(scene, opts).ready, false)
  cover.visible = true
  cover.parent = { visible: false }
  assert.equal(inspectHomeVisualStudyScene(scene, opts).ready, false)
  cover.parent.visible = true
  assert.equal(inspectHomeVisualStudyScene(scene, opts).ready, true)
})

test('corrupt cyclic ancestors never produce evidence of rendered Home assets', () => {
  const opts = { goldenHour: false, groundCover: true, qualityTier: 'high' }
  const cover = { isInstancedMesh: true, count: 1600,
    geometry: { getAttribute: () => ({ count: 75 }) }, material: {} }
  cover.parent = cover
  assert.equal(inspectHomeVisualStudyScene({ getObjectByName: () => cover }, opts).ready, false)
})


test('sky cannot pass with missing, hidden, non-color-writing or zero-opacity material', () => {
  const opts = { goldenHour: true, groundCover: false, qualityTier: 'high' }
  const mesh = { isMesh: true, visible: true, geometry: {}, material: null }
  const group = { children: [mesh] }; mesh.parent = group
  const scene = { getObjectByName: () => group }
  assert.equal(inspectHomeVisualStudyScene(scene, opts).ready, false)
  for (const material of [{visible:false}, {colorWrite:false}, {opacity:0}, [{visible:false},{opacity:0}]]) {
    mesh.material = material
    assert.equal(inspectHomeVisualStudyScene(scene, opts).ready, false)
  }
  mesh.material = {visible:true, opacity:1, colorWrite:true}
  assert.equal(inspectHomeVisualStudyScene(scene, opts).ready, true)
})

test('meadow cannot pass with hidden, non-color-writing or zero-opacity material', () => {
  const opts = { goldenHour: false, groundCover: true, qualityTier: 'high' }
  const cover = { isInstancedMesh:true, count:1600, visible:true,
    geometry:{getAttribute:()=>({count:75})}, material:null }
  const scene = {getObjectByName:()=>cover}
  for (const material of [null, {visible:false}, {colorWrite:false}, {transparent:true,opacity:0}, [{visible:false},{colorWrite:false}]]) {
    cover.material=material
    assert.equal(inspectHomeVisualStudyScene(scene, opts).ready, false)
  }
  cover.material=[{visible:false},{opacity:1}]
  assert.equal(inspectHomeVisualStudyScene(scene, opts).ready, true)
})
