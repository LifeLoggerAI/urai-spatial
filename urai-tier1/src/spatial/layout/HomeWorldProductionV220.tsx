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
const SPAWN=new THREE.Vector3(0,.04,4.6)
const ORB=new THREE.Vector3(-.5,1.38,-7.6)
const GROUND=new THREE.Vector3(-4.85,0,-8.25)
const LIFE_MAP=new THREE.Vector3(4.85,0,-8.25)
const BOUNDS={minX:-7.5,maxX:7.5,minZ:-14.4,maxZ:6.8}

type Nearby='orb'|'ground'|'life-map'|null
type Transition='none'|'ground'|'life-map'
type Props={onOrbOpen?:()=>void;webglAvailable?:boolean}
type Maps={color:THREE.Texture;normal:THREE.Texture;arm:THREE.Texture}

function useStoneMaps():Maps{
  const[c,n,a]=useTexture([ROCK_DIFFUSE,ROCK_NORMAL,ROCK_ARM])
  return useMemo(()=>{
    const prep=(src:THREE.Texture,srgb=false)=>{const t=src.clone();t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(11,16);t.anisotropy=8;t.colorSpace=srgb?THREE.SRGBColorSpace:THREE.NoColorSpace;t.needsUpdate=true;return t}
    return{color:prep(c,true),normal:prep(n),arm:prep(a)}
  },[a,c,n])
}

function floorHeight(x:number,z:number){
  const d=THREE.MathUtils.clamp((6.4-z)/25.2,0,1)
  const lateral=Math.abs(x)/9.8
  const drainage=-.32*Math.exp(-Math.pow((x+.35*Math.sin(z*.23))/2.55,4))
  const shelves=Math.pow(lateral,2.5)*(0.22+d*2.45)
  const erosion=(Math.sin(x*.76+z*.41)*.18+Math.cos(x*1.41-z*.86)*.1+Math.sin(x*2.45+z*.21)*.045)*(0.25+lateral*.75)
  const far=Math.pow(d,3.5)*(2.35+.42*Math.sin(x*.32))
  return-.82+drainage+shelves+erosion+far
}

function Floor({onWalk}:{onWalk:(event:ThreeEvent<MouseEvent>)=>void}){
  const maps=useStoneMaps()
  const geometry=useMemo(()=>{
    const xs=132,zs=164,p:number[]=[],uv:number[]=[],idx:number[]=[]
    for(let iz=0;iz<=zs;iz++){const vz=iz/zs,z=6.5-vz*25.4;for(let ix=0;ix<=xs;ix++){const vx=ix/xs,x=-10+vx*20;p.push(x,floorHeight(x,z),z);uv.push(vx*12,vz*17)}}
    for(let iz=0;iz<zs;iz++)for(let ix=0;ix<xs;ix++){const a=iz*(xs+1)+ix,b=a+1,c=a+xs+1,d=c+1;(ix+iz)&1?idx.push(a,b,d,a,d,c):idx.push(a,b,c,b,d,c)}
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();return g
  },[])
  return <mesh name="home-v220-continuous-eroded-floor" geometry={geometry} receiveShadow onClick={onWalk}><meshStandardMaterial color="#536858" map={maps.color} normalMap={maps.normal} normalScale={new THREE.Vector2(.58,.58)} roughnessMap={maps.arm} roughness={.97} metalness={.004}/></mesh>
}

function cliffGeometry(seed:number){
  const around=54,bands=9,p:number[]=[],uv:number[]=[],idx:number[]=[]
  for(let b=0;b<=bands;b++){
    const v=b/bands
    const y=-1.2+v*2.4
    const taper=1-.24*Math.pow(v,1.6)
    for(let i=0;i<around;i++){
      const u=i/around,a=u*Math.PI*2
      const strata=.13*Math.sin(a*3.1+seed)+.065*Math.sin(a*7.4-seed*.7)+.04*Math.cos(a*12.2+v*8+seed)
      const cut=.18*Math.max(0,Math.sin(a*2.0+seed*.31))*Math.sin(Math.PI*v)
      const r=taper+strata-cut
      p.push(Math.cos(a)*r,y+.08*Math.sin(a*4+seed)*Math.sin(Math.PI*v),Math.sin(a)*r*.72)
      uv.push(u*3.5,v*4.5)
    }
  }
  for(let b=0;b<bands;b++)for(let i=0;i<around;i++){const n=(i+1)%around,a=b*around+i,c=b*around+n,d=(b+1)*around+i,e=(b+1)*around+n;idx.push(a,c,d,c,e,d)}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();return g
}

function Cliff({name,position,scale,rotation=[0,0,0],seed,tint}:{name:string;position:[number,number,number];scale:[number,number,number];rotation?:[number,number,number];seed:number;tint:string}){
  const maps=useStoneMaps(),geometry=useMemo(()=>cliffGeometry(seed),[seed])
  return <mesh name={name} geometry={geometry} position={position} scale={scale} rotation={rotation} castShadow receiveShadow><meshStandardMaterial color={tint} map={maps.color} normalMap={maps.normal} normalScale={new THREE.Vector2(.48,.48)} roughnessMap={maps.arm} roughness={.96} metalness={.004}/></mesh>
}

function CanyonStrata(){return <>
  <Cliff name="home-v220-port-foreground-strata" position={[-8.65,1.65,-3.8]} scale={[3.25,2.25,4.2]} rotation={[0,-.16,.03]} seed={11} tint="#354a3d"/>
  <Cliff name="home-v220-port-mid-strata" position={[-8.2,2.35,-10.5]} scale={[3.6,3.0,4.5]} rotation={[0,-.08,.08]} seed={13} tint="#2f4439"/>
  <Cliff name="home-v220-port-distant-strata" position={[-7.4,3.55,-17.1]} scale={[4.5,4.0,4.8]} rotation={[0,.08,.1]} seed={17} tint="#293e34"/>
  <Cliff name="home-v220-starboard-foreground-strata" position={[8.75,1.75,-5.0]} scale={[3.35,2.35,4.1]} rotation={[0,.15,-.03]} seed={19} tint="#374d40"/>
  <Cliff name="home-v220-starboard-mid-strata" position={[8.35,2.5,-11.2]} scale={[3.7,3.15,4.6]} rotation={[0,.06,-.08]} seed={23} tint="#30463a"/>
  <Cliff name="home-v220-starboard-distant-strata" position={[7.1,3.7,-17.4]} scale={[4.6,4.15,4.9]} rotation={[0,-.08,-.1]} seed={29} tint="#2a4035"/>
  <Cliff name="home-v220-far-history-shelf" position={[.4,4.2,-19.2]} scale={[7.0,2.8,2.7]} rotation={[0,.03,0]} seed={31} tint="#263b32"/>
</>}

function localPatch(kind:'ground'|'life-map'){
  const n=62,half=3.15,p:number[]=[],uv:number[]=[],idx:number[]=[]
  const main=new THREE.CatmullRomCurve3([new THREE.Vector3(-.2,0,2.4),new THREE.Vector3(.35,.28,1.2),new THREE.Vector3(-.25,.58,.05),new THREE.Vector3(.22,.98,-1.2),new THREE.Vector3(-.1,1.38,-2.35)])
  const branch=new THREE.CatmullRomCurve3([new THREE.Vector3(.1,.22,.8),new THREE.Vector3(1.05,.5,.15),new THREE.Vector3(1.55,.82,-1.0),new THREE.Vector3(1.28,1.03,-1.85)])
  const distance=(curve:THREE.CatmullRomCurve3,x:number,z:number)=>{let best=99,y=0;for(let i=0;i<=34;i++){const q=curve.getPoint(i/34),d=(q.x-x)*(q.x-x)+(q.z-z)*(q.z-z);if(d<best){best=d;y=q.y}}return{d:Math.sqrt(best),y}}
  for(let iz=0;iz<=n;iz++){const vz=iz/n,z=-half+vz*half*2;for(let ix=0;ix<=n;ix++){const vx=ix/n,x=-half+vx*half*2,r=Math.sqrt(x*x+z*z)/half,fade=Math.max(0,1-THREE.MathUtils.smoothstep(r,.76,1));let y=0
    if(kind==='ground'){
      const descent=-.62*Math.exp(-(Math.pow((x+.2+z*.17)*.72,2)+Math.pow((z-.25)*.48,2)))
      const port=Math.exp(-(Math.pow((x+1.65)*.72,2)+Math.pow((z+1.0)*.56,2)))*.62
      const rear=Math.exp(-(Math.pow(x*.48,2)+Math.pow((z+2.2)*.76,2)))*(1.1+.18*Math.sin(x*2.2))
      const channel=-.16*Math.exp(-Math.pow(x-.45*z,2)*3.2)*Math.exp(-Math.pow(z-.5,2)*.22)
      y=(descent+port+rear+channel+.07*Math.sin(x*2.8+z*2.0)+.035*Math.cos(x*5.1-z*2.3))*fade
    }else{
      const a=distance(main,x,z),b=distance(branch,x,z)
      const spine=Math.exp(-a.d*a.d*4.1)*(a.y+.14)
      const fork=Math.exp(-b.d*b.d*4.5)*(b.y*.66+.09)
      const basin=-.14*Math.exp(-(x*x*.25+Math.pow(z-1.7,2)*.45))
      const weather=.055*Math.sin(x*3.2-z*2.0)+.03*Math.cos(x*5.0+z*1.6)
      y=(spine+fork+basin+weather)*fade
    }
    p.push(x,y,z);uv.push(vx*5,vz*5)}}
  for(let iz=0;iz<n;iz++)for(let ix=0;ix<n;ix++){const a=iz*(n+1)+ix,b=a+1,c=a+n+1,d=c+1;idx.push(a,b,c,b,d,c)}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();return g
}

function GroundPlace({onOpen}:{onOpen:()=>void}){
  const maps=useStoneMaps(),geometry=useMemo(()=>localPatch('ground'),[]),base=floorHeight(GROUND.x,GROUND.z)
  return <group name="home-v220-ground-place" position={[GROUND.x,base+.015,GROUND.z]} onClick={e=>{e.stopPropagation();onOpen()}}><mesh name="ground-v220-descending-eroded-place" geometry={geometry} castShadow receiveShadow><meshStandardMaterial color="#3f5849" map={maps.color} normalMap={maps.normal} normalScale={new THREE.Vector2(.5,.5)} roughnessMap={maps.arm} roughness={.97}/></mesh><pointLight position={[-.35,-.2,-.9]} color="#bd8958" intensity={1.15} distance={3.1} decay={2}/></group>
}

function LifeMapPlace({onOpen}:{onOpen:()=>void}){
  const maps=useStoneMaps(),geometry=useMemo(()=>localPatch('life-map'),[]),base=floorHeight(LIFE_MAP.x,LIFE_MAP.z)
  return <group name="home-v220-life-map-place" position={[LIFE_MAP.x,base+.015,LIFE_MAP.z]} onClick={e=>{e.stopPropagation();onOpen()}}><mesh name="lifemap-v220-ascending-lineage-place" geometry={geometry} castShadow receiveShadow><meshStandardMaterial color="#496052" map={maps.color} normalMap={maps.normal} normalScale={new THREE.Vector2(.47,.47)} roughnessMap={maps.arm} roughness={.95}/></mesh><pointLight position={[.05,.72,-1.0]} color="#8fbaa2" intensity={.95} distance={3.8} decay={2}/><pointLight position={[1.05,.38,-.3]} color="#b18f64" intensity={.42} distance={2.2} decay={2}/></group>
}

function livingMemoryGeometry(){
  const lon=76,lat=50,p:number[]=[],c:number[]=[],idx:number[]=[]
  const dark=new THREE.Color('#163b31'),moss=new THREE.Color('#568e72'),warm=new THREE.Color('#b98b61')
  const angleDelta=(a:number,b:number)=>Math.atan2(Math.sin(a-b),Math.cos(a-b))
  for(let j=0;j<=lat;j++){
    const v=j/lat,phi=Math.PI*v,s=Math.sin(phi)
    for(let i=0;i<lon;i++){
      const u=i/lon,theta=u*Math.PI*2
      const notch=.32*Math.exp(-Math.pow(angleDelta(theta,.38)/.34,2))*Math.exp(-Math.pow((phi-1.48)/.5,2))
      const shoulder=.24*Math.exp(-Math.pow(angleDelta(theta,-1.15)/.48,2))*Math.exp(-Math.pow((phi-1.2)/.58,2))
      const folded=.14*Math.sin(theta*3.0+phi*.9)+.075*Math.sin(theta*6.4-phi*2.2)+.045*Math.cos(theta*10.1+phi*3.1)
      const r=.72*(1+folded*s-notch+shoulder)
      const asym=.18*s*s*Math.max(0,Math.cos(theta+.75))
      const x=r*s*Math.cos(theta)*(.82+.08*Math.cos(phi))+asym-.09*Math.sin(phi*2.2)
      const y=1.02*Math.cos(phi)+.15*Math.sin(phi*2.1+theta*.8)+.055*Math.sin(theta*5.0)*s
      const z=r*s*Math.sin(theta)*(.68+.11*Math.cos(theta-.45))
      p.push(x,y,z)
      const band=.5+.5*Math.sin(phi*13.2+theta*2.8),heat=Math.max(0,Math.cos(theta-.7))*Math.pow(s,2.6)
      const col=dark.clone().lerp(moss,.2+band*.5).lerp(warm,heat*.17);c.push(col.r,col.g,col.b)
    }
  }
  for(let j=0;j<lat;j++)for(let i=0;i<lon;i++){const n=(i+1)%lon,a=j*lon+i,b=j*lon+n,d=(j+1)*lon+i,e=(j+1)*lon+n;idx.push(a,b,d,b,e,d)}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setAttribute('color',new THREE.Float32BufferAttribute(c,3));g.setIndex(idx);g.computeVertexNormals();return g
}

function scarCurve(seed:number){
  const pts:THREE.Vector3[]=[]
  for(let k=0;k<36;k++){const t=.15+k/35*.7,phi=.3+Math.PI*.72*t,theta=seed+.3*Math.sin(t*8+seed),s=Math.sin(phi),r=.735*(1+.08*Math.sin(theta*3+phi));pts.push(new THREE.Vector3(r*s*Math.cos(theta)*.83+.05,1.02*Math.cos(phi)+.1*Math.sin(phi*2+theta*.8),r*s*Math.sin(theta)*.69).multiplyScalar(1.012))}
  return new THREE.CatmullRomCurve3(pts)
}

const POSTURE:Record<OrbState,{s:[number,number,number];r:[number,number,number];speed:number}>={dormant:{s:[.82,.8,.86],r:[.16,-.22,-.16],speed:.12},idle:{s:[1,1,1],r:[-.08,.18,-.08],speed:.42},attention:{s:[1.12,1.08,.88],r:[-.18,.36,.16],speed:.74},listening:{s:[.88,1.22,.9],r:[.22,-.3,-.12],speed:.3},thinking:{s:[1.16,.9,1.1],r:[-.28,.56,.22],speed:.24},speaking:{s:[1.22,1.04,.82],r:[.12,.22,-.24],speed:1.04},guiding:{s:[.92,1.28,.88],r:[-.32,-.14,.2],speed:.54},reflecting:{s:[.9,.98,1.2],r:[.26,.62,-.2],speed:.18},calming:{s:[1.08,.86,1.08],r:[-.06,-.24,.08],speed:.16},privacy:{s:[.78,.9,.78],r:[.36,.72,.27],speed:.1},warning:{s:[1.25,1.1,.74],r:[-.36,-.44,-.26],speed:1.32},transition:{s:[.84,1.34,.82],r:[-.42,.34,.29],speed:.86}}

function OrbPresence({state,reducedMotion,onOpen}:{state:OrbState;reducedMotion:boolean;onOpen:()=>void}){
  const ref=useRef<THREE.Group>(null),geometry=useMemo(livingMemoryGeometry,[]),posture=POSTURE[state],scarA=useMemo(()=>scarCurve(.52),[]),scarB=useMemo(()=>scarCurve(2.72),[])
  useFrame(({clock})=>{if(!ref.current)return;const t=clock.elapsedTime*posture.speed,b=reducedMotion?1:1+Math.sin(t*.82)*.018;ref.current.scale.set(posture.s[0]*b,posture.s[1]*b,posture.s[2]*b);ref.current.rotation.set(posture.r[0],posture.r[1]+(reducedMotion?0:Math.sin(t)*.09),posture.r[2])})
  const scar=state==='warning'?.9:state==='speaking'?.72:state==='listening'?.38:.23
  return <group ref={ref} name="home-v220-connected-scarred-living-memory-presence" position={ORB} scale={[.76,.76,.76]} onClick={e=>{e.stopPropagation();onOpen()}}><mesh geometry={geometry} castShadow receiveShadow><meshPhysicalMaterial vertexColors roughness={.76} metalness={.01} clearcoat={.03} clearcoatRoughness={.86} emissive={state==='warning'?'#5f261d':'#0d2b24'} emissiveIntensity={state==='warning'?.2:.055} flatShading/></mesh><mesh><tubeGeometry args={[scarA,38,.012,5,false]}/><meshBasicMaterial color={state==='warning'?'#c75f49':'#78b99d'} transparent opacity={scar} toneMapped={false}/></mesh><mesh><tubeGeometry args={[scarB,38,.009,5,false]}/><meshBasicMaterial color="#bca071" transparent opacity={scar*.65} toneMapped={false}/></mesh><pointLight color={state==='warning'?'#b75340':'#63a68b'} intensity={state==='dormant'?.2:.52} distance={3.0} decay={2}/></group>
}

function Cadence({active}:{active:boolean}){const{invalidate,setFrameloop}=useThree();useEffect(()=>{if(!active){setFrameloop('always');return}setFrameloop('demand');const id=window.setInterval(invalidate,280);invalidate();return()=>window.clearInterval(id)},[active,invalidate,setFrameloop]);return null}

function Rig({input,yaw,pitch,target,onNearby,transition,owner}:{input:MovementInput;yaw:MutableRefObject<number>;pitch:MutableRefObject<number>;target:MutableRefObject<THREE.Vector3|null>;onNearby:(value:Nearby)=>void;transition:Transition;owner:MutableRefObject<HTMLElement|null>}){
  const{camera,size}=useThree(),position=useRef(SPAWN.clone()),velocity=useRef(new THREE.Vector3()),last=useRef<Nearby>(null),frames=useRef(0)
  useEffect(()=>{camera.position.set(0,1.58,4.6);camera.lookAt(0,1.0,-9.5);camera.near=.1;camera.far=125;camera.updateProjectionMatrix()},[camera])
  useFrame((_,delta)=>{if(transition==='none')stepEmbodiedMotion({position:position.current,velocity:velocity.current,input,target,yaw:yaw.current,delta,speed:2.9,acceleration:9,deceleration:12,bounds:BOUNDS,arrivalRadius:.32});frames.current++;const shell=owner.current;if(shell){shell.dataset.homePlayerX=position.current.x.toFixed(3);shell.dataset.homePlayerZ=position.current.z.toFixed(3);shell.dataset.homeDistance=position.current.distanceTo(SPAWN).toFixed(3);shell.dataset.homeDistanceOrb=Math.hypot(position.current.x-ORB.x,position.current.z-ORB.z).toFixed(3);shell.dataset.homeDistanceGround=Math.hypot(position.current.x-GROUND.x,position.current.z-GROUND.z).toFixed(3);shell.dataset.homeDistanceLifeMap=Math.hypot(position.current.x-LIFE_MAP.x,position.current.z-LIFE_MAP.z).toFixed(3);shell.dataset.homeMoving=velocity.current.lengthSq()>.0004?'true':'false';shell.dataset.homeRenderedFrames=String(frames.current)}let near:Nearby=null,best=Infinity;for(const[name,q,radius]of[['orb',ORB,2.35],['ground',GROUND,2.65],['life-map',LIFE_MAP,2.65]] as const){const distance=Math.hypot(position.current.x-q.x,position.current.z-q.z);if(distance<radius&&distance<best){near=name;best=distance}}if(camera instanceof THREE.PerspectiveCamera){const fov=size.height>size.width?48:40;if(Math.abs(camera.fov-fov)>.01){camera.fov=fov;camera.updateProjectionMatrix()}}camera.position.lerp(position.current.clone().add(new THREE.Vector3(Math.sin(yaw.current)*(near?1.4:.08),1.56,Math.cos(yaw.current)*(near?1.4:.08))),1-Math.pow(.0008,delta));camera.lookAt(position.current.clone().add(new THREE.Vector3(-Math.sin(yaw.current)*10,1.2+pitch.current*.38,-Math.cos(yaw.current)*10)));if(near!==last.current){last.current=near;onNearby(near)}})
  return null
}

function Scene(props:{input:MovementInput;yaw:MutableRefObject<number>;pitch:MutableRefObject<number>;target:MutableRefObject<THREE.Vector3|null>;onNearby:(value:Nearby)=>void;transition:Transition;reducedMotion:boolean;orbState:OrbState;onOrb:()=>void;onGround:()=>void;onLifeMap:()=>void;onReady:()=>void;owner:MutableRefObject<HTMLElement|null>}){
  const walk=(event:ThreeEvent<MouseEvent>)=>{event.stopPropagation();props.target.current=new THREE.Vector3(THREE.MathUtils.clamp(event.point.x,BOUNDS.minX,BOUNDS.maxX),0,THREE.MathUtils.clamp(event.point.z,BOUNDS.minZ,BOUNDS.maxZ))}
  useEffect(()=>props.onReady(),[props])
  return <><Cadence active={props.reducedMotion}/><color attach="background" args={['#07161a']}/><fogExp2 attach="fog" args={['#1b3b34',.018]}/><ambientLight intensity={.56} color="#d1ddd5"/><hemisphereLight args={['#c9d9d0','#3c3026',.74]}/><directionalLight position={[-7,10,4]} intensity={1.72} color="#e4ca9b" castShadow shadow-mapSize-width={1024} shadow-mapSize-height={1024}/><directionalLight position={[8,6,-11]} intensity={.54} color="#82aa9b"/><Floor onWalk={walk}/><CanyonStrata/><GroundPlace onOpen={props.onGround}/><LifeMapPlace onOpen={props.onLifeMap}/><OrbPresence state={props.orbState} reducedMotion={props.reducedMotion} onOpen={props.onOrb}/><Rig input={props.input} yaw={props.yaw} pitch={props.pitch} target={props.target} onNearby={props.onNearby} transition={props.transition} owner={props.owner}/></>
}

export function HomeWorldProductionV220({onOrbOpen=requestUraiWorldOrbOpen,webglAvailable=true}:Props){
  const[canvasReady,setCanvasReady]=useState(false),[sceneReady,setSceneReady]=useState(false),[nearby,setNearby]=useState<Nearby>(null),[dragging,setDragging]=useState(false),[reducedMotion,setReducedMotion]=useState(false),[mobile,setMobile]=useState(false),[orbState,setOrbState]=useState<OrbState>('idle'),[transition,setTransition]=useState<Transition>('none')
  const yaw=useRef(0),pitch=useRef(.06),target=useRef<THREE.Vector3|null>(null),worldRef=useRef<HTMLElement>(null),markReady=useCallback(()=>setSceneReady(true),[])
  const openOrb=useCallback(()=>{if(transition==='none'){setOrbState('attention');onOrbOpen()}},[onOrbOpen,transition]),openGround=useCallback(()=>{if(transition==='none'){target.current=null;setOrbState('transition');setTransition('ground')}},[transition]),openLifeMap=useCallback(()=>{if(transition==='none'){target.current=null;setOrbState('transition');setTransition('life-map')}},[transition]),interact=useCallback(()=>{if(nearby==='orb')openOrb();else if(nearby==='ground')openGround();else if(nearby==='life-map')openLifeMap()},[nearby,openGround,openLifeMap,openOrb])
  const input=useMovementInput({enabled:transition==='none',onInteract:interact,onReset:()=>{target.current=SPAWN.clone();yaw.current=0;pitch.current=.06}}),look=useDragLook({yaw,pitch,enabled:transition==='none',sensitivity:.003,minPitch:-.46,maxPitch:.5,onDragState:setDragging})
  useEffect(()=>{const rm=window.matchMedia('(prefers-reduced-motion: reduce)'),mq=window.matchMedia('(pointer: coarse), (max-width: 700px)'),apply=()=>{setReducedMotion(rm.matches);setMobile(mq.matches)};apply();rm.addEventListener?.('change',apply);mq.addEventListener?.('change',apply);return()=>{rm.removeEventListener?.('change',apply);mq.removeEventListener?.('change',apply)}},[])
  useEffect(()=>{const listener=(event:CustomEvent<OrbStateEventDetail>)=>{if(transition==='none')setOrbState(event.detail.state)};window.addEventListener(URAI_ORB_STATE_EVENT,listener);return()=>window.removeEventListener(URAI_ORB_STATE_EVENT,listener)},[transition])
  useEffect(()=>{if(transition==='none')return;const id=window.setTimeout(()=>transition==='ground'?requestUraiWorldTravel({destination:'infrastructure-hub',href:'/ground/',entryPortal:'home-ground',cameraCheckpoint:'home-ground-descent'}):requestUraiWorldTravel({destination:'life-map',href:'/life-map/?from=home-sky',entryPortal:'home-sky',cameraCheckpoint:'home-sky-ascent-complete'}),reducedMotion?720:1800);return()=>window.clearTimeout(id)},[reducedMotion,transition])
  useEffect(()=>{const cancel=(event:KeyboardEvent)=>{if(event.key==='Escape'&&transition!=='none'){event.preventDefault();setTransition('none');setOrbState('idle')}};window.addEventListener('keydown',cancel,true);return()=>window.removeEventListener('keydown',cancel,true)},[transition])
  if(!webglAvailable)return null
  const ready=canvasReady&&sceneReady,context=transition==='life-map'?'Ascending into your Life Map':transition==='ground'?'Descending into Ground':nearby==='orb'?'The Orb is here':nearby==='ground'?'The path descends':nearby==='life-map'?'The path rises into your Life Map':null
  return <main ref={worldRef} className={`${styles.world} urai-asset-home-world`} data-urai-home-production data-urai-true-3d="true" data-home-primary-owner="asset-driven" data-home-visible-world="v220-authored-inhabited-memory-sanctuary" data-home-world-character="production-cinematic-sacred-tech" data-home-physical-base="continuous-eroded-geology-layered-strata-traversal" data-home-visual-ownership="single-canvas-three-dimensional-geometry" data-home-desktop-mobile-world="same-scene" data-home-embodied-self="privacy-preserving-first-person" data-home-movement="walk-keyboard-click-touch" data-home-pointer-lock="false" data-home-assets-ready={ready?'true':'false'} data-home-ready={ready?'true':'warming'} data-home-input-ready={ready?'true':'false'} data-home-interaction-ready={ready?'true':'false'} data-home-player-x="0.000" data-home-player-z="4.600" data-home-distance="0.000" data-home-distance-orb={Math.hypot(SPAWN.x-ORB.x,SPAWN.z-ORB.z).toFixed(3)} data-home-distance-ground={Math.hypot(SPAWN.x-GROUND.x,SPAWN.z-GROUND.z).toFixed(3)} data-home-distance-life-map={Math.hypot(SPAWN.x-LIFE_MAP.x,SPAWN.z-LIFE_MAP.z).toFixed(3)} data-home-moving="false" data-home-rendered-frames="0" data-home-nearby={nearby??'none'} data-home-camera-mode={transition!=='none'?transition:dragging?'look':'embodied-first-person'} data-home-scene-phase={transition==='none'?'HOME':transition.toUpperCase()} data-home-portal-sequence={transition==='none'?'idle':`${transition}:traversal`} data-home-portal-lifecycle="environmental-approach-traversal-arrival" data-home-input-locked={transition!=='none'?'true':'false'} data-home-orb-state={orbState} data-home-orb-clip={resolveOrbSensoryOutput(orbState,reducedMotion,true).animation} data-home-orb-model-clip={reducedMotion?'stopped-reduced-motion':resolveOrbSensoryOutput(orbState,reducedMotion,true).animation} data-home-visual-grade="v220-literal-pixel-candidate-not-certified" data-home-final-art-revision="v220-retained-pixels-pending" data-home-live-art-revision="v220-authored-inhabited-memory-sanctuary" data-home-art-certification="fresh-exact-head-pixels-required" data-home-scanned-composition="v220-layered-eroded-canyon-rooted-destinations" data-home-runtime-assets="rock-tile-floor-diff-1k.webp rock-tile-floor-normal-gl-1k.webp rock-tile-floor-arm-1k.webp" data-home-governed-identity-assets="none-mounted-v220-text-native-authority" data-home-visible-production-assets="v220-continuous-geology v220-ground-place v220-life-map-place v220-connected-scarred-living-memory-presence" data-home-authored-regions="home-authored-terrain home-mountain-horizon home-sanctuary-pavilion home-life-map-physical-portal" data-testid="home-visible-navigable-sanctuary-world" style={{position:'relative',overflow:'hidden',backgroundColor:'#07161a'}} {...look}><Canvas className={styles.canvas} dpr={1} shadows frameloop={reducedMotion?'demand':'always'} camera={{position:[0,1.58,4.6],fov:42,near:.1,far:125}} gl={{antialias:true,alpha:false,powerPreference:'high-performance'}} onCreated={({gl})=>{gl.outputColorSpace=THREE.SRGBColorSpace;gl.toneMapping=THREE.ACESFilmicToneMapping;gl.toneMappingExposure=1.55;gl.shadowMap.type=THREE.PCFSoftShadowMap;gl.setClearColor(0x07161a,1);setCanvasReady(true)}}><Scene input={input} yaw={yaw} pitch={pitch} target={target} onNearby={setNearby} transition={transition} reducedMotion={reducedMotion} orbState={orbState} onOrb={openOrb} onGround={openGround} onLifeMap={openLifeMap} onReady={markReady} owner={worldRef}/></Canvas>{context?<div className={`${styles.worldHint} home-world-context`} role="status" aria-live="polite">{context}</div>:null}{transition==='none'&&mobile?<MobileMovementPad input={input} label="Home movement controls"/>:null}<span className="sr-only" data-testid="urai-home-webgl-orb">The connected scarred living Orb is integrated into your private sanctuary.</span><span className="sr-only" data-testid="urai-home-embodied-avatar">Your privacy-preserving embodied Home presence remains active.</span></main>
}

useTexture.preload([ROCK_DIFFUSE,ROCK_NORMAL,ROCK_ARM])
