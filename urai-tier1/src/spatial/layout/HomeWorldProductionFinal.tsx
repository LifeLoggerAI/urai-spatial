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

const SPAWN = new THREE.Vector3(0.72, 0.04, 6.7)
const ORB = new THREE.Vector3(0, 1.58, -2.15)
const GROUND = new THREE.Vector3(-5.2, 0, -8.4)
const LIFE_MAP = new THREE.Vector3(5.2, 0, -8.4)
const BOUNDS = { minX: -6.6, maxX: 6.6, minZ: -9.4, maxZ: 7.2 }
const DEFAULT_YAW = 0.03

const ORB_CLIPS: Record<OrbState, string> = {
  dormant: 'Orb_Resting', idle: 'Orb_Idle', attention: 'Orb_Attention', listening: 'Orb_Listening',
  thinking: 'Orb_Thinking', speaking: 'Orb_Speaking', guiding: 'Orb_Guiding', reflecting: 'Orb_Reflecting',
  calming: 'Orb_Calming', privacy: 'Orb_Privacy', warning: 'Orb_Degraded', transition: 'Orb_Transition',
}

const SANCTUARY_REQUIRED_OBJECTS = [
  'home-authored-terrain', 'home-authored-embodied-self', 'home-orb-sanctuary',
  'home-ground-environmental-threshold', 'home-life-map-sky-lookout', 'home-life-map-physical-portal',
  'home-mountain-horizon', 'home-living-vegetation', 'home-sanctuary-pavilion',
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
  root.visible = false
  root.userData.retainedForGovernedCompatibilityOnly = true
  root.userData.visibleWorldOwner = 'home-built-physical-sanctuary-v19'
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
  const pack = useStonePack(2.15, 2.55)
  const onWalk = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation()
    if (useSceneStore.getState().inputLocked) return
    target.current = new THREE.Vector3(THREE.MathUtils.clamp(event.point.x, BOUNDS.minX, BOUNDS.maxX), 0, THREE.MathUtils.clamp(event.point.z, BOUNDS.minZ, BOUNDS.maxZ))
  }
  return <group name="home-authored-terrain" userData={{ treatment: 'large-format-photographic-stone-court-v24', source: HOME_PHOTOGRAPHIC_PBR_V19 }}>
    <primitive object={compatibilityModel} />
    <PouredStone position={[0,-0.16,-1.45]} size={[16.6,0.3,19.3]} color="#0d1211" roughness={0.82} />
    <mesh name="home-obsidian-walkable-terrain" position={[0,0.002,-1.45]} rotation={[-Math.PI/2,0,0]} receiveShadow>
      <planeGeometry args={[16.45,19.1,4,5]} />
      <StoneTopMaterial pack={pack} color="#151b19" relief={0.004} />
    </mesh>
    <group name="home-orb-foundation" position={[0,0,-2.15]} userData={{ treatment:'recessed-machine-foundation-v24-no-circular-pad' }}>
      <PouredStone position={[0,0.045,0]} size={[1.22,0.12,1.02]} color="#0a0f0e" metalness={0.12} roughness={0.48} />
      <PouredStone position={[0,0.12,-0.03]} size={[0.82,0.1,0.68]} color="#171d1b" metalness={0.28} roughness={0.38} />
      <MetalTrim position={[0,0.176,0.25]} size={[0.54,0.012,0.02]} color="#736c59" intensity={0.01} />
    </group>
    <mesh name="home-walkable-navigation-surface" position={[0,0.18,-1.45]} rotation={[-Math.PI/2,0,0]} onClick={onWalk}>
      <planeGeometry args={[13.4,17.5]} /><meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
    </mesh>
  </group>
}

function RecessedPractical({ position, warm = true }: { position: Vec3; warm?: boolean }) {
  const color = warm ? '#caa46d' : '#78aeb0'
  return <group position={position as [number,number,number]}><mesh castShadow receiveShadow><boxGeometry args={[0.28,0.08,0.52]} /><meshStandardMaterial color="#0a0e0e" roughness={0.54} metalness={0.64} /></mesh><mesh position={[0,0.046,0]}><boxGeometry args={[0.18,0.012,0.24]} /><meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.52} roughness={0.36} metalness={0.26} /></mesh><pointLight position={[0,0.13,0]} color={color} intensity={0.14} distance={3.2} decay={2} /></group>
}

const FIN_Z = [3.4, -2.0, -7.2] as const
function SanctuaryArchitecture() {
  const pack = useStonePack(1.2,1.8)
  const bays = [-5.05,0,5.05] as const
  return <group name="home-sanctuary-pavilion" userData={{ visualOwner:'material-authored-sacred-tech-sanctuary-v24',construction:'load-bearing-court-with-recessed-thresholds' }}>
    <ArchitecturalStone pack={pack} position={[-7.15,1.92,-1.5]} size={[0.52,3.7,19.2]} color="#0b100f" roughness={0.78} />
    <ArchitecturalStone pack={pack} position={[7.15,1.92,-1.5]} size={[0.52,3.7,19.2]} color="#0b100f" roughness={0.78} />
    <ArchitecturalStone pack={pack} position={[0,2.05,-9.72]} size={[13.8,4.0,0.5]} color="#0c1211" roughness={0.76} />
    {bays.map((x,index)=><group key={x}>
      <ArchitecturalStone pack={pack} position={[x,2.05,-9.38]} size={[3.75,3.42,0.22]} color={index===1?'#111817':'#0e1413'} roughness={0.72} />
      <ArchitecturalStone pack={pack} position={[x,0.36,-9.08]} size={[3.3,0.38,0.34]} color="#090e0d" roughness={0.66} />
      <MetalTrim position={[x,3.57,-9.02]} size={[2.55,0.018,0.025]} color={index===1?'#6c6755':'#42595a'} intensity={0.012} />
    </group>)}
    <ArchitecturalStone pack={pack} position={[-4.65,2.05,-7.65]} size={[0.52,4.0,4.15]} color="#0a100f" roughness={0.77} />
    <ArchitecturalStone pack={pack} position={[4.65,2.05,-7.65]} size={[0.52,4.0,4.15]} color="#0a100f" roughness={0.77} />
    <MetalTrim position={[-6.84,1.85,-1.5]} size={[0.025,2.45,13.8]} color="#35494a" intensity={0.008} />
    <MetalTrim position={[6.84,1.85,-1.5]} size={[0.025,2.45,13.8]} color="#514d40" intensity={0.008} />
    <RecessedPractical position={[-6.72,0.18,3.25]} /><RecessedPractical position={[6.72,0.18,2.6]} warm={false} />
    <RecessedPractical position={[-6.72,0.18,-3.1]} warm={false} /><RecessedPractical position={[6.72,0.18,-3.8]} />
  </group>
}

function SanctuaryGlazing(){return <group name="home-architectural-glazing" userData={{treatment:'smoked-structural-glass-v22'}}><mesh position={[-6.82,2.02,-1.65]} castShadow receiveShadow><boxGeometry args={[0.07,3.18,16.3]} /><meshPhysicalMaterial color="#182322" roughness={0.28} metalness={0.05} transmission={0.04} transparent opacity={0.58} clearcoat={0.48} clearcoatRoughness={0.22} envMapIntensity={1.08} /></mesh><mesh position={[6.82,2.02,-1.65]} castShadow receiveShadow><boxGeometry args={[0.07,3.18,16.3]} /><meshPhysicalMaterial color="#172221" roughness={0.3} metalness={0.05} transmission={0.04} transparent opacity={0.56} clearcoat={0.46} clearcoatRoughness={0.24} envMapIntensity={1.06} /></mesh><mesh position={[0,2.05,-9.82]} castShadow receiveShadow><boxGeometry args={[10.2,3.25,0.07]} /><meshPhysicalMaterial color="#101918" roughness={0.32} metalness={0.04} transmission={0.035} transparent opacity={0.62} clearcoat={0.42} clearcoatRoughness={0.26} envMapIntensity={1.02} /></mesh></group>}

function SanctuaryCeiling() {
  const pack = useStonePack(1.1,1.5)
  const zBays = [4.2,0.1,-4.0,-8.1] as const
  return <group name="home-architectural-canopy" userData={{ treatment:'coffered-structural-canopy-v24' }}>
    <ArchitecturalStone pack={pack} position={[-5.95,3.95,-2.0]} size={[0.34,0.3,14.7]} color="#080d0c" roughness={0.75} />
    <ArchitecturalStone pack={pack} position={[5.95,3.95,-2.0]} size={[0.34,0.3,14.7]} color="#080d0c" roughness={0.75} />
    {zBays.map((z,index)=><group key={z}>
      <ArchitecturalStone pack={pack} position={[0,4.02,z]} size={[12.25,0.28,0.38]} color="#090e0d" roughness={0.72} />
      <MetalTrim position={[0,3.86,z+0.04]} size={[index===1?5.4:3.4,0.018,0.035]} color={index%2===0?'#625d4d':'#3d5556'} intensity={0.01} />
    </group>)}
    <mesh position={[0,4.12,-1.95]} rotation={[Math.PI/2,0,0]} receiveShadow>
      <planeGeometry args={[11.55,13.8]} /><meshStandardMaterial color="#070b0b" roughness={0.88} metalness={0.04} />
    </mesh>
  </group>
}

function FloorPanelJoints() {
  const zLines = [3.1, -1.25, -5.6] as const
  return <group name="home-floor-panel-joints" userData={{ treatment:'sparse-large-format-stone-seams-v23' }}>
    {zLines.map((z)=><MetalTrim key={z} position={[0,0.026,z]} size={[9.2,0.006,0.008]} color="#181e1d" emissive="#000000" intensity={0} />)}
    <MetalTrim position={[-2.72,0.026,-1.1]} size={[0.008,0.006,11.8]} color="#181e1d" emissive="#000000" intensity={0} />
    <MetalTrim position={[2.72,0.026,-1.1]} size={[0.008,0.006,11.8]} color="#181e1d" emissive="#000000" intensity={0} />
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

function OrbPlatform(){
  return <group name="home-orb-machine-plinth" position={[0,0,-2.15]} userData={{treatment:'compact-rectilinear-relic-foundation-v24'}}>
    <PouredStone position={[0,0.24,0]} size={[0.66,0.18,0.58]} color="#111817" metalness={0.34} roughness={0.36} />
    <mesh position={[0,0.35,0]} castShadow><cylinderGeometry args={[0.19,0.25,0.18,12]} /><meshStandardMaterial color="#252d2b" metalness={0.84} roughness={0.28} /></mesh>
  </group>
}

function OrbCradle(){
  return <group name="home-orb-engineered-cradle" position={[0,0,-2.15]} userData={{treatment:'three-point-machined-yoke-v24'}}>
    <mesh position={[0,0.78,0]} castShadow><cylinderGeometry args={[0.075,0.11,0.78,12]} /><meshStandardMaterial color="#1c2523" metalness={0.86} roughness={0.3} /></mesh>
    <mesh position={[-0.25,1.15,0]} rotation={[0,0,-0.55]} castShadow><cylinderGeometry args={[0.035,0.055,0.55,10]} /><meshStandardMaterial color="#303a37" metalness={0.9} roughness={0.25} /></mesh>
    <mesh position={[0.25,1.15,0]} rotation={[0,0,0.55]} castShadow><cylinderGeometry args={[0.035,0.055,0.55,10]} /><meshStandardMaterial color="#303a37" metalness={0.9} roughness={0.25} /></mesh>
    <mesh position={[0,1.08,-0.23]} rotation={[Math.PI/2,0,0]} castShadow><cylinderGeometry args={[0.03,0.045,0.42,10]} /><meshStandardMaterial color="#5c5a4d" metalness={0.88} roughness={0.27} /></mesh>
  </group>
}

function SacredOrb({state,reducedMotion,onOpen}:{state:OrbState;reducedMotion:boolean;onOpen:()=>void}){
  const root=useRef<THREE.Group>(null),authoredCore=useRef<THREE.Group>(null),activeAction=useRef<THREE.AnimationAction|null>(null); const orb=useGLTF(ORB_MODEL); const authoredOrb=useMemo(()=>cloneOrbModel(orb.scene),[orb.scene]); const {actions}=useAnimations(orb.animations,authoredOrb); const sensory=useMemo(()=>resolveOrbSensoryOutput(state,reducedMotion,true),[state,reducedMotion])
  useEffect(()=>{const allActions=Object.values(actions).filter((action):action is THREE.AnimationAction=>Boolean(action));if(reducedMotion){allActions.forEach((action)=>action.stop());activeAction.current=null;return}const next=actions[ORB_CLIPS[state]];if(!next)return;const previous=activeAction.current;if(previous&&previous!==next)previous.fadeOut(0.2);next.reset().setLoop(THREE.LoopRepeat,Infinity).fadeIn(0.2).play();activeAction.current=next},[actions,reducedMotion,state]); useEffect(()=>()=>{Object.values(actions).forEach((action)=>action?.stop())},[actions])
  useFrame(({clock})=>{if(!root.current||reducedMotion)return;root.current.rotation.y=Math.sin(clock.elapsedTime*0.15)*0.12;root.current.position.y=ORB.y+Math.sin(clock.elapsedTime*0.52)*0.016;if(authoredCore.current){const pulse=state==='speaking'?0.174:state==='listening'?0.169:0.165+Math.sin(clock.elapsedTime*0.9)*0.002;authoredCore.current.scale.setScalar(pulse)}})
  const stateColor=state==='warning'?'#d0a070':state==='thinking'||state==='reflecting'?'#97a5cf':'#93d8d7'; const intensity=state==='speaking'?1.25:state==='listening'?1.1:0.88
  return <group ref={root} name="home-orb-sanctuary" position={ORB} onClick={(event) => { event.stopPropagation(); onOpen() }} userData={{orbState:state,animation:sensory.animation,modelClip:ORB_CLIPS[state],runtimeAsset:ORB_MODEL,treatment:'physical-moonlit-relic-machine-v20'}}><group ref={authoredCore} scale={0.165} name="home-orb-authored-core"><primitive object={authoredOrb} /></group><group name="home-orb-engineered-body" rotation={[0.08,0.34,-0.04]}><mesh name="home-orb-non-spherical-core" scale={[0.275,0.325,0.235]} castShadow><icosahedronGeometry args={[1,2]} /><meshPhysicalMaterial color="#18201f" emissive={stateColor} emissiveIntensity={intensity*0.045} roughness={0.24} metalness={0.78} clearcoat={0.18} clearcoatRoughness={0.38} envMapIntensity={1.16} /></mesh><mesh name="home-orb-upper-cap" position={[0,0.29,0]} rotation={[0,0.18,0]} castShadow><cylinderGeometry args={[0.12,0.18,0.085,16]} /><meshStandardMaterial color="#303a38" metalness={0.9} roughness={0.23} envMapIntensity={1.12} /></mesh><mesh name="home-orb-lower-cap" position={[0,-0.29,0]} rotation={[0,-0.16,0]} castShadow><cylinderGeometry args={[0.18,0.12,0.085,16]} /><meshStandardMaterial color="#252e2d" metalness={0.88} roughness={0.25} envMapIntensity={1.08} /></mesh><mesh name="home-orb-equatorial-seam" rotation={[Math.PI/2,0,0]}><torusGeometry args={[0.245,0.009,8,88]} /><meshStandardMaterial color="#69716d" metalness={0.92} roughness={0.22} /></mesh></group><mesh scale={[0.055,0.082,0.055]}><sphereGeometry args={[1,32,32]} /><meshStandardMaterial color="#dcebea" emissive={stateColor} emissiveIntensity={intensity*0.62} roughness={0.4} /></mesh><mesh name="home-orb-stabilizer-ring-1" rotation={[0.22,0.55,0.08]}><torusGeometry args={[0.35,0.0045,10,112]} /><meshStandardMaterial color="#596463" metalness={0.9} roughness={0.26} /></mesh><mesh name="home-orb-stabilizer-ring-2" rotation={[1.35,-0.22,0.58]}><torusGeometry args={[0.315,0.0042,10,112]} /><meshStandardMaterial color="#766c58" metalness={0.88} roughness={0.28} /></mesh><mesh name="home-orb-stabilizer-ring-3" rotation={[0.82,1.06,-0.4]}><torusGeometry args={[0.285,0.004,10,112]} /><meshStandardMaterial color="#4d6162" metalness={0.9} roughness={0.27} /></mesh><group name="home-orb-crystalline-fragments">{ORB_FRAGMENT_LAYOUT.map(([position,rotation,scale],index)=><mesh key={index} position={position as [number,number,number]} rotation={rotation as [number,number,number]} scale={scale}><tetrahedronGeometry args={[1,0]} /><meshPhysicalMaterial color={index%2===0?'#738685':'#7d7769'} emissive={stateColor} emissiveIntensity={0.018} roughness={0.34} metalness={0.42} /></mesh>)}</group><mesh name="home-orb-state-light" position={[0,-0.035,0.255]}><sphereGeometry args={[0.018,20,20]} /><meshStandardMaterial color="#eef5f2" emissive={stateColor} emissiveIntensity={intensity*1.4} /></mesh><pointLight color={stateColor} intensity={intensity*0.2} distance={2.6} decay={2} /></group>
}

function HumanPresence({root}:{root:MutableRefObject<THREE.Group|null>}){const human=useGLTF(HUMAN);const model=useMemo(()=>cloneModel(human.scene),[human.scene]);return <group ref={root} name="home-authored-embodied-self" position={SPAWN} rotation={[0,Math.PI,0]} userData={{presentation:'privacy-preserving-first-person-presence'}}><primitive object={model} visible={false} scale={0.72} /></group>}
function PortalGlass({tone}:{tone:'ground'|'life-map'}){const color=tone==='ground'?'#4f6f6c':'#5b5f82';return <mesh position={[0,1.34,-0.74]}><planeGeometry args={[1.34,2.2]} /><meshPhysicalMaterial color="#050b0a" emissive={color} emissiveIntensity={0.004} transparent opacity={0.2} transmission={0.02} roughness={0.56} metalness={0.1} clearcoat={0.16} clearcoatRoughness={0.42} side={THREE.DoubleSide} depthWrite /></mesh>}
function ThresholdAlcove({tone,onActivate,authoredPortal=false}:{tone:'ground'|'life-map';onActivate:()=>void;authoredPortal?:boolean}){
  const portal=useGLTF(PORTAL_MODEL); const model=useMemo(()=>clonePortalModel(portal.scene),[portal.scene]); const pack=useStonePack(0.95,1.35); const accent=tone==='ground'?'#4e6865':'#555978'
  return <group userData={{treatment:'recessed-architectural-threshold-v24',destination:tone}}>
    <ArchitecturalStone pack={pack} position={[0,1.52,0.24]} size={[3.42,3.05,0.58]} color="#0a100f" roughness={0.76} />
    <mesh position={[0,1.44,-0.08]} receiveShadow><boxGeometry args={[1.62,2.28,0.08]} /><meshStandardMaterial color="#040908" roughness={0.92} metalness={0.02} /></mesh>
    <ArchitecturalStone pack={pack} position={[-0.99,1.46,-0.05]} size={[0.22,2.55,0.42]} color="#111817" roughness={0.68} />
    <ArchitecturalStone pack={pack} position={[0.99,1.46,-0.05]} size={[0.22,2.55,0.42]} color="#111817" roughness={0.68} />
    <ArchitecturalStone pack={pack} position={[0,2.68,-0.05]} size={[2.18,0.22,0.42]} color="#101716" roughness={0.68} />
    <MetalTrim position={[0,2.49,-0.29]} size={[1.54,0.012,0.025]} color={accent} emissive={accent} intensity={0.008} />
    <PortalGlass tone={tone} />
    {authoredPortal?<group position={[0,1.34,-0.31]} scale={0.065}><primitive object={model} /></group>:null}
    <mesh position={[0,1.45,0.04]} onClick={(event)=>{event.stopPropagation();onActivate()}}><boxGeometry args={[2.5,3.0,1.4]} /><meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} /></mesh>
  </group>
}

function Thresholds({onGround,onLifeMap}:{onGround:()=>void;onLifeMap:()=>void}){return <><group name="home-ground-environmental-threshold" position={GROUND} rotation={[0,0.08,0]}><ThresholdAlcove tone="ground" onActivate={onGround} /></group><group name="home-life-map-sky-lookout"><group name="home-life-map-physical-portal" position={LIFE_MAP} rotation={[0,-0.08,0]} userData={{runtimeAsset:PORTAL_MODEL,treatment:'authored-portal-integrated-architecture-v19'}}><ThresholdAlcove tone="life-map" onActivate={onLifeMap} authoredPortal /></group></group></>}
function PhysicalEnvironment(){return <Environment files={HOME_HDR} background={false} environmentIntensity={0.74} />}

function PlayerRig({input,yaw,pitch,target,avatar,onNearby,transition,reducedMotion,onTransitionComplete,onTransitionSequence}:{input:MovementInput;yaw:MutableRefObject<number>;pitch:MutableRefObject<number>;target:MutableRefObject<THREE.Vector3|null>;avatar:MutableRefObject<THREE.Group|null>;onNearby:(value:Nearby)=>void;transition:'none'|'ground'|'life-map';reducedMotion:boolean;onTransitionComplete:()=>void;onTransitionSequence:(value:TransitionSequence)=>void}){
  const {camera,size}=useThree();const pos=useRef(SPAWN.clone()),velocity=useRef(new THREE.Vector3()),started=useRef<number|null>(null),issued=useRef(false),last=useRef<Nearby>(null),lastSequence=useRef<TransitionSequence>('idle')
  useLayoutEffect(()=>{camera.near=0.1;camera.far=140;camera.updateProjectionMatrix();camera.position.set(0.58,1.64,6.86);camera.lookAt(0,1.38,-2.15)},[camera])
  useFrame(({clock},delta)=>{if(transition!=='none'){if(started.current===null)started.current=clock.elapsedTime;const duration=reducedMotion?0.45:transition==='life-map'?3.4:2.6;const t=THREE.MathUtils.smootherstep(THREE.MathUtils.clamp((clock.elapsedTime-started.current)/duration,0,1),0,1);const sequence:TransitionSequence=transition==='life-map'?(t<0.16?'life-map:opening':t<0.84?'life-map:traversal':'life-map:closing'):(t<0.16?'ground:opening':t<0.84?'ground:traversal':'ground:closing');if(sequence!==lastSequence.current){lastSequence.current=sequence;onTransitionSequence(sequence)}if(transition==='life-map'){camera.position.lerp(new THREE.Vector3(0,30,-30),1-Math.pow(0.002,delta));camera.lookAt(0,9+t*20,-18-t*20);useSceneStore.getState().setProgress(t)}else{camera.position.lerp(new THREE.Vector3(-5.2,-2,-13.35),1-Math.pow(0.002,delta));camera.lookAt(-5.2,-0.8,-14.6)}if(t>=1&&!issued.current){issued.current=true;onTransitionComplete()}return}started.current=null;issued.current=false;if(lastSequence.current!=='idle'){lastSequence.current='idle';onTransitionSequence('idle')}stepEmbodiedMotion({delta,input,yaw:yaw.current,position:pos.current,velocity:velocity.current,target,bounds:BOUNDS,speed:2.7,acceleration:8,deceleration:11});if(avatar.current){avatar.current.position.copy(pos.current);avatar.current.rotation.y=yaw.current+Math.PI}const portrait=size.height>size.width,backDistance=portrait?0.1:0.18,eyeHeight=portrait?1.5:1.6;const desired=pos.current.clone().add(new THREE.Vector3(Math.sin(yaw.current)*backDistance,eyeHeight,Math.cos(yaw.current)*backDistance));camera.position.lerp(desired,1-Math.pow(0.00065,delta));const look=pos.current.clone().add(new THREE.Vector3(-Math.sin(yaw.current)*9.2,1.25+pitch.current,-Math.cos(yaw.current)*9.2));camera.lookAt(look);const candidates:readonly [Nearby,THREE.Vector3,number][]=[['orb',ORB,2.5],['ground',GROUND,2.8],['life-map',LIFE_MAP,2.8]];let next:Nearby=null,best=Infinity;for(const [name,p,r] of candidates){const d=Math.hypot(pos.current.x-p.x,pos.current.z-p.z);if(d<r&&d<best){next=name;best=d}}if(next!==last.current){last.current=next;onNearby(next)}});return null
}
function SceneReady({onReady}:{onReady:()=>void}){const {scene}=useThree();const done=useRef(false);useEffect(()=>{let timer:number|undefined;const check=()=>{if(done.current)return;if(SANCTUARY_REQUIRED_OBJECTS.every((name)=>scene.getObjectByName(name))){done.current=true;onReady();return}timer=window.setTimeout(check,60)};check();return()=>{if(timer!==undefined)window.clearTimeout(timer)}},[onReady,scene]);return null}
function SacredFinalScene(props:{input:MovementInput;yaw:MutableRefObject<number>;pitch:MutableRefObject<number>;target:MutableRefObject<THREE.Vector3|null>;avatar:MutableRefObject<THREE.Group|null>;nearby:(value:Nearby)=>void;orbState:OrbState;reducedMotion:boolean;transition:'none'|'ground'|'life-map';onOrb:()=>void;onGround:()=>void;onLifeMap:()=>void;onTransitionComplete:()=>void;onTransitionSequence:(value:TransitionSequence)=>void;onReady:()=>void}){const cosmic=props.transition==='life-map';return <><color attach="background" args={[cosmic?'#01030a':'#050a0d']} /><fogExp2 attach="fog" args={[cosmic?'#060918':'#091112',cosmic?0.0022:0.0095]} />{!cosmic?<SkyDome />:null}{!cosmic?<Stars radius={95} depth={44} count={320} factor={1.55} saturation={0} fade speed={0} />:null}{cosmic?<Stars radius={190} depth={100} count={2800} factor={3} saturation={0.05} fade speed={props.reducedMotion?0:0.008} />:null}<PhysicalEnvironment /><ambientLight intensity={0.16} color="#bac5c3" /><hemisphereLight args={['#74898d','#060908',0.31]} /><directionalLight position={[-13,18,9]} intensity={1.02} color="#c8d9dc" castShadow shadow-mapSize-width={2048} shadow-mapSize-height={2048} shadow-bias={-0.00012} /><directionalLight position={[10,6,-12]} intensity={0.14} color="#55717a" /><spotLight position={[0,7.5,4]} intensity={0.27} color="#e2dfd5" distance={24} angle={0.4} penumbra={0.96} decay={2} castShadow /><SanctuaryCourt target={props.target} /><FloorPanelJoints /><SanctuaryArchitecture /><SanctuaryCeiling /><PlantedEdges reducedMotion={props.reducedMotion} /><AtmosphericDepth /><OrbPlatform /><OrbCradle /><SacredOrb state={props.orbState} reducedMotion={props.reducedMotion} onOpen={props.onOrb} /><HumanPresence root={props.avatar} /><Thresholds onGround={props.onGround} onLifeMap={props.onLifeMap} /><ContactShadows position={[0,0.035,-2.15]} opacity={0.42} scale={8} blur={2.5} far={5} resolution={256} frames={1} color="#020403" /><PlayerRig input={props.input} yaw={props.yaw} pitch={props.pitch} target={props.target} avatar={props.avatar} onNearby={props.nearby} transition={props.transition} reducedMotion={props.reducedMotion} onTransitionComplete={props.onTransitionComplete} onTransitionSequence={props.onTransitionSequence} /><SceneReady onReady={props.onReady} /></>}

export function HomeWorldProductionFinal({onOrbOpen=requestUraiWorldOrbOpen,webglAvailable=true}:Props){
  const [canvasReady,setCanvasReady]=useState(false),[sceneReady,setSceneReady]=useState(false),[nearby,setNearby]=useState<Nearby>(null),[dragging,setDragging]=useState(false),[reducedMotion,setReducedMotion]=useState(false),[mobile,setMobile]=useState(false),[orbState,setOrbState]=useState<OrbState>('idle'),[transition,setTransition]=useState<'none'|'ground'|'life-map'>('none'),[portalSequence,setPortalSequence]=useState<TransitionSequence>('idle');const yaw=useRef(DEFAULT_YAW),pitch=useRef(-0.045),target=useRef<THREE.Vector3|null>(null),avatar=useRef<THREE.Group|null>(null),markSceneReady=useCallback(()=>setSceneReady(true),[])
  const openOrb=useCallback(()=>{if(!useSceneStore.getState().inputLocked&&transition==='none'){setOrbState('attention');onOrbOpen()}},[onOrbOpen,transition]);const ground=useCallback(()=>{if(transition!=='none')return;target.current=null;setOrbState('transition');setPortalSequence('ground:opening');setTransition('ground')},[transition]);const lifeMap=useCallback(()=>{if(transition!=='none')return;target.current=null;setOrbState('transition');setPortalSequence('life-map:opening');setTransition('life-map');useSceneStore.getState().enterLifeMap()},[transition]);const interact=useCallback(()=>{if(nearby==='orb')openOrb();else if(nearby==='ground')ground();else if(nearby==='life-map')lifeMap()},[nearby,openOrb,ground,lifeMap]);const input=useMovementInput({enabled:transition==='none',onInteract:interact,onReset:()=>{target.current=SPAWN.clone();yaw.current=DEFAULT_YAW;pitch.current=-0.045}});const look=useDragLook({yaw,pitch,enabled:transition==='none',sensitivity:0.003,minPitch:-0.48,maxPitch:0.52,onDragState:setDragging})
  useEffect(()=>{const rm=window.matchMedia('(prefers-reduced-motion: reduce)'),mobileQuery=window.matchMedia('(pointer: coarse), (max-width: 700px)');const apply=()=>{setReducedMotion(rm.matches);setMobile(mobileQuery.matches)};apply();rm.addEventListener?.('change',apply);mobileQuery.addEventListener?.('change',apply);return()=>{rm.removeEventListener?.('change',apply);mobileQuery.removeEventListener?.('change',apply)}},[])
  useEffect(()=>{const listener=(event:CustomEvent<OrbStateEventDetail>)=>{if(transition==='none')setOrbState(event.detail.state)};window.addEventListener(URAI_ORB_STATE_EVENT,listener);return()=>window.removeEventListener(URAI_ORB_STATE_EVENT,listener)},[transition])
  useEffect(()=>{const cancel=(event:KeyboardEvent)=>{if(event.key!=='Escape'||transition==='none')return;event.preventDefault();setTransition('none');setPortalSequence('idle');setOrbState('idle');const store=useSceneStore.getState();store.setPhase('HOME');store.unlock()};window.addEventListener('keydown',cancel,true);return()=>window.removeEventListener('keydown',cancel,true)},[transition])
  if(!webglAvailable)return null;const ready=canvasReady&&sceneReady;const context=transition==='life-map'?'Ascending into your Life Map':transition==='ground'?'Descending into Ground':nearby==='orb'?'The Orb is here':nearby==='ground'?'The path descends':nearby==='life-map'?'The threshold opens to your Life Map':null;const complete=()=>{if(transition==='ground')requestUraiWorldTravel({destination:'infrastructure-hub',href:'/ground/',entryPortal:'home-ground',cameraCheckpoint:'home-ground-descent'});else if(transition==='life-map')requestUraiWorldTravel({destination:'life-map',href:'/life-map/?from=home-sky',entryPortal:'home-sky',cameraCheckpoint:'home-sky-ascent-complete'})}
  return <main className={`${styles.world} urai-asset-home-world`} data-urai-home-production data-urai-true-3d="true" data-home-primary-owner="asset-driven" data-home-visible-world="moonlit-sacred-tech-sanctuary" data-home-world-character="premium-cinematic-sacred-tech" data-home-physical-base="built-obsidian-glass-stone-sanctuary" data-home-visual-ownership="three-dimensional-geometry" data-home-desktop-mobile-world="same-scene" data-home-embodied-self="makehuman-v4" data-home-presence-presentation="privacy-preserving-first-person" data-home-movement="walk-keyboard-click-touch" data-home-audio="production-opus-consent-controlled" data-home-visual-grade="cinematic-pbr-v24-architectural-relic-sanctuary" data-home-final-art-revision="v24-coherent-architectural-machine-correction" data-home-scanned-composition={HOME_SCANNED_COMPOSITION_V1} data-home-pbr-environment="local-cc0-hdri-studio-small-08" data-home-assets-ready={ready?'true':'false'} data-home-runtime-assets="home-entry-chamber-v1.glb home-human-makehuman-v4.glb urai-orb-avatar-v1.glb portal-ring-master-v1.glb built-sacred-tech-sanctuary-v19" data-home-scenery-assets="polyhaven-fern-02-geometry-v1.glb polyhaven-rock-tile-floor-pbr-v2-optimized studio-small-08-hdri-v1 architectural-depth-v24-volumetric-only-no-card" data-home-authored-regions="home-authored-terrain home-mountain-horizon home-living-vegetation home-sanctuary-pavilion home-life-map-physical-portal" data-home-nearby={nearby??'none'} data-home-camera-mode={transition!=='none'?transition:dragging?'look':'embodied-third-person'} data-home-scene-phase={transition==='none'?'HOME':transition.toUpperCase()} data-home-portal-sequence={portalSequence} data-home-portal-lifecycle="environmental-approach-traversal-arrival" data-home-animation-owner="built-physical-sanctuary-v20-plus-cc0-fern-plus-authored-living-orb" data-home-input-locked={transition!=='none'?'true':'false'} data-home-orb-state={orbState} data-home-orb-clip={resolveOrbSensoryOutput(orbState,reducedMotion,true).animation} data-home-orb-model-clip={reducedMotion?'stopped-reduced-motion':ORB_CLIPS[orbState]} data-testid="home-visible-navigable-sanctuary-world" style={{position:'relative',overflow:'hidden',background:'#050a0d'}} {...look}><Canvas className={styles.canvas} dpr={[1,1.5]} shadows camera={{position:[0.58,1.64,6.86],fov:43,near:0.1,far:140}} gl={{antialias:true,alpha:false,powerPreference:'high-performance'}} onCreated={({gl})=>{gl.outputColorSpace=THREE.SRGBColorSpace;gl.toneMapping=THREE.ACESFilmicToneMapping;gl.toneMappingExposure=1.22;gl.shadowMap.type=THREE.PCFSoftShadowMap;setCanvasReady(true)}}><SacredFinalScene input={input} yaw={yaw} pitch={pitch} target={target} avatar={avatar} nearby={setNearby} orbState={orbState} reducedMotion={reducedMotion} transition={transition} onOrb={openOrb} onGround={ground} onLifeMap={lifeMap} onTransitionComplete={complete} onTransitionSequence={setPortalSequence} onReady={markSceneReady} /></Canvas>{context?<div className={`${styles.worldHint} home-world-context`} role="status" aria-live="polite">{context}</div>:null}{transition==='none'&&mobile?<MobileMovementPad input={input} label="Home movement controls" />:null}<span className="sr-only" data-testid="urai-home-webgl-orb">The sacred-tech Orb companion is physically present in the Home sanctuary and consumes the final authored Orb GLB.</span><span className="sr-only" data-testid="urai-home-embodied-avatar">Your embodied Home presence uses the real skinned V4 human candidate.</span></main>
}

useGLTF.preload(SANCTUARY)
useGLTF.preload(ORB_MODEL)
useGLTF.preload(PORTAL_MODEL)
useGLTF.preload(HUMAN)
useGLTF.preload(FERN_MODEL)
useTexture.preload([ROCK_DIFFUSE, ROCK_NORMAL, ROCK_ARM, ROCK_DISPLACEMENT])
