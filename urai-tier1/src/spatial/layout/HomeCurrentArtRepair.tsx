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
    clone.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return
      object.castShadow = true; object.receiveShadow = true
      const sources = Array.isArray(object.material) ? object.material : [object.material]
      const materials = sources.map((source) => { const material = source.clone(); if (material instanceof THREE.MeshStandardMaterial) { material.roughness = Math.max(.94, material.roughness); material.metalness = 0; material.color.multiplyScalar(.72) } return material })
      object.material = Array.isArray(object.material) ? materials : materials[0]
    })
    return clone
  }, [asset.scene])
  useEffect(() => () => model.traverse((object) => { if (!(object instanceof THREE.Mesh)) return; const materials = Array.isArray(object.material) ? object.material : [object.material]; materials.forEach((material) => material.dispose()) }), [model])
  return <primitive object={model} position={position} rotation={rotation} scale={scale} />
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
  const inner = useMemo(() => apertureGeometry(.38, .55, 5.2), [])
  const path = useMemo(() => wornPathGeometry(3.1, .42, .16), [])
  useEffect(() => () => { inner.dispose(); path.dispose() }, [inner, path])
  const activate = (event: ThreeEvent<MouseEvent>) => { event.stopPropagation(); onGround() }
  return <group position={[GROUND.x, y + .66, GROUND.z]} rotation={[0, -.08, 0]} name="home-v234-ground-scanned-stone-threshold" onClick={activate} userData={{ artRevision: 'v243-rock-framed-ground-cleft', visualIntent: 'eroded-cavern-cleft-owned-by-real-rock', semanticOwner: 'home-current-ground-geological-descent', morphology: 'weathered-world-emergent-descent' }}>
    <Suspense fallback={null}>
      <ScannedRock variant="01" position={[-.70, -.30, -.88]} rotation={[.24, .70, -.22]} scale={[.82, .67, .78]} />
      <ScannedRock variant="02" position={[.72, -.32, -.92]} rotation={[-.18, -.84, .18]} scale={[.84, .69, .80]} />
      <ScannedRock variant="02" position={[-.48, .43, -.96]} rotation={[.36, .42, .38]} scale={[.58, .50, .54]} />
      <ScannedRock variant="01" position={[.40, .50, -1.02]} rotation={[-.32, -.36, -.34]} scale={[.56, .48, .52]} />
      <ScannedRock variant="01" position={[-.92, .02, -.78]} rotation={[.08, 1.02, -.10]} scale={[.44, .38, .50]} />
      <ScannedRock variant="02" position={[.94, .06, -.82]} rotation={[-.06, -1.08, .08]} scale={[.46, .40, .52]} />
    </Suspense>
    <mesh geometry={inner} position={[.02, -.02, -1.34]} scale={[.78,1,.72]}><meshStandardMaterial color="#030403" emissive="#3b1e16" emissiveIntensity={.035} roughness={1} /></mesh>
    <mesh geometry={path} position={[0, -.68, -.04]} receiveShadow><meshStandardMaterial vertexColors color="#625243" roughness={1} /></mesh>
    <pointLight position={[.02, -.12, -1.14]} color="#c97b54" intensity={.28} distance={2.2} decay={2} />
  </group>
}

function LifeMapThresholdV234({ onLifeMap }: { onLifeMap: () => void }) {
  const y = height(LIFE_MAP.x, LIFE_MAP.z)
  const inner = useMemo(() => apertureGeometry(.30, .60, 4.6), [])
  const path = useMemo(() => wornPathGeometry(2.8, .34, .14), [])
  const stars = useMemo(() => {
    const count = 140, positions = new Float32Array(count * 3), colors = new Float32Array(count * 3)
    const warm = new THREE.Color('#ccb894'), cool = new THREE.Color('#79a99f')
    for (let index = 0; index < count; index++) { const angle = index * 2.39996323, radius = .12 + Math.sqrt((index + .5) / count) * .58, depth = (index % 17) * .095; positions.set([Math.cos(angle) * radius, .70 + Math.sin(angle) * radius * 1.48, -1.12 - depth], index * 3); const color = warm.clone().lerp(cool, (index % 9) / 8); colors.set([color.r, color.g, color.b], index * 3) }
    const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3)); geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3)); return geometry
  }, [])
  useEffect(() => () => { inner.dispose(); path.dispose(); stars.dispose() }, [inner, path, stars])
  const activate = (event: ThreeEvent<MouseEvent>) => { event.stopPropagation(); onLifeMap() }
  return <group position={[LIFE_MAP.x, y + .12, LIFE_MAP.z]} rotation={[0, .06, 0]} name="home-v234-life-map-rooted-observatory" onClick={activate} userData={{ artRevision: 'v243-rock-framed-lineage-rift', visualIntent: 'narrow-asymmetric-lineage-cleft-with-celestial-depth', semanticOwner: 'home-current-life-map-rooted-ascent', morphology: 'rooted-ascent-not-tube-portal' }}>
    <Suspense fallback={null}>
      <ScannedRock variant="02" position={[-.64, -.20, -.66]} rotation={[.14, .88, -.18]} scale={[.72, .52, .66]} />
      <ScannedRock variant="01" position={[.66, -.22, -.72]} rotation={[.10, -.94, .14]} scale={[.70, .51, .64]} />
      <ScannedRock variant="01" position={[-.40, .58, -.80]} rotation={[.38, .50, .40]} scale={[.48, .55, .48]} />
      <ScannedRock variant="02" position={[.34, .68, -.86]} rotation={[-.34, -.44, -.36]} scale={[.46, .56, .46]} />
      <ScannedRock variant="02" position={[-.80, .16, -.70]} rotation={[.08,.98,-.08]} scale={[.36,.42,.42]} />
    </Suspense>
    <mesh geometry={inner} position={[0, .10, -1.18]} scale={[.70,1,.72]}><meshStandardMaterial color="#020504" emissive="#17332e" emissiveIntensity={.028} roughness={1} /></mesh>
    <mesh geometry={path} position={[0, -.12, .12]} rotation={[.10, 0, 0]} receiveShadow><meshStandardMaterial vertexColors color="#665d4e" roughness={1} /></mesh>
    <points geometry={stars}><pointsMaterial vertexColors size={.020} sizeAttenuation transparent opacity={.68} depthWrite={false} blending={THREE.AdditiveBlending} /></points>
    <pointLight position={[0, .70, -1.12]} color="#739f96" intensity={.20} distance={2.6} decay={2} />
  </group>
}

function livingMemoryGeometry() {
  const geometry = new THREE.IcosahedronGeometry(1, 4)
  const position = geometry.getAttribute('position') as THREE.BufferAttribute
  const colors: number[] = []
  const deep = new THREE.Color('#17231f'), tissue = new THREE.Color('#4b5c51'), scarColor = new THREE.Color('#8a998b')
  for (let index = 0; index < position.count; index++) {
    const nx = position.getX(index), ny = position.getY(index), nz = position.getZ(index)
    const angle = Math.atan2(nz, nx), crown = Math.max(0, ny), lower = Math.max(0, -ny)
    const upperLeft = Math.exp(-(((nx + .34) * .82) ** 2 + ((nz - .02) * 1.08) ** 2) / .16) * crown
    const upperRight = Math.exp(-(((nx - .28) * .88) ** 2 + ((nz + .18) * 1.02) ** 2) / .19) * crown
    const lowerLobe = Math.exp(-(((nx + .12) * .74) ** 2 + ((nz + .42) * .92) ** 2) / .22) * Math.max(0,.55-ny)
    const coarse = .16 * Math.sin(angle * 2.7 + ny * 3.4) + .08 * Math.cos(angle * 5.4 - ny * 4.8)
    const strata = .06 * Math.sin(ny * 14.8 + angle * 2.0)
    const cleft = Math.exp(-((nx * .92 + nz * .20 - .02) ** 2) / .026) * Math.pow(crown, 1.20)
    const cavity = Math.exp(-(((nx + .38) * .90) ** 2 + ((nz - .12) * 1.02) ** 2) / .11) * (.22 + .78*crown)
    const radial = 1 + coarse + strata*.58 + .20*upperLeft + .12*upperRight + .10*lowerLobe - .36*cleft - .22*cavity
    const taper = THREE.MathUtils.lerp(.54,1,THREE.MathUtils.smoothstep(ny,-.92,.05))
    let x = nx * radial * .72 * taper + ny*.17 - .07 + .08*upperLeft - .05*upperRight
    let z = nz * radial * .48 * taper + .04*Math.sin(ny*5.4+angle*2.2)
    const twist = (ny+.18)*.34
    const cos=Math.cos(twist),sin=Math.sin(twist),tx=x*cos-z*sin,tz=x*sin+z*cos
    x=tx;z=tz
    let y=ny*1.06-.14-.34*cleft-.13*cavity+.08*upperLeft-.04*upperRight
    y-=lower*(.24+.18*lower)
    position.setXYZ(index,x,y,z)
    const h=THREE.MathUtils.clamp((y+1.18)/2.15,0,1), scarWeight=THREE.MathUtils.clamp(cleft+cavity*.58+Math.abs(strata)*2.8,0,1)
    const color=deep.clone().lerp(tissue,.24+.42*h).lerp(scarColor,.018+.13*scarWeight)
    colors.push(color.r,color.g,color.b)
  }
  geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geometry.computeVertexNormals();geometry.computeBoundingSphere();return geometry
}

function memoryInteriorGeometry() {
  const count=60,positions=new Float32Array(count*3)
  for(let index=0;index<count;index++){const t=(index+.5)/count,angle=index*2.39996323,radius=Math.pow(t,.64)*.31,y=-.46+(index%17)/16*.84;positions.set([Math.cos(angle)*radius*(1-.24*Math.abs(y)),y,Math.sin(angle)*radius*.46],index*3)}
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));return geometry
}

const stateIntensity: Record<OrbState, number> = { dormant:.03, idle:.09, attention:.18, listening:.14, thinking:.16, speaking:.22, guiding:.15, reflecting:.12, calming:.08, privacy:.13, warning:.24, transition:.16 }

function LivingMemoryHeartV234({ state, reducedMotion, onOrb }: { state: OrbState; reducedMotion: boolean; onOrb: () => void }) {
  const root=useRef<THREE.Group>(null), y=height(ORB.x,ORB.z), outer=useMemo(livingMemoryGeometry,[]), interior=useMemo(memoryInteriorGeometry,[])
  useEffect(()=>()=>{outer.dispose();interior.dispose()},[interior,outer])
  useFrame(({clock})=>{if(!root.current||reducedMotion)return;const t=clock.elapsedTime,breath=1+Math.sin(t*.44)*.004;root.current.position.y=y+.94+Math.sin(t*.30)*.006;root.current.rotation.y=-.26+Math.sin(t*.14)*.018;root.current.rotation.z=-.10+Math.sin(t*.21)*.006;root.current.scale.setScalar(breath)})
  const e=(reducedMotion?.72:1)*stateIntensity[state],warning=state==='warning',privacy=state==='privacy',glow=warning?'#a25c49':privacy?'#4e7d83':'#5d8a76'
  const activate=(event:ThreeEvent<MouseEvent>)=>{event.stopPropagation();onOrb()}
  return <group ref={root} position={[ORB.x,y+.94,ORB.z]} rotation={[.04,-.26,-.10]} name="home-v234-living-memory-heart" onClick={activate} userData={{artRevision:'v243-tapered-scarred-living-memory-presence',visualIntent:'one-connected-asymmetric-history-bearing-presence',semanticOwner:'home-current-orb-surface-memory',materialLanguage:'matte-scarred-memory-tissue'}}>
    <mesh geometry={outer} scale={[.72,.78,.72]} castShadow receiveShadow><meshStandardMaterial vertexColors color="#606b61" emissive={glow} emissiveIntensity={.010+e*.08} roughness={.97} metalness={0}/></mesh>
    <points geometry={interior} scale={[.72,.78,.72]}><pointsMaterial color={glow} size={.014} transparent opacity={.14+e*.16} depthWrite={false} blending={THREE.AdditiveBlending}/></points>
    <pointLight color={glow} intensity={.06+e*.22} distance={2.3} decay={2}/>
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
