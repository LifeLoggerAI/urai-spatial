'use client'

import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'
import type { OrbState } from '@/app/home/orbStateController'
import { GROUND, LIFE_MAP, ORB, height } from './HomeWorldProductionV223Geometry'

type P = [number, number, number]

const hiddenLegacyNames = new Set([
  'home-v225-living-memory-grove',
  'home-v225-grown-winding-memory-path',
  'home-v225-ground-sheltered-memory-basin',
  'home-v225-life-map-rooted-memory-observatory',
  'home-v225-single-asymmetric-living-memory-presence',
])

function RetireRejectedV225Presentation() {
  const { scene } = useThree()
  useEffect(() => {
    const changed: THREE.Object3D[] = []
    scene.traverse((object) => {
      if (hiddenLegacyNames.has(object.name) || /^home-v225-(?:port|starboard)-overhanging-strata-/.test(object.name)) {
        if (object.visible) {
          object.visible = false
          changed.push(object)
        }
      }
    })
    return () => changed.forEach((object) => { object.visible = true })
  }, [scene])
  return null
}

function tube(points: THREE.Vector3[], radius: number, radial = 8) {
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points, false, 'centripetal', .35), Math.max(48, points.length * 5), radius, radial, false)
}

function OrganicTree({ x, z, heightScale, lean, warmth = 0 }: { x: number; z: number; heightScale: number; lean: number; warmth?: number }) {
  const y = height(x, z)
  const trunk = useMemo(() => tube(Array.from({ length: 18 }, (_, i) => {
    const t = i / 17
    return new THREE.Vector3(
      x + lean * t + .045 * Math.sin(t * 8 + x),
      y + .04 + heightScale * t,
      z + .08 * Math.sin(t * 5.3 + z),
    )
  }), .045 + heightScale * .011, 10), [heightScale, lean, x, y, z])
  const branches = useMemo(() => Array.from({ length: 6 }, (_, branch) => {
    const side = branch % 2 ? -1 : 1
    const start = .50 + branch * .06
    const startPoint = new THREE.Vector3(
      x + lean * start,
      y + heightScale * start,
      z + .06 * Math.sin(start * 5.3 + z),
    )
    const reach = .62 + (branch % 3) * .13
    const points = Array.from({ length: 12 }, (_, i) => {
      const t = i / 11
      return startPoint.clone().add(new THREE.Vector3(
        side * reach * t + .08 * Math.sin(t * 4 + branch),
        .42 * Math.sin(t * Math.PI) + .20 * t,
        -.34 * t + .12 * Math.sin(t * 3.2 + branch),
      ))
    })
    return { geometry: tube(points, .018 + (5 - branch) * .0015, 7), end: points[points.length - 1], side, branch }
  }), [heightScale, lean, x, y, z])
  const leafColor = warmth > .5 ? '#637258' : '#486b58'
  return <group name="home-v225-polish-botanical-memory-tree">
    <mesh geometry={trunk} castShadow receiveShadow><meshStandardMaterial color="#273b32" roughness={.96}/></mesh>
    {branches.map(({ geometry, end, branch }, i) => <group key={i}>
      <mesh geometry={geometry} castShadow><meshStandardMaterial color="#30483b" roughness={.95}/></mesh>
      {Array.from({ length: 5 }, (_, leaf) => {
        const a = leaf * 2.399 + branch * .61
        const r = .15 + .055 * (leaf % 3)
        const p: P = [end.x + Math.cos(a) * r, end.y + .03 * Math.sin(a * 1.7), end.z + Math.sin(a) * r]
        const s: P = [.18 + .03 * (leaf % 2), .10 + .025 * ((leaf + 1) % 3), .13 + .025 * (leaf % 3)]
        return <mesh key={leaf} position={p} scale={s} rotation={[.14 * Math.sin(a), a, .20 * Math.cos(a)]} castShadow>
          <sphereGeometry args={[1, 18, 12]}/><meshStandardMaterial color={leafColor} roughness={.91}/>
        </mesh>
      })}
    </group>)}
  </group>
}

function shelfGeometry(side: -1 | 1, index: number) {
  const geometry = new THREE.SphereGeometry(1, 48, 32)
  const p = geometry.getAttribute('position') as THREE.BufferAttribute
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i)
    const noise = 1 + .045 * Math.sin(x * 8 + index) * Math.sin(y * 7 - z * 4) + .025 * Math.sin(z * 11 + index * 2)
    p.setXYZ(i, x * noise, y * noise, z * noise)
  }
  geometry.computeVertexNormals()
  geometry.scale(2.05 + index * .12, .58 + index * .08, 2.8 + index * .52)
  geometry.rotateZ(side * (.10 + index * .02))
  return geometry
}

function LivingStrata() {
  const entries = useMemo(() => ([-1, 1] as const).flatMap((side) => Array.from({ length: 4 }, (_, index) => ({
    side,
    index,
    geometry: shelfGeometry(side, index),
    x: side * (7.05 + index * .22),
    y: .15 + index * .58,
    z: 1.6 - index * 4.7,
  }))), [])
  return <group name="home-v225-polish-layered-living-strata">
    {entries.map((entry) => <mesh key={`${entry.side}-${entry.index}`} geometry={entry.geometry} position={[entry.x, entry.y, entry.z]} castShadow receiveShadow>
      <meshStandardMaterial color={entry.side < 0 ? '#374c3e' : '#405244'} roughness={.95} metalness={0}/>
    </mesh>)}
  </group>
}

function RootNetwork() {
  const roots = useMemo(() => Array.from({ length: 12 }, (_, index) => {
    const side = index % 2 ? -1 : 1
    const z0 = 3.7 - Math.floor(index / 2) * 3.05
    const points = Array.from({ length: 18 }, (_, i) => {
      const t = i / 17
      const z = z0 - t * 2.9
      const x = side * (2.4 + t * 2.0 + .13 * Math.sin(index + t * 5))
      return new THREE.Vector3(x, height(x, z) + .035 + .055 * Math.sin(t * Math.PI), z)
    })
    return tube(points, .018 + .004 * (index % 3), 7)
  }), [])
  return <group name="home-v225-polish-rooted-memory-network">{roots.map((geometry, i) => <mesh key={i} geometry={geometry} castShadow>
    <meshStandardMaterial color={i % 2 ? '#405c4b' : '#6d6048'} roughness={.92}/>
  </mesh>)}</group>
}

function groundRib(index: number) {
  const side = index < 3 ? -1 : 1
  const local = index % 3
  const points = Array.from({ length: 26 }, (_, i) => {
    const t = i / 25
    const angle = THREE.MathUtils.lerp(-1.25, .88, t)
    const radius = 1.20 + local * .22
    return new THREE.Vector3(
      side * .15 + Math.cos(angle) * radius,
      .08 + Math.sin(t * Math.PI) * (1.25 + local * .18),
      -.12 + Math.sin(angle) * .72 - local * .10,
    )
  })
  return tube(points, .032 + local * .005, 8)
}

function GroundSanctuary() {
  const y = height(GROUND.x, GROUND.z)
  const ribs = useMemo(() => Array.from({ length: 6 }, (_, i) => groundRib(i)), [])
  return <group position={[GROUND.x, y, GROUND.z]} rotation={[0,.08,0]} name="home-v225-polish-ground-inhabited-hearth-grove">
    {ribs.map((geometry, i) => <mesh key={i} geometry={geometry} castShadow><meshStandardMaterial color={i % 2 ? '#536452' : '#6b5f49'} roughness={.90}/></mesh>)}
    <mesh position={[.04,.07,-.20]} scale={[.76,.10,.58]} castShadow receiveShadow>
      <sphereGeometry args={[1,36,24]}/><meshStandardMaterial color="#7f5b42" emissive="#6d3624" emissiveIntensity={.38} roughness={.88}/>
    </mesh>
    {Array.from({ length: 10 }, (_, i) => {
      const a = i / 10 * Math.PI * 2
      const r = .96 + .07 * Math.sin(i * 2.4)
      return <mesh key={i} position={[Math.cos(a)*r,.13 + .05*(i%3),Math.sin(a)*r*.72]} scale={[.09,.19,.09]} rotation={[.12,a,.18]} castShadow>
        <sphereGeometry args={[1,18,14]}/><meshStandardMaterial color={i % 2 ? '#596b58' : '#826f54'} emissive={i % 3 === 0 ? '#553223' : '#1d352d'} emissiveIntensity={.18} roughness={.91}/>
      </mesh>
    })}
    <pointLight position={[.05,.65,-.18]} color="#f0a574" intensity={3.4} distance={5.0}/>
    <pointLight position={[-.65,1.65,-.62]} color="#78b99b" intensity={.75} distance={4.2}/>
  </group>
}

function lineageBranch(branch: number) {
  const side = branch % 2 ? -1 : 1
  const level = Math.floor(branch / 2)
  const points = Array.from({ length: 32 }, (_, i) => {
    const t = i / 31
    const reach = .78 + level * .20
    return new THREE.Vector3(
      side * reach * Math.pow(t,.72) + .08 * Math.sin(branch + t * 5),
      .10 + t * (1.35 + level * .28) + .20 * Math.sin(t * Math.PI),
      -.18 - t * (.62 + level * .10) + .10 * Math.sin(t * 3 + branch),
    )
  })
  return { geometry: tube(points, .018 + level * .002, 7), end: points[points.length - 1] }
}

function LifeMapObservatory() {
  const y = height(LIFE_MAP.x, LIFE_MAP.z)
  const trunk = useMemo(() => tube(Array.from({ length: 34 }, (_, i) => {
    const t = i / 33
    return new THREE.Vector3(.05 * Math.sin(t * 8), .08 + t * 2.18, -.20 * t + .06 * Math.sin(t * 4.1))
  }), .045, 9), [])
  const branches = useMemo(() => Array.from({ length: 8 }, (_, i) => lineageBranch(i)), [])
  const bridge = useMemo(() => tube(Array.from({ length: 42 }, (_, i) => {
    const t = i / 41
    return new THREE.Vector3(-1.45 + 2.9 * t, .62 + .54 * Math.sin(t*Math.PI) + .06*Math.sin(t*9), -.70 - .22*Math.sin(t*Math.PI))
  }), .018, 7), [])
  return <group position={[LIFE_MAP.x,y,LIFE_MAP.z]} rotation={[0,-.10,0]} name="home-v225-polish-life-map-living-lineage-observatory">
    <mesh geometry={trunk} castShadow><meshPhysicalMaterial color="#607d70" emissive="#315d51" emissiveIntensity={.42} roughness={.58} clearcoat={.12}/></mesh>
    <mesh geometry={bridge}><meshPhysicalMaterial color="#9e8fb2" emissive="#5e4d75" emissiveIntensity={.60} roughness={.52} clearcoat={.16}/></mesh>
    {branches.map(({geometry,end}, i) => <group key={i}>
      <mesh geometry={geometry} castShadow><meshPhysicalMaterial color={i % 2 ? '#84b6a5' : '#9c8caf'} emissive={i % 2 ? '#356f5d' : '#635078'} emissiveIntensity={.52} roughness={.55}/></mesh>
      <mesh position={end} scale={[.13,.13,.13]}>
        <sphereGeometry args={[1,24,18]}/><meshPhysicalMaterial color={i % 2 ? '#b7d4c7' : '#c8b8d6'} emissive={i % 2 ? '#5a9a83' : '#80699b'} emissiveIntensity={1.05} roughness={.38}/>
      </mesh>
    </group>)}
    <pointLight position={[.0,1.35,-.25]} color="#87d3b8" intensity={2.25} distance={5.4}/>
    <pointLight position={[.8,1.95,-.75]} color="#c2a5da" intensity={1.65} distance={4.4}/>
  </group>
}

function orbGeometry() {
  const geometry = new THREE.SphereGeometry(1, 128, 96)
  const p = geometry.getAttribute('position') as THREE.BufferAttribute
  const colors = new Float32Array(p.count * 3)
  const deep = new THREE.Color('#12372f'), mid = new THREE.Color('#478977'), pale = new THREE.Color('#c4d9ce'), warm = new THREE.Color('#bd8b72')
  for (let i = 0; i < p.count; i++) {
    const bx = p.getX(i), by = p.getY(i), bz = p.getZ(i)
    const upper = Math.max(0, by), lower = Math.max(0,-by), angle = Math.atan2(bz,bx)
    const cleft = Math.exp(-Math.pow(bx/.22,2)-Math.pow((by-.74)/.22,2))
    const taper = 1-.52*Math.pow(lower,1.42)
    const fold = 1+.034*Math.sin(angle*3+by*7)+.018*Math.sin(angle*8-by*11)
    let x = bx*(.70+.20*upper)*taper*fold
    let z = bz*(.51+.08*upper)*taper*(1+.025*Math.sin(angle*5+by*4))
    let yy = by*1.02-.30*cleft-.20*Math.pow(lower,1.7)+.06*upper*Math.abs(bx)
    x += .065*(1-by*by)+.026*bz
    yy += .020*Math.sin(angle*3+by*9)*(1-Math.abs(by))
    z += .020*Math.sin(angle*2+by*5)*(1-Math.abs(by))
    p.setXYZ(i,x,yy,z)
    const side = Math.max(0,Math.cos(angle-.45))*(1-Math.abs(by))
    const band = .5+.5*Math.sin(angle*3.2+by*6.8)
    const c = deep.clone().lerp(mid,.34+.30*band).lerp(pale,.18*side).lerp(warm,.13*Math.max(0,Math.cos(angle+1.0))*(1-Math.abs(by)))
    colors[i*3]=c.r; colors[i*3+1]=c.g; colors[i*3+2]=c.b
  }
  geometry.setAttribute('color',new THREE.BufferAttribute(colors,3))
  geometry.computeVertexNormals()
  return geometry
}

function surfaceVein(index: number) {
  const side = index % 2 ? -1 : 1
  const start = .63-index*.10
  const points = Array.from({ length: 32 }, (_, i) => {
    const t = i/31
    const y = start-t*(.82+index*.025)
    const width = .46*(1-.38*Math.max(0,-y))
    const x = side*width*(.54+.22*Math.sin(t*Math.PI+index*.43))+.04
    const z = .42*Math.sin(t*Math.PI*1.12+index*.52)*(1-.30*t)
    return new THREE.Vector3(x,y+.33,z+.035)
  })
  return tube(points,.0065+index*.00035,6)
}

type Posture = { s:P; r:P; speed:number }
const posture: Record<OrbState,Posture> = {
  dormant:{s:[.92,.89,.91],r:[.04,-.06,-.03],speed:.10},idle:{s:[1,.99,.98],r:[-.04,.05,-.02],speed:.30},
  attention:{s:[1.035,1.05,.96],r:[-.10,.12,.05],speed:.62},listening:{s:[.98,1.04,.97],r:[.08,-.06,-.04],speed:.22},
  thinking:{s:[1.02,.99,1.01],r:[-.11,.14,.07],speed:.18},speaking:{s:[1.045,1.03,.97],r:[.03,-.02,-.08],speed:.80},
  guiding:{s:[.99,1.055,.96],r:[-.12,.02,.08],speed:.42},reflecting:{s:[.99,.98,1.025],r:[.10,.08,-.06],speed:.14},
  calming:{s:[1.01,.97,.99],r:[-.02,-.04,.02],speed:.12},privacy:{s:[.91,.91,.90],r:[.12,.08,.10],speed:.08},
  warning:{s:[1.04,1.045,.95],r:[-.14,-.06,-.10],speed:.95},transition:{s:[.95,1.06,.93],r:[-.14,.04,.10],speed:.65},
}

function LivingMemoryOrb({ state, reducedMotion, onOrb }: { state: OrbState; reducedMotion: boolean; onOrb: () => void }) {
  const group = useRef<THREE.Group>(null)
  const geometry = useMemo(orbGeometry,[])
  const veins = useMemo(() => Array.from({length:9},(_,i)=>surfaceVein(i)),[])
  const p = posture[state]
  useFrame(({clock})=>{
    if(!group.current)return
    const t=clock.elapsedTime*p.speed
    const breath=reducedMotion?1:1+Math.sin(t*.78)*.008
    group.current.scale.set(p.s[0]*breath,p.s[1]*breath,p.s[2]*breath)
    group.current.rotation.set(p.r[0],p.r[1]+(reducedMotion?0:Math.sin(t*.7)*.018),p.r[2])
  })
  const warning=state==='warning'
  const click=(event:ThreeEvent<MouseEvent>)=>{event.stopPropagation();onOrb()}
  return <group ref={group} position={ORB} name="home-v225-polish-intimate-asymmetric-living-memory-orb" onClick={click}>
    <mesh geometry={geometry} position={[0,.26,0]} scale={[.58,.58,.58]} castShadow>
      <meshPhysicalMaterial vertexColors color="#d7e5df" roughness={.63} clearcoat={.10} clearcoatRoughness={.80} sheen={.18} sheenColor="#6ca18f" emissive="#123a31" emissiveIntensity={.10}/>
    </mesh>
    <group position={[0,.255,0]} scale={[.58,.58,.58]} name="home-v225-polish-orb-surface-memory-veins">
      {veins.map((geometry,i)=><mesh key={i} geometry={geometry}><meshStandardMaterial color={warning?'#d77a68':i%2?'#8bc5b0':'#c79b82'} emissive={warning?'#8a392f':i%2?'#326e5c':'#754c36'} emissiveIntensity={.40} roughness={.66}/></mesh>)}
    </group>
    <mesh position={[0,.26,0]} scale={[.60,.72,.56]} onClick={click}><sphereGeometry args={[1,24,18]}/><meshBasicMaterial transparent opacity={0} depthWrite={false}/></mesh>
    <pointLight position={[.10,.38,.28]} color={warning?'#d56d5d':'#72c8ab'} intensity={state==='dormant'?.13:.52} distance={2.5}/>
  </group>
}

function AmbientMemoryField() {
  const geometry = useMemo(() => {
    const points: number[]=[]
    for(let i=0;i<180;i++){
      const a=i*2.39996323
      const r=2.4+((i*37)%100)/100*10.4
      const x=Math.cos(a)*r
      const z=4.5-((i*53)%100)/100*20.5
      const y=.45+((i*29)%100)/100*4.6
      points.push(x,y,z)
    }
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(points,3));return g
  },[])
  return <points geometry={geometry} name="home-v225-polish-bounded-memory-atmosphere"><pointsMaterial color="#9fc7b4" size={.018} transparent opacity={.26} depthWrite={false}/></points>
}

export function HomeV225PolishLayer({orbState,reducedMotion,onOrb}:{orbState:OrbState;reducedMotion:boolean;onOrb:()=>void}){
  return <group name="home-v225-polish-production-composition">
    <RetireRejectedV225Presentation/>
    <LivingStrata/>
    <RootNetwork/>
    <OrganicTree x={-2.7} z={-4.7} heightScale={2.0} lean={.12}/>
    <OrganicTree x={2.7} z={-5.1} heightScale={2.2} lean={-.10}/>
    <OrganicTree x={-2.9} z={-9.8} heightScale={2.5} lean={.14} warmth={1}/>
    <OrganicTree x={2.9} z={-10.7} heightScale={2.65} lean={-.13}/>
    <OrganicTree x={-2.3} z={-13.0} heightScale={2.8} lean={.11}/>
    <OrganicTree x={2.1} z={-13.6} heightScale={2.55} lean={-.08} warmth={1}/>
    <GroundSanctuary/>
    <LifeMapObservatory/>
    <LivingMemoryOrb state={orbState} reducedMotion={reducedMotion} onOrb={onOrb}/>
    <AmbientMemoryField/>
  </group>
}
