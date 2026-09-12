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
const SPAWN=new THREE.Vector3(0,.04,4.6), ORB=new THREE.Vector3(-.38,1.42,-7.55), GROUND=new THREE.Vector3(-4.85,0,-8.25), LIFE_MAP=new THREE.Vector3(4.85,0,-8.25)
const BOUNDS={minX:-7.4,maxX:7.4,minZ:-14.2,maxZ:6.7}
const LIFE_MAP_ROUTE=new THREE.CatmullRomCurve3([new THREE.Vector3(0,0,2.1),new THREE.Vector3(-.45,.28,.8),new THREE.Vector3(.22,.64,-.35),new THREE.Vector3(-.18,1.05,-1.55),new THREE.Vector3(.36,1.48,-2.35)])
const LIFE_MAP_BRANCH=new THREE.CatmullRomCurve3([new THREE.Vector3(.05,.35,.55),new THREE.Vector3(1.0,.68,-.05),new THREE.Vector3(1.55,.95,-1.12),new THREE.Vector3(1.32,1.15,-1.9)])
type Nearby='orb'|'ground'|'life-map'|null
type Transition='none'|'ground'|'life-map'
type Props={onOrbOpen?:()=>void;webglAvailable?:boolean}
type StoneMaps={color:THREE.Texture;normal:THREE.Texture;arm:THREE.Texture}

function useStoneMaps():StoneMaps{
  const[c,n,a]=useTexture([ROCK_DIFFUSE,ROCK_NORMAL,ROCK_ARM])
  return useMemo(()=>{const prep=(s:THREE.Texture,srgb=false)=>{const t=s.clone();t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(10,14);t.anisotropy=8;t.colorSpace=srgb?THREE.SRGBColorSpace:THREE.NoColorSpace;t.needsUpdate=true;return t};return{color:prep(c,true),normal:prep(n),arm:prep(a)}},[a,c,n])
}

function height(x:number,z:number){
  const depth=THREE.MathUtils.clamp((6-z)/24,0,1),lateral=Math.abs(x)/9.5
  const drainage=-.28*Math.exp(-Math.pow((x+.25*Math.sin(z*.25))/2.45,4))
  const sideRise=Math.pow(lateral,2.45)*(0.35+depth*2.85)
  const erosion=(Math.sin(x*.71+z*.43)*.2+Math.cos(x*1.29-z*.83)*.12+Math.sin(x*2.1+z*.19)*.06)*(0.3+lateral*.7)
  const port=Math.exp(-(Math.pow((x+6.8)/1.85,2)+Math.pow((z+5.2)/5.5,2)))*2.0
  const star=Math.exp(-(Math.pow((x-6.9)/1.9,2)+Math.pow((z+7.3)/5.0,2)))*2.25
  const far=Math.pow(depth,3.35)*(2.55+.44*Math.sin(x*.3))
  return-.78+drainage+sideRise+erosion+port+star+far
}

function Terrain({onWalk}:{onWalk:(e:ThreeEvent<MouseEvent>)=>void}){
  const maps=useStoneMaps(),g=useMemo(()=>{const xs=126,zs=156,p:number[]=[],uv:number[]=[],idx:number[]=[];for(let zi=0;zi<=zs;zi++){const tz=zi/zs,z=6.4-tz*25;for(let xi=0;xi<=xs;xi++){const tx=xi/xs,x=-9.9+tx*19.8;p.push(x,height(x,z),z);uv.push(tx*12,tz*16)}}for(let zi=0;zi<zs;zi++)for(let xi=0;xi<xs;xi++){const a=zi*(xs+1)+xi,b=a+1,c=a+xs+1,d=c+1;(xi+zi)&1?idx.push(a,b,d,a,d,c):idx.push(a,b,c,b,d,c)}const q=new THREE.BufferGeometry();q.setAttribute('position',new THREE.Float32BufferAttribute(p,3));q.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));q.setIndex(idx);q.computeVertexNormals();return q},[])
  return <mesh name="home-v219-continuous-weathered-sanctuary" geometry={g} receiveShadow onClick={onWalk}><meshStandardMaterial color="#556b59" map={maps.color} normalMap={maps.normal} normalScale={new THREE.Vector2(.58,.58)} roughnessMap={maps.arm} roughness={.96} metalness={.006}/></mesh>
}

function geologicalMass(seed:number){
  const lon=48,lat=30,p:number[]=[],idx:number[]=[]
  for(let j=0;j<=lat;j++){const v=j/lat,phi=Math.PI*v;for(let i=0;i<lon;i++){const theta=i/lon*Math.PI*2,noise=.12*Math.sin(theta*2.7+seed)+.07*Math.sin(phi*5.4+theta*1.7-seed*.2)+.035*Math.cos(theta*9.1-phi*1.8+seed),r=1+noise;p.push(Math.sin(phi)*Math.cos(theta)*r,Math.cos(phi)*r,Math.sin(phi)*Math.sin(theta)*r*(.8+.16*Math.sin(phi)))}}
  for(let j=0;j<lat;j++)for(let i=0;i<lon;i++){const n=(i+1)%lon,a=j*lon+i,b=j*lon+n,c=(j+1)*lon+i,d=(j+1)*lon+n;idx.push(a,b,c,b,d,c)}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setIndex(idx);g.computeVertexNormals();return g
}

function Rock({name,position,scale,seed,tint,rotation=[0,0,0]}:{name:string;position:[number,number,number];scale:[number,number,number];seed:number;tint:string;rotation?:[number,number,number]}){
  const g=useMemo(()=>geologicalMass(seed),[seed]);return <mesh name={name} geometry={g} position={position} scale={scale} rotation={rotation} castShadow receiveShadow><meshStandardMaterial color={tint} roughness={.96} metalness={.004}/></mesh>
}

function EnvironmentMasses(){return <>
  <Rock name="home-v219-port-near-ridge" position={[-8.9,1.3,-5.1]} scale={[4.0,2.9,5.4]} seed={21} tint="#2d4137" rotation={[0,-.12,.04]}/>
  <Rock name="home-v219-port-far-ridge" position={[-7.7,3.2,-16]} scale={[5.3,4.6,5.5]} seed={23} tint="#263a31" rotation={[0,-.2,.1]}/>
  <Rock name="home-v219-starboard-near-ridge" position={[8.9,1.45,-6.5]} scale={[4.1,3.0,5.2]} seed={25} tint="#30463a" rotation={[0,.13,-.04]}/>
  <Rock name="home-v219-starboard-far-ridge" position={[7.5,3.4,-16.1]} scale={[5.4,4.7,5.6]} seed={27} tint="#273c33" rotation={[0,.17,-.1]}/>
  <Rock name="home-v219-far-memory-shelf" position={[.5,4.2,-18.7]} scale={[8.4,3.2,3.0]} seed={31} tint="#23372f" rotation={[0,.04,.02]}/>
</>}

function curveDistance(curve:THREE.CatmullRomCurve3,x:number,z:number){let best=99,bestY=0;for(let i=0;i<=28;i++){const q=curve.getPoint(i/28),d=(q.x-x)*(q.x-x)+(q.z-z)*(q.z-z);if(d<best){best=d;bestY=q.y}}return{d:Math.sqrt(best),y:bestY}}

function placePatch(kind:'ground'|'life-map'){
  const n=56,p:number[]=[],uv:number[]=[],idx:number[]=[],half=3.0
  for(let iz=0;iz<=n;iz++){const vz=iz/n,lz=-half+vz*half*2;for(let ix=0;ix<=n;ix++){const vx=ix/n,lx=-half+vx*half*2,radius=Math.sqrt(lx*lx+lz*lz)/half,fade=Math.max(0,1-THREE.MathUtils.smoothstep(radius,.72,1));let y=0
    if(kind==='ground'){
      const descent=-.55*Math.exp(-(Math.pow((lx+.15+lz*.16)*.72,2)+Math.pow((lz-.15)*.52,2)))
      const portWall=Math.exp(-(Math.pow((lx+1.5)*.72,2)+Math.pow((lz+1.0)*.52,2)))*.8
      const rearWall=Math.exp(-(Math.pow(lx*.48,2)+Math.pow((lz+2.05)*.78,2)))*(1.15+.18*Math.sin(lx*2.1))
      const starShoulder=Math.exp(-(Math.pow((lx-1.65)*.78,2)+Math.pow((lz+.85)*.64,2)))*.55
      const weather=.08*Math.sin(lx*2.8+lz*1.9)+.045*Math.cos(lx*5.2-lz*2.7)
      y=(descent+portWall+rearWall+starShoulder+weather)*fade
    }else{
      const main=curveDistance(LIFE_MAP_ROUTE,lx,lz),branch=curveDistance(LIFE_MAP_BRANCH,lx,lz)
      const mainRidge=Math.exp(-main.d*main.d*3.8)*(main.y+.18)
      const branchRidge=Math.exp(-branch.d*branch.d*4.4)*(branch.y*.72+.12)
      const accumulated=.3*Math.exp(-(lx*lx*.22+Math.pow(lz+1.8,2)*.5))
      const weather=.065*Math.sin(lx*3.4-lz*2.15)+.04*Math.cos(lx*5.1+lz*1.4)
      y=(mainRidge+branchRidge+accumulated+weather)*fade
    }
    p.push(lx,y,lz);uv.push(vx*4.5,vz*4.5)}}
  for(let z=0;z<n;z++)for(let x=0;x<n;x++){const a=z*(n+1)+x,b=a+1,c=a+n+1,d=c+1;idx.push(a,b,c,b,d,c)}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();return g
}

function GroundPlace({onOpen}:{onOpen:()=>void}){
  const maps=useStoneMaps(),base=height(-4.85,-8.25),g=useMemo(()=>placePatch('ground'),[])
  return <group name="home-v219-ground-place" position={[-4.85,base+.02,-8.25]} onClick={e=>{e.stopPropagation();onOpen()}}>
    <mesh name="ground-v219-rooted-shelf" geometry={g} receiveShadow castShadow><meshStandardMaterial color="#3f594a" map={maps.color} normalMap={maps.normal} normalScale={new THREE.Vector2(.5,.5)} roughnessMap={maps.arm} roughness={.97}/></mesh>
    <pointLight position={[-.2,-.18,-.85]} color="#c28f5c" intensity={1.25} distance={3.3} decay={2}/>
  </group>
}

function LifeMapPlace({onOpen}:{onOpen:()=>void}){
  const maps=useStoneMaps(),base=height(4.85,-8.25),g=useMemo(()=>placePatch('life-map'),[])
  return <group name="home-v219-life-map-place" position={[4.85,base+.02,-8.25]} onClick={e=>{e.stopPropagation();onOpen()}}>
    <mesh name="lifemap-v219-rooted-foundation" geometry={g} receiveShadow castShadow><meshStandardMaterial color="#4c6154" map={maps.color} normalMap={maps.normal} normalScale={new THREE.Vector2(.47,.47)} roughnessMap={maps.arm} roughness={.95}/></mesh>
    <pointLight position={[.05,.72,-1.0]} color="#91bea4" intensity={1.0} distance={4.0} decay={2}/>
    <pointLight position={[1.05,.45,-.35]} color="#b49b70" intensity={.5} distance={2.4} decay={2}/>
  </group>
}

function sweptOrbGeometry(){
  const path=new THREE.CatmullRomCurve3([new THREE.Vector3(-.58,-.95,.05),new THREE.Vector3(-.2,-.55,.18),new THREE.Vector3(.28,-.18,-.08),new THREE.Vector3(-.18,.22,.12),new THREE.Vector3(.38,.62,-.04),new THREE.Vector3(.08,1.02,.05)])
  const steps=72,sides=22,p:number[]=[],c:number[]=[],idx:number[]=[],up=new THREE.Vector3(0,1,0),shadow=new THREE.Color('#153d32'),moss=new THREE.Color('#4f9476'),warm=new THREE.Color('#bd9568')
  for(let i=0;i<=steps;i++){const t=i/steps,center=path.getPoint(t),tan=path.getTangent(t).normalize(),side=new THREE.Vector3().crossVectors(tan,up);if(side.lengthSq()<.01)side.set(1,0,0);side.normalize();const normal=new THREE.Vector3().crossVectors(side,tan).normalize();const bulge=Math.sin(Math.PI*t),radius=.18+.34*Math.pow(bulge,.72)+.1*Math.sin(t*Math.PI*3.1);for(let j=0;j<sides;j++){const a=j/sides*Math.PI*2,fold=1+.17*Math.sin(a*3+t*8.5)+.08*Math.sin(a*7-t*5.1),rx=radius*fold*(.92+.16*Math.sin(t*5)),ry=radius*(.74+.2*Math.cos(a+t*4));const q=center.clone().addScaledVector(side,Math.cos(a)*rx).addScaledVector(normal,Math.sin(a)*ry);q.x+=.055*Math.sin(a*2+t*7)*bulge;q.z+=.045*Math.cos(a*3-t*6)*bulge;p.push(q.x,q.y,q.z);const band=.5+.5*Math.sin(t*18+a*2.4),heat=Math.max(0,Math.sin(a-.4))*Math.pow(bulge,2);const col=shadow.clone().lerp(moss,.2+band*.52).lerp(warm,heat*.16);c.push(col.r,col.g,col.b)}}
  for(let i=0;i<steps;i++)for(let j=0;j<sides;j++){const n=(j+1)%sides,a=i*sides+j,b=i*sides+n,d=(i+1)*sides+j,e=(i+1)*sides+n;idx.push(a,b,d,b,e,d)}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setAttribute('color',new THREE.Float32BufferAttribute(c,3));g.setIndex(idx);g.computeVertexNormals();return g
}

function orbStrata(seed:number){const points:THREE.Vector3[]=[];for(let i=0;i<28;i++){const t=.12+i/27*.76,center=new THREE.Vector3(-.58+1.0*t+.15*Math.sin(t*9),-1.0+2.0*t,.08*Math.sin(t*7)),a=seed+t*7.4,r=.33*Math.sin(Math.PI*t);points.push(center.add(new THREE.Vector3(Math.cos(a)*r*.78,.04*Math.sin(a*2),Math.sin(a)*r*.58)))}return new THREE.CatmullRomCurve3(points)}

const POSTURE:Record<OrbState,{s:[number,number,number];r:[number,number,number];speed:number}>={dormant:{s:[.82,.8,.86],r:[.16,-.22,-.16],speed:.12},idle:{s:[1,1,1],r:[-.08,.18,-.08],speed:.42},attention:{s:[1.12,1.08,.88],r:[-.18,.36,.16],speed:.74},listening:{s:[.88,1.22,.9],r:[.22,-.3,-.12],speed:.3},thinking:{s:[1.16,.9,1.1],r:[-.28,.56,.22],speed:.24},speaking:{s:[1.22,1.04,.82],r:[.12,.22,-.24],speed:1.04},guiding:{s:[.92,1.28,.88],r:[-.32,-.14,.2],speed:.54},reflecting:{s:[.9,.98,1.2],r:[.26,.62,-.2],speed:.18},calming:{s:[1.08,.86,1.08],r:[-.06,-.24,.08],speed:.16},privacy:{s:[.78,.9,.78],r:[.36,.72,.27],speed:.1},warning:{s:[1.25,1.1,.74],r:[-.36,-.44,-.26],speed:1.32},transition:{s:[.84,1.34,.82],r:[-.42,.34,.29],speed:.86}}

function OrbPresence({state,reducedMotion,onOpen}:{state:OrbState;reducedMotion:boolean;onOpen:()=>void}){
  const ref=useRef<THREE.Group>(null),g=useMemo(sweptOrbGeometry,[]),p=POSTURE[state],seamA=useMemo(()=>orbStrata(.4),[]),seamB=useMemo(()=>orbStrata(2.4),[])
  useFrame(({clock})=>{if(!ref.current)return;const t=clock.elapsedTime*p.speed,b=reducedMotion?1:1+Math.sin(t*.82)*.02;ref.current.scale.set(p.s[0]*b,p.s[1]*b,p.s[2]*b);ref.current.rotation.set(p.r[0],p.r[1]+(reducedMotion?0:Math.sin(t)*.1),p.r[2])})
  const seam=state==='warning'?1:state==='speaking'?.78:state==='listening'?.4:.26
  return <group ref={ref} name="home-v219-connected-asymmetric-living-memory-presence" position={ORB} scale={[.9,.9,.9]} onClick={e=>{e.stopPropagation();onOpen()}}>
    <mesh geometry={g} castShadow receiveShadow><meshPhysicalMaterial vertexColors roughness={.71} metalness={.015} clearcoat={.05} clearcoatRoughness={.8} emissive={state==='warning'?'#62251b':'#0e2d25'} emissiveIntensity={state==='warning'?.24:.07}/></mesh>
    <mesh><tubeGeometry args={[seamA,34,.014,5,false]}/><meshBasicMaterial color={state==='warning'?'#cf664a':'#83c3a5'} transparent opacity={seam} toneMapped={false}/></mesh>
    <mesh><tubeGeometry args={[seamB,34,.011,5,false]}/><meshBasicMaterial color="#c3a578" transparent opacity={seam*.68} toneMapped={false}/></mesh>
    <pointLight color={state==='warning'?'#bd5942':'#66ab90'} intensity={state==='dormant'?.25:.62} distance={3.4} decay={2}/>
  </group>
}

function Cadence({active}:{active:boolean}){const{invalidate,setFrameloop}=useThree();useEffect(()=>{if(!active){setFrameloop('always');return}setFrameloop('demand');const id=window.setInterval(invalidate,280);invalidate();return()=>window.clearInterval(id)},[active,invalidate,setFrameloop]);return null}

function Rig({input,yaw,pitch,target,onNearby,transition,owner}:{input:MovementInput;yaw:MutableRefObject<number>;pitch:MutableRefObject<number>;target:MutableRefObject<THREE.Vector3|null>;onNearby:(n:Nearby)=>void;transition:Transition;owner:MutableRefObject<HTMLElement|null>}){
  const{camera,size}=useThree(),pos=useRef(SPAWN.clone()),vel=useRef(new THREE.Vector3()),last=useRef<Nearby>(null),frames=useRef(0);useEffect(()=>{camera.position.set(0,1.58,4.6);camera.lookAt(0,1.0,-9.4);camera.near=.1;camera.far=120;camera.updateProjectionMatrix()},[camera]);useFrame((_,delta)=>{if(transition==='none')stepEmbodiedMotion({position:pos.current,velocity:vel.current,input,target,yaw:yaw.current,delta,speed:2.9,acceleration:9,deceleration:12,bounds:BOUNDS,arrivalRadius:.32});frames.current++;const shell=owner.current;if(shell){shell.dataset.homePlayerX=pos.current.x.toFixed(3);shell.dataset.homePlayerZ=pos.current.z.toFixed(3);shell.dataset.homeDistance=pos.current.distanceTo(SPAWN).toFixed(3);shell.dataset.homeDistanceOrb=Math.hypot(pos.current.x-ORB.x,pos.current.z-ORB.z).toFixed(3);shell.dataset.homeDistanceGround=Math.hypot(pos.current.x-GROUND.x,pos.current.z-GROUND.z).toFixed(3);shell.dataset.homeDistanceLifeMap=Math.hypot(pos.current.x-LIFE_MAP.x,pos.current.z-LIFE_MAP.z).toFixed(3);shell.dataset.homeMoving=vel.current.lengthSq()>.0004?'true':'false';shell.dataset.homeRenderedFrames=String(frames.current)}let near:Nearby=null,best=1e9;for(const[n,q,r]of[['orb',ORB,2.35],['ground',GROUND,2.65],['life-map',LIFE_MAP,2.65]] as const){const d=Math.hypot(pos.current.x-q.x,pos.current.z-q.z);if(d<r&&d<best){near=n;best=d}}if(camera instanceof THREE.PerspectiveCamera){const f=size.height>size.width?48:40;if(Math.abs(camera.fov-f)>.01){camera.fov=f;camera.updateProjectionMatrix()}}camera.position.lerp(pos.current.clone().add(new THREE.Vector3(Math.sin(yaw.current)*(near?1.42:.08),1.56,Math.cos(yaw.current)*(near?1.42:.08))),1-Math.pow(.0008,delta));camera.lookAt(pos.current.clone().add(new THREE.Vector3(-Math.sin(yaw.current)*10,1.2+pitch.current*.38,-Math.cos(yaw.current)*10)));if(near!==last.current){last.current=near;onNearby(near)}});return null}

function Scene(props:{input:MovementInput;yaw:MutableRefObject<number>;pitch:MutableRefObject<number>;target:MutableRefObject<THREE.Vector3|null>;onNearby:(n:Nearby)=>void;transition:Transition;reducedMotion:boolean;orbState:OrbState;onOrb:()=>void;onGround:()=>void;onLifeMap:()=>void;onReady:()=>void;owner:MutableRefObject<HTMLElement|null>}){
  const walk=(e:ThreeEvent<MouseEvent>)=>{e.stopPropagation();props.target.current=new THREE.Vector3(THREE.MathUtils.clamp(e.point.x,BOUNDS.minX,BOUNDS.maxX),0,THREE.MathUtils.clamp(e.point.z,BOUNDS.minZ,BOUNDS.maxZ))};useEffect(()=>props.onReady(),[props]);return <><Cadence active={props.reducedMotion}/><color attach="background" args={['#071519']}/><fogExp2 attach="fog" args={['#193a33',.019]}/><ambientLight intensity={.52} color="#d0ddd4"/><hemisphereLight args={['#c4d8ce','#382d24',.72]}/><directionalLight position={[-7,10,4]} intensity={1.68} color="#e3c99b" castShadow shadow-mapSize-width={1024} shadow-mapSize-height={1024}/><directionalLight position={[8,6,-11]} intensity={.5} color="#7da497"/><Terrain onWalk={walk}/><EnvironmentMasses/><GroundPlace onOpen={props.onGround}/><LifeMapPlace onOpen={props.onLifeMap}/><OrbPresence state={props.orbState} reducedMotion={props.reducedMotion} onOpen={props.onOrb}/><Rig input={props.input} yaw={props.yaw} pitch={props.pitch} target={props.target} onNearby={props.onNearby} transition={props.transition} owner={props.owner}/></>
}

export function HomeWorldProductionV219({onOrbOpen=requestUraiWorldOrbOpen,webglAvailable=true}:Props){
  const[canvasReady,setCanvasReady]=useState(false),[sceneReady,setSceneReady]=useState(false),[nearby,setNearby]=useState<Nearby>(null),[dragging,setDragging]=useState(false),[reducedMotion,setReducedMotion]=useState(false),[mobile,setMobile]=useState(false),[orbState,setOrbState]=useState<OrbState>('idle'),[transition,setTransition]=useState<Transition>('none');const yaw=useRef(0),pitch=useRef(.06),target=useRef<THREE.Vector3|null>(null),worldRef=useRef<HTMLElement>(null),markReady=useCallback(()=>setSceneReady(true),[]);const openOrb=useCallback(()=>{if(transition==='none'){setOrbState('attention');onOrbOpen()}},[onOrbOpen,transition]),openGround=useCallback(()=>{if(transition==='none'){target.current=null;setOrbState('transition');setTransition('ground')}},[transition]),openLifeMap=useCallback(()=>{if(transition==='none'){target.current=null;setOrbState('transition');setTransition('life-map')}},[transition]),interact=useCallback(()=>{if(nearby==='orb')openOrb();else if(nearby==='ground')openGround();else if(nearby==='life-map')openLifeMap()},[nearby,openGround,openLifeMap,openOrb]);const input=useMovementInput({enabled:transition==='none',onInteract:interact,onReset:()=>{target.current=SPAWN.clone();yaw.current=0;pitch.current=.06}}),look=useDragLook({yaw,pitch,enabled:transition==='none',sensitivity:.003,minPitch:-.46,maxPitch:.5,onDragState:setDragging});useEffect(()=>{const rm=window.matchMedia('(prefers-reduced-motion: reduce)'),mq=window.matchMedia('(pointer: coarse), (max-width: 700px)'),apply=()=>{setReducedMotion(rm.matches);setMobile(mq.matches)};apply();rm.addEventListener?.('change',apply);mq.addEventListener?.('change',apply);return()=>{rm.removeEventListener?.('change',apply);mq.removeEventListener?.('change',apply)}},[]);useEffect(()=>{const listener=(e:CustomEvent<OrbStateEventDetail>)=>{if(transition==='none')setOrbState(e.detail.state)};window.addEventListener(URAI_ORB_STATE_EVENT,listener);return()=>window.removeEventListener(URAI_ORB_STATE_EVENT,listener)},[transition]);useEffect(()=>{if(transition==='none')return;const id=window.setTimeout(()=>transition==='ground'?requestUraiWorldTravel({destination:'infrastructure-hub',href:'/ground/',entryPortal:'home-ground',cameraCheckpoint:'home-ground-descent'}):requestUraiWorldTravel({destination:'life-map',href:'/life-map/?from=home-sky',entryPortal:'home-sky',cameraCheckpoint:'home-sky-ascent-complete'}),reducedMotion?720:1800);return()=>window.clearTimeout(id)},[reducedMotion,transition]);useEffect(()=>{const cancel=(e:KeyboardEvent)=>{if(e.key==='Escape'&&transition!=='none'){e.preventDefault();setTransition('none');setOrbState('idle')}};window.addEventListener('keydown',cancel,true);return()=>window.removeEventListener('keydown',cancel,true)},[transition]);if(!webglAvailable)return null;const ready=canvasReady&&sceneReady,context=transition==='life-map'?'Ascending into your Life Map':transition==='ground'?'Descending into Ground':nearby==='orb'?'The Orb is here':nearby==='ground'?'The path descends':nearby==='life-map'?'The path rises into your Life Map':null
  return <main ref={worldRef} className={`${styles.world} urai-asset-home-world`} data-urai-home-production data-urai-true-3d="true" data-home-primary-owner="asset-driven" data-home-visible-world="v219-authored-inhabited-memory-sanctuary" data-home-world-character="production-cinematic-sacred-tech" data-home-physical-base="continuous-weathered-geology-camera-safe-traversal" data-home-visual-ownership="single-canvas-three-dimensional-geometry" data-home-desktop-mobile-world="same-scene" data-home-embodied-self="privacy-preserving-first-person" data-home-movement="walk-keyboard-click-touch" data-home-pointer-lock="false" data-home-assets-ready={ready?'true':'false'} data-home-ready={ready?'true':'warming'} data-home-input-ready={ready?'true':'false'} data-home-interaction-ready={ready?'true':'false'} data-home-player-x="0.000" data-home-player-z="4.600" data-home-distance="0.000" data-home-distance-orb={Math.hypot(SPAWN.x-ORB.x,SPAWN.z-ORB.z).toFixed(3)} data-home-distance-ground={Math.hypot(SPAWN.x-GROUND.x,SPAWN.z-GROUND.z).toFixed(3)} data-home-distance-life-map={Math.hypot(SPAWN.x-LIFE_MAP.x,SPAWN.z-LIFE_MAP.z).toFixed(3)} data-home-moving="false" data-home-rendered-frames="0" data-home-nearby={nearby??'none'} data-home-camera-mode={transition!=='none'?transition:dragging?'look':'embodied-first-person'} data-home-scene-phase={transition==='none'?'HOME':transition.toUpperCase()} data-home-portal-sequence={transition==='none'?'idle':`${transition}:traversal`} data-home-portal-lifecycle="environmental-approach-traversal-arrival" data-home-input-locked={transition!=='none'?'true':'false'} data-home-orb-state={orbState} data-home-orb-clip={resolveOrbSensoryOutput(orbState,reducedMotion,true).animation} data-home-orb-model-clip={reducedMotion?'stopped-reduced-motion':resolveOrbSensoryOutput(orbState,reducedMotion,true).animation} data-home-visual-grade="v219-literal-pixel-candidate-not-certified" data-home-final-art-revision="v219-retained-pixels-pending" data-home-live-art-revision="v219-authored-inhabited-memory-sanctuary" data-home-art-certification="fresh-exact-head-pixels-required" data-home-scanned-composition="v219-continuous-geology-rooted-destinations" data-home-runtime-assets="rock-tile-floor-diff-1k.webp rock-tile-floor-normal-gl-1k.webp rock-tile-floor-arm-1k.webp" data-home-governed-identity-assets="none-mounted-v219-text-native-authority" data-home-visible-production-assets="v219-continuous-geology v219-ground-place v219-life-map-place v219-connected-living-memory-presence" data-home-authored-regions="home-authored-terrain home-mountain-horizon home-sanctuary-pavilion home-life-map-physical-portal" data-testid="home-visible-navigable-sanctuary-world" style={{position:'relative',overflow:'hidden',backgroundColor:'#071519'}} {...look}>
    <Canvas className={styles.canvas} dpr={1} shadows frameloop={reducedMotion?'demand':'always'} camera={{position:[0,1.58,4.6],fov:42,near:.1,far:120}} gl={{antialias:true,alpha:false,powerPreference:'high-performance'}} onCreated={({gl})=>{gl.outputColorSpace=THREE.SRGBColorSpace;gl.toneMapping=THREE.ACESFilmicToneMapping;gl.toneMappingExposure=1.48;gl.shadowMap.type=THREE.PCFSoftShadowMap;gl.setClearColor(0x071519,1);setCanvasReady(true)}}><Scene input={input} yaw={yaw} pitch={pitch} target={target} onNearby={setNearby} transition={transition} reducedMotion={reducedMotion} orbState={orbState} onOrb={openOrb} onGround={openGround} onLifeMap={openLifeMap} onReady={markReady} owner={worldRef}/></Canvas>
    {context?<div className={`${styles.worldHint} home-world-context`} role="status" aria-live="polite">{context}</div>:null}{transition==='none'&&mobile?<MobileMovementPad input={input} label="Home movement controls"/>:null}<span className="sr-only" data-testid="urai-home-webgl-orb">The connected living Orb is integrated into your private sanctuary.</span><span className="sr-only" data-testid="urai-home-embodied-avatar">Your privacy-preserving embodied Home presence remains active.</span>
  </main>
}

export const HomeWorldProduction=HomeWorldProductionV219
useTexture.preload([ROCK_DIFFUSE,ROCK_NORMAL,ROCK_ARM])
