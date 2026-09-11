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
      if (!(object instanceof THREE.Mesh)) return
      object.castShadow = true
      object.receiveShadow = true
      const sources = Array.isArray(object.material) ? object.material : [object.material]
      const materials = sources.map((source) => {
        const material = source.clone()
        if (material instanceof THREE.MeshStandardMaterial) {
          material.roughness = Math.max(.86, material.roughness)
          material.metalness = 0
          material.color.multiplyScalar(.62)
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
  return <primitive object={model} position={position} rotation={rotation} scale={scale}/>
}

function aperturePoints(seed: number, width: number, heightValue: number, segments = 52) {
  const points: THREE.Vector2[] = []
  for (let index = 0; index < segments; index++) {
    const angle = index / segments * Math.PI * 2
    const lateral = Math.cos(angle)
    const vertical = Math.sin(angle)
    const irregular = 1
      + .045 * Math.sin(angle * 3 + seed * .37)
      + .026 * Math.sin(angle * 7 - seed * .19)
      + .014 * Math.cos(angle * 11 + seed)
    const shoulder = .88 + .12 * Math.pow(Math.max(0, vertical), .7)
    points.push(new THREE.Vector2(
      lateral * width * irregular * shoulder,
      vertical * heightValue * irregular + .08 * Math.sin(angle * 2 + seed),
    ))
  }
  return points
}

function cavernShellGeometry(seed: number) {
  const outer = aperturePoints(seed, 2.05, 1.72, 64)
  const inner = aperturePoints(seed + 11, 1.02, 1.24, 64).reverse()
  const shape = new THREE.Shape(outer)
  shape.holes.push(new THREE.Path(inner))
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: .92,
    steps: 2,
    bevelEnabled: true,
    bevelSegments: 4,
    bevelSize: .14,
    bevelThickness: .14,
    curveSegments: 64,
  })
  geometry.translate(0, 0, -.46)
  const position = geometry.getAttribute('position') as THREE.BufferAttribute
  for (let index = 0; index < position.count; index++) {
    const x = position.getX(index)
    const y = position.getY(index)
    const z = position.getZ(index)
    const weather = .032 * Math.sin(x * 4.7 + y * 5.1 + seed)
      + .018 * Math.sin((x - z) * 11.3 + seed * .4)
      + .012 * Math.cos((y + z) * 17.1 - seed)
    const edgeBias = THREE.MathUtils.clamp(Math.hypot(x / 2.1, y / 1.75), .2, 1.4)
    position.setXYZ(index, x * (1 + weather * .22), y + weather * .46 * edgeBias, z + weather * .55)
  }
  geometry.computeVertexNormals()
  return geometry
}

function apertureFillGeometry(seed: number, width: number, heightValue: number) {
  const boundary = aperturePoints(seed, width, heightValue, 64)
  const positions = [0, 0, 0]
  const indices: number[] = []
  boundary.forEach((point) => positions.push(point.x, point.y, 0))
  for (let index = 0; index < boundary.length; index++) {
    indices.push(0, 1 + index, 1 + ((index + 1) % boundary.length))
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}

function wornPathGeometry() {
  const segments = 18
  const positions: number[] = []
  const indices: number[] = []
  for (let index = 0; index <= segments; index++) {
    const t = index / segments
    const z = -1.15 + t * 3.9
    const centerX = -.08 + Math.sin(t * 4.8) * .13 + Math.sin(t * 1.9) * .08
    const width = THREE.MathUtils.lerp(.72, .38, t) * (1 + .08 * Math.sin(index * 1.7))
    const y = -.03 + .018 * Math.sin(index * 1.23)
    positions.push(centerX - width, y, z, centerX + width, y + .006, z)
    if (index < segments) {
      const a = index * 2, b = a + 1, c = a + 2, d = a + 3
      indices.push(a, c, b, b, c, d)
    }
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}

function GroundThresholdV234() {
  const y = height(GROUND.x, GROUND.z)
  const shell = useMemo(() => cavernShellGeometry(47), [])
  const darkness = useMemo(() => apertureFillGeometry(58, .96, 1.16), [])
  const wornPath = useMemo(wornPathGeometry, [])
  useEffect(() => () => { shell.dispose(); darkness.dispose(); wornPath.dispose() }, [darkness, shell, wornPath])

  return <group position={[GROUND.x, y + 1.13, GROUND.z]} rotation={[0, -.055, 0]} name="home-v234-ground-scanned-stone-threshold" userData={{ artRevision:'v235-continuous-eroded-cavern-threshold', visualIntent:'continuous-cliff-mouth-not-rock-ring', semanticOwner:'home-current-ground-geological-descent', morphology:'weathered-world-emergent-descent' }}>
    <mesh geometry={shell} position={[0, -.04, -1.78]} castShadow receiveShadow>
      <meshPhysicalMaterial color="#343933" roughness={.98} metalness={0} clearcoat={.01} clearcoatRoughness={1}/>
    </mesh>
    <Suspense fallback={null}>
      <ScannedRock variant="01" position={[-1.48, -.74, -1.92]} rotation={[.18, .48, -.16]} scale={[1.28, 1.05, 1.22]}/>
      <ScannedRock variant="02" position={[1.58, -.70, -2.02]} rotation={[-.10, -.72, .12]} scale={[1.36, 1.08, 1.18]}/>
      <ScannedRock variant="02" position={[-.48, 1.32, -2.03]} rotation={[.44, .12, -.30]} scale={[1.05, .72, .92]}/>
    </Suspense>
    <mesh geometry={darkness} position={[0, -.02, -2.34]} scale={[1, 1.02, 1]}>
      <meshStandardMaterial color="#050706" emissive="#2d1510" emissiveIntensity={.22} roughness={1}/>
    </mesh>
    <mesh geometry={wornPath} position={[0, -1.13, -1.16]} receiveShadow>
      <meshStandardMaterial color="#4c392d" emissive="#31150e" emissiveIntensity={.07} roughness={1}/>
    </mesh>
    <pointLight position={[-.18, -.26, -2.12]} color="#db8f62" intensity={1.38} distance={5.2} decay={2}/>
    <pointLight position={[.36, .48, -2.66]} color="#8d3e2b" intensity={.54} distance={3.6} decay={2}/>
    <spotLight position={[-.62, 2.75, .15]} target-position={[0, -.02, -2.0]} color="#efc59e" intensity={.44} distance={8.6} angle={.36} penumbra={.98} decay={2}/>
  </group>
}

function membrane(points: THREE.Vector3[], widths: number[], thickness = .025) {
  const curve = new THREE.CatmullRomCurve3(points, false, 'centripetal', .42)
  const samples = 72
  const positions: number[] = []
  const indices: number[] = []
  const tangent = new THREE.Vector3()
  const side = new THREE.Vector3()
  const up = new THREE.Vector3(0, 1, 0)
  for (let index = 0; index <= samples; index++) {
    const t = index / samples
    const point = curve.getPoint(t)
    curve.getTangent(t, tangent).normalize()
    side.crossVectors(tangent, up)
    if (side.lengthSq() < .001) side.set(1, 0, 0)
    side.normalize()
    const width = THREE.MathUtils.lerp(widths[0], widths[widths.length - 1], t)
      * (1 + .14 * Math.sin(t * Math.PI * 2.7))
    const lift = up.clone().multiplyScalar(thickness * Math.sin(t * Math.PI))
    const left = point.clone().addScaledVector(side, width).add(lift)
    const right = point.clone().addScaledVector(side, -width).add(lift)
    positions.push(left.x, left.y, left.z, right.x, right.y, right.z)
    if (index < samples) {
      const a = index * 2, b = a + 1, c = a + 2, d = a + 3
      indices.push(a, b, c, b, d, c)
    }
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}

function LifeMapThresholdV234() {
  const y = height(LIFE_MAP.x, LIFE_MAP.z)
  const membranes = useMemo(() => [
    membrane([new THREE.Vector3(-1.72,-.18,.22),new THREE.Vector3(-1.46,.58,-.08),new THREE.Vector3(-1.00,1.52,-.38),new THREE.Vector3(-.38,2.34,-.62)], [.28,.12], .035),
    membrane([new THREE.Vector3(-1.12,-.12,.12),new THREE.Vector3(-.96,.72,-.20),new THREE.Vector3(-.64,1.62,-.48),new THREE.Vector3(-.12,2.62,-.72)], [.22,.09], .03),
    membrane([new THREE.Vector3(1.58,-.16,.18),new THREE.Vector3(1.38,.66,-.12),new THREE.Vector3(.98,1.54,-.42),new THREE.Vector3(.42,2.48,-.66)], [.26,.11], .034),
    membrane([new THREE.Vector3(.92,-.08,.10),new THREE.Vector3(.84,.82,-.26),new THREE.Vector3(.54,1.66,-.52),new THREE.Vector3(.04,2.70,-.74)], [.20,.075], .028),
    membrane([new THREE.Vector3(-1.42,.16,-.06),new THREE.Vector3(-.78,.34,-.46),new THREE.Vector3(.12,.48,-.78),new THREE.Vector3(1.24,.20,-.98)], [.16,.08], .022),
  ], [])
  const aperture = useMemo(() => apertureFillGeometry(83, .90, 1.24), [])
  const starField = useMemo(() => {
    const count = 130
    const positions = new Float32Array(count * 3)
    for (let index = 0; index < count; index++) {
      const angle = index * 2.39996323
      const radius = .12 + Math.sqrt((index + .5) / count) * .78
      const x = Math.cos(angle) * radius * (1 + .08 * Math.sin(index * .71))
      const yy = Math.sin(angle) * radius * 1.08
      const z = -.88 - (index % 11) * .035
      positions.set([x, 1.28 + yy, z], index * 3)
    }
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    return geometry
  }, [])
  useEffect(() => () => { membranes.forEach((geometry) => geometry.dispose()); aperture.dispose(); starField.dispose() }, [aperture, membranes, starField])

  return <group position={[LIFE_MAP.x, y, LIFE_MAP.z]} rotation={[0, .055, 0]} name="home-v234-life-map-rooted-observatory" userData={{ artRevision:'v235-folded-lineage-rift', visualIntent:'asymmetric-rooted-membrane-threshold-not-pipes', semanticOwner:'home-current-life-map-rooted-ascent', morphology:'rooted-ascent-not-tube-portal' }}>
    <Suspense fallback={null}>
      <ScannedRock variant="02" position={[-1.42,-.62,.08]} rotation={[0,.68,-.10]} scale={[1.02,.58,.90]}/>
      <ScannedRock variant="01" position={[1.36,-.58,.04]} rotation={[0,-.78,.08]} scale={[.96,.55,.84]}/>
    </Suspense>
    {membranes.map((geometry, index) => <mesh key={index} geometry={geometry} castShadow receiveShadow>
      <meshPhysicalMaterial color={index % 2 ? '#39483f' : '#4b3f47'} emissive={index % 2 ? '#112b25' : '#2b1c29'} emissiveIntensity={.055} roughness={.88} metalness={.005} clearcoat={.03} clearcoatRoughness={.86} side={THREE.DoubleSide}/>
    </mesh>)}
    <mesh geometry={aperture} position={[0, 1.28, -.82]} scale={[1, 1.10, 1]}>
      <meshPhysicalMaterial color="#071315" emissive="#1d5a5b" emissiveIntensity={.24} roughness={.46} transparent opacity={.66} transmission={.035} depthWrite={false} side={THREE.DoubleSide}/>
    </mesh>
    <points geometry={starField}>
      <pointsMaterial color="#b5e4d7" size={.032} sizeAttenuation transparent opacity={.86} depthWrite={false} blending={THREE.AdditiveBlending}/>
    </points>
    <pointLight position={[0,1.36,-.58]} color="#79bfb0" intensity={.86} distance={5.4} decay={2}/>
    <spotLight position={[.36,3.46,.68]} target-position={[0,1.26,-.72]} color="#bddbd4" intensity={.42} distance={8.2} angle={.30} penumbra={.98} decay={2}/>
  </group>
}

function livingMemoryGeometry() {
  const geometry = new THREE.SphereGeometry(1, 72, 52)
  const position = geometry.getAttribute('position') as THREE.BufferAttribute
  for (let index = 0; index < position.count; index++) {
    const sx = position.getX(index)
    const sy = position.getY(index)
    const sz = position.getZ(index)
    const azimuth = Math.atan2(sz, sx)
    const normalizedY = THREE.MathUtils.clamp((sy + 1) * .5, 0, 1)
    const crown = THREE.MathUtils.smoothstep(sy, .18, .98)
    const taper = THREE.MathUtils.lerp(.48, 1, THREE.MathUtils.smoothstep(sy, -.94, .24))
    const shoulder = .80 + .26 * Math.sin(Math.PI * normalizedY)
    const asymmetry = 1
      + .11 * Math.sin(azimuth + .45) * (.35 + .65 * normalizedY)
      + .065 * Math.sin(azimuth * 3 - .8) * Math.sin(Math.PI * normalizedY)
    const folded = 1 + .045 * Math.sin(azimuth * 5 + sy * 7.1) + .026 * Math.sin(azimuth * 9 - sy * 4.3)
    const front = Math.max(0, Math.sin(azimuth))
    const crownCleft = crown * crown * Math.pow(front, 3)
    const sidePull = crown * .13 * Math.sin(azimuth * 2 + .35)
    const twist = .10 * sy + .045 * Math.sin(sy * 3.2)
    const cos = Math.cos(twist), sin = Math.sin(twist)
    const x0 = sx * .72 * shoulder * taper * asymmetry * folded + sidePull
    const z0 = sz * .58 * shoulder * taper * (1 + .05 * Math.cos(azimuth * 2 - .4))
    const x = x0 * cos - z0 * sin
    const z = x0 * sin + z0 * cos
    const y = sy * 1.12 - .20 - crownCleft * .26 + .035 * Math.sin(azimuth * 4 + sy * 5.4)
    position.setXYZ(index, x, y, z)
  }
  geometry.computeVertexNormals()
  return geometry
}

function memoryVeinGeometry(index: number) {
  const side = index % 2 ? -1 : 1
  const lane = Math.floor(index / 2)
  const points: THREE.Vector3[] = []
  const segments = 38
  for (let step = 0; step <= segments; step++) {
    const t = step / segments
    const y = -.76 + t * 1.54
    const envelope = Math.sin(Math.PI * t)
    const x = side * (.055 + lane * .055) * envelope + Math.sin(t * 5.1 + index) * .018
    const z = .50 * envelope + .03 + lane * .018 - .08 * t
    points.push(new THREE.Vector3(x, y, z))
  }
  return membrane(points, [.020, .008], .008)
}

const stateIntensity: Record<OrbState, number> = {
  dormant:.05,idle:.14,attention:.28,listening:.22,thinking:.25,speaking:.32,guiding:.23,reflecting:.18,calming:.12,privacy:.20,warning:.35,transition:.24,
}

function LivingMemoryHeartV234({ state, reducedMotion }: { state: OrbState; reducedMotion: boolean }) {
  const root = useRef<THREE.Group>(null)
  const y = height(ORB.x, ORB.z)
  const outer = useMemo(livingMemoryGeometry, [])
  const veins = useMemo(() => Array.from({ length: 8 }, (_, index) => memoryVeinGeometry(index)), [])
  useEffect(() => () => { outer.dispose(); veins.forEach((geometry) => geometry.dispose()) }, [outer, veins])
  useFrame(({ clock }) => {
    if (!root.current || reducedMotion) return
    const t = clock.elapsedTime
    const breath = 1 + Math.sin(t * .62) * .018
    root.current.position.y = y + 1.23 + Math.sin(t * .51) * .018
    root.current.rotation.y = -.22 + Math.sin(t * .21) * .045
    root.current.rotation.z = .045 + Math.sin(t * .31) * .014
    root.current.scale.setScalar(1.18 * breath)
  })
  const e = reducedMotion ? stateIntensity[state] * .82 : stateIntensity[state]
  const warning = state === 'warning'
  const privacy = state === 'privacy'
  const glow = warning ? '#9f4e3c' : privacy ? '#3e7884' : '#417565'
  const skin = warning ? '#8a665c' : privacy ? '#6f8588' : '#6f7669'
  const inner = warning ? '#472922' : privacy ? '#24444a' : '#263f36'

  return <group ref={root} position={[ORB.x, y + 1.23, ORB.z]} rotation={[.055,-.22,.045]} scale={1.18} name="home-v234-living-memory-heart" userData={{ artRevision:'v235-single-folded-memory-organism', visualIntent:'one-connected-asymmetric-layered-presence', semanticOwner:'home-current-orb-surface-memory', materialLanguage:'surface-bound-nervature' }}>
    <mesh geometry={outer} scale={[.82,.88,.80]}>
      <meshPhysicalMaterial color={inner} emissive={glow} emissiveIntensity={.12 + e * .72} roughness={.58} metalness={.01} clearcoat={.06} clearcoatRoughness={.72}/>
    </mesh>
    <mesh geometry={outer} castShadow receiveShadow>
      <meshPhysicalMaterial color={skin} emissive={glow} emissiveIntensity={.045 + e * .34} roughness={.44} metalness={.01} clearcoat={.14} clearcoatRoughness={.48} transparent opacity={.76} transmission={.035} thickness={.22} depthWrite/>
    </mesh>
    {veins.map((geometry, index) => <mesh key={index} geometry={geometry} position={[0,-.10,.025]}>
      <meshStandardMaterial color={index % 3 === 0 ? '#bdc7ad' : '#86aa9b'} emissive={glow} emissiveIntensity={.28 + e * .82} roughness={.62} transparent opacity={.50} depthWrite={false} side={THREE.DoubleSide}/>
    </mesh>)}
    <pointLight color={warning ? '#c7674e' : privacy ? '#6aa4b0' : '#79b09d'} intensity={.34 + e * 1.08} distance={4.8} decay={2}/>
  </group>
}

function SubtleAtmosphereV234({ reducedMotion }: { reducedMotion: boolean }) {
  const root = useRef<THREE.Points>(null)
  const geometry = useMemo(() => {
    const count = 144
    const positions = new Float32Array(count * 3)
    const colors = new Float32Array(count * 3)
    const warm = new THREE.Color('#b99973')
    const cool = new THREE.Color('#7ca8a0')
    for (let index = 0; index < count; index++) {
      const t = index / count
      const angle = index * 2.39996323
      const radius = 2.6 + Math.sqrt(t) * 11
      const x = Math.cos(angle) * radius
      const z = 2.8 - t * 22 + Math.sin(index * .71) * .72
      const y = height(x, z) + .52 + (index % 13) * .15
      positions.set([x, y, z], index * 3)
      const color = warm.clone().lerp(cool, .35 + .48 * ((index % 9) / 8))
      colors.set([color.r, color.g, color.b], index * 3)
    }
    const next = new THREE.BufferGeometry()
    next.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    next.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    return next
  }, [])
  useEffect(() => () => geometry.dispose(), [geometry])
  useFrame(({ clock }) => {
    if (root.current && !reducedMotion) root.current.position.y = Math.sin(clock.elapsedTime * .12) * .022
  })
  return <points ref={root} geometry={geometry} frustumCulled={false} name="home-v234-subtle-atmospheric-depth">
    <pointsMaterial size={.020} sizeAttenuation transparent opacity={.24} vertexColors depthWrite={false} blending={THREE.AdditiveBlending}/>
  </points>
}

export function HomeCurrentArtRepair({ orbState, reducedMotion }: { orbState: OrbState; reducedMotion: boolean }) {
  return <group name="home-current-authority-art-repair" userData={{ artRevision:'v235-continuous-cavern-lineage-rift-single-folded-memory-organism' }}>
    <RetireSupersededShapes/>
    <GroundThresholdV234/>
    <LifeMapThresholdV234/>
    <LivingMemoryHeartV234 state={orbState} reducedMotion={reducedMotion}/>
    <SubtleAtmosphereV234 reducedMotion={reducedMotion}/>
  </group>
}
