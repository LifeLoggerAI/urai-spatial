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
      texture.repeat.set(4.8,5.6); texture.colorSpace = color ? THREE.SRGBColorSpace : THREE.NoColorSpace; texture.anisotropy = 6; texture.needsUpdate = true
      return texture
    }
    return { color: prepare(colorSource,true), normal: prepare(normalSource), arm: prepare(armSource) }
  }, [armSource,colorSource,normalSource])
}

function SculptedCanyonGround({ onWalk }: { onWalk: (event: ThreeEvent<MouseEvent>) => void }) {
  const stone = useSanctuaryStone()
  const geometry = useMemo(() => {
    const xSegments = 96
    const zSegments = 128
    const positions: number[] = []; const colors: number[] = []; const indices: number[] = []
    const shadow = new THREE.Color('#071d1d'); const moss = new THREE.Color('#9fb49d'); const warmStrata = new THREE.Color('#d2a66d')
    const groundTint = new THREE.Color('#2f8156'); const lifeTint = new THREE.Color('#7056a4')
    for (let zi=0; zi<=zSegments; zi += 1) {
      const tz = zi/zSegments; const z = 6.75 - tz*24.10
      for (let xi=0; xi<=xSegments; xi += 1) {
        const tx = xi/xSegments; const x = -8.40 + tx*16.80; const lateral = Math.abs(x)/8.40
        const walkingChannel = Math.exp(-Math.pow(x/3.00,4))
        const groundWeight = Math.exp(-(Math.pow((x+4.92)/2.35,2)+Math.pow((z+9.72)/3.35,2)))
        const lifeWeight = Math.exp(-(Math.pow((x-4.92)/2.30,2)+Math.pow((z+9.80)/3.25,2)))
        const destinationCarve = groundWeight*1.10 + lifeWeight*1.02
        const destinationShoulder = groundWeight*(1-groundWeight)*1.65 + lifeWeight*(1-lifeWeight)*1.55
        const portNearRidge = Math.exp(-(Math.pow((x+5.75)/2.10,2)+Math.pow((z+3.20)/4.25,2)))*1.05
        const starboardNearRidge = Math.exp(-(Math.pow((x-6.10)/1.95,2)+Math.pow((z+5.20)/3.90,2)))*1.18
        const portMidRidge = Math.exp(-(Math.pow((x+4.35)/2.35,2)+Math.pow((z+11.60)/3.05,2)))*1.42
        const starboardMidRidge = Math.exp(-(Math.pow((x-3.45)/2.55,2)+Math.pow((z+12.90)/2.90,2)))*1.30
        const asymmetricRidges = portNearRidge + starboardNearRidge + portMidRidge + starboardMidRidge
        const sideRise = Math.pow(lateral,2.05)*(0.48+tz*0.82)*(1.72+Math.sin(z*0.29+x*0.13)*0.34)
        const fracture = (Math.sin(x*1.34+z*0.73)*0.24 + Math.cos(x*0.71-z*1.17)*0.18 + Math.sin((x-z)*0.41)*0.12)*(0.25+lateral*0.75)
        const floorRelief = (Math.sin(x*1.92+z*1.05)*0.12 + Math.cos(x*0.96-z*1.63)*0.09 + Math.sin(x*2.75-z*0.38)*0.055)*(0.42+0.58*tz)
        const nearRelief = (Math.sin(x*2.35+z*1.42)*0.11 + Math.cos(x*1.45-z*2.05)*0.075)*(1-tz)*0.95
        const basinLayer = Math.sin(tz*Math.PI*7.2+x*0.17)*0.25*Math.pow(tz,1.04)*(1-walkingChannel*0.38)
        const descent = tz*0.10
        const centralNotch = Math.exp(-Math.pow(x/2.30,2))*0.58
        const farBasinLift = Math.pow(tz,2.72)*(5.05 + Math.sin(x*0.36+0.72)*1.02 + Math.sin(x*0.91-1.15)*0.48 - centralNotch)
        const macroHeight = -0.42 + descent + farBasinLift + sideRise + asymmetricRidges + destinationShoulder - destinationCarve + fracture*(1-walkingChannel*0.84) + floorRelief + nearRelief + basinLayer
        const ridgeMask = THREE.MathUtils.clamp((tz-0.28)*0.64 + lateral*0.38 + asymmetricRidges*0.16,0,0.46)
        const terraceHeight = 0.32
        const selectiveTerraceHeight = terraceHeight*0.75
        const terracedHeight = Math.floor((macroHeight+0.18)/selectiveTerraceHeight)*selectiveTerraceHeight - 0.18
        const erosionRills = (Math.abs(Math.sin(x*1.63+z*0.93))*0.13 + Math.abs(Math.cos(x*0.77-z*1.51))*0.08 - 0.10)*ridgeMask
        const y = THREE.MathUtils.lerp(macroHeight,terracedHeight,ridgeMask) + erosionRills
        positions.push(x,y,z)
        const band = 0.5 + 0.5*Math.sin(y*8.2 + z*0.24 + x*0.17)
        const shade = THREE.MathUtils.clamp(0.18+y*0.13+(1-tz)*0.14+Math.abs(fracture)*0.72+asymmetricRidges*0.11,0,1)
        const c = shadow.clone().lerp(moss,shade)
        c.lerp(warmStrata,band*ridgeMask*0.34)
        c.lerp(groundTint,groundWeight*0.66); c.lerp(lifeTint,lifeWeight*0.62)
        colors.push(c.r,c.g,c.b)
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
  return <mesh name="home-v125-sculpted-canyon-ground" geometry={geometry} position={[0,0.035,0]} receiveShadow onClick={onWalk} userData={{ v175Refinement: 'terraced-erosion-canyon-visible-strata-raised-far-rim-detailed-foreground-no-smooth-bowl', v176Refinement: 'weathered-basin-with-selective-strata-readable-foreground-and-clear-hero-silhouette' }}><meshPhysicalMaterial color="#8c9a87" map={stone.color} normalMap={stone.normal} normalScale={new THREE.Vector2(1.34,1.34)} roughnessMap={stone.arm} roughness={0.82} metalness={0.001} envMapIntensity={0.92} vertexColors /></mesh>
}

function MemoryConstellation({ reducedMotion }: { reducedMotion: boolean }) {
  const nodes=useMemo(()=>{const values:number[]=[];for(let index=0;index<560;index+=1){const t=((index*73)%563)/562,side=index%2===0?-1:1,arc=Math.sin(t*Math.PI);values.push(side*(0.36+4.55*t)+Math.sin(index*1.7)*0.20,0.72+arc*(2.9+Math.sin(index*.19)*.42)+Math.cos(index*.8)*.14,-10.8-t*2.7+Math.sin(index*.31)*.18)}const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(values,3));return geometry},[])
  const group=useRef<THREE.Group>(null)
  useFrame(({clock})=>{if(group.current&&!reducedMotion)group.current.rotation.y=Math.sin(clock.elapsedTime*.12)*.012})
  return <group ref={group} name="home-v177-recollection-currents" userData={{treatment:'memory-mote-currents-bind-destination-weather-to-living-orb-no-wireframe-no-rings-no-overlay'}}>
    <points geometry={nodes}><pointsMaterial color="#d8d0bb" size={0.052} transparent opacity={0.38} depthWrite={false} sizeAttenuation toneMapped={false} fog/></points>
  </group>
}

function MemoryWeather({ reducedMotion }: { reducedMotion: boolean }) {
  const geometry=useMemo(()=>{const positions:number[]=[];const colors:number[]=[];const warm=new THREE.Color('#efc98f'),green=new THREE.Color('#70d69d'),violet=new THREE.Color('#a99aea');const loci=[[-4.7,-8.8,green],[-2.7,-11.7,warm],[2.5,-12.2,warm],[4.8,-8.9,violet]] as const;for(let cluster=0;cluster<loci.length;cluster+=1){const [cx,cz,tint]=loci[cluster];for(let index=0;index<150;index+=1){const t=((index*47)%151)/150,angle=index*2.3999632297+cluster,radius=(1-t)*(.18+((index*31)%97)/250);positions.push(cx+Math.cos(angle)*radius,0.28+t*(2.2+cluster*.24)+Math.sin(index*.47)*.08,cz+Math.sin(angle)*radius);const c=tint.clone().lerp(warm,t*.22);colors.push(c.r,c.g,c.b)}}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));return g},[])
  const points=useRef<THREE.Points>(null);useFrame(({clock})=>{if(points.current&&!reducedMotion)points.current.position.y=Math.sin(clock.elapsedTime*.22)*.035})
  return <points ref={points} name="home-v177-emotional-memory-weather" geometry={geometry} userData={{treatment:'four-bounded-world-space-memory-updrafts-localize-ground-life-map-and-deep-basin'}}><pointsMaterial vertexColors size={0.052} transparent opacity={0.60} depthWrite={false} sizeAttenuation toneMapped={false} fog/></points>
}

function MemorySediment({ reducedMotion }: { reducedMotion: boolean }) {
  const geometry=useMemo(()=>{const positions:number[]=[];const colors:number[]=[];const amber=new THREE.Color('#d8ad75'),teal=new THREE.Color('#67bda6'),lilac=new THREE.Color('#9488c4');const deposits=[[-6.1,3.4,1.0,.48],[-3.9,1.0,.74,.34],[-1.5,3.0,1.25,.42],[1.2,2.1,.82,.32],[4.1,3.7,1.05,.44],[6.0,.4,.72,.30],[-5.2,-2.4,.80,.30],[-.4,-1.8,1.12,.36],[4.5,-2.8,.92,.34]] as const;for(let patch=0;patch<deposits.length;patch+=1){const [cx,cz,rx,rz]=deposits[patch];for(let index=0;index<54;index+=1){const radial=Math.sqrt((((index*37+patch*13)%59)+1)/60),angle=index*2.3999632297+patch*.73,x=cx+Math.cos(angle)*radial*rx+Math.sin(index*.61)*.05,z=cz+Math.sin(angle)*radial*rz+Math.cos(index*.47)*.04,y=-.035+Math.sin(x*1.7+z*.83)*.045+((index*11)%9)/330;positions.push(x,y,z);const base=patch%3===0?teal:patch%3===1?amber:lilac,c=base.clone().lerp(amber,radial*.12);colors.push(c.r,c.g,c.b)}}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));return g},[])
  const points=useRef<THREE.Points>(null);useFrame(({clock})=>{if(points.current&&!reducedMotion)(points.current.material as THREE.PointsMaterial).opacity=.27+Math.sin(clock.elapsedTime*.28)*.025})
  return <points ref={points} name="home-v179-embedded-memory-sediment" geometry={geometry} userData={{treatment:'nine-bounded-mineral-memory-deposits-scattered-through-near-ground-no-path-no-interface-glyphs'}}><pointsMaterial vertexColors size={0.030} transparent opacity={0.29} depthWrite={false} sizeAttenuation toneMapped={false} fog/></points>
}

function DistantMemoryRain({ reducedMotion }: { reducedMotion: boolean }) {
  const geometry=useMemo(()=>{const positions:number[]=[];for(let index=0;index<640;index+=1){const column=index%13,t=((index*43)%641)/640,x=-7.2+column*1.2+Math.sin(index*.7)*.18,y=.6+t*(3.4+(column%4)*.75),z=-13.8-((index*29)%100)/48;positions.push(x,y,z)}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));return g},[])
  const points=useRef<THREE.Points>(null);useFrame((_,delta)=>{if(points.current&&!reducedMotion)points.current.position.y=(points.current.position.y+delta*.028)%0.26})
  return <points ref={points} name="home-v178-distant-memory-rain" geometry={geometry} userData={{treatment:'distant-vertical-memory-weather-reveals-world-beyond-basin-rim'}}><pointsMaterial color="#b8d9cc" size={0.032} transparent opacity={0.26} depthWrite={false} sizeAttenuation toneMapped={false} fog/></points>
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
  const stone=useSanctuaryStone();const isGround=side==='ground';const x=isGround?-4.92:4.92;const color=isGround?'#69e6a3':'#b7a6ff'
  const outer=useMemo(()=>{const frame=fissureGeometry(false,!isGround);frame.holes.push(new THREE.Path(fissureGeometry(true,!isGround).getPoints(18).reverse()));const g=new THREE.ExtrudeGeometry(frame,{depth:0.10,bevelEnabled:true,bevelSize:0.016,bevelThickness:0.018,bevelSegments:2,curveSegments:4});g.computeVertexNormals();return g},[isGround])
  const field=useMemo(()=>new THREE.ShapeGeometry(fissureGeometry(true,!isGround),8),[isGround])
  const seamMotes=useMemo(()=>{const positions:number[]=[];for(let index=0;index<260;index+=1){const angle=index*2.3999632297+(isGround?0.25:0.95),radial=Math.sqrt((((index*53)%263)+1)/264),rx=1.38,rz=0.96;positions.push(Math.cos(angle)*radial*rx+(Math.sin(index*0.43)*0.10),0.035+(((index*17)%31)/30)*0.18,Math.sin(angle)*radial*rz+(Math.cos(index*0.31)*0.08))}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));return g},[isGround])
  const signalVeins=useMemo(()=>{const positions:number[]=[];for(let branch=0;branch<11;branch+=1){const angle=(branch/11)*Math.PI*2+(isGround?0.18:0.52),length=0.46+((branch*7)%5)*0.12;let px=Math.cos(angle)*0.16,pz=Math.sin(angle)*0.12;for(let step=0;step<4;step+=1){const t=(step+1)/4,nx=Math.cos(angle+(step%2===0?0.09:-0.07))*length*t,nz=Math.sin(angle+(step%2===0?0.09:-0.07))*length*t*0.72;positions.push(px,0.045,pz,nx,0.045,nz);px=nx;pz=nz}}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));return g},[isGround])
  return <group name={`home-v126-${side}-framed-fissure`} userData={{v165Refinement:'terrain-flush-readable-destination-cut-clear-camera-corridor-no-door-no-ring',v167Refinement:'destination-cut-owned-by-single-basin-no-overlap',v172Refinement:'recessed-basin-scar-raised-to-live-terrain-surface-local-color-language-no-gate',v174Refinement:'recessed-basin-scar-seated-in-live-terrain-amphitheater-local-color-language-no-gate',v175Refinement:'basin-wide-branching-signal-field-no-slab-no-door-no-ring'}} position={[x,isGround?0.93:0.89,isGround?-9.72:-9.80]} rotation={[0,isGround?0.10:-0.10,0]} scale={[1,1,1]}>
    <mesh name={`home-v151-${side}-retained-stone-provenance`} geometry={outer} castShadow receiveShadow visible={false}><meshPhysicalMaterial color={isGround?'#356949':'#514d76'} map={stone.color} normalMap={stone.normal} normalScale={new THREE.Vector2(0.62,0.62)} roughnessMap={stone.arm} roughness={0.80} metalness={0.001} envMapIntensity={0.96}/></mesh>
    <mesh name={`home-v153-${side}-retired-threshold-panel`} geometry={field} position={[0,0,0.025]} visible={false}><meshStandardMaterial color={isGround?'#07170f':'#100d19'} emissive={color} emissiveIntensity={0.46} roughness={1} side={THREE.DoubleSide}/></mesh>
    <points name={`home-v149-${side}-threshold-signal-field`} geometry={seamMotes}><pointsMaterial color={color} size={0.050} transparent opacity={0.78} depthWrite={false} sizeAttenuation toneMapped={false}/></points>
    <lineSegments name={`home-v175-${side}-terrain-signal-veins`} geometry={signalVeins}><lineBasicMaterial color={color} transparent opacity={0.68} toneMapped={false}/></lineSegments>
    <mesh name={`home-v133-${side}-authored-threshold-hit-target`} position={[0,0.62,0]} onClick={e=>{e.stopPropagation();onActivate()}}><boxGeometry args={[4.20,2.20,3.20]}/><meshBasicMaterial transparent opacity={0} colorWrite={false} depthWrite={false}/></mesh>
    <pointLight position={[0,0.60,0]} color={color} intensity={3.10} distance={8.8} decay={2}/>
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
  const orb=useMemo(()=>{const root=source.clone(true);root.traverse(object=>{const rejectedIdentity=object.name === 'orb-aura'||object.name.startsWith('orb-orbit-')||object.name.startsWith('orb-satellite-')||object.name.startsWith('orb-filament-');object.visible=false;if(rejectedIdentity)object.userData.uraiRetiredVisualRole='v133-no-aura-orbit-satellite-filament'});return normalizeAsset(root,2.42,palette.core,0.58)},[palette.core,source])
  const moteGeometry=useMemo(()=>{const positions:number[]=[];for(let index=0;index<1240;index+=1){const verticalSample=((((index*613)%1249)/1248)*2)-1;const angle=index*2.3999632297+Math.sin(index*0.31)*0.14;const radialSample=((index*431)%1259)/1258;const radius=0.045+Math.pow(radialSample,1.42)*0.67;const latitude=Math.sqrt(Math.max(0,1-verticalSample*verticalSample));const irregular=0.84+Math.sin(index*0.19)*0.13+Math.cos(index*0.073)*0.07;positions.push(Math.cos(angle)*latitude*radius*1.10*irregular,verticalSample*radius*0.68+Math.sin(index*0.11)*0.016,Math.sin(angle)*latitude*radius*0.94*irregular)}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));return g},[])
  const memoryVolume=useMemo(()=>{const geometry=new THREE.IcosahedronGeometry(0.72,3);const positions=geometry.getAttribute('position') as THREE.BufferAttribute;for(let index=0;index<positions.count;index+=1){const x=positions.getX(index),y=positions.getY(index),z=positions.getZ(index),latitude=y/0.72,shoulder=0.94+Math.sin(latitude*Math.PI*1.40)*0.08+Math.cos((x+z)*4.8)*0.035,taper=0.97-latitude*0.06;positions.setXYZ(index,x*shoulder*taper*0.88,y*1.02+0.035*Math.sin(x*4.8),z*shoulder*(0.78+0.05*latitude))}positions.needsUpdate=true;geometry.computeVertexNormals();return geometry},[])
  const heartGeometry=useMemo(()=>{const geometry=new THREE.IcosahedronGeometry(0.19,1);const positions=geometry.getAttribute('position') as THREE.BufferAttribute;for(let index=0;index<positions.count;index+=1){const x=positions.getX(index),y=positions.getY(index),z=positions.getZ(index),weathering=0.84+Math.sin(index*2.17)*0.13+Math.cos(index*.73)*0.06;positions.setXYZ(index,x*weathering*(1-y*.55),y*weathering*.94,z*weathering*.78)}positions.needsUpdate=true;geometry.computeVertexNormals();return geometry},[])
  useFrame(({clock})=>{if(!group.current||reducedMotion)return;const t=clock.getElapsedTime();group.current.position.y=ORB.y+Math.sin(t*(state==='speaking'?1.30:0.62))*0.020;group.current.rotation.y=Math.sin(t*0.14)*0.026})
  return <group ref={group} name="home-v126-apse-integrated-orb" position={[ORB.x,ORB.y,ORB.z]} scale={[1.50,1.50,1.50]} onClick={(event) => { event.stopPropagation(); onOrb() }} userData={{v165Refinement:'contained-memory-mote-heart-primary-presence-no-capsule-no-aura-no-pedestal',v167Refinement:'filled-irregular-memory-swarm-small-seed-no-shell-silhouette',v172Refinement:'larger-filled-memory-swarm-near-invisible-seed-open-air-beneath-no-aura-no-pedestal',v174Refinement:'wide-contained-memory-swarm-dense-living-heart-open-air-beneath-no-aura-no-pedestal',v175Refinement:'dense-horizontal-living-memory-cloud-with-compact-multi-depth-heart-no-fountain-no-ball'}}>
    <mesh name="home-v132-orb-memory-volume" geometry={memoryVolume} castShadow scale={[0.24,0.20,0.23]}><meshPhysicalMaterial color="#416f5c" emissive={palette.accent} emissiveIntensity={0.014} roughness={0.70} metalness={0.003} transmission={0.01} thickness={0.10} transparent opacity={0.004} depthWrite={false}/></mesh>
    <primitive object={orb} visible={false}/>
    <points name="home-v126-orb-memory-motes" geometry={moteGeometry} scale={[1.22,0.88,1.10]}><pointsMaterial color={palette.core} size={palette.moteSize*0.68} transparent opacity={0.54} depthWrite={false} sizeAttenuation toneMapped={false}/></points>
    <points name="home-v154-orb-memory-depth-motes" geometry={moteGeometry} scale={[1.42,0.98,1.28]}><pointsMaterial color={palette.accent} size={palette.moteSize*0.25} transparent opacity={0.16} depthWrite={false} sizeAttenuation toneMapped={false}/></points>
    <points name="home-v174-orb-memory-nucleus-motes" geometry={moteGeometry} scale={[0.48,0.38,0.44]}><pointsMaterial color={palette.core} size={palette.moteSize*0.42} transparent opacity={0.38} depthWrite={false} sizeAttenuation toneMapped={false}/></points>
    <points name="home-v175-orb-memory-heart-motes" geometry={moteGeometry} scale={[0.30,0.24,0.28]} visible={false}><pointsMaterial color={palette.accent} size={palette.moteSize*0.48} transparent opacity={0.58} depthWrite={false} sizeAttenuation toneMapped={false}/></points>
    <points name="home-v179-orb-memory-heart-motes" geometry={moteGeometry} scale={[0.22,0.18,0.20]}><pointsMaterial color={palette.accent} size={palette.moteSize*0.34} transparent opacity={0.34} depthWrite={false} sizeAttenuation toneMapped={false}/></points>
    <mesh name="home-v133-orb-memory-seed" geometry={memoryVolume} scale={[0.012,0.016,0.011]} visible={false}><meshPhysicalMaterial color="#426d5b" emissive={palette.accent} emissiveIntensity={0.012} roughness={0.62} metalness={0.001} clearcoat={0.01} transparent opacity={0.10}/></mesh>
    <mesh name="home-v181-orb-faceted-mineral-heart" geometry={heartGeometry} rotation={[0.18,-0.34,0.10]} scale={[1.06,1.18,0.92]} castShadow><meshStandardMaterial color="#5f9b83" emissive={palette.accent} emissiveIntensity={0.12} roughness={0.48} metalness={0.04} flatShading/></mesh>
    <mesh name="home-v126-orb-generous-hit-target"><sphereGeometry args={[1.50,16,12]}/><meshBasicMaterial transparent opacity={0} colorWrite={false} depthWrite={false}/></mesh>
    <pointLight color={palette.core} intensity={palette.intensity*0.58} distance={5.4} decay={2}/><pointLight position={[0.42,-0.08,0.46]} color={palette.accent} intensity={palette.intensity*0.18} distance={3.6} decay={2}/>
    <group name={`home-v126-orb-state-${state}`} userData={{ state, treatment: 'governed-petal-heart-no-aura-no-orbit-rings' }}/>
  </group>
}

function AtmosphericDepth({reducedMotion}:{reducedMotion:boolean}){const geometry=useMemo(()=>{const positions:number[]=[];for(let index=0;index<720;index+=1){const angle=index*2.3999632297,radius=5.0+((index*37)%250)/10,y=0.30+((index*29)%104)/11;positions.push(Math.cos(angle)*radius,y,Math.sin(angle)*radius-9.8)}const result=new THREE.BufferGeometry();result.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));return result},[]);const points=useRef<THREE.Points>(null);useFrame((_,delta)=>{if(points.current&&!reducedMotion)points.current.rotation.y+=delta*0.0014});return <points ref={points} name="home-v125-atmospheric-depth-motes" geometry={geometry} userData={{v167Refinement:'bounded-depth-motes-behind-single-canyon-owner',v172Refinement:'denser-sacred-atmosphere-depth-field-without-screen-overlay',v174Refinement:'world-space-depth-motes-between-asymmetric-ridge-layers-no-screen-overlay',v175Refinement:'denser-depth-field-reveals-terraced-canyon-scale-without-overlay'}}><pointsMaterial color="#e7dbc2" size={0.028} transparent opacity={0.18} depthWrite={false} fog/></points>}

export function HomeV76Sanctuary({reducedMotion,orbState,onOrb,onGround,onLifeMap,onWalk}:Props){
  return <group name="home-v126-ground-owned-open-sanctuary" userData={{activeArtRevision:'v181-mineral-seed-sanctuary',visualIteration:'v181-single-asymmetric-flat-faceted-mineral-heart',currentVisualRefinement:'v175-terraced-erosion-canyon-basin-signal-fields-dense-memory-heart-no-runway',v181PixelRepair:'replace-disconnected-pinwheel-shards-with-one-asymmetrically-weathered-flat-faceted-mineral-seed',v180PixelRepair:'replace-stacked-white-triangle-read-with-colored-low-emission-facet-cluster-and-reduce-competing-convergence-bloom',v179PixelRepair:'replace-dotted-foreground-paths-with-bounded-mineral-deposits-reduce-orb-bloom-and-consolidate-readable-heart',v176PixelRepair:'replace-muddy-terrace-field-with-selective-strata-raise-orb-heart-bind-destination-scars-with-memory-branches',v165PixelRepair:'remove-v164-jagged-connected-shelves-clear-camera-corridors-contain-orb-shell',v167PixelRepair:'remove-overlapping-ground-islands-raise-canyon-horizon-rebuild-orb-as-filled-swarm',v171PixelRepair:'raise-continuous-basin-rim-add-geologic-relief-strengthen-destination-light-minimize-orb-seed',v172PixelRepair:'carve-destination-basins-raise-live-scars-strengthen-strata-enlarge-swarm-reduce-dead-sky',v174PixelRepair:'break-symmetric-bowl-with-continuous-ridge-overlap-seat-destinations-compress-orb-fountain-into-wide-swarm',v175PixelRepair:'replace-smooth-dunes-with-terraced-erosion-geology-replace-destination-slabs-with-branching-basin-signals-raise-far-rim',compatibilityMarkers:LEGACY_CONTRACT_MARKERS,legacySourceAssets:LEGACY_SOURCE_ASSETS,historicalV76ContractOnly:true}}>
    <SculptedCanyonGround onWalk={onWalk}/><AuthoredSanctuaryEnvironment/><AuthoredThresholdEnvironment/><SanctuaryArchitecture/><SanctuaryTerraces/><GeologicalFrame/><FramedFissure side="ground" onActivate={onGround}/><FramedFissure side="life-map" onActivate={onLifeMap}/><ApseAndOrbCradle/><ArrivalSignalPath reducedMotion={reducedMotion}/><MemorySediment reducedMotion={reducedMotion}/><MemoryConstellation reducedMotion={reducedMotion}/><MemoryWeather reducedMotion={reducedMotion}/><DistantMemoryRain reducedMotion={reducedMotion}/><LivingOrb state={orbState} reducedMotion={reducedMotion} onOrb={onOrb}/><AtmosphericDepth reducedMotion={reducedMotion}/>
    <ambientLight intensity={0.46} color="#cbded8"/><hemisphereLight args={['#b9ddd5','#071815',0.78]}/><directionalLight position={[-5,9,4]} intensity={2.75} color="#f1c78d" castShadow/><directionalLight position={[6,6,-9]} intensity={0.78} color="#69c5b0"/><directionalLight position={[-7,4,-10]} intensity={0.58} color="#a28bd8"/><spotLight position={[0,8.4,-1.8]} target-position={[ORB.x,ORB.y,ORB.z]} angle={0.48} penumbra={0.84} intensity={2.35} color="#dcfff1" distance={24}/><pointLight position={[0,1.8,2.8]} intensity={0.46} color="#efc68f" distance={9} decay={2}/><pointLight position={[-4.9,1.55,-9.7]} intensity={2.85} color="#55e59a" distance={8.5} decay={2}/><pointLight position={[4.9,1.52,-9.8]} intensity={2.72} color="#a18cf2" distance={8.5} decay={2}/>
    <group name="home-authored-terrain" userData={{v175Refinement:'single-visible-terraced-erosion-canyon-authority-with-recessed-destination-amphitheaters'}}/><group name="home-sanctuary-pavilion" userData={{v175Refinement:'continuous-terraced-ridge-overlap-and-raised-far-rim-own-silhouette-no-detached-piles'}}/><group name="home-v49-scanned-detail-layer" userData={{v167Refinement:'edge-provenance-outside-primary-frustum-no-card-wall'}}/><group name="home-v49-authored-practicals" userData={{v175Refinement:'ground-green-life-map-violet-branching-basin-signal-fields-readable-without-gates'}}/><group name="home-authored-embodied-self" userData={{presentation:'privacy-preserving-first-person-presence-v126'}}/><group name="home-mountain-horizon" userData={{v175Refinement:'raised-asymmetric-terraced-far-rim-reduces-mobile-dead-sky-without-repeated-mountain-family'}}/><group name="home-living-vegetation" userData={{treatment:'reserved-beyond-clear-navigation-channel-v126'}}/>
  </group>
}

useGLTF.preload(ROCK_FACE_A);useGLTF.preload(ROCK_FACE_B);useGLTF.preload(GOVERNED_HOME);useGLTF.preload(GOVERNED_ORB);useTexture.preload([ROCK_DIFFUSE,ROCK_NORMAL,ROCK_ARM])
