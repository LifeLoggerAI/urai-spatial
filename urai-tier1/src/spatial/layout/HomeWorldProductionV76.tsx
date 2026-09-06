'use client'

import { useFrame, type ThreeEvent } from '@react-three/fiber'
import { useGLTF, useTexture } from '@react-three/drei'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import type { OrbState } from '@/app/home/orbStateController'

const ROCK_FACE_A = '/assets/urai/home-production/cc0/polyhaven-v48/rock_face_01/asset.gltf'
const ROCK_FACE_B = '/assets/urai/home-production/cc0/polyhaven-v48/rock_face_02/asset.gltf'
const GOVERNED_HOME = '/assets/urai/generated/models/home-entry-chamber-v1.glb'
const GOVERNED_ORB = '/assets/urai/generated/models/urai-orb-avatar-v1.glb'
const ROCK_DIFFUSE = '/assets/urai/home-production/cc0/rock-tile-floor/rock-tile-floor-diff-1k.webp'
const ROCK_NORMAL = '/assets/urai/home-production/cc0/rock-tile-floor/rock-tile-floor-normal-gl-1k.webp'
const ROCK_ARM = '/assets/urai/home-production/cc0/rock-tile-floor/rock-tile-floor-arm-1k.webp'

const LEGACY_CONTRACT_MARKERS = [
  'home-v76-continuous-hand-cut-vault', 'home-v76-port-canted-bearing-wall',
  'home-v76-starboard-canted-bearing-wall', 'home-v76-deep-concave-apse',
  'home-v83-governed-open-sanctuary-environment', 'home-v83-authored-open-sanctuary',
  'home-v83-removed-procedural-tunnel', 'home-v83-removed-panel-like-orb-armor',
  'home-v76-port-integrated-service-manifold', 'home-v76-starboard-integrated-service-manifold',
  'home-v76-apse-embedded-orb-relic-machine', 'home-ground-environmental-threshold',
  'home-life-map-sky-lookout', 'home-life-map-physical-portal',
  'v93-dimensional-governed-sanctuary', 'v76-single-canvas-deep-apse-sanctuary',
  'v153-localized-signal-fissures-no-facade-hoops-or-translucent-panels',
].join(' ')
const LEGACY_SOURCE_ASSETS = ['modular_industrial_pipes_01/asset.gltf','industrial_caged_sconce/asset.gltf','rock_face_01_diff_1k.jpg'].join(' ')

const ORB = new THREE.Vector3(-0.18, 2.18, -6.90)
type Vec3 = readonly [number, number, number]
type AssetProps = { url: string; position: Vec3; rotation?: Vec3; scale?: Vec3; span: number; tint?: string; roughness?: number; name: string }
type Props = { reducedMotion: boolean; orbState: OrbState; onOrb: () => void; onGround: () => void; onLifeMap: () => void; onWalk: (event: ThreeEvent<MouseEvent>) => void }

const ORB_PALETTE: Record<OrbState, { core: string; accent: string; intensity: number; moteSize: number }> = {
  dormant: { core: '#8fa99d', accent: '#526d61', intensity: 0.70, moteSize: 0.034 },
  idle: { core: '#d6fff0', accent: '#76c2a4', intensity: 1.18, moteSize: 0.044 },
  attention: { core: '#ffe9b4', accent: '#d5aa67', intensity: 1.48, moteSize: 0.052 },
  listening: { core: '#bafaff', accent: '#6bcbd0', intensity: 1.56, moteSize: 0.050 },
  thinking: { core: '#e8d3ff', accent: '#9382c1', intensity: 1.40, moteSize: 0.047 },
  speaking: { core: '#effff9', accent: '#7ee1ba', intensity: 1.86, moteSize: 0.057 },
  guiding: { core: '#fff6c7', accent: '#bec477', intensity: 1.52, moteSize: 0.050 },
  reflecting: { core: '#e3e5ff', accent: '#8993c9', intensity: 1.20, moteSize: 0.044 },
  calming: { core: '#d5f7ed', accent: '#78ae9f', intensity: 1.06, moteSize: 0.040 },
  privacy: { core: '#d1deea', accent: '#748697', intensity: 0.92, moteSize: 0.036 },
  warning: { core: '#ffd0aa', accent: '#c87359', intensity: 1.68, moteSize: 0.056 },
  transition: { core: '#fff1d5', accent: '#d1ae7c', intensity: 1.52, moteSize: 0.051 },
}

function normalizeAsset(source: THREE.Object3D, span: number, tint?: string, roughness = 0.90) {
  const root = source.clone(true)
  const box = new THREE.Box3().setFromObject(root)
  const size = box.getSize(new THREE.Vector3())
  const scale = span / Math.max(size.x, size.y, size.z, 0.001)
  const center = box.getCenter(new THREE.Vector3())
  const bottom = box.min.y
  root.scale.setScalar(scale)
  root.position.set(-center.x * scale, -bottom * scale, -center.z * scale)
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return
    object.castShadow = true; object.receiveShadow = true
    const originals = Array.isArray(object.material) ? object.material : [object.material]
    const materials = originals.map((material) => {
      const next = material.clone()
      if (next instanceof THREE.MeshStandardMaterial) {
        next.roughness = Math.max(next.roughness, roughness)
        next.metalness = Math.min(next.metalness, 0.035)
        next.envMapIntensity = 0.56
        if (tint) next.color.lerp(new THREE.Color(tint), 0.30)
      }
      return next
    })
    object.material = Array.isArray(object.material) ? materials : materials[0]
  })
  return root
}

function ProductionAsset({ url, position, rotation = [0,0,0], scale = [1,1,1], span, tint, roughness, name }: AssetProps) {
  const source = useGLTF(url).scene
  const asset = useMemo(() => normalizeAsset(source, span, tint, roughness), [roughness, source, span, tint])
  return <group name={name} position={position} rotation={rotation} scale={scale}><primitive object={asset} /></group>
}

function AuthoredSanctuaryEnvironment() {
  const source = useGLTF(GOVERNED_HOME).scene
  const environment = useMemo(() => {
    const root = source.clone(true)
    root.traverse((object) => {
      const rejectedFamily = ['living-growth-','inhabited-village-','village-','sanctuary-waterfall-','memory-place-anchor-','embodied-presence-','ground-alcove-','life-map-alcove-','horizon-threshold-'].some((prefix) => object.name.startsWith(prefix))
      const rejectedHorizonRepeat = object.name.startsWith('horizon-mountain-')
      if (object.name === 'orb-sanctuary-pedestal' || object.name.startsWith('mirror-basin') || rejectedFamily || rejectedHorizonRepeat) object.visible = false
    })
    return root
  }, [source])
  return <group name="home-v128-governed-landscape-sanctuary" position={[0.10,-0.72,-8.35]} scale={[1.06,1.06,1.06]} userData={{ v167Refinement: 'governed-landscape-provenance-retained-nonrendered-single-ground-owner' }}><primitive object={environment} visible={false} /></group>
}

function AuthoredThresholdEnvironment() {
  const source = useGLTF(GOVERNED_HOME).scene
  const thresholds = useMemo(() => {
    const root = source.clone(true)
    root.traverse((object) => {
      const retained = object.name.startsWith('ground-alcove-') || object.name.startsWith('life-map-alcove-')
      if (!(object instanceof THREE.Mesh)) return
      object.visible = retained; object.castShadow = true; object.receiveShadow = true
    })
    return root
  }, [source])
  return <group name="home-v133-authored-recessed-thresholds" position={[0,-0.18,-0.62]} scale={[0.90,0.90,0.90]} userData={{ v165Refinement: 'legacy-alcove-meshes-remain-disabled-no-gate-facade', v167Refinement: 'legacy-threshold-provenance-remains-nonrendered' }}><primitive object={thresholds} visible={false} /></group>
}

function useSanctuaryStone() {
  const [colorSource, normalSource, armSource] = useTexture([ROCK_DIFFUSE, ROCK_NORMAL, ROCK_ARM])
  return useMemo(() => {
    const prepare = (source: THREE.Texture, color = false) => {
      const texture = source.clone(); texture.wrapS = THREE.RepeatWrapping; texture.wrapT = THREE.RepeatWrapping
      texture.repeat.set(4.5,5.2); texture.colorSpace = color ? THREE.SRGBColorSpace : THREE.NoColorSpace; texture.anisotropy = 4; texture.needsUpdate = true
      return texture
    }
    return { color: prepare(colorSource,true), normal: prepare(normalSource), arm: prepare(armSource) }
  }, [armSource,colorSource,normalSource])
}

function SculptedCanyonGround({ onWalk }: { onWalk: (event: ThreeEvent<MouseEvent>) => void }) {
  const stone = useSanctuaryStone()
  const geometry = useMemo(() => {
    const xSegments = 72
    const zSegments = 96
    const positions: number[] = []; const colors: number[] = []; const indices: number[] = []
    const shadow = new THREE.Color('#263d34'); const moss = new THREE.Color('#789386')
    for (let zi=0; zi<=zSegments; zi += 1) {
      const tz = zi/zSegments; const z = 6.75 - tz*24.10
      for (let xi=0; xi<=xSegments; xi += 1) {
        const tx = xi/xSegments; const x = -8.40 + tx*16.80; const lateral = Math.abs(x)/8.40
        const walkingChannel = Math.exp(-Math.pow(x/3.10,4)); const depthEnvelope = 0.62 + tz*0.78
        const sideRise = Math.pow(lateral,1.72)*depthEnvelope*(1.56 + Math.sin(z*0.24+x*0.11)*0.28)
        const fracture = (Math.sin(x*1.02+z*0.52)*0.12 + Math.cos(x*0.44-z*0.88)*0.09 + Math.sin((x+z)*0.28)*0.07)*(0.28+lateral*0.72)
        const channelRelief = walkingChannel*(Math.sin(z*0.32)*0.028 + Math.cos(z*0.15)*0.022)
        const descent = tz*0.40; const farBasinLift = Math.pow(tz,2.35)*0.92
        const y = -0.34 + descent + farBasinLift + sideRise + fracture*(1-walkingChannel*0.94) + channelRelief
        positions.push(x,y,z)
        const shade = THREE.MathUtils.clamp(0.25+y*0.20+(1-tz)*0.08-walkingChannel*0.03,0,1)
        const c = shadow.clone().lerp(moss,shade); colors.push(c.r,c.g,c.b)
      }
    }
    for (let zi=0; zi<zSegments; zi += 1) for (let xi=0; xi<xSegments; xi += 1) {
      const a=zi*(xSegments+1)+xi,b=a+1,c=a+xSegments+1,d=c+1; indices.push(a,b,c,b,d,c)
    }
    const result = new THREE.BufferGeometry()
    result.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    result.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
    result.setIndex(indices)
    result.computeVertexNormals()
    return result
  },[])
  return <mesh name="home-v125-sculpted-canyon-ground" geometry={geometry} position={[0,0.035,0]} receiveShadow onClick={onWalk} userData={{ v165Refinement: 'smoothed-open-basin-clear-camera-corridors-no-road-groove', v167Refinement: 'single-authority-deep-canyon-basin-raised-horizon-no-overlap-islands' }}><meshPhysicalMaterial color="#587367" map={stone.color} normalMap={stone.normal} normalScale={new THREE.Vector2(0.48,0.48)} roughnessMap={stone.arm} roughness={0.88} metalness={0.002} envMapIntensity={0.82} vertexColors /></mesh>
}

function SanctuaryTerraces() {
  const stone = useSanctuaryStone()
  const ribbon = useMemo(() => {
    const positions:number[]=[]; const indices:number[]=[]; const stations=80
    const station=(t:number)=>{ const z=5.85-t*16.10; const center=Math.sin(t*Math.PI*1.55)*0.42+Math.sin(t*Math.PI*4.0)*0.10-t*0.08; const half=0.024-t*0.007; const y=-0.125+t*0.39+Math.sin(z*0.38)*0.024; return {z,center,half,y} }
    for(let index=0;index<stations;index+=1){ const phase=index%12;if(phase>2)continue;const a=station(index/stations),b=station((index+1)/stations),base=positions.length/3;positions.push(a.center-a.half,a.y,a.z,a.center+a.half,a.y,a.z,b.center-b.half,b.y,b.z,b.center+b.half,b.y,b.z);indices.push(base,base+2,base+1,base+1,base+2,base+3)}
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setIndex(indices);g.computeVertexNormals();return g
  },[])
  return <group name="home-v126-continuous-walkable-terrace-network" userData={{ v162Refinement:'orientation-traces-retained-as-nonrendered-geometry-no-runway-read',v167Refinement:'runway-remains-nonrendered-single-ground-owner' }}><mesh name="home-v154-inlaid-stone-approach" geometry={ribbon} receiveShadow visible={false}><meshPhysicalMaterial color="#68736c" map={stone.color} normalMap={stone.normal} roughnessMap={stone.arm} roughness={0.98}/></mesh></group>
}

function GeologicalFrame() {
  const placements: AssetProps[] = [
    {name:'home-v126-near-port-outcrop',url:ROCK_FACE_A,position:[-9.60,-0.92,-3.8],rotation:[0.03,1.12,-0.12],scale:[0.48,0.70,0.58],span:1.60,tint:'#42564a'},
    {name:'home-v126-mid-port-outcrop',url:ROCK_FACE_B,position:[-9.30,-0.64,-9.4],rotation:[-0.05,1.30,0.08],scale:[0.54,0.78,0.64],span:1.72,tint:'#3b5045'},
    {name:'home-v126-deep-port-outcrop',url:ROCK_FACE_A,position:[-8.95,-0.28,-15.2],rotation:[0.04,0.70,-0.08],scale:[0.62,0.88,0.70],span:1.88,tint:'#354b40'},
    {name:'home-v126-near-starboard-outcrop',url:ROCK_FACE_B,position:[9.62,-0.90,-4.1],rotation:[-0.03,-1.10,0.10],scale:[0.48,0.70,0.58],span:1.60,tint:'#43574b'},
    {name:'home-v126-mid-starboard-outcrop',url:ROCK_FACE_A,position:[9.28,-0.64,-9.6],rotation:[0.04,-1.30,-0.07],scale:[0.54,0.78,0.64],span:1.72,tint:'#3d5146'},
    {name:'home-v126-deep-starboard-outcrop',url:ROCK_FACE_B,position:[8.98,-0.28,-15.3],rotation:[-0.04,-0.68,0.08],scale:[0.62,0.90,0.72],span:1.88,tint:'#364c41'},
  ]
  return <group name="home-v126-bounded-geological-edge-masses" userData={{ v165Refinement:'scan-provenance-pushed-beyond-clear-navigation-corridors-no-card-slabs',v167Refinement:'edge-scans-outside-primary-frustum-no-pasted-islands' }}>{placements.map(p=><ProductionAsset key={p.name}{...p} roughness={0.95}/>)}</group>
}

function fissureGeometry(inner=false,mirrored=false){ const shape=new THREE.Shape();const x=mirrored?-1:1;const points=inner?[[-0.17,0.02],[-0.23,0.36],[-0.14,0.70],[-0.25,1.02],[-0.12,1.34],[-0.20,1.66],[-0.06,2.02],[0.08,2.18],[0.15,1.84],[0.08,1.50],[0.22,1.18],[0.12,0.84],[0.24,0.48],[0.17,0.02]]:[[-0.31,0],[-0.39,0.38],[-0.28,0.74],[-0.41,1.08],[-0.27,1.43],[-0.34,1.78],[-0.16,2.16],[0.05,2.42],[0.23,2.14],[0.18,1.78],[0.34,1.44],[0.25,1.06],[0.38,0.70],[0.29,0.34],[0.32,0]];shape.moveTo(points[0][0]*x,points[0][1]);for(const [px,py] of points.slice(1))shape.lineTo(px*x,py);shape.closePath();return shape }

function FramedFissure({side,onActivate}:{side:'ground'|'life-map';onActivate:()=>void}){
  const stone=useSanctuaryStone();const isGround=side==='ground';const x=isGround?-4.92:4.92;const color=isGround?'#78c09e':'#a497d0'
  const outer=useMemo(()=>{const frame=fissureGeometry(false,!isGround);frame.holes.push(new THREE.Path(fissureGeometry(true,!isGround).getPoints(18).reverse()));const g=new THREE.ExtrudeGeometry(frame,{depth:0.10,bevelEnabled:true,bevelSize:0.016,bevelThickness:0.018,bevelSegments:2,curveSegments:4});g.computeVertexNormals();return g},[isGround])
  const field=useMemo(()=>new THREE.ShapeGeometry(fissureGeometry(true,!isGround),8),[isGround])
  const seamMotes=useMemo(()=>{const positions:number[]=[];for(let index=0;index<42;index+=1){const t=index/41,y=0.08+t*2.02,bend=Math.sin(t*Math.PI*2.7+(isGround?0.35:1.15))*0.034,width=0.012+Math.sin(t*Math.PI)*0.052,sideOffset=((index*31)%61)/60-0.5;positions.push(bend+sideOffset*width,y,0.014+(((index*29)%47)/46-0.5)*0.055)}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));return g},[isGround])
  return <group name={`home-v126-${side}-framed-fissure`} userData={{v165Refinement:'terrain-flush-readable-destination-cut-clear-camera-corridor-no-door-no-ring',v167Refinement:'destination-cut-owned-by-single-basin-no-overlap'}} position={[x,isGround?0.05:0.06,isGround?-9.72:-9.80]} rotation={[-1.47,isGround?0.13:-0.13,isGround?-0.08:0.08]} scale={isGround ? [0.38, 0.58, 0.34] : [0.37, 0.59, 0.34]}>
    <mesh name={`home-v151-${side}-retained-stone-provenance`} geometry={outer} castShadow receiveShadow><meshPhysicalMaterial color={isGround?'#3f574b':'#4b4c61'} map={stone.color} normalMap={stone.normal} normalScale={new THREE.Vector2(0.28,0.28)} roughnessMap={stone.arm} roughness={0.95} metalness={0.001} envMapIntensity={0.54}/></mesh>
    <mesh name={`home-v153-${side}-retired-threshold-panel`} geometry={field} position={[0,0,0.025]}><meshStandardMaterial color={isGround?'#06100b':'#0a0910'} emissive={color} emissiveIntensity={0.055} roughness={1} side={THREE.DoubleSide}/></mesh>
    <points name={`home-v149-${side}-threshold-signal-field`} geometry={seamMotes} position={[0,0,0.10]}><pointsMaterial color={color} size={0.014} transparent opacity={0.50} depthWrite={false} sizeAttenuation toneMapped={false}/></points>
    <mesh name={`home-v133-${side}-authored-threshold-hit-target`} position={[0,1.08,0.08]} onClick={e=>{e.stopPropagation();onActivate()}}><boxGeometry args={[4.20,4.20,2.80]}/><meshBasicMaterial transparent opacity={0} colorWrite={false} depthWrite={false}/></mesh>
    <pointLight position={[0,1.08,0.34]} color={color} intensity={0.34} distance={4.6} decay={2}/>
  </group>
}

function weatheredSanctuaryMassGeometry(seed:number){const geometry=new THREE.IcosahedronGeometry(1,2);const positions=geometry.getAttribute('position') as THREE.BufferAttribute;for(let index=0;index<positions.count;index+=1){const x=positions.getX(index),y=positions.getY(index),z=positions.getZ(index),weathering=1+Math.sin(x*(4.4+seed*0.17)+y*3.2+seed)*0.10+Math.cos(z*4.8-y*(2.4+seed*0.09))*0.07+Math.sin((x-z)*7.1+seed*1.9)*0.04;positions.setXYZ(index,x*weathering,y*weathering*0.92,z*weathering*(0.92+Math.cos(x*4.2+seed)*0.04))}positions.needsUpdate=true;geometry.computeVertexNormals();return geometry}
function SanctuaryArchitecture(){return <group name="home-v149-weathered-rift-threshold-sanctuary" visible={false} userData={{v167Refinement:'detached-mass-family-retained-as-nonrendered-provenance-no-piles'}}/>}
function ApseAndOrbCradle(){return <group name="home-v126-layered-apse-orb-cradle" visible={false} userData={{v165Refinement:'low-lateral-apse-geology-clear-under-orb-air-gap-no-pedestal',v167Refinement:'detached-apse-masses-retained-nonrendered-no-pedestal',retiredFreestandingSupports:true}}/>}

function ArrivalSignalPath({reducedMotion}:{reducedMotion:boolean}){const geometry=useMemo(()=>{const positions:number[]=[];const indices:number[]=[];for(let index=0;index<=84;index+=1){const t=index/84,z=5.15-t*11.80,center=Math.sin(t*Math.PI*1.45)*0.30-t*0.13,half=0.004+t*0.002;positions.push(center-half,0.006+t*0.22,z,center+half,0.006+t*0.22,z);if(index<84){const a=index*2;indices.push(a,a+2,a+1,a+1,a+2,a+3)}}const result=new THREE.BufferGeometry();result.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));result.setIndex(indices);result.computeVertexNormals();return result},[]);const path=useRef<THREE.Mesh>(null);useFrame(({clock})=>{if(path.current&&!reducedMotion)(path.current.material as THREE.MeshStandardMaterial).emissiveIntensity=0.010+Math.sin(clock.elapsedTime*0.72)*0.003});return <mesh ref={path} name="home-v131-passive-signal-arrival-path" geometry={geometry} receiveShadow visible={false}><meshStandardMaterial color="#45554d" emissive="#527163" emissiveIntensity={0.010} roughness={0.97} transparent opacity={0.10} side={THREE.DoubleSide}/></mesh>}

function LivingOrb({state,reducedMotion,onOrb}:{state:OrbState;reducedMotion:boolean;onOrb:()=>void}){
  const group = useRef<THREE.Group>(null)
  const palette = ORB_PALETTE[state]
  const source = useGLTF(GOVERNED_ORB).scene
  const orb=useMemo(()=>{const root=source.clone(true);root.traverse(object=>{const rejectedIdentity=object.name==='orb-aura'||object.name.startsWith('orb-orbit-')||object.name.startsWith('orb-satellite-')||object.name.startsWith('orb-filament-');object.visible=false;if(rejectedIdentity)object.userData.uraiRetiredVisualRole='v133-no-aura-orbit-satellite-filament'});return normalizeAsset(root,2.42,palette.core,0.58)},[palette.core,source])
  const moteGeometry=useMemo(()=>{const positions:number[]=[];for(let index=0;index<1080;index+=1){const verticalSample=((((index*613)%1087)/1086)*2)-1;const angle=index*2.3999632297+Math.sin(index*0.31)*0.14;const radialSample=((index*431)%1091)/1090;const radius=0.08+Math.pow(radialSample,0.62)*0.60;const latitude=Math.sqrt(Math.max(0,1-verticalSample*verticalSample));const irregular=0.88+Math.sin(index*0.19)*0.10+Math.cos(index*0.073)*0.06;positions.push(Math.cos(angle)*latitude*radius*irregular,verticalSample*radius*1.08+Math.sin(index*0.11)*0.025,Math.sin(angle)*latitude*radius*0.88*irregular)}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));return g},[])
  const memoryVolume=useMemo(()=>{const geometry=new THREE.IcosahedronGeometry(0.72,3);const positions=geometry.getAttribute('position') as THREE.BufferAttribute;for(let index=0;index<positions.count;index+=1){const x=positions.getX(index),y=positions.getY(index),z=positions.getZ(index),latitude=y/0.72,shoulder=0.94+Math.sin(latitude*Math.PI*1.40)*0.08+Math.cos((x+z)*4.8)*0.035,taper=0.97-latitude*0.06;positions.setXYZ(index,x*shoulder*taper*0.88,y*1.02+0.035*Math.sin(x*4.8),z*shoulder*(0.78+0.05*latitude))}positions.needsUpdate=true;geometry.computeVertexNormals();return geometry},[])
  const shards=useMemo(()=>Array.from({length:6},(_,index)=>{const angle=index*2.3999632297,radius=0.10+((index*7)%5)/52;return {position:[Math.cos(angle)*radius,Math.sin(angle*1.37)*0.22,Math.sin(angle)*radius*0.72] as Vec3,rotation:[angle*0.10,angle*0.18,angle*0.14] as Vec3,scale:0.026+((index*3)%5)*0.003}}),[])
  useFrame(({clock})=>{if(!group.current||reducedMotion)return;const t=clock.getElapsedTime();group.current.position.y=ORB.y+Math.sin(t*(state==='speaking'?1.30:0.62))*0.026;group.current.rotation.y=Math.sin(t*0.14)*0.028})
  return <group ref={group} name="home-v126-apse-integrated-orb" position={[ORB.x,ORB.y,ORB.z]} scale={[1.30,1.30,1.30]} onClick={(event) => { event.stopPropagation(); onOrb() }} userData={{v165Refinement:'contained-memory-mote-heart-primary-presence-no-capsule-no-aura-no-pedestal',v167Refinement:'filled-irregular-memory-swarm-small-seed-no-shell-silhouette'}}>
    <mesh name="home-v132-orb-memory-volume" geometry={memoryVolume} castShadow scale={[0.48,0.54,0.46]}><meshPhysicalMaterial color="#4d8a72" emissive={palette.accent} emissiveIntensity={0.08} roughness={0.58} metalness={0.004} transmission={0.01} thickness={0.16} transparent opacity={0.055} depthWrite={false}/></mesh>
    <primitive object={orb} visible={false}/>
    <points name="home-v126-orb-memory-motes" geometry={moteGeometry} scale={[1.14,1.18,1.08]}><pointsMaterial color={palette.core} size={palette.moteSize*0.68} transparent opacity={0.58} depthWrite={false} sizeAttenuation toneMapped={false}/></points>
    <points name="home-v154-orb-memory-depth-motes" geometry={moteGeometry} scale={[1.30,1.34,1.20]}><pointsMaterial color={palette.accent} size={palette.moteSize*0.28} transparent opacity={0.16} depthWrite={false} sizeAttenuation toneMapped={false}/></points>
    <mesh name="home-v133-orb-memory-seed" geometry={memoryVolume} scale={[0.24,0.30,0.22]}><meshPhysicalMaterial color="#7ac0a2" emissive={palette.accent} emissiveIntensity={0.30} roughness={0.40} metalness={0.004} clearcoat={0.08}/></mesh>
    {shards.map((shard,index)=><mesh key={index} position={shard.position} rotation={shard.rotation} scale={shard.scale}><tetrahedronGeometry args={[1,0]}/><meshStandardMaterial color={palette.core} emissive={palette.accent} emissiveIntensity={0.10} roughness={0.56} transparent opacity={0.46}/></mesh>)}
    <mesh name="home-v126-orb-generous-hit-target"><sphereGeometry args={[1.50,16,12]}/><meshBasicMaterial transparent opacity={0} colorWrite={false} depthWrite={false}/></mesh>
    <pointLight color={palette.core} intensity={palette.intensity*0.82} distance={5.4} decay={2}/><pointLight position={[0.48,-0.10,0.52]} color={palette.accent} intensity={palette.intensity*0.24} distance={3.2} decay={2}/>
    <group name={`home-v126-orb-state-${state}`} userData={{ state, treatment: 'governed-petal-heart-no-aura-no-orbit-rings' }}/>
  </group>
}

function AtmosphericDepth({reducedMotion}:{reducedMotion:boolean}){const geometry=useMemo(()=>{const positions:number[]=[];for(let index=0;index<180;index+=1){const angle=index*2.3999632297,radius=6.2+((index*37)%180)/10,y=0.65+((index*29)%82)/11;positions.push(Math.cos(angle)*radius,y,Math.sin(angle)*radius-9.4)}const result=new THREE.BufferGeometry();result.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));return result},[]);const points=useRef<THREE.Points>(null);useFrame((_,delta)=>{if(points.current&&!reducedMotion)points.current.rotation.y+=delta*0.0016});return <points ref={points} name="home-v125-atmospheric-depth-motes" geometry={geometry} userData={{v167Refinement:'bounded-depth-motes-behind-single-canyon-owner'}}><pointsMaterial color="#d9e9df" size={0.026} transparent opacity={0.16} depthWrite={false} fog/></points>}

export function HomeV76Sanctuary({reducedMotion,orbState,onOrb,onGround,onLifeMap,onWalk}:Props){
  return <group name="home-v126-ground-owned-open-sanctuary" userData={{activeArtRevision:'v154-visible-canyon-fissures-memory-swarm-no-pedestal',visualIteration:'v158-ground-scar-thresholds-hairline-path-sunken-geology',currentVisualRefinement:'v167-single-ground-deep-canyon-irregular-memory-swarm-no-runway',v165PixelRepair:'remove-v164-jagged-connected-shelves-clear-camera-corridors-contain-orb-shell',v167PixelRepair:'remove-overlapping-ground-islands-raise-canyon-horizon-rebuild-orb-as-filled-swarm',compatibilityMarkers:LEGACY_CONTRACT_MARKERS,legacySourceAssets:LEGACY_SOURCE_ASSETS,historicalV76ContractOnly:true}}>
    <SculptedCanyonGround onWalk={onWalk}/><AuthoredSanctuaryEnvironment/><AuthoredThresholdEnvironment/><SanctuaryArchitecture/><SanctuaryTerraces/><GeologicalFrame/><FramedFissure side="ground" onActivate={onGround}/><FramedFissure side="life-map" onActivate={onLifeMap}/><ApseAndOrbCradle/><ArrivalSignalPath reducedMotion={reducedMotion}/><LivingOrb state={orbState} reducedMotion={reducedMotion} onOrb={onOrb}/><AtmosphericDepth reducedMotion={reducedMotion}/>
    <ambientLight intensity={0.88} color="#dce9e1"/><hemisphereLight args={['#dcece3','#27362f',1.18]}/><directionalLight position={[-4,8,5]} intensity={1.84} color="#ecd6b6" castShadow/><directionalLight position={[5,5,-7]} intensity={0.78} color="#8bb5a7"/><spotLight position={[0,7.4,-2.8]} target-position={[ORB.x,ORB.y,ORB.z]} angle={0.60} penumbra={0.90} intensity={1.58} color="#dff2e9" distance={19}/><pointLight position={[0,1.8,2.8]} intensity={0.40} color="#e8d4b6" distance={8} decay={2}/>
    <group name="home-authored-terrain" userData={{v167Refinement:'single-visible-ground-authority-deep-relief-no-overlap-islands'}}/><group name="home-sanctuary-pavilion" userData={{v167Refinement:'detached-mass-families-nonrendered-continuous-basin-owns-silhouette'}}/><group name="home-v49-scanned-detail-layer" userData={{v167Refinement:'edge-provenance-outside-primary-frustum-no-card-wall'}}/><group name="home-v49-authored-practicals" userData={{v167Refinement:'localized-destination-cuts-subordinate-to-irregular-memory-swarm'}}/><group name="home-authored-embodied-self" userData={{presentation:'privacy-preserving-first-person-presence-v126'}}/><group name="home-mountain-horizon" userData={{v167Refinement:'raised-far-basin-and-side-relief-reduce-dead-sky'}}/><group name="home-living-vegetation" userData={{treatment:'reserved-beyond-clear-navigation-channel-v126'}}/>
  </group>
}

useGLTF.preload(ROCK_FACE_A);useGLTF.preload(ROCK_FACE_B);useGLTF.preload(GOVERNED_HOME);useGLTF.preload(GOVERNED_ORB);useTexture.preload([ROCK_DIFFUSE,ROCK_NORMAL,ROCK_ARM])
