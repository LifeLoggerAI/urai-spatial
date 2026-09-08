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
const AUTHORED_LANDSCAPE_V191 = '/assets/urai/home-production/authored-v191/home-continuous-landscape-v191.glb'
const AUTHORED_GROUND_V191 = '/assets/urai/home-production/authored-v191/home-ground-place-v191.glb'
const AUTHORED_LIFE_MAP_V191 = '/assets/urai/home-production/authored-v191/home-life-map-place-v191.glb'
const AUTHORED_ORB_V191 = '/assets/urai/home-production/authored-v191/urai-living-memory-heart-v191.glb'

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
      texture.repeat.set(12.5,15.5); texture.colorSpace = color ? THREE.SRGBColorSpace : THREE.NoColorSpace; texture.anisotropy = 6; texture.needsUpdate = true
      return texture
    }
    return { color: prepare(colorSource,true), normal: prepare(normalSource), arm: prepare(armSource) }
  }, [armSource,colorSource,normalSource])
}

function SculptedCanyonGround({ onWalk }: { onWalk: (event: ThreeEvent<MouseEvent>) => void }) {
  const authoredSource = useGLTF(AUTHORED_LANDSCAPE_V191).scene
  const authoredLandscape = useMemo(() => { const root=authoredSource.clone(true);root.traverse(object=>{if(object instanceof THREE.Mesh){object.receiveShadow=true;object.castShadow=false}});return root },[authoredSource])
  const geometry = useMemo(() => {
    const xSegments = 72
    const zSegments = 96
    const positions: number[] = []; const colors: number[] = []; const uvs: number[] = []; const indices: number[] = []
    const shadow = new THREE.Color('#052422'); const moss = new THREE.Color('#668f82'); const warmStrata = new THREE.Color('#9b7d60')
    const groundTint = new THREE.Color('#2f8d5c'); const lifeTint = new THREE.Color('#765eb1')
    for (let zi=0; zi<=zSegments; zi += 1) {
      const tz = zi/zSegments; const z = 6.75 - tz*24.10
      for (let xi=0; xi<=xSegments; xi += 1) {
        const tx = xi/xSegments; const x = -8.40 + tx*16.80; const lateral = Math.abs(x)/8.40
        const walkingChannel = Math.exp(-Math.pow(x/3.00,4))
        const groundWeight = Math.exp(-(Math.pow((x+4.92)/2.35,2)+Math.pow((z+9.72)/3.35,2)))
        const lifeWeight = Math.exp(-(Math.pow((x-4.92)/2.30,2)+Math.pow((z+9.80)/3.25,2)))
        const destinationCarve = groundWeight*1.10 + lifeWeight*1.02
        const destinationShoulder = groundWeight*(1-groundWeight)*1.52 + lifeWeight*(1-lifeWeight)*1.44
        const groundCameraBasin = Math.exp(-(Math.pow((x+4.45)/2.95,2)+Math.pow((z+7.95)/3.85,2)))
        const lifeCameraBasin = Math.exp(-(Math.pow((x-4.45)/2.95,2)+Math.pow((z+7.95)/3.85,2)))
        const cameraSafeCarve = groundCameraBasin*1.42 + lifeCameraBasin*1.50
        const portNearRidge = Math.exp(-(Math.pow((x+5.75)/2.10,2)+Math.pow((z+3.20)/4.25,2)))*0.96
        const starboardNearRidge = Math.exp(-(Math.pow((x-6.10)/1.95,2)+Math.pow((z+5.20)/3.90,2)))*1.06
        const portMidRidge = Math.exp(-(Math.pow((x+4.35)/2.35,2)+Math.pow((z+11.60)/3.05,2)))*1.22
        const starboardMidRidge = Math.exp(-(Math.pow((x-3.45)/2.55,2)+Math.pow((z+12.90)/2.90,2)))*1.16
        const asymmetricRidges = portNearRidge + starboardNearRidge + portMidRidge + starboardMidRidge
        const sideRise = Math.pow(lateral,2.08)*(0.46+tz*0.80)*(1.58+Math.sin(z*0.29+x*0.13)*0.30)
        const fracture = (Math.sin(x*1.34+z*0.73)*0.21 + Math.cos(x*0.71-z*1.17)*0.15 + Math.sin((x-z)*0.41)*0.10)*(0.25+lateral*0.75)
        const floorRelief = (Math.sin(x*1.92+z*1.05)*0.105 + Math.cos(x*0.96-z*1.63)*0.075 + Math.sin(x*2.75-z*0.38)*0.045)*(0.42+0.58*tz)
        const nearRelief = (Math.sin(x*2.35+z*1.42)*0.085 + Math.cos(x*1.45-z*2.05)*0.060)*(1-tz)*0.82
        const basinLayer = Math.sin(tz*Math.PI*6.3+x*0.17)*0.16*Math.pow(tz,1.04)*(1-walkingChannel*0.42)
        const descent = tz*0.08
        const centralNotch = Math.exp(-Math.pow(x/2.30,2))*0.42
        const farBasinLift = Math.pow(tz,2.82)*(4.78 + Math.sin(x*0.36+0.72)*0.82 + Math.sin(x*0.91-1.15)*0.34 - centralNotch)
        const macroHeight = -0.46 + descent + farBasinLift + sideRise + asymmetricRidges + destinationShoulder - destinationCarve - cameraSafeCarve + fracture*(1-walkingChannel*0.86) + floorRelief + nearRelief + basinLayer
        const ridgeMask = 0
        const terraceHeight = 0.14
        const terracedHeight = Math.floor((macroHeight+0.08)/terraceHeight)*terraceHeight - 0.08
        const erosionRills = (Math.abs(Math.sin(x*1.63+z*0.93))*0.065 + Math.abs(Math.cos(x*0.77-z*1.51))*0.040 - 0.048)*ridgeMask
        const chippedRelief=(Math.sin(x*5.7+z*3.1)*0.120+Math.cos(x*3.9-z*6.2)*0.085+Math.sin(x*8.3+z*1.9)*0.052)*(0.34+lateral*0.66)
        const y = macroHeight + erosionRills + chippedRelief
        const lateralWarp=(Math.sin(z*1.17+x*.43)*.034+Math.sin(z*3.7-x*1.2)*.018)*(0.22+lateral*.78)
        positions.push(x+lateralWarp,y,z+Math.cos(x*2.9+z*.67)*.018); uvs.push(tx,tz)
        const band = 0.5 + 0.5*Math.sin(y*7.1 + z*0.22 + x*0.15)
        const shade = THREE.MathUtils.clamp(0.24+y*0.12+(1-tz)*0.16+Math.abs(fracture)*0.76+asymmetricRidges*0.08,0,1)
        const c = shadow.clone().lerp(moss,shade)
        c.lerp(warmStrata,band*(0.10+ridgeMask*0.55))
        c.lerp(groundTint,groundWeight*0.70); c.lerp(lifeTint,lifeWeight*0.66)
        colors.push(c.r,c.g,c.b)
      }
    }
    for (let zi=0; zi<zSegments; zi += 1) for (let xi=0; xi<xSegments; xi += 1) {
      const a=zi*(xSegments+1)+xi,b=a+1,c=a+xSegments+1,d=c+1; indices.push(a,b,c,b,d,c)
    }
    const result = new THREE.BufferGeometry()
    result.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    result.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
    result.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
    result.setIndex(indices)
    result.computeVertexNormals()
    return result
  },[])
  return <group name="home-v193-single-authored-landscape-authority" onClick={onWalk} userData={{v193Refinement:'composed-traversable-floor-with-separate-geological-shelves-walls-and-deep-overhang',predecessorContract:'continuous-weathered-canyon-camera-safe-destination-basins-soft-strata-no-contour-staircase'}}><primitive object={authoredLandscape}/><mesh name="home-v125-sculpted-canyon-ground" geometry={geometry} visible={false}><meshBasicMaterial transparent opacity={0}/></mesh></group>
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
  const geometry=useMemo(()=>{const positions:number[]=[];const colors:number[]=[];const warm=new THREE.Color('#efc98f'),green=new THREE.Color('#70d69d'),violet=new THREE.Color('#a99aea');const loci=[[-4.7,-8.8,green],[-2.7,-11.7,warm],[2.5,-12.2,warm],[4.8,-8.9,violet]] as const;for(let cluster=0;cluster<loci.length;cluster+=1){const [cx,cz,tint]=loci[cluster];for(let index=0;index<150;index+=1){const t=((index*47)%151)/150,angle=index*2.3999632297+cluster,radius=.16+Math.sqrt(t)*(.22+((index*31)%97)/310);positions.push(cx+Math.cos(angle)*radius,.10+(1-t)*.14+Math.abs(Math.sin(index*.47))*.065,cz+Math.sin(angle)*radius*.72);const c=tint.clone().lerp(warm,t*.18);colors.push(c.r,c.g,c.b)}}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));return g},[])
  const points=useRef<THREE.Points>(null);useFrame(({clock})=>{if(points.current&&!reducedMotion)points.current.position.y=Math.sin(clock.elapsedTime*.22)*.025})
  return <points ref={points} name="home-v177-emotional-memory-weather" geometry={geometry} visible={false} userData={{treatment:'four-low-bounded-world-space-memory-weather-fields-localize-ground-life-map-and-deep-basin-no-upright-gates; retired-particle-deposits-replaced-by-solid-terrain-seated-memory-stones',v187Refinement:'terrain-hugging-memory-deposits-no-conical-spires',v188Refinement:'no-flat-particle-smears-at-destinations'}}><pointsMaterial vertexColors size={0.034} transparent opacity={0.40} depthWrite={false} sizeAttenuation toneMapped={false} fog/></points>
}

function MemorySediment({ reducedMotion }: { reducedMotion: boolean }) {
  const geometry=useMemo(()=>{const positions:number[]=[];const colors:number[]=[];const amber=new THREE.Color('#d8ad75'),teal=new THREE.Color('#67bda6'),lilac=new THREE.Color('#9488c4');const deposits=[[-6.1,3.4,1.0,.48],[-3.9,1.0,.74,.34],[-1.5,3.0,1.25,.42],[1.2,2.1,.82,.32],[4.1,3.7,1.05,.44],[6.0,.4,.72,.30],[-5.2,-2.4,.80,.30],[-.4,-1.8,1.12,.36],[4.5,-2.8,.92,.34]] as const;for(let patch=0;patch<deposits.length;patch+=1){const [cx,cz,rx,rz]=deposits[patch];for(let index=0;index<54;index+=1){const radial=Math.sqrt((((index*37+patch*13)%59)+1)/60),angle=index*2.3999632297+patch*.73,x=cx+Math.cos(angle)*radial*rx+Math.sin(index*.61)*.05,z=cz+Math.sin(angle)*radial*rz+Math.cos(index*.47)*.04,y=-.035+Math.sin(x*1.7+z*.83)*.045+((index*11)%9)/330;positions.push(x,y,z);const base=patch%3===0?teal:patch%3===1?amber:lilac,c=base.clone().lerp(amber,radial*.12);colors.push(c.r,c.g,c.b)}}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));return g},[])
  const points=useRef<THREE.Points>(null);useFrame(({clock})=>{if(points.current&&!reducedMotion)(points.current.material as THREE.PointsMaterial).opacity=.31+Math.sin(clock.elapsedTime*.28)*.025})
  return <points ref={points} name="home-v179-embedded-memory-sediment" geometry={geometry} userData={{treatment:'nine-bounded-mineral-memory-deposits-scattered-through-near-ground-no-path-no-interface-glyphs'}}><pointsMaterial vertexColors size={0.034} transparent opacity={0.33} depthWrite={false} sizeAttenuation toneMapped={false} fog/></points>
}

function DistantMemoryRain({ reducedMotion }: { reducedMotion: boolean }) {
  const geometry=useMemo(()=>{const positions:number[]=[];for(let index=0;index<640;index+=1){const column=index%13,t=((index*43)%641)/640,x=-7.2+column*1.2+Math.sin(index*.7)*.18,y=.6+t*(3.4+(column%4)*.75),z=-13.8-((index*29)%100)/48;positions.push(x,y,z)}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));return g},[])
  const points=useRef<THREE.Points>(null);useFrame((_,delta)=>{if(points.current&&!reducedMotion)points.current.position.y=(points.current.position.y+delta*.028)%0.26})
  return <points ref={points} name="home-v178-distant-memory-rain" geometry={geometry} userData={{treatment:'distant-vertical-memory-weather-reveals-world-beyond-basin-rim'}}><pointsMaterial color="#b8d9cc" size={0.032} transparent opacity={0.30} depthWrite={false} sizeAttenuation toneMapped={false} fog/></points>
}

function MemorySky() {
  const material=useMemo(()=>new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,uniforms:{zenith:{value:new THREE.Color('#06181b')},upper:{value:new THREE.Color('#0d3438')},horizon:{value:new THREE.Color('#2b625a')},memory:{value:new THREE.Color('#4a3d67')}},vertexShader:'varying vec3 vDirection; void main(){vDirection=normalize(position);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',fragmentShader:'uniform vec3 zenith;uniform vec3 upper;uniform vec3 horizon;uniform vec3 memory;varying vec3 vDirection;void main(){float h=clamp(vDirection.y*.5+.5,0.,1.);vec3 c=mix(horizon,upper,smoothstep(.30,.62,h));c=mix(c,zenith,smoothstep(.64,.98,h));float band=exp(-pow((h-.39)*5.7,2.0));c+=memory*band*.17;gl_FragColor=vec4(c,1.);}' }),[])
  return <mesh name="home-v183-world-space-memory-sky" material={material} frustumCulled={false} userData={{v185Refinement:'deep-teal-memory-sky-preserves-night-without-dead-black-field-or-flat-veil'}}><sphereGeometry args={[70,32,16]}/></mesh>
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
  const stone=useSanctuaryStone();const isGround=side==='ground';const x=isGround?-4.92:4.92;const color=isGround?'#69f2a8':'#c0adff'
  const authoredPlaceSource=useGLTF(isGround?AUTHORED_GROUND_V191:AUTHORED_LIFE_MAP_V191).scene
  const authoredPlace=useMemo(()=>authoredPlaceSource.clone(true),[authoredPlaceSource])
  const outer=useMemo(()=>{const frame=fissureGeometry(false,!isGround);frame.holes.push(new THREE.Path(fissureGeometry(true,!isGround).getPoints(18).reverse()));const g=new THREE.ExtrudeGeometry(frame,{depth:0.10,bevelEnabled:true,bevelSize:0.016,bevelThickness:0.018,bevelSegments:2,curveSegments:4});g.computeVertexNormals();return g},[isGround])
  const field=useMemo(()=>new THREE.ShapeGeometry(fissureGeometry(true,!isGround),8),[isGround])
  const seamMotes=useMemo(()=>{const positions:number[]=[];for(let index=0;index<360;index+=1){const t=(((index*53)%421)+.5)/421,angle=index*2.3999632297+(isGround?.28:.91),radial=Math.pow(t,.62),lobe=.72+.18*Math.sin(angle*3+(isGround?.4:1.2)),rx=1.34*lobe,rz=.78*(.86+.14*Math.cos(angle*2));const x=Math.cos(angle)*radial*rx+Math.sin(index*.43)*.045,z=Math.sin(angle)*radial*rz+Math.cos(index*.31)*.04,y=.018+Math.pow(1-radial,1.7)*.13+Math.abs(Math.sin(index*.71))*.035;positions.push(x,y,z)}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));return g},[isGround])
  const signalVeins=useMemo(()=>{const positions:number[]=[];for(let branch=0;branch<15;branch+=1){const angle=(branch/15)*Math.PI*2+(isGround?0.18:0.52),length=0.72+((branch*7)%5)*0.13;let px=Math.cos(angle)*0.14,pz=Math.sin(angle)*0.10;for(let step=0;step<5;step+=1){const t=(step+1)/5,nx=Math.cos(angle+(step%2===0?0.09:-0.07))*length*t,nz=Math.sin(angle+(step%2===0?0.09:-0.07))*length*t*0.76;positions.push(px,0.045,pz,nx,0.045,nz);px=nx;pz=nz}}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));return g},[isGround])
  const memoryStone=useMemo(()=>weatheredSanctuaryMassGeometry(isGround?11:17),[isGround])
  return <group name={`home-v126-${side}-framed-fissure`} userData={{v165Refinement:'terrain-flush-readable-destination-cut-clear-camera-corridor-no-door-no-ring',v167Refinement:'destination-cut-owned-by-single-basin-no-overlap',v172Refinement:'recessed-basin-scar-raised-to-live-terrain-surface-local-color-language-no-gate',v174Refinement:'recessed-basin-scar-seated-in-live-terrain-amphitheater-local-color-language-no-gate',v175Refinement:'basin-wide-branching-signal-field-no-slab-no-door-no-ring',v185Refinement:'camera-safe-basin-wide-ground-level-signal-place-no-upright-gate'}} position={[x,isGround?0.70:0.64,isGround?-8.72:-8.78]} rotation={[0,isGround?0.10:-0.10,0]} scale={[1,1,1]}>
    <mesh name={`home-v151-${side}-retained-stone-provenance`} geometry={outer} castShadow receiveShadow visible={false}><meshPhysicalMaterial color={isGround?'#356949':'#514d76'} map={stone.color} normalMap={stone.normal} normalScale={new THREE.Vector2(0.62,0.62)} roughnessMap={stone.arm} roughness={0.80} metalness={0.001} envMapIntensity={0.96}/></mesh>
    <mesh name={`home-v153-${side}-retired-threshold-panel`} geometry={field} position={[0,0,0.025]} visible={false}><meshStandardMaterial color={isGround?'#07170f':'#100d19'} emissive={color} emissiveIntensity={0.46} roughness={1} side={THREE.DoubleSide}/></mesh>
    <primitive object={authoredPlace} name={`home-v196-${side}-authored-memory-place`} position={[isGround?2.15:-2.15,isGround?-1.12:-1.62,0]} rotation={[0,isGround?0.20:-0.18,0]} scale={isGround?[1.72,1.72,1.72]:[1.42,1.42,1.42]}/>
    <mesh name={`home-v188-${side}-terrain-seated-memory-stone`} geometry={memoryStone} visible={false}><meshBasicMaterial transparent opacity={0}/></mesh>
    <points name={`home-v149-${side}-threshold-signal-field`} geometry={seamMotes} visible={false}><pointsMaterial color={color} size={0.018} transparent opacity={0.26}/></points>
    <lineSegments name={`home-v175-${side}-terrain-signal-veins`} geometry={signalVeins} visible={false}><lineBasicMaterial color={color} transparent opacity={0.80} toneMapped={false}/></lineSegments>
    <mesh name={`home-v133-${side}-authored-threshold-hit-target`} position={[0,0.62,0]} onClick={e=>{e.stopPropagation();onActivate()}}><boxGeometry args={[4.20,2.20,3.20]}/><meshBasicMaterial transparent opacity={0} colorWrite={false} depthWrite={false}/></mesh>
    <pointLight position={[0,0.46,0]} color={color} intensity={2.45} distance={6.8} decay={2}/>
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
  const authoredHeartSource=useGLTF(AUTHORED_ORB_V191).scene
  const authoredHeart=useMemo(()=>{const root=authoredHeartSource.clone(true);root.traverse(object=>{if(object instanceof THREE.Mesh&&object.material instanceof THREE.MeshStandardMaterial){const material=object.material.clone();material.emissive=new THREE.Color(palette.accent);material.emissiveIntensity=0.055*palette.intensity;object.material=material;object.castShadow=true}});return root},[authoredHeartSource,palette.accent,palette.intensity])
  const orb=useMemo(()=>{const root=source.clone(true);root.traverse(object=>{const rejectedIdentity=object.name === 'orb-aura'||object.name.startsWith('orb-orbit-')||object.name.startsWith('orb-satellite-')||object.name.startsWith('orb-filament-');object.visible=false;if(rejectedIdentity)object.userData.uraiRetiredVisualRole='v133-no-aura-orbit-satellite-filament'});return normalizeAsset(root,2.42,palette.core,0.58)},[palette.core,source])
  const moteGeometry=useMemo(()=>{const positions:number[]=[];for(let index=0;index<1540;index+=1){const verticalSample=((((index*613)%1543)/1542)*2)-1;const angle=index*2.3999632297+Math.sin(index*0.31)*0.14;const radialSample=((index*431)%1553)/1552;const radius=0.035+Math.pow(radialSample,1.52)*0.66;const latitude=Math.sqrt(Math.max(0,1-verticalSample*verticalSample));const irregular=0.84+Math.sin(index*0.19)*0.13+Math.cos(index*0.073)*0.07;positions.push(Math.cos(angle)*latitude*radius*1.16*irregular,verticalSample*radius*0.58+Math.sin(index*0.11)*0.016,Math.sin(angle)*latitude*radius*0.98*irregular)}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));return g},[])
  const memoryVolume=useMemo(()=>{const geometry=new THREE.IcosahedronGeometry(0.72,3);const positions=geometry.getAttribute('position') as THREE.BufferAttribute;for(let index=0;index<positions.count;index+=1){const x=positions.getX(index),y=positions.getY(index),z=positions.getZ(index),latitude=y/0.72,shoulder=0.94+Math.sin(latitude*Math.PI*1.40)*0.08+Math.cos((x+z)*4.8)*0.035,taper=0.97-latitude*0.06;positions.setXYZ(index,x*shoulder*taper*0.88,y*1.02+0.035*Math.sin(x*4.8),z*shoulder*(0.78+0.05*latitude))}positions.needsUpdate=true;geometry.computeVertexNormals();return geometry},[])
  const heartGeometry=useMemo(()=>{const geometry=new THREE.IcosahedronGeometry(0.16,2);const positions=geometry.getAttribute('position') as THREE.BufferAttribute;for(let index=0;index<positions.count;index+=1){const x=positions.getX(index),y=positions.getY(index),z=positions.getZ(index),latitude=y/.16,weathering=0.91+Math.sin(index*2.17)*0.075+Math.cos(index*.73)*0.035;positions.setXYZ(index,x*weathering*(0.82-latitude*.16),y*weathering*1.04,z*weathering*.70)}positions.needsUpdate=true;geometry.computeVertexNormals();return geometry},[])
  useFrame(({clock})=>{if(!group.current||reducedMotion)return;const t=clock.getElapsedTime();group.current.position.y=ORB.y+Math.sin(t*(state==='speaking'?1.30:0.62))*0.020;group.current.rotation.y=Math.sin(t*0.14)*0.026})
  return <group ref={group} name="home-v126-apse-integrated-orb" position={[ORB.x,ORB.y,ORB.z]} scale={[1.72,1.72,1.72]} onClick={(event) => { event.stopPropagation(); onOrb() }} userData={{v165Refinement:'contained-memory-mote-heart-primary-presence-no-capsule-no-aura-no-pedestal',v167Refinement:'filled-irregular-memory-swarm-small-seed-no-shell-silhouette',v172Refinement:'larger-filled-memory-swarm-near-invisible-seed-open-air-beneath-no-aura-no-pedestal',v174Refinement:'wide-contained-memory-swarm-dense-living-heart-open-air-beneath-no-aura-no-pedestal',v175Refinement:'dense-horizontal-living-memory-cloud-with-compact-multi-depth-heart-no-fountain-no-ball',v185Refinement:'large-contained-point-memory-presence-dense-dark-heart-no-solid-ball-no-fountain',v186Refinement:'bounded-fine-grain-memory-heart-readable-near-and-far-no-particle-wall'}}>
    <mesh name="home-v132-orb-memory-volume" geometry={memoryVolume} castShadow scale={[0.24,0.20,0.23]}><meshPhysicalMaterial color="#416f5c" emissive={palette.accent} emissiveIntensity={0.010} roughness={0.70} metalness={0.003} transmission={0.01} thickness={0.10} transparent opacity={0.002} depthWrite={false}/></mesh>
    <primitive object={orb} visible={false}/>
    <primitive object={authoredHeart} name="home-v196-authored-single-connected-stratified-living-memory-heart" scale={[0.47,0.47,0.47]}/>
    <mesh name="home-v188-orb-heart-port-lobe" geometry={heartGeometry} visible={false}><meshBasicMaterial transparent opacity={0}/></mesh>
    <mesh name="home-v188-orb-heart-starboard-lobe" geometry={heartGeometry} visible={false}><meshBasicMaterial transparent opacity={0}/></mesh>
    <mesh name="home-v188-orb-heart-crown-lobe" geometry={heartGeometry} visible={false}><meshBasicMaterial transparent opacity={0}/></mesh>
    <points name="home-v126-orb-memory-motes" geometry={moteGeometry} scale={[0.46,0.36,0.42]} visible={false}><pointsMaterial color={palette.core} size={palette.moteSize*0.18} transparent opacity={0.18} depthWrite={false} sizeAttenuation toneMapped={false}/></points>
    <points name="home-v154-orb-memory-depth-motes" geometry={moteGeometry} scale={[0.52,0.40,0.48]} visible={false}><pointsMaterial color={palette.accent} size={palette.moteSize*0.14} transparent opacity={0.14} depthWrite={false} sizeAttenuation toneMapped={false}/></points>
    <points name="home-v174-orb-memory-nucleus-motes" geometry={moteGeometry} position={[-0.16,0.04,0]} scale={[0.46,0.58,0.42]} visible={false}><pointsMaterial color={palette.core} size={palette.moteSize*0.27} transparent opacity={0.60} depthWrite={false} sizeAttenuation toneMapped={false}/></points>
    <points name="home-v175-orb-memory-heart-motes" geometry={moteGeometry} scale={[0.30,0.24,0.28]} visible={false}><pointsMaterial color={palette.accent} size={palette.moteSize*0.48} transparent opacity={0.58} depthWrite={false} sizeAttenuation toneMapped={false}/></points>
    <points name="home-v179-orb-memory-heart-motes" geometry={moteGeometry} position={[0.14,-0.03,0.03]} scale={[0.38,0.28,0.34]} visible={false}><pointsMaterial color={palette.accent} size={palette.moteSize*0.25} transparent opacity={0.58} depthWrite={false} sizeAttenuation toneMapped={false}/></points>
    <points name="home-v186-orb-memory-heart-bridge" geometry={moteGeometry} position={[0,0.10,-0.04]} rotation={[0,0,.72]} scale={[0.18,0.42,0.20]} visible={false}><pointsMaterial color={palette.core} size={palette.moteSize*0.22} transparent opacity={0.50} depthWrite={false} sizeAttenuation toneMapped={false}/></points>
    <mesh name="home-v133-orb-memory-seed" geometry={memoryVolume} scale={[0.012,0.016,0.011]} visible={false}><meshPhysicalMaterial color="#426d5b" emissive={palette.accent} emissiveIntensity={0.012} roughness={0.62} metalness={0.001} clearcoat={0.01} transparent opacity={0.10}/></mesh>
    <mesh name="home-v182-orb-faceted-mineral-seed" geometry={heartGeometry} rotation={[0.18,-0.34,0.10]} scale={[0.82,0.88,0.76]} castShadow visible={false}><meshStandardMaterial color="#244d42" emissive={palette.accent} emissiveIntensity={0.018} roughness={0.66} metalness={0.018} flatShading/></mesh>
    <mesh name="home-v126-orb-generous-hit-target"><sphereGeometry args={[1.50,16,12]}/><meshBasicMaterial transparent opacity={0} colorWrite={false} depthWrite={false}/></mesh>
    <pointLight color={palette.core} intensity={palette.intensity*0.34} distance={4.8} decay={2}/><pointLight position={[0.42,-0.08,0.46]} color={palette.accent} intensity={palette.intensity*0.10} distance={3.2} decay={2}/>
    <group name={`home-v126-orb-state-${state}`} userData={{ state, treatment: 'governed-petal-heart-no-aura-no-orbit-rings' }}/>
  </group>
}

function AtmosphericDepth({reducedMotion}:{reducedMotion:boolean}){const geometry=useMemo(()=>{const positions:number[]=[];for(let index=0;index<880;index+=1){const angle=index*2.3999632297,radius=5.0+((index*37)%250)/10,y=0.30+((index*29)%104)/11;positions.push(Math.cos(angle)*radius,y,Math.sin(angle)*radius-9.8)}const result=new THREE.BufferGeometry();result.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));return result},[]);const points=useRef<THREE.Points>(null);useFrame((_,delta)=>{if(points.current&&!reducedMotion)points.current.rotation.y+=delta*0.0014});return <points ref={points} name="home-v125-atmospheric-depth-motes" geometry={geometry} userData={{v167Refinement:'bounded-depth-motes-behind-single-canyon-owner',v172Refinement:'denser-sacred-atmosphere-depth-field-without-screen-overlay',v174Refinement:'world-space-depth-motes-between-asymmetric-ridge-layers-no-screen-overlay',v185Refinement:'denser-depth-motes-support-canyon-scale-without-screen-overlay'}}><pointsMaterial color="#d7e9df" size={0.030} transparent opacity={0.22} depthWrite={false} fog/></points>}

export function HomeV76Sanctuary({reducedMotion,orbState,onOrb,onGround,onLifeMap,onWalk}:Props){
  return <group name="home-v126-ground-owned-open-sanctuary" userData={{activeArtRevision:'v185-camera-safe-living-memory-sanctuary',visualIteration:'v185-continuous-geology-brighter-memory-sky-grounded-destinations-large-point-orb',currentVisualRefinement:'v185-continuous-weathered-canyon-camera-safe-destination-basins-large-contained-memory-orb-no-runway',v185PixelRepair:'remove-contour-staircase-carve-camera-safe-destination-basins-brighten-world-sky-enlarge-point-orb-hide-solid-seed',v184PixelRepair:'remove-rejected-stage-flat-veils-and-use-world-space-sky-plus-depth-fog-only',v183PixelRepair:'replace-flat-black-generic-canyon-read-with-world-space-memory-sky-ancestral-weather-veils-and-cooler-mineral-geology',v182PixelRepair:'reduce-pale-rock-read-with-normalized-tapered-depth-compressed-dark-mineral-seed',v181PixelRepair:'replace-disconnected-pinwheel-shards-with-one-asymmetrically-weathered-flat-faceted-mineral-seed',v180PixelRepair:'replace-stacked-white-triangle-read-with-colored-low-emission-facet-cluster-and-reduce-competing-convergence-bloom',v179PixelRepair:'replace-dotted-foreground-paths-with-bounded-mineral-deposits-reduce-orb-bloom-and-consolidate-readable-heart',v176PixelRepair:'replace-muddy-terrace-field-with-selective-strata-raise-orb-heart-bind-destination-scars-with-memory-branches',v165PixelRepair:'remove-v164-jagged-connected-shelves-clear-camera-corridors-contain-orb-shell',v167PixelRepair:'remove-overlapping-ground-islands-raise-canyon-horizon-rebuild-orb-as-filled-swarm',v171PixelRepair:'raise-continuous-basin-rim-add-geologic-relief-strengthen-destination-light-minimize-orb-seed',v172PixelRepair:'carve-destination-basins-raise-live-scars-strengthen-strata-enlarge-swarm-reduce-dead-sky',v174PixelRepair:'break-symmetric-bowl-with-continuous-ridge-overlap-seat-destinations-compress-orb-fountain-into-wide-swarm',v175PixelRepair:'replace-smooth-dunes-with-terraced-erosion-geology-replace-destination-slabs-with-branching-basin-signals-raise-far-rim',compatibilityMarkers:LEGACY_CONTRACT_MARKERS,legacySourceAssets:LEGACY_SOURCE_ASSETS,historicalV76ContractOnly:true}}>
    <MemorySky/><SculptedCanyonGround onWalk={onWalk}/><AuthoredSanctuaryEnvironment/><AuthoredThresholdEnvironment/><SanctuaryArchitecture/><SanctuaryTerraces/><GeologicalFrame/><FramedFissure side="ground" onActivate={onGround}/><FramedFissure side="life-map" onActivate={onLifeMap}/><ApseAndOrbCradle/><ArrivalSignalPath reducedMotion={reducedMotion}/><MemorySediment reducedMotion={reducedMotion}/><MemoryConstellation reducedMotion={reducedMotion}/><MemoryWeather reducedMotion={reducedMotion}/><DistantMemoryRain reducedMotion={reducedMotion}/><LivingOrb state={orbState} reducedMotion={reducedMotion} onOrb={onOrb}/><AtmosphericDepth reducedMotion={reducedMotion}/>
    <ambientLight intensity={0.54} color="#d5e9e2"/><hemisphereLight args={['#cae5df','#08201c',0.86]}/><directionalLight position={[-5,9,4]} intensity={2.88} color="#f1c78d" castShadow/><directionalLight position={[6,6,-9]} intensity={0.92} color="#71d0bb"/><directionalLight position={[-7,4,-10]} intensity={0.66} color="#ab94e6"/><spotLight position={[0,8.4,-1.8]} target-position={[ORB.x,ORB.y,ORB.z]} angle={0.50} penumbra={0.86} intensity={2.55} color="#dcfff1" distance={24}/><pointLight position={[0,1.8,2.8]} intensity={0.52} color="#efc68f" distance={9} decay={2}/><pointLight position={[-4.9,1.40,-8.8]} intensity={3.15} color="#55e59a" distance={9.4} decay={2}/><pointLight position={[4.9,1.38,-8.85]} intensity={3.02} color="#a18cf2" distance={9.4} decay={2}/>
    <group name="home-authored-terrain" userData={{v185Refinement:'single-visible-continuous-weathered-canyon-authority-with-camera-safe-destination-basins'}}/><group name="home-sanctuary-pavilion" userData={{v185Refinement:'continuous-asymmetric-ridge-overlap-soft-strata-no-detached-piles-no-contour-staircase'}}/><group name="home-v49-scanned-detail-layer" userData={{v167Refinement:'edge-provenance-outside-primary-frustum-no-card-wall'}}/><group name="home-v49-authored-practicals" userData={{v185Refinement:'ground-green-life-map-violet-grounded-basin-signal-fields-readable-without-gates'}}/><group name="home-authored-embodied-self" userData={{presentation:'privacy-preserving-first-person-presence-v126'}}/><group name="home-mountain-horizon" userData={{v185Refinement:'continuous-asymmetric-far-rim-plus-deep-teal-world-sky-no-repeated-mountain-family'}}/><group name="home-living-vegetation" userData={{treatment:'reserved-beyond-clear-navigation-channel-v126'}}/>
  </group>
}

useGLTF.preload(ROCK_FACE_A);useGLTF.preload(ROCK_FACE_B);useGLTF.preload(GOVERNED_HOME);useGLTF.preload(GOVERNED_ORB);useGLTF.preload(AUTHORED_LANDSCAPE_V191);useGLTF.preload(AUTHORED_GROUND_V191);useGLTF.preload(AUTHORED_LIFE_MAP_V191);useGLTF.preload(AUTHORED_ORB_V191);useTexture.preload([ROCK_DIFFUSE,ROCK_NORMAL,ROCK_ARM])
