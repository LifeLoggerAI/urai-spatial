'use client'

import { Suspense, useEffect, useMemo, useRef } from 'react'
import { useGLTF } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { GROUND, LIFE_MAP, height } from '../layout/HomeWorldProductionV223Geometry'

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

function RetireProceduralThresholdScaffolds() {
  const { scene } = useThree()
  const retired = useRef(new Map<THREE.Object3D, boolean>())
  const pathState = useRef<{ material: THREE.MeshStandardMaterial; color: THREE.Color; roughness: number; envMapIntensity: number } | null>(null)
  useFrame(() => {
    for (const name of [
      'home-aaa-v281-authored-valley-shoulders',
      'home-aaa-v281-rooted-ascent-structure',
      'home-aaa-v281-rooted-ascent-ribbons',
    ]) {
      const object = scene.getObjectByName(name)
      if (!object || retired.current.has(object)) continue
      retired.current.set(object, object.visible)
      object.visible = false
    }
    if (pathState.current) return
    const path = scene.getObjectByName('home-v225-grown-winding-memory-path')
    if (!(path instanceof THREE.Mesh)) return
    const materials = Array.isArray(path.material) ? path.material : [path.material]
    const material = materials.find((candidate): candidate is THREE.MeshStandardMaterial => candidate instanceof THREE.MeshStandardMaterial)
    if (!material) return
    pathState.current = { material, color: material.color.clone(), roughness: material.roughness, envMapIntensity: material.envMapIntensity }
    material.color.set('#575347')
    material.roughness = .99
    material.envMapIntensity = .28
    material.needsUpdate = true
  })
  useEffect(() => () => {
    retired.current.forEach((visible, object) => { object.visible = visible })
    retired.current.clear()
    const saved = pathState.current
    if (saved) {
      saved.material.color.copy(saved.color)
      saved.material.roughness = saved.roughness
      saved.material.envMapIntensity = saved.envMapIntensity
      saved.material.needsUpdate = true
    }
    pathState.current = null
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
    object.castShadow = true
    object.receiveShadow = true
    const materials = Array.isArray(object.material) ? object.material : [object.material]
    const copies = materials.map((source) => {
      const material = source.clone()
      if (material instanceof THREE.MeshStandardMaterial) {
        material.color.lerp(new THREE.Color(tint), .08)
        material.roughness = THREE.MathUtils.clamp(material.roughness, .68, .92)
        material.metalness = 0
        material.envMapIntensity = 1.18
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
    return Array.from({ length: 6 }, (_, index) => {
      const source = gltf.scene.getObjectByName(names[index % names.length])
      if (!source) return null
      const clone = source.clone(true)
      const angle = index * 2.39996323 + rotation * .18
      const radius = (.12 + (index % 4) * .12) * spread
      clone.position.set(Math.cos(angle) * radius, 0, Math.sin(angle) * radius * .78)
      clone.rotation.y = angle + index * .17
      const s = .52 + (index % 5) * .08
      clone.scale.set(s * (.92 + (index % 3) * .05), s * (1.04 + (index % 4) * .07), s)
      clone.traverse((object) => {
        object.raycast = () => undefined
        if (object instanceof THREE.Mesh) { object.castShadow = index < 2; object.receiveShadow = true }
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
    {variant:'a',x:-5.8,z:4.2,sx:2.65,sy:1.95,sz:2.30,ry:.72,sink:.40},{variant:'b',x:5.7,z:3.7,sx:2.72,sy:2.00,sz:2.32,ry:-.86,sink:.42},
    {variant:'b',x:-6.0,z:-.4,sx:3.00,sy:2.16,sz:2.50,ry:1.20,sink:.48},{variant:'a',x:6.0,z:-1.1,sx:2.95,sy:2.10,sz:2.46,ry:-1.10,sink:.48},
    {variant:'a',x:-6.2,z:-5.0,sx:3.22,sy:2.28,sz:2.70,ry:.43,sink:.54},{variant:'b',x:6.2,z:-5.5,sx:3.18,sy:2.22,sz:2.68,ry:-.54,sink:.56},
    {variant:'b',x:-6.3,z:-11.8,sx:3.26,sy:2.30,sz:2.72,ry:1.02,sink:.62},{variant:'a',x:6.3,z:-12.2,sx:3.30,sy:2.32,sz:2.74,ry:-.91,sink:.64},
    {variant:'a',x:-5.8,z:-16.5,sx:3.42,sy:2.44,sz:2.90,ry:.64,sink:.72},{variant:'b',x:5.9,z:-16.8,sx:3.38,sy:2.40,sz:2.92,ry:-.70,sink:.74},
  ]
  return <Suspense fallback={null}><group name="home-v254-scanned-foreground-midground-depth" userData={{ visualOnly:true, interactionOwner:false, morphology:'buried-irregular-geological-banks-no-ribs' }}>{specs.map((spec,index) => {
    const y = height(spec.x,spec.z)-spec.sink
    return <ScannedFormation key={index} variant={spec.variant} position={[spec.x,y,spec.z]} rotation={[index%2?.10:-.07,spec.ry,index%3?.04:-.05]} scale={[spec.sx,spec.sy,spec.sz]} tint={index%3===0?'#9d9786':index%3===1?'#899486':'#9c8d7c'} />
  })}</group></Suspense>
}

function DestinationGeology() {
  const specs: Array<{ owner:'ground'|'life-map'; variant:keyof typeof ROCKS; x:number; z:number; scale:V3; rotation:V3; tint:string; sink:number }> = [
    {owner:'ground',variant:'a',x:GROUND.x-1.35,z:GROUND.z+.55,scale:[2.45,1.60,2.05],rotation:[-.08,.52,.04],tint:'#8e806d',sink:.54},
    {owner:'ground',variant:'b',x:GROUND.x+1.48,z:GROUND.z+.18,scale:[2.30,1.48,1.96],rotation:[.06,-.66,-.05],tint:'#827967',sink:.50},
    {owner:'ground',variant:'b',x:GROUND.x-.12,z:GROUND.z-2.05,scale:[2.72,1.72,2.28],rotation:[-.04,1.08,.03],tint:'#776f60',sink:.64},
    {owner:'life-map',variant:'b',x:LIFE_MAP.x-1.46,z:LIFE_MAP.z+.42,scale:[2.42,1.68,2.06],rotation:[.05,.76,-.04],tint:'#7f8c86',sink:.52},
    {owner:'life-map',variant:'a',x:LIFE_MAP.x+1.44,z:LIFE_MAP.z+.08,scale:[2.52,1.72,2.12],rotation:[-.07,-.82,.05],tint:'#85869a',sink:.54},
    {owner:'life-map',variant:'b',x:LIFE_MAP.x+.05,z:LIFE_MAP.z-2.10,scale:[2.80,1.82,2.34],rotation:[.03,-1.12,-.03],tint:'#737f86',sink:.68},
  ]
  return <Suspense fallback={null}><group name="home-v282-scanned-destination-geology" userData={{ visualOnly:true, interactionOwner:false, destinationRevision:'v282-ground-and-life-map-scanned-thresholds' }}>
    {specs.map((spec,index) => <group key={index} name={`home-v282-${spec.owner}-geology-${index}`}>
      <ScannedFormation variant={spec.variant} position={[spec.x,height(spec.x,spec.z)-spec.sink,spec.z]} rotation={spec.rotation} scale={spec.scale} tint={spec.tint}/>
    </group>)}
    <pointLight position={[GROUND.x,height(GROUND.x,GROUND.z)+.55,GROUND.z-.45]} color="#bd7858" intensity={.86} distance={5.4} decay={2}/>
    <pointLight position={[LIFE_MAP.x-.55,height(LIFE_MAP.x,LIFE_MAP.z)+1.05,LIFE_MAP.z-.55]} color="#7fb7aa" intensity={.72} distance={6.0} decay={2}/>
    <pointLight position={[LIFE_MAP.x+.72,height(LIFE_MAP.x,LIFE_MAP.z)+2.05,LIFE_MAP.z-1.35]} color="#a493bd" intensity={.46} distance={5.6} decay={2}/>
  </group></Suspense>
}

function VegetationDepth() {
  const anchors: Array<[number,number,number,number,number]> = [
    [-4.3,3.0,.1,.82,1.04],[4.5,2.6,-.2,.80,1.02],[-5.5,.7,.7,.78,1.08],[5.8,.1,-.8,.82,1.08],[-6.1,-3.2,.4,.84,1.12],[6.3,-3.8,-.5,.82,1.08],
    [-6.2,-7.1,.9,.86,1.12],[6.4,-7.5,-.9,.84,1.10],[-5.8,-10.6,.2,.78,1.04],[5.9,-11.2,-.3,.82,1.06],[-5.2,-14.7,.7,.88,1.12],[5.4,-15.0,-.8,.84,1.10],
    [-7.0,-17.5,.25,.78,1.00],[7.1,-18.0,-.35,.76,.98],[-3.6,-17.8,.55,.68,.94],[3.8,-18.2,-.6,.70,.94],
  ]
  return <Suspense fallback={null}><group name="home-v254-authored-understory" userData={{ visualOnly:true, interactionOwner:false }}>{anchors.map(([x,z,r,s,spread],index)=><FernCluster key={index} position={[x,height(x,z)+.015,z]} rotation={r} scale={s} spread={spread}/>)}</group></Suspense>
}

function DistantOutcrops() {
  const specs: Array<{variant:keyof typeof ROCKS;x:number;z:number;s:number;ry:number}> = [
    {variant:'b',x:-10.8,z:-20.2,s:2.6,ry:.9},{variant:'a',x:10.3,z:-21.1,s:2.8,ry:-.8},
    {variant:'a',x:-5.4,z:-22.7,s:2.15,ry:.45},{variant:'b',x:5.9,z:-23.2,s:2.25,ry:-.5},
  ]
  return <Suspense fallback={null}><group name="home-v254-horizon-landmarks" userData={{visualOnly:true,interactionOwner:false,morphology:'scanned-distant-outcrops'}}>{specs.map((spec,index)=><ScannedFormation key={index} variant={spec.variant} position={[spec.x,height(spec.x,spec.z)-.82,spec.z]} rotation={[index%2?.06:-.04,spec.ry,0]} scale={[spec.s,spec.s*.78,spec.s*.96]} tint={index%2?'#858b79':'#8c8574'} />)}</group></Suspense>
}

export function HomeLaunchSanctuaryV254({ reducedMotion }: { reducedMotion: boolean }) {
  return <group name="home-v254-launch-sanctuary-depth" userData={{ presentationRevision:'v254-launch-sanctuary-depth', destinationRevision:'v282-scanned-destination-geology', visualOnly:true, interactionOwner:false, composition:'scanned-buried-geology-understory-history-field-distant-outcrops' }}>
    <RetireV253Dressing />
    <RetireProceduralThresholdScaffolds />
    <FramingFormations />
    <DestinationGeology />
    <VegetationDepth />
    <DistantOutcrops />
    <LocalHistoryField reducedMotion={reducedMotion} />
    <hemisphereLight args={['#ddd7c4','#101815',.31]} />
    <directionalLight position={[-6.5,9.4,5.2]} color="#e2d0ae" intensity={.43} />
    <directionalLight position={[7.0,5.8,-11.0]} color="#8caca2" intensity={.16} />
    <pointLight position={[-5.4,1.2,-7.8]} color="#c78a66" intensity={.60} distance={8.5} decay={2}/>
    <pointLight position={[5.6,1.4,-8.4]} color="#78a99b" intensity={.56} distance={8.8} decay={2}/>
    <pointLight position={[0,2.7,-14.8]} color="#c7b18d" intensity={.42} distance={13.5} decay={2}/>
  </group>
}
