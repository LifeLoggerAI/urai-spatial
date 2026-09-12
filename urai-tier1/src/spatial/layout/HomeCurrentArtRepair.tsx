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
      object.castShadow = true
      object.receiveShadow = true
      const sources = Array.isArray(object.material) ? object.material : [object.material]
      const materials = sources.map((source) => {
        const material = source.clone()
        if (material instanceof THREE.MeshStandardMaterial) {
          material.roughness = Math.max(.90, material.roughness)
          material.metalness = 0
          material.color.multiplyScalar(.90)
          material.envMapIntensity = .72
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
  return <group position={[GROUND.x, y + .58, GROUND.z]} rotation={[0, -.08, 0]} name="home-v234-ground-scanned-stone-threshold" onClick={activate} userData={{ artRevision: 'v243-rock-framed-ground-cleft', visualIntent: 'eroded-cavern-cleft-owned-by-real-rock', semanticOwner: 'home-current-ground-geological-descent', morphology: 'weathered-world-emergent-descent' }}>
    <Suspense fallback={null}>
      <ScannedRock variant="01" position={[-.48, -.31, -.72]} rotation={[.24, .70, -.22]} scale={[1.18, 1.72, .76]} />
      <ScannedRock variant="02" position={[.48, -.32, -.76]} rotation={[-.18, -.84, .18]} scale={[1.16, 1.68, .74]} />
      <ScannedRock variant="02" position={[-.31, .43, -.84]} rotation={[.36, .42, .38]} scale={[.86, .72, .60]} />
      <ScannedRock variant="01" position={[.28, .48, -.88]} rotation={[-.32, -.36, -.34]} scale={[.84, .70, .58]} />
      <ScannedRock variant="01" position={[-.69, -.02, -.62]} rotation={[.08, 1.02, -.10]} scale={[.62, .94, .58]} />
      <ScannedRock variant="02" position={[.70, .01, -.65]} rotation={[-.06, -1.08, .08]} scale={[.64, .92, .58]} />
    </Suspense>
    <mesh geometry={inner} position={[.02, .02, -1.02]} scale={[.64,1,.54]}><meshStandardMaterial color="#050403" emissive="#7e3f29" emissiveIntensity={.075} roughness={1} /></mesh>
    <mesh geometry={path} position={[0, -.58, -.04]} receiveShadow><meshStandardMaterial vertexColors color="#74604d" roughness={1} /></mesh>
    <pointLight position={[.02, .08, -.88]} color="#d79267" intensity={.62} distance={3.0} decay={2} />
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
  return <group position={[LIFE_MAP.x, y + .08, LIFE_MAP.z]} rotation={[0, .06, 0]} name="home-v234-life-map-rooted-observatory" onClick={activate} userData={{ artRevision: 'v243-rock-framed-lineage-rift', visualIntent: 'narrow-asymmetric-lineage-cleft-with-celestial-depth', semanticOwner: 'home-current-life-map-rooted-ascent', morphology: 'rooted-ascent-not-tube-portal' }}>
    <Suspense fallback={null}>
      <ScannedRock variant="02" position={[-.42, -.20, -.55]} rotation={[.14, .88, -.18]} scale={[1.04, 1.54, .70]} />
      <ScannedRock variant="01" position={[.42, -.22, -.58]} rotation={[.10, -.94, .14]} scale={[1.02, 1.50, .68]} />
      <ScannedRock variant="01" position={[-.27, .58, -.70]} rotation={[.38, .50, .40]} scale={[.76, .72, .56]} />
      <ScannedRock variant="02" position={[.24, .64, -.74]} rotation={[-.34, -.44, -.36]} scale={[.74, .74, .54]} />
      <ScannedRock variant="02" position={[-.58, .10, -.58]} rotation={[.08,.98,-.08]} scale={[.52,.82,.50]} />
    </Suspense>
    <mesh geometry={inner} position={[0, .12, -.92]} scale={[.58,1,.50]}><meshStandardMaterial color="#020504" emissive="#2b665d" emissiveIntensity={.070} roughness={1} /></mesh>
    <mesh geometry={path} position={[0, -.08, .10]} rotation={[.08, 0, 0]} receiveShadow><meshStandardMaterial vertexColors color="#6f6756" roughness={1} /></mesh>
    <points geometry={stars}><pointsMaterial vertexColors size={.024} sizeAttenuation transparent opacity={.82} depthWrite={false} blending={THREE.AdditiveBlending} /></points>
    <pointLight position={[0, .72, -.90]} color="#83b8ad" intensity={.52} distance={3.1} decay={2} />
  </group>
}

function livingMemoryGeometry() {
  const geometry = new THREE.IcosahedronGeometry(1, 4)
  const position = geometry.getAttribute('position') as THREE.BufferAttribute
  const colors: number[] = []
  const deep = new THREE.Color('#17231f'), tissue = new THREE.Color('#56665b'), scarColor = new THREE.Color('#aab4a6')
  for (let index = 0; index < position.count; index++) {
    const nx = position.getX(index), ny = position.getY(index), nz = position.getZ(index)
    const angle = Math.atan2(nz, nx), crown = Math.max(0, ny), lower = Math.max(0, -ny)
    const upperLeft = Math.exp(-(((nx + .34) * .82) ** 2 + ((nz - .02) * 1.08) ** 2) / .16) * crown
    const upperRight = Math.exp(-(((nx - .28) * .88) ** 2 + ((nz + .18) * 1.02) ** 2) / .19) * crown
    const lowerLobe = Math.exp(-(((nx + .12) * .74) ** 2 + ((nz + .42) * .92) ** 2) / .22) * Math.max(0,.55-ny)
    const coarse = .14 * Math.sin(angle * 2.7 + ny * 3.4) + .07 * Math.cos(angle * 5.4 - ny * 4.8)
    const strata = .055 * Math.sin(ny * 14.8 + angle * 2.0)
    const cleft = Math.exp(-((nx * .92 + nz * .20 - .02) ** 2) / .022) * Math.pow(crown, 1.18)
    const cavity = Math.exp(-(((nx + .38) * .90) ** 2 + ((nz - .12) * 1.02) ** 2) / .11) * (.22 + .78*crown)
    const radial = 1 + coarse + strata*.58 + .16*upperLeft + .10*upperRight + .08*lowerLobe - .46*cleft - .18*cavity
    const taper = THREE.MathUtils.lerp(.40,1,THREE.MathUtils.smoothstep(ny,-.90,.10))
    let x = nx * radial * .56 * taper + ny*.14 - .05 + .06*upperLeft - .04*upperRight
    let z = nz * radial * .39 * taper + .035*Math.sin(ny*5.4+angle*2.2)
    const twist = (ny+.18)*.28
    const cos=Math.cos(twist),sin=Math.sin(twist),tx=x*cos-z*sin,tz=x*sin+z*cos
    x=tx;z=tz
    let y=ny*1.28-.10-.40*cleft-.11*cavity+.10*upperLeft-.03*upperRight
    y-=lower*(.20+.16*lower)
    position.setXYZ(index,x,y,z)
    const h=THREE.MathUtils.clamp((y+1.30)/2.55,0,1), scarWeight=THREE.MathUtils.clamp(cleft+cavity*.58+Math.abs(strata)*2.8,0,1)
    const color=deep.clone().lerp(tissue,.30+.46*h).lerp(scarColor,.028+.18*scarWeight)
    colors.push(color.r,color.g,color.b)
  }
  geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geometry.computeVertexNormals();geometry.computeBoundingSphere();return geometry
}

function memoryInteriorGeometry() {
  const count=60,positions=new Float32Array(count*3)
  for(let index=0;index<count;index++){const t=(index+.5)/count,angle=index*2.39996323,radius=Math.pow(t,.64)*.23,y=-.56+(index%17)/16*1.05;positions.set([Math.cos(angle)*radius*(1-.24*Math.abs(y)),y,Math.sin(angle)*radius*.40],index*3)}
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));return geometry
}

function memoryScarGeometry() {
  const points = [
    new THREE.Vector3(-.02,.76,.19), new THREE.Vector3(-.09,.48,.22),
    new THREE.Vector3(.02,.20,.23), new THREE.Vector3(-.06,-.06,.21),
    new THREE.Vector3(.03,-.32,.16), new THREE.Vector3(-.02,-.56,.10),
  ]
  return new THREE.BufferGeometry().setFromPoints(points)
}

const stateIntensity: Record<OrbState, number> = { dormant:.03, idle:.09, attention:.18, listening:.14, thinking:.16, speaking:.22, guiding:.15, reflecting:.12, calming:.08, privacy:.13, warning:.24, transition:.16 }

function LivingMemoryHeartV234({ state, reducedMotion, onOrb }: { state: OrbState; reducedMotion: boolean; onOrb: () => void }) {
  const root=useRef<THREE.Group>(null), y=height(ORB.x,ORB.z), outer=useMemo(livingMemoryGeometry,[]), interior=useMemo(memoryInteriorGeometry,[]), scar=useMemo(memoryScarGeometry,[])
  useEffect(()=>()=>{outer.dispose();interior.dispose();scar.dispose()},[interior,outer,scar])
  useFrame(({clock})=>{if(!root.current||reducedMotion)return;const t=clock.elapsedTime,breath=1+Math.sin(t*.44)*.003;root.current.position.y=y+.91+Math.sin(t*.30)*.004;root.current.rotation.y=-.26+Math.sin(t*.14)*.014;root.current.rotation.z=-.08+Math.sin(t*.21)*.004;root.current.scale.setScalar(breath)})
  const e=(reducedMotion?.72:1)*stateIntensity[state],warning=state==='warning',privacy=state==='privacy',glow=warning?'#c7765e':privacy?'#6ba3aa':'#85b49c'
  const activate=(event:ThreeEvent<MouseEvent>)=>{event.stopPropagation();onOrb()}
  return <group ref={root} position={[ORB.x,y+.91,ORB.z]} rotation={[.04,-.26,-.08]} name="home-v234-living-memory-heart" onClick={activate} userData={{artRevision:'v243-tapered-scarred-living-memory-presence',visualIntent:'one-connected-asymmetric-history-bearing-presence',semanticOwner:'home-current-orb-surface-memory',materialLanguage:'matte-scarred-memory-tissue'}}>
    <mesh geometry={outer} scale={[.64,.82,.64]} castShadow receiveShadow><meshStandardMaterial vertexColors color="#849086" emissive={glow} emissiveIntensity={.028+e*.12} roughness={.94} metalness={0}/></mesh>
    <line geometry={scar} position={[0,0,.31]}><lineBasicMaterial color={glow} transparent opacity={.46+e*.40} toneMapped={false}/></line>
    <points geometry={interior} scale={[.64,.82,.64]}><pointsMaterial color={glow} size={.018} transparent opacity={.26+e*.24} depthWrite={false} blending={THREE.AdditiveBlending}/></points>
    <pointLight color={glow} intensity={.14+e*.34} distance={3.0} decay={2}/>
  </group>
}

function SubtleAtmosphereV234({ reducedMotion }: { reducedMotion: boolean }) {
  const root=useRef<THREE.Points>(null)
  const geometry=useMemo(()=>{const count=120,positions=new Float32Array(count*3),colors=new Float32Array(count*3),warm=new THREE.Color('#b99973'),cool=new THREE.Color('#7ca8a0');for(let index=0;index<count;index++){const t=index/count,angle=index*2.39996323,radius=2.8+Math.sqrt(t)*10,x=Math.cos(angle)*radius,z=2.2-t*20+Math.sin(index*.71)*.62,y=height(x,z)+.46+(index%11)*.13;positions.set([x,y,z],index*3);const color=warm.clone().lerp(cool,.35+.48*((index%9)/8));colors.set([color.r,color.g,color.b],index*3)}const result=new THREE.BufferGeometry();result.setAttribute('position',new THREE.BufferAttribute(positions,3));result.setAttribute('color',new THREE.BufferAttribute(colors,3));return result},[])
  useEffect(()=>()=>geometry.dispose(),[geometry]);useFrame(({clock})=>{if(root.current&&!reducedMotion)root.current.position.y=Math.sin(clock.elapsedTime*.10)*.014})
  return <points ref={root} geometry={geometry} frustumCulled={false} name="home-v234-subtle-atmospheric-depth"><pointsMaterial size={.017} sizeAttenuation transparent opacity={.20} vertexColors depthWrite={false} blending={THREE.AdditiveBlending}/></points>
}

export function HomeCurrentArtRepair({ orbState, reducedMotion, onOrb, onGround, onLifeMap }: { orbState: OrbState; reducedMotion: boolean; onOrb: () => void; onGround: () => void; onLifeMap: () => void }) {
  return <group name="home-current-authority-art-repair" userData={{artRevision:'v243-rock-framed-thresholds-tapered-scarred-orb'}}><RetireSupersededShapes/><GroundThresholdV234 onGround={onGround}/><LifeMapThresholdV234 onLifeMap={onLifeMap}/><LivingMemoryHeartV234 state={orbState} reducedMotion={reducedMotion} onOrb={onOrb}/><SubtleAtmosphereV234 reducedMotion={reducedMotion}/></group>
}
