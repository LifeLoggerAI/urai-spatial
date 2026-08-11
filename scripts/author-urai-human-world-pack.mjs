#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'

const root = process.cwd()
const outDir = path.join(root, 'urai-tier1/public/assets/urai/human-world')
const receiptPath = path.join(root, 'operations/assets/generated-receipts/urai-human-world-pack-v1.json')
fs.mkdirSync(outDir, { recursive: true })
fs.mkdirSync(path.dirname(receiptPath), { recursive: true })

const F32 = 5126
const U32 = 5125
const ARRAY_BUFFER = 34962
const ELEMENT_ARRAY_BUFFER = 34963
const align4 = (n) => (n + 3) & ~3

function hexColor(hex, alpha = 1) {
  const h = hex.replace('#', '')
  return [parseInt(h.slice(0,2),16)/255, parseInt(h.slice(2,4),16)/255, parseInt(h.slice(4,6),16)/255, alpha]
}

function computeNormals(positions, indices) {
  const n = new Float32Array(positions.length)
  for (let i = 0; i < indices.length; i += 3) {
    const ia = indices[i] * 3, ib = indices[i+1] * 3, ic = indices[i+2] * 3
    const ax=positions[ia], ay=positions[ia+1], az=positions[ia+2]
    const bx=positions[ib], by=positions[ib+1], bz=positions[ib+2]
    const cx=positions[ic], cy=positions[ic+1], cz=positions[ic+2]
    const abx=bx-ax, aby=by-ay, abz=bz-az
    const acx=cx-ax, acy=cy-ay, acz=cz-az
    const nx=aby*acz-abz*acy, ny=abz*acx-abx*acz, nz=abx*acy-aby*acx
    for (const o of [ia,ib,ic]) { n[o]+=nx; n[o+1]+=ny; n[o+2]+=nz }
  }
  for (let i=0;i<n.length;i+=3) {
    const l=Math.hypot(n[i],n[i+1],n[i+2])||1
    n[i]/=l; n[i+1]/=l; n[i+2]/=l
  }
  return n
}

function mesh(p, idx) {
  const positions=Float32Array.from(p), indices=Uint32Array.from(idx)
  return { positions, indices, normals: computeNormals(positions,indices) }
}

function uvEllipsoid(rx, ry, rz, segments=28, rings=18, phiMax=Math.PI) {
  const p=[]; const idx=[]
  for (let y=0;y<=rings;y++) {
    const v=y/rings, phi=v*phiMax
    const sp=Math.sin(phi), cp=Math.cos(phi)
    for (let x=0;x<=segments;x++) {
      const u=x/segments, th=u*Math.PI*2
      p.push(Math.cos(th)*sp*rx, cp*ry, Math.sin(th)*sp*rz)
    }
  }
  const row=segments+1
  for (let y=0;y<rings;y++) for (let x=0;x<segments;x++) {
    const a=y*row+x,b=a+1,c=a+row,d=c+1
    idx.push(a,c,b,b,c,d)
  }
  return mesh(p,idx)
}

function loft(profile, segments=32) {
  const p=[]; const idx=[]
  for (let j=0;j<profile.length;j++) {
    const [y,rx,rz,cx=0,cz=0]=profile[j]
    for (let i=0;i<segments;i++) {
      const a=i/segments*Math.PI*2
      const organic=1+0.018*Math.sin(a*3+j*0.7)+0.009*Math.sin(a*7-j*.3)
      p.push(cx+Math.cos(a)*rx*organic,y,cz+Math.sin(a)*rz*organic)
    }
  }
  for (let j=0;j<profile.length-1;j++) for (let i=0;i<segments;i++) {
    const k=(i+1)%segments, a=j*segments+i,b=j*segments+k,c=(j+1)*segments+i,d=(j+1)*segments+k
    idx.push(a,c,b,b,c,d)
  }
  const bottom=p.length/3; p.push(profile[0][3]||0,profile[0][0],profile[0][4]||0)
  const top=p.length/3; const last=profile.at(-1); p.push(last[3]||0,last[0],last[4]||0)
  for(let i=0;i<segments;i++){const k=(i+1)%segments;idx.push(bottom,k,i);const a=(profile.length-1)*segments+i,b=(profile.length-1)*segments+k;idx.push(top,a,b)}
  return mesh(p,idx)
}

function box(w,h,d) {
  const x=w/2,y=h/2,z=d/2
  const p=[-x,-y,-z,x,-y,-z,x,y,-z,-x,y,-z,-x,-y,z,x,-y,z,x,y,z,-x,y,z]
  const idx=[0,2,1,0,3,2,4,5,6,4,6,7,0,1,5,0,5,4,3,7,6,3,6,2,1,2,6,1,6,5,0,4,7,0,7,3]
  return mesh(p,idx)
}

function cylinder(r,h,segments=32,r2=r) { return loft([[-h/2,r,r],[h/2,r2,r2]],segments) }
function quatZ(a){return [0,0,Math.sin(a/2),Math.cos(a/2)]}
function quatY(a){return [0,Math.sin(a/2),0,Math.cos(a/2)]}

class GLB {
  constructor(name, extras={}) {
    this.name=name; this.bin=[]; this.binLength=0; this.bufferViews=[]; this.accessors=[]; this.materials=[]; this.meshes=[]; this.nodes=[]; this.animations=[]
    this.root=this.node(name+'-root',{parent:null,extras:{units:'meters',axis:'Y-up',cameraAspect:'5:4',productionClass:'urai-human-world-runtime',...extras}})
  }
  append(arr,target) {
    const pad=align4(this.binLength)-this.binLength
    if(pad){this.bin.push(Buffer.alloc(pad));this.binLength+=pad}
    const b=Buffer.from(arr.buffer,arr.byteOffset,arr.byteLength);const off=this.binLength;this.bin.push(b);this.binLength+=b.length
    const v={buffer:0,byteOffset:off,byteLength:b.length}; if(target)v.target=target;this.bufferViews.push(v);return this.bufferViews.length-1
  }
  accessor(arr,type,component,target) {
    const view=this.append(arr,target);const comp={SCALAR:1,VEC3:3,VEC4:4}[type]
    const a={bufferView:view,componentType:component,count:arr.length/comp,type}
    if(type==='VEC3'){
      const min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity]
      for(let i=0;i<arr.length;i+=3)for(let j=0;j<3;j++){min[j]=Math.min(min[j],arr[i+j]);max[j]=Math.max(max[j],arr[i+j])}
      a.min=min;a.max=max
    } else if(type==='SCALAR'){a.min=[Math.min(...arr)];a.max=[Math.max(...arr)]}
    this.accessors.push(a);return this.accessors.length-1
  }
  material(name,color,rough=.7,metal=.0,opts={}) {
    const m={name,pbrMetallicRoughness:{baseColorFactor:hexColor(color,opts.alpha??1),metallicFactor:metal,roughnessFactor:rough}}
    if(opts.alpha!==undefined&&opts.alpha<1){m.alphaMode='BLEND';m.doubleSided=!!opts.doubleSided}
    if(opts.emissive){m.emissiveFactor=hexColor(opts.emissive).slice(0,3);m.extensions={KHR_materials_emissive_strength:{emissiveStrength:opts.emissiveStrength??1.0}}}
    this.materials.push(m);return this.materials.length-1
  }
  addMesh(name,g,material) {
    const pos=this.accessor(g.positions,'VEC3',F32,ARRAY_BUFFER), nor=this.accessor(g.normals,'VEC3',F32,ARRAY_BUFFER), ind=this.accessor(g.indices,'SCALAR',U32,ELEMENT_ARRAY_BUFFER)
    this.meshes.push({name,primitives:[{attributes:{POSITION:pos,NORMAL:nor},indices:ind,material,mode:4}]});return this.meshes.length-1
  }
  node(name,{parent=this.root,mesh,translation,rotation,scale,extras}={}) {
    const n={name}; if(mesh!==undefined)n.mesh=mesh;if(translation)n.translation=translation;if(rotation)n.rotation=rotation;if(scale)n.scale=scale;if(extras)n.extras=extras
    this.nodes.push(n);const idx=this.nodes.length-1
    if(parent!==null&&parent!==undefined&&parent!==idx){this.nodes[parent].children??=[];this.nodes[parent].children.push(idx)}
    return idx
  }
  animate(name,node,path,times,values) {
    const inp=this.accessor(Float32Array.from(times),'SCALAR',F32)
    const out=this.accessor(Float32Array.from(values.flat()),path==='rotation'?'VEC4':'VEC3',F32)
    this.animations.push({name,samplers:[{input:inp,output:out,interpolation:'LINEAR'}],channels:[{sampler:0,target:{node,path}}]})
  }
  write(file) {
    const bin=Buffer.concat([...this.bin,Buffer.alloc(align4(this.binLength)-this.binLength)])
    const doc={asset:{version:'2.0',generator:'URAI Labs Human World Forge 1.0',extras:{authorship:'original URAI runtime geometry; no image stand-ins'}},scene:0,scenes:[{name:this.name,nodes:[this.root]}],nodes:this.nodes,meshes:this.meshes,materials:this.materials,buffers:[{byteLength:bin.length}],bufferViews:this.bufferViews,accessors:this.accessors,extensionsUsed:['KHR_materials_emissive_strength']}
    if(this.animations.length)doc.animations=this.animations
    const json=Buffer.from(JSON.stringify(doc));const jp=Buffer.concat([json,Buffer.alloc(align4(json.length)-json.length,0x20)])
    const total=12+8+jp.length+8+bin.length;const out=Buffer.alloc(total);out.writeUInt32LE(0x46546c67,0);out.writeUInt32LE(2,4);out.writeUInt32LE(total,8);out.writeUInt32LE(jp.length,12);out.write('JSON',16);jp.copy(out,20);let o=20+jp.length;out.writeUInt32LE(bin.length,o);out.write('BIN\0',o+4);bin.copy(out,o+8)
    fs.writeFileSync(file,out);return {fileName:path.basename(file),bytes:out.length,sha256:crypto.createHash('sha256').update(out).digest('hex'),nodes:this.nodes.length,meshes:this.meshes.length,animations:this.animations.map(a=>a.name)}
  }
}

function addHuman(glb,parent,name,style,at=[0,0,0],yaw=0) {
  const root=glb.node(name,{parent,translation:at,rotation:quatY(yaw),extras:{role:style.role||'human',realWorldHeightMeters:style.height||1.78,humanFirst:true}})
  const skin=glb.material(name+'-skin',style.skin,.58,0), hair=glb.material(name+'-hair',style.hair,.96,0), shirt=glb.material(name+'-cloth',style.shirt,.9,.01), pants=glb.material(name+'-trousers',style.pants,.92,.01), shoe=glb.material(name+'-shoe','#171819',.78,.02), eyeW=glb.material(name+'-eye-white','#ecece7',.28,0), iris=glb.material(name+'-iris',style.eyes||'#3a443f',.22,0), lip=glb.material(name+'-lip',style.lips||'#78453f',.68,0)
  const torso=glb.addMesh(name+'-torso',loft([[-.29,.18,.12],[-.18,.21,.13],[.02,.235,.145],[.25,.27,.155],[.45,.24,.14]],32),shirt);glb.node(name+'-torso-node',{parent:root,mesh:torso,translation:[0,1.18,0]})
  const pelvis=glb.addMesh(name+'-pelvis',loft([[-.13,.18,.13],[.0,.205,.145],[.16,.19,.13]],28),pants);glb.node(name+'-pelvis-node',{parent:root,mesh:pelvis,translation:[0,.89,0]})
  const leg=glb.addMesh(name+'-leg',loft([[-.34,.07,.065],[-.12,.08,.07],[.12,.07,.065],[.34,.055,.055]],22),pants)
  for(const [side,x] of [['L',-.095],['R',.095]]){glb.node(name+'-leg-'+side,{parent:root,mesh:leg,translation:[x,.45,0]});const foot=glb.addMesh(name+'-shoe-'+side,uvEllipsoid(.09,.055,.17,20,12),shoe);glb.node(name+'-foot-'+side,{parent:root,mesh:foot,translation:[x,.08,.07]})}
  const upperArm=glb.addMesh(name+'-upperarm',loft([[-.14,.055,.055],[.14,.048,.048]],20),shirt), forearm=glb.addMesh(name+'-forearm',loft([[-.13,.045,.043],[.13,.035,.035]],20),skin)
  for(const [side,x,sgn] of [['L',-.285,-1],['R',.285,1]]){glb.node(name+'-upperarm-'+side,{parent:root,mesh:upperArm,translation:[x,1.25,0],rotation:quatZ(sgn*.10)});glb.node(name+'-forearm-'+side,{parent:root,mesh:forearm,translation:[x+sgn*.025,1.00,.015],rotation:quatZ(-sgn*.03)});const hand=glb.addMesh(name+'-hand-'+side,uvEllipsoid(.052,.078,.038,18,12),skin);glb.node(name+'-hand-node-'+side,{parent:root,mesh:hand,translation:[x+sgn*.03,.81,.03]})}
  const neck=glb.addMesh(name+'-neck',cylinder(.058,.13,24,.064),skin);glb.node(name+'-neck-node',{parent:root,mesh:neck,translation:[0,1.52,0]})
  const head=glb.addMesh(name+'-head',uvEllipsoid(.115,.145,.108,30,20),skin);const headNode=glb.node(name+'-head-node',{parent:root,mesh:head,translation:[0,1.68,0]})
  const hairMesh=glb.addMesh(name+'-hair',uvEllipsoid(.122,.108,.113,30,12,Math.PI*.7),hair);glb.node(name+'-hair-node',{parent:root,mesh:hairMesh,translation:[0,1.75,-.02]})
  const earMesh=glb.addMesh(name+'-ear',uvEllipsoid(.017,.034,.018,14,10),skin);glb.node(name+'-ear-L',{parent:root,mesh:earMesh,translation:[-.116,1.68,0]});glb.node(name+'-ear-R',{parent:root,mesh:earMesh,translation:[.116,1.68,0]})
  const nose=glb.addMesh(name+'-nose',loft([[-.025,.018,.016],[.02,.012,.012],[.055,.004,.004]],16),skin);glb.node(name+'-nose-node',{parent:root,mesh:nose,translation:[0,1.66,.108],rotation:quatZ(Math.PI/2)})
  const eye=glb.addMesh(name+'-eye',uvEllipsoid(.019,.010,.007,16,10),eyeW), pupil=glb.addMesh(name+'-iris',uvEllipsoid(.0065,.0065,.004,14,8),iris)
  for(const [side,x] of [['L',-.042],['R',.042]]){glb.node(name+'-eye-'+side,{parent:root,mesh:eye,translation:[x,1.705,.101]});glb.node(name+'-iris-'+side,{parent:root,mesh:pupil,translation:[x,1.705,.108]})}
  const mouth=glb.addMesh(name+'-mouth',uvEllipsoid(.034,.006,.006,16,8),lip);glb.node(name+'-mouth-node',{parent:root,mesh:mouth,translation:[0,1.615,.102]})
  glb.animate(name+'_Breathing',root,'translation',[0,2.5,5],[at,[at[0],at[1]+.006,at[2]],at]);glb.animate(name+'_HeadIdle',headNode,'rotation',[0,2.5,5],[[0,0,0,1],[0,.012,0,.9999],[0,0,0,1]])
  return root
}

const styles=[
 {role:'guide',skin:'#c58a6d',hair:'#251914',shirt:'#526272',pants:'#292e33',eyes:'#4a514c'},
 {role:'mirror',skin:'#8d5e48',hair:'#171312',shirt:'#626a70',pants:'#2a2e31',eyes:'#332d29'},
 {role:'guardian',skin:'#6f4937',hair:'#24211f',shirt:'#2d4053',pants:'#22282e',eyes:'#2e3a34'},
 {role:'archivist',skin:'#d0a081',hair:'#4a4038',shirt:'#655e56',pants:'#37332f',eyes:'#56615d'},
 {role:'builder',skin:'#b67457',hair:'#39251c',shirt:'#69594d',pants:'#322e2b',eyes:'#3a332c'},
 {role:'trickster',skin:'#9d6950',hair:'#171514',shirt:'#4c4850',pants:'#28272b',eyes:'#45404c'},
]

function buildHuman() { const g=new GLB('URAI Human Presence',{assetType:'human-base',replaceableByRiggedScan:true});addHuman(g,g.root,'urai-human',styles[0],[0,0,0],0);return g }

function buildCouncil() {
  const g=new GLB('URAI Human Council Chamber',{assetType:'council-human-world',humanScale:true,realm:'Council'})
  const stone=g.material('council-stone','#706c65',.94,.01), stone2=g.material('council-stone-dark','#4b4a47',.95,.01), wood=g.material('council-wood','#503a2c',.84,.01), upholstery=g.material('council-upholstery','#393b3e',.94,.0), glass=g.material('council-window-glass','#a6bbc4',.12,.0,{alpha:.32,doubleSided:true}), metal=g.material('council-metal','#333638',.45,.55), lamp=g.material('council-lamp','#e1d0ac',.66,0,{emissive:'#ffd49b',emissiveStrength:1.8})
  const floor=g.addMesh('council-floor',cylinder(6.6,.18,80),stone);g.node('council-floor-node',{mesh:floor,translation:[0,-.09,0]})
  const back=g.addMesh('council-back-wall',box(11.2,5.2,.34),stone);g.node('council-back-wall-node',{mesh:back,translation:[0,2.6,-5.0]})
  const side=g.addMesh('council-side-wall',box(.34,5.2,9.6),stone2);g.node('council-left-wall',{mesh:side,translation:[-5.35,2.6,-.4]});g.node('council-right-wall',{mesh:side,translation:[5.35,2.6,-.4]})
  const column=g.addMesh('council-column',cylinder(.23,4.6,24),stone2);for(const x of [-4.7,-2.35,0,2.35,4.7])g.node('council-column-'+x,{mesh:column,translation:[x,2.3,-4.72]})
  const window=g.addMesh('council-window',box(3.8,2.3,.05),glass);g.node('council-window-node',{mesh:window,translation:[0,3.0,-4.8]})
  const top=g.addMesh('council-table-top',cylinder(1.48,.10,64),wood);g.node('council-table-top-node',{mesh:top,translation:[0,.76,-.55]});const base=g.addMesh('council-table-base',cylinder(.48,.70,40,.55),wood);g.node('council-table-base-node',{mesh:base,translation:[0,.37,-.55]})
  const seat=g.addMesh('council-chair-seat',box(.66,.16,.62),upholstery), backrest=g.addMesh('council-chair-back',box(.64,.84,.15),upholstery)
  const positions=[[-2.7,0,-.8],[-1.55,0,-2.55],[0,0,-3.15],[1.55,0,-2.55],[2.7,0,-.8],[3.2,0,1.0]]
  for(let i=0;i<positions.length;i++){const [x,y,z]=positions[i];g.node('chair-seat-'+i,{mesh:seat,translation:[x,.42,z+.16]});g.node('chair-back-'+i,{mesh:backrest,translation:[x,.86,z+.42]});const yaw=Math.atan2(-x,-.55-z);addHuman(g,g.root,'council-'+styles[i].role,styles[i],[x,0,z],yaw)}
  const stem=g.addMesh('council-lamp-stem',cylinder(.065,1.35,18,.08),metal), shade=g.addMesh('council-lamp-shade',loft([[-.18,.30,.30],[.18,.20,.20]],24),lamp)
  for(const x of [-3.8,3.8]){g.node('lamp-stem-'+x,{mesh:stem,translation:[x,.68,-3.75]});g.node('lamp-shade-'+x,{mesh:shade,translation:[x,1.5,-3.75]})}
  return g
}

function buildShadow() {
  const g=new GLB('URAI Physical Shadow World',{assetType:'shadow-world',realm:'Shadow',governance:'visual-substrate-only'})
  const dark=g.material('shadow-stone','#302f31',.96,.01), stone=g.material('shadow-walkstone','#69645e',.94,.01), glass=g.material('shadow-reflection-glass','#6f7c87',.10,.0,{alpha:.28,doubleSided:true}), water=g.material('shadow-water','#304d59',.12,.02,{alpha:.62}), lamp=g.material('shadow-practical-light','#d4bea0',.65,0,{emissive:'#c6a274',emissiveStrength:1.4})
  const floor=g.addMesh('shadow-floor',box(10.5,.18,14),dark);g.node('shadow-floor-node',{mesh:floor,translation:[0,-.09,-1.5]});const wall=g.addMesh('shadow-side-wall',box(.3,5,14),dark);g.node('shadow-wall-L',{mesh:wall,translation:[-5.2,2.5,-1.5]});g.node('shadow-wall-R',{mesh:wall,translation:[5.2,2.5,-1.5]});const back=g.addMesh('shadow-back-wall',box(10.5,5,.3),dark);g.node('shadow-back-wall-node',{mesh:back,translation:[0,2.5,-8.4]})
  const step=g.addMesh('shadow-path-stone',box(1.05,.055,.48),stone);for(let i=0;i<18;i++)g.node('shadow-step-'+i,{mesh:step,translation:[0,.03,5.2-i*.65],rotation:quatY((i%3-1)*.025)})
  const panel=g.addMesh('shadow-glass-panel',box(1.7,2.8,.045),glass);[[-3.4,1.8,.16],[3.4,.6,-.16],[-3.4,-1,.16],[3.4,-2.3,-.16],[-3.4,-4,.16]].forEach(([x,z,yaw],i)=>g.node('shadow-panel-'+i,{mesh:panel,translation:[x,1.75,z],rotation:quatY(yaw)}))
  const basin=g.addMesh('shadow-basin',cylinder(1.65,.22,56),stone);g.node('shadow-basin-node',{mesh:basin,translation:[0,.10,-5.2]});const w=g.addMesh('shadow-basin-water',cylinder(1.35,.025,56),water);g.node('shadow-basin-water-node',{mesh:w,translation:[0,.23,-5.2]})
  const lowLight=g.addMesh('shadow-floor-light',cylinder(.12,.28,18),lamp);for(const z of [3.6,.5,-2.7,-5.9])for(const x of [-4.35,4.35])g.node('shadow-light-'+x+'-'+z,{mesh:lowLight,translation:[x,.16,z+.35]})
  addHuman(g,g.root,'shadow-guardian-human',styles[2],[0,0,3.4],Math.PI)
  return g
}

const builders=[['urai-human-real-v1.glb',buildHuman],['urai-council-human-world-v1.glb',buildCouncil],['urai-shadow-human-world-v1.glb',buildShadow]]
const records=[]
for(const [file,fn] of builders){const rec=fn().write(path.join(outDir,file));records.push(rec);console.log(JSON.stringify(rec))}
const payload={schemaVersion:'1.0.0',packId:'urai-human-world-production-pack-v1',generatedAt:'2026-08-11T11:10:00Z',generator:'URAI Labs Human World Forge 1.0',cameraAspect:'5:4',units:'meters',authorship:'Original URAI model geometry. Real-world proportions/material separation first; symbolic effects remain external.',status:'runtime-candidate-in-review',assets:records}
fs.writeFileSync(receiptPath,JSON.stringify(payload,null,2)+'\n')
console.log('receipt',receiptPath)
