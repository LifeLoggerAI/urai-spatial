'use client'

import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import { Stars, useAnimations, useGLTF } from '@react-three/drei'
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type MutableRefObject } from 'react'
import * as THREE from 'three'
import { resolveOrbSensoryOutput, URAI_ORB_STATE_EVENT, type OrbState, type OrbStateEventDetail } from '@/app/home/orbStateController'
import { MobileMovementPad, stepEmbodiedMotion, useDragLook, useMovementInput, type MovementInput } from '@/spatial/navigation/EmbodiedNavigation'
import { useSceneStore } from '@/spatial/store/useSceneStore'
import { requestUraiWorldOrbOpen, requestUraiWorldTravel } from '@/spatial/world/worldEvents'
import styles from './HomeWorldProduction.module.css'

const SANCTUARY = '/assets/urai/generated/models/home-entry-chamber-v1.glb'
const ORB_MODEL = '/assets/urai/generated/models/urai-orb-avatar-v1.glb'
const PORTAL_MODEL = '/assets/urai/generated/models/portal-ring-master-v1.glb'
const HUMAN = '/assets/urai/generated/human-makehuman-v4/home-human-makehuman-v4.glb'
const SPAWN = new THREE.Vector3(0, 0.04, 6.9)
const ORB = new THREE.Vector3(0, 1.62, -2.65)
const GROUND = new THREE.Vector3(-5.2, 0, -8.4)
const LIFE_MAP = new THREE.Vector3(5.2, 0, -8.4)
const BOUNDS = { minX: -10.5, maxX: 10.5, minZ: -12.5, maxZ: 8.5 }
const ORB_CLIPS: Record<OrbState, string> = {
  dormant: 'Orb_Resting',
  idle: 'Orb_Idle',
  attention: 'Orb_Attention',
  listening: 'Orb_Listening',
  thinking: 'Orb_Thinking',
  speaking: 'Orb_Speaking',
  guiding: 'Orb_Guiding',
  reflecting: 'Orb_Reflecting',
  calming: 'Orb_Calming',
  privacy: 'Orb_Privacy',
  warning: 'Orb_Degraded',
  transition: 'Orb_Transition',
}

type Nearby = 'orb' | 'ground' | 'life-map' | null
type Props = { onOrbOpen?: () => void; webglAvailable?: boolean }

function cloneAuthoredMaterial(material: THREE.Material) {
  const clone = material.clone()
  if (clone instanceof THREE.MeshStandardMaterial) {
    const hasEmission = clone.emissive.r > 0 || clone.emissive.g > 0 || clone.emissive.b > 0
    if (hasEmission) clone.emissiveIntensity = Math.max(clone.emissiveIntensity, 1)
    clone.roughness = Math.max(0.1, clone.roughness)
    clone.envMapIntensity = Math.max(clone.envMapIntensity, 1)
    clone.needsUpdate = true
  }
  return clone
}

function cloneAuthoredModel(source: THREE.Object3D) {
  const root = source.clone(true)
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return
    object.material = Array.isArray(object.material)
      ? object.material.map(cloneAuthoredMaterial)
      : cloneAuthoredMaterial(object.material)
    object.castShadow = true
    object.receiveShadow = true
  })
  return root
}

function cloneSanctuary(source: THREE.Object3D) {
  const root = cloneAuthoredModel(source)
  root.position.set(0, 0, -2.4)
  root.scale.setScalar(1.28)
  return root
}

function RitualFloor({ target }: { target: MutableRefObject<THREE.Vector3 | null> }) {
  const sanctuary = useGLTF(SANCTUARY)
  const model = useMemo(() => cloneSanctuary(sanctuary.scene), [sanctuary.scene])
  const onWalk = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation()
    if (useSceneStore.getState().inputLocked) return
    target.current = new THREE.Vector3(THREE.MathUtils.clamp(event.point.x, BOUNDS.minX, BOUNDS.maxX), 0, THREE.MathUtils.clamp(event.point.z, BOUNDS.minZ, BOUNDS.maxZ))
  }
  const channels = [-6, -3, 0, 3, 6]
  return <group name="home-authored-terrain">
    <primitive object={model} />
    <mesh name="home-walkable-navigation-surface" position={[0, -0.22, -1.8]} receiveShadow onClick={onWalk}>
      <cylinderGeometry args={[13.5, 14.4, 0.34, 96]} />
      <meshPhysicalMaterial color="#050711" roughness={0.2} metalness={0.58} clearcoat={1} clearcoatRoughness={0.13} />
    </mesh>
    {[2.7, 5.4, 9.4, 12.5].map((radius, index) => <mesh key={radius} rotation={[Math.PI / 2, 0, 0]} position={[0, -0.035 + index * 0.004, -1.8]}>
      <torusGeometry args={[radius, index === 0 ? 0.045 : 0.025, 10, 128]} />
      <meshStandardMaterial color={index === 0 ? '#d9c99a' : '#73d8e8'} emissive={index === 0 ? '#6a572b' : '#1b6b7c'} emissiveIntensity={0.8} roughness={0.28} metalness={0.62} />
    </mesh>)}
    {channels.map((x) => <mesh key={x} position={[x, -0.038, -1.9]} rotation={[0, Math.atan2(x, 10), 0]}>
      <boxGeometry args={[0.025, 0.018, 19]} /><meshStandardMaterial color="#66cadc" emissive="#14566a" emissiveIntensity={0.7} roughness={0.3} metalness={0.7} />
    </mesh>)}
  </group>
}

function MoonAndMist({ reducedMotion }: { reducedMotion: boolean }) {
  const mist = useRef<THREE.Group>(null)
  useFrame(({ clock }) => { if (!reducedMotion && mist.current) mist.current.rotation.y = Math.sin(clock.elapsedTime * 0.025) * 0.035 })
  return <>
    <group name="home-mountain-horizon" position={[-12, 12, -42]}>
      <mesh><sphereGeometry args={[2.1, 48, 48]} /><meshBasicMaterial color="#dbe5f5" toneMapped={false} /></mesh>
      <mesh position={[0.75, 0.18, 0.5]}><sphereGeometry args={[2.05, 48, 48]} /><meshBasicMaterial color="#07101c" /></mesh>
    </group>
    <group ref={mist} name="home-living-vegetation">
      {[-12,-8,-4,0,4,8,12].map((x, i) => <mesh key={x} position={[x, 0.22 + (i%2)*0.22, -11 - (i%3)*2.8]} rotation={[-Math.PI/2,0,0]} scale={[3.6,1.2,1]}>
        <circleGeometry args={[2.4, 48]} /><meshBasicMaterial color={i%2 ? '#65709b' : '#4a7b8d'} transparent opacity={0.055} depthWrite={false} />
      </mesh>)}
    </group>
  </>
}

function SacredOrb({ state, reducedMotion, onOpen }: { state: OrbState; reducedMotion: boolean; onOpen: () => void }) {
  const root = useRef<THREE.Group>(null)
  const authoredCore = useRef<THREE.Group>(null)
  const activeAction = useRef<THREE.AnimationAction | null>(null)
  const orb = useGLTF(ORB_MODEL)
  const authoredOrb = useMemo(() => cloneAuthoredModel(orb.scene), [orb.scene])
  const { actions } = useAnimations(orb.animations, authoredOrb)
  const sensory = useMemo(() => resolveOrbSensoryOutput(state, reducedMotion, true), [state, reducedMotion])
  const shards = useMemo(() => Array.from({ length: 13 }, (_, i) => ({
    a: (i / 13) * Math.PI * 2, r: 0.52 + (i % 3) * 0.08, y: ((i % 5) - 2) * 0.13, s: 0.08 + (i % 4) * 0.014,
  })), [])
  useEffect(() => {
    const allActions = Object.values(actions).filter((action): action is THREE.AnimationAction => Boolean(action))
    if (reducedMotion) {
      allActions.forEach((action) => action.stop())
      activeAction.current = null
      return
    }
    const next = actions[ORB_CLIPS[state]]
    if (!next) return
    const previous = activeAction.current
    if (previous && previous !== next) previous.fadeOut(0.18)
    next.reset().setLoop(THREE.LoopRepeat, Infinity).fadeIn(0.18).play()
    activeAction.current = next
  }, [actions, reducedMotion, state])
  useEffect(() => () => {
    Object.values(actions).forEach((action) => action?.stop())
  }, [actions])
  useFrame(({ clock }) => {
    if (!root.current || reducedMotion) return
    root.current.rotation.y = clock.elapsedTime * 0.055
    root.current.position.y = ORB.y + Math.sin(clock.elapsedTime * 0.75) * 0.035
    if (authoredCore.current) {
      const pulse = state === 'speaking' ? 1.58 : state === 'listening' ? 1.52 : 1.48 + Math.sin(clock.elapsedTime * 1.25) * 0.025
      authoredCore.current.scale.setScalar(pulse)
    }
  })
  return <group ref={root} name="home-orb-sanctuary" position={ORB} onClick={(e) => { e.stopPropagation(); onOpen() }} userData={{ orbState: state, animation: sensory.animation, modelClip: ORB_CLIPS[state], runtimeAsset: ORB_MODEL }}>
    <mesh><sphereGeometry args={[0.82, 72, 72]} /><meshPhysicalMaterial color="#b9dff0" transparent opacity={0.2} transmission={0.86} thickness={0.18} roughness={0.08} metalness={0.02} clearcoat={1} ior={1.28} /></mesh>
    <mesh scale={0.69}><sphereGeometry args={[0.82, 48, 48]} /><meshPhysicalMaterial color="#334a73" transparent opacity={0.12} transmission={0.65} roughness={0.16} /></mesh>
    <group ref={authoredCore} scale={1.48}><primitive object={authoredOrb} /></group>
    <mesh rotation={[0.2,Math.PI/2,0.45]}><torusGeometry args={[0.66,0.009,10,128]} /><meshStandardMaterial color="#c5eff7" emissive="#4ec5db" emissiveIntensity={1.15} metalness={0.72} roughness={0.22} /></mesh>
    {shards.map((shard, i) => <mesh key={i} position={[Math.cos(shard.a)*shard.r, shard.y, Math.sin(shard.a)*shard.r]} rotation={[shard.a,shard.a*0.4,shard.a*0.7]} scale={shard.s}>
      <tetrahedronGeometry args={[1,0]} /><meshPhysicalMaterial color={i%3===0 ? '#decf9c' : '#8ecfe1'} emissive={i%3===0 ? '#665020' : '#276f82'} emissiveIntensity={1.2} roughness={0.15} metalness={0.32} clearcoat={1} />
    </mesh>)}
    <pointLight color="#9ceeff" intensity={state === 'speaking' ? 5 : 3.8} distance={12} decay={2} />
  </group>
}

function OrbPlatform() {
  return <group name="home-sanctuary-pavilion" position={[ORB.x, 0.03, ORB.z]}>
    <mesh receiveShadow><cylinderGeometry args={[1.7,1.88,0.22,96]} /><meshPhysicalMaterial color="#03040a" roughness={0.14} metalness={0.65} clearcoat={1} clearcoatRoughness={0.1} /></mesh>
    <mesh position={[0,0.13,0]} rotation={[Math.PI/2,0,0]}><torusGeometry args={[1.18,0.045,12,128]} /><meshStandardMaterial color="#b6dbe5" emissive="#236b7d" emissiveIntensity={1.1} metalness={0.82} roughness={0.18} /></mesh>
    {[0,2.094,4.188].map((a) => <group key={a} position={[Math.cos(a)*1.15,0.26,Math.sin(a)*1.15]} rotation={[0,-a,0]}>
      <mesh><boxGeometry args={[0.13,0.42,0.22]} /><meshStandardMaterial color="#c0c7d3" emissive="#27556e" emissiveIntensity={0.6} metalness={0.9} roughness={0.18} /></mesh>
    </group>)}
  </group>
}

function HumanPresence({ root }: { root: MutableRefObject<THREE.Group | null> }) {
  const human = useGLTF(HUMAN)
  const model = useMemo(() => human.scene.clone(true), [human.scene])
  return <group ref={root} name="home-authored-embodied-self" position={SPAWN} rotation={[0,Math.PI,0]}>
    <primitive object={model} scale={0.96} />
  </group>
}

function LifeMapPortal({ onActivate }: { onActivate: () => void }) {
  const portal = useGLTF(PORTAL_MODEL)
  const model = useMemo(() => cloneAuthoredModel(portal.scene), [portal.scene])
  return <group name="home-life-map-physical-portal" position={LIFE_MAP} rotation={[0, Math.PI, 0]} userData={{ runtimeAsset: PORTAL_MODEL }}>
    <primitive object={model} scale={2.6} />
    <pointLight position={[0, 1.45, 0.35]} color="#8deaff" intensity={4.2} distance={9} decay={2} />
    <mesh position={[0,0.8,0]} onClick={(e)=>{e.stopPropagation();onActivate()}}><boxGeometry args={[4,2.8,4]} /><meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} /></mesh>
  </group>
}

function Thresholds({ onGround, onLifeMap }: { onGround: () => void; onLifeMap: () => void }) {
  return <>
    <group name="home-ground-environmental-threshold" position={GROUND}><mesh position={[0,0.8,0]} onClick={(e)=>{e.stopPropagation();onGround()}}><boxGeometry args={[4,2.8,4]} /><meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} /></mesh></group>
    <group name="home-life-map-sky-lookout"><LifeMapPortal onActivate={onLifeMap} /></group>
  </>
}

function PlayerRig({ input, yaw, pitch, target, avatar, onNearby, transition, reducedMotion, onTransitionComplete }: { input: MovementInput; yaw: MutableRefObject<number>; pitch: MutableRefObject<number>; target: MutableRefObject<THREE.Vector3|null>; avatar: MutableRefObject<THREE.Group|null>; onNearby:(v:Nearby)=>void; transition:'none'|'ground'|'life-map'; reducedMotion:boolean; onTransitionComplete:()=>void }) {
  const { camera, size } = useThree()
  const pos = useRef(SPAWN.clone()), velocity = useRef(new THREE.Vector3()), started = useRef<number|null>(null), issued = useRef(false), last = useRef<Nearby>(null)
  useLayoutEffect(()=>{camera.position.set(0,1.72,10.3);camera.lookAt(0,1.2,-2.6)},[camera])
  useFrame(({clock},delta)=>{
    if (transition !== 'none') {
      if (started.current===null) started.current=clock.elapsedTime
      const duration=reducedMotion?0.45:transition==='life-map'?3.4:2.6
      const t=THREE.MathUtils.smootherstep(THREE.MathUtils.clamp((clock.elapsedTime-started.current)/duration,0,1),0,1)
      if (transition==='life-map') { camera.position.lerp(new THREE.Vector3(0,34,-34),1-Math.pow(0.002,delta));camera.lookAt(0,10+t*22,-20-t*22);useSceneStore.getState().setProgress(t) }
      else { camera.position.lerp(new THREE.Vector3(-5.2,-2.2,-13.5),1-Math.pow(0.002,delta));camera.lookAt(-5.2,-1,-15) }
      if(t>=1&&!issued.current){issued.current=true;onTransitionComplete()}
      return
    }
    started.current=null;issued.current=false
    stepEmbodiedMotion({delta,input,yaw:yaw.current,position:pos.current,velocity:velocity.current,target,bounds:BOUNDS,speed:2.7,acceleration:8,deceleration:11})
    if(avatar.current){avatar.current.position.copy(pos.current);avatar.current.rotation.y=yaw.current+Math.PI}
    const portrait=size.height>size.width
    const behind=new THREE.Vector3(Math.sin(yaw.current)*-2.3,portrait?1.65:1.8,Math.cos(yaw.current)*2.3)
    camera.position.lerp(pos.current.clone().add(behind),1-Math.pow(0.001,delta))
    const look=pos.current.clone().add(new THREE.Vector3(-Math.sin(yaw.current)*5,1.15+pitch.current,-Math.cos(yaw.current)*5));camera.lookAt(look)
    const candidates:readonly [Nearby,THREE.Vector3,number][]=[['orb',ORB,2.5],['ground',GROUND,2.8],['life-map',LIFE_MAP,2.8]]
    let next:Nearby=null,best=Infinity;for(const [name,p,r] of candidates){const d=Math.hypot(pos.current.x-p.x,pos.current.z-p.z);if(d<r&&d<best){next=name;best=d}}
    if(next!==last.current){last.current=next;onNearby(next)}
  })
  return null
}

function SceneReady({ onReady }: { onReady: () => void }) { const {scene}=useThree();const frames=useRef(0),done=useRef(false);useFrame(()=>{if(done.current||++frames.current<4)return;const names=['home-authored-terrain','home-authored-embodied-self','home-orb-sanctuary','home-ground-environmental-threshold','home-life-map-sky-lookout','home-life-map-physical-portal','home-mountain-horizon','home-living-vegetation','home-sanctuary-pavilion'];if(!names.every(n=>scene.getObjectByName(n)))return;done.current=true;onReady()});return null }

function SacredScene(props:{input:MovementInput;yaw:MutableRefObject<number>;pitch:MutableRefObject<number>;target:MutableRefObject<THREE.Vector3|null>;avatar:MutableRefObject<THREE.Group|null>;nearby:(v:Nearby)=>void;orbState:OrbState;reducedMotion:boolean;transition:'none'|'ground'|'life-map';onOrb:()=>void;onGround:()=>void;onLifeMap:()=>void;onTransitionComplete:()=>void;onReady:()=>void}){
  const cosmic=props.transition==='life-map'
  return <><color attach="background" args={[cosmic?'#01030a':'#060914']} /><fogExp2 attach="fog" args={[cosmic?'#060918':'#0b1024',cosmic?0.0022:0.018]} /><Stars radius={180} depth={90} count={cosmic?2800:900} factor={cosmic?3:1.35} saturation={0.28} fade speed={props.reducedMotion?0:0.035} /><ambientLight intensity={0.18} color="#7f94b5" /><hemisphereLight args={['#8ba6cc','#05060c',0.5]} /><directionalLight position={[-10,16,5]} intensity={2.2} color="#c7d7f0" castShadow /><directionalLight position={[8,6,-10]} intensity={0.7} color="#7b66b8" /><RitualFloor target={props.target} /><MoonAndMist reducedMotion={props.reducedMotion} /><OrbPlatform /><SacredOrb state={props.orbState} reducedMotion={props.reducedMotion} onOpen={props.onOrb} /><HumanPresence root={props.avatar} /><Thresholds onGround={props.onGround} onLifeMap={props.onLifeMap} /><PlayerRig input={props.input} yaw={props.yaw} pitch={props.pitch} target={props.target} avatar={props.avatar} onNearby={props.nearby} transition={props.transition} reducedMotion={props.reducedMotion} onTransitionComplete={props.onTransitionComplete} /><SceneReady onReady={props.onReady} /></>
}

export function HomeWorldProductionSacred({onOrbOpen=requestUraiWorldOrbOpen,webglAvailable=true}:Props){
  const [canvasReady,setCanvasReady]=useState(false),[sceneReady,setSceneReady]=useState(false),[nearby,setNearby]=useState<Nearby>(null),[dragging,setDragging]=useState(false),[reducedMotion,setReducedMotion]=useState(false),[mobile,setMobile]=useState(false),[orbState,setOrbState]=useState<OrbState>('idle'),[transition,setTransition]=useState<'none'|'ground'|'life-map'>('none')
  const yaw=useRef(0),pitch=useRef(-0.04),target=useRef<THREE.Vector3|null>(null),avatar=useRef<THREE.Group|null>(null)
  const openOrb=useCallback(()=>{if(!useSceneStore.getState().inputLocked&&transition==='none'){setOrbState('attention');onOrbOpen()}},[onOrbOpen,transition])
  const ground=useCallback(()=>{if(transition!=='none')return;target.current=null;setOrbState('transition');setTransition('ground')},[transition])
  const lifeMap=useCallback(()=>{if(transition!=='none')return;target.current=null;setOrbState('transition');setTransition('life-map');useSceneStore.getState().enterLifeMap()},[transition])
  const interact=useCallback(()=>{if(nearby==='orb')openOrb();else if(nearby==='ground')ground();else if(nearby==='life-map')lifeMap()},[nearby,openOrb,ground,lifeMap])
  const input=useMovementInput({enabled:transition==='none',onInteract:interact,onReset:()=>{target.current=SPAWN.clone();yaw.current=0;pitch.current=-0.04}})
  const look=useDragLook({yaw,pitch,enabled:transition==='none',sensitivity:0.003,minPitch:-0.48,maxPitch:0.52,onDragState:setDragging})
  useEffect(()=>{const rm=window.matchMedia('(prefers-reduced-motion: reduce)'),m=window.matchMedia('(pointer: coarse), (max-width: 700px)');const apply=()=>{setReducedMotion(rm.matches);setMobile(m.matches)};apply();rm.addEventListener?.('change',apply);m.addEventListener?.('change',apply);return()=>{rm.removeEventListener?.('change',apply);m.removeEventListener?.('change',apply)}},[])
  useEffect(()=>{const fn=(e:CustomEvent<OrbStateEventDetail>)=>{if(transition==='none')setOrbState(e.detail.state)};window.addEventListener(URAI_ORB_STATE_EVENT,fn);return()=>window.removeEventListener(URAI_ORB_STATE_EVENT,fn)},[transition])
  useEffect(()=>{const cancel=(e:KeyboardEvent)=>{if(e.key!=='Escape'||transition==='none')return;e.preventDefault();setTransition('none');setOrbState('idle');const store=useSceneStore.getState();store.setPhase('HOME');store.unlock()};window.addEventListener('keydown',cancel,true);return()=>window.removeEventListener('keydown',cancel,true)},[transition])
  if(!webglAvailable)return null
  const ready=canvasReady&&sceneReady,context=transition==='life-map'?'Ascending into your Life Map':transition==='ground'?'Descending into Ground':nearby==='orb'?'The Orb is here':nearby==='ground'?'The path descends':nearby==='life-map'?'Look to the sky':null
  const complete=()=>{if(transition==='ground')requestUraiWorldTravel({destination:'infrastructure-hub',href:'/ground/',entryPortal:'home-ground',cameraCheckpoint:'home-ground-descent'});else if(transition==='life-map')requestUraiWorldTravel({destination:'life-map',href:'/life-map/?from=home-sky',entryPortal:'home-sky',cameraCheckpoint:'home-sky-ascent-complete'})}
  return <main className={`${styles.world} urai-asset-home-world`} data-urai-home-production data-urai-true-3d="true" data-home-primary-owner="asset-driven" data-home-visible-world="moonlit-sacred-tech-sanctuary" data-home-world-character="premium-cinematic-sacred-tech" data-home-physical-base="authored-obsidian-ritual-platform" data-home-visual-ownership="three-dimensional-geometry" data-home-desktop-mobile-world="same-scene" data-home-embodied-self="makehuman-v4" data-home-movement="walk-keyboard-click-touch" data-home-audio="production-opus-consent-controlled" data-home-assets-ready={ready?'true':'false'} data-home-runtime-assets="home-entry-chamber-v1.glb home-human-makehuman-v4.glb urai-orb-avatar-v1.glb portal-ring-master-v1.glb authored-sacred-tech-composite" data-home-authored-regions="home-authored-terrain home-mountain-horizon home-living-vegetation home-sanctuary-pavilion home-life-map-physical-portal" data-home-nearby={nearby??'none'} data-home-camera-mode={transition!=='none'?transition:dragging?'look':'embodied-third-person'} data-home-scene-phase={transition==='none'?'HOME':transition.toUpperCase()} data-home-input-locked={transition!=='none'?'true':'false'} data-home-orb-state={orbState} data-home-orb-clip={resolveOrbSensoryOutput(orbState,reducedMotion,true).animation} data-home-orb-model-clip={reducedMotion?'stopped-reduced-motion':ORB_CLIPS[orbState]} data-testid="home-visible-navigable-sanctuary-world" style={{position:'relative',overflow:'hidden',background:'#060914'}} {...look}>
    <Canvas className={styles.canvas} dpr={[1,1.45]} shadows camera={{position:[0,1.8,10.3],fov:47,near:0.05,far:300}} gl={{antialias:true,alpha:false,powerPreference:'high-performance'}} onCreated={({gl})=>{gl.outputColorSpace=THREE.SRGBColorSpace;gl.toneMapping=THREE.ACESFilmicToneMapping;gl.toneMappingExposure=0.92;gl.shadowMap.type=THREE.PCFSoftShadowMap;setCanvasReady(true)}}><SacredScene input={input} yaw={yaw} pitch={pitch} target={target} avatar={avatar} nearby={setNearby} orbState={orbState} reducedMotion={reducedMotion} transition={transition} onOrb={openOrb} onGround={ground} onLifeMap={lifeMap} onTransitionComplete={complete} onReady={()=>setSceneReady(true)} /></Canvas>
    {context?<div className={`${styles.worldHint} home-world-context`} role="status" aria-live="polite">{context}</div>:null}{transition==='none'&&mobile?<MobileMovementPad input={input} label="Home movement controls" />:null}<span className="sr-only" data-testid="urai-home-webgl-orb">The sacred-tech Orb companion is physically present in the Home sanctuary and consumes the final authored Orb GLB.</span><span className="sr-only" data-testid="urai-home-embodied-avatar">Your embodied Home presence uses the real skinned V4 human candidate.</span>
  </main>
}

useGLTF.preload(SANCTUARY)
useGLTF.preload(ORB_MODEL)
useGLTF.preload(PORTAL_MODEL)
useGLTF.preload(HUMAN)