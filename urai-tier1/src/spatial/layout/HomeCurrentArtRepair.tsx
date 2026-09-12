'use client'

import { Suspense, useEffect, useMemo, useRef } from 'react'
import { useGLTF } from '@react-three/drei'
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'
import type { OrbState } from '@/app/home/orbStateController'
import { GROUND, LIFE_MAP, ORB, height } from './HomeWorldProductionV223Geometry'

const ROCK_FACE = {
  '01': '/assets/urai/home-production/cc0/polyhaven-v48/rock_face_01/asset.gltf',
  '02': '/assets/urai/home-production/cc0/polyhaven-v48/rock_face_02/asset.gltf',
} as const

function RetireSupersededShapes() {
  const { scene } = useThree()
  const hidden = useRef(new Set<THREE.Object3D>())
  const exact = useMemo(() => new Set([
    'home-v231-ground-weathered-threshold', 'home-v228-life-map-rooted-branching-threshold',
    'home-current-ground-geological-descent', 'home-current-life-map-rooted-ascent',
    'home-current-orb-surface-memory', 'home-current-foreground-geological-breakup',
    'home-current-atmospheric-depth-field', 'home-v226-ground-inhabited-hearth',
    'home-v226-life-map-lineage-observatory', 'home-v226-rooted-single-living-memory-presence',
  ]), [])
  useFrame(() => { scene.traverse((object) => { if (!exact.has(object.name) || !object.visible) return; object.visible = false; hidden.current.add(object) }) })
  useEffect(() => () => { hidden.current.forEach((object) => { object.visible = true }); hidden.current.clear() }, [])
  return null
}

function SuppressLegacyShadowArtifacts() {
  const { scene } = useThree()
  const changed = useRef(new Map<THREE.Mesh, boolean>())
  useFrame(() => {
    const ridge = scene.getObjectByName('home-v229-textured-inhabited-valley-and-distant-ridge')
    ridge?.traverse((object) => {
      if (!(object instanceof THREE.Mesh) || !object.castShadow) return
      if (!changed.current.has(object)) changed.current.set(object, object.castShadow)
      object.castShadow = false
    })
    scene.traverse((object) => {
      if (!(object instanceof THREE.Mesh) || !object.castShadow) return
      if (object.name !== 'rock_face_01' && object.name !== 'rock_face_02') return
      if (!changed.current.has(object)) changed.current.set(object, object.castShadow)
      object.castShadow = false
    })
  })
  useEffect(() => () => {
    changed.current.forEach((castShadow, object) => { object.castShadow = castShadow })
    changed.current.clear()
  }, [])
  return null
}

function ScannedRock({ variant, position, rotation, scale }: { variant: '01' | '02'; position: [number,number,number]; rotation: [number,number,number]; scale: [number,number,number] }) {
  const asset = useGLTF(ROCK_FACE[variant])
  const model = useMemo(() => {
    const clone = asset.scene.clone(true)
    const box = new THREE.Box3().setFromObject(clone)
    const size = box.getSize(new THREE.Vector3())
    const center = box.getCenter(new THREE.Vector3())
    const normalization = 1 / Math.max(size.x, size.y, size.z, .001)
    clone.scale.setScalar(normalization)
    clone.position.set(-center.x * normalization, -box.min.y * normalization, -center.z * normalization)
    clone.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return
      object.castShadow = false
      object.receiveShadow = true
      const sources = Array.isArray(object.material) ? object.material : [object.material]
      const materials = sources.map((source) => {
        const material = source.clone()
        if (material instanceof THREE.MeshStandardMaterial) {
          material.roughness = Math.max(.92, material.roughness)
          material.metalness = 0
          material.color.multiplyScalar(.98)
          material.envMapIntensity = .82
        }
        return material
      })
      object.material = Array.isArray(object.material) ? materials : materials[0]
    })
    return clone
  }, [asset.scene])
  useEffect(() => () => model.traverse((object) => { if (!(object instanceof THREE.Mesh)) return; const materials = Array.isArray(object.material) ? object.material : [object.material]; materials.forEach((material) => material.dispose()) }), [model])
  return <group position={position} rotation={rotation} scale={scale}><primitive object={model} /></group>
}

function apertureGeometry(width: number, heightValue: number, seed: number) {
  const segments = 96, positions = [0, 0, 0], indices: number[] = []
  for (let index = 0; index < segments; index++) { const angle = index / segments * Math.PI * 2; const weather = 1 + .075 * Math.sin(angle * 5 + seed) + .038 * Math.sin(angle * 11 - seed * .4); positions.push(Math.cos(angle) * width * weather, Math.sin(angle) * heightValue * weather, 0) }
  for (let index = 0; index < segments; index++) indices.push(0, index + 1, 1 + ((index + 1) % segments))
  const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)); geometry.setIndex(indices); geometry.computeVertexNormals(); return geometry
}

function wornPathGeometry(length = 3.4, startWidth = .46, endWidth = .22) {
  const segments = 36, positions: number[] = [], colors: number[] = [], indices: number[] = []
  const soil = new THREE.Color('#3a3229'), worn = new THREE.Color('#74604d')
  for (let index = 0; index <= segments; index++) {
    const t = index / segments, z = -.4 + t * length, center = .08 * Math.sin(t * 7.1) + .035 * Math.sin(t * 17), width = THREE.MathUtils.lerp(startWidth, endWidth, t) * (1 + .08 * Math.sin(index * 1.51))
    for (const side of [-1, 1] as const) { positions.push(center + side * width, -.02 + .008 * Math.sin(index * 1.3), z); const color = soil.clone().lerp(worn, .38 + .16 * Math.sin(t * 9 + side)); colors.push(color.r, color.g, color.b) }
    if (index < segments) { const a = index * 2, b = a + 1, c = a + 2, d = a + 3; indices.push(a, c, b, b, c, d) }
  }
  const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)); geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3)); geometry.setIndex(indices); geometry.computeVertexNormals(); return geometry
}

function GroundThresholdV234({ onGround }: { onGround: () => void }) {
  const y = height(GROUND.x, GROUND.z)
  const inner = useMemo(() => apertureGeometry(.34, .58, 5.2), [])
  const path = useMemo(() => wornPathGeometry(2.7, .28, .11), [])
  useEffect(() => () => { inner.dispose(); path.dispose() }, [inner, path])
  const activate = (event: ThreeEvent<MouseEvent>) => { event.stopPropagation(); onGround() }
  return <group position={[GROUND.x, y + .58, GROUND.z]} rotation={[0, -.08, 0]} name="home-v234-ground-scanned-stone-threshold" onClick={activate} userData={{ artRevision: 'v245-ground-cleft-shadow-slab-safe', visualIntent: 'eroded-cavern-cleft-owned-by-real-rock', semanticOwner: 'home-current-ground-geological-descent', morphology: 'weathered-world-emergent-descent' }}>
    <Suspense fallback={null}>
      <ScannedRock variant="01" position={[-.43, -.34, -.88]} rotation={[.20, .78, -.18]} scale={[1.30, 1.94, .86]} />
      <ScannedRock variant="02" position={[.43, -.35, -.90]} rotation={[-.16, -.88, .16]} scale={[1.28, 1.90, .84]} />
      <ScannedRock variant="02" position={[-.28, .48, -.94]} rotation={[.36, .44, .36]} scale={[.98, .80, .68]} />
      <ScannedRock variant="01" position={[.25, .53, -.98]} rotation={[-.30, -.40, -.32]} scale={[.96, .78, .66]} />
      <ScannedRock variant="01" position={[-.63, -.04, -.78]} rotation={[.06, 1.08, -.08]} scale={[.70, 1.10, .66]} />
      <ScannedRock variant="02" position={[.64, -.02, -.80]} rotation={[-.05, -1.12, .07]} scale={[.72, 1.08, .66]} />
    </Suspense>
    <mesh geometry={inner} position={[.02, .02, -.88]} scale={[.70, 1.04, .60]}><meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} /></mesh>
    <mesh geometry={path} position={[0, -.58, -.04]} receiveShadow><meshStandardMaterial vertexColors color="#74604d" roughness={1} /></mesh>
    <pointLight position={[.02, .08, -1.12]} color="#d18a61" intensity={.42} distance={2.4} decay={2} />
  </group>
}

function LifeMapThresholdV234({ onLifeMap }: { onLifeMap: () => void }) {
  const y = height(LIFE_MAP.x, LIFE_MAP.z)
  const inner = useMemo(() => apertureGeometry(.27, .64, 4.6), [])
  const path = useMemo(() => wornPathGeometry(2.5, .24, .10), [])
  const stars = useMemo(() => {
    const count = 140, positions = new Float32Array(count * 3), colors = new Float32Array(count * 3)
    const warm = new THREE.Color('#ccb894'), cool = new THREE.Color('#79a99f')
    for (let index = 0; index < count; index++) { const angle = index * 2.39996323, radius = .10 + Math.sqrt((index + .5) / count) * .42, depth = (index % 17) * .095; positions.set([Math.cos(angle) * radius, .72 + Math.sin(angle) * radius * 1.58, -.92 - depth], index * 3); const color = warm.clone().lerp(cool, (index % 9) / 8); colors.set([color.r, color.g, color.b], index * 3) }
    const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3)); geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3)); return geometry
  }, [])
  useEffect(() => () => { inner.dispose(); path.dispose(); stars.dispose() }, [inner, path, stars])
  const activate = (event: ThreeEvent<MouseEvent>) => { event.stopPropagation(); onLifeMap() }
  return <group position={[LIFE_MAP.x, y + .08, LIFE_MAP.z]} rotation={[0, .06, 0]} name="home-v234-life-map-rooted-observatory" onClick={activate} userData={{ artRevision: 'v245-lineage-rift-shadow-slab-safe', visualIntent: 'narrow-asymmetric-lineage-cleft-with-celestial-depth', semanticOwner: 'home-current-life-map-rooted-ascent', morphology: 'rooted-ascent-not-tube-portal' }}>
    <Suspense fallback={null}>
      <ScannedRock variant="02" position={[-.38, -.22, -.74]} rotation={[.12, .94, -.16]} scale={[1.18, 1.72, .80]} />
      <ScannedRock variant="01" position={[.38, -.24, -.76]} rotation={[.08, -1.00, .14]} scale={[1.16, 1.68, .78]} />
      <ScannedRock variant="01" position={[-.25, .60, -.86]} rotation={[.36, .52, .36]} scale={[.86, .78, .64]} />
      <ScannedRock variant="02" position={[.22, .66, -.90]} rotation={[-.32, -.46, -.34]} scale={[.84, .80, .62]} />
      <ScannedRock variant="02" position={[-.54, .08, -.74]} rotation={[.06,1.02,-.06]} scale={[.60,.94,.58]} />
    </Suspense>
    <mesh geometry={inner} position={[0, .12, -.78]} scale={[.66, 1.04, .56]}><meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} /></mesh>
    <mesh geometry={path} position={[0, -.08, .10]} rotation={[.08, 0, 0]} receiveShadow><meshStandardMaterial vertexColors color="#6f6756" roughness={1} /></mesh>
    <points geometry={stars}><pointsMaterial vertexColors size={.024} sizeAttenuation transparent opacity={.82} depthWrite={false} blending={THREE.AdditiveBlending} /></points>
    <pointLight position={[0, .72, -1.06]} color="#83b8ad" intensity={.38} distance={2.5} decay={2} />
  </group>
}

function livingMemoryGeometry() {
  const geometry = new THREE.IcosahedronGeometry(1, 4)
  const position = geometry.getAttribute('position') as THREE.BufferAttribute
  const colors: number[] = []
  const deep = new THREE.Color('#262821'), tissue = new THREE.Color('#8d8872'), scarColor = new THREE.Color('#c8c0a3')
  for (let index = 0; index < position.count; index++) {
    const nx = position.getX(index), ny = position.getY(index), nz = position.getZ(index)
    const angle = Math.atan2(nz, nx)
    const crown = THREE.MathUtils.smoothstep(ny, .05, .94)
    const lower = THREE.MathUtils.smoothstep(-ny, .12, .98)
    const centerCleft = Math.exp(-(nx * nx) / .040) * crown
    const leftLobe = Math.exp(-(((nx + .43) / .47) ** 2 + ((nz - .03) / .78) ** 2)) * crown
    const rightLobe = Math.exp(-(((nx - .34) / .44) ** 2 + ((nz + .10) / .74) ** 2)) * crown
    const side = Math.tanh(nx * 7.2)
    const weather = .10 * Math.sin(angle * 3.2 + ny * 5.2) + .045 * Math.sin(angle * 11 - ny * 7.8)
    const strata = .036 * Math.sin(ny * 18.0 + angle * 2.4)
    const rootTaper = THREE.MathUtils.lerp(.32, 1, THREE.MathUtils.smoothstep(ny, -.86, -.02))
    const radial = 1 + weather + strata + .22 * leftLobe + .15 * rightLobe
    let x = nx * radial * .68 * rootTaper + side * crown * .16 + ny * .07 - .035
    let z = nz * radial * .38 * rootTaper + .025 * Math.sin(ny * 6.1 + angle * 2.0)
    const twist = (ny + .12) * .24
    const cos = Math.cos(twist), sin = Math.sin(twist), tx = x * cos - z * sin, tz = x * sin + z * cos
    x = tx; z = tz
    let y = ny * 1.12 - .43 * centerCleft + .14 * leftLobe + .09 * rightLobe
    y -= lower * (.18 + .18 * lower)
    x += lower * -.07
    position.setXYZ(index, x, y, z)
    const h = THREE.MathUtils.clamp((y + 1.30) / 2.45, 0, 1)
    const scarWeight = THREE.MathUtils.clamp(centerCleft + Math.abs(strata) * 4.0, 0, 1)
    const color = deep.clone().lerp(tissue, .25 + .48 * h).lerp(scarColor, .04 + .22 * scarWeight)
    colors.push(color.r, color.g, color.b)
  }
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3)); geometry.computeVertexNormals(); geometry.computeBoundingSphere(); return geometry
}

function memoryInteriorGeometry() {
  const count = 72, positions = new Float32Array(count * 3)
  for (let index = 0; index < count; index++) { const t=(index+.5)/count, angle=index*2.39996323, radius=Math.pow(t,.70)*.18, y=-.58+(index%19)/18*1.02; positions.set([Math.cos(angle)*radius*(1-.32*Math.abs(y)),y,Math.sin(angle)*radius*.34],index*3) }
  const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3)); return geometry
}

function memoryScarGeometry() {
  const points = [
    new THREE.Vector3(-.05,.72,.16), new THREE.Vector3(-.12,.46,.18),
    new THREE.Vector3(-.03,.18,.18), new THREE.Vector3(-.10,-.08,.16),
    new THREE.Vector3(-.02,-.34,.12), new THREE.Vector3(-.06,-.62,.07),
  ]
  return new THREE.BufferGeometry().setFromPoints(points)
}

const stateIntensity: Record<OrbState, number> = { dormant:.03, idle:.09, attention:.18, listening:.14, thinking:.16, speaking:.22, guiding:.15, reflecting:.12, calming:.08, privacy:.13, warning:.24, transition:.16 }

function LivingMemoryHeartV234({ state, reducedMotion, onOrb }: { state: OrbState; reducedMotion: boolean; onOrb: () => void }) {
  const root=useRef<THREE.Group>(null), y=height(ORB.x,ORB.z), outer=useMemo(livingMemoryGeometry,[]), interior=useMemo(memoryInteriorGeometry,[]), scar=useMemo(memoryScarGeometry,[]), scarLine=useMemo(()=>new THREE.Line(scar),[scar])
  useEffect(()=>()=>{outer.dispose();interior.dispose();scar.dispose()},[interior,outer,scar])
  useFrame(({clock})=>{if(!root.current||reducedMotion)return;const t=clock.elapsedTime,breath=1+Math.sin(t*.44)*.0025;root.current.position.y=y+.84+Math.sin(t*.30)*.004;root.current.rotation.y=-.10+Math.sin(t*.14)*.010;root.current.rotation.z=-.06+Math.sin(t*.21)*.003;root.current.scale.setScalar(breath)})
  const e=(reducedMotion?.72:1)*stateIntensity[state],warning=state==='warning',privacy=state==='privacy',glow=warning?'#c7765e':privacy?'#6f9ea0':'#b3a985'
  const activate=(event:ThreeEvent<MouseEvent>)=>{event.stopPropagation();onOrb()}
  return <group ref={root} position={[ORB.x,y+.84,ORB.z]} rotation={[.03,-.10,-.06]} name="home-v234-living-memory-heart" onClick={activate} userData={{artRevision:'v245-broader-scarred-living-memory-shadow-safe',visualIntent:'one-connected-asymmetric-history-bearing-presence',semanticOwner:'home-current-orb-surface-memory',materialLanguage:'matte-scarred-memory-tissue'}}>
    <mesh geometry={outer} scale={[.92,.90,.88]} receiveShadow><meshStandardMaterial vertexColors color="#b8ad91" emissive={glow} emissiveIntensity={.018+e*.075} roughness={.94} metalness={0}/></mesh>
    <primitive object={scarLine} position={[0,0,.31]}><lineBasicMaterial color={glow} transparent opacity={.38+e*.38} toneMapped={false}/></primitive>
    <points geometry={interior} scale={[.92,.90,.88]}><pointsMaterial color={glow} size={.016} transparent opacity={.23+e*.22} depthWrite={false} blending={THREE.AdditiveBlending}/></points>
    <pointLight color={glow} intensity={.10+e*.22} distance={2.4} decay={2}/>
  </group>
}

function SubtleAtmosphereV234({ reducedMotion }: { reducedMotion: boolean }) {
  const root=useRef<THREE.Points>(null)
  const geometry=useMemo(()=>{const count=120,positions=new Float32Array(count*3),colors=new Float32Array(count*3),warm=new THREE.Color('#b99973'),cool=new THREE.Color('#7ca8a0');for(let index=0;index<count;index++){const t=index/count,angle=index*2.39996323,radius=2.8+Math.sqrt(t)*10,x=Math.cos(angle)*radius,z=2.2-t*20+Math.sin(index*.71)*.62,y=height(x,z)+.46+(index%11)*.13;positions.set([x,y,z],index*3);const color=warm.clone().lerp(cool,.35+.48*((index%9)/8));colors.set([color.r,color.g,color.b],index*3)}const result=new THREE.BufferGeometry();result.setAttribute('position',new THREE.BufferAttribute(positions,3));result.setAttribute('color',new THREE.BufferAttribute(colors,3));return result},[])
  useEffect(()=>()=>geometry.dispose(),[geometry]);useFrame(({clock})=>{if(root.current&&!reducedMotion)root.current.position.y=Math.sin(clock.elapsedTime*.10)*.014})
  return <points ref={root} geometry={geometry} frustumCulled={false} name="home-v234-subtle-atmospheric-depth"><pointsMaterial size={.017} sizeAttenuation transparent opacity={.20} vertexColors depthWrite={false} blending={THREE.AdditiveBlending}/></points>
}

export function HomeCurrentArtRepair({ orbState, reducedMotion, onOrb, onGround, onLifeMap }: { orbState: OrbState; reducedMotion: boolean; onOrb: () => void; onGround: () => void; onLifeMap: () => void }) {
  return <group name="home-current-authority-art-repair" userData={{artRevision:'v245-shadow-slab-suppression'}}><RetireSupersededShapes/><SuppressLegacyShadowArtifacts/><GroundThresholdV234 onGround={onGround}/><LifeMapThresholdV234 onLifeMap={onLifeMap}/><LivingMemoryHeartV234 state={orbState} reducedMotion={reducedMotion} onOrb={onOrb}/><SubtleAtmosphereV234 reducedMotion={reducedMotion}/></group>
}
