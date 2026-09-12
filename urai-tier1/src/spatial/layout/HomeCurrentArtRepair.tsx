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

function RetireNearMemoryBankSlabs() {
  const { scene } = useThree()
  const hidden = useRef(new Set<THREE.Object3D>())
  useFrame(() => {
    const group = scene.getObjectByName('home-v226-weathered-memory-banks')
    group?.children.slice(0, 2).forEach((object) => {
      if (!object.visible) return
      object.visible = false
      hidden.current.add(object)
    })
  })
  useEffect(() => () => { hidden.current.forEach((object) => { object.visible = true }); hidden.current.clear() }, [])
  return null
}

function SuppressLegacyShadowArtifacts() {
  const { scene } = useThree()
  const changed = useRef(new Map<THREE.Mesh, boolean>())
  useFrame(() => {
    for (const groupName of ['home-v229-textured-inhabited-valley-and-distant-ridge', 'home-v226-weathered-memory-banks']) {
      const group = scene.getObjectByName(groupName)
      group?.traverse((object) => {
        if (!(object instanceof THREE.Mesh) || !object.castShadow) return
        if (!changed.current.has(object)) changed.current.set(object, object.castShadow)
        object.castShadow = false
      })
    }
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
          material.color.offsetHSL(0, -.06, .16)
          material.emissive = new THREE.Color('#29322d')
          material.emissiveIntensity = .16
          material.envMapIntensity = .82
        }
        return material
      })
      object.material = Array.isArray(object.material) ? materials : materials[0]
    })
    return clone
  }, [asset.scene])
  useEffect(() => () => model.traverse((object) => { if (!(object instanceof THREE.Mesh)) return; const materials = Array.isArray(object.material) ? object.material : [object.material]; materials.forEach((material) => material.dispose()) }), [model])
  return <group position={position} rotation={rotation} scale={[scale[0] * .50 * .66, scale[1] * .50 * .66, scale[2] * .50 * .66]}><primitive object={model} /></group>
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
  return <group position={[GROUND.x, y + .58, GROUND.z]} rotation={[0, -.08, 0]} name="home-v234-ground-scanned-stone-threshold" onClick={activate} userData={{ artRevision: 'v247-recessed-ground-cleft', visualIntent: 'eroded-cavern-cleft-owned-by-small-recessed-real-rock-without-foreground-slab', semanticOwner: 'home-current-ground-geological-descent', morphology: 'weathered-world-emergent-descent' }}>
    <Suspense fallback={null}>
      <ScannedRock variant="01" position={[-.43, -.34, -.96]} rotation={[.20, .78, -.18]} scale={[1.30, 1.94, .86]} />
      <ScannedRock variant="02" position={[.43, -.35, -.98]} rotation={[-.16, -.88, .16]} scale={[1.28, 1.90, .84]} />
      <ScannedRock variant="02" position={[-.28, .48, -1.02]} rotation={[.36, .44, .36]} scale={[.98, .80, .68]} />
      <ScannedRock variant="01" position={[.25, .53, -1.06]} rotation={[-.30, -.40, -.32]} scale={[.96, .78, .66]} />
      <ScannedRock variant="01" position={[-.63, -.04, -.90]} rotation={[.06, 1.08, -.08]} scale={[.70, 1.10, .66]} />
      <ScannedRock variant="02" position={[.64, -.02, -.92]} rotation={[-.05, -1.12, .07]} scale={[.72, 1.08, .66]} />
    </Suspense>
    <mesh geometry={inner} position={[.02, .02, -.88]} scale={[.70, 1.04, .60]}><meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} /></mesh>
    <mesh geometry={path} position={[0, -.58, -.04]} receiveShadow><meshStandardMaterial vertexColors color="#74604d" roughness={1} /></mesh>
    <pointLight position={[.02, .08, -1.12]} color="#d18a61" intensity={.52} distance={2.7} decay={2} />
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
  return <group position={[LIFE_MAP.x, y + .08, LIFE_MAP.z]} rotation={[0, .06, 0]} name="home-v234-life-map-rooted-observatory" onClick={activate} userData={{ artRevision: 'v247-recessed-lineage-rift', visualIntent: 'narrow-asymmetric-lineage-cleft-with-small-recessed-real-rock-and-celestial-depth', semanticOwner: 'home-current-life-map-rooted-ascent', morphology: 'rooted-ascent-not-tube-portal' }}>
    <Suspense fallback={null}>
      <ScannedRock variant="02" position={[-.38, -.22, -.84]} rotation={[.12, .94, -.16]} scale={[1.18, 1.72, .80]} />
      <ScannedRock variant="01" position={[.38, -.24, -.86]} rotation={[.08, -1.00, .14]} scale={[1.16, 1.68, .78]} />
      <ScannedRock variant="01" position={[-.25, .60, -.96]} rotation={[.36, .52, .36]} scale={[.86, .78, .64]} />
      <ScannedRock variant="02" position={[.22, .66, -1.00]} rotation={[-.32, -.46, -.34]} scale={[.84, .80, .62]} />
      <ScannedRock variant="02" position={[-.54, .08, -.84]} rotation={[.06,1.02,-.06]} scale={[.60,.94,.58]} />
    </Suspense>
    <mesh geometry={inner} position={[0, .12, -.78]} scale={[.66, 1.04, .56]}><meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} /></mesh>
    <mesh geometry={path} position={[0, -.08, .10]} rotation={[.08, 0, 0]} receiveShadow><meshStandardMaterial vertexColors color="#6f6756" roughness={1} /></mesh>
    <points geometry={stars}><pointsMaterial vertexColors size={.024} sizeAttenuation transparent opacity={.88} depthWrite={false} blending={THREE.AdditiveBlending} /></points>
    <pointLight position={[0, .72, -1.06]} color="#83b8ad" intensity={.48} distance={2.8} decay={2} />
  </group>
}

function livingMemoryGeometry() {
  const geometry = new THREE.SphereGeometry(1, 112, 72)
  const position = geometry.getAttribute('position') as THREE.BufferAttribute
  const colors: number[] = []
  const deep = new THREE.Color('#25262d'), tissue = new THREE.Color('#5e5964'), scarColor = new THREE.Color('#b2a5aa')
  for (let index = 0; index < position.count; index++) {
    const nx = position.getX(index), ny = position.getY(index), nz = position.getZ(index)
    const angle = Math.atan2(nz, nx)
    const crown = THREE.MathUtils.smoothstep(ny, -.02, .95)
    const lower = THREE.MathUtils.smoothstep(-ny, .10, .98)
    const upper = THREE.MathUtils.smoothstep(ny, .10, .92)
    const seamAxis = (nx + .16) * .88 + (nz - .05) * .46
    const centerCleft = Math.exp(-(seamAxis * seamAxis) / .038) * crown * (1.0 - .20 * Math.max(0, -nz))
    const leftLobe = Math.exp(-(((nx + .28) / .58) ** 2 + ((nz - .18) / .74) ** 2)) * crown
    const rightLobe = Math.exp(-(((nx - .38) / .78) ** 2 + ((nz + .30) / .56) ** 2)) * (.22 + .48 * crown)
    const forwardFold = Math.exp(-(((nz - .48) / .28) ** 2 + ((nx + .08) / .70) ** 2)) * (.30 + .70 * crown)
    const rearFold = Math.exp(-(((nz + .52) / .34) ** 2 + ((nx - .12) / .72) ** 2)) * (.18 + .50 * crown)
    const leftShoulder = Math.exp(-(((ny - .28) / .30) ** 2 + ((nx + .74) / .30) ** 2)) * (.48 + .52 * Math.max(0, nz + .25))
    const rightRecess = Math.exp(-(((ny - .38) / .27) ** 2 + ((nx - .72) / .27) ** 2)) * (.46 + .54 * Math.max(0, nz + .18))
    const side = Math.tanh((nx + .10) * 5.2)
    const weather = .050 * Math.sin(angle * 3.1 + ny * 5.4) + .022 * Math.sin(angle * 9.0 - ny * 7.4)
    const strata = .024 * Math.sin(ny * 16.0 + angle * 2.8)
    const rootTaper = THREE.MathUtils.lerp(.30, 1, THREE.MathUtils.smoothstep(ny, -.88, -.02))
    const silhouette = 1 + .20 * leftShoulder - .22 * rightRecess + .055 * Math.sin(ny * 5.1 + angle * 1.4) * (.25 + .75 * upper)
    const radial = (1 + weather + strata + .16 * leftLobe + .08 * rightLobe + .17 * forwardFold - .05 * rearFold) * silhouette
    let x = nx * radial * .62 * rootTaper + side * crown * .07 + ny * .11 - .09 - upper * .055
    let z = nz * radial * .70 * rootTaper + .11 * forwardFold - .055 * rearFold + .030 * Math.sin(ny * 6.3 + angle * 2.1)
    const twist = (ny + .10) * .42 + .06 * Math.sin(ny * 3.1)
    const cos = Math.cos(twist), sin = Math.sin(twist), tx = x * cos - z * sin, tz = x * sin + z * cos
    x = tx; z = tz
    let y = ny * 1.22 - .20 * centerCleft + .10 * leftLobe - .04 * rightLobe + .12 * forwardFold
    y += upper * (.13 * Math.max(0, -nx) - .055 * Math.max(0, nx))
    y += .08 * leftShoulder - .045 * rightRecess
    y -= lower * (.20 + .18 * lower)
    x += lower * -.10
    position.setXYZ(index, x, y, z)
    const h = THREE.MathUtils.clamp((y + 1.35) / 2.60, 0, 1)
    const scarWeight = THREE.MathUtils.clamp(centerCleft + Math.abs(strata) * 5.0 + forwardFold * .20 + rightRecess * .18, 0, 1)
    const color = deep.clone().lerp(tissue, .18 + .56 * h).lerp(scarColor, .020 + .25 * scarWeight)
    colors.push(color.r, color.g, color.b)
  }
  position.needsUpdate = true
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3)); geometry.computeVertexNormals(); geometry.computeBoundingSphere(); return geometry
}

function memoryInteriorGeometry() {
  const count = 360, positions = new Float32Array(count * 3)
  for (let index = 0; index < count; index++) {
    const t=(index+.5)/count, angle=index*2.39996323+.18*Math.sin(index*.37), radius=.11+Math.pow(t,.72)*.40, y=-.78+(index%37)/36*1.56
    positions.set([Math.cos(angle)*radius*(.84-.20*Math.abs(y)),y,Math.sin(angle)*radius*.62],index*3)
  }
  const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3)); return geometry
}

function memoryScarGeometry() {
  const points = [
    new THREE.Vector3(-.07,.76,.20), new THREE.Vector3(-.15,.53,.22),
    new THREE.Vector3(-.04,.28,.23), new THREE.Vector3(-.12,.03,.21),
    new THREE.Vector3(-.03,-.21,.17), new THREE.Vector3(-.09,-.46,.12),
    new THREE.Vector3(-.05,-.68,.07),
  ]
  return new THREE.BufferGeometry().setFromPoints(points)
}

function memoryFilamentGeometry() {
  const points: THREE.Vector3[] = []
  for (let trace=0; trace<7; trace++) {
    let previous: THREE.Vector3 | null = null
    for (let step=0; step<=24; step++) {
      const t=step/24, y=-.72+t*1.48
      const angle=-1.06+trace*.31+t*(.72+trace*.035)+.11*Math.sin(t*8.2+trace*.8)
      const envelope=.23+.23*Math.sin(t*Math.PI)
      const current=new THREE.Vector3(Math.cos(angle)*envelope+(trace-3)*.014,y,.43+Math.sin(angle)*.15+.025*Math.sin(t*11+trace))
      if (previous) points.push(previous,current)
      previous=current
    }
  }
  return new THREE.BufferGeometry().setFromPoints(points)
}

function memoryHaloGeometry() {
  const count=240, positions=new Float32Array(count*3), colors=new Float32Array(count*3)
  const cool=new THREE.Color('#8fc8c5'), warm=new THREE.Color('#d9c7a3')
  for(let index=0;index<count;index++){
    const t=(index+.5)/count, y=-1.02+t*2.04, angle=index*2.39996323+Math.sin(index*.31)*.08
    const envelope=.70+.12*Math.sin(index*.73)+.06*Math.cos(index*.17), waist=.88-.20*Math.abs(y)
    const x=Math.cos(angle)*envelope*waist, z=Math.sin(angle)*envelope*.82
    positions.set([x,y,z],index*3)
    const color=cool.clone().lerp(warm,.18+.42*((index%17)/16)); colors.set([color.r,color.g,color.b],index*3)
  }
  const geometry=new THREE.BufferGeometry(); geometry.setAttribute('position',new THREE.BufferAttribute(positions,3)); geometry.setAttribute('color',new THREE.BufferAttribute(colors,3)); return geometry
}

const stateIntensity: Record<OrbState, number> = { dormant:.03, idle:.09, attention:.18, listening:.14, thinking:.16, speaking:.22, guiding:.15, reflecting:.12, calming:.08, privacy:.13, warning:.24, transition:.16 }

function LivingMemoryHeartV234({ state, reducedMotion, onOrb }: { state: OrbState; reducedMotion: boolean; onOrb: () => void }) {
  const root=useRef<THREE.Group>(null), haloRef=useRef<THREE.Points>(null), y=height(ORB.x,ORB.z), outer=useMemo(livingMemoryGeometry,[]), interior=useMemo(memoryInteriorGeometry,[]), scar=useMemo(memoryScarGeometry,[]), filaments=useMemo(memoryFilamentGeometry,[]), halo=useMemo(memoryHaloGeometry,[]), scarLine=useMemo(()=>new THREE.Line(scar),[scar])
  useEffect(()=>()=>{outer.dispose();interior.dispose();scar.dispose();filaments.dispose();halo.dispose()},[filaments,halo,interior,outer,scar])
  useFrame(({clock})=>{if(!root.current||reducedMotion)return;const t=clock.elapsedTime,breath=1+Math.sin(t*.58)*.014;root.current.position.y=y+.94+Math.sin(t*.36)*.026;root.current.rotation.y=-.22+Math.sin(t*.17)*.055;root.current.rotation.z=-.08+Math.sin(t*.23)*.014;root.current.scale.setScalar(breath);if(haloRef.current){haloRef.current.rotation.y=t*.10;haloRef.current.rotation.z=Math.sin(t*.16)*.08}})
  const e=(reducedMotion?.72:1)*stateIntensity[state],warning=state==='warning',privacy=state==='privacy',glow=warning?'#d17d70':privacy?'#78a5a1':'#9fc7c5',shellOpacity=(reducedMotion?.25:.20)+e*.18
  const activate=(event:ThreeEvent<MouseEvent>)=>{event.stopPropagation();onOrb()}
  return <group ref={root} position={[ORB.x,y+.94,ORB.z]} rotation={[.04,-.22,-.08]} name="home-v248-living-memory-heart" onClick={activate} userData={{artRevision:'v248-translucent-living-memory-field',visualIntent:'one-connected-asymmetric-history-bearing-presence-with-visible-memory-energy-not-rock',semanticOwner:'home-current-orb-surface-memory',materialLanguage:'translucent-memory-mantle-interior-filaments-halo'}}>
    <mesh geometry={outer} scale={[1.02,1.10,1.04]} receiveShadow={false} renderOrder={1}><meshStandardMaterial vertexColors color="#789292" emissive={glow} emissiveIntensity={.16+e*.34} roughness={.42} metalness={0} transparent opacity={shellOpacity} depthWrite={false} side={THREE.DoubleSide}/></mesh>
    <mesh geometry={outer} scale={[1.035,1.115,1.055]} renderOrder={2}><meshBasicMaterial color={glow} wireframe transparent opacity={.055+e*.12} depthWrite={false} toneMapped={false}/></mesh>
    <lineSegments geometry={filaments} scale={[1.06,1.15,1.08]} renderOrder={4}><lineBasicMaterial color={glow} transparent opacity={.50+e*.34} depthTest={false} depthWrite={false} toneMapped={false}/></lineSegments>
    <primitive object={scarLine} position={[0,0,.45]} scale={[1.04,1.12,1.04]}><lineBasicMaterial color="#d9e9e6" transparent opacity={.72+e*.20} depthTest={false} toneMapped={false}/></primitive>
    <points geometry={interior} scale={[1.02,1.10,1.04]} renderOrder={3}><pointsMaterial color={glow} size={.046} transparent opacity={.68+e*.22} depthTest={false} depthWrite={false} blending={THREE.AdditiveBlending}/></points>
    <points ref={haloRef} geometry={halo} scale={[1.08,1.13,1.08]} renderOrder={3}><pointsMaterial vertexColors size={.021} transparent opacity={.40+e*.18} depthTest={false} depthWrite={false} blending={THREE.AdditiveBlending}/></points>
    <mesh position={[-.08,.06,.12]} renderOrder={4}><sphereGeometry args={[.105,24,24]}/><meshBasicMaterial color="#d9e9e6" transparent opacity={.52+e*.26} depthTest={false} depthWrite={false} toneMapped={false}/></mesh>
    <pointLight color={glow} intensity={.34+e*.54} distance={3.4} decay={2}/>
    <pointLight position={[-.10,.10,.24]} color="#d9c7a3" intensity={.16+e*.16} distance={1.8} decay={2}/>
  </group>
}

function SubtleAtmosphereV234({ reducedMotion }: { reducedMotion: boolean }) {
  const root=useRef<THREE.Points>(null)
  const geometry=useMemo(()=>{const count=120,positions=new Float32Array(count*3),colors=new Float32Array(count*3),warm=new THREE.Color('#b99973'),cool=new THREE.Color('#7ca8a0');for(let index=0;index<count;index++){const t=index/count,angle=index*2.39996323,radius=2.8+Math.sqrt(t)*10,x=Math.cos(angle)*radius,z=2.2-t*20+Math.sin(index*.71)*.62,y=height(x,z)+.46+(index%11)*.13;positions.set([x,y,z],index*3);const color=warm.clone().lerp(cool,.35+.48*((index%9)/8));colors.set([color.r,color.g,color.b],index*3)}const result=new THREE.BufferGeometry();result.setAttribute('position',new THREE.BufferAttribute(positions,3));result.setAttribute('color',new THREE.BufferAttribute(colors,3));return result},[])
  useEffect(()=>()=>geometry.dispose(),[geometry]);useFrame(({clock})=>{if(root.current&&!reducedMotion)root.current.position.y=Math.sin(clock.elapsedTime*.10)*.014})
  return <points ref={root} geometry={geometry} frustumCulled={false} name="home-v234-subtle-atmospheric-depth"><pointsMaterial size={.017} sizeAttenuation transparent opacity={.20} vertexColors depthWrite={false} blending={THREE.AdditiveBlending}/></points>
}

export function HomeCurrentArtRepair({ orbState, reducedMotion, onOrb, onGround, onLifeMap }: { orbState: OrbState; reducedMotion: boolean; onOrb: () => void; onGround: () => void; onLifeMap: () => void }) {
  return <group name="home-current-authority-art-repair" userData={{artRevision:'v248-translucent-living-memory-orb'}}><RetireSupersededShapes/><RetireNearMemoryBankSlabs/><SuppressLegacyShadowArtifacts/><GroundThresholdV234 onGround={onGround}/><LifeMapThresholdV234 onLifeMap={onLifeMap}/><LivingMemoryHeartV234 state={orbState} reducedMotion={reducedMotion} onOrb={onOrb}/><SubtleAtmosphereV234 reducedMotion={reducedMotion}/></group>
}
