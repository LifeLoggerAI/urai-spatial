import test from 'node:test'
import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import {deriveUnifiedCouncilFace,CHANNELS} from '../scripts/digital-human/derive-council-v4-unified-face.mjs'
const sha256=b=>createHash('sha256').update(b).digest('hex')
const aligned=n=>(n+3)&~3
function fixture({frontFacing=true}={}){
 const positions=[],normals=[],joints=[],weights=[]
 for(let a=0;a<40;a++)for(let b=0;b<24;b++){
  const x=(a/39-.5)*.47,y=1.449+b/23*.391
  const z=(frontFacing?1:-1)*(.065-.09*(x/.235)**2-.03*((y-1.65)/.2)**2)
  positions.push(x,y,z);normals.push(0,0,frontFacing?1:-1)
  joints.push(4,0,0,0);weights.push(1,0,0,0)
 }
 const f32=a=>{const b=Buffer.alloc(a.length*4);a.forEach((v,i)=>b.writeFloatLE(v,i*4));return b}
 const u16=a=>{const b=Buffer.alloc(a.length*2);a.forEach((v,i)=>b.writeUInt16LE(v,i*2));return b}
 const indices=Array.from({length:positions.length/3},(_,i)=>i)
 const parts=[f32(positions),u16(joints),f32(weights),f32(normals),u16(indices)]
 const chunks=[],views=[];let offset=0
 for(const part of parts){const pad=Buffer.alloc(aligned(offset)-offset);if(pad.length){chunks.push(pad);offset+=pad.length}views.push({buffer:0,byteOffset:offset,byteLength:part.length});chunks.push(part);offset+=part.length}
 const bin=Buffer.concat(chunks)
 const nodes=[{name:'guide-root',children:[1,18]}]
 for(let i=1;i<=17;i++)nodes.push({name:['hips','spine','chest','neck','head','L_shoulder','L_elbow','L_wrist','R_shoulder','R_elbow','R_wrist','L_hip','L_knee','L_ankle','R_hip','R_knee','R_ankle'][i-1],children:i<5?[i+1]:[]})
 nodes.push({name:'guide-body',mesh:0,skin:0})
 const doc={asset:{version:'2.0'},buffers:[{byteLength:bin.length}],bufferViews:views,accessors:[{bufferView:0,componentType:5126,count:positions.length/3,type:'VEC3'},{bufferView:1,componentType:5123,count:positions.length/3,type:'VEC4'},{bufferView:2,componentType:5126,count:positions.length/3,type:'VEC4'},{bufferView:3,componentType:5126,count:positions.length/3,type:'VEC3'},{bufferView:4,componentType:5123,count:positions.length/3,type:'SCALAR'}],nodes,meshes:[{name:'guide-body',primitives:Array.from({length:4},(_,i)=>({attributes:{POSITION:0,NORMAL:3,JOINTS_0:1,WEIGHTS_0:2},indices:4,material:i}))}],skins:[{joints:Array.from({length:17},(_,i)=>i+1),skeleton:1}],materials:Array.from({length:4},(_,i)=>({name:i===0?'skin':'material'+i})),animations:['idle_breath','listen_acknowledge','speak_calm','gesture_open','gaze_shift'].map(name=>({name,channels:[],samplers:[]})),scenes:[{nodes:[0]}],scene:0}
 const text=Buffer.from(JSON.stringify(doc)),json=Buffer.alloc(aligned(text.length),32);text.copy(json)
 const out=Buffer.alloc(12+8+json.length+8+bin.length);out.write('glTF');out.writeUInt32LE(2,4);out.writeUInt32LE(out.length,8);out.writeUInt32LE(json.length,12);out.writeUInt32LE(0x4e4f534a,16);json.copy(out,20)
 const at=20+json.length;out.writeUInt32LE(bin.length,at);out.writeUInt32LE(0x004e4942,at+4);bin.copy(out,at+8)
 return {out,manifest:{sha256:sha256(out),bytes:out.length}}
}
test('preserves the original one-skinned-mesh 17-joint five-clip model',()=>{
 const {out,manifest}=fixture(),value=deriveUnifiedCouncilFace(out,manifest)
 assert.ok(value.bytes.length>out.length)
 assert.equal(value.receipt.oneExistingSkinnedMesh,true)
 assert.equal(value.receipt.originalJoints,17)
 assert.equal(value.receipt.originalClips,5)
 assert.equal(value.receipt.originalMaterialPrimitives,4)
 assert.deepEqual(value.receipt.derivedMorphChannels,CHANNELS)
 assert.ok(value.receipt.channelStats.every(x=>x.movedVertices>8&&x.maxDeltaMeters<.075))
 assert.equal(value.receipt.approvedForProduction,false)
 assert.equal(value.receipt.anteriorDirection,'+Z')
 assert.ok(value.receipt.anteriorEvidence.anteriorNormalCount>200)
 assert.equal(value.receipt.anteriorEvidence.posteriorNormalCount,0)
 assert.equal(sha256(out),manifest.sha256)
})
test('rejects altered source bytes',()=>{
 const {out,manifest}=fixture(),bad=Buffer.from(out);bad[40]^=1
 assert.throws(()=>deriveUnifiedCouncilFace(bad,manifest),/unaltered-original-model/)
})
test('morphs attach to the same GLTF mesh instead of an overlapping head',()=>{
 const {out,manifest}=fixture(),value=deriveUnifiedCouncilFace(out,manifest)
 const b=value.bytes,json=JSON.parse(b.subarray(20,20+b.readUInt32LE(12)).toString('utf8').trim())
 assert.equal(json.meshes.length,1)
 assert.equal(json.meshes[0].primitives.length,4)
 assert.ok(json.meshes[0].primitives.every(p=>p.targets.length===CHANNELS.length))
 assert.equal(json.skins[0].joints.length,17)
 assert.deepEqual(json.meshes[0].extras.targetNames,CHANNELS)
})
test('rejects back-facing substitute instead of declaring a false anatomical front',()=>{
 const {out,manifest}=fixture({frontFacing:false})
 assert.throws(()=>deriveUnifiedCouncilFace(out,manifest),/original-guide-front-anatomy-not-verified/)
})
