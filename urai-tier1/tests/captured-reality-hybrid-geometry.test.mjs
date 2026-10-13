import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import fs from 'node:fs'
import test from 'node:test'
import {
  capturedRealityHybridRegistrationValid, inspectCapturedRealitySelfContainedGlb,
  verifyCapturedRealityHybridPayload,
} from '../src/spatial/captured-reality/capturedRealityHybridGeometry.ts'

const matrix = [1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]
const sourceSha = 'a'.repeat(64)
function fixtureGlb(extra = {}) {
  const json = {
    asset: {version:'2.0'}, buffers:[{byteLength:36}], bufferViews:[{buffer:0,byteOffset:0,byteLength:36}],
    accessors:[{bufferView:0,componentType:5126,count:3,type:'VEC3'}],
    meshes:[{primitives:[{attributes:{POSITION:0},mode:4}]}],
    nodes:[{mesh:0}], scenes:[{nodes:[0]}], scene:0, ...extra,
  }
  const content=Buffer.from(JSON.stringify(json))
  const padded=Buffer.alloc(Math.ceil(content.length/4)*4,0x20);content.copy(padded)
  const b=Buffer.alloc(20+padded.length+8+36)
  b.writeUInt32LE(0x46546c67,0);b.writeUInt32LE(2,4);b.writeUInt32LE(b.length,8)
  b.writeUInt32LE(padded.length,12);b.writeUInt32LE(0x4e4f534a,16);padded.copy(b,20)
  b.writeUInt32LE(36,20+padded.length);b.writeUInt32LE(0x004e4942,24+padded.length)
  return new Uint8Array(b)
}
function fixtureRegistration(bytes, overrides={}) {
  return {
    schemaVersion:'urai-hybrid-registration-1', splatSha256:sourceSha,
    meshSha256:createHash('sha256').update(bytes).digest('hex'),
    splatToWorld:matrix, meshToWorld:matrix, sourceFrame:'right-handed-y-up',
    admission:'technical-proof', alignmentReviewed:true, metricScaleReviewed:false, ...overrides,
  }
}
test('a self-contained fixture mesh passes byte fixity but remains private technical proof only',async()=>{
  const bytes=fixtureGlb(), registration=fixtureRegistration(bytes)
  assert.deepEqual(inspectCapturedRealitySelfContainedGlb(bytes),{meshCount:1,triangleCount:1,nodeCount:1})
  assert.equal(capturedRealityHybridRegistrationValid(registration,sourceSha,'proof'),true)
  assert.equal(capturedRealityHybridRegistrationValid(registration,sourceSha,'runtime'),false)
  const stable=await verifyCapturedRealityHybridPayload({bytes,sha256:registration.meshSha256,registration},sourceSha,'proof')
  assert.deepEqual(stable,bytes)
  assert.notEqual(stable,bytes)
})
test('production requires a reviewed scale and registration bound to exact splat bytes',()=>{
  const bytes=fixtureGlb()
  const registration=fixtureRegistration(bytes,{admission:'independently-admitted',metricScaleReviewed:true})
  assert.equal(capturedRealityHybridRegistrationValid(registration,sourceSha,'runtime'),true)
  assert.equal(capturedRealityHybridRegistrationValid(registration,'b'.repeat(64),'runtime'),false)
  assert.equal(capturedRealityHybridRegistrationValid({...registration,alignmentReviewed:false},sourceSha,'runtime'),false)
  assert.equal(capturedRealityHybridRegistrationValid({...registration,metricScaleReviewed:false},sourceSha,'runtime'),false)
  assert.equal(capturedRealityHybridRegistrationValid({...registration,meshToWorld:[-1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]},sourceSha,'runtime'),false)
})
test('external GLB dependencies and malformed geometry fail closed',()=>{
  assert.throws(()=>inspectCapturedRealitySelfContainedGlb(fixtureGlb({images:[{uri:'https://malicious.example/texture'}]})),/PRIVATE_GLB_EXTERNAL_DEPENDENCY_FORBIDDEN/)
  assert.throws(()=>inspectCapturedRealitySelfContainedGlb(fixtureGlb({meshes:[{primitives:[{attributes:{POSITION:17}}]}]})),/PRIVATE_GLB_ACCESSOR_INVALID/)
  const bad=fixtureGlb();bad[0]=0
  assert.throws(()=>inspectCapturedRealitySelfContainedGlb(bad),/PRIVATE_GLB_HEADER_INVALID/)
})
test('private scene owns one splat and one optional mesh in the same Canvas',()=>{
  const scene=fs.readFileSync(new URL('../src/spatial/captured-reality/CapturedRealityPrivateScene.tsx',import.meta.url),'utf8')
  const mesh=fs.readFileSync(new URL('../src/spatial/captured-reality/CapturedRealityHybridMesh.tsx',import.meta.url),'utf8')
  assert.match(scene,/CapturedRealityHybridMesh mesh=\{hybridMesh\}/)
  assert.match(scene,/CapturedRealitySplat/)
  assert.match(mesh,/disposeOwnedMeshScene\(loaded\)/)
  assert.match(mesh,/HYBRID_DEPTH_MATERIAL_NOT_ACCEPTED/)
  assert.doesNotMatch(mesh,/fetch\(|axios|https:\/\//)
})

test('both-layer draw proof waits for the GLB onAfterRender and matching scene generation',()=>{
  const scene=fs.readFileSync(new URL('../src/spatial/captured-reality/CapturedRealityPrivateScene.tsx',import.meta.url),'utf8')
  const mesh=fs.readFileSync(new URL('../src/spatial/captured-reality/CapturedRealityHybridMesh.tsx',import.meta.url),'utf8')
  assert.match(mesh,/object\.onAfterRender = \(\) =>/)
  assert.match(mesh,/onRenderReadyRef\.current\?\.\(mesh\.sha256\)/)
  assert.match(scene,/meshDrawReadyFor\?\.generation === generation/)
  assert.match(scene,/meshDrawReadyFor\.sha256 === hybridMesh\.sha256/)
  assert.match(scene,/data-captured-reality-hybrid-draw-submitted=/)
  assert.match(scene,/renderReady && hybridDrawReady/)
})
