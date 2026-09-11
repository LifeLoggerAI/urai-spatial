'use client'

import { useEffect, useMemo } from 'react'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'
import type { OrbState } from '@/app/home/orbStateController'
import { GROUND, LIFE_MAP, ORB, height } from './HomeWorldProductionV223Geometry'

function sculptedMass(seed: number) {
  const geometry = new THREE.IcosahedronGeometry(1, 4)
  const positions = geometry.getAttribute('position') as THREE.BufferAttribute
  for (let index = 0; index < positions.count; index++) {
    const x = positions.getX(index), y = positions.getY(index), z = positions.getZ(index)
    const band = .075 * Math.sin(x * 6.7 + seed * 1.31) + .045 * Math.sin(y * 10.1 - z * 4.2 + seed)
    const weather = .032 * Math.cos((x + z) * 15.3 + seed * 2.2)
    const radial = 1 + band + weather
    positions.setXYZ(index, x * radial, y * radial, z * radial)
  }
  geometry.computeVertexNormals()
  return geometry
}

function membrane(points: THREE.Vector3[], startWidth: number, endWidth: number) {
  const curve = new THREE.CatmullRomCurve3(points, false, 'centripetal', .42)
  const segments = 48
  const positions: number[] = []
  const indices: number[] = []
  const tangent = new THREE.Vector3(), side = new THREE.Vector3(), up = new THREE.Vector3(0, 0, 1)
  for (let index = 0; index <= segments; index++) {
    const t = index / segments
    const center = curve.getPointAt(t)
    curve.getTangentAt(t, tangent).normalize()
    side.crossVectors(tangent, up).normalize()
    if (side.lengthSq() < .01) side.set(1, 0, 0)
    const width = THREE.MathUtils.lerp(startWidth, endWidth, t) * (.82 + .18 * Math.sin(Math.PI * t))
    const ripple = .025 * Math.sin(t * 17 + points.length)
    positions.push(
      center.x + side.x * width, center.y + side.y * width, center.z + side.z * width + ripple,
      center.x - side.x * width, center.y - side.y * width, center.z - side.z * width - ripple,
    )
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

function RetireRejectedThresholdShells() {
  const { scene } = useThree()
  useEffect(() => {
    const names = ['home-v231-ground-weathered-threshold', 'home-v228-life-map-rooted-branching-threshold']
    const changed: THREE.Object3D[] = []
    for (const name of names) {
      const object = scene.getObjectByName(name)
      if (object?.visible) {
        object.visible = false
        changed.push(object)
      }
    }
    return () => changed.forEach((object) => { object.visible = true })
  }, [scene])
  return null
}

function GeologicalGroundThreshold() {
  const y = height(GROUND.x, GROUND.z)
  const masses = useMemo(() => Array.from({ length: 8 }, (_, index) => sculptedMass(31 + index * 7)), [])
  useEffect(() => () => masses.forEach((geometry) => geometry.dispose()), [masses])
  const placements: Array<{ p: [number, number, number]; s: [number, number, number]; r: [number, number, number] }> = [
    { p: [-1.58,.55,-1.70], s: [.78,1.05,.92], r: [.08,.18,-.12] },
    { p: [-1.42,1.48,-1.78], s: [.73,.92,.88], r: [-.06,.32,.14] },
    { p: [-.92,2.23,-1.83], s: [.92,.52,.94], r: [.12,.08,-.18] },
    { p: [.06,2.48,-1.88], s: [1.12,.42,.98], r: [-.08,-.12,.05] },
    { p: [1.02,2.18,-1.80], s: [.88,.55,.92], r: [.10,-.18,.16] },
    { p: [1.45,1.36,-1.72], s: [.72,.94,.90], r: [-.10,-.34,-.10] },
    { p: [1.62,.48,-1.63], s: [.76,1.02,.96], r: [.06,-.16,.12] },
    { p: [-.12,-.02,-2.15], s: [1.72,.18,1.26], r: [.03,.08,0] },
  ]
  return <group position={[GROUND.x, y, GROUND.z]} name="home-current-ground-geological-descent" userData={{ artRevision:'current-geological-threshold-repair', character:'weathered-world-emergent-descent' }}>
    {placements.map(({ p, s, r }, index) => <mesh key={index} geometry={masses[index]} position={p} scale={s} rotation={r} castShadow receiveShadow>
      <meshStandardMaterial color={index % 3 === 0 ? '#51584e' : index % 3 === 1 ? '#626159' : '#454f49'} roughness={.96} metalness={0} />
    </mesh>)}
    <pointLight position={[-.18,.55,-2.26]} color="#b56f50" intensity={.72} distance={3.4}/>
  </group>
}

function RootedLifeMapThreshold() {
  const y = height(LIFE_MAP.x, LIFE_MAP.z)
  const roots = useMemo(() => [-1, 1].flatMap((rawSide) => Array.from({ length: 4 }, (_, tier) => {
    const side = rawSide as -1 | 1
    return membrane([
      new THREE.Vector3(side * (2.30 + tier * .18), -.12, .38 + tier * .06),
      new THREE.Vector3(side * (1.60 + tier * .12), .10 + tier * .06, .04),
      new THREE.Vector3(side * (1.30 + tier * .08), .82 + tier * .09, -.22),
      new THREE.Vector3(side * (.82 + tier * .04), 1.62 + tier * .10, -.38),
      new THREE.Vector3(side * (.24 + tier * .025), 2.26 + tier * .08, -.50),
      new THREE.Vector3(-side * (.20 + tier * .02), 2.46 + tier * .035, -.58),
    ], .34 - tier * .035, .11 - tier * .008)
  })), [])
  const buttresses = useMemo(() => Array.from({ length: 6 }, (_, index) => sculptedMass(101 + index * 11)), [])
  useEffect(() => () => { roots.forEach((geometry) => geometry.dispose()); buttresses.forEach((geometry) => geometry.dispose()) }, [buttresses, roots])
  return <group position={[LIFE_MAP.x, y, LIFE_MAP.z]} rotation={[0,.08,0]} name="home-current-life-map-rooted-ascent" userData={{ artRevision:'current-rooted-lineage-threshold-repair', character:'rooted-ascent-not-tube-portal' }}>
    {roots.map((geometry, index) => <mesh key={index} geometry={geometry} castShadow receiveShadow>
      <meshStandardMaterial side={THREE.DoubleSide} color={index % 2 ? '#62796f' : '#756b78'} emissive={index % 2 ? '#18372f' : '#302337'} emissiveIntensity={.09 + (index % 3) * .015} roughness={.86} metalness={0}/>
    </mesh>)}
    {buttresses.map((geometry,index) => {
      const side = index % 2 ? -1 : 1, row = Math.floor(index / 2)
      return <mesh key={`buttress-${index}`} geometry={geometry} position={[side * (1.50 + row * .42), .10 + row * .12, .14 + row * .20]} scale={[.48 + row * .08,.34 + row * .05,.70]} rotation={[.1 * row,side * .34,.08 * side]} castShadow receiveShadow>
        <meshStandardMaterial color={index % 2 ? '#4e625a' : '#665b68'} roughness={.94}/>
      </mesh>
    })}
    <pointLight position={[0,1.42,-.68]} color="#91c9b7" intensity={.62} distance={4.2}/>
  </group>
}

const stateIntensity: Record<OrbState, number> = {
  dormant:.06,idle:.18,attention:.34,listening:.26,thinking:.30,speaking:.38,guiding:.28,reflecting:.22,calming:.16,privacy:.24,warning:.44,transition:.30,
}

function OrbSurfaceMemory({ state, reducedMotion }: { state: OrbState; reducedMotion: boolean }) {
  const y = height(ORB.x, ORB.z)
  const plates = useMemo(() => Array.from({ length: 5 }, (_, index) => membrane([
    new THREE.Vector3(-.08 + index * .035,-.52 + index * .10,.44),
    new THREE.Vector3(-.34 - index * .035,-.08 + index * .05,.50 + index * .018),
    new THREE.Vector3(-.40 + index * .045,.38 + index * .04,.42 - index * .018),
    new THREE.Vector3(-.22 + index * .06,.72 - index * .02,.24 - index * .03),
  ], .055 + index * .008, .018)), [])
  useEffect(() => () => plates.forEach((geometry) => geometry.dispose()), [plates])
  const emission = reducedMotion ? stateIntensity[state] * .82 : stateIntensity[state]
  return <group position={[ORB.x, y + 1.02, ORB.z]} rotation={[.04,-.30,.12]} scale={1.48} name="home-current-orb-surface-memory" userData={{ artRevision:'current-integrated-memory-lamellae', semantic:'surface-bound-nervature' }}>
    {plates.map((geometry,index)=><mesh key={index} geometry={geometry} position={[index*.018,0,.02+index*.008]}>
      <meshPhysicalMaterial side={THREE.DoubleSide} color={state === 'warning' ? '#d59a77' : state === 'privacy' ? '#8fb5c4' : index % 2 ? '#a7bba7' : '#b59c91'} emissive={state === 'warning' ? '#8b3728' : state === 'privacy' ? '#31586a' : '#375f55'} emissiveIntensity={emission} roughness={.48} clearcoat={.16} transparent opacity={.76 - index * .06} depthWrite={false}/>
    </mesh>)}
  </group>
}

export function HomeCurrentArtRepair({ orbState, reducedMotion }: { orbState: OrbState; reducedMotion: boolean }) {
  return <group name="home-current-authority-art-repair">
    <RetireRejectedThresholdShells/>
    <GeologicalGroundThreshold/>
    <RootedLifeMapThreshold/>
    <OrbSurfaceMemory state={orbState} reducedMotion={reducedMotion}/>
  </group>
}
