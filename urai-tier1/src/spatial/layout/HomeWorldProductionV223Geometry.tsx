'use client'
import {useMemo,useRef} from 'react'
import {useTexture} from '@react-three/drei'
import {useFrame,type ThreeEvent} from '@react-three/fiber'
import * as THREE from 'three'
import type {OrbState} from '@/app/home/orbStateController'

export const T=[
  '/assets/urai/home-production/cc0/rock-tile-floor/rock-tile-floor-diff-1k.webp',
  '/assets/urai/home-production/cc0/rock-tile-floor/rock-tile-floor-normal-gl-1k.webp',
  '/assets/urai/home-production/cc0/rock-tile-floor/rock-tile-floor-arm-1k.webp',
] as const
export const SPAWN=new THREE.Vector3(0,.04,4.6)
export const ORB=new THREE.Vector3(-.45,1.02,-7.45)
export const GROUND=new THREE.Vector3(-4.85,0,-8.25)
export const LIFE_MAP=new THREE.Vector3(4.85,0,-8.25)
export const BOUNDS={minX:-7.5,maxX:7.5,minZ:-14.4,maxZ:6.8}

function maps(){
  const[c,n,a]=useTexture(T as unknown as string[])
  return useMemo(()=>[c,n,a].map((s,i)=>{
    const q=s.clone(); q.wrapS=q.wrapT=THREE.RepeatWrapping; q.repeat.set(3.2,4.2); q.anisotropy=8
    q.colorSpace=i?THREE.NoColorSpace:THREE.SRGBColorSpace; q.needsUpdate=true; return q
  }),[a,c,n])
}

function basinFeature(x:number,z:number,p:THREE.Vector3){
  const dx=x-p.x,dz=z-p.z,r=Math.hypot(dx,dz); if(r>3.7)return 0
  const f=1-THREE.MathUtils.smoothstep(r,2.2,3.7)
  return (-.48*Math.exp(-(dx*dx*.34+dz*dz*.2))+.2*Math.cos(dx*1.4)*Math.exp(-r*r*.18))*f
}
function lifeFeature(x:number,z:number,p:THREE.Vector3){
  const dx=x-p.x,dz=z-p.z,r=Math.hypot(dx,dz); if(r>3.8)return 0
  const f=1-THREE.MathUtils.smoothstep(r,2.4,3.8)
  return (.18*Math.exp(-Math.pow(dx-.18*dz,2)*2.3)-.16*Math.exp(-(dx*dx*.28+(dz-.8)**2*.5)))*f
}
export function height(x:number,z:number){
  const depth=THREE.MathUtils.clamp((6.5-z)/30,0,1)
  const center=.45*Math.sin(z*.16)+.22*Math.sin(z*.39)
  const dx=x-center, edge=Math.max(0,Math.abs(dx)-3.9)
  const floor=-.82-.15*Math.exp(-Math.pow(dx/3.8,4))+.07*Math.sin(x*.82+z*.27)+.045*Math.sin(x*2.1-z*.44)
  const side=Math.pow(edge/7.8,1.45)*(1.2+depth*3.5)
  const weather=.18*Math.sin(Math.abs(dx)*1.7+z*.35)*THREE.MathUtils.smoothstep(Math.abs(dx),4.4,10.8)
    +.11*Math.sin(Math.abs(dx)*3.6-z*.22)*THREE.MathUtils.smoothstep(Math.abs(dx),5.2,11.5)
  return floor+side+weather+basinFeature(x,z,GROUND)+lifeFeature(x,z,LIFE_MAP)
}

function rockColor(x:number,y:number,z:number){
  const deep=new THREE.Color('#30382f'),sage=new THREE.Color('#596854'),sand=new THREE.Color('#8a7359'),pale=new THREE.Color('#a58e6c')
  const strata=.5+.5*Math.sin(y*5.7+z*.23+x*.11),age=THREE.MathUtils.clamp((5-z)/32,0,1),side=THREE.MathUtils.clamp(Math.abs(x)/10,0,1)
  return deep.clone().lerp(sage,.3+strata*.3).lerp(sand,age*.18+side*.12).lerp(pale,Math.max(0,strata-.82)*.22)
}

function terrainGeometry(){
  const xs=96,zs=150,p:number[]=[],uv:number[]=[],c:number[]=[],idx:number[]=[]
  for(let iz=0;iz<=zs;iz++){
    const vz=iz/zs,z=7.2-vz*34.5
    for(let ix=0;ix<=xs;ix++){
      const vx=ix/xs,x=-13.8+vx*27.6,y=height(x,z),q=rockColor(x,y,z)
      p.push(x,y,z);uv.push(vx*5.5,vz*7.5);c.push(q.r,q.g,q.b)
    }
  }
  for(let iz=0;iz<zs;iz++)for(let ix=0;ix<xs;ix++){
    const a=iz*(xs+1)+ix,b=a+1,d=a+xs+1,e=d+1;(ix+iz)&1?idx.push(a,b,e,a,e,d):idx.push(a,b,d,b,e,d)
  }
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setAttribute('color',new THREE.Float32BufferAttribute(c,3));g.setIndex(idx);g.computeVertexNormals();return g
}
export function Terrain({walk,onGround,onLifeMap}:{walk:(e:ThreeEvent<MouseEvent>)=>void;onGround:()=>void;onLifeMap:()=>void}){
  const m=maps(),g=useMemo(terrainGeometry,[])
  return <mesh name="home-v223-weathered-valley-floor" geometry={g} receiveShadow onClick={e=>{
    e.stopPropagation();const dg=Math.hypot(e.point.x-GROUND.x,e.point.z-GROUND.z),dl=Math.hypot(e.point.x-LIFE_MAP.x,e.point.z-LIFE_MAP.z)
    dg<2.55?onGround():dl<2.55?onLifeMap():walk(e)
  }}><meshStandardMaterial vertexColors normalMap={m[1]} normalScale={new THREE.Vector2(.42,.42)} roughnessMap={m[2]} roughness={.98} metalness={0}/></mesh>
}

function shelfGeometry(side:-1|1,band:number){
  const zs=62,p:number[]=[],c:number[]=[],idx:number[]=[]
  for(let iz=0;iz<=zs;iz++){
    const v=iz/zs,z=5-v*30.5,depth=THREE.MathUtils.clamp((5-z)/30.5,0,1)
    const inner=4.45+band*.88+depth*(.75+band*.26)+.22*Math.sin(z*.38+band*1.7)
    const outer=inner+1.05+.28*Math.sin(z*.22+band*.91)
    const lift=.16+band*.72+depth*(.42+band*.43)
    for(const [x0,t] of [[inner,0],[outer,1]] as const){
      const x=side*x0,y=height(x,z)+lift+t*(.12+.11*Math.sin(z*.6+band)),q=rockColor(x,y,z)
      p.push(x,y,z);c.push(q.r,q.g,q.b)
    }
  }
  for(let iz=0;iz<zs;iz++){
    const a=iz*2,b=a+1,d=a+2,e=a+3; side<0?idx.push(a,b,d,b,e,d):idx.push(a,d,b,b,d,e)
  }
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setAttribute('color',new THREE.Float32BufferAttribute(c,3));g.setIndex(idx);g.computeVertexNormals();return g
}
function StrataShelf({side,band}:{side:-1|1;band:number}){
  const g=useMemo(()=>shelfGeometry(side,band),[side,band])
  return <mesh geometry={g} castShadow receiveShadow><meshStandardMaterial vertexColors roughness={.99} metalness={0} side={THREE.DoubleSide}/></mesh>
}
export function Escarpment({side}:{side:-1|1}){
  return <group name={side<0?'home-v223-port-broken-strata':'home-v223-starboard-broken-strata'}>
    {[0,1,2,3,4].map(b=><StrataShelf key={b} side={side} band={b}/>)}
  </group>
}

function Boulder({position,scale,rotation=[0,0,0],color='#596252'}:{position:[number,number,number];scale:[number,number,number];rotation?:[number,number,number];color?:string}){
  const g=useMemo(()=>new THREE.DodecahedronGeometry(1,1),[])
  return <mesh geometry={g} position={position} scale={scale} rotation={rotation} castShadow receiveShadow>
    <meshStandardMaterial color={color} roughness={.98} metalness={0}/>
  </mesh>
}
function Seam({points,color}:{points:[number,number,number][];color:string}){
  const g=useMemo(()=>new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),24,.045,6,false),[points])
  return <mesh geometry={g}><meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.35} roughness={.8}/></mesh>
}
function GroundPlace(){
  const y=height(GROUND.x,GROUND.z)
  return <group name="home-v223-ground-sheltered-memory-basin">
    <Boulder position={[GROUND.x-1.45,y+.38,GROUND.z+.4]} scale={[1.0,.82,.78]} rotation={[.08,.35,-.16]}/>
    <Boulder position={[GROUND.x+1.35,y+.32,GROUND.z+.35]} scale={[.9,.72,.72]} rotation={[-.08,-.5,.18]}/>
    <Boulder position={[GROUND.x-.65,y+.18,GROUND.z-1.05]} scale={[.9,.45,.58]} rotation={[.18,.2,.04]} color="#6a5c49"/>
    <Boulder position={[GROUND.x+.55,y+.15,GROUND.z-1.15]} scale={[.78,.42,.6]} rotation={[-.12,-.35,-.06]} color="#665947"/>
    <Seam color="#c87842" points={[[GROUND.x-1.0,y+.05,GROUND.z+.2],[GROUND.x-.45,y-.02,GROUND.z-.05],[GROUND.x+.05,y-.04,GROUND.z-.16],[GROUND.x+.72,y+.02,GROUND.z+.05]]}/>
    <pointLight position={[GROUND.x,y+.6,GROUND.z-.1]} color="#db8751" intensity={2.45} distance={5.5} decay={2}/>
  </group>
}
function MemoryTerrace({position,scale,rotation=[0,0,0]}:{position:[number,number,number];scale:[number,number,number];rotation?:[number,number,number]}){
  const g=useMemo(()=>new THREE.BoxGeometry(1,1,1,3,1,3),[])
  return <mesh geometry={g} position={position} scale={scale} rotation={rotation} castShadow receiveShadow>
    <meshStandardMaterial color="#596b5e" roughness={.96} metalness={0}/>
  </mesh>
}
function LifeMapPlace(){
  const y=height(LIFE_MAP.x,LIFE_MAP.z)
  return <group name="home-v223-life-map-ascending-memory-terraces">
    <MemoryTerrace position={[LIFE_MAP.x,y+.13,LIFE_MAP.z+.75]} scale={[2.25,.24,1.15]} rotation={[0,-.12,.02]}/>
    <MemoryTerrace position={[LIFE_MAP.x+.35,y+.45,LIFE_MAP.z-.2]} scale={[1.9,.28,.9]} rotation={[0,.18,-.03]}/>
    <MemoryTerrace position={[LIFE_MAP.x-.2,y+.82,LIFE_MAP.z-1.05]} scale={[1.5,.25,.78]} rotation={[0,-.25,.05]}/>
    <MemoryTerrace position={[LIFE_MAP.x+.42,y+1.14,LIFE_MAP.z-1.75]} scale={[1.12,.22,.68]} rotation={[0,.3,-.04]}/>
    <Seam color="#63c4a1" points={[[LIFE_MAP.x-1.0,y+.28,LIFE_MAP.z+.8],[LIFE_MAP.x-.28,y+.52,LIFE_MAP.z-.05],[LIFE_MAP.x+.28,y+.86,LIFE_MAP.z-.9],[LIFE_MAP.x+.48,y+1.18,LIFE_MAP.z-1.65]]}/>
    <pointLight position={[LIFE_MAP.x,y+1.0,LIFE_MAP.z-.6]} color="#71c7a9" intensity={2.2} distance={5.4} decay={2}/>
    <pointLight position={[LIFE_MAP.x+.65,y+1.35,LIFE_MAP.z-1.6]} color="#a890ce" intensity={1.05} distance={3.8} decay={2}/>
  </group>
}
export function DestinationLights(){return <><GroundPlace/><LifeMapPlace/></>}

function wrapAngle(a:number){return Math.atan2(Math.sin(a),Math.cos(a))}
function orbVertex(v:THREE.Vector3,inner=false){
  const n=v.clone().normalize(),th=Math.atan2(n.z,n.x),ph=Math.acos(THREE.MathUtils.clamp(n.y,-1,1)),sp=Math.sin(ph)
  const front=Math.exp(-Math.pow(wrapAngle(th-Math.PI/2)/.58,2))*Math.exp(-Math.pow((ph-1.48)/.72,2))
  const sideBulge=.34*Math.exp(-Math.pow(wrapAngle(th+.75)/.68,2))*Math.exp(-Math.pow((ph-1.12)/.74,2))
  const lowerFold=.2*Math.exp(-Math.pow(wrapAngle(th-2.5)/.72,2))*Math.exp(-Math.pow((ph-2.05)/.58,2))
  const texture=.09*Math.sin(th*3.2+ph*2.1)+.045*Math.sin(th*6.1-ph*2.4)+.025*Math.cos(th*10.3+ph*3.8)
  const r=(inner?.58:.84)*Math.max(.42,1+texture+sideBulge+lowerFold-front*.42)
  const lean=.22*sp*sp*Math.max(0,Math.cos(th+.75))
  return new THREE.Vector3(r*sp*Math.cos(th)*1.16+lean-.12,r*Math.cos(ph)*1.02+.12*Math.sin(ph*2.2+th*.55),r*sp*Math.sin(th)*.9+.04*Math.sin(th*2.2)*sp*sp)
}
function orbGeometry(inner=false,cut=false){
  const src=new THREE.IcosahedronGeometry(1,inner?4:5).toNonIndexed(),a=src.getAttribute('position') as THREE.BufferAttribute,p:number[]=[],c:number[]=[]
  const deep=new THREE.Color(inner?'#102b27':'#263d35'),moss=new THREE.Color(inner?'#42a486':'#718b72'),warm=new THREE.Color(inner?'#d59b61':'#9b8061')
  for(let i=0;i<a.count;i+=3){
    const raw=[0,1,2].map(k=>new THREE.Vector3(a.getX(i+k),a.getY(i+k),a.getZ(i+k)))
    const cent=raw[0].clone().add(raw[1]).add(raw[2]).normalize(),th=Math.atan2(cent.z,cent.x),ph=Math.acos(THREE.MathUtils.clamp(cent.y,-1,1))
    const hole=cut&&Math.abs(wrapAngle(th-Math.PI/2))<.3&&Math.abs(ph-1.48)<.5&&Math.sin(th*7.3+ph*10.7)>-.35
    if(hole)continue
    for(const rv of raw){
      const q=orbVertex(rv,inner),nn=rv.clone().normalize(),t=Math.atan2(nn.z,nn.x),f=Math.acos(THREE.MathUtils.clamp(nn.y,-1,1))
      const band=.5+.5*Math.sin(f*8.8+t*2.5),heat=Math.max(0,Math.cos(t-Math.PI/2))*Math.sin(f)**2,col=deep.clone().lerp(moss,.28+band*.4).lerp(warm,heat*(inner?.42:.12))
      p.push(q.x,q.y,q.z);c.push(col.r,col.g,col.b)
    }
  }
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setAttribute('color',new THREE.Float32BufferAttribute(c,3));g.computeVertexNormals();return g
}
type Posture={s:[number,number,number];r:[number,number];speed:number;inner:number}
const P:Record<OrbState,Posture>={
  dormant:{s:[.72,.64,.76],r:[.1,0,-.08],speed:.1,inner:-.2},idle:{s:[1.0,.86,.88],r:[-.08,0,-.06],speed:.36,inner:.08},attention:{s:[1.18,.92,.78],r:[-.18,.08,.16],speed:.72,inner:.52},listening:{s:[.86,1.12,.82],r:[.24,-.08,-.12],speed:.27,inner:-.58},thinking:{s:[1.2,.8,1.0],r:[-.28,.12,.2],speed:.22,inner:.9},speaking:{s:[1.24,.9,.74],r:[.1,-.06,-.22],speed:1.04,inner:1.1},guiding:{s:[.82,1.18,.78],r:[-.3,.04,.2],speed:.5,inner:-.78},reflecting:{s:[.88,.82,1.12],r:[.28,.1,-.18],speed:.16,inner:.4},calming:{s:[1.08,.76,.94],r:[-.03,-.05,.06],speed:.14,inner:-.3},privacy:{s:[.66,.7,.64],r:[.34,.12,.26],speed:.08,inner:1},warning:{s:[1.26,.9,.66],r:[-.34,-.08,-.28],speed:1.3,inner:-1.18},transition:{s:[.74,1.2,.7],r:[-.38,.08,.28],speed:.86,inner:.68}
}
export function Orb({state,reducedMotion,onOpen}:{state:OrbState;reducedMotion:boolean;onOpen:()=>void}){
  const group=useRef<THREE.Group>(null),inside=useRef<THREE.Mesh>(null),outer=useMemo(()=>orbGeometry(false,true),[]),inner=useMemo(()=>orbGeometry(true,false),[]),p=P[state]
  useFrame(({clock})=>{if(!group.current)return;const t=clock.elapsedTime*p.speed,b=reducedMotion?1:1+Math.sin(t*.8)*.018;group.current.scale.set(p.s[0]*b,p.s[1]*b,p.s[2]*b);group.current.rotation.set(p.r[0],p.r[1]+(reducedMotion?0:Math.sin(t*.92)*.05),p.r[2]);if(inside.current&&!reducedMotion)inside.current.rotation.y=p.inner+Math.sin(t*1.7)*.2})
  return <group ref={group} name="home-v223-open-cavity-living-memory-presence" position={ORB} onClick={e=>{e.stopPropagation();onOpen()}}>
    <mesh geometry={outer} castShadow receiveShadow><meshStandardMaterial vertexColors roughness={.76} metalness={0} emissive={state==='warning'?'#59231c':'#0d2b23'} emissiveIntensity={state==='warning'?.26:.09}/></mesh>
    <mesh ref={inside} geometry={inner} scale={[.72,.72,.72]} rotation={[.06,p.inner,-.04]}><meshStandardMaterial vertexColors roughness={.66} metalness={0} emissive="#35a887" emissiveIntensity={state==='dormant'?.12:.72}/></mesh>
    <pointLight position={[0,0,.35]} color={state==='warning'?'#c45b42':'#68d0aa'} intensity={state==='dormant'?.25:1.55} distance={4.2} decay={2}/>
  </group>
}
