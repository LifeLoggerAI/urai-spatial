'use client'

import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import { ContactShadows, Environment, RoundedBox, Stars, useAnimations, useGLTF, useTexture } from '@react-three/drei'
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
const FERN_MODEL = '/assets/urai/home-production/cc0/polyhaven-fern-02-geometry-v1.glb'
const ROCK_DIFFUSE = '/assets/urai/home-production/cc0/rock-tile-floor/rock-tile-floor-diff-1k.webp'
const ROCK_NORMAL = '/assets/urai/home-production/cc0/rock-tile-floor/rock-tile-floor-normal-gl-1k.webp'
const ROCK_ARM = '/assets/urai/home-production/cc0/rock-tile-floor/rock-tile-floor-arm-1k.webp'
const ROCK_DISPLACEMENT = '/assets/urai/home-production/cc0/rock-tile-floor/rock-tile-floor-displacement-1k.png'
const HOME_HDR = '/assets/urai/home-production/cc0/environment/studio-small-08-1k.hdr'
const V48_ROCK_FACE_01 = '/assets/urai/home-production/cc0/polyhaven-v48/rock_face_01/asset.gltf'
const V48_ROCK_FACE_02 = '/assets/urai/home-production/cc0/polyhaven-v48/rock_face_02/asset.gltf'
const V48_PIPE_SYSTEM = '/assets/urai/home-production/cc0/polyhaven-v48/modular_industrial_pipes_01/asset.gltf'
const V48_CAGED_SCONCE = '/assets/urai/home-production/cc0/polyhaven-v48/industrial_caged_sconce/asset.gltf'
const HOME_PHOTOGRAPHIC_PBR_V19 = 'polyhaven-rock-tile-floor-plus-studio-small-08-built-sanctuary-v19'
const HOME_SCANNED_COMPOSITION_V1 = 'built-sacred-tech-sanctuary-v20'

const SPAWN = new THREE.Vector3(4.45, 0.04, 3.15)
const ORB = new THREE.Vector3(0, 2.35, -7.25)
const GROUND = new THREE.Vector3(-5.2, 0, -8.4)
const LIFE_MAP = new THREE.Vector3(5.2, 0, -8.4)
const BOUNDS = { minX: -6.6, maxX: 6.6, minZ: -9.4, maxZ: 7.2 }
const DEFAULT_YAW = 0.435

const ORB_CLIPS: Record<OrbState, string> = {
  dormant: 'Orb_Resting', idle: 'Orb_Idle', attention: 'Orb_Attention', listening: 'Orb_Listening',
  thinking: 'Orb_Thinking', speaking: 'Orb_Speaking', guiding: 'Orb_Guiding', reflecting: 'Orb_Reflecting',
  calming: 'Orb_Calming', privacy: 'Orb_Privacy', warning: 'Orb_Degraded', transition: 'Orb_Transition',
}

const SANCTUARY_REQUIRED_OBJECTS = [
  'home-authored-terrain', 'home-authored-embodied-self', 'home-orb-sanctuary',
  'home-ground-environmental-threshold', 'home-life-map-sky-lookout', 'home-life-map-physical-portal',
  'home-sanctuary-pavilion', 'home-v47-side-gallery', 'home-v47-reliquary-cavity',
  'home-v47-reliquary-apse', 'home-v49-scanned-detail-layer', 'home-v49-authored-practicals',
  'home-orb-engineered-cradle', 'home-v47-machine-core-assembly',
] as const

type Nearby = 'orb' | 'ground' | 'life-map' | null
type TransitionSequence = 'idle' | 'ground:opening' | 'ground:traversal' | 'ground:closing' | 'life-map:opening' | 'life-map:traversal' | 'life-map:closing'
type Props = { onOrbOpen?: () => void; webglAvailable?: boolean }
type Vec3 = readonly [number, number, number]
type SurfacePack = { color: THREE.Texture; normal: THREE.Texture; arm: THREE.Texture; displacement: THREE.Texture }

const ORB_FRAGMENT_LAYOUT: readonly [Vec3, Vec3, number][] = [
  [[0.29, 0.08, 0.11], [0.22, 0.54, 0.18], 0.055],
  [[-0.24, 0.17, -0.14], [-0.31, 0.18, 0.62], 0.047],
  [[0.1, -0.25, 0.23], [0.72, -0.15, 0.24], 0.042],
  [[-0.12, -0.22, -0.25], [-0.64, 0.41, -0.12], 0.05],
  [[0.18, 0.29, -0.08], [0.18, -0.38, 0.81], 0.038],
  [[-0.29, -0.05, 0.09], [0.48, 0.32, -0.56], 0.044],
]

function seededNoise(x: number, y: number, seed: number) {
  const raw = Math.sin((x + seed * 17.17) * 12.9898 + (y + seed * 31.31) * 78.233) * 43758.5453123
  return raw - Math.floor(raw)
}

function configureTexture(texture: THREE.Texture, repeatX: number, repeatY: number, color = false) {
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(repeatX, repeatY)
  texture.minFilter = THREE.LinearMipmapLinearFilter
  texture.magFilter = THREE.LinearFilter
  texture.generateMipmaps = true
  texture.anisotropy = 8
  texture.colorSpace = color ? THREE.SRGBColorSpace : THREE.NoColorSpace
  texture.needsUpdate = true
  return texture
}

function useStonePack(repeatX = 1.35, repeatY = 1.85) {
  const [sourceColor, sourceNormal, sourceArm, sourceDisplacement] = useTexture([ROCK_DIFFUSE, ROCK_NORMAL, ROCK_ARM, ROCK_DISPLACEMENT])
  const pack = useMemo(() => ({
    color: configureTexture(sourceColor.clone(), repeatX, repeatY, true),
    normal: configureTexture(sourceNormal.clone(), repeatX, repeatY),
    arm: configureTexture(sourceArm.clone(), repeatX, repeatY),
    displacement: configureTexture(sourceDisplacement.clone(), repeatX, repeatY),
  }), [repeatX, repeatY, sourceArm, sourceColor, sourceDisplacement, sourceNormal])
  useEffect(() => () => { pack.color.dispose(); pack.normal.dispose(); pack.arm.dispose(); pack.displacement.dispose() }, [pack])
  return pack
}

function StoneTopMaterial({ pack, color = '#343a39', relief = 0.018 }: { pack: SurfacePack; color?: string; relief?: number }) {
  return <meshPhysicalMaterial color={color} map={pack.color} normalMap={pack.normal} normalScale={new THREE.Vector2(0.44, 0.44)} roughnessMap={pack.arm} displacementMap={pack.displacement} displacementScale={relief} displacementBias={-relief * 0.46} roughness={0.72} metalness={0.025} clearcoat={0.12} clearcoatRoughness={0.72} envMapIntensity={0.9} />
}

function cloneMaterial(material: THREE.Material) {
  const clone = material.clone()
  if (clone instanceof THREE.MeshStandardMaterial) {
    clone.roughness = THREE.MathUtils.clamp(Math.max(clone.roughness, 0.48), 0.48, 0.9)
    clone.metalness = THREE.MathUtils.clamp(clone.metalness, 0, 0.72)
    clone.envMapIntensity = THREE.MathUtils.clamp(clone.envMapIntensity, 0.45, 0.9)
    clone.needsUpdate = true
  }
  return clone
}

function cloneModel(source: THREE.Object3D) {
  const root = source.clone(true)
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return
    object.material = Array.isArray(object.material) ? object.material.map(cloneMaterial) : cloneMaterial(object.material)
    object.castShadow = true
    object.receiveShadow = true
  })
  return root
}

function normalizedProductionModel(source: THREE.Object3D, targetSpan: number) {
  const root = cloneModel(source)
  const bounds = new THREE.Box3().setFromObject(root)
  const center = bounds.getCenter(new THREE.Vector3())
  const size = bounds.getSize(new THREE.Vector3())
  const sourceSpan = Math.max(size.x, size.y, size.z, 0.001)
  root.position.sub(center)
  root.scale.setScalar(targetSpan / sourceSpan)
  root.userData.uraiProductionNormalization = { targetSpan, sourceSpan }
  return root
}

function ProductionAsset({url,name,position,rotation=[0,0,0],span,scale=[1,1,1]}:{url:string;name:string;position:Vec3;rotation?:Vec3;span:number;scale?:Vec3}) {
  const gltf = useGLTF(url)
  const model = useMemo(() => normalizedProductionModel(gltf.scene, span), [gltf.scene, span])
  return <group name={name} position={position as [number,number,number]} rotation={rotation as [number,number,number]} scale={scale as [number,number,number]} userData={{runtimeAsset:url,provenance:'poly-haven-cc0-v48-committed'}}><primitive object={model}/></group>
}

function cloneCompatibilitySanctuary(source: THREE.Object3D) {
  const root = cloneModel(source)
  const retiredFamilies = [
    'mirror-basin-', 'orb-sanctuary-pedestal', 'sanctuary-waterfall-', 'inhabited-village-',
    'living-growth-', 'embodied-presence-', 'memory-place-anchor-'
  ]
  root.visible = false
  root.userData.retainedForGovernedCompatibilityOnly = true
  root.userData.visibleWorldOwner = 'home-v66-enclosed-reliquary'
  root.userData.treatment = 'v66-authored-chamber-retained-provenance-never-visible'
  root.traverse((object) => {
    if (retiredFamilies.some((prefix) => object.name.startsWith(prefix))) object.visible = false
    if (!(object instanceof THREE.Mesh)) return
    const materials = Array.isArray(object.material) ? object.material : [object.material]
    for (const material of materials) {
      if (!(material instanceof THREE.MeshStandardMaterial)) continue
      material.roughness = Math.max(material.roughness, 0.5)
      material.metalness = Math.min(material.metalness, 0.58)
      material.envMapIntensity = Math.min(material.envMapIntensity, 0.78)
      material.emissiveIntensity = Math.min(material.emissiveIntensity, 0.12)
      material.needsUpdate = true
    }
  })
  return root
}

function clonePortalModel(source: THREE.Object3D) {
  const root = cloneModel(source)
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return
    const materials = Array.isArray(object.material) ? object.material : [object.material]
    for (const material of materials) {
      if (!(material instanceof THREE.MeshStandardMaterial)) continue
      material.color.multiplyScalar(0.26)
      material.emissive.multiplyScalar(0.08)
      material.emissiveIntensity = Math.min(material.emissiveIntensity, 0.055)
      material.roughness = Math.max(material.roughness, 0.58)
      material.metalness = Math.max(material.metalness, 0.34)
      material.envMapIntensity = Math.min(material.envMapIntensity, 0.54)
      material.needsUpdate = true
    }
  })
  return root
}



function cloneOrbModel(source: THREE.Object3D) {
  const root = cloneModel(source)
  root.visible = true
  root.traverse((object) => {
    const governedIdentityOnly = object.name === 'orb-aura'
    if (governedIdentityOnly) {
      object.visible = false
      object.userData.uraiRetiredVisualRole = 'v65-authored-orb-full-geometry-aura-only-retired'
    }
  })
  root.userData.uraiTreatment = 'v65-authored-orb-full-geometry-visible-in-authored-chamber'
  return root
}


function PouredStone({ position, size, color = '#151b1a', metalness = 0.08, roughness = 0.74 }: { position: Vec3; size: Vec3; color?: string; metalness?: number; roughness?: number }) {
  const radius = Math.min(0.12, Math.max(0.018, Math.min(size[0], size[1], size[2]) * 0.16))
  return <RoundedBox args={size as [number,number,number]} radius={radius} smoothness={4} position={position as [number,number,number]} castShadow receiveShadow><meshPhysicalMaterial color={color} roughness={roughness} metalness={metalness} clearcoat={0.11} clearcoatRoughness={0.58} envMapIntensity={0.9} /></RoundedBox>
}

function MetalTrim({ position, size, color = '#7a735e', emissive = '#302b20', intensity = 0.025 }: { position: Vec3; size: Vec3; color?: string; emissive?: string; intensity?: number }) {
  return <mesh position={position as [number,number,number]} castShadow><boxGeometry args={size as [number,number,number]} /><meshStandardMaterial color={color} emissive={emissive} emissiveIntensity={intensity} metalness={0.82} roughness={0.32} envMapIntensity={1.05} /></mesh>
}

function ArchitecturalStone({ pack, position, size, color = '#111716', roughness = 0.68, metalness = 0.03 }: { pack: SurfacePack; position: Vec3; size: Vec3; color?: string; roughness?: number; metalness?: number }) {
  const radius = Math.min(0.09, Math.max(0.014, Math.min(size[0], size[1], size[2]) * 0.14))
  return <RoundedBox args={size as [number,number,number]} radius={radius} smoothness={5} position={position as [number,number,number]} castShadow receiveShadow><meshPhysicalMaterial color={color} map={pack.color} normalMap={pack.normal} normalScale={new THREE.Vector2(0.28,0.28)} roughnessMap={pack.arm} displacementMap={pack.displacement} displacementScale={0.004} displacementBias={-0.002} roughness={roughness} metalness={metalness} clearcoat={0.07} clearcoatRoughness={0.72} envMapIntensity={0.72} /></RoundedBox>
}

function SanctuaryCourt({ target }: { target: MutableRefObject<THREE.Vector3 | null> }) {
  const sanctuary = useGLTF(SANCTUARY)
  const compatibilityModel = useMemo(() => cloneCompatibilitySanctuary(sanctuary.scene), [sanctuary.scene])
  const pack = useStonePack(0.42, 0.64)
  const onWalk = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation()
    if (useSceneStore.getState().inputLocked) return
    target.current = new THREE.Vector3(THREE.MathUtils.clamp(event.point.x, BOUNDS.minX, BOUNDS.maxX), 0, THREE.MathUtils.clamp(event.point.z, BOUNDS.minZ, BOUNDS.maxZ))
  }
  return <group name="home-authored-terrain" userData={{ treatment: 'v59-finished-enclosed-stone-floor-with-broken-depth-planes', source: HOME_PHOTOGRAPHIC_PBR_V19 }}>
    <primitive object={compatibilityModel} />
    <mesh name="home-v59-continuous-stone-floor" position={[0,-0.16,-1.9]} rotation={[-Math.PI/2,0,0]} receiveShadow>
      <planeGeometry args={[14.2,18.4,34,42]} />
      <meshPhysicalMaterial color="#111817" map={pack.color} normalMap={pack.normal} normalScale={new THREE.Vector2(.23,.23)} roughnessMap={pack.arm} displacementMap={pack.displacement} displacementScale={.007} displacementBias={-.0032} roughness={.86} metalness={.008} clearcoat={.012} clearcoatRoughness={.92} envMapIntensity={.44}/>
    </mesh>
    <mesh name="home-v59-central-worn-stone" position={[-.18,-.125,-3.8]} rotation={[-Math.PI/2,0,-.018]} receiveShadow>
      <planeGeometry args={[6.25,9.9,18,24]} />
      <meshPhysicalMaterial color="#202723" map={pack.color} normalMap={pack.normal} normalScale={new THREE.Vector2(.14,.14)} roughnessMap={pack.arm} roughness={.82} metalness={.01} clearcoat={.018} clearcoatRoughness={.88} envMapIntensity={.5}/>
    </mesh>
    <ArchitecturalStone pack={pack} position={[-5.7,.02,-3.8]} size={[1.35,.24,10.8]} color="#151c1a" roughness={.86}/>
    <ArchitecturalStone pack={pack} position={[5.5,.02,-4.35]} size={[1.65,.24,9.7]} color="#181e1b" roughness={.86}/>
    <mesh name="home-walkable-navigation-surface" position={[0,.18,-1.45]} rotation={[-Math.PI/2,0,0]} onClick={onWalk}><planeGeometry args={[13,17]}/><meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false}/></mesh>
  </group>
}

function ProductionSanctuary(){return <group name="home-v49-scanned-detail-layer" userData={{visualOwner:'v66r1-photogrammetry-integrated-sanctuary',construction:'restrained-cc0-practicals-and-embedded-photogrammetry-relief',visualTreatment:'v66r1-scanned-relief-breaks-flat-wall-read'}}>
  <group name="home-v49-authored-practicals" userData={{treatment:'v49-real-caged-practicals-integrated-into-authored-apse'}}>
    <ProductionAsset url={V48_CAGED_SCONCE} name="home-v49-left-sconce" position={[-4.42,2.18,-5.92]} rotation={[0,0.72,0]} span={0.56}/>
    <ProductionAsset url={V48_CAGED_SCONCE} name="home-v49-right-sconce" position={[4.34,2.12,-6.08]} rotation={[0,-0.74,0]} span={0.56}/>
    <pointLight position={[-4.28,2.12,-5.72]} color="#d1aa73" intensity={0.62} distance={6.2} decay={2}/>
    <pointLight position={[4.2,2.08,-5.88]} color="#7db0a9" intensity={0.58} distance={6.0} decay={2}/>
  </group>
  <group name="home-v66r1-embedded-photogrammetry-relief" userData={{treatment:'v66r1-real-scanned-rock-relief-seated-into-wall-mass-not-floating-collage'}}>
    <ProductionAsset url={V48_ROCK_FACE_01} name="home-v66r1-left-deep-relief" position={[-5.72,1.38,-8.08]} rotation={[0.04,1.08,0.08]} span={3.25} scale={[0.94,1.1,0.62]}/>
    <ProductionAsset url={V48_ROCK_FACE_02} name="home-v66r1-right-deep-relief" position={[5.7,1.12,-6.86]} rotation={[-0.02,-1.04,-0.06]} span={3.0} scale={[0.98,1.12,0.64]}/>
    <ProductionAsset url={V48_ROCK_FACE_02} name="home-v66r1-left-mid-relief" position={[-5.75,0.86,-3.38]} rotation={[0.03,1.22,-0.03]} span={2.15} scale={[0.9,1.0,0.58]}/>
  </group>
</group>}

function ProductionOrbMachine(){return <group name="home-orb-engineered-cradle" userData={{treatment:'v48-asset-backed-machine-surrounds-authored-core-no-pedestal'}}>
  <ProductionAsset url={V48_PIPE_SYSTEM} name="home-v48-orb-machine-frame" position={[0,2.05,-4.85]} rotation={[0.14,0,1.57]} span={5.0} scale={[0.9,0.9,1.08]}/>
  <ProductionAsset url={V48_PIPE_SYSTEM} name="home-v48-orb-machine-left" position={[-1.75,1.25,-4.42]} rotation={[0.02,0.88,0.3]} span={3.25} scale={[0.7,0.7,0.92]}/>
  <ProductionAsset url={V48_PIPE_SYSTEM} name="home-v48-orb-machine-right" position={[1.75,1.27,-4.46]} rotation={[-0.02,-0.88,-0.3]} span={3.25} scale={[-0.7,0.7,0.92]}/>
</group>}

function RecessedPractical({ position, warm = true }: { position: Vec3; warm?: boolean }) {
  const color = warm ? '#caa46d' : '#78aeb0'
  return <group position={position as [number,number,number]}><mesh castShadow receiveShadow><boxGeometry args={[0.28,0.08,0.52]} /><meshStandardMaterial color="#0a0e0e" roughness={0.54} metalness={0.64} /></mesh><mesh position={[0,0.046,0]}><boxGeometry args={[0.18,0.012,0.24]} /><meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.52} roughness={0.36} metalness={0.26} /></mesh><pointLight position={[0,0.13,0]} color={color} intensity={0.14} distance={3.2} decay={2} /></group>
}

function StructuralRib({ points, radius = 0.055, color = '#66706a', metalness = 0.86, roughness = 0.28 }: { points: Vec3[]; radius?: number; color?: string; metalness?: number; roughness?: number }) {
  const curve = useMemo(() => new THREE.CatmullRomCurve3(points.map((point) => new THREE.Vector3(...point))), [points])
  return <mesh castShadow receiveShadow><tubeGeometry args={[curve,48,radius,8,false]} /><meshStandardMaterial color={color} metalness={metalness} roughness={roughness} envMapIntensity={1.08} /></mesh>
}

function ArchedMass({ pack, position, rotation = [0,0,0], width, height, depth, openingWidth, openingHeight, color = '#202522', accent = '#56625d' }: { pack: SurfacePack; position: Vec3; rotation?: Vec3; width: number; height: number; depth: number; openingWidth: number; openingHeight: number; color?: string; accent?: string }) {
  const shoulder = openingHeight * 0.58
  const shape = useMemo(() => {
    const outer = new THREE.Shape()
    outer.moveTo(-width/2, 0)
    outer.lineTo(width/2, 0)
    outer.lineTo(width/2, height)
    outer.lineTo(-width/2, height)
    outer.lineTo(-width/2, 0)
    const hole = new THREE.Path()
    hole.moveTo(-openingWidth/2, 0.06)
    hole.lineTo(-openingWidth/2, shoulder)
    hole.quadraticCurveTo(-openingWidth/2, openingHeight, 0, openingHeight)
    hole.quadraticCurveTo(openingWidth/2, openingHeight, openingWidth/2, shoulder)
    hole.lineTo(openingWidth/2, 0.06)
    hole.lineTo(-openingWidth/2, 0.06)
    outer.holes.push(hole)
    return outer
  }, [height, openingHeight, openingWidth, shoulder, width])
  return <group position={position as [number,number,number]} rotation={rotation as [number,number,number]}>
    <mesh castShadow receiveShadow>
      <extrudeGeometry args={[shape,{depth,bevelEnabled:true,bevelSegments:2,bevelSize:0.045,bevelThickness:0.045,curveSegments:12}]} />
      <meshPhysicalMaterial color={color} map={pack.color} normalMap={pack.normal} normalScale={new THREE.Vector2(0.22,0.22)} roughnessMap={pack.arm} roughness={0.7} metalness={0.045} clearcoat={0.08} clearcoatRoughness={0.7} envMapIntensity={0.78} />
    </mesh>
    <StructuralRib points={[[-openingWidth/2-0.12,0.06,depth+0.02],[-openingWidth/2-0.12,shoulder,depth+0.02],[0,openingHeight+0.18,depth+0.02],[openingWidth/2+0.12,shoulder,depth+0.02],[openingWidth/2+0.12,0.06,depth+0.02]]} radius={0.055} color={accent} metalness={0.82} roughness={0.3} />
  </group>
}

function SanctuaryShellMass({pack,position,width,height,depth,openingWidth,openingHeight,color='#292e2a'}:{pack:SurfacePack;position:Vec3;width:number;height:number;depth:number;openingWidth:number;openingHeight:number;color?:string}){
  const geometry=useMemo(()=>{const shape=new THREE.Shape();shape.moveTo(-width/2,-height/2);shape.lineTo(width/2,-height/2);shape.lineTo(width/2,height*.02);shape.bezierCurveTo(width*.49,height*.28,width*.32,height*.49,0,height/2);shape.bezierCurveTo(-width*.32,height*.49,-width*.49,height*.28,-width/2,height*.02);shape.closePath();const hole=new THREE.Path();hole.moveTo(-openingWidth/2,-openingHeight/2);hole.lineTo(openingWidth/2,-openingHeight/2);hole.lineTo(openingWidth/2,openingHeight*.02);hole.bezierCurveTo(openingWidth*.48,openingHeight*.31,openingWidth*.29,openingHeight*.47,0,openingHeight/2);hole.bezierCurveTo(-openingWidth*.29,openingHeight*.47,-openingWidth*.48,openingHeight*.31,-openingWidth/2,openingHeight*.02);hole.closePath();shape.holes.push(hole);const g=new THREE.ExtrudeGeometry(shape,{depth,steps:1,curveSegments:24,bevelEnabled:true,bevelSegments:5,bevelSize:.12,bevelThickness:.12});g.center();g.computeVertexNormals();return g},[depth,height,openingHeight,openingWidth,width]);useEffect(()=>()=>geometry.dispose(),[geometry]);return <mesh geometry={geometry} position={position as [number,number,number]} castShadow receiveShadow><meshPhysicalMaterial color={color} map={pack.color} normalMap={pack.normal} normalScale={new THREE.Vector2(.44,.44)} roughnessMap={pack.arm} displacementMap={pack.displacement} displacementScale={.009} displacementBias={-.0045} roughness={.8} metalness={.025} clearcoat={.03} clearcoatRoughness={.84} envMapIntensity={.62}/></mesh>
}




function ContinuousVaultSkin({pack}:{pack:SurfacePack}){
  return <group name="home-v47-reliquary-apse" userData={{treatment:'v66-contiguous-enclosed-stone-reliquary-no-open-sky-no-floating-geology'}}>
    <ArchitecturalStone pack={pack} position={[0,3.0,-10.75]} size={[13.4,6.5,.72]} color="#171d1b" roughness={.82}/>
    <ArchitecturalStone pack={pack} position={[-6.15,2.85,-4.45]} size={[.82,6.0,13.4]} color="#151b19" roughness={.84}/>
    <ArchitecturalStone pack={pack} position={[6.15,2.85,-4.45]} size={[.82,6.0,13.4]} color="#151b19" roughness={.84}/>
    <ArchitecturalStone pack={pack} position={[-3.9,5.45,-4.7]} size={[4.7,.52,12.8]} color="#1c221f" roughness={.8}/>
    <ArchitecturalStone pack={pack} position={[3.9,5.45,-4.7]} size={[4.7,.52,12.8]} color="#1c221f" roughness={.8}/>
    <ArchitecturalStone pack={pack} position={[0,3.0,-10.28]} size={[7.2,4.65,.42]} color="#232a26" roughness={.74}/>
    <ArchitecturalStone pack={pack} position={[-4.45,2.8,-9.9]} size={[1.15,5.0,1.05]} color="#202723" roughness={.78}/>
    <ArchitecturalStone pack={pack} position={[4.45,2.8,-9.9]} size={[1.15,5.0,1.05]} color="#202723" roughness={.78}/>
    <StructuralRib points={[[ -4.2,.35,-9.45],[-4.0,4.35,-9.45],[0,5.35,-9.45],[4.0,4.35,-9.45],[4.2,.35,-9.45]]} radius={.075} color="#606a64" metalness={.72} roughness={.38}/>
    <pointLight position={[0,4.35,-8.65]} color="#9bc8ba" intensity={.72} distance={8.2} decay={2}/>
    <pointLight position={[-4.25,2.2,-7.2]} color="#d0a36b" intensity={.38} distance={5.0} decay={2}/>
    <pointLight position={[4.25,2.2,-7.2]} color="#76a9a0" intensity={.34} distance={5.0} decay={2}/>
  </group>
}

function CantedWallMass({pack,side}:{pack:SurfacePack;side:-1|1}){return <group name={side<0?'home-v62-left-return':'home-v62-right-return'} userData={{treatment:'v62-open-return-no-panel-frame'}} />}

function MachineCavityLiner(){
  return <group name="home-v47-reliquary-cavity" userData={{treatment:'v65-authored-chamber-open-center-no-display-wall-no-floating-slab-cavity'}}>
    <RecessedPractical position={[-1.55,.1,-6.15]} warm={true}/>
    <RecessedPractical position={[1.5,.1,-6.2]} warm={false}/>
  </group>
}

function SanctuarySideGallery(){
  return <group name="home-v47-side-gallery" userData={{treatment:'v66-recessed-practicals-integrated-into-enclosure'}}>
    <RecessedPractical position={[-4.75,.16,-5.1]} warm={true}/><RecessedPractical position={[4.75,.16,-5.1]} warm={false}/>
    <RecessedPractical position={[-4.75,.16,-8.1]} warm={true}/><RecessedPractical position={[4.75,.16,-8.1]} warm={false}/>
  </group>
}

function SanctuaryArchitecture(){const pack=useStonePack(.56,.8);return <group name="home-sanctuary-pavilion" userData={{visualOwner:'enclosed-reliquary-v66',construction:'contiguous-pbr-stone-enclosure-with-recessed-reliquary-focus',visualTreatment:'v66-enclosed-reliquary-retained-pixel-rebuild'}}><ContinuousVaultSkin pack={pack}/><SanctuarySideGallery/><MachineCavityLiner/></group>}

function SanctuaryGlazing(){
  const glass=<meshPhysicalMaterial color="#101b1a" roughness={0.22} metalness={0.02} transmission={0.28} transparent opacity={0.2} clearcoat={0.46} clearcoatRoughness={0.22} envMapIntensity={0.9} />
  return <group name="home-architectural-glazing" userData={{treatment:'v29-narrow-inset-glazing-between-load-bearing-piers'}}>
    <mesh position={[-5.62,1.68,0.55]} rotation={[0,0.018,0]} receiveShadow><planeGeometry args={[0.01,3.1]} />{glass}</mesh>
    <mesh position={[5.62,1.68,0.55]} rotation={[0,-0.018,0]} receiveShadow><planeGeometry args={[0.01,3.1]} />{glass}</mesh>
    <mesh position={[-5.53,1.56,-3.82]} rotation={[0,-0.012,0]} receiveShadow><planeGeometry args={[0.01,2.75]} />{glass}</mesh>
    <mesh position={[5.53,1.56,-3.82]} rotation={[0,0.012,0]} receiveShadow><planeGeometry args={[0.01,2.75]} />{glass}</mesh>
  </group>
}

function SanctuaryCeiling() {
  return <group name="home-architectural-canopy" userData={{ treatment:'v30-vaulted-shell-ceiling-panels',visualTreatment:'v30-roof-mass-rests-on-load-bearing-vault' }}>
    <mesh position={[-3.32,4.92,-1.5]} rotation={[-0.035,0,0.11]} castShadow receiveShadow><boxGeometry args={[5.9,0.14,8.9]} /><meshPhysicalMaterial color="#111715" roughness={0.58} metalness={0.34} clearcoat={0.08} clearcoatRoughness={0.58} envMapIntensity={0.76} /></mesh>
    <mesh position={[3.4,5.02,-1.7]} rotation={[0.025,0,-0.095]} castShadow receiveShadow><boxGeometry args={[5.8,0.13,8.55]} /><meshPhysicalMaterial color="#141a18" roughness={0.55} metalness={0.38} clearcoat={0.09} clearcoatRoughness={0.55} envMapIntensity={0.8} /></mesh>
    <mesh position={[0,5.14,2.62]} rotation={[0,0,0]} castShadow receiveShadow><boxGeometry args={[5.2,0.11,1.15]} /><meshPhysicalMaterial color="#20241f" roughness={0.5} metalness={0.42} clearcoat={0.12} clearcoatRoughness={0.48} envMapIntensity={0.82} /></mesh>
  </group>
}

function FloorPanelJoints() {
  return <group name="home-floor-panel-joints" userData={{ treatment:'v30-three-authored-expansion-seams-no-grid-read' }}>
    <MetalTrim position={[-1.9,0.024,1.65]} size={[3.6,0.005,0.008]} color="#222825" emissive="#000000" intensity={0} />
    <MetalTrim position={[2.35,0.024,-2.8]} size={[4.25,0.005,0.008]} color="#252a27" emissive="#000000" intensity={0} />
    <MetalTrim position={[-0.35,0.024,-5.95]} size={[0.008,0.005,3.35]} color="#202522" emissive="#000000" intensity={0} />
  </group>
}

function ReflectingChannel({ x }: { x: number }) {
  return <group position={[x,0,-2.0]}><PouredStone position={[0,-0.06,0]} size={[0.9,0.14,11.8]} color="#080c0c" roughness={0.76} /><mesh position={[0,0.028,0]} rotation={[-Math.PI/2,0,0]} receiveShadow><planeGeometry args={[0.66,11.46]} /><meshPhysicalMaterial color="#081213" roughness={0.16} metalness={0.02} clearcoat={0.9} clearcoatRoughness={0.12} envMapIntensity={1.3} transparent opacity={0.7} /></mesh></group>
}

const FERN_PLACEMENTS: readonly [number,number,number,number][] = [[-6.18,4.45,0.46,0.8],[-6.08,-0.9,0.42,2.1],[-6.12,-6.5,0.44,-1.1],[6.18,3.75,0.45,-1.4],[6.08,-1.85,0.47,-2.0],[6.12,-6.85,0.41,1.5]]
function PlantedEdges({ reducedMotion }: { reducedMotion: boolean }) {
  const fern = useGLTF(FERN_MODEL)
  const materials = useMemo(() => [new THREE.MeshStandardMaterial({ color:'#183027', roughness:0.96, metalness:0, side:THREE.DoubleSide }),new THREE.MeshStandardMaterial({ color:'#203b31', roughness:0.94, metalness:0, side:THREE.DoubleSide }),new THREE.MeshStandardMaterial({ color:'#162820', roughness:0.98, metalness:0, side:THREE.DoubleSide })], [])
  useEffect(() => () => materials.forEach((material)=>material.dispose()), [materials])
  const plants = useMemo(() => FERN_PLACEMENTS.map(([x,z,scale,yaw],index) => { const object=fern.scene.clone(true); object.name=`home-scanned-fern-${index+1}`; object.position.set(x,0.1,z); object.rotation.y=yaw; object.rotation.z=(seededNoise(index,9,3)-0.5)*0.04; object.scale.setScalar(scale*(0.88+seededNoise(index,5,13)*0.2)); object.traverse((child)=>{if(!(child instanceof THREE.Mesh))return; child.material=materials[index%materials.length]; child.castShadow=true; child.receiveShadow=true}); return object }), [fern.scene,materials])
  return <group name="home-living-vegetation" userData={{ reducedMotion, treatment:'sparse-architectural-planter-growth-v20' }}><PouredStone position={[-6.38,0.17,-1.55]} size={[0.54,0.28,16.2]} color="#080d0c" roughness={0.86} /><PouredStone position={[6.38,0.17,-1.55]} size={[0.54,0.28,16.2]} color="#080d0c" roughness={0.86} />{plants.map((plant)=><primitive key={plant.name} object={plant} />)}</group>
}

const SKY_VERTEX=`varying vec3 vDirection; void main(){vDirection=normalize(position);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`
const SKY_FRAGMENT=`varying vec3 vDirection; void main(){vec3 d=normalize(vDirection);float h=clamp(d.y*.5+.5,0.,1.);vec3 low=vec3(.024,.044,.050);vec3 mid=vec3(.014,.034,.046);vec3 high=vec3(.005,.014,.024);vec3 color=mix(low,mid,smoothstep(.12,.58,h));color=mix(color,high,smoothstep(.58,1.,h));float glow=pow(max(0.,dot(d,normalize(vec3(-.32,.44,-.84)))),28.);color+=vec3(.055,.072,.075)*glow;gl_FragColor=vec4(color,1.);}`
function SkyDome(){return <group name="home-mountain-horizon" userData={{presentation:'open-roof-blue-hour-atmosphere-v19',fakeMountainGeometry:'none'}}><mesh name="home-atmospheric-sky" frustumCulled={false} renderOrder={-20}><sphereGeometry args={[120,64,32]} /><shaderMaterial vertexShader={SKY_VERTEX} fragmentShader={SKY_FRAGMENT} side={THREE.BackSide} depthWrite={false} toneMapped={false} /></mesh><group name="home-physical-moon" position={[-26,21,-76]} userData={{presentation:'off-camera-moonlight-source-v19'}} /></group>}
function AtmosphericDepth(){return <group name="home-mountain-horizon" userData={{treatment:'volumetric-fog-only-v24-no-transparent-depth-card'}} />}



function TaperedLoadBeam({from,to,width=.42,color='#53655f'}:{from:Vec3;to:Vec3;width?:number;color?:string}){
  const {mid,quat,length}=useMemo(()=>{const a=new THREE.Vector3(...from),b=new THREE.Vector3(...to),dir=b.clone().sub(a),length=dir.length(),mid=a.clone().add(b).multiplyScalar(.5),quat=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),dir.clone().normalize());return{mid,quat,length}},[from,to])
  return <mesh position={mid} quaternion={quat} castShadow receiveShadow userData={{treatment:'v44-broad-dark-load-member-no-spike-cone-grammar'}}><boxGeometry args={[width,length,width*.72]}/><meshPhysicalMaterial color={color} roughness={.66} metalness={.26} clearcoat={.018} clearcoatRoughness={.76} envMapIntensity={.66}/></mesh>
}

function ServiceConduit({side}:{side:-1|1}){
  const geometry=useMemo(()=>{const s=side,curve=new THREE.CatmullRomCurve3([
    new THREE.Vector3(s*3.62,.08,-3.0),new THREE.Vector3(s*3.5,.18,-2.25),new THREE.Vector3(s*3.36,.62,-1.4),
    new THREE.Vector3(s*3.28,1.52,-.92),new THREE.Vector3(s*3.06,2.72,-.82),new THREE.Vector3(s*2.72,3.72,-1.02)
  ]);return new THREE.TubeGeometry(curve,44,.04,10,false)},[side]);
  useEffect(()=>()=>geometry.dispose(),[geometry]);
  return <mesh geometry={geometry} castShadow receiveShadow userData={{treatment:'v38-recessed-service-trunk'}}><meshStandardMaterial color={side<0?'#405b55':'#625b4c'} emissive={side<0?'#0c2420':'#241d12'} emissiveIntensity={.025} metalness={.72} roughness={.42}/></mesh>
}


function ReliquarySpine(){return <group name="home-orb-reliquary-spine" userData={{treatment:'v41-retired-center-spine-no-production-geometry'}} />}





function ReliquaryWing({side}:{side:-1|1}){
  return <group name={side<0?'home-v47-left-load-arm':'home-v47-right-load-arm'} userData={{treatment:'v57-load-path-owned-by-real-service-risers-no-primitive-clamp-bars'}} />
}


function CrownBridge(){return <group name="home-v47-reliquary-upper-seat" userData={{treatment:'v47-load-arms-seat-into-deep-machine-bay-without-floating-crown'}} />}


function FloorReliquaryBed(){return <group name="home-v47-foundation-integration" userData={{treatment:'v47-no-display-platform-floor-remains-continuous'}} />}

function OrbPlatform(){return <FloorReliquaryBed/>}





function OrbCradle(){return <group name="home-orb-engineered-cradle" userData={{treatment:'v66r1-wall-seated-engineered-reliquary-no-pedestal-no-ring-no-primitive-clamps'}}>
  <ReliquaryWing side={-1}/><ReliquaryWing side={1}/>
  <RoundedBox args={[0.58,3.35,0.72]} radius={0.09} smoothness={5} position={[-2.38,1.82,-7.62]} rotation={[0,0.08,-0.045]} castShadow receiveShadow><meshPhysicalMaterial color="#202724" roughness={0.64} metalness={0.24} clearcoat={0.06} clearcoatRoughness={0.68} envMapIntensity={0.78}/></RoundedBox>
  <RoundedBox args={[0.58,3.35,0.72]} radius={0.09} smoothness={5} position={[2.38,1.82,-7.62]} rotation={[0,-0.08,0.045]} castShadow receiveShadow><meshPhysicalMaterial color="#202724" roughness={0.64} metalness={0.24} clearcoat={0.06} clearcoatRoughness={0.68} envMapIntensity={0.78}/></RoundedBox>
  <TaperedLoadBeam from={[-2.14,3.2,-7.48]} to={[-0.78,2.52,-7.28]} width={0.24} color="#59645f"/>
  <TaperedLoadBeam from={[2.14,3.2,-7.48]} to={[0.78,2.52,-7.28]} width={0.24} color="#59645f"/>
  <StructuralRib points={[[ -1.96,0.42,-7.5],[-1.7,2.52,-7.46],[0,3.38,-7.42],[1.7,2.52,-7.46],[1.96,0.42,-7.5]]} radius={0.062} color="#6b7770" metalness={0.72} roughness={0.38}/>
  <pointLight position={[0,2.22,-7.12]} color="#8fcdbf" intensity={0.44} distance={5.2} decay={2}/>
</group>}


function MachineCoreAssembly(){
  return <group name="home-v47-machine-core-assembly" userData={{treatment:'v66-six-fragment-engineered-orb-no-glass-sphere-no-pedestal'}} position={ORB}>
    {ORB_FRAGMENT_LAYOUT.map(([p,r,scale],i)=><RoundedBox key={i} args={[.42,.2,.78]} radius={.07} smoothness={5} position={p as [number,number,number]} rotation={r as [number,number,number]} scale={scale*10.8} castShadow receiveShadow><meshStandardMaterial color={i%2?'#59635e':'#73796f'} metalness={.78} roughness={.31} envMapIntensity={1.0}/></RoundedBox>)}
    <mesh scale={.43} castShadow><icosahedronGeometry args={[1,2]}/><meshStandardMaterial color="#7fc6b7" emissive="#2c776c" emissiveIntensity={.34} metalness={.42} roughness={.3}/></mesh>
    <pointLight color="#8fcdbf" intensity={.7} distance={4.8} decay={2}/>
  </group>
}

function SacredOrb({state,reducedMotion,onOpen}:{state:OrbState;reducedMotion:boolean;onOpen:()=>void}){
  const root=useRef<THREE.Group>(null)
  const sensory=useMemo(()=>resolveOrbSensoryOutput(state,reducedMotion,true),[state,reducedMotion])
  useFrame(()=>{if(!root.current)return;root.current.rotation.y=reducedMotion?0:Math.sin(performance.now()*.00018)*.055})
  return <group ref={root} name="home-orb-sanctuary" position={ORB} onClick={(event)=>{event.stopPropagation();onOpen()}} userData={{orbState:state,animation:sensory.animation,runtimeAsset:ORB_MODEL,treatment:'v66-interaction-anchor-for-six-fragment-engineered-orb'}}>
    <mesh visible={false}><icosahedronGeometry args={[.45,1]}/><meshBasicMaterial/></mesh>
  </group>
}

function HumanPresence({root}:{root:MutableRefObject<THREE.Group|null>}){const human=useGLTF(HUMAN);const model=useMemo(()=>cloneModel(human.scene),[human.scene]);return <group ref={root} name="home-authored-embodied-self" position={SPAWN} rotation={[0,Math.PI,0]} userData={{presentation:'privacy-preserving-first-person-presence'}}><primitive object={model} visible={false} scale={0.72} /></group>}
function PortalGlass({tone}:{tone:'ground'|'life-map'}){const color=tone==='ground'?'#4f6f6c':'#5b5f82';return <mesh position={[0,1.34,-0.74]}><planeGeometry args={[1.34,2.2]} /><meshPhysicalMaterial color="#050b0a" emissive={color} emissiveIntensity={0.004} transparent opacity={0.2} transmission={0.02} roughness={0.56} metalness={0.1} clearcoat={0.16} clearcoatRoughness={0.42} side={THREE.DoubleSide} depthWrite /></mesh>}
function ThresholdAlcove({tone,onActivate,authoredPortal=false}:{tone:'ground'|'life-map';onActivate:()=>void;authoredPortal?:boolean}){
  const portal=useGLTF(PORTAL_MODEL); const model=useMemo(()=>clonePortalModel(portal.scene),[portal.scene]); const accent=tone==='ground'?'#526d68':'#626784'
  const portalTone=tone==='ground'?'#5c8378':'#747ba4'
  return <group userData={{treatment:'v66r1-recessed-load-bearing-threshold-aperture-no-freestanding-arch',destination:tone}}>
    <RoundedBox args={[.34,3.18,.64]} radius={.055} smoothness={4} position={[-1.16,1.58,.12]} castShadow receiveShadow><meshPhysicalMaterial color="#1a211f" roughness={.68} metalness={.18} clearcoat={.05} clearcoatRoughness={.72}/></RoundedBox>
    <RoundedBox args={[.34,3.18,.64]} radius={.055} smoothness={4} position={[1.16,1.58,.12]} castShadow receiveShadow><meshPhysicalMaterial color="#1a211f" roughness={.68} metalness={.18} clearcoat={.05} clearcoatRoughness={.72}/></RoundedBox>
    <RoundedBox args={[2.66,.34,.64]} radius={.055} smoothness={4} position={[0,3.02,.12]} castShadow receiveShadow><meshPhysicalMaterial color="#1e2623" roughness={.64} metalness={.22} clearcoat={.05} clearcoatRoughness={.68}/></RoundedBox>
    <mesh position={[0,1.57,-.16]} receiveShadow><planeGeometry args={[1.92,2.66]} /><meshPhysicalMaterial color="#07110f" emissive={portalTone} emissiveIntensity={tone==='ground'?.2:.28} transparent opacity={.8} transmission={.08} roughness={.42} metalness={.08} clearcoat={.22} clearcoatRoughness={.36} side={THREE.DoubleSide}/></mesh>
    <mesh position={[0,.055,.04]} rotation={[-Math.PI/2,0,0]} receiveShadow><planeGeometry args={[1.9,.22]} /><meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={.18} roughness={.58} metalness={.32} /></mesh>
    <pointLight position={[0,1.68,.18]} color={portalTone} intensity={tone==='ground'?.28:.34} distance={4.6} decay={2}/>
    {authoredPortal?<group position={[0,1.34,-1.35]} scale={0.026} visible={false}><primitive object={model} /></group>:null}
    <mesh position={[0,1.55,0.04]} onClick={(event)=>{event.stopPropagation();onActivate()}}><boxGeometry args={[2.2,3.1,1.1]} /><meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} /></mesh>
  </group>
}

function Thresholds({onGround,onLifeMap}:{onGround:()=>void;onLifeMap:()=>void}){return <><group name="home-ground-environmental-threshold" position={GROUND} rotation={[0,0.08,0]}><ThresholdAlcove tone="ground" onActivate={onGround} /></group><group name="home-life-map-sky-lookout"><group name="home-life-map-physical-portal" position={LIFE_MAP} rotation={[0,-0.08,0]} userData={{runtimeAsset:PORTAL_MODEL,treatment:'authored-portal-integrated-architecture-v19'}}><ThresholdAlcove tone="life-map" onActivate={onLifeMap} authoredPortal /></group></group></>}
function PhysicalEnvironment(){return <Environment files={HOME_HDR} background={false} environmentIntensity={0.72} />}

function PlayerRig({input,yaw,pitch,target,avatar,onNearby,transition,reducedMotion,onTransitionComplete,onTransitionSequence}:{input:MovementInput;yaw:MutableRefObject<number>;pitch:MutableRefObject<number>;target:MutableRefObject<THREE.Vector3|null>;avatar:MutableRefObject<THREE.Group|null>;onNearby:(value:Nearby)=>void;transition:'none'|'ground'|'life-map';reducedMotion:boolean;onTransitionComplete:()=>void;onTransitionSequence:(value:TransitionSequence)=>void}){
  const {camera,size}=useThree();const pos=useRef(SPAWN.clone()),velocity=useRef(new THREE.Vector3()),started=useRef<number|null>(null),issued=useRef(false),last=useRef<Nearby>(null),lastSequence=useRef<TransitionSequence>('idle')
  useLayoutEffect(()=>{camera.near=0.1;camera.far=140;if(camera instanceof THREE.PerspectiveCamera)camera.fov=size.height>size.width?52:44;camera.updateProjectionMatrix();camera.position.set(4.4,1.72,3.1);camera.lookAt(.1,2.15,-7.0)},[camera,size.height,size.width])
  useFrame(({clock},delta)=>{
    if(transition!=='none'){
      if(started.current===null)started.current=clock.elapsedTime
      const duration=reducedMotion?0.9:transition==='life-map'?3.4:2.6
      const t=THREE.MathUtils.smootherstep(THREE.MathUtils.clamp((clock.elapsedTime-started.current)/duration,0,1),0,1)
      const opening:TransitionSequence=transition==='life-map'?'life-map:opening':'ground:opening'
      const traversal:TransitionSequence=transition==='life-map'?'life-map:traversal':'ground:traversal'
      const closing:TransitionSequence=transition==='life-map'?'life-map:closing':'ground:closing'
      const desired:TransitionSequence=t<0.16?opening:t<0.84?traversal:closing
      let phaseEmitted=false
      if(lastSequence.current==='idle'){
        lastSequence.current=opening;onTransitionSequence(opening);phaseEmitted=true
      }else if(lastSequence.current===opening&&desired!==opening){
        lastSequence.current=traversal;onTransitionSequence(traversal);phaseEmitted=true
      }else if(lastSequence.current===traversal&&desired===closing){
        lastSequence.current=closing;onTransitionSequence(closing);phaseEmitted=true
      }
      if(transition==='life-map'){
        camera.position.lerp(new THREE.Vector3(0,30,-30),1-Math.pow(0.002,delta));camera.lookAt(0,9+t*20,-18-t*20);useSceneStore.getState().setProgress(t)
      }else{
        camera.position.lerp(new THREE.Vector3(-5.2,-2,-13.35),1-Math.pow(0.002,delta));camera.lookAt(-5.2,-0.8,-14.6)
      }
      if(t>=1&&!issued.current&&lastSequence.current===closing&&!phaseEmitted){issued.current=true;onTransitionComplete()}
      return
    }
    started.current=null;issued.current=false
    if(lastSequence.current!=='idle'){lastSequence.current='idle';onTransitionSequence('idle')}
    stepEmbodiedMotion({delta,input,yaw:yaw.current,position:pos.current,velocity:velocity.current,target,bounds:BOUNDS,speed:2.7,acceleration:8,deceleration:11})
    if(avatar.current){avatar.current.position.copy(pos.current);avatar.current.rotation.y=yaw.current+Math.PI}
    const portrait=size.height>size.width,backDistance=portrait?0.11:0.18,eyeHeight=portrait?1.56:1.62;if(camera instanceof THREE.PerspectiveCamera){const desiredFov=portrait?52:40;if(Math.abs(camera.fov-desiredFov)>.05){camera.fov=desiredFov;camera.updateProjectionMatrix()}}
    const desired=pos.current.clone().add(new THREE.Vector3(Math.sin(yaw.current)*backDistance,eyeHeight,Math.cos(yaw.current)*backDistance))
    camera.position.lerp(desired,1-Math.pow(0.00065,delta))
    const lookHeight=portrait?1.74:1.72;const look=pos.current.clone().add(new THREE.Vector3(-Math.sin(yaw.current)*9.2,lookHeight+pitch.current,-Math.cos(yaw.current)*9.2));camera.lookAt(look)
    const candidates:readonly [Nearby,THREE.Vector3,number][]=[['orb',ORB,2.5],['ground',GROUND,2.8],['life-map',LIFE_MAP,2.8]]
    let next:Nearby=null,best=Infinity
    for(const [name,p,r] of candidates){const d=Math.hypot(pos.current.x-p.x,pos.current.z-p.z);if(d<r&&d<best){next=name;best=d}}
    if(next){
      const focus=next==='orb'?ORB.clone():next==='ground'?GROUND.clone():LIFE_MAP.clone()
      focus.y=next==='orb'?2.12:1.58
      const freeLook=camera.quaternion.clone()
      camera.lookAt(focus)
      const landmarkLook=camera.quaternion.clone()
      camera.quaternion.copy(freeLook).slerp(landmarkLook,1-Math.pow(0.00008,delta))
    }
    if(next!==last.current){last.current=next;onNearby(next)}
  });return null
}
function SceneReady({onReady}:{onReady:()=>void}){const {scene}=useThree();const done=useRef(false);useEffect(()=>{let timer:number|undefined;const check=()=>{if(done.current)return;if(SANCTUARY_REQUIRED_OBJECTS.every((name)=>scene.getObjectByName(name))){done.current=true;onReady();return}timer=window.setTimeout(check,60)};check();return()=>{if(timer!==undefined)window.clearTimeout(timer)}},[onReady,scene]);return null}
function SacredFinalScene(props:{input:MovementInput;yaw:MutableRefObject<number>;pitch:MutableRefObject<number>;target:MutableRefObject<THREE.Vector3|null>;avatar:MutableRefObject<THREE.Group|null>;nearby:(value:Nearby)=>void;orbState:OrbState;reducedMotion:boolean;transition:'none'|'ground'|'life-map';onOrb:()=>void;onGround:()=>void;onLifeMap:()=>void;onTransitionComplete:()=>void;onTransitionSequence:(value:TransitionSequence)=>void;onReady:()=>void}){const cosmic=props.transition==='life-map';return <><color attach="background" args={[cosmic?'#01030a':'#0b1213']} /><fogExp2 attach="fog" args={[cosmic?'#060918':'#111b1b',cosmic?0.0022:0.0038]} />{!cosmic?<SkyDome />:null}{cosmic?<Stars radius={190} depth={100} count={2800} factor={3} saturation={0.05} fade speed={props.reducedMotion?0:0.008} />:null}<PhysicalEnvironment /><ambientLight intensity={0.4} color="#c9d8d3" /><hemisphereLight args={['#91aaa4','#111713',0.6]} /><directionalLight position={[-10,15,8]} intensity={0.86} color="#e8d6b8" /><directionalLight position={[9,8,-10]} intensity={0.58} color="#79aaa2" /><spotLight position={[-1.5,8.8,4.8]} intensity={1.65} color="#dfc695" distance={25} angle={0.44} penumbra={0.92} decay={2} castShadow /><pointLight position={[0,2.78,-5.08]} intensity={1.05} distance={9.2} decay={2} color="#cdb47f" /><spotLight position={[-5.4,3.6,1.8]} target-position={[-1.4,1.7,-3.2]} intensity={0.48} color="#b18d60" distance={14} angle={0.55} penumbra={0.9} decay={2} /><spotLight position={[5.2,3.4,-0.5]} intensity={0.44} color="#6c9995" distance={13} angle={0.52} penumbra={0.9} decay={2} /><SanctuaryCourt target={props.target} /><SanctuaryArchitecture /><ProductionSanctuary /><OrbCradle /><MachineCoreAssembly /><PlantedEdges reducedMotion={props.reducedMotion} /><AtmosphericDepth /><SacredOrb state={props.orbState} reducedMotion={props.reducedMotion} onOpen={props.onOrb} /><HumanPresence root={props.avatar} /><Thresholds onGround={props.onGround} onLifeMap={props.onLifeMap} /><PlayerRig input={props.input} yaw={props.yaw} pitch={props.pitch} target={props.target} avatar={props.avatar} onNearby={props.nearby} transition={props.transition} reducedMotion={props.reducedMotion} onTransitionComplete={props.onTransitionComplete} onTransitionSequence={props.onTransitionSequence} /><SceneReady onReady={props.onReady} /></>}

export function HomeWorldProductionFinal({onOrbOpen=requestUraiWorldOrbOpen,webglAvailable=true}:Props){
  const [canvasReady,setCanvasReady]=useState(false),[sceneReady,setSceneReady]=useState(false),[nearby,setNearby]=useState<Nearby>(null),[dragging,setDragging]=useState(false),[reducedMotion,setReducedMotion]=useState(false),[mobile,setMobile]=useState(false),[orbState,setOrbState]=useState<OrbState>('idle'),[transition,setTransition]=useState<'none'|'ground'|'life-map'>('none'),[portalSequence,setPortalSequence]=useState<TransitionSequence>('idle');const yaw=useRef(DEFAULT_YAW),pitch=useRef(0.15),target=useRef<THREE.Vector3|null>(null),avatar=useRef<THREE.Group|null>(null),markSceneReady=useCallback(()=>setSceneReady(true),[])
  const openOrb=useCallback(()=>{if(!useSceneStore.getState().inputLocked&&transition==='none'){setOrbState('attention');onOrbOpen()}},[onOrbOpen,transition]);const ground=useCallback(()=>{if(transition!=='none')return;target.current=null;setOrbState('transition');setPortalSequence('ground:opening');setTransition('ground')},[transition]);const lifeMap=useCallback(()=>{if(transition!=='none')return;target.current=null;setOrbState('transition');setPortalSequence('life-map:opening');setTransition('life-map')},[transition]);const interact=useCallback(()=>{if(nearby==='orb')openOrb();else if(nearby==='ground')ground();else if(nearby==='life-map')lifeMap()},[nearby,openOrb,ground,lifeMap]);const input=useMovementInput({enabled:transition==='none',onInteract:interact,onReset:()=>{target.current=SPAWN.clone();yaw.current=DEFAULT_YAW;pitch.current=0.15}});const look=useDragLook({yaw,pitch,enabled:transition==='none',sensitivity:0.003,minPitch:-0.48,maxPitch:0.52,onDragState:setDragging})
  useEffect(()=>{const rm=window.matchMedia('(prefers-reduced-motion: reduce)'),mobileQuery=window.matchMedia('(pointer: coarse), (max-width: 700px)');const apply=()=>{setReducedMotion(rm.matches);setMobile(mobileQuery.matches)};apply();rm.addEventListener?.('change',apply);mobileQuery.addEventListener?.('change',apply);return()=>{rm.removeEventListener?.('change',apply);mobileQuery.removeEventListener?.('change',apply)}},[])
  useEffect(()=>{const listener=(event:CustomEvent<OrbStateEventDetail>)=>{if(transition==='none')setOrbState(event.detail.state)};window.addEventListener(URAI_ORB_STATE_EVENT,listener);return()=>window.removeEventListener(URAI_ORB_STATE_EVENT,listener)},[transition])
  useEffect(()=>{const cancel=(event:KeyboardEvent)=>{if(event.key!=='Escape'||transition==='none')return;event.preventDefault();setTransition('none');setPortalSequence('idle');setOrbState('idle');const store=useSceneStore.getState();store.setPhase('HOME');store.unlock()};window.addEventListener('keydown',cancel,true);return()=>window.removeEventListener('keydown',cancel,true)},[transition])
  if(!webglAvailable)return null;const ready=canvasReady&&sceneReady;const context=transition==='life-map'?'Ascending into your Life Map':transition==='ground'?'Descending into Ground':nearby==='orb'?'The Orb is here':nearby==='ground'?'The path descends':nearby==='life-map'?'The threshold opens to your Life Map':null;const complete=()=>{if(transition==='ground')requestUraiWorldTravel({destination:'infrastructure-hub',href:'/ground/',entryPortal:'home-ground',cameraCheckpoint:'home-ground-descent'});else if(transition==='life-map')requestUraiWorldTravel({destination:'life-map',href:'/life-map/?from=home-sky',entryPortal:'home-sky',cameraCheckpoint:'home-sky-ascent-complete'})}
  return <main className={`${styles.world} urai-asset-home-world`} data-urai-home-production data-urai-true-3d="true" data-home-primary-owner="asset-driven" data-home-visible-world="open-air-sacred-tech-reliquary" data-home-world-character="premium-cinematic-sacred-tech" data-home-physical-base="authored-stone-machine-reliquary" data-home-visual-ownership="three-dimensional-geometry" data-home-desktop-mobile-world="same-scene" data-home-embodied-self="makehuman-v4" data-home-presence-presentation="privacy-preserving-first-person" data-home-movement="walk-keyboard-click-touch" data-home-audio="production-opus-consent-controlled" data-home-visual-grade="cinematic-pbr-v66-enclosed-reliquary" data-home-final-art-revision="v66-enclosed-reliquary-candidate" data-home-art-certification="v66-retained-pixel-candidate-not-certified" data-home-scanned-composition={HOME_SCANNED_COMPOSITION_V1} data-home-pbr-environment="local-cc0-hdri-studio-small-08" data-home-assets-ready={ready?'true':'false'} data-home-runtime-assets="home-entry-chamber-v1.glb home-human-makehuman-v4.glb urai-orb-avatar-v1.glb portal-ring-master-v1.glb polyhaven-industrial-caged-sconce" data-home-scenery-assets="polyhaven-industrial-caged-sconce polyhaven-fern-02-geometry-v1.glb polyhaven-rock-tile-floor-pbr-v2-optimized studio-small-08-hdri-v1" data-home-authored-regions="home-authored-terrain home-mountain-horizon home-living-vegetation home-sanctuary-pavilion home-life-map-physical-portal" data-home-nearby={nearby??'none'} data-home-camera-mode={transition!=='none'?transition:dragging?'look':'embodied-third-person'} data-home-scene-phase={transition==='none'?'HOME':transition.toUpperCase()} data-home-portal-sequence={portalSequence} data-home-portal-lifecycle="environmental-approach-traversal-arrival" data-home-animation-owner="enclosed-reliquary-v66-six-fragment-orb" data-home-input-locked={transition!=='none'?'true':'false'} data-home-orb-state={orbState} data-home-orb-clip={resolveOrbSensoryOutput(orbState,reducedMotion,true).animation} data-home-orb-model-clip={reducedMotion?'stopped-reduced-motion':ORB_CLIPS[orbState]} data-testid="home-visible-navigable-sanctuary-world" style={{position:'relative',overflow:'hidden',background:'#050a0d'}} {...look}><Canvas className={styles.canvas} dpr={[1,1.5]} shadows camera={{position:[2.75,1.7,5.35],fov:44,near:0.1,far:140}} gl={{antialias:true,alpha:false,powerPreference:'high-performance'}} onCreated={({gl})=>{gl.outputColorSpace=THREE.SRGBColorSpace;gl.toneMapping=THREE.ACESFilmicToneMapping;gl.toneMappingExposure=1.58;gl.shadowMap.type=THREE.PCFSoftShadowMap;setCanvasReady(true)}}><SacredFinalScene input={input} yaw={yaw} pitch={pitch} target={target} avatar={avatar} nearby={setNearby} orbState={orbState} reducedMotion={reducedMotion} transition={transition} onOrb={openOrb} onGround={ground} onLifeMap={lifeMap} onTransitionComplete={complete} onTransitionSequence={setPortalSequence} onReady={markSceneReady} /></Canvas>{context?<div className={`${styles.worldHint} home-world-context`} role="status" aria-live="polite">{context}</div>:null}{transition==='none'&&mobile?<MobileMovementPad input={input} label="Home movement controls" />:null}<span className="sr-only" data-testid="urai-home-webgl-orb">The sacred-tech Orb companion is physically present in the Home sanctuary and consumes the final authored Orb GLB.</span><span className="sr-only" data-testid="urai-home-embodied-avatar">Your embodied Home presence uses the real skinned V4 human candidate.</span></main>
}

useGLTF.preload(SANCTUARY)
useGLTF.preload(ORB_MODEL)
useGLTF.preload(PORTAL_MODEL)
useGLTF.preload(HUMAN)
useGLTF.preload(FERN_MODEL)
useGLTF.preload(V48_CAGED_SCONCE)
useGLTF.preload(V48_PIPE_SYSTEM)
useGLTF.preload(V48_ROCK_FACE_01)
useGLTF.preload(V48_ROCK_FACE_02)
useTexture.preload([ROCK_DIFFUSE, ROCK_NORMAL, ROCK_ARM, ROCK_DISPLACEMENT])
