'use client'

import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import { ContactShadows, Environment, Lightformer, Stars, useAnimations, useGLTF } from '@react-three/drei'
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

const SANCTUARY_REQUIRED_OBJECTS = [
  'home-authored-terrain',
  'home-authored-embodied-self',
  'home-orb-sanctuary',
  'home-ground-environmental-threshold',
  'home-life-map-sky-lookout',
  'home-life-map-physical-portal',
  'home-mountain-horizon',
  'home-living-vegetation',
  'home-sanctuary-pavilion',
] as const

type Nearby = 'orb' | 'ground' | 'life-map' | null
type Props = { onOrbOpen?: () => void; webglAvailable?: boolean }

function cloneAuthoredMaterial(material: THREE.Material) {
  const clone = material.clone()
  if (clone instanceof THREE.MeshStandardMaterial) {
    const materialName = `${material.name} ${clone.name}`.toLowerCase()
    const hasEmission = clone.emissive.r > 0 || clone.emissive.g > 0 || clone.emissive.b > 0
    if (hasEmission) clone.emissiveIntensity = Math.max(clone.emissiveIntensity, 0.92)

    if (/eye|cornea|iris/.test(materialName)) {
      clone.roughness = 0.06
      clone.metalness = 0
      clone.envMapIntensity = 1.6
      if (clone instanceof THREE.MeshPhysicalMaterial) {
        clone.clearcoat = 1
        clone.clearcoatRoughness = 0.04
      }
    } else if (/skin|body|face|head|ear|hand|foot/.test(materialName)) {
      clone.roughness = 0.52
      clone.metalness = 0
      clone.envMapIntensity = 0.66
      if (clone instanceof THREE.MeshPhysicalMaterial) {
        clone.clearcoat = 0.06
        clone.clearcoatRoughness = 0.68
        clone.sheen = 0.06
        clone.sheenRoughness = 0.86
      }
    } else if (/cloth|shirt|pants|garment|fabric|shoe/.test(materialName)) {
      clone.roughness = 0.74
      clone.metalness = 0.01
      clone.envMapIntensity = 0.48
    } else if (/hair|brow|lash/.test(materialName)) {
      clone.roughness = 0.5
      clone.metalness = 0
      clone.envMapIntensity = 0.58
    } else if (/metal|steel|chrome|bronze|gold|alloy/.test(materialName)) {
      clone.roughness = THREE.MathUtils.clamp(clone.roughness, 0.24, 0.5)
      clone.metalness = Math.max(clone.metalness, 0.62)
      clone.envMapIntensity = Math.max(clone.envMapIntensity, 1.35)
    } else {
      clone.roughness = THREE.MathUtils.clamp(Math.max(0.22, clone.roughness), 0.22, 0.84)
      clone.envMapIntensity = Math.max(clone.envMapIntensity, 1.05)
    }
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

  // Register the authored V3 sanctuary to the current canonical world. The source
  // was authored around spawn z~6.8 and portal z~-6.75; this transform lands those
  // surfaces on the current embodied bounds without stretching the vertical scale.
  root.position.set(0, 0, -0.78)
  root.scale.set(1.106, 1, 1.129)

  // The sanctuary GLB contains its own anonymous woven presence. Home now has the
  // real governed MakeHuman V4, so retaining both produced a doubled mannequin read.
  const embeddedPresence = root.getObjectByName('embodied-presence-root')
  if (embeddedPresence) embeddedPresence.visible = false

  // The authored basin predates the current Orb z checkpoint by roughly one metre.
  // Shift only its five basin/heart pieces so the governed Orb sits on the authored
  // pedestal while the outer terrain, spawn landing and portal alcoves stay aligned.
  for (const name of ['mirror-basin-rim', 'mirror-basin-water', 'orb-pedestal-lower', 'orb-pedestal-upper', 'sanctuary-heart-light']) {
    const object = root.getObjectByName(name)
    if (object) object.position.z -= 0.94
  }

  return root
}

function RitualFloor({ target }: { target: MutableRefObject<THREE.Vector3 | null> }) {
  const sanctuary = useGLTF(SANCTUARY)
  const model = useMemo(() => cloneSanctuary(sanctuary.scene), [sanctuary.scene])
  const onWalk = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation()
    if (useSceneStore.getState().inputLocked) return
    target.current = new THREE.Vector3(
      THREE.MathUtils.clamp(event.point.x, BOUNDS.minX, BOUNDS.maxX),
      0,
      THREE.MathUtils.clamp(event.point.z, BOUNDS.minZ, BOUNDS.maxZ),
    )
  }

  return <group name="home-authored-terrain">
    <primitive object={model} />
    <mesh name="home-walkable-navigation-surface" position={[0, 0.035, -1.55]} rotation={[-Math.PI / 2, 0, 0]} onClick={onWalk}>
      <planeGeometry args={[20.4, 20.2]} />
      <meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
    </mesh>
  </group>
}

function PhysicalEnvironment() {
  return <Environment resolution={128} frames={1} background={false} environmentIntensity={0.94}>
    <Lightformer form="rect" intensity={4.4} color="#e7eef6" position={[0, 8, 7]} scale={[10, 4, 1]} target={[0, 0.8, -2.5]} />
    <Lightformer form="rect" intensity={2.6} color="#8fc8d7" position={[-8, 3.5, -4]} scale={[6, 3, 1]} target={[0, 1, -3]} />
    <Lightformer form="rect" intensity={2.1} color="#9a8ac3" position={[8, 4, -5]} scale={[6, 3, 1]} target={[0, 1, -3]} />
    <Lightformer form="ring" intensity={1.8} color="#e9cf93" position={[0, 4.8, -10]} scale={5.5} target={[0, 1, -2]} />
  </Environment>
}

function ArchitecturalPracticals() {
  const fixtures = [
    [-6.1, 1.35, -5.9, '#6fc8d8'],
    [6.1, 1.35, -5.9, '#8b79bb'],
    [-7.4, 0.82, 1.2, '#d8b978'],
    [7.4, 0.82, 1.2, '#d8b978'],
  ] as const

  return <group name="home-cinematic-practical-lighting">
    {fixtures.map(([x, y, z, color], index) => <group key={`${x}-${z}`} position={[x, y, z]}>
      <mesh castShadow>
        <cylinderGeometry args={[0.055, 0.07, 0.32, 14]} />
        <meshStandardMaterial color="#29323e" roughness={0.38} metalness={0.62} />
      </mesh>
      <mesh position={[0, 0.18, 0]}>
        <sphereGeometry args={[0.045, 14, 14]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
      <pointLight position={[0, 0.14, 0]} intensity={index < 2 ? 0.9 : 0.62} color={color} distance={8} decay={2} />
    </group>)}
  </group>
}

function MoonAndMist({ reducedMotion }: { reducedMotion: boolean }) {
  const mist = useRef<THREE.Group>(null)
  useFrame(({ clock }) => {
    if (!reducedMotion && mist.current) mist.current.rotation.y = Math.sin(clock.elapsedTime * 0.018) * 0.018
  })

  return <>
    <group name="home-mountain-horizon" position={[-12, 12, -42]}>
      <mesh><sphereGeometry args={[2.1, 40, 40]} /><meshBasicMaterial color="#edf4ff" toneMapped={false} /></mesh>
      <mesh position={[0.75, 0.18, 0.5]}><sphereGeometry args={[2.05, 40, 40]} /><meshBasicMaterial color="#09131f" /></mesh>
    </group>
    <group ref={mist} name="home-living-vegetation" />
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
  const shards = useMemo(() => Array.from({ length: 9 }, (_, i) => ({
    a: (i / 9) * Math.PI * 2,
    r: 0.4 + (i % 3) * 0.06,
    y: ((i % 5) - 2) * 0.09,
    s: 0.05 + (i % 3) * 0.009,
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
    root.current.rotation.y = clock.elapsedTime * 0.045
    root.current.position.y = ORB.y + Math.sin(clock.elapsedTime * 0.72) * 0.028
    if (authoredCore.current) {
      const pulse = state === 'speaking' ? 0.68 : state === 'listening' ? 0.65 : 0.63 + Math.sin(clock.elapsedTime * 1.1) * 0.012
      authoredCore.current.scale.setScalar(pulse)
    }
  })

  return <group ref={root} name="home-orb-sanctuary" position={ORB} onClick={(e) => { e.stopPropagation(); onOpen() }} userData={{ orbState: state, animation: sensory.animation, modelClip: ORB_CLIPS[state], runtimeAsset: ORB_MODEL }}>
    <mesh>
      <sphereGeometry args={[0.59, 48, 48]} />
      <meshPhysicalMaterial color="#c8e9f5" transparent opacity={0.13} transmission={0.9} thickness={0.12} roughness={0.08} metalness={0.01} clearcoat={1} ior={1.28} envMapIntensity={1.35} />
    </mesh>
    <mesh scale={0.64}>
      <sphereGeometry args={[0.59, 36, 36]} />
      <meshPhysicalMaterial color="#405b82" transparent opacity={0.08} transmission={0.7} roughness={0.18} envMapIntensity={1.1} />
    </mesh>
    <group ref={authoredCore} scale={0.63}><primitive object={authoredOrb} /></group>
    <mesh rotation={[0.2,Math.PI/2,0.45]}>
      <torusGeometry args={[0.49,0.007,8,96]} />
      <meshStandardMaterial color="#d5f6fb" emissive="#54cfe4" emissiveIntensity={0.9} metalness={0.48} roughness={0.28} />
    </mesh>
    {shards.map((shard, i) => <mesh key={i} position={[Math.cos(shard.a)*shard.r, shard.y, Math.sin(shard.a)*shard.r]} rotation={[shard.a,shard.a*0.4,shard.a*0.7]} scale={shard.s}>
      <tetrahedronGeometry args={[1,0]} />
      <meshPhysicalMaterial color={i%3===0 ? '#e7d5a2' : '#9bddec'} emissive={i%3===0 ? '#6b5424' : '#29768a'} emissiveIntensity={0.82} roughness={0.24} metalness={0.22} clearcoat={0.72} envMapIntensity={1.25} />
    </mesh>)}
    <pointLight color="#a9f0ff" intensity={state === 'speaking' ? 3.6 : 2.8} distance={9} decay={2} />
  </group>
}

function OrbPlatform() {
  // The authored home GLB already owns the basin, stone pedestal and sanctuary heart.
  // Keep the runtime identity node without layering a second procedural pedestal on it.
  return <group name="home-sanctuary-pavilion" position={[ORB.x, 0.03, ORB.z]} userData={{ visualOwner: 'home-entry-chamber-v1.glb' }} />
}

function HumanPresence({ root }: { root: MutableRefObject<THREE.Group | null> }) {
  const human = useGLTF(HUMAN)
  const model = useMemo(() => cloneAuthoredModel(human.scene), [human.scene])
  return <group ref={root} name="home-authored-embodied-self" position={SPAWN} rotation={[0,Math.PI,0]}>
    <primitive object={model} scale={0.93} />
  </group>
}

function LifeMapPortal({ onActivate }: { onActivate: () => void }) {
  const portal = useGLTF(PORTAL_MODEL)
  const model = useMemo(() => cloneAuthoredModel(portal.scene), [portal.scene])
  return <group name="home-life-map-physical-portal" position={LIFE_MAP} rotation={[0, Math.PI, 0]} userData={{ runtimeAsset: PORTAL_MODEL }}>
    <primitive object={model} position={[0, 1.82, 0]} scale={0.72} />
    <pointLight position={[0, 1.82, 0.3]} color="#9bedff" intensity={2.6} distance={8} decay={2} />
    <mesh position={[0,1.8,0]} onClick={(e)=>{e.stopPropagation();onActivate()}}>
      <boxGeometry args={[3.7,4.2,2.4]} />
      <meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
    </mesh>
  </group>
}

function Thresholds({ onGround, onLifeMap }: { onGround: () => void; onLifeMap: () => void }) {
  return <>
    <group name="home-ground-environmental-threshold" position={GROUND}>
      <mesh position={[0,0.8,0]} onClick={(e)=>{e.stopPropagation();onGround()}}>
        <boxGeometry args={[4,2.8,4]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
      </mesh>
    </group>
    <group name="home-life-map-sky-lookout"><LifeMapPortal onActivate={onLifeMap} /></group>
  </>
}

function PlayerRig({ input, yaw, pitch, target, avatar, onNearby, transition, reducedMotion, onTransitionComplete }: { input: MovementInput; yaw: MutableRefObject<number>; pitch: MutableRefObject<number>; target: MutableRefObject<THREE.Vector3|null>; avatar: MutableRefObject<THREE.Group|null>; onNearby:(v:Nearby)=>void; transition:'none'|'ground'|'life-map'; reducedMotion:boolean; onTransitionComplete:()=>void }) {
  const { camera, size } = useThree()
  const pos = useRef(SPAWN.clone())
  const velocity = useRef(new THREE.Vector3())
  const started = useRef<number|null>(null)
  const issued = useRef(false)
  const last = useRef<Nearby>(null)

  useLayoutEffect(()=>{camera.position.set(0.62,1.72,8.45);camera.lookAt(0,1.28,0.3)},[camera])

  useFrame(({clock},delta)=>{
    if (transition !== 'none') {
      if (started.current===null) started.current=clock.elapsedTime
      const duration=reducedMotion?0.45:transition==='life-map'?3.4:2.6
      const t=THREE.MathUtils.smootherstep(THREE.MathUtils.clamp((clock.elapsedTime-started.current)/duration,0,1),0,1)
      if (transition==='life-map') {
        camera.position.lerp(new THREE.Vector3(0,34,-34),1-Math.pow(0.002,delta))
        camera.lookAt(0,10+t*22,-20-t*22)
        useSceneStore.getState().setProgress(t)
      } else {
        camera.position.lerp(new THREE.Vector3(-5.2,-2.2,-13.5),1-Math.pow(0.002,delta))
        camera.lookAt(-5.2,-1,-15)
      }
      if(t>=1&&!issued.current){issued.current=true;onTransitionComplete()}
      return
    }

    started.current=null
    issued.current=false
    stepEmbodiedMotion({delta,input,yaw:yaw.current,position:pos.current,velocity:velocity.current,target,bounds:BOUNDS,speed:2.7,acceleration:8,deceleration:11})
    if(avatar.current){avatar.current.position.copy(pos.current);avatar.current.rotation.y=yaw.current+Math.PI}

    const portrait=size.height>size.width
    const distance=portrait?1.62:1.48
    const lateral=portrait?0.48:0.72
    const behind=new THREE.Vector3(Math.sin(yaw.current)*-distance,portrait?1.58:1.7,Math.cos(yaw.current)*distance)
    const shoulder=new THREE.Vector3(Math.cos(yaw.current)*lateral,0,-Math.sin(yaw.current)*lateral)
    camera.position.lerp(pos.current.clone().add(behind).add(shoulder),1-Math.pow(0.001,delta))
    const look=pos.current.clone().add(new THREE.Vector3(-Math.sin(yaw.current)*5.4,1.3+pitch.current,-Math.cos(yaw.current)*5.4))
    camera.lookAt(look)

    const candidates:readonly [Nearby,THREE.Vector3,number][]=[['orb',ORB,2.5],['ground',GROUND,2.8],['life-map',LIFE_MAP,2.8]]
    let next:Nearby=null,best=Infinity
    for(const [name,p,r] of candidates){const d=Math.hypot(pos.current.x-p.x,pos.current.z-p.z);if(d<r&&d<best){next=name;best=d}}
    if(next!==last.current){last.current=next;onNearby(next)}
  })
  return null
}

function SceneReady({ onReady }: { onReady: () => void }) {
  const {scene}=useThree()
  const done=useRef(false)

  useEffect(()=>{
    let timer:number|undefined
    const check=()=>{
      if(done.current)return
      if(SANCTUARY_REQUIRED_OBJECTS.every((name)=>scene.getObjectByName(name))){
        done.current=true
        onReady()
        return
      }
      timer=window.setTimeout(check,60)
    }
    check()
    return()=>{if(timer!==undefined)window.clearTimeout(timer)}
  },[onReady,scene])

  return null
}

function SacredScene(props:{input:MovementInput;yaw:MutableRefObject<number>;pitch:MutableRefObject<number>;target:MutableRefObject<THREE.Vector3|null>;avatar:MutableRefObject<THREE.Group|null>;nearby:(v:Nearby)=>void;orbState:OrbState;reducedMotion:boolean;transition:'none'|'ground'|'life-map';onOrb:()=>void;onGround:()=>void;onLifeMap:()=>void;onTransitionComplete:()=>void;onReady:()=>void}){
  const cosmic=props.transition==='life-map'
  return <>
    <color attach="background" args={[cosmic?'#01030a':'#0a151f']} />
    <fogExp2 attach="fog" args={[cosmic?'#060918':'#0c1922',cosmic?0.0022:0.0062]} />
    <Stars radius={180} depth={90} count={cosmic?2800:380} factor={cosmic?3:0.95} saturation={0.14} fade speed={props.reducedMotion?0:0.025} />
    <PhysicalEnvironment />
    <ambientLight intensity={0.34} color="#a8b8c9" />
    <hemisphereLight args={['#c5d5e7','#1a1b20',0.74]} />
    <directionalLight position={[-10,16,6]} intensity={2.3} color="#e5eaf0" castShadow shadow-mapSize-width={1024} shadow-mapSize-height={1024} shadow-bias={-0.00012} />
    <directionalLight position={[9,7,-10]} intensity={0.62} color="#9587bf" />
    <directionalLight position={[-3,5,10]} intensity={0.46} color="#f3cfaa" />
    <spotLight position={[0,8,8]} intensity={1.7} color="#e4edf6" distance={32} angle={0.52} penumbra={0.92} decay={2} />
    <pointLight position={[-5.5,3.2,-4.5]} intensity={0.62} color="#69cfe5" distance={15} decay={2} />
    <pointLight position={[5.8,3,-5]} intensity={0.5} color="#9a84d9" distance={15} decay={2} />
    <ArchitecturalPracticals />
    <RitualFloor target={props.target} />
    <MoonAndMist reducedMotion={props.reducedMotion} />
    <OrbPlatform />
    <SacredOrb state={props.orbState} reducedMotion={props.reducedMotion} onOpen={props.onOrb} />
    <HumanPresence root={props.avatar} />
    <Thresholds onGround={props.onGround} onLifeMap={props.onLifeMap} />
    <ContactShadows position={[0, 0.02, -1.4]} opacity={0.34} scale={21} blur={2.8} far={7} resolution={256} frames={1} color="#020408" />
    <PlayerRig input={props.input} yaw={props.yaw} pitch={props.pitch} target={props.target} avatar={props.avatar} onNearby={props.nearby} transition={props.transition} reducedMotion={props.reducedMotion} onTransitionComplete={props.onTransitionComplete} />
    <SceneReady onReady={props.onReady} />
  </>
}

export function HomeWorldProductionSacred({onOrbOpen=requestUraiWorldOrbOpen,webglAvailable=true}:Props){
  const [canvasReady,setCanvasReady]=useState(false)
  const [sceneReady,setSceneReady]=useState(false)
  const [nearby,setNearby]=useState<Nearby>(null)
  const [dragging,setDragging]=useState(false)
  const [reducedMotion,setReducedMotion]=useState(false)
  const [mobile,setMobile]=useState(false)
  const [orbState,setOrbState]=useState<OrbState>('idle')
  const [transition,setTransition]=useState<'none'|'ground'|'life-map'>('none')
  const yaw=useRef(0)
  const pitch=useRef(-0.04)
  const target=useRef<THREE.Vector3|null>(null)
  const avatar=useRef<THREE.Group|null>(null)
  const markSceneReady=useCallback(()=>setSceneReady(true),[])

  const openOrb=useCallback(()=>{
    if(!useSceneStore.getState().inputLocked&&transition==='none'){
      setOrbState('attention')
      onOrbOpen()
    }
  },[onOrbOpen,transition])

  const ground=useCallback(()=>{
    if(transition!=='none')return
    target.current=null
    setOrbState('transition')
    setTransition('ground')
  },[transition])

  const lifeMap=useCallback(()=>{
    if(transition!=='none')return
    target.current=null
    setOrbState('transition')
    setTransition('life-map')
    useSceneStore.getState().enterLifeMap()
  },[transition])

  const interact=useCallback(()=>{
    if(nearby==='orb')openOrb()
    else if(nearby==='ground')ground()
    else if(nearby==='life-map')lifeMap()
  },[nearby,openOrb,ground,lifeMap])

  const input=useMovementInput({enabled:transition==='none',onInteract:interact,onReset:()=>{target.current=SPAWN.clone();yaw.current=0;pitch.current=-0.04}})
  const look=useDragLook({yaw,pitch,enabled:transition==='none',sensitivity:0.003,minPitch:-0.48,maxPitch:0.52,onDragState:setDragging})

  useEffect(()=>{
    const rm=window.matchMedia('(prefers-reduced-motion: reduce)')
    const m=window.matchMedia('(pointer: coarse), (max-width: 700px)')
    const apply=()=>{setReducedMotion(rm.matches);setMobile(m.matches)}
    apply()
    rm.addEventListener?.('change',apply)
    m.addEventListener?.('change',apply)
    return()=>{rm.removeEventListener?.('change',apply);m.removeEventListener?.('change',apply)}
  },[])

  useEffect(()=>{
    const fn=(e:CustomEvent<OrbStateEventDetail>)=>{if(transition==='none')setOrbState(e.detail.state)}
    window.addEventListener(URAI_ORB_STATE_EVENT,fn)
    return()=>window.removeEventListener(URAI_ORB_STATE_EVENT,fn)
  },[transition])

  useEffect(()=>{
    const cancel=(e:KeyboardEvent)=>{
      if(e.key!=='Escape'||transition==='none')return
      e.preventDefault()
      setTransition('none')
      setOrbState('idle')
      const store=useSceneStore.getState()
      store.setPhase('HOME')
      store.unlock()
    }
    window.addEventListener('keydown',cancel,true)
    return()=>window.removeEventListener('keydown',cancel,true)
  },[transition])

  if(!webglAvailable)return null
  const ready=canvasReady&&sceneReady
  const context=transition==='life-map'?'Ascending into your Life Map':transition==='ground'?'Descending into Ground':nearby==='orb'?'The Orb is here':nearby==='ground'?'The path descends':nearby==='life-map'?'Look to the sky':null
  const complete=()=>{
    if(transition==='ground')requestUraiWorldTravel({destination:'infrastructure-hub',href:'/ground/',entryPortal:'home-ground',cameraCheckpoint:'home-ground-descent'})
    else if(transition==='life-map')requestUraiWorldTravel({destination:'life-map',href:'/life-map/?from=home-sky',entryPortal:'home-sky',cameraCheckpoint:'home-sky-ascent-complete'})
  }

  return <main className={`${styles.world} urai-asset-home-world`} data-urai-home-production data-urai-true-3d="true" data-home-primary-owner="asset-driven" data-home-visible-world="moonlit-sacred-tech-sanctuary" data-home-world-character="premium-cinematic-sacred-tech" data-home-physical-base="authored-obsidian-ritual-platform" data-home-visual-ownership="three-dimensional-geometry" data-home-desktop-mobile-world="same-scene" data-home-embodied-self="makehuman-v4" data-home-movement="walk-keyboard-click-touch" data-home-audio="production-opus-consent-controlled" data-home-visual-grade="cinematic-pbr-v4" data-home-pbr-environment="local-lightformer-ibl" data-home-assets-ready={ready?'true':'false'} data-home-runtime-assets="home-entry-chamber-v1.glb home-human-makehuman-v4.glb urai-orb-avatar-v1.glb portal-ring-master-v1.glb authored-sacred-tech-composite" data-home-authored-regions="home-authored-terrain home-mountain-horizon home-living-vegetation home-sanctuary-pavilion home-life-map-physical-portal" data-home-nearby={nearby??'none'} data-home-camera-mode={transition!=='none'?transition:dragging?'look':'embodied-third-person'} data-home-scene-phase={transition==='none'?'HOME':transition.toUpperCase()} data-home-input-locked={transition!=='none'?'true':'false'} data-home-orb-state={orbState} data-home-orb-clip={resolveOrbSensoryOutput(orbState,reducedMotion,true).animation} data-home-orb-model-clip={reducedMotion?'stopped-reduced-motion':ORB_CLIPS[orbState]} data-testid="home-visible-navigable-sanctuary-world" style={{position:'relative',overflow:'hidden',background:'#0a151f'}} {...look}>
    <Canvas className={styles.canvas} dpr={[1,1.35]} shadows camera={{position:[0.62,1.72,8.45],fov:48,near:0.08,far:300}} gl={{antialias:true,alpha:false,powerPreference:'high-performance'}} onCreated={({gl})=>{gl.outputColorSpace=THREE.SRGBColorSpace;gl.toneMapping=THREE.ACESFilmicToneMapping;gl.toneMappingExposure=1.1;gl.shadowMap.type=THREE.PCFSoftShadowMap;setCanvasReady(true)}}>
      <SacredScene input={input} yaw={yaw} pitch={pitch} target={target} avatar={avatar} nearby={setNearby} orbState={orbState} reducedMotion={reducedMotion} transition={transition} onOrb={openOrb} onGround={ground} onLifeMap={lifeMap} onTransitionComplete={complete} onReady={markSceneReady} />
    </Canvas>
    {context?<div className={`${styles.worldHint} home-world-context`} role="status" aria-live="polite">{context}</div>:null}
    {transition==='none'&&mobile?<MobileMovementPad input={input} label="Home movement controls" />:null}
    <span className="sr-only" data-testid="urai-home-webgl-orb">The sacred-tech Orb companion is physically present in the Home sanctuary and consumes the final authored Orb GLB.</span>
    <span className="sr-only" data-testid="urai-home-embodied-avatar">Your embodied Home presence uses the real skinned V4 human candidate.</span>
  </main>
}

useGLTF.preload(SANCTUARY)
useGLTF.preload(ORB_MODEL)
useGLTF.preload(PORTAL_MODEL)
useGLTF.preload(HUMAN)