import assert from 'node:assert/strict'
import { test } from 'node:test'
import { HOME_SURFACE_SHADERS, applyOriginalHomeSurfaceDetail } from '../src/spatial/layout/HomeSanctuaryMaterials.tsx'
import * as THREE from 'three'
function compile(kind) {
 const shader={vertexShader:'#include <common>\n#include <begin_vertex>',fragmentShader:'#include <common>\n#include <color_fragment>\n#include <roughnessmap_fragment>\n#include <normal_fragment_maps>'}
 HOME_SURFACE_SHADERS[kind](shader)
 return shader
}
test('ground and stone use bounded, texture-free material variations with stable shader source',()=>{
 const ground=compile('ground'),stone=compile('stone'),timber=compile('timber')
 assert.match(ground.fragmentShader,/homeSoil = homeDetailNoise/)
 assert.match(ground.fragmentShader,/homeEarthTint/)
 assert.doesNotMatch(ground.fragmentShader,/homeMineralTint/)
 assert.match(stone.fragmentShader,/homeVein = homeDetailNoise/)
 assert.match(stone.fragmentShader,/homeMineralTint/)
 assert.doesNotMatch(stone.fragmentShader,/homeEarthTint/)
 assert.doesNotMatch(timber.fragmentShader,/homeEarthTint|homeMineralTint/)
 for(const value of [ground,stone,timber]){
   assert.match(value.vertexShader,/vHomeSurfacePosition/)
   assert.match(value.fragmentShader,/homeDetailNormal/)
   assert.doesNotMatch(value.fragmentShader,/sampler2D|texture2D\(/)
 }
})
test('material variants have unique stable cache keys and do not mutate shared assets',()=>{
 const keys=[]
 for(const kind of ['ground','stone','timber']){
  const m=applyOriginalHomeSurfaceDetail(new THREE.MeshStandardMaterial(),kind)
  keys.push(m.customProgramCacheKey())
  assert.equal(m.map,null)
  assert.equal(m.normalMap,null)
  m.dispose()
 }
 assert.equal(new Set(keys).size,3)
})
