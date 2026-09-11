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
  useFrame(() => {
    scene.traverse((object) => {
      if (!exact.has(object.name) || !object.visible) return
      object.visible = false
      hidden.current.add(object)
    })
  })
  useEffect(() => () => {
    hidden.current.forEach((object) => { object.visible = true })
    hidden.current.clear()
  }, [])
  return null
}

function ScannedRock({ variant, position, rotation, scale }: { variant: '01' | '02'; position: [number,number,number]; rotation: [number,number,number]; scale: [number,number,number] }) {
  const asset = useGLTF(ROCK_FACE[variant])
  const model = useMemo(() => {
    const clone = asset.scene.clone(true)
    clone.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return
      object.castShadow = true
      object.receiveShadow = true
      const sources = Array.isArray(object.material) ? object.material : [object.material]
      const materials = sources.map((source) => {
        const material = source.clone()
        if (material instanceof THREE.MeshStandardMaterial) {
          material.roughness = Math.max(.94, material.roughness)
          material.metalness = 0
          material.color.multiplyScalar(.72)
        }
        return material
      })
      object.material = Array.isArray(object.material) ? materials : materials[0]
    })
    return clone
  }, [asset.scene])
  useEffect(() => () => model.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return
    const materials = Array.isArray(object.material) ? object.material : [object.material]
    materials.forEach((material) => material.dispose())
  }), [model])
  return <primitive object={model} position={position} rotation={rotation} scale={scale} />
}

function apertureGeometry(width: number, heightValue: number, seed: number) {
  const segments = 96
  const positions = [0, 0, 0]
  const indices: number[] = []
  for (let index = 0; index < segments; index++) {
    const angle = index / segments * Math.PI * 2
    const weather = 1 + .055 * Math.sin(angle * 5 + seed) + .028 * Math.sin(angle * 11 - seed * .4)
    positions.push(Math.cos(angle) * width * weather, Math.sin(angle) * heightValue * weather, 0)
  }
  for (let index = 0; index < segments; index++) indices.push(0, index + 1, 1 + ((index + 1) % segments))
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}

function wornPathGeometry(length = 3.4, startWidth = .46, endWidth = .22) {
  const segments = 36
  const positions: number[] = []
  const colors: number[] = []
  const indices: number[] = []
  const soil = new THREE.Color('#3a3229')
  const worn = new THREE.Color('#74604d')
  for (let index = 0; index <= segments; index++) {
    const t = index / segments
    const z = -.4 + t * length
    const center = .08 * Math.sin(t * 7.1) + .035 * Math.sin(t * 17)
    const width = THREE.MathUtils.lerp(startWidth, endWidth, t) * (1 + .08 * Math.sin(index * 1.51))
    for (const side of [-1, 1] as const) {
      positions.push(center + side * width, -.02 + .008 * Math.sin(index * 1.3), z)
      const color = soil.clone().lerp(worn, .38 + .16 * Math.sin(t * 9 + side))
      colors.push(color.r, color.g, color.b)
    }
    if (index < segments) {
      const a = index * 2, b = a + 1, c = a + 2, d = a + 3
      indices.push(a, c, b, b, c, d)
    }
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}

function GroundThresholdV234({ onGround }: { onGround: () => void }) {
  const y = height(GROUND.x, GROUND.z)
  const outer = useMemo(() => apertureGeometry(.82, .96, 2.1), [])
  const inner = useMemo(() => apertureGeometry(.66, .79, 5.2), [])
  const path = useMemo(() => wornPathGeometry(3.1, .48, .22), [])
  useEffect(() => () => { outer.dispose(); inner.dispose(); path.dispose() }, [inner, outer, path])
  const activate = (event: ThreeEvent<MouseEvent>) => { event.stopPropagation(); onGround() }
  return <group position={[GROUND.x, y + .78, GROUND.z]} rotation={[0, -.06, 0]} name="home-v234-ground-scanned-stone-threshold" onClick={activate} userData={{ artRevision: 'v242-terrain-seated-ground-cleft', visualIntent: 'small-eroded-cavern-mouth-inside-existing-geology', semanticOwner: 'home-current-ground-geological-descent', morphology: 'weathered-world-emergent-descent' }}>
    <Suspense fallback={null}>
      <ScannedRock variant="01" position={[-.92, -.38, -.88]} rotation={[.18, .62, -.16]} scale={[.72, .58, .70]} />
      <ScannedRock variant="02" position={[
        .96, -.40, -.94,
      ]} rotation={[-.12, -.78, .12]} scale={[.74, .60, .72]} />
      <ScannedRock variant="02" position={[-.58, .49, -1.00]} rotation={[.30, .36, .32]} scale={[.46, .42, .48]} />
      <ScannedRock variant="01" position={[
        .52, .57, -1.04,
      ]} rotation={[-.24, -.30, -.28]} scale={[.44, .40, .46]} />
    </Suspense>
    <mesh geometry={outer} position={[0, -.03, -1.16]}><meshStandardMaterial color="#171815" emissive="#4c2418" emissiveIntensity={.065} roughness={1} /></mesh>
    <mesh geometry={inner} position={[0, -.08, -1.23]}><meshStandardMaterial color="#020302" roughness={1} /></mesh>
    <mesh geometry={path} position={[0, -.79, -.05]} receiveShadow><meshStandardMaterial vertexColors color="#625243" roughness={1} /></mesh>
    <pointLight position={[.04, -.18, -1.04]} color="#c97b54" intensity={.45} distance={2.7} decay={2} />
  </group>
}

function LifeMapThresholdV234({ onLifeMap }: { onLifeMap: () => void }) {
  const y = height(LIFE_MAP.x, LIFE_MAP.z)
  const outer = useMemo(() => apertureGeometry(.70, 1.02, 7.8), [])
  const inner = useMemo(() => apertureGeometry(.54, .84, 4.6), [])
  const path = useMemo(() => wornPathGeometry(2.8, .40, .18), [])
  const stars = useMemo(() => {
    const count = 120
    const positions = new Float32Array(count * 3)
    const colors = new Float32Array(count * 3)
    const warm = new THREE.Color('#ccb894')
    const cool = new THREE.Color('#79a99f')
    for (let index = 0; index < count; index++) {
      const angle = index * 2.39996323
      const radius = .15 + Math.sqrt((index + .5) / count) * .70
      const depth = (index % 15) * .10
      positions.set([Math.cos(angle) * radius, .74 + Math.sin(angle) * radius * 1.35, -1.10 - depth], index * 3)
      const color = warm.clone().lerp(cool, (index % 8) / 7)
      colors.set([color.r, color.g, color.b], index * 3)
    }
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    return geometry
  }, [])
  useEffect(() => () => { outer.dispose(); inner.dispose(); path.dispose(); stars.dispose() }, [inner, outer, path, stars])
  const activate = (event: ThreeEvent<MouseEvent>) => { event.stopPropagation(); onLifeMap() }
  return <group position={[LIFE_MAP.x, y + .18, LIFE_MAP.z]} rotation={[0, .04, 0]} name="home-v234-life-map-rooted-observatory" onClick={activate} userData={{ artRevision: 'v242-terrain-seated-lineage-cleft', visualIntent: 'small-asymmetric-rock-rift-with-depth', semanticOwner: 'home-current-life-map-rooted-ascent', morphology: 'rooted-ascent-not-tube-portal' }}>
    <Suspense fallback={null}>
      <ScannedRock variant="02" position={[-.78, -.25, -.62]} rotation={[.10, .82, -.15]} scale={[.62, .45, .58]} />
      <ScannedRock variant="01" position={[
        .82, -.27, -.68,
      ]} rotation={[.06, -.88, .10]} scale={[.60, .44, .56]} />
      <ScannedRock variant="01" position={[-.46, .66, -.78]} rotation={[.32, .46, .36]} scale={[.38, .44, .40]} />
      <ScannedRock variant="02" position={[
        .40, .76, -.84,
      ]} rotation={[-.28, -.38, -.30]} scale={[.36, .46, .38]} />
    </Suspense>
    <mesh geometry={outer} position={[0, .12, -.92]}><meshStandardMaterial color="#111715" emissive="#183b34" emissiveIntensity={.055} roughness={1} /></mesh>
    <mesh geometry={inner} position={[0, .10, -1.00]}><meshStandardMaterial color="#020504" roughness={1} /></mesh>
    <mesh geometry={path} position={[0, -.18, .12]} rotation={[.10, 0, 0]} receiveShadow><meshStandardMaterial vertexColors color="#665d4e" roughness={1} /></mesh>
    <points geometry={stars}><pointsMaterial vertexColors size={.024} sizeAttenuation transparent opacity={.62} depthWrite={false} blending={THREE.AdditiveBlending} /></points>
    <pointLight position={[0, .72, -1.00]} color="#739f96" intensity={.28} distance={3.0} decay={2} />
  </group>
}

function livingMemoryGeometry() {
  const geometry = new THREE.IcosahedronGeometry(1, 5)
  const position = geometry.getAttribute('position') as THREE.BufferAttribute
  const colors: number[] = []
  const deep = new THREE.Color('#1b2923')
  const tissue = new THREE.Color('#53665a')
  const scarColor = new THREE.Color('#91a393')
  for (let index = 0; index < position.count; index++) {
    const nx = position.getX(index), ny = position.getY(index), nz = position.getZ(index)
    const angle = Math.atan2(nz, nx), crown = Math.max(0, ny), lower = Math.max(0, -ny)
    const coarse = .13 * Math.sin(angle * 3.1 + ny * 3.0) + .07 * Math.cos(angle * 5.7 - ny * 4.6)
    const scar = .050 * Math.sin(nx * 10.5 + nz * 7.2 + ny * 6.4)
    const cleft = Math.exp(-((nx * .86 + nz * .30 - .025) ** 2) / .035) * Math.pow(crown, 1.45)
    const cavity = Math.exp(-(((nx + .34) * .86) ** 2 + ((nz - .10) * 1.04) ** 2) / .12) * (.28 + .72 * crown)
    const radial = 1 + coarse + scar - .28 * cleft - .15 * cavity
    let x = nx * radial * .90 + ny * .16 - .06
    let z = nz * radial * .64 + .04 * Math.sin(ny * 5.2 + angle * 2)
    const twist = (ny + .18) * .24
    const cos = Math.cos(twist), sin = Math.sin(twist), tx = x * cos - z * sin, tz = x * sin + z * cos
    x = tx; z = tz
    let y = ny * .78 - .18 - .22 * cleft - .08 * cavity
    y -= lower * (.16 + .12 * lower)
    position.setXYZ(index, x, y, z)
    const h = THREE.MathUtils.clamp((y + .98) / 1.65, 0, 1)
    const scarWeight = THREE.MathUtils.clamp(cleft + cavity * .45 + Math.abs(scar) * 4, 0, 1)
    const color = deep.clone().lerp(tissue, .30 + .44 * h).lerp(scarColor, .025 + .14 * scarWeight)
    colors.push(color.r, color.g, color.b)
  }
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  geometry.computeVertexNormals()
  geometry.computeBoundingSphere()
  return geometry
}

function memoryInteriorGeometry() {
  const count = 72
  const positions = new Float32Array(count * 3)
  for (let index = 0; index < count; index++) {
    const t = (index + .5) / count
    const angle = index * 2.39996323
    const radius = Math.pow(t, .62) * .43
    const y = -.38 + (index % 17) / 16 * .70
    positions.set([Math.cos(angle) * radius * (1 - .32 * Math.abs(y)), y, Math.sin(angle) * radius * .54], index * 3)
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  return geometry
}

const stateIntensity: Record<OrbState, number> = { dormant:.03, idle:.09, attention:.18, listening:.14, thinking:.16, speaking:.22, guiding:.15, reflecting:.12, calming:.08, privacy:.13, warning:.24, transition:.16 }

function LivingMemoryHeartV234({ state, reducedMotion, onOrb }: { state: OrbState; reducedMotion: boolean; onOrb: () => void }) {
  const root = useRef<THREE.Group>(null)
  const y = height(ORB.x, ORB.z)
  const outer = useMemo(livingMemoryGeometry, [])
  const interior = useMemo(memoryInteriorGeometry, [])
  useEffect(() => () => { outer.dispose(); interior.dispose() }, [interior, outer])
  useFrame(({ clock }) => {
    if (!root.current || reducedMotion) return
    const t = clock.elapsedTime
    const breath = 1 + Math.sin(t * .48) * .006
    root.current.position.y = y + .86 + Math.sin(t * .32) * .008
    root.current.rotation.y = -.22 + Math.sin(t * .16) * .024
    root.current.rotation.z = -.08 + Math.sin(t * .23) * .008
    root.current.scale.setScalar(breath)
  })
  const e = (reducedMotion ? .72 : 1) * stateIntensity[state]
  const warning = state === 'warning', privacy = state === 'privacy'
  const glow = warning ? '#a25c49' : privacy ? '#4e7d83' : '#5d8a76'
  const activate = (event: ThreeEvent<MouseEvent>) => { event.stopPropagation(); onOrb() }
  return <group ref={root} position={[ORB.x, y + .86, ORB.z]} rotation={[.04, -.22, -.08]} name="home-v234-living-memory-heart" onClick={activate} userData={{ artRevision: 'v242-low-scarred-living-memory-presence', visualIntent: 'one-connected-history-bearing-presence', semanticOwner: 'home-current-orb-surface-memory', materialLanguage: 'matte-stratified-memory-tissue' }}>
    <mesh geometry={outer} scale={[.62, .68, .60]} castShadow receiveShadow>
      <meshStandardMaterial vertexColors color="#687568" emissive={glow} emissiveIntensity={.018 + e * .12} roughness={.92} metalness={0} />
    </mesh>
    <points geometry={interior} scale={[.62,.68,.60]}><pointsMaterial color={glow} size={.018} transparent opacity={.20 + e * .20} depthWrite={false} blending={THREE.AdditiveBlending} /></points>
    <pointLight color={glow} intensity={.10 + e * .32} distance={2.8} decay={2} />
  </group>
}

function SubtleAtmosphereV234({ reducedMotion }: { reducedMotion: boolean }) {
  const root = useRef<THREE.Points>(null)
  const geometry = useMemo(() => {
    const count = 120
    const positions = new Float32Array(count * 3)
    const colors = new Float32Array(count * 3)
    const warm = new THREE.Color('#b99973'), cool = new THREE.Color('#7ca8a0')
    for (let index = 0; index < count; index++) {
      const t = index / count, angle = index * 2.39996323, radius = 2.8 + Math.sqrt(t) * 10
      const x = Math.cos(angle) * radius, z = 2.2 - t * 20 + Math.sin(index * .71) * .62, y = height(x, z) + .46 + (index % 11) * .13
      positions.set([x, y, z], index * 3)
      const color = warm.clone().lerp(cool, .35 + .48 * ((index % 9) / 8))
      colors.set([color.r, color.g, color.b], index * 3)
    }
    const result = new THREE.BufferGeometry()
    result.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    result.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    return result
  }, [])
  useEffect(() => () => geometry.dispose(), [geometry])
  useFrame(({ clock }) => { if (root.current && !reducedMotion) root.current.position.y = Math.sin(clock.elapsedTime * .10) * .014 })
  return <points ref={root} geometry={geometry} frustumCulled={false} name="home-v234-subtle-atmospheric-depth"><pointsMaterial size={.017} sizeAttenuation transparent opacity={.20} vertexColors depthWrite={false} blending={THREE.AdditiveBlending} /></points>
}

export function HomeCurrentArtRepair({ orbState, reducedMotion, onOrb, onGround, onLifeMap }: { orbState: OrbState; reducedMotion: boolean; onOrb: () => void; onGround: () => void; onLifeMap: () => void }) {
  return <group name="home-current-authority-art-repair" userData={{ artRevision: 'v242-terrain-seated-thresholds-low-scarred-orb' }}><RetireSupersededShapes /><GroundThresholdV234 onGround={onGround} /><LifeMapThresholdV234 onLifeMap={onLifeMap} /><LivingMemoryHeartV234 state={orbState} reducedMotion={reducedMotion} onOrb={onOrb} /><SubtleAtmosphereV234 reducedMotion={reducedMotion} /></group>
}
