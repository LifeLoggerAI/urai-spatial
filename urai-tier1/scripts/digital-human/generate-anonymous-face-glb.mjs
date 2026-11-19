#!/usr/bin/env node
// Anonymous 3D facial calibration. No person, source media, or provider audio.
import fs from 'node:fs'
import path from 'node:path'
import { createHash } from 'node:crypto'
export const CHANNELS = ['jawOpen','AA','EE','OO','PP','blinkLeft','blinkRight','browInnerUp','mouthSmileLeft','mouthSmileRight']
const masks = Array(CHANNELS.length).fill(0)
const geometries = []
function gaussian(v, c, s) { return Math.exp(-.5 * ((v-c)/s)**2) }
function influence(channel, x, y, z, isFront=true) {
  if (!isFront || z < .12) return [0,0,0]
  const mouth = gaussian(y,1.515,.082)*gaussian(x,0,.115)
  const jaw = gaussian(y,1.435,.095)*gaussian(x,0,.16)
  const eyeL = gaussian(x,-.09,.045)*gaussian(y,1.706,.034)
  const eyeR = gaussian(x,.09,.045)*gaussian(y,1.706,.034)
  if (channel==='jawOpen') return [0,-.095*jaw,.025*mouth]
  if (channel==='AA') return [0,-.075*jaw,.018*mouth]
  if (channel==='EE') return [(x<0?-1:1)*.03*mouth,-.018*mouth,0]
  if (channel==='OO') return [-x*.19*mouth,-.03*mouth,.042*mouth]
  if (channel==='PP') return [0,.012*mouth,-.014*mouth]
  if (channel==='blinkLeft') return [0,(y>1.706?-.018:.018)*eyeL,0]
  if (channel==='blinkRight') return [0,(y>1.706?-.018:.018)*eyeR,0]
  if (channel==='browInnerUp') return [0,.024*gaussian(y,1.755,.043)*gaussian(x,0,.11),0]
  if (channel==='mouthSmileLeft') return [0,.024*mouth*gaussian(x,-.09,.065),0]
  if (channel==='mouthSmileRight') return [0,.024*mouth*gaussian(x,.09,.065),0]
  return [0,0,0]
}
function ellipsoid(name, center, radii, material, {morph=false, segments=48, rings=28, deform=null}={}) {
  const p=[], n=[], idx=[], targets=CHANNELS.map(()=>[])
  for(let j=0;j<=rings;j++) {
    const theta=Math.PI*j/rings
    for(let i=0;i<=segments;i++) {
      const phi=2*Math.PI*i/segments, st=Math.sin(theta)
      const sx=st*Math.cos(phi), sy=Math.cos(theta), sz=st*Math.sin(phi)
      const [cx,cy,cz]=center,[rx,ry,rz]=radii
      const x=cx+rx*sx,y=cy+ry*sy,z=cz+rz*sz
      p.push(x,y,z)
      const l=Math.hypot(sx/rx,sy/ry,sz/rz)||1
      n.push((sx/rx)/l,(sy/ry)/l,(sz/rz)/l)
      if(morph) for(let k=0;k<CHANNELS.length;k++) {
        const delta=deform?deform(CHANNELS[k],{sx,sy,sz,x,y,z,cx,cy,cz,rx,ry,rz}):influence(CHANNELS[k],x,y,z,sz>0)
        targets[k].push(...delta)
      }
    }
  }
  for(let j=0;j<rings;j++)for(let i=0;i<segments;i++) {
    const a=j*(segments+1)+i,b=a+segments+1
    idx.push(a,b,a+1, b,b+1,a+1)
  }
  geometries.push({name,p,n,idx,material,targets:morph?targets:null})
}
const materialColors=[
  [0.64,0.43,0.33,1],
  [0.075,0.055,0.06,1],
  [0.06,0.16,0.22,1],
  [0.81,0.76,0.67,1],
  [0.027,0.037,0.039,1],
  [0.19,0.038,0.048,1],
  [0.50,0.23,0.25,1],
]
ellipsoid('head_morphable',[0,1.63,0],[.235,.294,.211],0,{morph:true,segments:72,rings:44})
ellipsoid('nose_technical',[0,1.61,.209],[.030,.048,.044],0)
ellipsoid('chin_technical',[0,1.395,.088],[.105,.054,.115],0)
const mouth=(ch,{sx,sy,cx,cy,cz})=>{
 const open=(ch==='jawOpen'?.048:ch==='AA'?.045:ch==='OO'?.034:ch==='EE'?.017:0)
 const dy=sy*open
 const dx=ch==='EE'?sx*.03:ch==='OO'?-sx*.017:0
 const dz=ch==='OO'?.024:0
 return [dx,dy,dz]
}
ellipsoid('mouth_cavity_morphable',[0,1.505,.236],[.072,.006,.009],5,{morph:true,segments:48,rings:12,deform:mouth})
for(const sign of [1,-1]) {
 const lip=(ch,{sx,sy})=>{
   const open=ch==='jawOpen'?.044:ch==='AA'?.04:ch==='OO'?.028:ch==='EE'?.013:0
   const dY=sign*open + (ch.startsWith('mouthSmile')?.012:0)
   const dX=ch==='EE'?sx*.025:ch==='OO'?-sx*.02:0
   return [dX,dY,ch==='OO'?.016:0]
 }
 ellipsoid(sign===1?'upper_lip_morphable':'lower_lip_morphable',[0,1.505+sign*.012,.245],[.085,.012,.012],6,{morph:true,segments:48,rings:12,deform:lip})
}
for(const side of [-1,1]) {
 const eyeDeform=(ch,{sy})=> (ch===(side<0?'blinkLeft':'blinkRight')?[0,-sy*.029,0]:[0,0,0])
 ellipsoid(side<0?'eye_left_morphable':'eye_right_morphable',[side*.092,1.708,.188],[.049,.032,.020],3,{morph:true,segments:32,rings:16,deform:eyeDeform})
 ellipsoid(side<0?'pupil_left':'pupil_right',[side*.093,1.709,.211],[.016,.020,.009],4,{segments:28,rings:14})
 ellipsoid(side<0?'brow_left':'brow_right',[side*.09,1.766,.18],[.065,.010,.018],1,{segments:28,rings:14})
}
ellipsoid('hair_synthetic',[0,1.84,-.056],[.24,.145,.198],1)
ellipsoid('neck',[0,1.300,0],[.087,.130,.089],0)
ellipsoid('shirt_body',[0,1.01,0],[.335,.355,.18],2)
ellipsoid('shirt_collar',[0,1.279,.06],[.123,.032,.110],2)
function pad4(v) { return (v+3)&~3 }
const buffers=[], views=[], accessors=[], nodes=[], meshes=[]
let byteLength=0
function addBuffer(typed,target) {
 const data=Buffer.from(typed.buffer,typed.byteOffset,typed.byteLength)
 const offset=byteLength
 buffers.push(data,Buffer.alloc(pad4(data.length)-data.length))
 byteLength+=pad4(data.length)
 const v={buffer:0,byteOffset:offset,byteLength:data.length}
 if(target)v.target=target
 views.push(v)
 return views.length-1
}
function addAccessor(array,type,componentType,target,limits=false) {
 const typed=componentType===5123?Uint16Array.from(array):Float32Array.from(array)
 const bv=addBuffer(typed,target)
 const components=type==='VEC3'?3:1
 const o={bufferView:bv,componentType,count:array.length/components,type}
 if(limits){for(const prop of ['min','max'])o[prop]=Array.from({length:components},(_,i)=>{
   let value=prop==='min'?Infinity:-Infinity
   for(let j=i;j<array.length;j+=components) value=prop==='min'?Math.min(value,array[j]):Math.max(value,array[j])
   return value
 })}
 accessors.push(o);return accessors.length-1
}
for(const g of geometries) {
 if(g.p.length/3>65535)throw Error('index-limit-exceeded')
 const attributes={POSITION:addAccessor(g.p,'VEC3',5126,34962,true),NORMAL:addAccessor(g.n,'VEC3',5126,34962)}
 const indices=addAccessor(g.idx,'SCALAR',5123,34963)
 const prim={attributes,indices,material:g.material,mode:4}
 if(g.targets)prim.targets=g.targets.map(t=>({POSITION:addAccessor(t,'VEC3',5126,34962)}))
 const mesh={name:g.name,primitives:[prim]}
 if(g.targets){mesh.weights=Array(CHANNELS.length).fill(0);mesh.extras={targetNames:CHANNELS}}
 meshes.push(mesh);nodes.push({name:g.name,mesh:meshes.length-1})
}
const gltf={asset:{version:'2.0',generator:'UrAi Wave6 anonymous morph calibration generator'},
  scene:0,scenes:[{name:'anonymous-technical-face',nodes:nodes.map((_,i)=>i)}],nodes,meshes,bufferViews:views,accessors,
  materials:materialColors.map((color,i)=>({name:['synthetic_skin','synthetic_hair','lab_cloth','eye_surface','eye_dark','mouth_interior','synthetic_lip'][i],pbrMetallicRoughness:{baseColorFactor:color,roughnessFactor:i===3?.28:.88,metallicFactor:0},doubleSided:true})),
  buffers:[{byteLength}],extras:{classification:'ANONYMOUS_NON_IDENTITY_TECHNICAL_FIXTURE_NOT_ADAM_NOT_SPEECH',providerAuthority:false,sourcePhotoInputs:0,approvedLikeness:false,phonemeSync:false,channels:CHANNELS}}
const jsonBuffer=Buffer.from(JSON.stringify(gltf),'utf8')
const jsonPadded=Buffer.concat([jsonBuffer,Buffer.alloc(pad4(jsonBuffer.length)-jsonBuffer.length,32)])
const binary=Buffer.concat(buffers)
const size=12+8+jsonPadded.length+8+binary.length
const header=Buffer.alloc(20);header.write('glTF',0,'ascii');header.writeUInt32LE(2,4);header.writeUInt32LE(size,8);header.writeUInt32LE(jsonPadded.length,12);header.writeUInt32LE(0x4e4f534a,16)
const binHeader=Buffer.alloc(8);binHeader.writeUInt32LE(binary.length,0);binHeader.writeUInt32LE(0x004e4942,4)
const glb=Buffer.concat([header,jsonPadded,binHeader,binary])
const out=process.argv[2]||'anonymous-face-morph-v1.glb'
fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,glb)
const summary={classification:gltf.extras.classification,sha256:createHash('sha256').update(glb).digest('hex'),bytes:glb.length,meshes:meshes.length,morphableMeshes:meshes.filter(m=>m.weights).length,channels:CHANNELS,sourcePhotos:0,approvedFounderLikeness:false}
console.log(JSON.stringify(summary))
