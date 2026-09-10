'use client'

import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'
import type { OrbState } from '@/app/home/orbStateController'
import { GROUND, LIFE_MAP, ORB, height } from './HomeWorldProductionV223Geometry'

type V3 = [number, number, number]
type WalkHandler = (event: ThreeEvent<MouseEvent>) => void

type MassSpec = {
  x: number
  z: number
  w: number
  d: number
  h: number
  lean: number
  crown: number
  tone: string
}

const rejectedNames = new Set([
  'home-v225-living-memory-grove',
  'home-v225-grown-winding-memory-path',
  'home-v225-ground-sheltered-memory-basin',
  'home-v225-life-map-rooted-memory-observatory',
  'home-v225-single-asymmetric-living-memory-presence',
  'home-v225-sculpted-sanctuary-floor',
])

function RetireRejectedPresentation() {
  const { scene } = useThree()
  useEffect(() => {
    const changed: THREE.Object3D[] = []
    scene.traverse((object) => {
      const rejected = rejectedNames.has(object.name)
        || /^home-v225-(?:port|starboard)-overhanging-strata-/.test(object.name)
        || object.name === 'home-v225-polish-production-composition'
      if (rejected && object.visible) {
        object.visible = false
        changed.push(object)
      }
    })
    return () => changed.forEach((object) => { object.visible = true })
  }, [scene])
  return null
}

function sanctuaryFloorGeometry() {
  const nx = 92, nz = 126
  const positions: number[] = [], colors: number[] = [], indices: number[] = []
  const deep = new THREE.Color('#14241f')
  const moss = new THREE.Color('#31483b')
  const earth = new THREE.Color('#675944')
  const pale = new THREE.Color('#718476')
  for (let iz = 0; iz <= nz; iz++) {
    const z = 6.2 - iz / nz * 25.5
    for (let ix = 0; ix <= nx; ix++) {
      const x = -8.8 + ix / nx * 17.6
      const depth = THREE.MathUtils.clamp((4.7 - z) / 22.0, 0, 1)
      const centerWear = Math.exp(-Math.pow(x / 2.65, 2))
      const terrace = Math.abs(x) > 2.6
        ? .075 * Math.floor((Math.abs(x) - 2.6) * 1.8) * (.32 + depth)
        : 0
      const seam = .030 * Math.sin(x * 1.7 + z * .48) + .018 * Math.sin(z * 1.21 - x * .73)
      const y = height(x, z) + terrace + seam * (1 - .65 * centerWear) + .022
      positions.push(x, y, z)
      const edge = THREE.MathUtils.clamp(Math.abs(x) / 8.8, 0, 1)
      const c = deep.clone().lerp(moss, .30 + .28 * (1 - edge)).lerp(earth, .15 * centerWear).lerp(pale, .08 * depth)
      colors.push(c.r, c.g, c.b)
    }
  }
  const row = nx + 1
  for (let iz = 0; iz < nz; iz++) for (let ix = 0; ix < nx; ix++) {
    const a = iz * row + ix, b = a + 1, c = a + row, d = c + 1
    if ((ix + iz) & 1) indices.push(a, b, d, a, d, c)
    else indices.push(a, b, c, b, d, c)
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}

function memoryPathGeometry() {
  const segments = 108, across = 12
  const positions: number[] = [], colors: number[] = [], indices: number[] = []
  const ember = new THREE.Color('#9b8060'), quiet = new THREE.Color('#40594c'), pale = new THREE.Color('#b3a88d')
  const centers = Array.from({ length: segments + 1 }, (_, i) => {
    const t = i / segments
    const z = 4.9 - t * 20.7
    const x = .28 * Math.sin(t * Math.PI * 2.1) + .11 * Math.sin(t * Math.PI * 5.4)
    return new THREE.Vector3(x, height(x, z) + .075, z)
  })
  for (let i = 0; i <= segments; i++) {
    const tangent = centers[Math.min(segments, i + 1)].clone().sub(centers[Math.max(0, i - 1)]).normalize()
    const side = new THREE.Vector3(tangent.z, 0, -tangent.x).normalize()
    for (let j = 0; j < across; j++) {
      const u = j / (across - 1) - .5
      const width = 1.55 + .13 * Math.sin(i * .17)
      const p = centers[i].clone().addScaledVector(side, u * width)
      p.y += .035 * Math.cos(u * Math.PI * 2)
      positions.push(p.x, p.y, p.z)
      const c = quiet.clone().lerp(ember, .32 + .50 * (1 - Math.abs(u) * 2)).lerp(pale, .08 * Math.sin(i / segments * Math.PI))
      colors.push(c.r, c.g, c.b)
    }
  }
  for (let i = 0; i < segments; i++) for (let j = 0; j < across - 1; j++) {
    const a = i * across + j, b = a + 1, c = a + across, d = c + 1
    indices.push(a, b, c, b, d, c)
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}

function massGeometry(spec: MassSpec) {
  const { w, d, h, lean, crown } = spec
  const x0 = -w / 2, x1 = w / 2, z0 = -d / 2, z1 = d / 2
  const topY = h
  const vertices = new Float32Array([
    x0, 0, z0, x1, 0, z0, x1, 0, z1, x0, 0, z1,
    x0 + lean, topY * .76, z0 + .12, x1 + lean * .62, topY * .90, z0 - .08,
    x1 - lean * .25, topY * (.76 + crown), z1 + .05, x0 + lean * .28, topY, z1 - .10,
    -w * .22 + lean * .55, topY * (1.06 + crown * .32), -d * .05,
  ])
  const indices = [
    0,1,4, 1,5,4, 1,2,5, 2,6,5, 2,3,6, 3,7,6, 3,0,7, 0,4,7,
    4,5,8, 5,6,8, 6,7,8, 7,4,8, 0,3,2, 0,2,1,
  ]
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.BufferAttribute(vertices, 3))
  g.setIndex(indices)
  g.computeVertexNormals()
  return g
}

const valleyMasses: MassSpec[] = [
  {x:-5.75,z:1.6,w:2.8,d:3.1,h:1.9,lean:.36,crown:.08,tone:'#34483d'},
  {x:5.55,z:.8,w:3.0,d:3.6,h:2.4,lean:-.30,crown:.14,tone:'#30443c'},
  {x:-5.25,z:-3.0,w:3.7,d:4.2,h:3.4,lean:.48,crown:.18,tone:'#3f5042'},
  {x:5.15,z:-3.9,w:3.9,d:4.4,h:3.8,lean:-.44,crown:.12,tone:'#384b43'},
  {x:-5.65,z:-8.7,w:4.4,d:4.9,h:4.2,lean:.52,crown:.12,tone:'#445343'},
  {x:5.60,z:-9.8,w:4.4,d:5.1,h:4.7,lean:-.50,crown:.15,tone:'#3a5148'},
  {x:-4.85,z:-14.3,w:4.6,d:4.5,h:4.9,lean:.36,crown:.18,tone:'#485747'},
  {x:4.75,z:-15.2,w:4.5,d:4.4,h:5.3,lean:-.34,crown:.12,tone:'#40564e'},
]

function MemoryValley({ onWalk }: { onWalk: WalkHandler }) {
  const floor = useMemo(sanctuaryFloorGeometry, [])
  const path = useMemo(memoryPathGeometry, [])
  const masses = useMemo(() => valleyMasses.map((spec) => ({ spec, geometry: massGeometry(spec) })), [])
  return <group name="home-v225-v2-continuous-sculpted-memory-valley">
    <mesh geometry={floor} receiveShadow onClick={onWalk} name="home-v225-v2-authored-valley-floor">
      <meshStandardMaterial vertexColors roughness={.98} metalness={0}/>
    </mesh>
    <mesh geometry={path} receiveShadow onClick={onWalk} name="home-v225-v2-grown-memory-walk">
      <meshStandardMaterial vertexColors roughness={.91} emissive="#392f25" emissiveIntensity={.12}/>
    </mesh>
    <group name="home-v225-v2-cathedral-memory-ribs">
      {masses.map(({ spec, geometry }, i) => <mesh
        key={i}
        geometry={geometry}
        position={[spec.x, height(spec.x, spec.z) - .10, spec.z]}
        rotation={[0, (i % 2 ? -.08 : .07), 0]}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial color={spec.tone} roughness={.96}/>
      </mesh>)}
    </group>
  </group>
}

function wallGeometry(side: -1 | 1, index: number) {
  const w = 4.6 + index * .55, h = 2.7 + index * .65
  const spec: MassSpec = { x:0,z:0,w,d:1.15,h,lean:side * .35,crown:.12,tone:'#2c443b' }
  return massGeometry(spec)
}

function LayeredMemoryWalls() {
  const walls = useMemo(() => ([-1, 1] as const).flatMap((side) => Array.from({ length: 3 }, (_, index) => ({ side, index, geometry: wallGeometry(side, index) }))), [])
  return <group name="home-v225-v2-weathered-memory-walls">
    {walls.map(({ side, index, geometry }) => {
      const z = 1.7 - index * 6.2
      const x = side * (7.0 - index * .18)
      return <mesh key={`${side}-${index}`} geometry={geometry} position={[x,height(x,z)-.06,z]} rotation={[0,side * (.06 + index*.015),0]} receiveShadow castShadow>
        <meshStandardMaterial color={side < 0 ? '#263c33' : '#29413c'} roughness={.97}/>
      </mesh>
    })}
  </group>
}

function shelterGeometry(side: -1 | 1) {
  const spec: MassSpec = {x:0,z:0,w:4.9,d:3.2,h:2.15,lean:side * .55,crown:.12,tone:'#4b5f4c'}
  return massGeometry(spec)
}

function benchGeometry(width: number) {
  const g = new THREE.BoxGeometry(width,.18,.46,5,1,2)
  const p = g.getAttribute('position') as THREE.BufferAttribute
  for (let i=0;i<p.count;i++) p.setY(i,p.getY(i)+.035*Math.sin(p.getX(i)*3.1+p.getZ(i)*4.4))
  g.computeVertexNormals()
  return g
}

function GroundHearth({ onGround }: { onGround: () => void }) {
  const y = height(GROUND.x, GROUND.z)
  const shelter = useMemo(() => shelterGeometry(1), [])
  const inward = useMemo(() => massGeometry({x:0,z:0,w:4.2,d:2.8,h:1.15,lean:.52,crown:.08,tone:'#56614b'}), [])
  const bench = useMemo(() => benchGeometry(1.8), [])
  return <group position={[GROUND.x, y + .02, GROUND.z]} name="home-v225-v2-ground-memory-hearth" onClick={(e) => { e.stopPropagation(); onGround() }}>
    <mesh geometry={shelter} position={[.35,-.08,.20]} rotation={[0,.14,0]} castShadow receiveShadow>
      <meshStandardMaterial color="#465847" roughness={.95}/>
    </mesh>
    <mesh geometry={inward} position={[2.55,-.18,.55]} rotation={[0,-.20,0]} castShadow receiveShadow>
      <meshStandardMaterial color="#5b5f49" roughness={.94}/>
    </mesh>
    <mesh position={[1.35,.35,-.18]} scale={[1.28,.24,1.0]} castShadow receiveShadow>
      <sphereGeometry args={[1,48,24,0,Math.PI*2,Math.PI*.54,Math.PI*.46]}/>
      <meshStandardMaterial color="#74533c" emissive="#6a3322" emissiveIntensity={.34} roughness={.88}/>
    </mesh>
    <mesh geometry={bench} position={[.20,.44,1.02]} rotation={[0,.18,0]} castShadow><meshStandardMaterial color="#7c6b50" roughness={.90}/></mesh>
    <mesh geometry={bench} position={[1.88,.42,.88]} rotation={[0,-.28,0]} castShadow><meshStandardMaterial color="#675d49" roughness={.93}/></mesh>
    {Array.from({ length: 11 }, (_, i) => {
      const a = i * 2.399
      const r = .28 + .055 * (i % 3)
      return <mesh key={i} position={[1.35+Math.cos(a)*r,.72 + .09*(i%2),-.18 + Math.sin(a)*r*.76]} scale={[.05,.17,.05]}>
        <sphereGeometry args={[1,16,12]}/>
        <meshStandardMaterial color="#e2a177" emissive="#c5653f" emissiveIntensity={1.45} roughness={.68}/>
      </mesh>
    })}
    <pointLight position={[1.35,1.05,-.10]} color="#f0a176" intensity={6.0} distance={7.5}/>
    <pointLight position={[2.55,1.85,-.55]} color="#86bea3" intensity={1.15} distance={6.0}/>
  </group>
}

function lineageSlab(index: number) {
  const side = index % 2 ? -1 : 1
  const tier = Math.floor(index / 2)
  const spec: MassSpec = {x:0,z:0,w:.68+tier*.16,d:.72,h:1.05+tier*.28,lean:side*(.20+tier*.04),crown:.12,tone:'#55786d'}
  return { side, tier, geometry: massGeometry(spec) }
}

function LifeMapObservatory({ onLifeMap }: { onLifeMap: () => void }) {
  const y = height(LIFE_MAP.x, LIFE_MAP.z)
  const inward = useMemo(() => massGeometry({x:0,z:0,w:4.3,d:3.1,h:1.35,lean:-.48,crown:.10,tone:'#425f57'}), [])
  const crown = useMemo(() => massGeometry({x:0,z:0,w:3.7,d:2.2,h:2.8,lean:-.24,crown:.18,tone:'#405e58'}), [])
  const slabs = useMemo(() => Array.from({ length: 10 }, (_, i) => lineageSlab(i)), [])
  return <group position={[LIFE_MAP.x, y, LIFE_MAP.z]} name="home-v225-v2-life-map-lineage-observatory" onClick={(e) => { e.stopPropagation(); onLifeMap() }}>
    <mesh geometry={inward} position={[-2.50,-.15,.52]} rotation={[0,.18,0]} castShadow receiveShadow>
      <meshStandardMaterial color="#3d5a52" roughness={.92} emissive="#183b33" emissiveIntensity={.10}/>
    </mesh>
    <mesh geometry={crown} position={[-.15,-.08,-.12]} rotation={[0,-.10,0]} castShadow receiveShadow>
      <meshStandardMaterial color="#486860" roughness={.88} emissive="#1f463d" emissiveIntensity={.14}/>
    </mesh>
    {slabs.map(({ side, tier, geometry }, i) => {
      const x = -1.25 + side * (.65 + tier*.34)
      const z = -.45 - tier*.34
      return <group key={i}>
        <mesh geometry={geometry} position={[x,.16,z]} rotation={[0,side*.16,side*.035]} castShadow>
          <meshPhysicalMaterial color={i%2 ? '#719b8d' : '#7e7391'} emissive={i%2 ? '#2b6354' : '#554264'} emissiveIntensity={.50} roughness={.48} clearcoat={.08}/>
        </mesh>
        <mesh position={[x + side*.17,1.45+tier*.32,z-.10]} scale={[.12,.12,.12]}>
          <sphereGeometry args={[1,24,18]}/>
          <meshPhysicalMaterial color={i%2 ? '#c8e1d6' : '#d8c9df'} emissive={i%2 ? '#66b89c' : '#956fa9'} emissiveIntensity={1.35} roughness={.28}/>
        </mesh>
      </group>
    })}
    <pointLight position={[-1.20,2.15,-.6]} color="#79ceb0" intensity={3.9} distance={7.2}/>
    <pointLight position={[-2.45,1.25,.30]} color="#b69ac9" intensity={2.1} distance={6.0}/>
  </group>
}

function orbGeometry() {
  const geometry = new THREE.SphereGeometry(1,128,96)
  const p = geometry.getAttribute('position') as THREE.BufferAttribute
  const colors = new Float32Array(p.count*3)
  const deep = new THREE.Color('#12342d'), mid = new THREE.Color('#4e9a82'), pale = new THREE.Color('#d5e5dc'), warm = new THREE.Color('#c79073')
  for (let i=0;i<p.count;i++) {
    const bx=p.getX(i), by=p.getY(i), bz=p.getZ(i)
    const a=Math.atan2(bz,bx), upper=Math.max(0,by), lower=Math.max(0,-by)
    const cleft=Math.exp(-Math.pow(bx/.24,2)-Math.pow((by-.77)/.20,2))
    const shoulder=1+.30*upper
    const taper=Math.max(.34,1-.58*Math.pow(lower,1.24))
    const fold=1+.055*Math.sin(a*3.2+by*7.1)+.026*Math.sin(a*7.6-by*9.4)
    let x=bx*(.88*shoulder)*taper*fold + .085*(1-by*by) + .035*bz
    let z=bz*(.66+.08*upper)*taper*(1+.035*Math.sin(a*4-by*6))
    let y=by*1.04-.39*cleft-.27*Math.pow(lower,1.42)+.075*upper*Math.abs(bx)
    x += .045*Math.sin(a*2.1+by*5.2)*(1-Math.abs(by))
    y += .032*Math.sin(a*3.3+by*8.0)*(1-Math.abs(by))
    z += .030*Math.sin(a*2.6-by*5.6)*(1-Math.abs(by))
    p.setXYZ(i,x,y,z)
    const side=Math.max(0,Math.cos(a-.45))*(1-Math.abs(by))
    const band=.5+.5*Math.sin(a*3.3+by*6.8)
    const c=deep.clone().lerp(mid,.32+.34*band).lerp(pale,.24*side).lerp(warm,.15*Math.max(0,Math.cos(a+1.0))*(1-Math.abs(by)))
    colors[i*3]=c.r; colors[i*3+1]=c.g; colors[i*3+2]=c.b
  }
  geometry.setAttribute('color',new THREE.BufferAttribute(colors,3))
  geometry.computeVertexNormals()
  return geometry
}

function orbVein(index:number) {
  const side=index%2?-1:1
  const points=Array.from({length:34},(_,i)=>{
    const t=i/33
    const y=.82-index*.075-t*(.98+index*.018)
    const width=.62*(1-.34*Math.max(0,-y))
    return new THREE.Vector3(side*width*(.52+.25*Math.sin(t*Math.PI+index*.41))+.05,y+.30,.52*Math.sin(t*Math.PI*1.08+index*.48)*(1-.24*t)+.04)
  })
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points,false,'centripetal',.36),64,.010+index*.00045,7,false)
}

type Posture={s:V3;r:V3;speed:number}
const posture:Record<OrbState,Posture>={
  dormant:{s:[.92,.89,.91],r:[.04,-.06,-.03],speed:.10}, idle:{s:[1,.99,.98],r:[-.04,.05,-.02],speed:.30},
  attention:{s:[1.035,1.05,.96],r:[-.10,.12,.05],speed:.62}, listening:{s:[.98,1.04,.97],r:[.08,-.06,-.04],speed:.22},
  thinking:{s:[1.02,.99,1.01],r:[-.11,.14,.07],speed:.18}, speaking:{s:[1.045,1.03,.97],r:[.03,-.02,-.08],speed:.80},
  guiding:{s:[.99,1.055,.96],r:[-.12,.02,.08],speed:.42}, reflecting:{s:[.99,.98,1.025],r:[.10,.08,-.06],speed:.14},
  calming:{s:[1.01,.97,.99],r:[-.02,-.04,.02],speed:.12}, privacy:{s:[.91,.91,.90],r:[.12,.08,.10],speed:.08},
  warning:{s:[1.04,1.045,.95],r:[-.14,-.06,-.10],speed:.95}, transition:{s:[.95,1.06,.93],r:[-.14,.04,.10],speed:.65},
}

function LivingMemoryOrb({state,reducedMotion,onOrb}:{state:OrbState;reducedMotion:boolean;onOrb:()=>void}) {
  const group=useRef<THREE.Group>(null)
  const geometry=useMemo(orbGeometry,[])
  const veins=useMemo(()=>Array.from({length:12},(_,i)=>orbVein(i)),[])
  const p=posture[state]
  useFrame(({clock})=>{
    if(!group.current)return
    const t=clock.elapsedTime*p.speed
    const breath = reducedMotion ? 1 : 1 + Math.sin(t * .78) * .007
    group.current.scale.set(p.s[0]*breath,p.s[1]*breath,p.s[2]*breath)
    group.current.rotation.set(p.r[0],p.r[1]+(reducedMotion ? 0 : Math.sin(t*.70)*.016),p.r[2])
  })
  const warning=state==='warning'
  const activate=(e:ThreeEvent<MouseEvent>)=>{e.stopPropagation();onOrb()}
  return <group ref={group} position={ORB} name="home-v225-v2-intimate-veined-living-memory-orb" onClick={activate}>
    <mesh geometry={geometry} position={[0,.34,0]} scale={[.96,.96,.96]} castShadow>
      <meshPhysicalMaterial vertexColors color="#dce9e3" roughness={.54} clearcoat={.13} clearcoatRoughness={.72} sheen={.22} sheenColor="#70a692" emissive="#123a31" emissiveIntensity={.13}/>
    </mesh>
    <group position={[0,.335,0]} scale={[.96,.96,.96]} name="home-v225-v2-orb-embedded-memory-veins">
      {veins.map((g,i)=><mesh key={i} geometry={g}><meshStandardMaterial color={warning?'#db7b68':i%2?'#99d0bb':'#d0a087'} emissive={warning?'#8a392f':i%2?'#397965':'#7d513a'} emissiveIntensity={.58} roughness={.58}/></mesh>)}
    </group>
    <mesh position={[0,.34,0]} scale={[1.02,1.16,.84]} onClick={activate}><sphereGeometry args={[1,28,20]}/><meshBasicMaterial transparent opacity={0} depthWrite={false}/></mesh>
    <pointLight position={[.12,.54,.42]} color={warning?'#d56d5d':'#78d1b1'} intensity={state==='dormant'?.18:.92} distance={3.8}/>
  </group>
}

function AtmosphericDepth() {
  const field=useMemo(()=>{
    const pts:number[]=[]
    for(let i=0;i<260;i++){
      const a=i*2.39996323
      const r=1.8+((i*37)%100)/100*9.8
      pts.push(Math.cos(a)*r,.45+((i*29)%100)/100*4.8,3.6-((i*53)%100)/100*20.0)
    }
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pts,3));return g
  },[])
  return <group name="home-v225-v2-bounded-atmospheric-depth">
    <points geometry={field}><pointsMaterial color="#bad7c8" size={.020} transparent opacity={.28} depthWrite={false}/></points>
    <pointLight position={[0,4,-12]} color="#79aa97" intensity={1.0} distance={16}/>
    <pointLight position={[-5.2,2.4,-8]} color="#ca8e67" intensity={.72} distance={10}/>
    <pointLight position={[5.0,2.8,-10]} color="#8899c5" intensity={.58} distance={10}/>
  </group>
}

export function HomeV225PolishV2({orbState,reducedMotion,onOrb,onGround,onLifeMap,onWalk}:{orbState:OrbState;reducedMotion:boolean;onOrb:()=>void;onGround:()=>void;onLifeMap:()=>void;onWalk:WalkHandler}) {
  return <group name="home-v225-v2-production-memory-sanctuary">
    <RetireRejectedPresentation/>
    <MemoryValley onWalk={onWalk}/>
    <LayeredMemoryWalls/>
    <GroundHearth onGround={onGround}/>
    <LifeMapObservatory onLifeMap={onLifeMap}/>
    <LivingMemoryOrb state={orbState} reducedMotion={reducedMotion} onOrb={onOrb}/>
    <AtmosphericDepth/>
  </group>
}
