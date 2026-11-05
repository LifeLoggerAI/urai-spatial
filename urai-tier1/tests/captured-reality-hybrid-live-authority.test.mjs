import assert from 'node:assert/strict'
import test from 'node:test'
import fs from 'node:fs'
import { privateHybridMeshLiveAuthority } from '../src/spatial/captured-reality/capturedRealityHybridLiveAuthority.ts'

const digest='a'.repeat(64),splat='b'.repeat(64)
const identity=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]
const owner='synthetic-owner'
const assetId='technical-private-mesh'
const descriptor={available:true,assetId,deviceTier:'desktop',accessMode:'proof',
 meshSha256:digest,splatSha256:splat,meshStorageGeneration:'18',
 registration:{schemaVersion:'urai-hybrid-registration-1',splatSha256:splat,meshSha256:digest,
 splatToWorld:identity,meshToWorld:identity,sourceFrame:'right-handed-y-up',
 admission:'technical-proof',alignmentReviewed:true,metricScaleReviewed:false}}
const sourceHash='c'.repeat(64)
const authority={ownerId:owner,state:'proof-ready',releaseState:'private-pilot',
 proofState:'technical-preview',proofIntegrityVerified:true,proofPrivacyReviewed:true,
 meshProofIntegrityVerified:true,meshProofPrivacyReviewed:true,
 sourceManifestSha256:sourceHash,proofApprovedMeshSourceManifestSha256:sourceHash,
 meshSha256:digest,proofApprovedMeshSha256:digest,
 proofApprovedMeshStorageGeneration:'18',
 meshRuntimeObject:`private-captured-reality/${owner}/${assetId}/runtime/mesh/${digest}.glb`,
 meshRegistration:descriptor.registration}
const snapshot=(values)=>({exists:()=>true,get:key=>values[key]})
test('live mesh identity remains bound to current exact owner, source and immutable storage object',()=>{
 assert.equal(privateHybridMeshLiveAuthority(snapshot(authority),owner,descriptor),true)
 for(const patch of [
  {ownerId:'other-owner'},{revocationState:'revoked'},
  {sourceManifestSha256:'d'.repeat(64)},{proofApprovedMeshSourceManifestSha256:'d'.repeat(64)},
  {meshSha256:'d'.repeat(64)},{proofApprovedMeshSha256:'d'.repeat(64)},
  {proofApprovedMeshStorageGeneration:'19'},
  {meshRuntimeObject:'private-captured-reality/other-owner/mesh'},
  {meshProofPrivacyReviewed:false},{proofPrivacyReviewed:false},
  {meshRegistration:{...descriptor.registration,meshToWorld:[...identity.slice(0,12),1,0,0,1]}},
  {state:'revoked'},
 ]){
   assert.equal(privateHybridMeshLiveAuthority(snapshot({...authority,...patch}),owner,descriptor),false,JSON.stringify(patch))
 }
 assert.equal(privateHybridMeshLiveAuthority(null,owner,descriptor),false)
})
test('live revocation is wired to actual in-world geometry disposal',()=>{
 const route=fs.readFileSync(new URL('../src/app/spatial/captured-reality/CapturedRealityRouteClient.tsx',import.meta.url),'utf8')
 assert.match(route,/meshDescriptorRef\.current = descriptor/)
 assert.match(route,/privateHybridMeshLiveAuthority\(snapshot, user.uid, meshDescriptorRef.current\)/)
 assert.match(route,/stopForPrivacy\('Captured Reality closed because the private mesh authority changed\.'\)/)
 assert.match(route,/setHybridMesh\(null\)/)
})
