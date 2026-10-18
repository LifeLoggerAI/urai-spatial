#!/usr/bin/env node
// Byte-verified read-only inspection of the ORIGINAL Council V4 body GLB.
// No upload of model bytes, private Founder input or production promotion.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs'
import {dirname,basename} from 'node:path'
import {createHash} from 'node:crypto'
const [sourcePath,receiptPath,outPath]=process.argv.slice(2)
if(!sourcePath||!receiptPath||!outPath)throw Error('usage: inspect-council-v4-glb original.glb verified-receipt.json out.json')
const body=readFileSync(sourcePath),manifest=JSON.parse(readFileSync(receiptPath,'utf8'))
const sha=createHash('sha256').update(body).digest('hex')
if(body.length!==manifest.bytes||sha!==manifest.sha256)throw Error('original-body-binary-not-identical-to-admitted-candidate-receipt')
if(body.length<28||body.toString('ascii',0,4)!=='glTF'||body.readUInt32LE(4)!==2||body.readUInt32LE(8)!==body.length)throw Error('invalid-original-glb')
let offset=12,doc=null,bin=null
while(offset+8<=body.length){const n=body.readUInt32LE(offset),kind=body.readUInt32LE(offset+4);if(offset+8+n>body.length)throw Error('truncated-original-glb-chunk');if(kind===0x4e4f534a)doc=JSON.parse(body.subarray(offset+8,offset+8+n).toString('utf8').trim());if(kind===0x004e4942)bin=body.subarray(offset+8,offset+8+n);offset+=8+n}
if(!doc||!bin)throw Error('missing-original-glb-json-or-bin')
const nodes=doc.nodes||[],skins=doc.skins||[],meshes=doc.meshes||[],animations=doc.animations||[],accessors=doc.accessors||[],views=doc.bufferViews||[]
const parents=new Map()
for(let i=0;i<nodes.length;i++)for(const child of nodes[i].children||[]){if(!nodes[child]||parents.has(child))throw Error('invalid-joint-parentage');parents.set(child,i)}
function ancestry(id){const x=[],seen=new Set();while(id!==undefined){if(seen.has(id)||!nodes[id])throw Error('invalid-joint-hierarchy');seen.add(id);x.push({nodeId:id,name:nodes[id].name||'unnamed',translation:nodes[id].translation||null,rotation:nodes[id].rotation||null});id=parents.get(id)}return x}
const cols={SCALAR:1,VEC2:2,VEC3:3,VEC4:4,MAT4:16},sizes={5120:1,5121:1,5122:2,5123:2,5125:4,5126:4}
function accessor(id,limit=200000){
 const a=accessors[id];if(!a||a.sparse||!Number.isInteger(a.bufferView)||a.count>limit)throw Error('unsupported-accessor:'+id)
 const v=views[a.bufferView],col=cols[a.type],size=sizes[a.componentType];if(!v||!col||!size)throw Error('invalid-accessor-layout')
 const first=(v.byteOffset||0)+(a.byteOffset||0),stride=v.byteStride||col*size
 if(stride<col*size||first<0||first+(a.count-1)*stride+col*size>bin.length)throw Error('accessor-outside-original-bin')
 const rows=[]
 for(let i=0;i<a.count;i++){const row=[];for(let k=0;k<col;k++){const p=first+i*stride+k*size;let value
 switch(a.componentType){case 5120:value=bin.readInt8(p);break;case 5121:value=bin.readUInt8(p);break;case 5122:value=bin.readInt16LE(p);break;case 5123:value=bin.readUInt16LE(p);break;case 5125:value=bin.readUInt32LE(p);break;case 5126:value=bin.readFloatLE(p);break;default:throw Error('unsupported-component')}
 if(a.normalized&&a.componentType!==5126){const divisor={5120:127,5121:255,5122:32767,5123:65535,5125:4294967295}[a.componentType];value=Math.max(-1,value/divisor)}row.push(value)}rows.push(row)}
 return rows
}
const skeletons=skins.map((skin,skinIndex)=>{
 const joints=(skin.joints||[]).map((id,index)=>({index,id,name:nodes[id]?.name||'missing'}))
 const bindings=skin.inverseBindMatrices===undefined?null:accessor(skin.inverseBindMatrices,300)
 return {skinIndex,joints,rootNode:skin.skeleton??null,headAndNeck:joints.filter(j=>/head|neck|jaw|face|eye/i.test(j.name)).map(j=>({...j,ancestry:ancestry(j.id),inverseBindMatrix:bindings?.[j.index]||null}))}
})
const primitives=[];let triangles=0,morphTargets=0
for(let i=0;i<nodes.length;i++){
 const node=nodes[i];if(node.mesh===undefined)continue;const mesh=meshes[node.mesh];if(!mesh)throw Error('referenced-mesh-missing')
 for(const primitive of mesh.primitives||[]){
  const attrs=primitive.attributes||{},positions=Number.isInteger(attrs.POSITION)?accessor(attrs.POSITION):[],indices=primitive.indices===undefined?positions.length:accessors[primitive.indices]?.count||0
  const tris=(primitive.mode??4)===4?Math.floor(indices/3):0;triangles+=tris;morphTargets+=(primitive.targets||[]).length
  let headVertices=0,headDominantVertices=0,headSurfaceBounds=null
  const sk=skeletons[node.skin]
  if(sk&&Number.isInteger(attrs.JOINTS_0)&&Number.isInteger(attrs.WEIGHTS_0)){
   const joints=accessor(attrs.JOINTS_0),weights=accessor(attrs.WEIGHTS_0),selected=sk.joints.filter(j=>/head|neck|jaw/i.test(j.name)).map(j=>j.index)
   if(joints.length!==positions.length||weights.length!==positions.length)throw Error('skin-attributes-not-vertex-aligned')
   const min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity]
   for(let v=0;v<positions.length;v++){
    const influence=joints[v].reduce((sum,id,k)=>sum+(selected.includes(id)?weights[v][k]||0:0),0)
    if(influence>0.0001)headVertices++
    if(influence>=0.5){headDominantVertices++;for(let q=0;q<3;q++){min[q]=Math.min(min[q],positions[v][q]);max[q]=Math.max(max[q],positions[v][q])}}
   }
   if(headDominantVertices)headSurfaceBounds={min,max}
  }
  primitives.push({nodeId:i,nodeName:node.name||null,meshName:mesh.name||null,skin:node.skin??null,triangles:tris,vertices:positions.length,morphTargets:(primitive.targets||[]).length,attributes:Object.keys(attrs).sort(),headInfluencedVertices:headVertices,headDominantVertices,headSurfaceBounds})
 }
}
const clips=animations.map(a=>{let duration=0;const targets=(a.channels||[]).map(c=>{const s=a.samplers?.[c.sampler];if(s?.input!==undefined){const keys=accessor(s.input,60000);if(keys.length)duration=Math.max(duration,keys.at(-1)[0])}return {node:nodes[c.target?.node]?.name||null,path:c.target?.path||null}});return {name:a.name||'unnamed',durationSeconds:duration,targets}})
const headNodes=nodes.map((n,i)=>({nodeId:i,name:n.name||''})).filter(n=>/head|neck|jaw|eye|hair|face/i.test(n.name)).map(n=>({...n,ancestry:ancestry(n.nodeId)}))
const validations={originalSHAandLengthVerified:true,trianglesAgreeWithReceipt:triangles===manifest.measured?.triangleCount,realSkin:skins.some(s=>(s.joints||[]).length>=15),headNeckBones:headNodes.some(n=>/head/i.test(n.name))&&headNodes.some(n=>/neck/i.test(n.name)),headSurfaceHasSkinInfluence:primitives.some(p=>p.headDominantVertices>0),facialMorphTargetsPresent:morphTargets>0}
const output={schema:'urai.original-council-v4.real-binary-inspection.v1',classification:'BODY_CANDIDATE_INPUT_ONLY_NOT_PRODUCTION_ADMITTED',source:{file:basename(sourcePath),sha256:sha,bytes:body.length,originalGitBlob:'9f95ef6d67ecd1585612a049e857d48f1cb0d5bd',sourceReceiptId:manifest.id},counts:{nodes:nodes.length,meshes:meshes.length,skins:skins.length,materials:doc.materials?.length||0,triangles,morphTargets,animations:animations.length},headNodes,skeletons,primitives,clips,validations,extensionsUsed:doc.extensionsUsed||[],requiresMaterialAndHumanReview:true,canClaimUnifiedTalkingCharacter:false,usesPrivateFounderData:false}
mkdirSync(dirname(outPath),{recursive:true});writeFileSync(outPath,JSON.stringify(output,null,2)+'\n')
console.log(JSON.stringify({classification:output.classification,source:output.source,counts:output.counts,validations,clipNames:clips.map(c=>c.name)}))
if(!validations.trianglesAgreeWithReceipt||!validations.realSkin)process.exitCode=2
