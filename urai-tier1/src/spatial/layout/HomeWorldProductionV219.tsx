'use client'

import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import { useTexture } from '@react-three/drei'
import { useCallback, useEffect, useMemo, useRef, useState, type MutableRefObject } from 'react'
import * as THREE from 'three'
import { resolveOrbSensoryOutput, URAI_ORB_STATE_EVENT, type OrbState, type OrbStateEventDetail } from '@/app/home/orbStateController'
import { MobileMovementPad, stepEmbodiedMotion, useDragLook, useMovementInput, type MovementInput } from '@/spatial/navigation/EmbodiedNavigation'
import { requestUraiWorldOrbOpen, requestUraiWorldTravel } from '@/spatial/world/worldEvents'
import styles from './HomeWorldProduction.module.css'

const ROCK_DIFFUSE='/assets/urai/home-production/cc0/rock-tile-floor/rock-tile-floor-diff-1k.webp'
const ROCK_NORMAL='/assets/urai/home-production/cc0/rock-tile-floor/rock-tile-floor-normal-gl-1k.webp'
const ROCK_ARM='/assets/urai/home-production/cc0/rock-tile-floor/rock-tile-floor-arm-1k.webp'
const SPAWN=new THREE.Vector3(0,.04,4.6), ORB=new THREE.Vector3(-.42,1.72,-7.35), GROUND=new THREE.Vector3(-4.85,0,-8.25), LIFE_MAP=new THREE.Vector3(4.85,0,-8.25)
const BOUNDS={minX:-7.4,maxX:7.4,minZ:-14.2,maxZ:6.7}
type Nearby='orb'|'ground'|'life-map'|null
type Transition='none'|'ground'|'life-map'
type Props={onOrbOpen?:()=>void;webglAvailable?:boolean}
type StoneMaps={color:THREE.Texture;normal:THREE.Texture;arm:THREE.Texture}

function useStoneMaps():StoneMaps{
  const[c,n,a]=useTexture([ROCK_DIFFUSE,ROCK_NORMAL,ROCK_ARM])
  return useMemo(()=>{
    const prep=(s:THREE.Texture,srgb=false)=>{const t=s.clone();t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(10,14);t.anisotropy=8;t.colorSpace=srgb?THREE.SRGBColorSpace:THREE.NoColorSpace;t.needsUpdate=true;return t}
    return{color:prep(c,true),normal:prep(n),arm:prep(a)}
  },[a,c,n])
}

function height(x:number,z:number){
  const depth=THREE.MathUtils.clamp((6-z)/24,0,1), lateral=Math.abs(x)/9.5
  const centralDrain=-.24*Math.exp(-Math.pow(x/2.7,4))
  const broadRise=Math.pow(lateral,2.35)*(0.35+depth*2.65)
  const strata=.22*Math.sin(z*.62+x*.12)+.12*Math.sin(z*1.46-x*.44)+.07*Math.cos(x*1.9+z*.31)
  const erosion=(Math.sin(x*.73+z*.41)*.18+Math.cos(x*1.37-z*.79)*.1)*(0.28+lateral*.72)
  const portShoulder=Math.exp(-(Math.pow((x+6.7)/2.0,2)+Math.pow((z+5.4)/5.8,2)))*1.8
  const starShoulder=Math.exp(-(Math.pow((x-6.7)/2.05,2)+Math.pow((z+7.4)/5.4,2)))*2.05
  const farShelf=Math.pow(depth,3.25)*(2.35+.38*Math.sin(x*.31))
  return-.68+centralDrain+broadRise+strata*.3+erosion+portShoulder+starShoulder+farShelf
}

function Terrain({onWalk}:{onWalk:(e:ThreeEvent<MouseEvent>)=>void}){
  const maps=useStoneMaps()
  const g=useMemo(()=>{
    const xs=118,zs=148,p:number[]=[],uv:number[]=[],idx:number[]=[]
    for(let zi=0;zi<=zs;zi++){const tz=zi/zs,z=6.3-tz*24.8;for(let xi=0;xi<=xs;xi++){const tx=xi/xs,x=-9.8+tx*19.6;p.push(x,height(x,z),z);uv.push(tx*11,tz*15)}}
    for(let zi=0;zi<zs;zi++)for(let xi=0;xi<xs;xi++){const a=zi*(xs+1)+xi,b=a+1,c=a+xs+1,d=c+1;if((xi+zi)&1)idx.push(a,b,d,a,d,c);else idx.push(a,b,c,b,d,c)}
    const q=new THREE.BufferGeometry();q.setAttribute('position',new THREE.Float32BufferAttribute(p,3));q.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));q.setIndex(idx);q.computeVertexNormals();return q
  },[])
  return <mesh name="home-v219-continuous-weathered-sanctuary" geometry={g} receiveShadow onClick={onWalk}><meshStandardMaterial color="#536b59" map={maps.color} normalMap={maps.normal} normalScale={new THREE.Vector2(.62,.62)} roughnessMap={maps.arm} roughness={.96} metalness={.008}/></mesh>
}

function geologicalMass(seed:number){
  const lon=34,lat=22,p:number[]=[],uv:number[]=[],idx:number[]=[]
  for(let j=0;j<=lat;j++){const v=j/lat,phi=Math.PI*v;for(let i=0;i<lon;i++){const u=i/lon,theta=u*Math.PI*2;const noise=.11*Math.sin(theta*3.2+seed)+.075*Math.sin(phi*5.1+theta*1.3-seed*.2)+.045*Math.cos(theta*7.4-phi*2.1+seed);const r=1+noise;const flatten=.84+.16*Math.sin(phi);p.push(Math.sin(phi)*Math.cos(theta)*r,Math.cos(phi)*r,Math.sin(phi)*Math.sin(theta)*r*flatten);uv.push(u,v)}}
  for(let j=0;j<lat;j++)for(let i=0;i<lon;i++){const n=(i+1)%lon,a=j*lon+i,b=j*lon+n,c=(j+1)*lon+i,d=(j+1)*lon+n;idx.push(a,b,c,b,d,c)}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();return g
}

function Rock({name,position,scale,seed,tint,rotation=[0,0,0]}:{name:string;position:[number,number,number];scale:[number,number,number];seed:number;tint:string;rotation?:[number,number,number]}){
  const maps=useStoneMaps(),g=useMemo(()=>geologicalMass(seed),[seed])
  return <mesh name={name} geometry={g} position={position} scale={scale} rotation={rotation} castShadow receiveShadow><meshStandardMaterial color={tint} map={maps.color} normalMap={maps.normal} normalScale={new THREE.Vector2(.42,.42)} roughnessMap={maps.arm} roughness={.94} metalness={.008}/></mesh>
}

function EnvironmentMasses(){
  return <>
    <Rock name="home-v219-port-near-ridge" position={[-8.7,1.15,-5.0]} scale={[3.8,2.65,5.0]} seed={21} tint="#34493d" rotation={[0,-.12,.04]}/>
    <Rock name="home-v219-port-far-ridge" position={[-7.8,3.05,-15.5]} scale={[5.0,4.3,5.1]} seed={23} tint="#2b4036" rotation={[0,-.22,.12]}/>
    <Rock name="home-v219-starboard-near-ridge" position={[8.75,1.35,-6.4]} scale={[3.9,2.75,4.8]} seed={25} tint="#374d41" rotation={[0,.13,-.04]}/>
    <Rock name="home-v219-starboard-far-ridge" position={[7.5,3.25,-15.9]} scale={[5.2,4.5,5.3]} seed={27} tint="#2c4238" rotation={[0,.17,-.1]}/>
    <Rock name="home-v219-far-memory-shelf" position={[.6,3.8,-18]} scale={[7.5,2.7,2.8]} seed={31} tint="#293d35" rotation={[0,.04,.02]}/>
  </>
}

function placePatch(kind:'ground'|'life-map'){
  const n=44,p:number[]=[],uv:number[]=[],idx:number[]=[],half=2.65
  for(let z=0;z<=n;z++){const vz=z/n,lz=-half+vz*half*2;for(let x=0;x<=n;x++){const vx=x/n,lx=-half+vx*half*2;const radius=Math.sqrt(lx*lx+lz*lz)/half,fade=Math.max(0,1-THREE.MathUtils.smoothstep(radius,.66,1));let y=0
    if(kind==='ground'){
      const hollow=-.38*Math.exp(-(lx*lx*.42+lz*lz*.5))
      const rear=Math.exp(-(Math.pow(lx*.62,2)+Math.pow((lz+1.45)*.62,2)))*(1.15+.24*Math.sin(lx*2.2))
      const port=Math.exp(-(Math.pow((lx+1.55)*.86,2)+Math.pow((lz+.15)*.62,2)))*.58
      y=(hollow+rear+port+.08*Math.sin(lx*2.7+lz*1.9))*fade
    }else{
      const spine=Math.exp(-Math.pow(lx*.68-.18*Math.sin(lz*1.3),2)*3.3)*(.25+(vz*.92))
      const branchA=Math.exp(-Math.pow(lx+.95-lz*.23,2)*4.8)*Math.exp(-Math.pow(lz+.25,2)*.32)*.72
      const branchB=Math.exp(-Math.pow(lx-.85+lz*.18,2)*5.1)*Math.exp(-Math.pow(lz-.55,2)*.38)*.63
      const ascent=Math.max(0,(lz+half)/(half*2))*1.05
      y=(spine+branchA+branchB+ascent*.55+.09*Math.sin(lx*3.1-lz*2.2))*fade
    }
    p.push(lx,y,lz);uv.push(vx*4,vz*4)}}
  for(let z=0;z<n;z++)for(let x=0;x<n;x++){const a=z*(n+1)+x,b=a+1,c=a+n+1,d=c+1;idx.push(a,b,c,b,d,c)}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();return g
}

function GroundPlace({onOpen}:{onOpen:()=>void}){
  const maps=useStoneMaps(),base=height(-4.85,-8.25),g=useMemo(()=>placePatch('ground'),[])
  return <group name="home-v219-ground-place" position={[-4.85,base+.04,-8.25]} onClick={e=>{e.stopPropagation();onOpen()}}>
    <mesh name="ground-v219-rooted-shelf" geometry={g} receiveShadow castShadow><meshStandardMaterial color="#40594a" map={maps.color} normalMap={maps.normal} normalScale={new THREE.Vector2(.48,.48)} roughnessMap={maps.arm} roughness={.96}/></mesh>
    <Rock name="ground-v219-weathered-overhang" position={[-.25,.92,-1.55]} scale={[2.15,.72,.82]} seed={43} tint="#344a3e" rotation={[0,.08,-.05]}/>
    <pointLight position={[-.2,.22,-.8]} color="#c49762" intensity={1.0} distance={3.8} decay={2}/>
  </group>
}

function ridgeRibbon(curve:THREE.CatmullRomCurve3,width=.34){
  const steps=54,p:number[]=[],uv:number[]=[],idx:number[]=[],up=new THREE.Vector3(0,1,0)
  for(let i=0;i<=steps;i++){const t=i/steps,c=curve.getPoint(t),tan=curve.getTangent(t).normalize(),side=new THREE.Vector3().crossVectors(up,tan).normalize();for(const s of[-1,1]){const rough=.055*Math.sin(i*.9+s*2.4);const q=c.clone().addScaledVector(side,s*(width+rough));p.push(q.x,q.y,q.z);uv.push(t,s>0?1:0)}}
  for(let i=0;i<steps;i++){const a=i*2,b=a+1,c=a+2,d=a+3;idx.push(a,b,c,b,d,c)}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();return g
}

function LifeMapPlace({onOpen}:{onOpen:()=>void}){
  const maps=useStoneMaps(),base=height(4.85,-8.25),g=useMemo(()=>placePatch('life-map'),[])
  const pathA=useMemo(()=>new THREE.CatmullRomCurve3([new THREE.Vector3(-1.7,.28,1.2),new THREE.Vector3(-.8,.58,.2),new THREE.Vector3(-.25,1.08,-.75),new THREE.Vector3(.15,1.55,-1.8)]),[])
  const pathB=useMemo(()=>new THREE.CatmullRomCurve3([new THREE.Vector3(1.55,.32,1.25),new THREE.Vector3(.85,.68,.25),new THREE.Vector3(.38,1.04,-.72),new THREE.Vector3(.15,1.55,-1.8)]),[])
  const ribbonA=useMemo(()=>ridgeRibbon(pathA,.28),[pathA]),ribbonB=useMemo(()=>ridgeRibbon(pathB,.25),[pathB])
  return <group name="home-v219-life-map-place" position={[4.85,base+.03,-8.25]} onClick={e=>{e.stopPropagation();onOpen()}}>
    <mesh name="lifemap-v219-rooted-foundation" geometry={g} receiveShadow castShadow><meshStandardMaterial color="#48534f" map={maps.color} normalMap={maps.normal} normalScale={new THREE.Vector2(.45,.45)} roughnessMap={maps.arm} roughness={.93}/></mesh>
    <mesh name="lifemap-v219-lineage-ridge-port" geometry={ribbonA} castShadow receiveShadow><meshStandardMaterial color="#687067" map={maps.color} roughness={.88}/></mesh>
    <mesh name="lifemap-v219-lineage-ridge-starboard" geometry={ribbonB} castShadow receiveShadow><meshStandardMaterial color="#5f6b64" map={maps.color} roughness={.9}/></mesh>
    <Rock name="lifemap-v219-history-crown" position={[.12,1.5,-1.9]} scale={[1.0,.58,.72]} seed={67} tint="#58645c" rotation={[0,.16,.12]}/>
    <pointLight position={[.1,.9,-.8]} color="#a9c7b3" intensity={.92} distance={4.4} decay={2}/>
  </group>
}

function orbGeometry(){
  const nu=68,nv=42,p:number[]=[],c:number[]=[],idx:number[]=[],shadow=new THREE.Color('#163b31'),moss=new THREE.Color('#4c8c70'),warm=new THREE.Color('#bd8e5f')
  for(let j=0;j<=nv;j++){const v=j/nv,phi=Math.PI*v;for(let i=0;i<nu;i++){const u=i/nu,theta=u*Math.PI*2,s=Math.sin(phi),lobe=.19*Math.sin(theta*2.25+phi*.7)+.13*Math.sin(theta*3.8-phi*1.55)+.075*Math.cos(theta*7.2+phi*2.1),crease=-.16*Math.exp(-Math.pow(Math.sin(theta-.28),2)*28)*Math.pow(s,2.4),r=.72*(1+lobe*s+crease);const lean=.13*Math.sin(phi*1.7)*(.6+.4*Math.cos(theta+.5));const x=r*s*Math.cos(theta)*(.84+.12*Math.cos(phi))+lean;const y=1.04*Math.cos(phi)+.12*Math.sin(phi*2.4+theta*.75)+.055*Math.sin(theta*5.2)*s;const z=r*s*Math.sin(theta)*(.70+.11*Math.sin(theta-.4));p.push(x,y,z);const band=.5+.5*Math.sin(phi*11.5+theta*2.6),glow=Math.max(0,Math.cos(theta-.7))*Math.pow(s,2.5);const q=shadow.clone().lerp(moss,.22+band*.48).lerp(warm,glow*.2);c.push(q.r,q.g,q.b)}}
  for(let j=0;j<nv;j++)for(let i=0;i<nu;i++){const n=(i+1)%nu,a=j*nu+i,b=j*nu+n,d=(j+1)*nu+i,e=(j+1)*nu+n;idx.push(a,b,d,b,e,d)}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setAttribute('color',new THREE.Float32BufferAttribute(c,3));g.setIndex(idx);g.computeVertexNormals();return g
}

function orbStrata(seed:number){
  const points:THREE.Vector3[]=[]
  for(let k=0;k<34;k++){const t=k/33,phi=.38+Math.PI*.58*t,theta=seed+.42*Math.sin(t*Math.PI*2+seed);const s=Math.sin(phi),r=.725*(1+.08*Math.sin(theta*3.8-phi*1.55));points.push(new THREE.Vector3(r*s*Math.cos(theta)*.86+.13*Math.sin(phi*1.7),1.04*Math.cos(phi)+.12*Math.sin(phi*2.4+theta*.75),r*s*Math.sin(theta)*.72).multiplyScalar(1.015))}
  return new THREE.CatmullRomCurve3(points)
}

const POSTURE:Record<OrbState,{s:[number,number,number];r:[number,number,number];speed:number}>={
  dormant:{s:[.86,.76,.82],r:[.15,-.18,-.14],speed:.12},idle:{s:[1,.98,1],r:[-.08,.18,-.06],speed:.42},attention:{s:[1.1,1.12,.87],r:[-.16,.34,.14],speed:.72},listening:{s:[.88,1.24,.86],r:[.2,-.28,-.11],speed:.3},thinking:{s:[1.14,.9,1.1],r:[-.26,.52,.2],speed:.24},speaking:{s:[1.2,1.05,.82],r:[.1,.2,-.22],speed:1.02},guiding:{s:[.94,1.3,.86],r:[-.3,-.12,.18],speed:.54},reflecting:{s:[.9,1.0,1.18],r:[.24,.58,-.18],speed:.18},calming:{s:[1.1,.86,1.06],r:[-.05,-.22,.07],speed:.16},privacy:{s:[.8,.9,.76],r:[.34,.68,.25],speed:.1},warning:{s:[1.23,1.13,.75],r:[-.33,-.4,-.24],speed:1.3},transition:{s:[.86,1.36,.8],r:[-.4,.32,.27],speed:.84}
}

function OrbPresence({state,reducedMotion,onOpen}:{state:OrbState;reducedMotion:boolean;onOpen:()=>void}){
  const ref=useRef<THREE.Group>(null),g=useMemo(orbGeometry,[]),p=POSTURE[state],seamA=useMemo(()=>orbStrata(.45),[]),seamB=useMemo(()=>orbStrata(2.65),[])
  useFrame(({clock})=>{if(!ref.current)return;const t=clock.elapsedTime*p.speed,b=reducedMotion?1:1+Math.sin(t*.82)*.02;ref.current.scale.set(p.s[0]*b,p.s[1]*b,p.s[2]*b);ref.current.rotation.set(p.r[0],p.r[1]+(reducedMotion?0:Math.sin(t)*.11),p.r[2])})
  const seamIntensity=state==='warning'?1.1:state==='speaking'?.82:state==='listening'?.42:.3
  return <group ref={ref} name="home-v219-connected-asymmetric-living-memory-presence" position={ORB} scale={[.84,.84,.84]} onClick={e=>{e.stopPropagation();onOpen()}}>
    <mesh geometry={g} castShadow receiveShadow><meshPhysicalMaterial vertexColors roughness={.67} metalness={.02} clearcoat={.08} clearcoatRoughness={.72} emissive={state==='warning'?'#6d291d':'#0f2e27'} emissiveIntensity={state==='warning'?.26:.08}/></mesh>
    <mesh><tubeGeometry args={[seamA,40,.018,5,false]}/><meshBasicMaterial color={state==='warning'?'#d46b4f':'#86c9ab'} transparent opacity={seamIntensity} toneMapped={false}/></mesh>
    <mesh><tubeGeometry args={[seamB,40,.014,5,false]}/><meshBasicMaterial color="#c6a879" transparent opacity={seamIntensity*.72} toneMapped={false}/></mesh>
    <pointLight color={state==='warning'?'#c65d45':'#6db798'} intensity={state==='dormant'?.3:.72} distance={3.8} decay={2}/>
  </group>
}

function Cadence({active}:{active:boolean}){const{invalidate,setFrameloop}=useThree();useEffect(()=>{if(!active){setFrameloop('always');return}setFrameloop('demand');const id=window.setInterval(invalidate,280);invalidate();return()=>window.clearInterval(id)},[active,invalidate,setFrameloop]);return null}

function Rig({input,yaw,pitch,target,onNearby,transition,owner}:{input:MovementInput;yaw:MutableRefObject<number>;pitch:MutableRefObject<number>;target:MutableRefObject<THREE.Vector3|null>;onNearby:(n:Nearby)=>void;transition:Transition;owner:MutableRefObject<HTMLElement|null>}){
  const{camera,size}=useThree(),pos=useRef(SPAWN.clone()),vel=useRef(new THREE.Vector3()),last=useRef<Nearby>(null),frames=useRef(0)
  useEffect(()=>{camera.position.set(0,1.58,4.6);camera.lookAt(0,1.05,-9.2);camera.near=.1;camera.far=120;camera.updateProjectionMatrix()},[camera])
  useFrame((_,delta)=>{if(transition==='none')stepEmbodiedMotion({position:pos.current,velocity:vel.current,input,target,yaw:yaw.current,delta,speed:2.9,acceleration:9,deceleration:12,bounds:BOUNDS,arrivalRadius:.32});frames.current++;const shell=owner.current;if(shell){shell.dataset.homePlayerX=pos.current.x.toFixed(3);shell.dataset.homePlayerZ=pos.current.z.toFixed(3);shell.dataset.homeDistance=pos.current.distanceTo(SPAWN).toFixed(3);shell.dataset.homeDistanceOrb=Math.hypot(pos.current.x-ORB.x,pos.current.z-ORB.z).toFixed(3);shell.dataset.homeDistanceGround=Math.hypot(pos.current.x-GROUND.x,pos.current.z-GROUND.z).toFixed(3);shell.dataset.homeDistanceLifeMap=Math.hypot(pos.current.x-LIFE_MAP.x,pos.current.z-LIFE_MAP.z).toFixed(3);shell.dataset.homeMoving=vel.current.lengthSq()>.0004?'true':'false';shell.dataset.homeRenderedFrames=String(frames.current)}let near:Nearby=null,best=1e9;for(const[n,q,r]of[['orb',ORB,2.35],['ground',GROUND,2.65],['life-map',LIFE_MAP,2.65]] as const){const d=Math.hypot(pos.current.x-q.x,pos.current.z-q.z);if(d<r&&d<best){near=n;best=d}}if(camera instanceof THREE.PerspectiveCamera){const f=size.height>size.width?48:40;if(Math.abs(camera.fov-f)>.01){camera.fov=f;camera.updateProjectionMatrix()}}camera.position.lerp(pos.current.clone().add(new THREE.Vector3(Math.sin(yaw.current)*(near?1.45:.08),1.56,Math.cos(yaw.current)*(near?1.45:.08))),1-Math.pow(.0008,delta));camera.lookAt(pos.current.clone().add(new THREE.Vector3(-Math.sin(yaw.current)*10,1.22+pitch.current*.38,-Math.cos(yaw.current)*10)));if(near!==last.current){last.current=near;onNearby(near)}})
  return null
}

function Scene(props:{input:MovementInput;yaw:MutableRefObject<number>;pitch:MutableRefObject<number>;target:MutableRefObject<THREE.Vector3|null>;onNearby:(n:Nearby)=>void;transition:Transition;reducedMotion:boolean;orbState:OrbState;onOrb:()=>void;onGround:()=>void;onLifeMap:()=>void;onReady:()=>void;owner:MutableRefObject<HTMLElement|null>}){
  const walk=(e:ThreeEvent<MouseEvent>)=>{e.stopPropagation();props.target.current=new THREE.Vector3(THREE.MathUtils.clamp(e.point.x,BOUNDS.minX,BOUNDS.maxX),0,THREE.MathUtils.clamp(e.point.z,BOUNDS.minZ,BOUNDS.maxZ))}
  useEffect(()=>props.onReady(),[props])
  return <><Cadence active={props.reducedMotion}/><color attach="background" args={['#071417']}/><fogExp2 attach="fog" args={['#17352f',.021]}/><ambientLight intensity={.42} color="#cbd9cf"/><hemisphereLight args={['#bfd4ca','#342b23',.64]}/><directionalLight position={[-7,10,4]} intensity={1.55} color="#e2c798" castShadow shadow-mapSize-width={1024} shadow-mapSize-height={1024}/><directionalLight position={[8,6,-11]} intensity={.46} color="#789d90"/><Terrain onWalk={walk}/><EnvironmentMasses/><GroundPlace onOpen={props.onGround}/><LifeMapPlace onOpen={props.onLifeMap}/><OrbPresence state={props.orbState} reducedMotion={props.reducedMotion} onOpen={props.onOrb}/><Rig input={props.input} yaw={props.yaw} pitch={props.pitch} target={props.target} onNearby={props.onNearby} transition={props.transition} owner={props.owner}/></>
}

export function HomeWorldProductionV219({onOrbOpen=requestUraiWorldOrbOpen,webglAvailable=true}:Props){
  const[canvasReady,setCanvasReady]=useState(false),[sceneReady,setSceneReady]=useState(false),[nearby,setNearby]=useState<Nearby>(null),[dragging,setDragging]=useState(false),[reducedMotion,setReducedMotion]=useState(false),[mobile,setMobile]=useState(false),[orbState,setOrbState]=useState<OrbState>('idle'),[transition,setTransition]=useState<Transition>('none')
  const yaw=useRef(0),pitch=useRef(.06),target=useRef<THREE.Vector3|null>(null),worldRef=useRef<HTMLElement>(null),markReady=useCallback(()=>setSceneReady(true),[])
  const openOrb=useCallback(()=>{if(transition==='none'){setOrbState('attention');onOrbOpen()}},[onOrbOpen,transition]),openGround=useCallback(()=>{if(transition==='none'){target.current=null;setOrbState('transition');setTransition('ground')}},[transition]),openLifeMap=useCallback(()=>{if(transition==='none'){target.current=null;setOrbState('transition');setTransition('life-map')}},[transition]),interact=useCallback(()=>{if(nearby==='orb')openOrb();else if(nearby==='ground')openGround();else if(nearby==='life-map')openLifeMap()},[nearby,openGround,openLifeMap,openOrb])
  const input=useMovementInput({enabled:transition==='none',onInteract:interact,onReset:()=>{target.current=SPAWN.clone();yaw.current=0;pitch.current=.06}}),look=useDragLook({yaw,pitch,enabled:transition==='none',sensitivity:.003,minPitch:-.46,maxPitch:.5,onDragState:setDragging})
  useEffect(()=>{const rm=window.matchMedia('(prefers-reduced-motion: reduce)'),mq=window.matchMedia('(pointer: coarse), (max-width: 700px)'),apply=()=>{setReducedMotion(rm.matches);setMobile(mq.matches)};apply();rm.addEventListener?.('change',apply);mq.addEventListener?.('change',apply);return()=>{rm.removeEventListener?.('change',apply);mq.removeEventListener?.('change',apply)}},[])
  useEffect(()=>{const listener=(e:CustomEvent<OrbStateEventDetail>)=>{if(transition==='none')setOrbState(e.detail.state)};window.addEventListener(URAI_ORB_STATE_EVENT,listener);return()=>window.removeEventListener(URAI_ORB_STATE_EVENT,listener)},[transition])
  useEffect(()=>{if(transition==='none')return;const id=window.setTimeout(()=>transition==='ground'?requestUraiWorldTravel({destination:'infrastructure-hub',href:'/ground/',entryPortal:'home-ground',cameraCheckpoint:'home-ground-descent'}):requestUraiWorldTravel({destination:'life-map',href:'/life-map/?from=home-sky',entryPortal:'home-sky',cameraCheckpoint:'home-sky-ascent-complete'}),reducedMotion?720:1800);return()=>window.clearTimeout(id)},[reducedMotion,transition])
  useEffect(()=>{const cancel=(e:KeyboardEvent)=>{if(e.key==='Escape'&&transition!=='none'){e.preventDefault();setTransition('none');setOrbState('idle')}};window.addEventListener('keydown',cancel,true);return()=>window.removeEventListener('keydown',cancel,true)},[transition])
  if(!webglAvailable)return null
  const ready=canvasReady&&sceneReady,context=transition==='life-map'?'Ascending into your Life Map':transition==='ground'?'Descending into Ground':nearby==='orb'?'The Orb is here':nearby==='ground'?'The path descends':nearby==='life-map'?'The path rises into your Life Map':null
  return <main ref={worldRef} className={`${styles.world} urai-asset-home-world`} data-urai-home-production data-urai-true-3d="true" data-home-primary-owner="asset-driven" data-home-visible-world="v219-authored-inhabited-memory-sanctuary" data-home-world-character="production-cinematic-sacred-tech" data-home-physical-base="continuous-weathered-geology-camera-safe-traversal" data-home-visual-ownership="single-canvas-three-dimensional-geometry" data-home-desktop-mobile-world="same-scene" data-home-embodied-self="privacy-preserving-first-person" data-home-movement="walk-keyboard-click-touch" data-home-pointer-lock="false" data-home-assets-ready={ready?'true':'false'} data-home-ready={ready?'true':'warming'} data-home-input-ready={ready?'true':'false'} data-home-interaction-ready={ready?'true':'false'} data-home-player-x="0.000" data-home-player-z="4.600" data-home-distance="0.000" data-home-distance-orb={Math.hypot(SPAWN.x-ORB.x,SPAWN.z-ORB.z).toFixed(3)} data-home-distance-ground={Math.hypot(SPAWN.x-GROUND.x,SPAWN.z-GROUND.z).toFixed(3)} data-home-distance-life-map={Math.hypot(SPAWN.x-LIFE_MAP.x,SPAWN.z-LIFE_MAP.z).toFixed(3)} data-home-moving="false" data-home-rendered-frames="0" data-home-nearby={nearby??'none'} data-home-camera-mode={transition!=='none'?transition:dragging?'look':'embodied-first-person'} data-home-scene-phase={transition==='none'?'HOME':transition.toUpperCase()} data-home-portal-sequence={transition==='none'?'idle':`${transition}:traversal`} data-home-portal-lifecycle="environmental-approach-traversal-arrival" data-home-input-locked={transition!=='none'?'true':'false'} data-home-orb-state={orbState} data-home-orb-clip={resolveOrbSensoryOutput(orbState,reducedMotion,true).animation} data-home-orb-model-clip={reducedMotion?'stopped-reduced-motion':resolveOrbSensoryOutput(orbState,reducedMotion,true).animation} data-home-visual-grade="v219-literal-pixel-candidate-not-certified" data-home-final-art-revision="v219-retained-pixels-pending" data-home-live-art-revision="v219-authored-inhabited-memory-sanctuary" data-home-art-certification="fresh-exact-head-pixels-required" data-home-scanned-composition="v219-continuous-geology-rooted-destinations" data-home-runtime-assets="rock-tile-floor-diff-1k.webp rock-tile-floor-normal-gl-1k.webp rock-tile-floor-arm-1k.webp" data-home-governed-identity-assets="none-mounted-v219-text-native-authority" data-home-visible-production-assets="v219-continuous-geology v219-ground-place v219-life-map-place v219-connected-living-memory-presence" data-home-authored-regions="home-authored-terrain home-mountain-horizon home-sanctuary-pavilion home-life-map-physical-portal" data-testid="home-visible-navigable-sanctuary-world" style={{position:'relative',overflow:'hidden',backgroundColor:'#071417'}} {...look}>
    <Canvas className={styles.canvas} dpr={1} shadows frameloop={reducedMotion?'demand':'always'} camera={{position:[0,1.58,4.6],fov:42,near:.1,far:120}} gl={{antialias:true,alpha:false,powerPreference:'high-performance'}} onCreated={({gl})=>{gl.outputColorSpace=THREE.SRGBColorSpace;gl.toneMapping=THREE.ACESFilmicToneMapping;gl.toneMappingExposure=1.34;gl.shadowMap.type=THREE.PCFSoftShadowMap;gl.setClearColor(0x071417,1);setCanvasReady(true)}}><Scene input={input} yaw={yaw} pitch={pitch} target={target} onNearby={setNearby} transition={transition} reducedMotion={reducedMotion} orbState={orbState} onOrb={openOrb} onGround={openGround} onLifeMap={openLifeMap} onReady={markReady} owner={worldRef}/></Canvas>
    {context?<div className={`${styles.worldHint} home-world-context`} role="status" aria-live="polite">{context}</div>:null}{transition==='none'&&mobile?<MobileMovementPad input={input} label="Home movement controls"/>:null}<span className="sr-only" data-testid="urai-home-webgl-orb">The connected living Orb is integrated into your private sanctuary.</span><span className="sr-only" data-testid="urai-home-embodied-avatar">Your privacy-preserving embodied Home presence remains active.</span>
  </main>
}

export const HomeWorldProduction=HomeWorldProductionV219
useTexture.preload([ROCK_DIFFUSE,ROCK_NORMAL,ROCK_ARM])
