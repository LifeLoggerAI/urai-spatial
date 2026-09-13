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
        material.color.lerp(new THREE.Color(tint), .14)
        material.roughness = THREE.MathUtils.clamp(material.roughness, .68, .94)
        material.metalness = 0
        material.envMapIntensity = 1.08
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

function FernCluster({ position, rotation = 0, scale = 1, spread = 1 }: { position: V3; rotation?: number; scale?: number; spread?: number }) {
  const gltf = useGLTF(FERN)
  const plants = useMemo(() => {
    const names = ['fern_02_a', 'fern_02_b', 'fern_02_c', 'fern_02_d']
    return Array.from({ length: 9 }, (_, index) => {
      const source = gltf.scene.getObjectByName(names[index % names.length])
      if (!source) return null
      const clone = source.clone(true)
      const angle = index * 2.39996323 + rotation * .18
      const radius = (.14 + (index % 5) * .12) * spread
      clone.position.set(Math.cos(angle) * radius, 0, Math.sin(angle) * radius * .78)
      clone.rotation.y = angle + index * .17
      const s = .68 + (index % 6) * .10
      clone.scale.set(s * (.92 + (index % 3) * .06), s * (1.06 + (index % 4) * .08), s)
      clone.traverse((object) => {
        object.raycast = () => undefined
        if (object instanceof THREE.Mesh) { object.castShadow = index < 3; object.receiveShadow = true }
      })
      return clone
    }).filter((plant): plant is THREE.Object3D => Boolean(plant))
  }, [gltf.scene, rotation, spread])
  return <group position={position} rotation={[0, rotation, 0]} scale={scale} userData={{ visualOnly: true, interactionOwner: false }}>{plants.map((plant, index) => <primitive key={index} object={plant} />)}</group>
}

function memoryLightsGeometry() {
  const count = 148
  const positions = new Float32Array(count * 3)
  const colors = new Float32Array(count * 3)
  const ember = new THREE.Color('#d39a6f'), moss = new THREE.Color('#7ca393'), pearl = new THREE.Color('#d8c7a1')
  for (let index = 0; index < count; index++) {
    const depth = index / (count - 1)
    const side = index % 2 ? -1 : 1
    const lane = 3.2 + (index % 11) * .34
    const x = side * lane + Math.sin(index * 1.71) * .28
    const z = 3.2 - depth * 20.4 + Math.cos(index * .63) * .38
    const y = height(x,z) + .22 + (index % 9) * .075
    positions.set([x,y,z], index * 3)
    const color = ember.clone().lerp(moss, .22 + .50 * ((index % 17) / 16)).lerp(pearl, index % 19 === 0 ? .30 : 0)
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
  useFrame(({ clock }) => { if (points.current && !reducedMotion) points.current.position.y = Math.sin(clock.elapsedTime * .11) * .014 })
  return <points ref={points} geometry={geometry} raycast={() => null} frustumCulled={false} name="home-v254-localized-history-light-field"><pointsMaterial vertexColors size={.024} transparent opacity={.34} depthWrite={false} sizeAttenuation /></points>
}

function FramingFormations() {
  const specs: Array<{ variant:keyof typeof ROCKS; x:number; z:number; sx:number; sy:number; sz:number; ry:number; sink:number }> = [
    {variant:'a',x:-7.8,z:4.6,sx:2.55,sy:1.65,sz:2.15,ry:.72,sink:.74},{variant:'b',x:7.5,z:3.9,sx:2.75,sy:1.72,sz:2.22,ry:-.86,sink:.78},
    {variant:'b',x:-8.6,z:-.4,sx:3.05,sy:1.92,sz:2.42,ry:1.20,sink:.88},{variant:'a',x:8.5,z:-1.2,sx:2.95,sy:1.86,sz:2.35,ry:-1.10,sink:.84},
    {variant:'a',x:-9.1,z:-6.3,sx:3.35,sy:2.08,sz:2.68,ry:.43,sink:.98},{variant:'b',x:9.0,z:-7.1,sx:3.20,sy:2.02,sz:2.62,ry:-.54,sink:.98},
    {variant:'b',x:-8.7,z:-12.2,sx:3.05,sy:1.96,sz:2.52,ry:1.02,sink:1.06},{variant:'a',x:8.7,z:-12.8,sx:3.16,sy:2.02,sz:2.58,ry:-.91,sink:1.08},
    {variant:'a',x:-7.2,z:-17.3,sx:3.40,sy:2.20,sz:2.82,ry:.64,sink:1.14},{variant:'b',x:7.4,z:-17.8,sx:3.30,sy:2.12,sz:2.86,ry:-.70,sink:1.16},
  ]
  return <Suspense fallback={null}><group name="home-v254-scanned-foreground-midground-depth" userData={{ visualOnly:true, interactionOwner:false, morphology:'buried-irregular-geological-banks-no-ribs' }}>{specs.map((spec,index) => {
    const y = height(spec.x,spec.z)-spec.sink
    return <ScannedFormation key={index} variant={spec.variant} position={[spec.x,y,spec.z]} rotation={[index%2?.10:-.07,spec.ry,index%3?.04:-.05]} scale={[spec.sx,spec.sy,spec.sz]} tint={index%3===0?'#a49e8d':index%3===1?'#929988':'#a19787'} />
  })}</group></Suspense>
}

function VegetationDepth() {
  const anchors: Array<[number,number,number,number,number]> = [
    [-4.3,3.0,.1,1.18,1.15],[4.5,2.6,-.2,1.10,1.08],[-5.5,.7,.7,1.05,1.22],[5.8,.1,-.8,1.14,1.20],[-6.1,-3.2,.4,1.20,1.28],[6.3,-3.8,-.5,1.12,1.18],
    [-6.2,-7.1,.9,1.26,1.30],[6.4,-7.5,-.9,1.18,1.28],[-5.8,-10.6,.2,1.16,1.20],[5.9,-11.2,-.3,1.24,1.24],[-5.2,-14.7,.7,1.30,1.34],[5.4,-15.0,-.8,1.24,1.30],
    [-7.0,-17.5,.25,1.16,1.18],[7.1,-18.0,-.35,1.12,1.16],[-3.6,-17.8,.55,.92,1.12],[3.8,-18.2,-.6,.96,1.10],
  ]
  return <Suspense fallback={null}><group name="home-v254-authored-understory" userData={{ visualOnly:true, interactionOwner:false }}>{anchors.map(([x,z,r,s,spread],index)=><FernCluster key={index} position={[x,height(x,z)+.015,z]} rotation={r} scale={s} spread={spread}/>)}</group></Suspense>
}

function DistantOutcrops() {
  const specs: Array<{variant:keyof typeof ROCKS;x:number;z:number;s:number;ry:number}> = [
    {variant:'b',x:-10.8,z:-20.2,s:2.6,ry:.9},{variant:'a',x:10.3,z:-21.1,s:2.8,ry:-.8},
    {variant:'a',x:-5.4,z:-22.7,s:2.15,ry:.45},{variant:'b',x:5.9,z:-23.2,s:2.25,ry:-.5},
  ]
  return <Suspense fallback={null}><group name="home-v254-horizon-landmarks" userData={{visualOnly:true,interactionOwner:false,morphology:'scanned-distant-outcrops'}}>{specs.map((spec,index)=><ScannedFormation key={index} variant={spec.variant} position={[spec.x,height(spec.x,spec.z)-1.15,spec.z]} rotation={[index%2?.06:-.04,spec.ry,0]} scale={[spec.s,spec.s*.72,spec.s*.92]} tint={index%2?'#858b79':'#8c8574'} />)}</group></Suspense>
}

export function HomeLaunchSanctuaryV254({ reducedMotion }: { reducedMotion: boolean }) {
  return <group name="home-v254-launch-sanctuary-depth" userData={{ presentationRevision:'v254-launch-sanctuary-depth', visualOnly:true, interactionOwner:false, composition:'scanned-buried-geology-understory-history-field-distant-outcrops' }}>
    <RetireV253Dressing />
    <FramingFormations />
    <VegetationDepth />
    <DistantOutcrops />
    <LocalHistoryField reducedMotion={reducedMotion} />
    <hemisphereLight args={['#d8d1ba','#101815',.24]} />
    <directionalLight position={[-6.5,9.4,5.2]} color="#dbc8a7" intensity={.34} />
    <pointLight position={[-5.4,1.2,-7.8]} color="#c78a66" intensity={.48} distance={8.5} decay={2}/>
    <pointLight position={[5.6,1.4,-8.4]} color="#78a99b" intensity={.42} distance={8.8} decay={2}/>
    <pointLight position={[0,2.7,-14.8]} color="#c7b18d" intensity={.36} distance={13.5} decay={2}/>
  </group>
}
