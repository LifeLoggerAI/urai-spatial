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
const HOME_PHOTOGRAPHIC_PBR_V19 = 'polyhaven-rock-tile-floor-plus-studio-small-08-built-sanctuary-v19'
const HOME_SCANNED_COMPOSITION_V1 = 'built-sacred-tech-sanctuary-v20'

const SPAWN = new THREE.Vector3(2.05, 0.04, 6.8)
const ORB = new THREE.Vector3(0, 1.82, -3.72)
const GROUND = new THREE.Vector3(-5.2, 0, -8.4)
const LIFE_MAP = new THREE.Vector3(5.2, 0, -8.4)
const BOUNDS = { minX: -6.6, maxX: 6.6, minZ: -9.4, maxZ: 7.2 }
const DEFAULT_YAW = 0.205

const ORB_CLIPS: Record<OrbState, string> = {
  dormant: 'Orb_Resting', idle: 'Orb_Idle', attention: 'Orb_Attention', listening: 'Orb_Listening',
  thinking: 'Orb_Thinking', speaking: 'Orb_Speaking', guiding: 'Orb_Guiding', reflecting: 'Orb_Reflecting',
  calming: 'Orb_Calming', privacy: 'Orb_Privacy', warning: 'Orb_Degraded', transition: 'Orb_Transition',
}

const SANCTUARY_REQUIRED_OBJECTS = [
  'home-authored-terrain', 'home-authored-embodied-self', 'home-orb-sanctuary',
  'home-ground-environmental-threshold', 'home-life-map-sky-lookout', 'home-life-map-physical-portal',
  'home-sanctuary-pavilion', 'home-v30-rear-apse', 'home-v30-side-enclosure',
  'home-v30-load-bearing-vault', 'home-v30-orb-apse-architecture', 'home-orb-engineered-cradle',
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

function cloneCompatibilitySanctuary(source: THREE.Object3D) {
  const root = cloneModel(source)
  const retiredFamilies = [
    'mirror-basin-', 'orb-sanctuary-pedestal', 'sanctuary-waterfall-', 'inhabited-village-',
    'living-growth-', 'embodied-presence-', 'memory-place-anchor-'
  ]
  root.visible = false
  root.userData.retainedForGovernedCompatibilityOnly = true
  root.userData.visibleWorldOwner = 'home-built-sanctuary-envelope-v29'
  root.userData.treatment = 'v29-compatibility-glb-provenance-only-no-visible-fantasy-shell'
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
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return
    const materials = Array.isArray(object.material) ? object.material : [object.material]
    for (const material of materials) {
      if (!(material instanceof THREE.MeshStandardMaterial)) continue
      material.color.lerp(new THREE.Color('#3f514f'), 0.58)
      material.emissive.lerp(new THREE.Color('#8bd2d2'), 0.26)
      material.emissiveIntensity = Math.min(Math.max(material.emissiveIntensity, 0.05), 0.26)
      material.roughness = Math.max(material.roughness, 0.36)
      material.metalness = Math.min(Math.max(material.metalness, 0.18), 0.64)
      material.envMapIntensity = Math.min(material.envMapIntensity, 0.84)
      material.needsUpdate = true
    }
  })
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
  const pack = useStonePack(0.09, 0.12)
  const onWalk = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation()
    if (useSceneStore.getState().inputLocked) return
    target.current = new THREE.Vector3(THREE.MathUtils.clamp(event.point.x, BOUNDS.minX, BOUNDS.maxX), 0, THREE.MathUtils.clamp(event.point.z, BOUNDS.minZ, BOUNDS.maxZ))
  }
  return <group name="home-authored-terrain" userData={{ treatment: 'monolithic-photographic-stone-court-v30-no-visible-tiling-grid', source: HOME_PHOTOGRAPHIC_PBR_V19 }}>
    <primitive object={compatibilityModel} />
    <mesh position={[0,-0.3,-1.45]} receiveShadow castShadow>
      <boxGeometry args={[16.8,0.22,19.5]} />
      <meshPhysicalMaterial color="#0c1110" roughness={0.88} metalness={0.02} clearcoat={0.04} clearcoatRoughness={0.82} envMapIntensity={0.68} />
    </mesh>
    <mesh name="home-obsidian-walkable-terrain" position={[0,-0.17,-1.45]} rotation={[-Math.PI/2,0,0]} receiveShadow>
      <planeGeometry args={[16.5,19.2,2,2]} />
      <meshPhysicalMaterial color="#171c19" normalMap={pack.normal} normalScale={new THREE.Vector2(0.12,0.12)} roughnessMap={pack.arm} roughness={0.76} metalness={0.04} clearcoat={0.05} clearcoatRoughness={0.76} envMapIntensity={0.72} />
    </mesh>
    <mesh name="home-walkable-navigation-surface" position={[0,0.18,-1.45]} rotation={[-Math.PI/2,0,0]} onClick={onWalk}>
      <planeGeometry args={[13.4,17.5]} /><meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
    </mesh>
  </group>
}

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

function SanctuaryShellMass({pack,position,rotation=[0,0,0],width,height,depth,openingWidth,openingHeight,color='#242a27'}:{pack:SurfacePack;position:Vec3;rotation?:Vec3;width:number;height:number;depth:number;openingWidth:number;openingHeight:number;color?:string}) {
  const geometry=useMemo(()=>{
    const shape=new THREE.Shape()
    shape.moveTo(-width/2,-height/2);shape.lineTo(width/2,-height/2);shape.lineTo(width/2,height*0.08)
    shape.bezierCurveTo(width*0.49,height*0.30,width*0.33,height*0.47,0,height/2)
    shape.bezierCurveTo(-width*0.33,height*0.47,-width*0.49,height*0.30,-width/2,height*0.08);shape.lineTo(-width/2,-height/2)
    const hole=new THREE.Path();hole.moveTo(-openingWidth/2,-openingHeight/2);hole.lineTo(openingWidth/2,-openingHeight/2);hole.lineTo(openingWidth/2,openingHeight*0.08)
    hole.bezierCurveTo(openingWidth*0.46,openingHeight*0.34,openingWidth*0.28,openingHeight*0.48,0,openingHeight/2)
    hole.bezierCurveTo(-openingWidth*0.28,openingHeight*0.48,-openingWidth*0.46,openingHeight*0.34,-openingWidth/2,openingHeight*0.08);hole.lineTo(-openingWidth/2,-openingHeight/2);shape.holes.push(hole)
    const g=new THREE.ExtrudeGeometry(shape,{depth,steps:1,curveSegments:16,bevelEnabled:true,bevelSegments:4,bevelSize:0.09,bevelThickness:0.09});g.center();g.computeVertexNormals();return g
  },[depth,height,openingHeight,openingWidth,width]);useEffect(()=>()=>geometry.dispose(),[geometry])
  return <mesh geometry={geometry} position={position as [number,number,number]} rotation={rotation as [number,number,number]} castShadow receiveShadow><meshPhysicalMaterial color={color} map={pack.color} normalMap={pack.normal} normalScale={new THREE.Vector2(0.38,0.38)} roughnessMap={pack.arm} displacementMap={pack.displacement} displacementScale={0.007} displacementBias={-0.0035} roughness={0.79} metalness={0.035} clearcoat={0.035} clearcoatRoughness={0.82} envMapIntensity={0.58} /></mesh>
}

function CantedSanctuaryWing({pack,side}:{pack:SurfacePack;side:-1|1}) {
  const geometry=useMemo(()=>{const s=side;const shape=new THREE.Shape();shape.moveTo(-1.65*s,-2.6);shape.lineTo(1.4*s,-2.6);shape.lineTo(1.72*s,-0.72);shape.lineTo(1.35*s,1.95);shape.lineTo(0.58*s,2.62);shape.lineTo(-1.15*s,2.35);shape.lineTo(-1.78*s,0.28);shape.closePath();const g=new THREE.ExtrudeGeometry(shape,{depth:6.9,steps:1,bevelEnabled:true,bevelSegments:4,bevelSize:0.09,bevelThickness:0.09});g.center();g.computeVertexNormals();return g},[side]);useEffect(()=>()=>geometry.dispose(),[geometry])
  const x=side*5.65,rot=side*-0.105
  return <group position={[x,2.55,-2.05]} rotation={[0,rot,0]} userData={{treatment:'v36-continuous-canted-sanctuary-wing'}}><mesh geometry={geometry} castShadow receiveShadow><meshPhysicalMaterial color={side<0?'#252c29':'#302e28'} map={pack.color} normalMap={pack.normal} normalScale={new THREE.Vector2(0.32,0.32)} roughnessMap={pack.arm} roughness={0.8} metalness={0.035} clearcoat={0.025} clearcoatRoughness={0.84} envMapIntensity={0.54} /></mesh><RoundedBox args={[0.18,2.55,4.5]} radius={0.055} smoothness={4} position={[-side*1.46,-0.15,0.1]} castShadow receiveShadow><meshPhysicalMaterial color="#101816" roughness={0.4} metalness={0.55} envMapIntensity={0.72} /></RoundedBox><RoundedBox args={[0.06,1.82,3.7]} radius={0.02} smoothness={3} position={[-side*1.57,-0.02,0.12]}><meshStandardMaterial color={side<0?'#677f75':'#82745b'} emissive={side<0?'#27483f':'#4a3825'} emissiveIntensity={0.12} metalness={0.7} roughness={0.31} /></RoundedBox></group>
}

function VaultShoulder({pack,side}:{pack:SurfacePack;side:-1|1}) {
  return <group position={[side*3.45,4.78,-2.45]} rotation={[-0.018,side*0.025,side*-0.19]} userData={{treatment:'v36-grounded-vault-shoulder-attached-to-wing'}}><RoundedBox args={[5.65,0.46,6.8]} radius={0.16} smoothness={6} castShadow receiveShadow><meshPhysicalMaterial color={side<0?'#202724':'#292a24'} map={pack.color} normalMap={pack.normal} normalScale={new THREE.Vector2(0.26,0.26)} roughnessMap={pack.arm} roughness={0.78} metalness={0.045} clearcoat={0.02} clearcoatRoughness={0.84} envMapIntensity={0.5} /></RoundedBox><RoundedBox args={[4.35,0.08,5.4]} radius={0.025} smoothness={3} position={[0,-0.255,0.12]}><meshStandardMaterial color="#313b36" metalness={0.62} roughness={0.38} /></RoundedBox></group>
}

function SanctuaryArchitecture() {
  const pack=useStonePack(0.42,0.58)
  return <group name="home-sanctuary-pavilion" userData={{visualOwner:'cinematic-integrated-megalithic-sanctuary-v36',construction:'continuous-rear-shell-canted-wings-grounded-vault-shoulders',visualTreatment:'v36-continuous-megalithic-sanctuary-final-candidate'}}>
    <group name="home-v30-rear-apse" userData={{treatment:'v36-single-continuous-rear-shell-with-machine-cavity'}}>
      <SanctuaryShellMass pack={pack} position={[0,3.18,-7.55]} width={14.7} height={6.65} depth={2.05} openingWidth={8.35} openingHeight={4.45} color="#2a2e29" />
      <RoundedBox args={[10.2,0.48,2.5]} radius={0.16} smoothness={6} position={[0,0.26,-6.62]} receiveShadow castShadow><meshPhysicalMaterial color="#151b19" map={pack.color} normalMap={pack.normal} normalScale={new THREE.Vector2(0.22,0.22)} roughnessMap={pack.arm} roughness={0.87} metalness={0.025} envMapIntensity={0.44} /></RoundedBox>
    </group>
    <group name="home-v30-side-enclosure" userData={{treatment:'v36-continuous-asymmetric-canted-wings-no-modular-bays'}}><CantedSanctuaryWing pack={pack} side={-1} /><CantedSanctuaryWing pack={pack} side={1} /></group>
    <group name="home-v30-load-bearing-vault" userData={{treatment:'v36-vault-shoulders-grounded-into-side-wings-with-central-oculus'}}><VaultShoulder pack={pack} side={-1} /><VaultShoulder pack={pack} side={1} /></group>
    <group name="home-v30-orb-apse-architecture" userData={{treatment:'v36-machine-cavity-bonded-into-rear-shell-and-floor'}}>
      <RoundedBox args={[8.55,4.25,0.7]} radius={0.2} smoothness={7} position={[0,2.26,-6.03]} castShadow receiveShadow><meshPhysicalMaterial color="#0f1716" roughness={0.54} metalness={0.48} clearcoat={0.09} clearcoatRoughness={0.48} envMapIntensity={0.72} /></RoundedBox>
      <RoundedBox args={[7.7,3.5,0.11]} radius={0.12} smoothness={5} position={[0,2.25,-5.66]}><meshPhysicalMaterial color="#071110" emissive="#183c38" emissiveIntensity={0.018} roughness={0.37} metalness={0.26} clearcoat={0.18} clearcoatRoughness={0.42} /></RoundedBox>
    </group>
    <group name="home-v32-depth-envelope" userData={{treatment:'v36-integrated-practical-light-cuts-and-deep-shell-material-separation'}}>
      <RecessedPractical position={[-5.5,0.48,2.05]} /><RecessedPractical position={[5.42,0.48,1.2]} warm={false} />
      <RecessedPractical position={[-5.05,0.48,-5.55]} warm={false} /><RecessedPractical position={[4.92,0.48,-5.45]} />
    </group>
  </group>
}

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

function MachineLink({from,to,thickness=0.18,color='#64766f'}:{from:Vec3;to:Vec3;thickness?:number;color?:string}){
  const {mid,quat,length}=useMemo(()=>{const a=new THREE.Vector3(...from),b=new THREE.Vector3(...to),d=b.clone().sub(a),length=d.length(),mid=a.clone().add(b).multiplyScalar(0.5),quat=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,0,1),d.normalize());return{mid,quat,length}},[from,to]);return <RoundedBox args={[thickness,thickness*0.72,length]} radius={Math.min(0.055,thickness*0.22)} smoothness={5} position={mid} quaternion={quat} castShadow receiveShadow><meshPhysicalMaterial color={color} roughness={0.34} metalness={0.74} clearcoat={0.055} clearcoatRoughness={0.42} envMapIntensity={0.82} /></RoundedBox>
}

function EmbeddedMachineTrench({x,z,length=5.4,tone='#25342f'}:{x:number;z:number;length?:number;tone?:string}) { return <group position={[x,-0.055,z]} userData={{treatment:'v36-sunk-floor-service-trench'}}><RoundedBox args={[0.5,0.11,length]} radius={0.055} smoothness={4} castShadow receiveShadow><meshPhysicalMaterial color="#080d0c" roughness={0.6} metalness={0.34} envMapIntensity={0.5} /></RoundedBox><RoundedBox args={[0.11,0.035,length*0.88]} radius={0.025} smoothness={3} position={[0,0.067,0]}><meshStandardMaterial color={tone} emissive={tone} emissiveIntensity={0.09} metalness={0.74} roughness={0.3} /></RoundedBox></group> }

function ReliquaryShellHalf({side}:{side:-1|1}) {
  const geometry=useMemo(()=>{const s=side,shape=new THREE.Shape();shape.moveTo(0.3*s,-1.55);shape.lineTo(1.45*s,-1.48);shape.lineTo(2.28*s,-0.84);shape.lineTo(2.5*s,0.35);shape.lineTo(2.04*s,1.5);shape.lineTo(1.15*s,1.82);shape.lineTo(0.42*s,1.42);shape.lineTo(0.72*s,0.62);shape.lineTo(0.66*s,-0.55);shape.closePath();const g=new THREE.ExtrudeGeometry(shape,{depth:0.92,steps:1,curveSegments:4,bevelEnabled:true,bevelSegments:4,bevelSize:0.1,bevelThickness:0.1});g.center();g.computeVertexNormals();return g},[side]);useEffect(()=>()=>geometry.dispose(),[geometry]);return <group position={[0,2.05,-0.72]} userData={{treatment:'v36-deep-reliquary-shell-half'}}><mesh geometry={geometry} castShadow receiveShadow><meshPhysicalMaterial color={side<0?'#182a26':'#332f26'} roughness={0.34} metalness={0.71} clearcoat={0.08} clearcoatRoughness={0.38} envMapIntensity={0.86} /></mesh><RoundedBox args={[0.12,1.48,0.12]} radius={0.035} smoothness={4} position={[side*1.72,0.18,0.56]}><meshStandardMaterial color={side<0?'#78998e':'#a39170'} emissive={side<0?'#274e46':'#543d25'} emissiveIntensity={0.11} metalness={0.75} roughness={0.28} /></RoundedBox></group>
}

function WallMachineAnchor({side}:{side:-1|1}) { return <group position={[side*3.22,2.08,-1.35]} rotation={[0,side*-0.06,side*0.025]} userData={{treatment:'v36-wall-embedded-load-anchor'}}><RoundedBox args={[1.38,4.1,1.42]} radius={0.19} smoothness={6} castShadow receiveShadow><meshPhysicalMaterial color={side<0?'#15221f':'#2e2a23'} roughness={0.42} metalness={0.6} clearcoat={0.055} clearcoatRoughness={0.46} envMapIntensity={0.76} /></RoundedBox><RoundedBox args={[0.48,2.7,0.08]} radius={0.07} smoothness={4} position={[-side*0.7,0,0.66]}><meshPhysicalMaterial color="#4d5f59" roughness={0.31} metalness={0.78} envMapIntensity={0.85} /></RoundedBox></group> }

function CoreClamp({side,upper=false}:{side:-1|1;upper?:boolean}) { const y=upper?0.63:-0.54;return <group position={[side*0.86,y,0.04]} rotation={[0,side*-0.12,side*(upper?-0.18:0.14)]}><RoundedBox args={[0.62,0.26,0.68]} radius={0.08} smoothness={5} castShadow receiveShadow><meshPhysicalMaterial color={side<0?'#52675f':'#75684f'} roughness={0.3} metalness={0.78} clearcoat={0.06} clearcoatRoughness={0.34} envMapIntensity={0.88} /></RoundedBox><RoundedBox args={[0.19,0.34,0.24]} radius={0.05} smoothness={4} position={[-side*0.29,0,0.15]}><meshStandardMaterial color="#8aa79d" emissive="#2d5f55" emissiveIntensity={0.09} metalness={0.68} roughness={0.3} /></RoundedBox></group> }

function OrbPlatform(){ return <group name="home-orb-machine-plinth" userData={{treatment:'v36-floor-integrated-service-trenches-and-wall-load-paths',visualTreatment:'v36-no-plinth-no-freestanding-rails'}}><EmbeddedMachineTrench x={-1.25} z={-3.82} length={5.8} tone="#355f57" /><EmbeddedMachineTrench x={1.25} z={-3.82} length={5.8} tone="#5a4d36" /><RoundedBox args={[5.9,0.09,0.42]} radius={0.04} smoothness={3} position={[0,-0.04,-5.45]} receiveShadow><meshPhysicalMaterial color="#111816" roughness={0.52} metalness={0.42} envMapIntensity={0.52} /></RoundedBox></group> }

function OrbCradle(){ return <group name="home-orb-engineered-cradle" position={[0,0,-3.72]} userData={{treatment:'v36-sanctuary-bonded-reliquary-machine',visualTreatment:'v36-deep-shell-halves-wall-anchors-floor-braces-core-clamps'}}><WallMachineAnchor side={-1} /><WallMachineAnchor side={1} /><ReliquaryShellHalf side={-1} /><ReliquaryShellHalf side={1} />
  <MachineLink from={[-3.05,3.32,-1.28]} to={[-1.28,2.68,-0.44]} thickness={0.29} color="#465b54" /><MachineLink from={[3.05,3.28,-1.28]} to={[1.28,2.66,-0.44]} thickness={0.29} color="#6c6049" />
  <MachineLink from={[-2.82,0.72,-1.12]} to={[-0.92,1.22,-0.2]} thickness={0.32} color="#42574f" /><MachineLink from={[2.82,0.72,-1.12]} to={[0.92,1.22,-0.2]} thickness={0.32} color="#675a45" />
  <MachineLink from={[-1.25,0.1,0.28]} to={[-0.82,1.2,0.02]} thickness={0.25} color="#4d625b" /><MachineLink from={[1.25,0.1,0.28]} to={[0.82,1.2,0.02]} thickness={0.25} color="#75674e" />
  <RoundedBox args={[6.55,0.3,0.72]} radius={0.1} smoothness={5} position={[0,3.72,-1.12]} castShadow receiveShadow><meshPhysicalMaterial color="#202b27" roughness={0.38} metalness={0.68} envMapIntensity={0.78} /></RoundedBox>
  <RoundedBox args={[0.64,4.25,0.84]} radius={0.13} smoothness={5} position={[0,2.15,-1.5]} castShadow receiveShadow><meshPhysicalMaterial color="#101a18" roughness={0.44} metalness={0.58} envMapIntensity={0.7} /></RoundedBox>
</group> }

function SacredOrb({state,reducedMotion,onOpen}:{state:OrbState;reducedMotion:boolean;onOpen:()=>void}){
  const root=useRef<THREE.Group>(null),authoredCore=useRef<THREE.Group>(null),activeAction=useRef<THREE.AnimationAction|null>(null);const orb=useGLTF(ORB_MODEL);const authoredOrb=useMemo(()=>cloneOrbModel(orb.scene),[orb.scene]);const {actions}=useAnimations(orb.animations,authoredOrb);const sensory=useMemo(()=>resolveOrbSensoryOutput(state,reducedMotion,true),[state,reducedMotion])
  useEffect(()=>{const allActions=Object.values(actions).filter((action):action is THREE.AnimationAction=>Boolean(action));if(reducedMotion){allActions.forEach((action)=>action.stop());activeAction.current=null;return}const next=actions[ORB_CLIPS[state]];if(!next)return;const previous=activeAction.current;if(previous&&previous!==next)previous.fadeOut(0.2);next.reset().setLoop(THREE.LoopRepeat,Infinity).fadeIn(0.2).play();activeAction.current=next},[actions,reducedMotion,state]);useEffect(()=>()=>{Object.values(actions).forEach((action)=>action?.stop())},[actions])
  useFrame(({clock})=>{if(!root.current)return;root.current.rotation.y=reducedMotion?0:Math.sin(clock.elapsedTime*0.18)*0.035;root.current.position.y=ORB.y;if(authoredCore.current)authoredCore.current.scale.setScalar(0.035)})
  const stateColor=state==='warning'?'#d29a65':state==='thinking'||state==='reflecting'?'#99a5d4':'#83d5cb';const intensity=state==='speaking'?1.24:state==='listening'?1.08:0.9
  return <group ref={root} name="home-orb-sanctuary" position={ORB} onClick={(event)=>{event.stopPropagation();onOpen()}} userData={{orbState:state,animation:sensory.animation,modelClip:ORB_CLIPS[state],runtimeAsset:ORB_MODEL,treatment:'v36-faceted-memory-heart-captured-inside-architectural-reliquary'}}><group ref={authoredCore} scale={0.035} name="home-orb-authored-core"><primitive object={authoredOrb} visible={false} /></group><group name="home-orb-engineered-body" rotation={[0.03,0.18,-0.025]}>
    <mesh scale={[1.05,0.82,0.86]} castShadow receiveShadow><icosahedronGeometry args={[0.72,2]} /><meshPhysicalMaterial color="#182824" emissive={stateColor} emissiveIntensity={intensity*0.035} roughness={0.24} metalness={0.58} clearcoat={0.32} clearcoatRoughness={0.24} envMapIntensity={1.0} /></mesh>
    <mesh scale={[0.62,0.5,0.54]}><dodecahedronGeometry args={[0.72,0]} /><meshPhysicalMaterial color={stateColor} emissive={stateColor} emissiveIntensity={intensity*0.34} roughness={0.18} metalness={0.28} transmission={0.08} transparent opacity={0.72} clearcoat={0.48} clearcoatRoughness={0.18} /></mesh>
    <CoreClamp side={-1} upper /><CoreClamp side={1} upper /><CoreClamp side={-1} /><CoreClamp side={1} />
  </group><pointLight color={stateColor} intensity={intensity*0.55} distance={5.2} decay={2} /></group>
}

function HumanPresence({root}:{root:MutableRefObject<THREE.Group|null>}){const human=useGLTF(HUMAN);const model=useMemo(()=>cloneModel(human.scene),[human.scene]);return <group ref={root} name="home-authored-embodied-self" position={SPAWN} rotation={[0,Math.PI,0]} userData={{presentation:'privacy-preserving-first-person-presence'}}><primitive object={model} visible={false} scale={0.72} /></group>}
function PortalGlass({tone}:{tone:'ground'|'life-map'}){const color=tone==='ground'?'#4f6f6c':'#5b5f82';return <mesh position={[0,1.34,-0.74]}><planeGeometry args={[1.34,2.2]} /><meshPhysicalMaterial color="#050b0a" emissive={color} emissiveIntensity={0.004} transparent opacity={0.2} transmission={0.02} roughness={0.56} metalness={0.1} clearcoat={0.16} clearcoatRoughness={0.42} side={THREE.DoubleSide} depthWrite /></mesh>}
function ThresholdAlcove({tone,onActivate,authoredPortal=false}:{tone:'ground'|'life-map';onActivate:()=>void;authoredPortal?:boolean}){
  const portal=useGLTF(PORTAL_MODEL); const model=useMemo(()=>clonePortalModel(portal.scene),[portal.scene]); const accent=tone==='ground'?'#526d68':'#626784'
  return <group userData={{treatment:'v30-threshold-chamber-integrated-with-rear-apse',destination:tone}}>
    <PouredStone position={[-0.9,0.16,0.02]} size={[0.42,0.22,0.7]} color="#121916" metalness={0.24} roughness={0.58} />
    <PouredStone position={[0.9,0.16,0.02]} size={[0.42,0.22,0.7]} color="#121916" metalness={0.24} roughness={0.58} />
    <mesh position={[-0.9,1.35,0.02]} castShadow receiveShadow><cylinderGeometry args={[0.18,0.31,2.35,8]} /><meshStandardMaterial color="#202824" metalness={0.22} roughness={0.58} /></mesh>
    <mesh position={[0.9,1.35,0.02]} castShadow receiveShadow><cylinderGeometry args={[0.18,0.31,2.35,8]} /><meshStandardMaterial color="#202824" metalness={0.22} roughness={0.58} /></mesh>
    <StructuralRib points={[[-0.9,2.5,0.02],[-0.72,2.72,0.02],[-0.35,2.88,0.02],[0,2.93,0.02],[0.35,2.88,0.02],[0.72,2.72,0.02],[0.9,2.5,0.02]]} radius={0.065} color={accent} metalness={0.78} roughness={0.3} />
    <mesh position={[0,1.46,-0.12]}><planeGeometry args={[1.54,2.22]} /><meshPhysicalMaterial color="#070d0c" emissive={accent} emissiveIntensity={0.01} transparent opacity={0.22} transmission={0.08} roughness={0.48} metalness={0.06} side={THREE.DoubleSide} depthWrite /></mesh>
    {authoredPortal?<group position={[0,1.43,-0.2]} scale={0.052}><primitive object={model} /></group>:null}
    <mesh position={[0,1.45,0.04]} onClick={(event)=>{event.stopPropagation();onActivate()}}><boxGeometry args={[2.2,2.9,1.1]} /><meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} /></mesh>
  </group>
}

function Thresholds({onGround,onLifeMap}:{onGround:()=>void;onLifeMap:()=>void}){return <><group name="home-ground-environmental-threshold" position={GROUND} rotation={[0,0.08,0]}><ThresholdAlcove tone="ground" onActivate={onGround} /></group><group name="home-life-map-sky-lookout"><group name="home-life-map-physical-portal" position={LIFE_MAP} rotation={[0,-0.08,0]} userData={{runtimeAsset:PORTAL_MODEL,treatment:'authored-portal-integrated-architecture-v19'}}><ThresholdAlcove tone="life-map" onActivate={onLifeMap} authoredPortal /></group></group></>}
function PhysicalEnvironment(){return <Environment files={HOME_HDR} background={false} environmentIntensity={0.72} />}

function PlayerRig({input,yaw,pitch,target,avatar,onNearby,transition,reducedMotion,onTransitionComplete,onTransitionSequence}:{input:MovementInput;yaw:MutableRefObject<number>;pitch:MutableRefObject<number>;target:MutableRefObject<THREE.Vector3|null>;avatar:MutableRefObject<THREE.Group|null>;onNearby:(value:Nearby)=>void;transition:'none'|'ground'|'life-map';reducedMotion:boolean;onTransitionComplete:()=>void;onTransitionSequence:(value:TransitionSequence)=>void}){
  const {camera,size}=useThree();const pos=useRef(SPAWN.clone()),velocity=useRef(new THREE.Vector3()),started=useRef<number|null>(null),issued=useRef(false),last=useRef<Nearby>(null),lastSequence=useRef<TransitionSequence>('idle')
  useLayoutEffect(()=>{camera.near=0.1;camera.far=140;if(camera instanceof THREE.PerspectiveCamera)camera.fov=size.height>size.width?62:56;camera.updateProjectionMatrix();camera.position.set(0.58,1.64,6.86);camera.lookAt(0,1.38,-2.15)},[camera,size.height,size.width])
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
    const portrait=size.height>size.width,backDistance=portrait?0.1:0.18,eyeHeight=portrait?1.5:1.6
    const desired=pos.current.clone().add(new THREE.Vector3(Math.sin(yaw.current)*backDistance,eyeHeight,Math.cos(yaw.current)*backDistance))
    camera.position.lerp(desired,1-Math.pow(0.00065,delta))
    const look=pos.current.clone().add(new THREE.Vector3(-Math.sin(yaw.current)*9.2,1.25+pitch.current,-Math.cos(yaw.current)*9.2));camera.lookAt(look)
    const candidates:readonly [Nearby,THREE.Vector3,number][]=[['orb',ORB,2.5],['ground',GROUND,2.8],['life-map',LIFE_MAP,2.8]]
    let next:Nearby=null,best=Infinity
    for(const [name,p,r] of candidates){const d=Math.hypot(pos.current.x-p.x,pos.current.z-p.z);if(d<r&&d<best){next=name;best=d}}
    if(next!==last.current){last.current=next;onNearby(next)}
  });return null
}
function SceneReady({onReady}:{onReady:()=>void}){const {scene}=useThree();const done=useRef(false);useEffect(()=>{let timer:number|undefined;const check=()=>{if(done.current)return;if(SANCTUARY_REQUIRED_OBJECTS.every((name)=>scene.getObjectByName(name))){done.current=true;onReady();return}timer=window.setTimeout(check,60)};check();return()=>{if(timer!==undefined)window.clearTimeout(timer)}},[onReady,scene]);return null}
function SacredFinalScene(props:{input:MovementInput;yaw:MutableRefObject<number>;pitch:MutableRefObject<number>;target:MutableRefObject<THREE.Vector3|null>;avatar:MutableRefObject<THREE.Group|null>;nearby:(value:Nearby)=>void;orbState:OrbState;reducedMotion:boolean;transition:'none'|'ground'|'life-map';onOrb:()=>void;onGround:()=>void;onLifeMap:()=>void;onTransitionComplete:()=>void;onTransitionSequence:(value:TransitionSequence)=>void;onReady:()=>void}){const cosmic=props.transition==='life-map';return <><color attach="background" args={[cosmic?'#01030a':'#0b1213']} /><fogExp2 attach="fog" args={[cosmic?'#060918':'#111b1b',cosmic?0.0022:0.0058]} />{!cosmic?<SkyDome />:null}{cosmic?<Stars radius={190} depth={100} count={2800} factor={3} saturation={0.05} fade speed={props.reducedMotion?0:0.008} />:null}<PhysicalEnvironment /><ambientLight intensity={0.22} color="#d6dbd4" /><hemisphereLight args={['#8fa9a2','#111612',0.38]} /><directionalLight position={[-10,15,8]} intensity={0.66} color="#dfd8c7" /><directionalLight position={[9,8,-10]} intensity={0.46} color="#6f9c98" /><spotLight position={[-1.5,8.8,4.8]} intensity={2.05} color="#e5c995" distance={25} angle={0.44} penumbra={0.92} decay={2} castShadow /><pointLight position={[0,2.35,-4.05]} intensity={0.72} distance={9.4} decay={2} color="#cdb47f" /><spotLight position={[-5.4,3.6,1.8]} target-position={[-1.4,1.7,-3.2]} intensity={0.74} color="#d3ad78" distance={14} angle={0.55} penumbra={0.9} decay={2} /><spotLight position={[5.2,3.4,-0.5]} intensity={0.62} color="#78a8a7" distance={13} angle={0.52} penumbra={0.9} decay={2} /><SanctuaryCourt target={props.target} /><SanctuaryArchitecture /><SanctuaryGlazing /><AtmosphericDepth /><OrbPlatform /><OrbCradle /><SacredOrb state={props.orbState} reducedMotion={props.reducedMotion} onOpen={props.onOrb} /><HumanPresence root={props.avatar} /><Thresholds onGround={props.onGround} onLifeMap={props.onLifeMap} /><ContactShadows position={[0,0.03,-3.72]} opacity={0.48} scale={7.4} blur={2.2} far={3.8} resolution={256} frames={1} color="#020403" /><PlayerRig input={props.input} yaw={props.yaw} pitch={props.pitch} target={props.target} avatar={props.avatar} onNearby={props.nearby} transition={props.transition} reducedMotion={props.reducedMotion} onTransitionComplete={props.onTransitionComplete} onTransitionSequence={props.onTransitionSequence} /><SceneReady onReady={props.onReady} /></>}

export function HomeWorldProductionFinal({onOrbOpen=requestUraiWorldOrbOpen,webglAvailable=true}:Props){
  const [canvasReady,setCanvasReady]=useState(false),[sceneReady,setSceneReady]=useState(false),[nearby,setNearby]=useState<Nearby>(null),[dragging,setDragging]=useState(false),[reducedMotion,setReducedMotion]=useState(false),[mobile,setMobile]=useState(false),[orbState,setOrbState]=useState<OrbState>('idle'),[transition,setTransition]=useState<'none'|'ground'|'life-map'>('none'),[portalSequence,setPortalSequence]=useState<TransitionSequence>('idle');const yaw=useRef(DEFAULT_YAW),pitch=useRef(-0.045),target=useRef<THREE.Vector3|null>(null),avatar=useRef<THREE.Group|null>(null),markSceneReady=useCallback(()=>setSceneReady(true),[])
  const openOrb=useCallback(()=>{if(!useSceneStore.getState().inputLocked&&transition==='none'){setOrbState('attention');onOrbOpen()}},[onOrbOpen,transition]);const ground=useCallback(()=>{if(transition!=='none')return;target.current=null;setOrbState('transition');setPortalSequence('ground:opening');setTransition('ground')},[transition]);const lifeMap=useCallback(()=>{if(transition!=='none')return;target.current=null;setOrbState('transition');setPortalSequence('life-map:opening');setTransition('life-map')},[transition]);const interact=useCallback(()=>{if(nearby==='orb')openOrb();else if(nearby==='ground')ground();else if(nearby==='life-map')lifeMap()},[nearby,openOrb,ground,lifeMap]);const input=useMovementInput({enabled:transition==='none',onInteract:interact,onReset:()=>{target.current=SPAWN.clone();yaw.current=DEFAULT_YAW;pitch.current=-0.045}});const look=useDragLook({yaw,pitch,enabled:transition==='none',sensitivity:0.003,minPitch:-0.48,maxPitch:0.52,onDragState:setDragging})
  useEffect(()=>{const rm=window.matchMedia('(prefers-reduced-motion: reduce)'),mobileQuery=window.matchMedia('(pointer: coarse), (max-width: 700px)');const apply=()=>{setReducedMotion(rm.matches);setMobile(mobileQuery.matches)};apply();rm.addEventListener?.('change',apply);mobileQuery.addEventListener?.('change',apply);return()=>{rm.removeEventListener?.('change',apply);mobileQuery.removeEventListener?.('change',apply)}},[])
  useEffect(()=>{const listener=(event:CustomEvent<OrbStateEventDetail>)=>{if(transition==='none')setOrbState(event.detail.state)};window.addEventListener(URAI_ORB_STATE_EVENT,listener);return()=>window.removeEventListener(URAI_ORB_STATE_EVENT,listener)},[transition])
  useEffect(()=>{const cancel=(event:KeyboardEvent)=>{if(event.key!=='Escape'||transition==='none')return;event.preventDefault();setTransition('none');setPortalSequence('idle');setOrbState('idle');const store=useSceneStore.getState();store.setPhase('HOME');store.unlock()};window.addEventListener('keydown',cancel,true);return()=>window.removeEventListener('keydown',cancel,true)},[transition])
  if(!webglAvailable)return null;const ready=canvasReady&&sceneReady;const context=transition==='life-map'?'Ascending into your Life Map':transition==='ground'?'Descending into Ground':nearby==='orb'?'The Orb is here':nearby==='ground'?'The path descends':nearby==='life-map'?'The threshold opens to your Life Map':null;const complete=()=>{if(transition==='ground')requestUraiWorldTravel({destination:'infrastructure-hub',href:'/ground/',entryPortal:'home-ground',cameraCheckpoint:'home-ground-descent'});else if(transition==='life-map')requestUraiWorldTravel({destination:'life-map',href:'/life-map/?from=home-sky',entryPortal:'home-sky',cameraCheckpoint:'home-sky-ascent-complete'})}
  return <main className={`${styles.world} urai-asset-home-world`} data-urai-home-production data-urai-true-3d="true" data-home-primary-owner="asset-driven" data-home-visible-world="moonlit-sacred-tech-sanctuary" data-home-world-character="premium-cinematic-sacred-tech" data-home-physical-base="built-obsidian-glass-stone-sanctuary" data-home-visual-ownership="three-dimensional-geometry" data-home-desktop-mobile-world="same-scene" data-home-embodied-self="makehuman-v4" data-home-presence-presentation="privacy-preserving-first-person" data-home-movement="walk-keyboard-click-touch" data-home-audio="production-opus-consent-controlled" data-home-visual-grade="cinematic-pbr-v36-integrated-megalithic-reliquary-sanctuary" data-home-final-art-revision="v36-integrated-megalithic-reliquary-sanctuary-candidate" data-home-art-certification="v36-retained-pixel-candidate" data-home-scanned-composition={HOME_SCANNED_COMPOSITION_V1} data-home-pbr-environment="local-cc0-hdri-studio-small-08" data-home-assets-ready={ready?'true':'false'} data-home-runtime-assets="home-entry-chamber-v1.glb home-human-makehuman-v4.glb urai-orb-avatar-v1.glb portal-ring-master-v1.glb built-sacred-tech-sanctuary-v19" data-home-scenery-assets="polyhaven-fern-02-geometry-v1.glb polyhaven-rock-tile-floor-pbr-v2-optimized studio-small-08-hdri-v1 architectural-depth-v25-volumetric-only-no-card" data-home-authored-regions="home-authored-terrain home-mountain-horizon home-living-vegetation home-sanctuary-pavilion home-life-map-physical-portal" data-home-nearby={nearby??'none'} data-home-camera-mode={transition!=='none'?transition:dragging?'look':'embodied-third-person'} data-home-scene-phase={transition==='none'?'HOME':transition.toUpperCase()} data-home-portal-sequence={portalSequence} data-home-portal-lifecycle="environmental-approach-traversal-arrival" data-home-animation-owner="built-physical-sanctuary-v20-plus-cc0-fern-plus-authored-living-orb" data-home-input-locked={transition!=='none'?'true':'false'} data-home-orb-state={orbState} data-home-orb-clip={resolveOrbSensoryOutput(orbState,reducedMotion,true).animation} data-home-orb-model-clip={reducedMotion?'stopped-reduced-motion':ORB_CLIPS[orbState]} data-testid="home-visible-navigable-sanctuary-world" style={{position:'relative',overflow:'hidden',background:'#050a0d'}} {...look}><Canvas className={styles.canvas} dpr={[1,1.5]} shadows camera={{position:[2.05,1.68,6.9],fov:50,near:0.1,far:140}} gl={{antialias:true,alpha:false,powerPreference:'high-performance'}} onCreated={({gl})=>{gl.outputColorSpace=THREE.SRGBColorSpace;gl.toneMapping=THREE.ACESFilmicToneMapping;gl.toneMappingExposure=1.14;gl.shadowMap.type=THREE.PCFSoftShadowMap;setCanvasReady(true)}}><SacredFinalScene input={input} yaw={yaw} pitch={pitch} target={target} avatar={avatar} nearby={setNearby} orbState={orbState} reducedMotion={reducedMotion} transition={transition} onOrb={openOrb} onGround={ground} onLifeMap={lifeMap} onTransitionComplete={complete} onTransitionSequence={setPortalSequence} onReady={markSceneReady} /></Canvas>{context?<div className={`${styles.worldHint} home-world-context`} role="status" aria-live="polite">{context}</div>:null}{transition==='none'&&mobile?<MobileMovementPad input={input} label="Home movement controls" />:null}<span className="sr-only" data-testid="urai-home-webgl-orb">The sacred-tech Orb companion is physically present in the Home sanctuary and consumes the final authored Orb GLB.</span><span className="sr-only" data-testid="urai-home-embodied-avatar">Your embodied Home presence uses the real skinned V4 human candidate.</span></main>
}

useGLTF.preload(SANCTUARY)
useGLTF.preload(ORB_MODEL)
useGLTF.preload(PORTAL_MODEL)
useGLTF.preload(HUMAN)
useGLTF.preload(FERN_MODEL)
useTexture.preload([ROCK_DIFFUSE, ROCK_NORMAL, ROCK_ARM, ROCK_DISPLACEMENT])
