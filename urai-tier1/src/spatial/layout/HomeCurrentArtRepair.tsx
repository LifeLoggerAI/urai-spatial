'use client'

import { Suspense, useEffect, useMemo, useRef } from 'react'
import { useGLTF } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import type { OrbState } from '@/app/home/orbStateController'
import { GROUND, LIFE_MAP, ORB, height } from './HomeWorldProductionV223Geometry'

const ROCK_FACE = {
  '01': '/assets/urai/home-production/cc0/polyhaven-v48/rock_face_01/asset.gltf',
  '02': '/assets/urai/home-production/cc0/polyhaven-v48/rock_face_02/asset.gltf',
} as const

function weatheredStone(seed: number, detail = 3) {
  const geometry = new THREE.IcosahedronGeometry(1, detail)
  const p = geometry.getAttribute('position') as THREE.BufferAttribute
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i)
    const broad = .055 * Math.sin(x * 4.2 + seed) + .038 * Math.cos(y * 6.8 - z * 3.4 + seed * .7)
    const fine = .018 * Math.sin((x + z) * 15.1 + seed * 1.7)
    const r = 1 + broad + fine
    p.setXYZ(i, x * r, y * r, z * r)
  }
  geometry.computeVertexNormals()
  return geometry
}

function tube(points: THREE.Vector3[], radius: number, radial = 9) {
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points, false, 'centripetal', .42), 64, radius, radial, false)
}

function teardropCore() {
  const g = new THREE.SphereGeometry(1, 48, 36)
  const p = g.getAttribute('position') as THREE.BufferAttribute
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i)
    const ny = (y + 1) * .5
    const upper = .82 + .22 * Math.sin(Math.PI * THREE.MathUtils.clamp(ny, 0, 1))
    const lowerTaper = THREE.MathUtils.lerp(.48, 1, THREE.MathUtils.smoothstep(y, -.92, .18))
    const asym = 1 + .035 * Math.sin(x * 4.8 + z * 3.1)
    p.setXYZ(i, x * .72 * lowerTaper * asym, y * .96 - .08, z * .58 * upper * asym)
  }
  g.computeVertexNormals()
  return g
}

function RetireSupersededShapes() {
  const { scene } = useThree()
  useEffect(() => {
    const exact = new Set([
      'home-v231-ground-weathered-threshold',
      'home-v228-life-map-rooted-branching-threshold',
      'home-current-ground-geological-descent',
      'home-current-life-map-rooted-ascent',
      'home-current-orb-surface-memory',
      'home-current-foreground-geological-breakup',
      'home-current-atmospheric-depth-field',
    ])
    const changed: THREE.Object3D[] = []
    scene.traverse((object) => {
      if (exact.has(object.name) && object.visible) {
        object.visible = false
        changed.push(object)
      }
    })
    return () => changed.forEach((object) => { object.visible = true })
  }, [scene])
  return null
}

function ScannedRock({ variant, position, rotation, scale }: {
  variant: '01' | '02'
  position: [number, number, number]
  rotation: [number, number, number]
  scale: [number, number, number]
}) {
  const asset = useGLTF(ROCK_FACE[variant])
  const model = useMemo(() => {
    const clone = asset.scene.clone(true)
    clone.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.castShadow = false
        object.receiveShadow = true
        const source = object.material
        if (source instanceof THREE.MeshStandardMaterial) {
          const material = source.clone()
          material.roughness = Math.max(.82, material.roughness)
          material.metalness = 0
          material.color.multiplyScalar(.72)
          object.material = material
        }
      }
    })
    return clone
  }, [asset.scene])
  useEffect(() => () => model.traverse((object) => {
    if (object instanceof THREE.Mesh && object.material instanceof THREE.Material) object.material.dispose()
  }), [model])
  return <primitive object={model} position={position} rotation={rotation} scale={scale}/>
}

function GroundThresholdV234() {
  const y = height(GROUND.x, GROUND.z)
  const support = useMemo(() => Array.from({ length: 5 }, (_, i) => weatheredStone(41 + i * 9, 3)), [])
  useEffect(() => () => support.forEach((g) => g.dispose()), [support])
  const supportPlacement = [
    { p: [-1.52,.22,-1.60] as [number,number,number], s: [.62,.48,.82] as [number,number,number], r: [0,.15,.06] as [number,number,number] },
    { p: [1.44,.18,-1.72] as [number,number,number], s: [.55,.45,.80] as [number,number,number], r: [0,-.2,-.04] as [number,number,number] },
    { p: [-.78,2.18,-1.95] as [number,number,number], s: [.58,.32,.64] as [number,number,number], r: [.08,.28,-.1] as [number,number,number] },
    { p: [.12,2.38,-2.08] as [number,number,number], s: [.66,.28,.62] as [number,number,number], r: [-.04,.12,.05] as [number,number,number] },
    { p: [.84,2.08,-1.92] as [number,number,number], s: [.54,.34,.60] as [number,number,number], r: [.06,-.22,.08] as [number,number,number] },
  ]
  return <group position={[GROUND.x,y,GROUND.z]} name="home-v234-ground-scanned-stone-threshold" userData={{ artRevision:'v234-scanned-stone-cavern-mouth', visualIntent:'irregular-natural-cave-not-rock-ring' }}>
    <Suspense fallback={null}>
      <ScannedRock variant="01" position={[-1.38,-.28,-1.88]} rotation={[.12,.45,-.18]} scale={[1.32,1.46,1.28]}/>
      <ScannedRock variant="02" position={[1.32,-.22,-1.90]} rotation={[-.08,-.62,.12]} scale={[1.28,1.42,1.18]}/>
      <ScannedRock variant="02" position={[-.34,1.38,-2.14]} rotation={[.42,.15,-.48]} scale={[1.08,.72,.98]}/>
      <ScannedRock variant="01" position={[.54,1.48,-2.18]} rotation={[.35,-.22,.42]} scale={[1.02,.70,.94]}/>
    </Suspense>
    {support.map((g,i)=><mesh key={i} geometry={g} position={supportPlacement[i].p} rotation={supportPlacement[i].r} scale={supportPlacement[i].s} receiveShadow>
      <meshPhysicalMaterial color={i%2?'#3b403a':'#49483f'} roughness={.96} metalness={0} clearcoat={.015} clearcoatRoughness={.96}/>
    </mesh>)}
    <mesh position={[0,.78,-2.46]} scale={[1.02,1.34,.18]}>
      <sphereGeometry args={[1,40,28]}/>
      <meshStandardMaterial color="#05090a" emissive="#2b1510" emissiveIntensity={.22} roughness={1}/>
    </mesh>
    <mesh position={[0,-.02,-1.22]} rotation={[-Math.PI/2,0,0]}>
      <ringGeometry args={[.45,1.34,64]}/>
      <meshStandardMaterial color="#4b4135" emissive="#4d2619" emissiveIntensity={.08} roughness={.98} transparent opacity={.72}/>
    </mesh>
    <pointLight position={[-.12,.54,-2.12]} color="#d48760" intensity={1.35} distance={4.6} decay={2}/>
    <spotLight position={[.15,3.05,-.65]} target-position={[0,.55,-2.1]} color="#f0c49c" intensity={.42} distance={7.4} angle={.34} penumbra={.96} decay={2}/>
  </group>
}

function LifeMapThresholdV234() {
  const y = height(LIFE_MAP.x, LIFE_MAP.z)
  const roots = useMemo(() => {
    const specs = [
      [-1,-1.66,-.05,-1.24,.70,-.70,1.62,-.20,2.48] as const,
      [-1,-1.38,-.10,-1.06,.54,-.55,1.44,-.02,2.34] as const,
      [-1,-1.08,-.05,-.88,.38,-.42,1.28,.18,2.18] as const,
      [1,1.50,-.10,1.14,.54,.62,1.46,.08,2.40] as const,
      [1,1.22,-.05,.96,.43,.48,1.32,-.12,2.24] as const,
      [1,.96,-.02,.78,.34,.36,1.18,-.24,2.02] as const,
    ]
    return specs.map((s,i)=>tube([
      new THREE.Vector3(s[1],-.10,.18 + i*.025),
      new THREE.Vector3(s[3],s[4],-.18 - i*.035),
      new THREE.Vector3(s[5],s[6],-.50 - i*.03),
      new THREE.Vector3(s[7],s[8],-.70 - i*.025),
    ], .095 - (i%3)*.012, 10))
  }, [])
  const innerLoops = useMemo(() => [
    new THREE.TorusGeometry(.64,.025,8,72),
    new THREE.TorusGeometry(.83,.018,8,72),
  ], [])
  useEffect(() => () => { roots.forEach(g=>g.dispose()); innerLoops.forEach(g=>g.dispose()) }, [roots,innerLoops])
  return <group position={[LIFE_MAP.x,y,LIFE_MAP.z]} rotation={[0,.06,0]} name="home-v234-life-map-rooted-observatory" userData={{ artRevision:'v234-thin-rooted-lineage-observatory', visualIntent:'weathered-branches-not-candy-bands' }}>
    <Suspense fallback={null}>
      <ScannedRock variant="02" position={[-1.28,-.58,.06]} rotation={[0,.58,-.08]} scale={[.94,.56,.82]}/>
      <ScannedRock variant="01" position={[1.26,-.55,.04]} rotation={[0,-.72,.08]} scale={[.92,.54,.80]}/>
    </Suspense>
    {roots.map((g,i)=><mesh key={i} geometry={g} castShadow receiveShadow>
      <meshPhysicalMaterial color={i%2?'#536159':'#655e64'} emissive={i%2?'#153029':'#2c2530'} emissiveIntensity={.055} roughness={.88} metalness={.015} clearcoat={.03} clearcoatRoughness={.9}/>
    </mesh>)}
    {innerLoops.map((g,i)=><mesh key={`loop-${i}`} geometry={g} position={[.02,1.32,-.73-i*.035]} scale={[1,1.12,1]}>
      <meshStandardMaterial color={i?'#8da8a0':'#b19da9'} emissive={i?'#315c55':'#5a3d52'} emissiveIntensity={.22} roughness={.52} transparent opacity={.46} depthWrite={false}/>
    </mesh>)}
    <mesh position={[0,1.30,-.82]} scale={[.82,1.16,.13]}>
      <sphereGeometry args={[1,48,32]}/>
      <meshPhysicalMaterial color="#071012" emissive="#24545b" emissiveIntensity={.18} roughness={.4} transparent opacity={.64} transmission={.04} depthWrite={false}/>
    </mesh>
    <pointLight position={[0,1.38,-.62]} color="#8fc8bb" intensity={.68} distance={4.9} decay={2}/>
    <spotLight position={[-.25,3.35,.65]} target-position={[0,1.3,-.7]} color="#a5bfc3" intensity={.38} distance={7.4} angle={.30} penumbra={.96} decay={2}/>
  </group>
}

const intensity: Record<OrbState, number> = {
  dormant:.05,idle:.14,attention:.28,listening:.22,thinking:.25,speaking:.32,guiding:.23,reflecting:.18,calming:.12,privacy:.20,warning:.35,transition:.24,
}

function LivingMemoryHeartV234({ state, reducedMotion }: { state: OrbState; reducedMotion: boolean }) {
  const root = useRef<THREE.Group>(null)
  const y = height(ORB.x, ORB.z)
  const core = useMemo(teardropCore, [])
  const ribs = useMemo(() => Array.from({length:6},(_,i)=>tube([
    new THREE.Vector3((i%2?-1:1)*.04,-.54,.42),
    new THREE.Vector3((i%2?-1:1)*(.17+i*.018),-.16+i*.045,.55),
    new THREE.Vector3((i%2?-1:1)*(.28+i*.015),.26+i*.04,.49),
    new THREE.Vector3((i%2?-1:1)*(.20+i*.012),.66-i*.015,.24),
  ],.010 + (i%2)*.003,7)),[])
  const halos = useMemo(()=>[
    new THREE.TorusGeometry(.57,.014,7,80),
    new THREE.TorusGeometry(.72,.010,7,88),
  ],[])
  useEffect(()=>()=>{core.dispose();ribs.forEach(g=>g.dispose());halos.forEach(g=>g.dispose())},[core,ribs,halos])
  useFrame(({clock})=>{
    if(!root.current||reducedMotion)return
    const t=clock.elapsedTime
    root.current.position.y=y+1.18+Math.sin(t*.62)*.022
    root.current.rotation.y=-.16+Math.sin(t*.23)*.035
    root.current.rotation.z=.035+Math.sin(t*.37)*.012
  })
  const e=intensity[state]*(reducedMotion?.8:1)
  const warning=state==='warning', privacy=state==='privacy'
  const glow=warning?'#7f3929':privacy?'#315f68':'#315b4e'
  const skin=warning?'#9a6556':privacy?'#72919a':'#827e6e'
  return <group ref={root} position={[ORB.x,y+1.18,ORB.z]} rotation={[.04,-.16,.035]} scale={1.12} name="home-v234-living-memory-heart" userData={{ artRevision:'v234-sculptural-living-memory-seed-heart', visualIntent:'single-asymmetric-presence-not-clover' }}>
    <mesh geometry={core} castShadow receiveShadow>
      <meshPhysicalMaterial color={skin} emissive={glow} emissiveIntensity={e*.58} roughness={.39} metalness={.02} clearcoat={.22} clearcoatRoughness={.38}/>
    </mesh>
    <mesh position={[-.24,.43,.08]} scale={[.52,.48,.44]}>
      <sphereGeometry args={[.66,36,26]}/>
      <meshPhysicalMaterial color="#706a61" emissive={glow} emissiveIntensity={e*.32} roughness={.44} clearcoat={.12}/>
    </mesh>
    <mesh position={[.19,.48,-.01]} scale={[.46,.44,.40]}>
      <sphereGeometry args={[.64,36,26]}/>
      <meshPhysicalMaterial color="#8b8371" emissive={glow} emissiveIntensity={e*.40} roughness={.40} clearcoat={.16}/>
    </mesh>
    {ribs.map((g,i)=><mesh key={i} geometry={g}>
      <meshStandardMaterial color={i%2?'#aa9b86':'#9aafa2'} emissive={glow} emissiveIntensity={e*.92} roughness={.46} metalness={.04}/>
    </mesh>)}
    {halos.map((g,i)=><mesh key={`halo-${i}`} geometry={g} rotation={[i?.18:-.12,i?.42:-.32,i?.16:-.10]}>
      <meshStandardMaterial color={i?'#7eaaa0':'#b28e79'} emissive={glow} emissiveIntensity={e*.72} transparent opacity={.17-i*.035} depthWrite={false}/>
    </mesh>)}
    <pointLight color={warning?'#bd6046':privacy?'#6c9fae':'#76a995'} intensity={.40+e*.8} distance={4.4} decay={2}/>
  </group>
}

function SubtleAtmosphereV234({ reducedMotion }: { reducedMotion: boolean }) {
  const root=useRef<THREE.Points>(null)
  const geometry=useMemo(()=>{
    const count=96, p=new Float32Array(count*3), c=new Float32Array(count*3)
    const warm=new THREE.Color('#bd9d75'), cool=new THREE.Color('#769e96')
    for(let i=0;i<count;i++){
      const t=i/count,a=i*2.39996323,r=3+Math.sqrt(t)*9
      const x=Math.cos(a)*r,z=2.2-t*20+Math.sin(i*.71)*.55,y=height(x,z)+.75+(i%11)*.17
      p.set([x,y,z],i*3);const cc=warm.clone().lerp(cool,.42+.36*((i%7)/6));c.set([cc.r,cc.g,cc.b],i*3)
    }
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(p,3));g.setAttribute('color',new THREE.BufferAttribute(c,3));return g
  },[])
  useEffect(()=>()=>geometry.dispose(),[geometry])
  useFrame(({clock})=>{if(root.current&&!reducedMotion)root.current.position.y=Math.sin(clock.elapsedTime*.12)*.018})
  return <points ref={root} geometry={geometry} frustumCulled={false} name="home-v234-subtle-atmospheric-depth">
    <pointsMaterial size={.018} sizeAttenuation transparent opacity={.20} vertexColors depthWrite={false} blending={THREE.AdditiveBlending}/>
  </points>
}

export function HomeCurrentArtRepair({ orbState, reducedMotion }: { orbState: OrbState; reducedMotion: boolean }) {
  return <group name="home-current-authority-art-repair" userData={{ artRevision:'v234-scanned-stone-rooted-observatory-sculptural-heart' }}>
    <RetireSupersededShapes/>
    <GroundThresholdV234/>
    <LifeMapThresholdV234/>
    <LivingMemoryHeartV234 state={orbState} reducedMotion={reducedMotion}/>
    <SubtleAtmosphereV234 reducedMotion={reducedMotion}/>
  </group>
}
