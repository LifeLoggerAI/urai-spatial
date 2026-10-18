#!/usr/bin/env node
// Nonrelease morph prototype derived from the original Council v4 skinned body.
// No extra mesh, private likeness, character voice, or production admission.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs'
import {dirname} from 'node:path'
import {createHash} from 'node:crypto'

export const CHANNELS=Object.freeze(['jawOpen','AA','EE','OO','PP','blinkLeft','blinkRight','browInnerUp','mouthSmileLeft','mouthSmileRight'])
const sha256=x=>createHash('sha256').update(x).digest('hex')
const gaussian=(x,c,s)=>Math.exp(-.5*((x-c)/s)**2)
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x))
const align4=n=>(n+3)&~3
function parseGlb(bytes){
 const b=Buffer.from(bytes)
 if(b.length<20||b.toString('ascii',0,4)!=='glTF'||b.readUInt32LE(4)!==2||b.readUInt32LE(8)!==b.length)throw Error('unverified-glb-container')
 let offset=12,doc,bin
 while(offset+8<=b.length){const n=b.readUInt32LE(offset),k=b.readUInt32LE(offset+4);if(n<1||offset+8+n>b.length)throw Error('glb-bounds');if(k===0x4e4f534a)doc=JSON.parse(b.toString('utf8',offset+8,offset+8+n).trim());if(k===0x004e4942)bin=b.subarray(offset+8,offset+8+n);offset+=8+n}
 if(!doc||!bin||offset!==b.length)throw Error('glb-json-bin-absent')
 return {doc,bin}
}
function encodeGlb(doc,bin){
 const json=Buffer.from(JSON.stringify(doc)),jp=Buffer.alloc(align4(json.length),32);json.copy(jp)
 const bp=Buffer.alloc(align4(bin.length));bin.copy(bp)
 const out=Buffer.alloc(12+8+jp.length+8+bp.length)
 out.write('glTF',0);out.writeUInt32LE(2,4);out.writeUInt32LE(out.length,8)
 out.writeUInt32LE(jp.length,12);out.writeUInt32LE(0x4e4f534a,16);jp.copy(out,20)
 const at=20+jp.length;out.writeUInt32LE(bp.length,at);out.writeUInt32LE(0x004e4942,at+4);bp.copy(out,at+8)
 return out
}
function reader(doc,bin,id){
 const a=doc.accessors?.[id],v=doc.bufferViews?.[a?.bufferView]
 if(!a||!v||a.sparse)throw Error('requires-nonsparse-original-accessor:'+id)
 const comp={5121:1,5123:2,5125:4,5126:4}[a.componentType],width={SCALAR:1,VEC2:2,VEC3:3,VEC4:4,MAT4:16}[a.type]
 if(!comp||!width)throw Error('unsupported-original-attribute')
 const stride=v.byteStride||comp*width,base=(v.byteOffset||0)+(a.byteOffset||0)
 if(a.count<1||a.count>150000||stride<comp*width||base+(a.count-1)*stride+comp*width>bin.length)throw Error('original-accessor-out-of-bounds')
 const view=new DataView(bin.buffer,bin.byteOffset,bin.byteLength)
 function read(i,j){const off=base+i*stride+j*comp;let n
 if(a.componentType===5121)n=view.getUint8(off);else if(a.componentType===5123)n=view.getUint16(off,true);else if(a.componentType===5125)n=view.getUint32(off,true);else n=view.getFloat32(off,true)
 if(a.normalized && a.componentType!==5126)n/=({5121:255,5123:65535,5125:4294967295})[a.componentType]
 return n}
 return {a,width,read}
}
export function deriveUnifiedCouncilFace(originalBytes,manifest){
 const original=Buffer.from(originalBytes),actualSha=sha256(original)
 if(actualSha!==manifest.sha256||original.length!==manifest.bytes)throw Error('unaltered-original-model-sha-and-size-required')
 const {doc,bin}=parseGlb(original)
 if((doc.skins||[]).length!==1||(doc.animations||[]).length!==5||(doc.meshes||[]).length!==1)throw Error('unknown-original-council-v4-structure')
 const skin=doc.skins[0],mesh=doc.meshes[0],nodes=doc.nodes||[]
 if(!Array.isArray(skin.joints)||skin.joints.length!==17||!Array.isArray(mesh.primitives)||mesh.primitives.length!==4)throw Error('expected-original-17-joint-four-material-human')
 const names=skin.joints.map(n=>nodes[n]?.name)
 const headJoint=names.indexOf('head'),neckJoint=names.indexOf('neck')
 if(headJoint<0||neckJoint<0||!nodes[skin.joints[neckJoint]].children?.includes(skin.joints[headJoint]))throw Error('head-must-be-attached-to-original-neck')
 const bodyNode=nodes.find(n=>n.mesh===0&&n.skin===0)
 if(!bodyNode||mesh.primitives.some(p=>p.targets?.length))throw Error('original-skinned-body-or-zero-morph-assumption-failed')
 const positionsIds=new Set(mesh.primitives.map(p=>p.attributes?.POSITION))
 const jointsIds=new Set(mesh.primitives.map(p=>p.attributes?.JOINTS_0))
 const weightsIds=new Set(mesh.primitives.map(p=>p.attributes?.WEIGHTS_0))
 if(positionsIds.size!==1||jointsIds.size!==1||weightsIds.size!==1)throw Error('material-primitives-not-sharing-one-original-vertex-layout')
 const p=reader(doc,bin,[...positionsIds][0]),j=reader(doc,bin,[...jointsIds][0]),w=reader(doc,bin,[...weightsIds][0])
 if(p.width!==3||j.width!==4||w.width!==4||p.a.count!==j.a.count||p.a.count!==w.a.count)throw Error('invalid-original-body-vertex-skin-layout')
 const anchors=[];let influenced=0
 for(let i=0;i<p.a.count;i++){
  const headWeight=Array.from({length:4},(_,k)=>(j.read(i,k)===headJoint||j.read(i,k)===neckJoint)?w.read(i,k):0).reduce((s,x)=>s+x,0)
  const [x,y,z]=[p.read(i,0),p.read(i,1),p.read(i,2)]
  if(![x,y,z,headWeight].every(Number.isFinite))throw Error('nonfinite-original-vertex-or-skin')
  anchors.push({x,y,z,h:headWeight});if(headWeight>0.0001)influenced++
 }
 const head=anchors.filter(v=>v.h>=.5)
 if(head.length<500||head.length>p.a.count||influenced<head.length)throw Error('insufficient-original-skinned-head-surface')
 const mins=[Infinity,Infinity,Infinity],maxs=[-Infinity,-Infinity,-Infinity]
 for(const v of head){for(const [q,value] of [v.x,v.y,v.z].entries()){mins[q]=Math.min(mins[q],value);maxs[q]=Math.max(maxs[q],value)}}
 const span=maxs[1]-mins[1]
 if(span<.23||span>.65)throw Error('head-height-geometry-outside-supported-candidate-range')
 const forward=Math.abs(mins[2])>Math.abs(maxs[2])?-1:1
 const front=forward<0?mins[2]:maxs[2]
 const mouthY=mins[1]+span*.30,eyesY=mins[1]+span*.70,browY=mins[1]+span*.78
 const seamFloor=mins[1]+span*.19
 const buffers=CHANNELS.map(()=>Buffer.alloc(p.a.count*3*4))
 const stats=CHANNELS.map(name=>({name,movedVertices:0,maxDeltaMeters:0}))
 for(let i=0;i<anchors.length;i++){
  const v=anchors[i]
  // Never deform the neck seam or any non-head-owned body vertices.
  if(v.h<.45||v.y<=seamFloor)continue
  const surface=clamp(1-Math.abs(front-v.z)/.12)
  if(surface<=0)continue
  const lip=gaussian(v.y,mouthY,span*.125)*gaussian(v.x,0,.105)*surface*v.h
  const jaw=gaussian(v.y,mouthY-span*.025,span*.145)*gaussian(v.x,0,.16)*surface*v.h
  const upper=gaussian(v.y,mouthY+span*.045,span*.09)*gaussian(v.x,0,.11)*surface*v.h
  const rightSmile=gaussian(v.y,mouthY+span*.025,span*.13)*gaussian(v.x,.105,.065)*surface*v.h
  const leftSmile=gaussian(v.y,mouthY+span*.025,span*.13)*gaussian(v.x,-.105,.065)*surface*v.h
  const eyeL=gaussian(v.y,eyesY,span*.08)*gaussian(v.x,-.09,.055)*surface*v.h
  const eyeR=gaussian(v.y,eyesY,span*.08)*gaussian(v.x,.09,.055)*surface*v.h
  const brow=gaussian(v.y,browY,span*.07)*gaussian(v.x,0,.11)*surface*v.h
  const delta=[
   [0,-.044*jaw,-.012*forward*jaw],
   [0,-.018*jaw+.011*upper,-.012*forward*lip],
   [0,.004*lip,forward*.010*lip],
   [-.003*Math.sign(v.x)*lip,-.014*jaw,forward*.017*lip],
   [0,-.004*jaw,-.010*forward*lip],
   [0,-.019*eyeL,0],
   [0,-.019*eyeR,0],
   [0,.014*brow,0],
   [-.013*leftSmile,.013*leftSmile,0],
   [.013*rightSmile,.013*rightSmile,0],
  ]
  for(let q=0;q<CHANNELS.length;q++){
   const d=delta[q],length=Math.hypot(...d)
   if(!d.every(Number.isFinite)||length>.075)throw Error('uncontrolled-original-head-displacement')
   if(length>1e-6){stats[q].movedVertices++;stats[q].maxDeltaMeters=Math.max(stats[q].maxDeltaMeters,length)}
   d.forEach((n,c)=>buffers[q].writeFloatLE(n,i*12+c*4))
  }
 }
 if(stats.some(s=>s.movedVertices<8||s.maxDeltaMeters<=0))throw Error('insufficient-head-surface-for-requested-expression:'+JSON.stringify(stats))
 const binChunks=[bin],accessorIds=[]
 let offset=bin.length
 for(let q=0;q<buffers.length;q++){
  const pad=align4(offset)-offset
  if(pad){binChunks.push(Buffer.alloc(pad));offset+=pad}
  const viewIndex=(doc.bufferViews||[]).length
  doc.bufferViews.push({buffer:0,byteOffset:offset,byteLength:buffers[q].length})
  const accessorIndex=doc.accessors.length
  doc.accessors.push({bufferView:viewIndex,byteOffset:0,componentType:5126,count:p.a.count,type:'VEC3'})
  binChunks.push(buffers[q]);offset+=buffers[q].length;accessorIds.push(accessorIndex)
 }
 const nextBin=Buffer.concat(binChunks)
 doc.buffers[0].byteLength=nextBin.length
 for(const primitive of mesh.primitives)primitive.targets=accessorIds.map(POSITION=>({POSITION}))
 mesh.weights=CHANNELS.map(()=>0)
 mesh.extras={...mesh.extras,targetNames:[...CHANNELS],uraiNonreleaseUnifiedFace:'DERIVED_FROM_ORIGINAL_SKINNED_HEAD_NOT_PRODUCTION_ACCEPTED'}
 const newBytes=encodeGlb(doc,nextBin)
 const check=parseGlb(newBytes)
 if(check.doc.meshes[0].primitives.some(p=>p.targets?.length!==10)||check.doc.skins[0].joints.length!==17||check.doc.animations.length!==5)throw Error('derived-asset-structural-validation-failed')
 return {bytes:newBytes,receipt:{schema:'urai.digital-human.v4-unified-original-mesh-prototype.v1',classification:'ANONYMOUS_DEV_ONLY_NOT_A_BELIEVABLE_HUMAN_NOT_PRODUCTION_APPROVED',sourceSha256:actualSha,derivedSha256:sha256(newBytes),sourceBytes:original.length,derivedBytes:newBytes.length,originalJoints:17,originalClips:5,originalMaterialPrimitives:4,derivedMorphChannels:[...CHANNELS],headBoneNode:skin.joints[headJoint],neckBoneNode:skin.joints[neckJoint],headVertexCount:head.length,influencedHeadVertexCount:influenced,headSurfaceBounds:{min:mins,max:maxs},anteriorDirection:forward<0?'-Z':'+Z',mouthRestY:mouthY,neckSeamFloorY:seamFloor,channelStats:stats,unchangedOriginalSkinAndAnimation:true,oneExistingSkinnedMesh:true,privateFounderDataUsed:false,approvedForProduction:false}}
}
if(process.argv[1]&&process.argv[1].endsWith('derive-council-v4-unified-face.mjs')&&process.argv.length>=6){
 const [source,manifestFile,outFile,receiptFile]=process.argv.slice(2)
 const result=deriveUnifiedCouncilFace(readFileSync(source),JSON.parse(readFileSync(manifestFile,'utf8')))
 mkdirSync(dirname(outFile),{recursive:true});writeFileSync(outFile,result.bytes)
 mkdirSync(dirname(receiptFile),{recursive:true});writeFileSync(receiptFile,JSON.stringify(result.receipt,null,2)+'\n')
 console.log(JSON.stringify(result.receipt))
}