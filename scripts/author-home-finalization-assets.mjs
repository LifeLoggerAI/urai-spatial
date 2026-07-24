#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'

const outRoot = process.argv[2] || '/tmp/urai-home-authored'
const receiptPath = process.argv[3] || path.join(outRoot, 'home-finalization-authored-source-v2.json')
fs.mkdirSync(outRoot, { recursive: true })
fs.mkdirSync(path.dirname(receiptPath), { recursive: true })

const MATERIALS = [
  mat('sanctuary-stone', [0.09,0.13,0.12,1], [0.015,0.035,0.028], 0.08, 0.78),
  mat('living-stone', [0.16,0.24,0.20,1], [0.02,0.08,0.055], 0.04, 0.66),
  mat('warm-bronze', [0.34,0.22,0.12,1], [0.12,0.055,0.015], 0.64, 0.32),
  mat('cool-metal', [0.12,0.18,0.24,1], [0.02,0.08,0.16], 0.72, 0.24),
  mat('memory-cyan', [0.16,0.76,0.72,0.92], [0.06,0.72,0.64], 0.12, 0.18, 'BLEND'),
  mat('memory-violet', [0.48,0.34,0.84,0.88], [0.32,0.18,0.78], 0.10, 0.16, 'BLEND'),
  mat('provenance-gold', [0.82,0.56,0.24,1], [0.34,0.16,0.035], 0.46, 0.30),
  mat('water-glass', [0.08,0.26,0.30,0.52], [0.02,0.16,0.22], 0.18, 0.08, 'BLEND'),
  mat('aura-glass', [0.22,0.72,0.86,0.20], [0.08,0.42,0.72], 0.04, 0.06, 'BLEND'),
  mat('moss', [0.16,0.34,0.22,1], [0.015,0.07,0.025], 0.02, 0.92),
  mat('ember', [0.72,0.24,0.10,0.88], [0.80,0.12,0.025], 0.05, 0.22, 'BLEND'),
]

function writeAsset(fileName, built) {
  const target = path.join(outRoot, fileName)
  fs.writeFileSync(target, built.payload)
  const sha256 = crypto.createHash('sha256').update(built.payload).digest('hex')
  return { fileName, sha256, bytes: built.payload.length, ...built.metrics }
}

function buildHome() {
  const b = new Builder('URAI Authored Living Home Sanctuary')
  const stone = 0, living = 1, bronze = 2, cool = 3, cyan = 4, violet = 5, gold = 6, water = 7, aura = 8, moss = 9
  b.add('sanctuary-terrain', cylinder(8.8, 0.34, 96), stone, { t:[0,-0.28,-0.8] }, { role:'grounded-terrain', lod:'mobile-primary' })
  b.add('sanctuary-inner-earth', cylinder(5.2, 0.20, 80), living, { t:[0,-0.08,-1.0] }, { role:'central-sanctuary-floor' })
  b.add('mirror-basin-rim', torus(1.78,0.11,72,12), bronze, { t:[0,0.08,-0.75], r:qEuler(Math.PI/2,0,0) }, { role:'orb-pedestal-basin' })
  b.add('mirror-basin-water', cylinder(1.66,0.055,64), water, { t:[0,0.06,-0.75] }, { role:'reflective-water' })
  b.add('orb-pedestal-lower', cylinder(0.88,0.28,48), stone, { t:[0,0.14,-0.75] })
  b.add('orb-pedestal-upper', cylinder(0.55,0.22,48), bronze, { t:[0,0.39,-0.75] })

  const paths = [
    {name:'ground-descent-path', points:[[0,0.03,7.7],[-0.4,0.06,4],[-1.6,0.10,0.6],[-4.4,0.17,-6.5]], width:0.78, material:living},
    {name:'life-map-ascent-path', points:[[0,0.03,7.7],[0.5,0.06,4],[1.7,0.16,0.4],[4.4,0.42,-6.6]], width:0.76, material:cool},
    {name:'memory-garden-path', points:[[0,0.05,5.0],[-0.2,0.07,2.6],[0.1,0.09,-1.2],[0,0.12,-7.5]], width:0.48, material:moss},
  ]
  for (const p of paths) b.add(p.name, ribbon(p.points,p.width), p.material, {}, { role:'natural-travel-path' })

  const ribAngles = [-0.92,-0.46,0,0.46,0.92]
  ribAngles.forEach((angle,index) => {
    b.add(`sanctuary-rib-${index+1}`, torusArc(4.65,0.115,0,Math.PI,64,10), index % 2 ? bronze : cool, { t:[0,0.05,-3.2], r:qEuler(0,angle,0) }, { role:'authored-architecture-rib' })
  })

  for (let i=0;i<8;i++) {
    const a=(i/8)*Math.PI*2
    const x=Math.cos(a)*6.65, z=Math.sin(a)*5.5-1.2
    b.add(`living-pillar-${i+1}`, frustum(0.30,0.52,3.6,18), i%2?living:stone, { t:[x,1.50,z], r:qEuler(0,-a,0) }, { role:'environmental-landmark' })
    b.add(`pillar-crown-${i+1}`, sphere(0.58,20,14), i%3===0?gold:moss, { t:[x,3.45,z], s:[1.0,0.72,1.0] })
  }

  const canopy = [
    [-3.7,4.6,-3.6,0.8],[0,5.3,-4.5,1.15],[3.7,4.6,-3.6,-0.8],[-5.3,3.7,-1.0,0.4],[5.3,3.7,-1.0,-0.4]
  ]
  canopy.forEach(([x,y,z,rot],i)=>b.add(`canopy-leaf-${i+1}`, sphere(1,22,14), i%2?living:moss, {t:[x,y,z],r:qEuler(0,0,rot),s:[1.8,0.24,0.72]}, {role:'environmental-canopy'}))

  addPortalAlcove(b,'ground',[-4.55,0.2,-6.65],0.32,cyan,stone,bronze)
  addPortalAlcove(b,'life-map',[4.55,0.5,-6.75],-0.32,violet,cool,gold)

  b.add('horizon-monolith-left', frustum(0.55,0.82,5.8,14), stone, {t:[-1.2,2.6,-8.7],r:qEuler(0,0,-0.08)}, {role:'readable-horizon-landmark'})
  b.add('horizon-monolith-right', frustum(0.55,0.82,5.8,14), cool, {t:[1.2,2.6,-8.7],r:qEuler(0,0,0.08)}, {role:'readable-horizon-landmark'})
  b.add('horizon-bridge', box(2.7,0.36,0.65), bronze, {t:[0,4.65,-8.7]}, {role:'horizon-threshold'})

  for (let cluster=0;cluster<7;cluster++) {
    const side=cluster%2?1:-1
    const x=side*(5.7+(cluster%3)*0.55), z=5.0-Math.floor(cluster/2)*2.4
    b.add(`growth-trunk-${cluster+1}`, frustum(0.10,0.22,1.75,10), living, {t:[x,0.64,z]})
    b.add(`growth-crown-${cluster+1}`, sphere(0.72,16,12), moss, {t:[x+(cluster%2?0.16:-0.16),1.72,z],s:[1.0,1.18,0.82]})
  }

  b.rootExtras = {
    assetContract:'urai-home-entry-chamber-v2',
    authoredArchitecture:true,
    anchors:{ orb:[0,0.55,-0.75], ground:[-4.55,0.2,-6.65], lifeMap:[4.55,0.5,-6.75] },
    mobileComposition:'portrait-safe central orb and bifurcated destination silhouette',
    degradedFallback:'home-sanctuary-static-v1',
  }
  return b.finish()
}

function addPortalAlcove(b,prefix,position,yaw,energyMat,structureMat,accentMat) {
  const [x,y,z]=position
  b.add(`${prefix}-alcove-arch`, torusArc(2.0,0.16,0,Math.PI,56,10), structureMat, {t:[x,y+1.85,z],r:qEuler(0,yaw,0)}, {role:`${prefix}-portal-anchor`})
  b.add(`${prefix}-alcove-left`, frustum(0.22,0.38,3.0,14), structureMat, {t:[x-2.0*Math.cos(yaw),y+0.35,z+2.0*Math.sin(yaw)]})
  b.add(`${prefix}-alcove-right`, frustum(0.22,0.38,3.0,14), structureMat, {t:[x+2.0*Math.cos(yaw),y+0.35,z-2.0*Math.sin(yaw)]})
  b.add(`${prefix}-alcove-energy`, torusArc(1.62,0.055,0,Math.PI,64,8), energyMat, {t:[x,y+1.85,z+0.04],r:qEuler(0,yaw,0)})
  b.add(`${prefix}-threshold-plinth`, box(3.9,0.26,1.45), accentMat, {t:[x,y-0.08,z+0.55]})
}

function buildPortal() {
  const b = new Builder('URAI Portal Master Authored Architecture')
  const stone=0,living=1,bronze=2,cool=3,cyan=4,violet=5,gold=6,water=7,aura=8
  const root=b.group('portal-root',{}, {assetContract:'urai-portal-master-v2',states:['closed','available','attention','active','opening','traversal','closing']})
  const left=b.add('portal-pillar-left', frustum(0.26,0.44,2.9,18), stone, {t:[-1.72,-0.38,0]}, {}, root)
  const right=b.add('portal-pillar-right', frustum(0.26,0.44,2.9,18), stone, {t:[1.72,-0.38,0]}, {}, root)
  b.add('portal-architectural-arch', torusArc(1.72,0.18,0,Math.PI,72,12), bronze, {t:[0,1.05,0]}, {role:'destination-neutral-frame'}, root)
  b.add('portal-energy-crown', torusArc(1.42,0.055,0,Math.PI,72,8), cyan, {t:[0,1.05,0.06]}, {role:'state-energy'}, root)
  b.add('portal-threshold-stone', box(3.9,0.28,0.9), living, {t:[0,-1.82,0.18]}, {role:'environmental-anchor'}, root)
  for(let i=0;i<4;i++) b.add(`portal-step-${i+1}`,box(3.45-i*0.34,0.14,0.5),i%2?stone:living,{t:[0,-2.02-i*0.14,0.25+i*0.22]}, {},root)
  const depth=[]
  for(let i=0;i<4;i++) depth.push(b.add(`portal-depth-${i+1}`,torusArc(1.24-i*0.08,0.038,0,Math.PI,64,8),i%2?violet:cyan,{t:[0,1.05,-0.12-i*0.20]}, {role:'internal-depth-layer'},root))
  const membrane=b.add('portal-membrane',disc(1.24,64),water,{t:[0,1.05,-0.92],r:qEuler(0,0,0),s:[1,1,1]}, {role:'traversal-plane'},root)
  for(let i=0;i<10;i++) {
    const a=(i/10)*Math.PI
    b.add(`portal-particle-anchor-${i+1}`,sphere(0.045,10,8),a<Math.PI/2?cyan:violet,{t:[Math.cos(a)*1.95,1.02+Math.sin(a)*1.78,0.18]}, {role:'particle-anchor'},root)
  }
  b.addAnimation('Portal_Closed',[
    anim(membrane,'scale',[0,1],[0.05,0.05,0.05, 0.05,0.05,0.05]),
    anim(depth[0],'translation',[0,1],[0,1.05,-0.12, 0,1.05,-0.12]),
  ])
  b.addAnimation('Portal_Available',[anim(membrane,'scale',[0,1.6],[0.78,0.78,0.78, 0.86,0.86,0.86])])
  b.addAnimation('Portal_Attention',[anim(membrane,'scale',[0,0.35,0.7],[0.82,0.82,0.82,1.0,1.0,1.0,0.82,0.82,0.82])])
  b.addAnimation('Portal_Active',[anim(root,'scale',[0,1.2],[1,1,1,1.04,1.04,1.04])])
  b.addAnimation('Portal_Opening',[
    anim(membrane,'scale',[0,0.9],[0.12,0.12,0.12,1,1,1]),
    ...depth.map((node,i)=>anim(node,'translation',[0,0.9],[0,1.05,-0.12-i*0.20,0,1.05,-0.30-i*0.30])),
  ])
  b.addAnimation('Portal_Traversal',[anim(membrane,'scale',[0,0.45,0.9],[1,1,1,1.18,1.18,1.18,1,1,1])])
  b.addAnimation('Portal_Closing',[
    anim(membrane,'scale',[0,0.9],[1,1,1,0.08,0.08,0.08]),
    ...depth.map((node,i)=>anim(node,'translation',[0,0.9],[0,1.05,-0.30-i*0.30,0,1.05,-0.12-i*0.20])),
  ])
  b.rootExtras={assetContract:'urai-portal-master-v2',namedNodes:true,animationClips:7,mobileReadableSilhouette:true,reducedMotionContract:'hold final keyframe without oscillation'}
  return b.finish()
}

function buildOrb() {
  const b = new Builder('URAI Orb Companion Authored State Rig')
  const stone=0,living=1,bronze=2,cool=3,cyan=4,violet=5,gold=6,water=7,aura=8,ember=10
  const root=b.group('orb-root',{}, {assetContract:'urai-orb-avatar-v2'})
  const core=b.add('orb-core',sphere(0.23,28,20),gold,{}, {role:'companion-core'},root)
  const heart=b.add('orb-heart',sphere(0.15,24,16),cyan,{s:[0.82,1.05,0.82]}, {role:'state-heart'},root)
  const auraNode=b.add('orb-aura',sphere(0.48,28,18),aura,{s:[1,1,1]}, {role:'state-aura'},root)
  for(let i=0;i<6;i++) {
    const a=(i/6)*Math.PI*2
    b.add(`orb-petal-${i+1}`,sphere(0.22,20,14),i%2?cool:living,{t:[Math.cos(a)*0.23,Math.sin(a)*0.23,0],r:qEuler(0,0,a),s:[0.58,1.22,0.26]}, {role:'protective-petal'},root)
  }
  const orbitA=b.add('orb-orbit-a',torus(0.48,0.022,72,10),cyan,{r:qEuler(0.7,0.2,0.1)}, {role:'orbital-state-ring'},root)
  const orbitB=b.add('orb-orbit-b',torus(0.61,0.018,72,10),violet,{r:qEuler(1.3,0.25,0.8)}, {role:'orbital-state-ring'},root)
  const orbitC=b.add('orb-orbit-c',torus(0.70,0.012,72,8),gold,{r:qEuler(0.3,1.1,0.6)}, {role:'guidance-orbit'},root)
  for(let i=0;i<5;i++) {
    const a=(i/5)*Math.PI*2
    b.add(`orb-satellite-${i+1}`,sphere(0.038,12,8),i%2?cyan:gold,{t:[Math.cos(a)*0.70,Math.sin(a)*0.48,Math.sin(a*2)*0.24]}, {role:'state-particle-anchor'},root)
  }
  const states=[
    ['Orb_Resting',0.96,0.00,0.18],['Orb_Idle',1.00,0.05,0.32],['Orb_Attention',1.10,0.12,0.65],
    ['Orb_Listening',1.04,-0.05,0.48],['Orb_Thinking',1.02,0.08,1.20],['Orb_Speaking',1.13,0.10,0.82],
    ['Orb_Guiding',1.06,0.18,0.96],['Orb_Reflecting',0.98,-0.10,0.46],['Orb_Calming',0.94,-0.04,0.20],
    ['Orb_Privacy',0.90,0.02,0.12],['Orb_Degraded',0.88,-0.12,0.08],['Orb_Transition',1.18,0.24,1.65],
  ]
  for(const [name,scale,y,turns] of states) {
    const spin=Number(turns)*Math.PI*2
    b.addAnimation(name,[
      anim(root,'translation',[0,0.6,1.2],[0,0,0,0,Number(y),0,0,0,0]),
      anim(root,'scale',[0,0.6,1.2],[1,1,1,Number(scale),Number(scale),Number(scale),1,1,1]),
      anim(orbitA,'rotation',[0,1.2],[0,0,0,1,...qEuler(0,0,spin)]),
      anim(orbitB,'rotation',[0,1.2],[0,0,0,1,...qEuler(spin*0.72,0,0)]),
      anim(orbitC,'rotation',[0,1.2],[0,0,0,1,...qEuler(0,spin*0.52,0)]),
      anim(auraNode,'scale',[0,0.6,1.2],[0.9,0.9,0.9,Number(scale)*1.12,Number(scale)*1.12,Number(scale)*1.12,0.9,0.9,0.9]),
      anim(heart,'scale',[0,0.3,0.6,0.9,1.2],[0.82,1.05,0.82,0.95,1.22,0.95,0.82,1.05,0.82,0.95,1.22,0.95,0.82,1.05,0.82]),
    ])
  }
  b.rootExtras={assetContract:'urai-orb-avatar-v2',namedNodes:true,animationClips:12,stateNames:states.map(([name])=>name),routeIndependent:true,reducedMotionContract:'hold first or final state keyframe'}
  return b.finish()
}

class Builder {
  constructor(sceneName){this.sceneName=sceneName;this.meshes=[];this.nodes=[];this.roots=[];this.materials=MATERIALS;this.geom=[];this.animations=[];this.rootExtras={}}
  group(name, transform={}, extras={}) { const i=this.nodes.length; this.nodes.push(node(name,undefined,transform,extras)); this.roots.push(i); return i }
  add(name,geometry,material,transform={},extras={},parent=null){const mi=this.meshes.length;this.meshes.push({name,primitives:[{attributes:{POSITION:null,NORMAL:null},indices:null,material}]});this.geom.push(geometry);const ni=this.nodes.length;this.nodes.push(node(name,mi,transform,extras));if(parent===null)this.roots.push(ni);else{this.nodes[parent].children??=[];this.nodes[parent].children.push(ni)}return ni}
  addAnimation(name, channels){this.animations.push({name,channels})}
  finish(){
    const binParts=[],bufferViews=[],accessors=[];let offset=0
    const append=(array,target,spec)=>{const bytes=Buffer.from(array.buffer,array.byteOffset,array.byteLength);const aligned=align4(offset);if(aligned>offset)binParts.push(Buffer.alloc(aligned-offset));offset=aligned;const vi=bufferViews.length;bufferViews.push({buffer:0,byteOffset:offset,byteLength:bytes.length,...(target?{target}:{})});binParts.push(bytes);offset+=bytes.length;accessors.push({bufferView:vi,...spec});return accessors.length-1}
    this.geom.forEach((g,i)=>{const p=new Float32Array(g.positions),n=new Float32Array(g.normals),maxIndex=Math.max(...g.indices);const idx=maxIndex>65535?new Uint32Array(g.indices):new Uint16Array(g.indices);const pa=append(p,34962,{componentType:5126,count:p.length/3,type:'VEC3',min:minVec3(p),max:maxVec3(p)});const na=append(n,34962,{componentType:5126,count:n.length/3,type:'VEC3'});const ia=append(idx,34963,{componentType:maxIndex>65535?5125:5123,count:idx.length,type:'SCALAR',min:[0],max:[maxIndex]});Object.assign(this.meshes[i].primitives[0].attributes,{POSITION:pa,NORMAL:na});this.meshes[i].primitives[0].indices=ia})
    const animations=this.animations.map((clip)=>{const samplers=[],channels=[];for(const ch of clip.channels){const input=new Float32Array(ch.times),output=new Float32Array(ch.values);const inputAccessor=append(input,null,{componentType:5126,count:ch.times.length,type:'SCALAR',min:[Math.min(...ch.times)],max:[Math.max(...ch.times)]});const components=ch.path==='rotation'?4:3;const outputAccessor=append(output,null,{componentType:5126,count:ch.values.length/components,type:components===4?'VEC4':'VEC3'});const si=samplers.length;samplers.push({input:inputAccessor,output:outputAccessor,interpolation:'LINEAR'});channels.push({sampler:si,target:{node:ch.node,path:ch.path}})}return{name:clip.name,samplers,channels}})
    const bin=Buffer.concat(binParts)
    const json={asset:{version:'2.0',generator:'URAI Labs authored sanctuary deterministic pipeline',extras:{source:'scripts/author-home-finalization-assets.mjs'}},scene:0,scenes:[{name:this.sceneName,nodes:this.roots,extras:this.rootExtras}],nodes:this.nodes,meshes:this.meshes,materials:this.materials,buffers:[{byteLength:bin.length}],bufferViews,accessors,...(animations.length?{animations}:{})}
    const payload=encodeGlb(json,bin)
    const triangles=this.geom.reduce((sum,g)=>sum+Math.floor(g.indices.length/3),0)
    return{payload,metrics:{triangleCount:triangles,nodes:this.nodes.length,materials:this.materials.length,animations:animations.length,boundsMeters:aggregateBounds(this.geom,this.nodes,this.meshes)}}
  }
}

function node(name,mesh,transform={},extras={}){const out={name,...(mesh===undefined?{}:{mesh}),...(transform.t?{translation:transform.t}:{}),...(transform.r?{rotation:transform.r}:{}),...(transform.s?{scale:transform.s}:{}),...(Object.keys(extras).length?{extras}:{})};return out}
function anim(node,path,times,values){return{node,path,times,values}}
function mat(name,base,emissive,metallic,roughness,alphaMode='OPAQUE'){return{name,pbrMetallicRoughness:{baseColorFactor:base,metallicFactor:metallic,roughnessFactor:roughness},emissiveFactor:emissive,alphaMode,doubleSided:true}}
function box(x,y,z){const hx=x/2,hy=y/2,hz=z/2;const pts=[[-hx,-hy,-hz],[hx,-hy,-hz],[hx,hy,-hz],[-hx,hy,-hz],[-hx,-hy,hz],[hx,-hy,hz],[hx,hy,hz],[-hx,hy,hz]];const faces=[[0,1,2,3,[0,0,-1]],[4,7,6,5,[0,0,1]],[0,4,5,1,[0,-1,0]],[3,2,6,7,[0,1,0]],[1,5,6,2,[1,0,0]],[0,3,7,4,[-1,0,0]]];const positions=[],normals=[],indices=[];for(const f of faces){const base=positions.length/3;for(let i=0;i<4;i++){positions.push(...pts[f[i]]);normals.push(...f[4])}indices.push(base,base+1,base+2,base,base+2,base+3)}return{positions,normals,indices}}
function cylinder(radius,height,segments=32){return frustum(radius,radius,height,segments)}
function frustum(top,bottom,height,segments=32){const positions=[],normals=[],indices=[];for(let i=0;i<=segments;i++){const a=(i/segments)*Math.PI*2,c=Math.cos(a),s=Math.sin(a);const slope=(bottom-top)/height;const nl=Math.hypot(c,s,slope);positions.push(c*bottom,-height/2,s*bottom,c*top,height/2,s*top);normals.push(c/nl,slope/nl,s/nl,c/nl,slope/nl,s/nl)}for(let i=0;i<segments;i++){const a=i*2,b=a+1,c=a+2,d=a+3;indices.push(a,c,d,a,d,b)}const bottomCenter=positions.length/3;positions.push(0,-height/2,0);normals.push(0,-1,0);const topCenter=positions.length/3;positions.push(0,height/2,0);normals.push(0,1,0);for(let i=0;i<segments;i++){const next=((i+1)%segments)*2;indices.push(bottomCenter,next,i*2);indices.push(topCenter,i*2+1,next+1)}return{positions,normals,indices}}
function sphere(radius,w=24,h=16){const positions=[],normals=[],indices=[];for(let y=0;y<=h;y++){const v=y/h,phi=v*Math.PI;for(let x=0;x<=w;x++){const u=x/w,theta=u*Math.PI*2,nx=Math.sin(phi)*Math.cos(theta),ny=Math.cos(phi),nz=Math.sin(phi)*Math.sin(theta);positions.push(nx*radius,ny*radius,nz*radius);normals.push(nx,ny,nz)}}for(let y=0;y<h;y++)for(let x=0;x<w;x++){const a=y*(w+1)+x,b=a+w+1;indices.push(a,b,a+1,b,b+1,a+1)}return{positions,normals,indices}}
function torus(radius,tube,radial=64,tubular=10){return torusArc(radius,tube,0,Math.PI*2,radial,tubular,true)}
function torusArc(radius,tube,start,end,radial=64,tubular=10,closed=false){const positions=[],normals=[],indices=[],rings=closed?radial:radial+1;for(let i=0;i<rings;i++){const u=start+(i/(closed?radial:radial))*(end-start),cu=Math.cos(u),su=Math.sin(u);for(let j=0;j<tubular;j++){const v=(j/tubular)*Math.PI*2,cv=Math.cos(v),sv=Math.sin(v);positions.push((radius+tube*cv)*cu,(radius+tube*cv)*su,tube*sv);normals.push(cv*cu,cv*su,sv)}}const maxI=closed?radial:radial;for(let i=0;i<maxI;i++){const ni=closed?(i+1)%radial:i+1;for(let j=0;j<tubular;j++){const nj=(j+1)%tubular,a=i*tubular+j,b=ni*tubular+j,c=ni*tubular+nj,d=i*tubular+nj;indices.push(a,b,c,a,c,d)}}return{positions,normals,indices}}
function disc(radius,segments=48){const positions=[0,0,0],normals=[0,0,1],indices=[];for(let i=0;i<=segments;i++){const a=(i/segments)*Math.PI*2;positions.push(Math.cos(a)*radius,Math.sin(a)*radius,0);normals.push(0,0,1)}for(let i=1;i<=segments;i++)indices.push(0,i,i+1);return{positions,normals,indices}}
function ribbon(points,width){const positions=[],normals=[],indices=[];for(let i=0;i<points.length;i++){const p=points[i],prev=points[Math.max(0,i-1)],next=points[Math.min(points.length-1,i+1)],dx=next[0]-prev[0],dz=next[2]-prev[2],len=Math.hypot(dx,dz)||1,nx=-dz/len,nz=dx/len;positions.push(p[0]+nx*width/2,p[1],p[2]+nz*width/2,p[0]-nx*width/2,p[1],p[2]-nz*width/2);normals.push(0,1,0,0,1,0)}for(let i=0;i<points.length-1;i++){const a=i*2,b=a+1,c=a+2,d=a+3;indices.push(a,c,d,a,d,b)}return{positions,normals,indices}}
function qEuler(x=0,y=0,z=0){const c1=Math.cos(x/2),c2=Math.cos(y/2),c3=Math.cos(z/2),s1=Math.sin(x/2),s2=Math.sin(y/2),s3=Math.sin(z/2);const q=[s1*c2*c3+c1*s2*s3,c1*s2*c3-s1*c2*s3,c1*c2*s3+s1*s2*c3,c1*c2*c3-s1*s2*s3];const l=Math.hypot(...q)||1;return q.map(v=>v/l)}
function encodeGlb(json,bin){const jb=pad4(Buffer.from(JSON.stringify(json),'utf8'),0x20),bb=pad4(bin,0),total=12+8+jb.length+8+bb.length,h=Buffer.alloc(12),jh=Buffer.alloc(8),bh=Buffer.alloc(8);h.writeUInt32LE(0x46546c67,0);h.writeUInt32LE(2,4);h.writeUInt32LE(total,8);jh.writeUInt32LE(jb.length,0);jh.writeUInt32LE(0x4e4f534a,4);bh.writeUInt32LE(bb.length,0);bh.writeUInt32LE(0x004e4942,4);return Buffer.concat([h,jh,jb,bh,bb])}
function pad4(buf,pad){const n=(4-buf.length%4)%4;return n?Buffer.concat([buf,Buffer.alloc(n,pad)]):buf}
function align4(n){return n+((4-n%4)%4)}
function minVec3(a){const o=[Infinity,Infinity,Infinity];for(let i=0;i<a.length;i+=3){o[0]=Math.min(o[0],a[i]);o[1]=Math.min(o[1],a[i+1]);o[2]=Math.min(o[2],a[i+2])}return o}
function maxVec3(a){const o=[-Infinity,-Infinity,-Infinity];for(let i=0;i<a.length;i+=3){o[0]=Math.max(o[0],a[i]);o[1]=Math.max(o[1],a[i+1]);o[2]=Math.max(o[2],a[i+2])}return o}
function aggregateBounds(geom,nodes,meshes){const min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];geom.forEach((g,mi)=>{const nodeIndex=nodes.findIndex(n=>n.mesh===mi),n=nodes[nodeIndex]||{},t=n.translation||[0,0,0],s=n.scale||[1,1,1];for(let i=0;i<g.positions.length;i+=3){for(let a=0;a<3;a++){const v=g.positions[i+a]*s[a]+t[a];min[a]=Math.min(min[a],v);max[a]=Math.max(max[a],v)}}});return{min:min.map(round),max:max.map(round),size:max.map((v,i)=>round(v-min[i]))}}
function round(v){return Number(v.toFixed(4))}

const authored = []
authored.push(writeAsset('home-entry-chamber-v1.glb', buildHome()))
authored.push(writeAsset('portal-ring-master-v1.glb', buildPortal()))
authored.push(writeAsset('urai-orb-avatar-v1.glb', buildOrb()))

const sourceReceipt = {
  schemaVersion: 2,
  sourceId: 'urai-home-authored-sanctuary-source-v2',
  authoredBy: 'URAI Labs',
  ownership: 'URAI Labs proprietary original geometry and animation authored for PR #952',
  license: 'URAI Labs internal proprietary; redistribution governed by repository license and asset receipts',
  tool: 'deterministic dependency-free Node.js glTF 2.0 authoring pipeline',
  generator: 'scripts/author-home-finalization-assets.mjs',
  coordinateSystem: 'glTF right-handed Y-up, meters',
  releaseBoundary: 'review candidate only; visual approval, Meshopt compression, exact-head route proof, and narrow manifest promotion still required',
  assets: authored,
}
fs.writeFileSync(receiptPath, JSON.stringify(sourceReceipt, null, 2) + '\n')
console.log(JSON.stringify(sourceReceipt, null, 2))

