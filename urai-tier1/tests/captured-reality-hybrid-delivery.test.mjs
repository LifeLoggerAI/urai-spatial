import assert from 'node:assert/strict'
import test from 'node:test'
import fs from 'node:fs'
import { privateMeshDescriptorValid } from '../src/spatial/captured-reality/capturedRealityHybridDelivery.ts'

const identity=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]
const splat='a'.repeat(64),mesh='b'.repeat(64),deliveryId='c'.repeat(64)
const expected={assetId:'private-test',accessMode:'proof',deviceTier:'desktop',projectId:'urai-4dc1d',splatSha256:splat}
const description={
  ...expected,available:true,requiresAuthorization:true,meshSha256:mesh,meshByteLength:1024,
  meshStorageGeneration:'123',expiresAt:new Date(Date.now()+5*60_000).toISOString(),
  url:`https://us-central1-urai-4dc1d.cloudfunctions.net/streamCapturedRealityMesh?assetId=private-test&deviceTier=desktop&accessMode=proof&deliveryId=${deliveryId}`,
  registration:{schemaVersion:'urai-hybrid-registration-1',splatSha256:splat,meshSha256:mesh,
    splatToWorld:identity,meshToWorld:identity,sourceFrame:'right-handed-y-up',
    admission:'technical-proof',alignmentReviewed:true,metricScaleReviewed:false},
}
test('private mesh transport accepts only matching owner project, scene, and immutable bytes',()=>{
  assert.equal(privateMeshDescriptorValid(description,expected),true)
  assert.equal(privateMeshDescriptorValid({...description,meshSha256:'d'.repeat(64)},expected),false)
  assert.equal(privateMeshDescriptorValid({...description,url:description.url.replace('urai-4dc1d.cloudfunctions.net','attacker.example')},expected),false)
  assert.equal(privateMeshDescriptorValid({...description,url:description.url+'&redirect=https://evil.example'},expected),false)
  assert.equal(privateMeshDescriptorValid({...description,meshByteLength:25*1024*1024},expected),false)
  assert.equal(privateMeshDescriptorValid({...description,expiresAt:new Date(Date.now()-1000).toISOString()},expected),false)
  assert.equal(privateMeshDescriptorValid({...description,registration:{...description.registration,alignmentReviewed:false}},expected),false)
})
test('backend still checks current owner, consent, generation and source before every streamed chunk',()=>{
  const backend=fs.readFileSync(new URL('../../apps/functions/src/capturedReality.ts',import.meta.url),'utf8')
  assert.match(backend,/export const getCapturedRealityMeshUrl/)
  assert.match(backend,/export const streamCapturedRealityMesh/)
  assert.match(backend,/await readRuntimeAuthority\(tx,uid,data\)/)
  assert.match(backend,/await current\(\)/)
  assert.match(backend,/sha256/)
  assert.match(backend,/PRIVATE_CAPTURE_PREFIX/)
  assert.match(backend,/CAPTURED_REALITY_MESH_REVIEW_MISSING/)
})
test('same-scene consumer requests owner-only mesh authority after Gaussian approval',()=>{
  const source=fs.readFileSync(new URL('../src/app/spatial/captured-reality/CapturedRealityRouteClient.tsx',import.meta.url),'utf8')
  assert.match(source,/getCapturedRealityMeshUrl/)
  assert.match(source,/fetchPrivateHybridMesh\(descriptor,requestHeaders,abort.signal\)/)
  assert.match(source,/hybridMesh=\{memoryEntryActive \? hybridMesh : null\}/)
  assert.match(source,/setHybridMesh\(null\)/)
})

test('optional mesh-disabled state is explicit and cannot mask consent or artifact errors',()=>{
  const backend=fs.readFileSync(new URL('../../apps/functions/src/capturedReality.ts',import.meta.url),'utf8')
  const route=fs.readFileSync(new URL('../src/app/spatial/captured-reality/CapturedRealityRouteClient.tsx',import.meta.url),'utf8')
  assert.match(backend,/URAI_ENABLE_CAPTURED_REALITY_MESH !== 'true'/)
  assert.match(backend,/return \{ available: false as const \}/)
  assert.match(backend,/const splat = await readRuntimeAuthority\(tx, owner\.uid, data \?\? \{\}\)/)
  assert.match(route,/meshResult\.data\.available === false/)
  assert.match(route,/if \(!message\.includes\('CAPTURED_REALITY_MESH_DISABLED'\)\) throw error/)
})
