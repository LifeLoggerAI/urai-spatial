'use client'

import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import { Environment, MobileMovementPad as _Unused, useTexture } from '@react-three/drei'
import { useCallback, useEffect, useMemo, useRef, useState, type MutableRefObject } from 'react'
import * as THREE from 'three'
import { publishOrbState, resolveOrbSensoryOutput, URAI_ORB_STATE_EVENT, type OrbState, type OrbStateEventDetail } from '@/app/home/orbStateController'
import { MobileMovementPad, stepEmbodiedMotion, useDragLook, useMovementInput, type MovementInput } from '@/spatial/navigation/EmbodiedNavigation'
import { requestUraiWorldOrbOpen, requestUraiWorldTravel } from '@/spatial/world/worldEvents'
import styles from './HomeWorldProduction.module.css'

const ROCK_DIFFUSE = '/assets/urai/home-production/cc0/rock-tile-floor/rock-tile-floor-diff-1k.webp'
const ROCK_NORMAL = '/assets/urai/home-production/cc0/rock-tile-floor/rock-tile-floor-normal-gl-1k.webp'
const ROCK_ARM = '/assets/urai/home-production/cc0/rock-tile-floor/rock-tile-floor-arm-1k.webp'
const HOME_HDR = '/assets/urai/home-production/cc0/environment/studio-small-08-1k.hdr'
const SPAWN = new THREE.Vector3(0, 0.04, 4.6)
const ORB = new THREE.Vector3(-0.18, 1.72, -6.90)
const GROUND = new THREE.Vector3(-4.85, 0, -8.25)
const LIFE_MAP = new THREE.Vector3(4.85, 0, -8.25)
const BOUNDS = { minX: -7.4, maxX: 7.4, minZ: -14.0, maxZ: 6.7 }

type Nearby = 'orb' | 'ground' | 'life-map' | null
type Transition = 'none' | 'ground' | 'life-map'
type Vec3 = readonly [number, number, number]
type Props = { onOrbOpen?: () => void; webglAvailable?: boolean }

function useStoneTextures() {
  const [colorSource, normalSource, armSource] = useTexture([ROCK_DIFFUSE, ROCK_NORMAL, ROCK_ARM])
  return useMemo(() => {
    const prepare = (source: THREE.Texture, srgb = false) => {
      const texture = source.clone()
      texture.wrapS = THREE.RepeatWrapping; texture.wrapT = THREE.RepeatWrapping
      texture.repeat.set(7.5, 10.5); texture.anisotropy = 8
      texture.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace
      texture.needsUpdate = true
      return texture
    }
    return { color: prepare(colorSource, true), normal: prepare(normalSource), arm: prepare(armSource) }
  }, [armSource, colorSource, normalSource])
}

function terrainHeight(x: number, z: number) {
  const depth = THREE.MathUtils.clamp((5.8 - z) / 22.5, 0, 1)
  const lateral = Math.abs(x) / 9.2
  const channel = Math.exp(-Math.pow(x / 2.75, 4))
  const shoulders =
    Math.exp(-(Math.pow((x + 6.0) / 2.2, 2) + Math.pow((z + 3.0) / 5.2, 2))) * 1.55 +
    Math.exp(-(Math.pow((x - 6.35) / 2.0, 2) + Math.pow((z + 5.8) / 4.8, 2))) * 1.72 +
    Math.exp(-(Math.pow((x + 4.9) / 2.7, 2) + Math.pow((z + 11.8) / 3.8, 2))) * 1.92 +
    Math.exp(-(Math.pow((x - 4.1) / 2.8, 2) + Math.pow((z + 13.0) / 3.7, 2))) * 1.56
  const erosion = (Math.sin(x * 0.61 + z * 0.37) * 0.32 + Math.sin(x * 1.47 - z * 0.83) * 0.16 + Math.cos(x * 2.31 + z * 1.71) * 0.07) * (0.22 + lateral * 0.62)
  const side = Math.pow(lateral, 2.25) * (0.24 + depth * 2.55)
  const far = Math.pow(depth, 3.1) * (2.35 + 0.46 * Math.sin(x * 0.34) + 0.22 * Math.cos(x * 0.72))
  const trail = -0.16 * channel * (0.35 + depth * 0.65)
  return -0.54 + shoulders + side + far + erosion + trail
}

function SanctuaryTerrain({ onWalk }: { onWalk: (event: ThreeEvent<MouseEvent>) => void }) {
  const textures = useStoneTextures()
  const geometry = useMemo(() => {
    const xs = 104, zs = 132
    const positions: number[] = [], uvs: number[] = [], colors: number[] = [], indices: number[] = []
    const low = new THREE.Color('#183a31'), moss = new THREE.Color('#496655'), mineral = new THREE.Color('#80654b')
    for (let zi = 0; zi <= zs; zi += 1) {
      const tz = zi / zs, z = 6.0 - tz * 24.5
      for (let xi = 0; xi <= xs; xi += 1) {
        const tx = xi / xs, x = -9.5 + tx * 19.0, y = terrainHeight(x, z)
        positions.push(x, y, z); uvs.push(tx * 10, tz * 13)
        const strata = 0.5 + Math.sin(y * 8.1 + x * 0.43 - z * 0.27) * 0.5
        const lateral = THREE.MathUtils.clamp(Math.abs(x) / 9.5, 0, 1)
        const c = low.clone().lerp(moss, 0.42 - lateral * 0.14).lerp(mineral, strata * 0.23)
        colors.push(c.r, c.g, c.b)
      }
    }
    for (let zi = 0; zi < zs; zi += 1) for (let xi = 0; xi < xs; xi += 1) {
      const a = zi * (xs + 1) + xi, b = a + 1, c = a + xs + 1, d = c + 1
      if ((xi + zi) & 1) indices.push(a, b, d, a, d, c); else indices.push(a, b, c, b, d, c)
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
    g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
    g.setIndex(indices); g.computeVertexNormals(); return g
  }, [])
  return <mesh name="home-v219-continuous-weathered-sanctuary" geometry={geometry} receiveShadow onClick={onWalk} userData={{ visibleProductionAsset: true, authoredRevision: 'v219' }}>
    <meshStandardMaterial vertexColors map={textures.color} normalMap={textures.normal} normalScale={new THREE.Vector2(0.55, 0.55)} roughnessMap={textures.arm} roughness={0.94} metalness={0.01} envMapIntensity={0.62} />
  </mesh>
}

function irregularGeometry(seed: number, radius = 1, detail = 3) {
  const geometry = new THREE.IcosahedronGeometry(radius, detail)
  const position = geometry.attributes.position as THREE.BufferAttribute
  const v = new THREE.Vector3()
  for (let i = 0; i < position.count; i += 1) {
    v.fromBufferAttribute(position, i)
    const wave = 1 + Math.sin(v.x * 5.3 + seed) * 0.075 + Math.cos(v.y * 7.1 - seed * 0.41) * 0.052 + Math.sin(v.z * 9.7 + seed * 1.17) * 0.038
    v.multiplyScalar(wave); position.setXYZ(i, v.x, v.y, v.z)
  }
  position.needsUpdate = true; geometry.computeVertexNormals(); return geometry
}

function WeatheredMass({ name, position, scale, rotation = [0, 0, 0], seed, tint }: { name: string; position: Vec3; scale: Vec3; rotation?: Vec3; seed: number; tint: string }) {
  const textures = useStoneTextures(); const geometry = useMemo(() => irregularGeometry(seed), [seed])
  return <mesh name={name} geometry={geometry} position={position as [number, number, number]} scale={scale as [number, number, number]} rotation={rotation as [number, number, number]} castShadow receiveShadow userData={{ visibleProductionAsset: true, authoredRevision: 'v219' }}>
    <meshStandardMaterial color={tint} map={textures.color} normalMap={textures.normal} normalScale={new THREE.Vector2(0.42, 0.42)} roughnessMap={textures.arm} roughness={0.92} metalness={0.01} envMapIntensity={0.58} />
  </mesh>
}

function EnvironmentalRidges() {
  const masses = [
    ['port-near', [-8.0, 0.75, -4.0], [3.4, 2.1, 3.5], [0, .20, -.08], 21, '#385246'],
    ['port-far', [-7.7, 2.15, -14.4], [4.4, 3.7, 4.2], [0, -.18, .12], 23, '#2e473d'],
    ['starboard-near', [8.1, .85, -5.8], [3.5, 2.35, 3.7], [0, -.22, .08], 25, '#3b584a'],
    ['starboard-far', [7.3, 2.35, -15.0], [4.7, 3.9, 4.4], [0, .16, -.11], 27, '#30483f'],
  ] as const
  return <>{masses.map(([name, position, scale, rotation, seed, tint]) => <WeatheredMass key={name} name={`home-v219-ridge-${name}`} position={position} scale={scale} rotation={rotation} seed={seed} tint={tint} />)}</>
}

function GroundPlace({ onOpen }: { onOpen: () => void }) {
  return <group name="home-v219-ground-place" position={[-4.85, terrainHeight(-4.85, -8.25) + 0.15, -8.25]} onClick={(e) => { e.stopPropagation(); onOpen() }} userData={{ destination: 'ground', visibleProductionAsset: true }}>
    <WeatheredMass name="ground-v219-rooted-shelf" position={[0, .18, 0]} scale={[2.35, .52, 1.95]} seed={41} tint="#496354" />
    <WeatheredMass name="ground-v219-eroded-shelter" position={[-.35, 1.08, -1.18]} scale={[2.2, 1.25, .68]} rotation={[0, .12, -.08]} seed={43} tint="#354f43" />
    <WeatheredMass name="ground-v219-port-shoulder" position={[-1.55, .55, .30]} scale={[1.05, .52, .95]} seed={45} tint="#3d594b" />
    <WeatheredMass name="ground-v219-starboard-shoulder" position={[1.46, .45, -.14]} scale={[1.0, .48, 1.08]} seed={47} tint="#405c4e" />
    <pointLight position={[-.32, .48, -.28]} color="#c59864" intensity={1.35} distance={4.2} decay={2} />
  </group>
}

function LifeMapPlace({ onOpen }: { onOpen: () => void }) {
  const branchA = useMemo(() => new THREE.CatmullRomCurve3([new THREE.Vector3(0,0,0),new THREE.Vector3(-.35,.65,-.05),new THREE.Vector3(-.52,1.35,-.18),new THREE.Vector3(-.28,2.1,-.35)]), [])
  const branchB = useMemo(() => new THREE.CatmullRomCurve3([new THREE.Vector3(.05,.45,0),new THREE.Vector3(.52,1.0,-.06),new THREE.Vector3(.82,1.65,-.22),new THREE.Vector3(.66,2.35,-.42)]), [])
  return <group name="home-v219-life-map-place" position={[4.85, terrainHeight(4.85, -8.25) + .05, -8.25]} onClick={(e) => { e.stopPropagation(); onOpen() }} userData={{ destination: 'life-map', visibleProductionAsset: true }}>
    <WeatheredMass name="lifemap-v219-rooted-foundation" position={[0,.16,.05]} scale={[2.15,.46,1.82]} seed={61} tint="#414858" />
    <mesh castShadow receiveShadow><tubeGeometry args={[branchA, 44, .24, 9, false]} /><meshStandardMaterial color="#53556b" roughness={.84} metalness={.03} /></mesh>
    <mesh castShadow receiveShadow><tubeGeometry args={[branchB, 44, .21, 9, false]} /><meshStandardMaterial color="#5b5872" roughness={.82} metalness={.03} /></mesh>
    <WeatheredMass name="lifemap-v219-crown" position={[.12,2.28,-.40]} scale={[1.15,.52,.82]} rotation={[0,.12,.18]} seed={67} tint="#66607b" />
    <pointLight position={[.12,1.65,.18]} color="#aaa6d8" intensity={1.25} distance={4.8} decay={2} />
  </group>
}

function livingOrbGeometry() {
  const nu = 64, nv = 36, positions: number[] = [], colors: number[] = [], indices: number[] = []
  const dark = new THREE.Color('#245545'), light = new THREE.Color('#78b79b'), warm = new THREE.Color('#c58e59')
  for (let j = 0; j <= nv; j += 1) {
    const v = j / nv, phi = Math.PI * v
    for (let i = 0; i < nu; i += 1) {
      const u = i / nu, theta = Math.PI * 2 * u
      const lobes = .16 * Math.sin(3 * theta + phi * .7) + .10 * Math.sin(5 * theta - phi * 1.3) + .07 * Math.cos(2 * theta + phi * 2.1)
      const bias = .15 * Math.cos(theta - .6) * Math.pow(Math.sin(phi), 2) + .08 * Math.sin(theta * 2 + .8) * Math.sin(phi)
      const radius = .74 * (1 + lobes + bias)
      const x = radius * Math.sin(phi) * Math.cos(theta) * (.90 + .10 * Math.cos(phi)) + .12 * (1 - v) * Math.sin(phi) - .10 * v * Math.sin(theta)
      const z = radius * Math.sin(phi) * Math.sin(theta) * (.74 + .10 * Math.sin(theta + .5)) + .06 * Math.cos(theta * 2 + phi)
      const y = 1.02 * Math.cos(phi) + .16 * Math.sin(2 * phi + theta * .8) + .08 * Math.cos(3 * phi - theta)
      positions.push(x, y, z)
      const layer = .5 + .5 * Math.sin(phi * 9 + theta * 2.4), glow = Math.max(0, Math.cos(theta - .8)) * Math.pow(Math.sin(phi), 3)
      const c = dark.clone().lerp(light, .28 + layer * .35).lerp(warm, glow * .18); colors.push(c.r,c.g,c.b)
    }
  }
  for (let j=0;j<nv;j+=1) for(let i=0;i<nu;i+=1){const ni=(i+1)%nu,a=j*nu+i,b=j*nu+ni,c=(j+1)*nu+i,d=(j+1)*nu+ni;indices.push(a,b,c,b,d,c)}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));g.setIndex(indices);g.computeVertexNormals();return g
}

const ORB_POSTURE: Record<OrbState, { scale: Vec3; tilt: Vec3; speed: number; emission: number }> = {
  dormant:{scale:[.88,.80,.84],tilt:[.14,-.12,-.12],speed:.12,emission:.10}, idle:{scale:[1,1,1],tilt:[-.06,.16,-.04],speed:.42,emission:.18}, attention:{scale:[1.08,1.12,.90],tilt:[-.14,.30,.12],speed:.70,emission:.28}, listening:{scale:[.90,1.22,.88],tilt:[.18,-.24,-.10],speed:.30,emission:.25}, thinking:{scale:[1.12,.92,1.08],tilt:[-.24,.48,.18],speed:.24,emission:.23}, speaking:{scale:[1.18,1.06,.84],tilt:[.08,.16,-.20],speed:1.0,emission:.38}, guiding:{scale:[.96,1.28,.88],tilt:[-.28,-.10,.16],speed:.52,emission:.30}, reflecting:{scale:[.92,1.02,1.16],tilt:[.22,.54,-.16],speed:.18,emission:.17}, calming:{scale:[1.10,.88,1.05],tilt:[-.04,-.20,.06],speed:.16,emission:.14}, privacy:{scale:[.82,.92,.78],tilt:[.30,.62,.22],speed:.10,emission:.08}, warning:{scale:[1.20,1.16,.78],tilt:[-.30,-.34,-.22],speed:1.28,emission:.46}, transition:{scale:[.88,1.34,.82],tilt:[-.36,.28,.24],speed:.82,emission:.34},
}

function LivingMemoryPresence({ state, reducedMotion, onOpen }: { state: OrbState; reducedMotion: boolean; onOpen: () => void }) {
  const root=useRef<THREE.Group>(null); const geometry=useMemo(livingOrbGeometry,[]); const posture=ORB_POSTURE[state]
  useFrame(({clock},delta)=>{if(!root.current)return;const t=clock.elapsedTime*posture.speed;root.current.rotation.y=posture.tilt[1]+(reducedMotion?0:Math.sin(t)*.16);root.current.rotation.x=posture.tilt[0]+(reducedMotion?0:Math.sin(t*.63)*.055);root.current.rotation.z=posture.tilt[2];const breath=reducedMotion?1:1+Math.sin(t*.82)*.025;root.current.scale.lerp(new THREE.Vector3(posture.scale[0]*breath,posture.scale[1]*breath,posture.scale[2]*breath),1-Math.pow(.001,delta))})
  const palette=resolveOrbSensoryOutput(state,reducedMotion,true)
  return <group ref={root} name="home-v219-connected-asymmetric-living-memory-presence" position={ORB} onClick={(e)=>{e.stopPropagation();onOpen()}} userData={{orbState:state,animation:palette.animation,visibleProductionAsset:true,authoredRevision:'v219'}}>
    <mesh geometry={geometry} castShadow receiveShadow><meshPhysicalMaterial vertexColors roughness={.58} metalness={.04} clearcoat={.16} clearcoatRoughness={.62} emissive={state==='warning'?'#6c291d':'#163b31'} emissiveIntensity={posture.emission} envMapIntensity={.78}/></mesh>
    <mesh geometry={geometry} scale={[.76,.76,.76]}><meshPhysicalMaterial color="#153c32" roughness={.44} metalness={.02} emissive="#2a8067" emissiveIntensity={posture.emission*.65} side={THREE.BackSide}/></mesh>
    <pointLight color={state==='warning'?'#d07052':'#6cc2a0'} intensity={.55+posture.emission*1.7} distance={4.8} decay={2}/>
  </group>
}

function ReducedMotionCadence({active}:{active:boolean}){const{invalidate,setFrameloop}=useThree();useEffect(()=>{if(!active){setFrameloop('always');return}setFrameloop('demand');const timer=window.setInterval(()=>invalidate(),280);invalidate();return()=>window.clearInterval(timer)},[active,invalidate,setFrameloop]);return null}

function PlayerRig({input,yaw,pitch,target,onNearby,transition,owner}:{input:MovementInput;yaw:MutableRefObject<number>;pitch:MutableRefObject<number>;target:MutableRefObject<THREE.Vector3|null>;onNearby:(value:Nearby)=>void;transition:Transition;owner:MutableRefObject<HTMLElement|null>}){
  const{camera,size}=useThree();const position=useRef(SPAWN.clone());const velocity=useRef(new THREE.Vector3());const last=useRef<Nearby>(null);const frames=useRef(0)
  useEffect(()=>{camera.position.set(SPAWN.x,1.58,SPAWN.z);camera.lookAt(0,1.18,-8.6);camera.near=.1;camera.far=120;camera.updateProjectionMatrix()},[camera])
  useFrame((_,delta)=>{if(transition==='none')stepEmbodiedMotion({position:position.current,velocity:velocity.current,input,target,yaw:yaw.current,delta,speed:2.9,acceleration:9,deceleration:12,bounds:BOUNDS,arrivalRadius:.32});else velocity.current.multiplyScalar(.72);frames.current+=1;const shell=owner.current;if(shell){shell.dataset.homePlayerX=position.current.x.toFixed(3);shell.dataset.homePlayerZ=position.current.z.toFixed(3);shell.dataset.homeDistance=position.current.distanceTo(SPAWN).toFixed(3);shell.dataset.homeDistanceOrb=Math.hypot(position.current.x-ORB.x,position.current.z-ORB.z).toFixed(3);shell.dataset.homeDistanceGround=Math.hypot(position.current.x-GROUND.x,position.current.z-GROUND.z).toFixed(3);shell.dataset.homeDistanceLifeMap=Math.hypot(position.current.x-LIFE_MAP.x,position.current.z-LIFE_MAP.z).toFixed(3);shell.dataset.homeMoving=velocity.current.lengthSq()>.0004?'true':'false';shell.dataset.homeRenderedFrames=String(frames.current)}let nearby:Nearby=null,best=Infinity;for(const[name,point,radius]of[['orb',ORB,2.35],['ground',GROUND,2.65],['life-map',LIFE_MAP,2.65]] as const){const distance=Math.hypot(position.current.x-point.x,position.current.z-point.z);if(distance<radius&&distance<best){nearby=name;best=distance}}const portrait=size.height>size.width;if(camera instanceof THREE.PerspectiveCamera){const fov=portrait?50:40;if(Math.abs(camera.fov-fov)>.05){camera.fov=fov;camera.updateProjectionMatrix()}}camera.position.lerp(position.current.clone().add(new THREE.Vector3(Math.sin(yaw.current)*(nearby?1.55:.08),portrait?1.52:1.58,Math.cos(yaw.current)*(nearby?1.55:.08))),1-Math.pow(.0008,delta));camera.lookAt(position.current.clone().add(new THREE.Vector3(-Math.sin(yaw.current)*10.5,1.28+pitch.current*.38,-Math.cos(yaw.current)*10.5)));if(nearby!==last.current){last.current=nearby;onNearby(nearby)}});return null
}

function Scene({input,yaw,pitch,target,onNearby,transition,reducedMotion,orbState,onOrb,onGround,onLifeMap,onReady,owner}:{input:MovementInput;yaw:MutableRefObject<number>;pitch:MutableRefObject<number>;target:MutableRefObject<THREE.Vector3|null>;onNearby:(value:Nearby)=>void;transition:Transition;reducedMotion:boolean;orbState:OrbState;onOrb:()=>void;onGround:()=>void;onLifeMap:()=>void;onReady:()=>void;owner:MutableRefObject<HTMLElement|null>}){
  const onWalk=(e:ThreeEvent<MouseEvent>)=>{e.stopPropagation();target.current=new THREE.Vector3(THREE.MathUtils.clamp(e.point.x,BOUNDS.minX,BOUNDS.maxX),0,THREE.MathUtils.clamp(e.point.z,BOUNDS.minZ,BOUNDS.maxZ))}
  useEffect(()=>onReady(),[onReady])
  return <><ReducedMotionCadence active={reducedMotion}/><color attach="background" args={['#061315']}/><fogExp2 attach="fog" args={['#12322f',.023]}/><Environment files={HOME_HDR} background={false} environmentIntensity={.72}/><ambientLight intensity={.42} color="#c8d8cf"/><hemisphereLight args={['#b9d0c6','#342a22',.62]}/><directionalLight position={[-6,10,4]} intensity={1.65} color="#e7cda2" castShadow shadow-mapSize-width={1024} shadow-mapSize-height={1024}/><directionalLight position={[7,6,-10]} intensity={.48} color="#7ea99b"/><SanctuaryTerrain onWalk={onWalk}/><EnvironmentalRidges/><GroundPlace onOpen={onGround}/><LifeMapPlace onOpen={onLifeMap}/><LivingMemoryPresence state={orbState} reducedMotion={reducedMotion} onOpen={onOrb}/><PlayerRig input={input} yaw={yaw} pitch={pitch} target={target} onNearby={onNearby} transition={transition} owner={owner}/></>
}

export function HomeWorldProductionV219({onOrbOpen=requestUraiWorldOrbOpen,webglAvailable=true}:Props){
  const[canvasReady,setCanvasReady]=useState(false),[sceneReady,setSceneReady]=useState(false),[nearby,setNearby]=useState<Nearby>(null),[dragging,setDragging]=useState(false),[reducedMotion,setReducedMotion]=useState(false),[mobile,setMobile]=useState(false),[orbState,setOrbState]=useState<OrbState>('idle'),[transition,setTransition]=useState<Transition>('none');const yaw=useRef(0),pitch=useRef(.06),target=useRef<THREE.Vector3|null>(null),worldRef=useRef<HTMLElement>(null);const markReady=useCallback(()=>setSceneReady(true),[])
  const openOrb=useCallback(()=>{if(transition==='none'){setOrbState('attention');onOrbOpen()}},[onOrbOpen,transition]);const openGround=useCallback(()=>{if(transition==='none'){target.current=null;setOrbState('transition');setTransition('ground')}},[transition]);const openLifeMap=useCallback(()=>{if(transition==='none'){target.current=null;setOrbState('transition');setTransition('life-map')}},[transition]);const interact=useCallback(()=>{if(nearby==='orb')openOrb();else if(nearby==='ground')openGround();else if(nearby==='life-map')openLifeMap()},[nearby,openGround,openLifeMap,openOrb]);const input=useMovementInput({enabled:transition==='none',onInteract:interact,onReset:()=>{target.current=SPAWN.clone();yaw.current=0;pitch.current=.06}});const look=useDragLook({yaw,pitch,enabled:transition==='none',sensitivity:.003,minPitch:-.46,maxPitch:.50,onDragState:setDragging})
  useEffect(()=>{const rm=window.matchMedia('(prefers-reduced-motion: reduce)'),mq=window.matchMedia('(pointer: coarse), (max-width: 700px)');const apply=()=>{setReducedMotion(rm.matches);setMobile(mq.matches)};apply();rm.addEventListener?.('change',apply);mq.addEventListener?.('change',apply);return()=>{rm.removeEventListener?.('change',apply);mq.removeEventListener?.('change',apply)}},[])
  useEffect(()=>{const listener=(event:CustomEvent<OrbStateEventDetail>)=>{if(transition==='none')setOrbState(event.detail.state)};window.addEventListener(URAI_ORB_STATE_EVENT,listener);return()=>window.removeEventListener(URAI_ORB_STATE_EVENT,listener)},[transition])
  useEffect(()=>{if(transition==='none')return;const timer=window.setTimeout(()=>{if(transition==='ground')requestUraiWorldTravel({destination:'infrastructure-hub',href:'/ground/',entryPortal:'home-ground',cameraCheckpoint:'home-ground-descent'});else requestUraiWorldTravel({destination:'life-map',href:'/life-map/?from=home-sky',entryPortal:'home-sky',cameraCheckpoint:'home-sky-ascent-complete'})},reducedMotion?720:1800);return()=>window.clearTimeout(timer)},[reducedMotion,transition])
  useEffect(()=>{const cancel=(event:KeyboardEvent)=>{if(event.key==='Escape'&&transition!=='none'){event.preventDefault();setTransition('none');setOrbState('idle')}};window.addEventListener('keydown',cancel,true);return()=>window.removeEventListener('keydown',cancel,true)},[transition])
  if(!webglAvailable)return null;const ready=canvasReady&&sceneReady;const context=transition==='life-map'?'Ascending into your Life Map':transition==='ground'?'Descending into Ground':nearby==='orb'?'The Orb is here':nearby==='ground'?'The path descends':nearby==='life-map'?'The path rises into your Life Map':null
  return <main ref={worldRef} className={`${styles.world} urai-asset-home-world`} data-urai-home-production data-urai-true-3d="true" data-home-primary-owner="asset-driven" data-home-visible-world="v219-authored-inhabited-memory-sanctuary" data-home-visual-ownership="single-canvas-three-dimensional-geometry" data-home-desktop-mobile-world="same-scene" data-home-embodied-self="privacy-preserving-first-person" data-home-movement="walk-keyboard-click-touch" data-home-pointer-lock="false" data-home-ready={ready?'true':'warming'} data-home-input-ready={ready?'true':'false'} data-home-interaction-ready={ready?'true':'false'} data-home-player-x={SPAWN.x.toFixed(3)} data-home-player-z={SPAWN.z.toFixed(3)} data-home-distance="0.000" data-home-distance-orb={Math.hypot(SPAWN.x-ORB.x,SPAWN.z-ORB.z).toFixed(3)} data-home-distance-ground={Math.hypot(SPAWN.x-GROUND.x,SPAWN.z-GROUND.z).toFixed(3)} data-home-distance-life-map={Math.hypot(SPAWN.x-LIFE_MAP.x,SPAWN.z-LIFE_MAP.z).toFixed(3)} data-home-moving="false" data-home-rendered-frames="0" data-home-nearby={nearby??'none'} data-home-camera-mode={transition!=='none'?transition:dragging?'look':'embodied-first-person'} data-home-scene-phase={transition==='none'?'HOME':transition.toUpperCase()} data-home-portal-sequence={transition==='none'?'idle':`${transition}:traversal`} data-home-portal-lifecycle="environmental-approach-traversal-arrival" data-home-input-locked={transition!=='none'?'true':'false'} data-home-orb-state={orbState} data-home-orb-clip={resolveOrbSensoryOutput(orbState,reducedMotion,true).animation} data-home-final-art-revision="v219-retained-pixels-pending" data-home-live-art-revision="v219-authored-inhabited-memory-sanctuary" data-home-art-certification="fresh-exact-head-pixels-required" data-home-scanned-composition="v219-continuous-geology-rooted-destinations" data-home-visible-production-assets="v219-continuous-geology v219-ground-place v219-life-map-place v219-connected-living-memory-presence" data-testid="home-visible-navigable-sanctuary-world" style={{position:'relative',overflow:'hidden',backgroundColor:'#061315'}} {...look}>
    <Canvas className={styles.canvas} dpr={1} shadows frameloop={reducedMotion?'demand':'always'} camera={{position:[SPAWN.x,1.58,SPAWN.z],fov:42,near:.1,far:120}} gl={{antialias:true,alpha:false,powerPreference:'high-performance'}} onCreated={({gl})=>{gl.outputColorSpace=THREE.SRGBColorSpace;gl.toneMapping=THREE.ACESFilmicToneMapping;gl.toneMappingExposure=1.36;gl.shadowMap.type=THREE.PCFSoftShadowMap;gl.setClearColor(0x061315,1);setCanvasReady(true)}}><Scene input={input} yaw={yaw} pitch={pitch} target={target} onNearby={setNearby} transition={transition} reducedMotion={reducedMotion} orbState={orbState} onOrb={openOrb} onGround={openGround} onLifeMap={openLifeMap} onReady={markReady} owner={worldRef}/></Canvas>
    {context?<div className={`${styles.worldHint} home-world-context`} role="status" aria-live="polite">{context}</div>:null}{transition==='none'&&mobile?<MobileMovementPad input={input} label="Home movement controls"/>:null}<span className="sr-only" data-testid="urai-home-webgl-orb">The connected living Orb is integrated into your private sanctuary.</span><span className="sr-only" data-testid="urai-home-embodied-avatar">Your privacy-preserving embodied Home presence remains active.</span>
  </main>
}

export const HomeWorldProduction = HomeWorldProductionV219
useTexture.preload([ROCK_DIFFUSE, ROCK_NORMAL, ROCK_ARM])
