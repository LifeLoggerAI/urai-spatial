'use client'
import {Canvas,useFrame,useThree,type ThreeEvent} from '@react-three/fiber'
import {useTexture} from '@react-three/drei'
import {useCallback,useEffect,useRef,useState,type MutableRefObject} from 'react'
import * as THREE from 'three'
import {resolveOrbSensoryOutput,URAI_ORB_STATE_EVENT,type OrbState,type OrbStateEventDetail} from '@/app/home/orbStateController'
import {MobileMovementPad,stepEmbodiedMotion,useDragLook,useMovementInput,type MovementInput} from '@/spatial/navigation/EmbodiedNavigation'
import {requestUraiWorldOrbOpen,requestUraiWorldTravel} from '@/spatial/world/worldEvents'
import {T,SPAWN,ORB,GROUND,LIFE_MAP,BOUNDS,Terrain,Escarpment,DestinationLights,Orb} from './HomeWorldProductionV223Geometry'
import {HomeV225PolishV2} from './HomeWorldProductionV225PolishV2'
import {HomeV225PolishV3} from './HomeWorldProductionV225PolishV3'
import styles from './HomeWorldProduction.module.css'

type Nearby='orb'|'ground'|'life-map'|null
type Transition='none'|'ground'|'life-map'
type Props={onOrbOpen?:()=>void;webglAvailable?:boolean}

function Cadence({active}:{active:boolean}){
  const{invalidate,setFrameloop}=useThree()
  useEffect(()=>{
    if(!active){setFrameloop('always');return}
    setFrameloop('demand')
    const id=window.setInterval(invalidate,280)
    invalidate()
    return()=>window.clearInterval(id)
  },[active,invalidate,setFrameloop])
  return null
}

function Rig({input,yaw,pitch,target,onNearby,transition,owner}:{input:MovementInput;yaw:MutableRefObject<number>;pitch:MutableRefObject<number>;target:MutableRefObject<THREE.Vector3|null>;onNearby:(n:Nearby)=>void;transition:Transition;owner:MutableRefObject<HTMLElement|null>}){
  const{camera,size}=useThree(),pos=useRef(SPAWN.clone()),vel=useRef(new THREE.Vector3()),last=useRef<Nearby>(null),frames=useRef(0)
  const destinationFocus=useRef(new THREE.Vector3())
  useEffect(()=>{
    camera.position.set(0,1.58,4.6)
    camera.lookAt(0,1.05,-9.2)
    camera.near=.1
    camera.far=125
    camera.updateProjectionMatrix()
  },[camera])
  useFrame((_,delta)=>{
    if(transition==='none')stepEmbodiedMotion({position:pos.current,velocity:vel.current,input,target,yaw:yaw.current,delta,speed:2.9,acceleration:9,deceleration:12,bounds:BOUNDS,arrivalRadius:.32})
    frames.current++
    const shell=owner.current
    if(shell){
      shell.dataset.homePlayerX=pos.current.x.toFixed(3)
      shell.dataset.homePlayerZ=pos.current.z.toFixed(3)
      shell.dataset.homeDistance=pos.current.distanceTo(SPAWN).toFixed(3)
      shell.dataset.homeDistanceOrb=Math.hypot(pos.current.x-ORB.x,pos.current.z-ORB.z).toFixed(3)
      shell.dataset.homeDistanceGround=Math.hypot(pos.current.x-GROUND.x,pos.current.z-GROUND.z).toFixed(3)
      shell.dataset.homeDistanceLifeMap=Math.hypot(pos.current.x-LIFE_MAP.x,pos.current.z-LIFE_MAP.z).toFixed(3)
      shell.dataset.homeMoving=vel.current.lengthSq()>.0004?'true':'false'
      shell.dataset.homeRenderedFrames=String(frames.current)
    }
    let near:Nearby=null,best=Infinity
    for(const[n,q,r]of[['orb',ORB,2.35],['ground',GROUND,2.65],['life-map',LIFE_MAP,2.65]] as const){
      const d=Math.hypot(pos.current.x-q.x,pos.current.z-q.z)
      if(d<r&&d<best){near=n;best=d}
    }
    if(camera instanceof THREE.PerspectiveCamera){
      const f=size.height>size.width?(near==='orb'?58:56):(near==='orb'?48:42)
      if(Math.abs(camera.fov-f)>.01){camera.fov=f;camera.updateProjectionMatrix()}
    }
    const forward=new THREE.Vector3(-Math.sin(yaw.current)*10,1.1+pitch.current*.38,-Math.cos(yaw.current)*10)
    let desired=pos.current.clone().add(new THREE.Vector3(Math.sin(yaw.current)*(near?1.32:.08),size.height>size.width?1.38:1.56,Math.cos(yaw.current)*(near?1.32:.08)))
    let look=pos.current.clone().add(forward)
    if(near==='orb'){
      desired=pos.current.clone().add(new THREE.Vector3(.58,size.height>size.width?1.46:1.62,2.42))
      look=destinationFocus.current.copy(ORB).add(new THREE.Vector3(0,.18,0))
    }else if(near==='ground'){
      desired=pos.current.clone().add(new THREE.Vector3(.78,size.height>size.width?1.42:1.58,1.72))
      look=destinationFocus.current.copy(GROUND).add(new THREE.Vector3(0,.44,0))
    }else if(near==='life-map'){
      desired=pos.current.clone().add(new THREE.Vector3(-.78,size.height>size.width?1.45:1.62,1.72))
      look=destinationFocus.current.copy(LIFE_MAP).add(new THREE.Vector3(0,.78,0))
    }
    camera.position.lerp(desired,1-Math.pow(.0008,delta))
    camera.lookAt(look)
    if(near!==last.current){last.current=near;onNearby(near)}
  })
  return null
}

function Scene(p:{input:MovementInput;yaw:MutableRefObject<number>;pitch:MutableRefObject<number>;target:MutableRefObject<THREE.Vector3|null>;onNearby:(n:Nearby)=>void;transition:Transition;reducedMotion:boolean;orbState:OrbState;onOrb:()=>void;onGround:()=>void;onLifeMap:()=>void;onReady:()=>void;owner:MutableRefObject<HTMLElement|null>}){
  const walk=(e:ThreeEvent<MouseEvent>)=>{
    e.stopPropagation()
    p.target.current=new THREE.Vector3(THREE.MathUtils.clamp(e.point.x,BOUNDS.minX,BOUNDS.maxX),0,THREE.MathUtils.clamp(e.point.z,BOUNDS.minZ,BOUNDS.maxZ))
  }
  useEffect(()=>p.onReady(),[p])
  return <>
    <Cadence active={p.reducedMotion}/>
    <color attach="background" args={['#10272a']}/>
    <fogExp2 attach="fog" args={['#607a6d',.0095]}/>
    <ambientLight intensity={.92} color="#e2e4d8"/>
    <hemisphereLight args={['#dfe8df','#594631',1.12]}/>
    <directionalLight position={[-7,10,5]} intensity={2.35} color="#f5d6a0" castShadow shadow-mapSize-width={1024} shadow-mapSize-height={1024}/>
    <directionalLight position={[8,7,-10]} intensity={.88} color="#9bc5b0"/>
    <Terrain walk={walk} onGround={p.onGround} onLifeMap={p.onLifeMap}/><Escarpment side={-1}/><Escarpment side={1}/><DestinationLights/><Orb state={p.orbState} reducedMotion={p.reducedMotion} onOpen={p.onOrb}/>
    <HomeV225PolishV2 orbState={p.orbState} reducedMotion={p.reducedMotion} onOrb={p.onOrb} onGround={p.onGround} onLifeMap={p.onLifeMap} onWalk={walk}/>
    <HomeV225PolishV3 orbState={p.orbState} reducedMotion={p.reducedMotion} onOrb={p.onOrb} onGround={p.onGround} onLifeMap={p.onLifeMap} onWalk={walk}/>
    <Rig input={p.input} yaw={p.yaw} pitch={p.pitch} target={p.target} onNearby={p.onNearby} transition={p.transition} owner={p.owner}/>
  </>
}

export function HomeWorldProductionV223({onOrbOpen=requestUraiWorldOrbOpen,webglAvailable=true}:Props){
  const[canvasReady,setCanvasReady]=useState(false),[sceneReady,setSceneReady]=useState(false),[nearby,setNearby]=useState<Nearby>(null),[dragging,setDragging]=useState(false),[reducedMotion,setReducedMotion]=useState(false),[mobile,setMobile]=useState(false),[orbState,setOrbState]=useState<OrbState>('idle'),[transition,setTransition]=useState<Transition>('none'),yaw=useRef(0),pitch=useRef(.06),target=useRef<THREE.Vector3|null>(null),worldRef=useRef<HTMLElement>(null),markReady=useCallback(()=>setSceneReady(true),[]),openOrb=useCallback(()=>{if(transition==='none'){setOrbState('attention');onOrbOpen()}},[onOrbOpen,transition]),openGround=useCallback(()=>{if(transition==='none'){target.current=null;setOrbState('transition');setTransition('ground')}},[transition]),openLifeMap=useCallback(()=>{if(transition==='none'){target.current=null;setOrbState('transition');setTransition('life-map')}},[transition]),interact=useCallback(()=>{nearby==='orb'?openOrb():nearby==='ground'?openGround():nearby==='life-map'&&openLifeMap()},[nearby,openGround,openLifeMap,openOrb]),input=useMovementInput({enabled:transition==='none',onInteract:interact,onReset:()=>{target.current=SPAWN.clone();yaw.current=0;pitch.current=.06}}),look=useDragLook({yaw,pitch,enabled:transition==='none',sensitivity:.003,minPitch:-.46,maxPitch:.5,onDragState:setDragging})
  useEffect(()=>{
    const rm=window.matchMedia('(prefers-reduced-motion: reduce)'),mq=window.matchMedia('(pointer: coarse), (max-width: 700px)'),apply=()=>{setReducedMotion(rm.matches);setMobile(mq.matches)}
    apply();rm.addEventListener?.('change',apply);mq.addEventListener?.('change',apply)
    return()=>{rm.removeEventListener?.('change',apply);mq.removeEventListener?.('change',apply)}
  },[])
  useEffect(()=>{
    const listener=(e:CustomEvent<OrbStateEventDetail>)=>transition==='none'&&setOrbState(e.detail.state)
    window.addEventListener(URAI_ORB_STATE_EVENT,listener)
    return()=>window.removeEventListener(URAI_ORB_STATE_EVENT,listener)
  },[transition])
  useEffect(()=>{
    if(transition==='none')return
    const id=window.setTimeout(()=>transition==='ground'?requestUraiWorldTravel({destination:'infrastructure-hub',href:'/ground/',entryPortal:'home-ground',cameraCheckpoint:'home-ground-descent'}):requestUraiWorldTravel({destination:'life-map',href:'/life-map/?from=home-sky',entryPortal:'home-sky',cameraCheckpoint:'home-sky-ascent-complete'}),reducedMotion?720:1800)
    return()=>window.clearTimeout(id)
  },[reducedMotion,transition])
  useEffect(()=>{
    const cancel=(e:KeyboardEvent)=>{if(e.key==='Escape'&&transition!=='none'){e.preventDefault();setTransition('none');setOrbState('idle')}}
    window.addEventListener('keydown',cancel,true)
    return()=>window.removeEventListener('keydown',cancel,true)
  },[transition])
  if(!webglAvailable)return null
  const ready=canvasReady&&sceneReady,context=transition==='life-map'?'Ascending into your Life Map':transition==='ground'?'Descending into Ground':nearby==='orb'?'The Orb is here':nearby==='ground'?'The path descends':nearby==='life-map'?'The path rises into your Life Map':null
  return <main ref={worldRef} className={`${styles.world} urai-asset-home-world`} data-urai-home-production data-urai-true-3d="true" data-home-primary-owner="asset-driven" data-home-visible-world="v226-rooted-inhabited-memory-sanctuary" data-home-world-character="production-cinematic-sacred-tech" data-home-physical-base="continuous-stratified-weathered-terrain-integrated-destinations" data-home-visual-ownership="single-canvas-three-dimensional-geometry" data-home-desktop-mobile-world="same-scene" data-home-embodied-self="privacy-preserving-first-person" data-home-movement="walk-keyboard-click-touch" data-home-pointer-lock="false" data-home-assets-ready={ready?'true':'false'} data-home-ready={ready?'true':'warming'} data-home-input-ready={ready?'true':'false'} data-home-interaction-ready={ready?'true':'false'} data-home-player-x="0.000" data-home-player-z="4.600" data-home-distance="0.000" data-home-distance-orb={Math.hypot(SPAWN.x-ORB.x,SPAWN.z-ORB.z).toFixed(3)} data-home-distance-ground={Math.hypot(SPAWN.x-GROUND.x,SPAWN.z-GROUND.z).toFixed(3)} data-home-distance-life-map={Math.hypot(SPAWN.x-LIFE_MAP.x,SPAWN.z-LIFE_MAP.z).toFixed(3)} data-home-moving="false" data-home-rendered-frames="0" data-home-nearby={nearby??'none'} data-home-camera-mode={transition!=='none'?transition:dragging?'look':'embodied-first-person'} data-home-scene-phase={transition==='none'?'HOME':transition.toUpperCase()} data-home-portal-sequence={transition==='none'?'idle':`${transition}:traversal`} data-home-portal-lifecycle="environmental-approach-traversal-arrival" data-home-input-locked={transition!=='none'?'true':'false'} data-home-orb-state={orbState} data-home-orb-clip={resolveOrbSensoryOutput(orbState,reducedMotion,true).animation} data-home-orb-model-clip={reducedMotion?'stopped-reduced-motion':resolveOrbSensoryOutput(orbState,reducedMotion,true).animation} data-home-visual-grade="v226-literal-pixel-candidate-not-certified" data-home-final-art-revision="v226-retained-pixels-pending" data-home-live-art-revision="v226-rooted-inhabited-memory-sanctuary" data-home-art-certification="fresh-exact-head-pixels-required" data-home-v226-certification="fresh-exact-head-pixels-required" data-home-v225-certification="superseded-rejected-pixels" data-home-v224-certification="superseded-rejected-pixels" data-home-v223-certification="superseded-rejected-pixels" data-home-scanned-composition="v226-dimensional-rooted-sanctuary-ground-observatory-integrated-living-memory-presence" data-home-runtime-assets="HomeWorldProductionV223Geometry.tsx HomeWorldProductionV225PolishV2.tsx HomeWorldProductionV225PolishV3.tsx rock-tile-floor-diff-1k.webp rock-tile-floor-normal-gl-1k.webp rock-tile-floor-arm-1k.webp" data-home-governed-identity-assets="v226-direct-runtime-topology historical-v191-glbs-unmounted" data-home-visible-production-assets="v226-weathered-memory-banks v226-rooted-inhabited-canopy v226-ground-inhabited-hearth v226-life-map-lineage-observatory v226-rooted-single-living-memory-presence" data-home-authored-regions="home-authored-terrain home-mountain-horizon home-sanctuary-pavilion home-life-map-physical-portal" data-testid="home-visible-navigable-sanctuary-world" style={{position:'relative',overflow:'hidden',backgroundColor:'#10272a'}} {...look}><Canvas className={styles.canvas} dpr={1} shadows frameloop={reducedMotion?'demand':'always'} camera={{position:[0,1.58,4.6],fov:42,near:.1,far:125}} gl={{antialias:true,alpha:false,powerPreference:'high-performance'}} onCreated={({gl})=>{gl.outputColorSpace=THREE.SRGBColorSpace;gl.toneMapping=THREE.ACESFilmicToneMapping;gl.toneMappingExposure=1.65;gl.shadowMap.type=THREE.PCFSoftShadowMap;gl.setClearColor(0x10272a,1);setCanvasReady(true)}}><Scene input={input} yaw={yaw} pitch={pitch} target={target} onNearby={setNearby} transition={transition} reducedMotion={reducedMotion} orbState={orbState} onOrb={openOrb} onGround={openGround} onLifeMap={openLifeMap} onReady={markReady} owner={worldRef}/></Canvas>{context?<div className={`${styles.worldHint} home-world-context`} role="status" aria-live="polite">{context}</div>:null}{transition==='none'&&mobile?<MobileMovementPad input={input} label="Home movement controls"/>:null}<span className="sr-only" data-testid="urai-home-webgl-orb">The open-cleft layered living-memory presence is integrated into your private sanctuary.</span><span className="sr-only" data-testid="urai-home-embodied-avatar">Your privacy-preserving embodied Home presence remains active.</span></main>
}
export const HomeWorldProduction=HomeWorldProductionV223
useTexture.preload(T as unknown as string[])
