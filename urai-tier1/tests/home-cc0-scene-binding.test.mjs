import assert from 'node:assert/strict'
import test from 'node:test'
import { auditHomeCC0Scene } from '../src/spatial/layout/HomeCC0SceneAudit.mjs'
import fs from 'node:fs'
const read = (p) => fs.readFileSync(new URL(p, import.meta.url), 'utf8')
const texture = (w = 1024, h = 1024) => ({ isTexture: true, image: { width: w, height: h } })
const photo = (surface) => ({
 userData: { uraiCC0ReviewSurface: surface }, map: texture(), normalMap: texture(), roughnessMap: texture(),
 onBeforeCompile() {}, customProgramCacheKey() { return 'urai-home-cc0-photo-macro-v1' },
})
const mesh = material => ({ isMesh: true, visible: true, geometry: {}, material })
function fixture() {
 const meshes = [mesh(photo('ground')), ...Array.from({length: 3}, () => mesh(photo('path')))]
 return { meshes, traverse(fn) { meshes.forEach(fn) }, getObjectByName(name) {
   return name === 'home-cc0-shrub03-review' ? { traverse(fn) { fn(mesh({map: texture()})) } } : null
 } }
}
test('one photographic ground and three real paths plus shrub are required', () => {
 const scene=fixture(), got=auditHomeCC0Scene(scene)
 assert.equal(got.sceneBound, true)
 assert.equal(got.groundMeshes, 1)
 assert.equal(got.pathMeshes, 3)
 assert.equal(got.shrubMeshes, 1)
})
test('missing photographic maps, wrong shaders, and fake shrub fail closed', () => {
 const scene=fixture()
 scene.meshes[0].material.normalMap=texture(0,0)
 assert.equal(auditHomeCC0Scene(scene).sceneBound,false)
 scene.meshes[0].material.normalMap=texture()
 scene.meshes[1].material.customProgramCacheKey=()=> 'fake'
 assert.equal(auditHomeCC0Scene(scene).sceneBound,false)
 scene.meshes[1].material.customProgramCacheKey=()=> 'urai-home-cc0-photo-macro-v1'
 scene.getObjectByName=()=>null
 assert.equal(auditHomeCC0Scene(scene).sceneBound,false)
})
test('actual active Home renderer owns development-only evidence and source surface tags', () => {
 const renderer=read('../src/spatial/layout/HomeWorldProductionPolished.tsx')
 const pbr=read('../src/spatial/layout/HomeCC0ReviewMaterial.tsx')
 const retained=read('../src/spatial/layout/HomeCC0ReviewRetainedGround.tsx')
 const runtime=read('../src/spatial/layout/HomeCC0RuntimeEvidence.tsx')
 assert.match(renderer,/HOME_CC0_DEV_REVIEW && !props\.previewW13V3 \? <HomeCC0RuntimeEvidence/)
 assert.match(pbr,/uraiCC0ReviewSurface: surface/)
 assert.match(retained,/uraiCC0ReviewSurface: 'ground'/)
 assert.match(runtime,/auditHomeCC0Scene\(scene\)/)
 assert.match(renderer,/NODE_ENV === 'development'/)
})
