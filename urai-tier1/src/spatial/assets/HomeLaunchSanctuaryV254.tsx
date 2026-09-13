'use client'

import { Suspense, useEffect, useMemo, useRef } from 'react'
import { useGLTF } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { height } from '../layout/HomeWorldProductionV223Geometry'

const ROCKS = {
  a: '/assets/urai/home-production/cc0/polyhaven-v48/rock_face_01/asset.gltf',
  b: '/assets/urai/home-production/cc0/polyhaven-v48/rock_face_02/asset.gltf',
} as const
const FERN = '/assets/urai/home-production/cc0/polyhaven-v48/fern_02/asset.gltf'

type V3 = [number, number, number]

function RetireV253Dressing() {
  const { scene } = useThree()
  const retired = useRef<THREE.Object3D | null>(null)
  const visible = useRef(true)
  useFrame(() => {
    const group = scene.getObjectByName('home-v253-authored-sanctuary-dressing')
    if (!group || retired.current === group) return
    retired.current = group
    visible.current = group.visible
    group.visible = false
  })
  useEffect(() => () => {
    if (retired.current) retired.current.visible = visible.current
  }, [])
  return null
}

function normalizeClone(scene: THREE.Object3D, tint: string, visualOnly = true) {
  const clone = scene.clone(true)
  const box = new THREE.Box3().setFromObject(clone)
  const size = box.getSize(new THREE.Vector3())
  const min = box.min.clone()
  const scale = 1 / Math.max(size.x, size.y, size.z, .001)
  clone.scale.setScalar(scale)
  clone.position.set(0, -min.y * scale, 0)
  clone.traverse((object) => {
    if (visualOnly) object.raycast = () => undefined
    if (!(object instanceof THREE.Mesh)) return
    object.castShadow = false
    object.receiveShadow = true
    const materials = Array.isArray(object.material) ? object.material : [object.material]
    const copies = materials.map((source) => {
      const material = source.clone()
      if (material instanceof THREE.MeshStandardMaterial) {
        material.color.multiply(new THREE.Color(tint))
        material.roughness = Math.max(.92, material.roughness)
        material.metalness = 0
        material.envMapIntensity = .68
      }
      return material
    })
    object.material = Array.isArray(object.material) ? copies : copies[0]
  })
  return clone
}

function ScannedFormation({ variant, position, rotation, scale, tint = '#a29b89' }: { variant: keyof typeof ROCKS; position: V3; rotation: V3; scale: V3; tint?: string }) {
  const gltf = useGLTF(ROCKS[variant])
  const model = useMemo(() => normalizeClone(gltf.scene, tint), [gltf.scene, tint])
  useEffect(() => () => model.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return
    const materials = Array.isArray(object.material) ? object.material : [object.material]
    materials.forEach((material) => material.dispose())
  }), [model])
  return <group position={position} rotation={rotation} scale={scale} userData={{ visualOnly: true, interactionOwner: false }}><primitive object={model} /></group>
}

function FernCluster({ position, rotation = 0, scale = 1 }: { position: V3; rotation?: number; scale?: number }) {
  const gltf = useGLTF(FERN)
  const plants = useMemo(() => {
    const names = ['fern_02_a', 'fern_02_b', 'fern_02_c', 'fern_02_d']
    return Array.from({ length: 7 }, (_, index) => {
      const source = gltf.scene.getObjectByName(names[index % names.length])
      if (!source) return null
      const clone = source.clone(true)
      const angle = index * 2.39996323
      const radius = .16 + (index % 4) * .11
      clone.position.set(Math.cos(angle) * radius, 0, Math.sin(angle) * radius * .74)
      clone.rotation.y = angle + index * .21
      const s = .72 + (index % 5) * .11
      clone.scale.set(s, s * (1.08 + (index % 3) * .09), s)
      clone.traverse((object) => {
        object.raycast = () => undefined
        if (object instanceof THREE.Mesh) { object.castShadow = index < 2; object.receiveShadow = true }
      })
      return clone
    }).filter((plant): plant is THREE.Object3D => Boolean(plant))
  }, [gltf.scene])
  return <group position={position} rotation={[0, rotation, 0]} scale={scale} userData={{ visualOnly: true, interactionOwner: false }}>{plants.map((plant, index) => <primitive key={index} object={plant} />)}</group>
}

function ribGeometry(side: -1 | 1, zBand: number, lift: number, seed: number) {
  const segments = 34
  const positions: number[] = []
  const indices: number[] = []
  for (let step = 0; step <= segments; step++) {
    const t = step / segments
    const x = side * THREE.MathUtils.lerp(8.9, 2.7, t)
    const z = zBand - t * 1.05 + Math.sin(t * Math.PI * 2 + seed) * .12
    const y = height(x, z) + .16 + Math.sin(t * Math.PI) * lift + t * .10
    const width = THREE.MathUtils.lerp(.42, .18, t)
    const thick = THREE.MathUtils.lerp(.22, .10, t)
    positions.push(x, y - thick, z - width, x, y - thick, z + width, x, y + thick, z - width, x, y + thick, z + width)
    if (step < segments) {
      const a = step * 4, b = a + 1, c = a + 2, d = a + 3, e = a + 4, f = a + 5, g = a + 6, h = a + 7
      indices.push(a,e,c,c,e,g, b,d,f,d,h,f, c,g,d,d,g,h, a,b,e,b,f,e)
    }
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}

function GrownStoneRibs() {
  const ribs = useMemo(() => [-5.8,-13.6].flatMap((z, index) => [
    ribGeometry(-1, z, 2.2 + index * .12, index + .2),
    ribGeometry(1, z-.44, 1.95 + index * .14, index + 1.7),
  ]), [])
  useEffect(() => () => ribs.forEach((geometry) => geometry.dispose()), [ribs])
  return <group name="home-v254-grown-stone-rib-architecture" userData={{ visualOnly: true, interactionOwner: false }}>
    {ribs.map((geometry, index) => <mesh key={index} geometry={geometry} raycast={() => null} receiveShadow>
      <meshStandardMaterial color={index % 2 ? '#62695f' : '#67665c'} emissive="#1d211d" emissiveIntensity={.045} roughness={.98} metalness={0} />
    </mesh>)}
  </group>
}

function memoryLightsGeometry() {
  const count = 300
  const positions = new Float32Array(count * 3)
  const colors = new Float32Array(count * 3)
  const ember = new THREE.Color('#d39a6f'), moss = new THREE.Color('#7ca393'), pearl = new THREE.Color('#d8c7a1')
  for (let index = 0; index < count; index++) {
    const depth = index / (count - 1)
    const side = index % 2 ? -1 : 1
    const lane = 2.7 + (index % 13) * .36
    const x = side * lane + Math.sin(index * 1.71) * .36
    const z = 3.4 - depth * 19.5 + Math.cos(index * .63) * .45
    const y = height(x,z) + .28 + (index % 11) * .10
    positions.set([x,y,z], index * 3)
    const color = ember.clone().lerp(moss, .18 + .58 * ((index % 17) / 16)).lerp(pearl, index % 23 === 0 ? .34 : 0)
    colors.set([color.r,color.g,color.b], index * 3)
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions,3))
  geometry.setAttribute('color', new THREE.BufferAttribute(colors,3))
  return geometry
}

function LocalHistoryField({ reducedMotion }: { reducedMotion: boolean }) {
  const points = useRef<THREE.Points>(null)
  const geometry = useMemo(memoryLightsGeometry, [])
  useEffect(() => () => geometry.dispose(), [geometry])
  useFrame(({ clock }) => { if (points.current && !reducedMotion) points.current.position.y = Math.sin(clock.elapsedTime * .13) * .022 })
  return <points ref={points} geometry={geometry} raycast={() => null} frustumCulled={false} name="home-v254-localized-history-light-field"><pointsMaterial vertexColors size={.030} transparent opacity={.48} depthWrite={false} sizeAttenuation /></points>
}

function FramingFormations() {
  const specs: Array<{ variant:keyof typeof ROCKS; x:number; z:number; sx:number; sy:number; sz:number; ry:number }> = [
    {variant:'a',x:-7.2,z:4.2,sx:3.3,sy:2.2,sz:2.6,ry:.72},{variant:'b',x:7.1,z:3.6,sx:3.6,sy:2.3,sz:2.8,ry:-.86},
    {variant:'b',x:-7.7,z:.2,sx:4.2,sy:2.8,sz:3.2,ry:1.20},{variant:'a',x:7.8,z:-.5,sx:4.1,sy:2.7,sz:3.1,ry:-1.10},
    {variant:'a',x:-8.1,z:-5.0,sx:5.0,sy:3.2,sz:3.8,ry:.43},{variant:'b',x:8.2,z:-5.8,sx:4.8,sy:3.2,sz:3.7,ry:-.54},
    {variant:'b',x:-7.4,z:-10.2,sx:4.5,sy:3.0,sz:3.4,ry:1.02},{variant:'a',x:7.5,z:-10.7,sx:4.6,sy:3.1,sz:3.5,ry:-.91},
    {variant:'a',x:-5.8,z:-15.0,sx:5.2,sy:3.6,sz:4.0,ry:.64},{variant:'b',x:5.9,z:-15.4,sx:5.0,sy:3.5,sz:4.1,ry:-.70},
  ]
  return <Suspense fallback={null}><group name="home-v254-scanned-foreground-midground-depth" userData={{ visualOnly:true, interactionOwner:false }}>{specs.map((spec,index) => {
    const y = height(spec.x,spec.z)-.48
    return <ScannedFormation key={index} variant={spec.variant} position={[spec.x,y,spec.z]} rotation={[index%2?.08:-.06,spec.ry,index%3?.03:-.04]} scale={[spec.sx,spec.sy,spec.sz]} tint={index%3===0?'#a9a28f':index%3===1?'#929b87':'#a69a88'} />
  })}</group></Suspense>
}

function VegetationDepth() {
  const anchors: Array<[number,number,number,number]> = [
    [-4.0,3.0,.1,1.25],[4.2,2.6,-.2,1.15],[-5.1,1.0,.7,1.1],[5.4,.5,-.8,1.22],[-5.7,-2.5,.4,1.30],[5.9,-3.0,-.5,1.18],
    [-5.5,-6.0,.9,1.36],[5.7,-6.6,-.9,1.28],[-5.0,-9.4,.2,1.22],[5.1,-9.9,-.3,1.34],[-4.4,-13.1,.7,1.46],[4.6,-13.4,-.8,1.38],
  ]
  return <Suspense fallback={null}><group name="home-v254-authored-understory" userData={{ visualOnly:true, interactionOwner:false }}>{anchors.map(([x,z,r,s],index)=><FernCluster key={index} position={[x,height(x,z)+.02,z]} rotation={r} scale={s}/>)}</group></Suspense>
}

function HorizonMarkers() {
  const pillar = useMemo(() => new THREE.CylinderGeometry(.18,.42,3.8,9), [])
  const cap = useMemo(() => new THREE.DodecahedronGeometry(.42,1), [])
  useEffect(() => () => { pillar.dispose(); cap.dispose() }, [cap,pillar])
  const markers: Array<[number,number,number]> = [[-9.6,-12.0,1],[9.5,-12.8,.92],[-8.2,-17.2,.78],[8.4,-17.7,.82],[-4.2,-19.2,.66],[4.5,-19.5,.70]]
  return <group name="home-v254-horizon-landmarks" userData={{visualOnly:true,interactionOwner:false}}>{markers.map(([x,z,s],index)=>{
    const y=height(x,z)
    return <group key={index} position={[x,y,z]} scale={s}>
      <mesh geometry={pillar} position={[0,1.55,0]} rotation={[index%2?.08:-.05,0,index%2?.08:-.07]} raycast={()=>null} receiveShadow><meshStandardMaterial color="#55554b" roughness={.98}/></mesh>
      <mesh geometry={cap} position={[0,3.45,0]} scale={[.72,1.45,.68]} raycast={()=>null}><meshStandardMaterial color={index%2?'#707761':'#766b58'} emissive={index%2?'#23322a':'#2d241b'} emissiveIntensity={.07} roughness={.94}/></mesh>
    </group>
  })}</group>
}

export function HomeLaunchSanctuaryV254({ reducedMotion }: { reducedMotion: boolean }) {
  return <group name="home-v254-launch-sanctuary-depth" userData={{ presentationRevision:'v254-launch-sanctuary-depth', visualOnly:true, interactionOwner:false, composition:'scanned-stone-foreground-grown-ribs-understory-history-field-horizon-landmarks' }}>
    <RetireV253Dressing />
    <FramingFormations />
    <GrownStoneRibs />
    <VegetationDepth />
    <HorizonMarkers />
    <LocalHistoryField reducedMotion={reducedMotion} />
    <pointLight position={[-5.0,1.6,-6.8]} color="#c78a66" intensity={.78} distance={9.5} decay={2}/>
    <pointLight position={[5.1,1.9,-7.4]} color="#78a99b" intensity={.68} distance={9.5} decay={2}/>
    <pointLight position={[0,3.0,-13.5]} color="#c7b18d" intensity={.52} distance={13.5} decay={2}/>
  </group>
}
