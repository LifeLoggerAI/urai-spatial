'use client'

import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import type { OrbState } from '@/app/home/orbStateController'
import { GROUND, LIFE_MAP, ORB, height } from './HomeWorldProductionV223Geometry'

function sculptedMass(seed: number, detail = 4) {
  const geometry = new THREE.IcosahedronGeometry(1, detail)
  const positions = geometry.getAttribute('position') as THREE.BufferAttribute
  for (let index = 0; index < positions.count; index++) {
    const x = positions.getX(index), y = positions.getY(index), z = positions.getZ(index)
    const strata = .082 * Math.sin(x * 5.9 + seed * 1.31) + .046 * Math.sin(y * 9.7 - z * 4.5 + seed)
    const weather = .034 * Math.cos((x + z) * 14.7 + seed * 2.2) + .018 * Math.sin((x - z) * 21.4 - seed)
    const radial = 1 + strata + weather
    positions.setXYZ(index, x * radial, y * radial, z * radial)
  }
  geometry.computeVertexNormals()
  return geometry
}

function membrane(points: THREE.Vector3[], startWidth: number, endWidth: number, seed = 0) {
  const curve = new THREE.CatmullRomCurve3(points, false, 'centripetal', .42)
  const segments = 56
  const positions: number[] = []
  const indices: number[] = []
  const tangent = new THREE.Vector3(), side = new THREE.Vector3(), up = new THREE.Vector3(0, 0, 1)
  for (let index = 0; index <= segments; index++) {
    const t = index / segments
    const center = curve.getPointAt(t)
    curve.getTangentAt(t, tangent).normalize()
    side.crossVectors(tangent, up).normalize()
    if (side.lengthSq() < .01) side.set(1, 0, 0)
    const width = THREE.MathUtils.lerp(startWidth, endWidth, t) * (.84 + .16 * Math.sin(Math.PI * t))
    const ripple = .018 * Math.sin(t * 19 + seed * .77) + .009 * Math.sin(t * 37 - seed)
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

function heartLobe(seed: number, side: -1 | 1) {
  const geometry = new THREE.SphereGeometry(1, 36, 28)
  const positions = geometry.getAttribute('position') as THREE.BufferAttribute
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i), y = positions.getY(i), z = positions.getZ(i)
    const taper = THREE.MathUtils.lerp(.48, 1.08, THREE.MathUtils.smoothstep(y, -1, .55))
    const pulse = 1 + .025 * Math.sin(x * 7 + z * 5 + seed)
    positions.setXYZ(i, (x * .62 * taper + side * .34) * pulse, (y * .82 - .08) * pulse, z * .48 * pulse)
  }
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

function ForegroundGeology() {
  const masses = useMemo(() => Array.from({ length: 14 }, (_, index) => sculptedMass(211 + index * 13, 2)), [])
  useEffect(() => () => masses.forEach((geometry) => geometry.dispose()), [masses])
  const placements = useMemo(() => Array.from({ length: 14 }, (_, index) => {
    const side = index % 2 ? 1 : -1
    const row = Math.floor(index / 2)
    const x = side * (5.0 + (row % 3) * .74)
    const z = 3.4 - row * 3.05 + (index % 3) * .32
    return { x, z, y: height(x, z) + .16, scale: .34 + (index % 4) * .10, rot: index * .61 }
  }), [])
  return <group name="home-current-foreground-geological-breakup" userData={{ artRevision:'v233-authored-geological-edge-breakup' }}>
    {placements.map((p, index) => <mesh key={index} geometry={masses[index]} position={[p.x,p.y,p.z]} rotation={[.12 * (index % 3),p.rot,.08 * (index % 2 ? 1 : -1)]} scale={[p.scale * 1.45,p.scale,p.scale * 1.15]} castShadow receiveShadow>
      <meshPhysicalMaterial color={index % 3 === 0 ? '#4b564e' : index % 3 === 1 ? '#596157' : '#3e4b46'} roughness={.91} metalness={.01} clearcoat={.025} clearcoatRoughness={.9}/>
    </mesh>)}
  </group>
}

function GeologicalGroundThreshold() {
  const y = height(GROUND.x, GROUND.z)
  const masses = useMemo(() => Array.from({ length: 13 }, (_, index) => sculptedMass(31 + index * 7)), [])
  useEffect(() => () => masses.forEach((geometry) => geometry.dispose()), [masses])
  const placements: Array<{ p: [number, number, number]; s: [number, number, number]; r: [number, number, number] }> = [
    { p: [-1.88,.34,-1.42], s: [.72,.84,1.06], r: [.08,.18,-.12] },
    { p: [-1.67,1.14,-1.66], s: [.76,1.02,.98], r: [-.06,.32,.14] },
    { p: [-1.35,2.02,-1.82], s: [.84,.72,.96], r: [.12,.08,-.18] },
    { p: [-.72,2.58,-1.98], s: [.92,.50,.92], r: [-.08,-.12,.05] },
    { p: [.06,2.78,-2.05], s: [1.08,.42,1.02], r: [.04,.06,-.02] },
    { p: [.82,2.55,-1.96], s: [.94,.52,.94], r: [.10,-.18,.16] },
    { p: [1.42,1.98,-1.78], s: [.78,.76,.92], r: [-.10,-.34,-.10] },
    { p: [1.76,1.10,-1.58], s: [.74,1.04,1.04], r: [.06,-.16,.12] },
    { p: [1.92,.28,-1.40], s: [.70,.82,1.02], r: [.04,-.28,.08] },
    { p: [-1.22,.02,-2.18], s: [.92,.20,1.42], r: [.03,.18,0] },
    { p: [.04,-.04,-2.34], s: [1.30,.16,1.66], r: [.02,.02,0] },
    { p: [1.18,.02,-2.14], s: [.94,.19,1.40], r: [.03,-.18,0] },
    { p: [.02,.78,-2.62], s: [1.02,.46,.56], r: [0,.08,.03] },
  ]
  return <group position={[GROUND.x, y, GROUND.z]} name="home-current-ground-geological-descent" userData={{ artRevision:'v233-geological-threshold-depth-pass', character:'weathered-world-emergent-descent' }}>
    {placements.map(({ p, s, r }, index) => <mesh key={index} geometry={masses[index]} position={p} scale={s} rotation={r} castShadow receiveShadow>
      <meshPhysicalMaterial color={index % 4 === 0 ? '#3c443e' : index % 4 === 1 ? '#596158' : index % 4 === 2 ? '#474f49' : '#66645a'} roughness={.93} metalness={.01} clearcoat={.025} clearcoatRoughness={.9}/>
    </mesh>)}
    <mesh position={[0,.88,-2.48]} rotation={[-Math.PI/2,0,0]}>
      <circleGeometry args={[.92,48]}/>
      <meshPhysicalMaterial color="#130c0a" emissive="#7c3527" emissiveIntensity={.38} roughness={.42} metalness={.03} transparent opacity={.78} depthWrite={false}/>
    </mesh>
    <pointLight position={[-.18,.72,-2.46]} color="#cf7655" intensity={1.05} distance={4.8} decay={2}/>
    <spotLight position={[.15,3.1,-.7]} target-position={[0,.6,-2.5]} color="#d3a77e" intensity={.62} distance={8.5} angle={.42} penumbra={.94} decay={2}/>
  </group>
}

function RootedLifeMapThreshold() {
  const y = height(LIFE_MAP.x, LIFE_MAP.z)
  const roots = useMemo(() => [-1, 1].flatMap((rawSide) => Array.from({ length: 5 }, (_, tier) => {
    const side = rawSide as -1 | 1
    return membrane([
      new THREE.Vector3(side * (2.62 + tier * .13), -.12, .46 + tier * .08),
      new THREE.Vector3(side * (1.92 + tier * .10), .12 + tier * .05, .02),
      new THREE.Vector3(side * (1.48 + tier * .07), .88 + tier * .08, -.26),
      new THREE.Vector3(side * (.92 + tier * .035), 1.78 + tier * .09, -.48),
      new THREE.Vector3(side * (.30 + tier * .02), 2.50 + tier * .07, -.64),
      new THREE.Vector3(-side * (.16 + tier * .02), 2.74 + tier * .03, -.76),
    ], .38 - tier * .036, .105 - tier * .006, tier + (side > 0 ? 11 : 3))
  })), [])
  const buttresses = useMemo(() => Array.from({ length: 8 }, (_, index) => sculptedMass(101 + index * 11)), [])
  useEffect(() => () => { roots.forEach((geometry) => geometry.dispose()); buttresses.forEach((geometry) => geometry.dispose()) }, [buttresses, roots])
  return <group position={[LIFE_MAP.x, y, LIFE_MAP.z]} rotation={[0,.08,0]} name="home-current-life-map-rooted-ascent" userData={{ artRevision:'v233-lineage-canopy-depth-pass', character:'rooted-ascent-not-tube-portal' }}>
    {roots.map((geometry, index) => <mesh key={index} geometry={geometry} castShadow receiveShadow>
      <meshPhysicalMaterial side={THREE.DoubleSide} color={index % 2 ? '#6c8277' : '#756b80'} emissive={index % 2 ? '#173b31' : '#382640'} emissiveIntensity={.12 + (index % 3) * .018} roughness={.76} metalness={.02} clearcoat={.08} clearcoatRoughness={.7}/>
    </mesh>)}
    {buttresses.map((geometry,index) => {
      const side = index % 2 ? -1 : 1, row = Math.floor(index / 2)
      return <mesh key={`buttress-${index}`} geometry={geometry} position={[side * (1.54 + row * .38), .08 + row * .10, .22 + row * .19]} scale={[.52 + row * .065,.38 + row * .045,.76]} rotation={[.08 * row,side * .34,.07 * side]} castShadow receiveShadow>
        <meshPhysicalMaterial color={index % 2 ? '#4f655c' : '#675d6d'} roughness={.88} metalness={.015} clearcoat={.035} clearcoatRoughness={.88}/>
      </mesh>
    })}
    <mesh position={[0,1.45,-.93]}>
      <circleGeometry args={[1.12,64]}/>
      <meshPhysicalMaterial color="#091317" emissive="#527d88" emissiveIntensity={.25} roughness={.28} metalness={.05} transparent opacity={.54} transmission={.08} depthWrite={false} side={THREE.DoubleSide}/>
    </mesh>
    <pointLight position={[0,1.55,-.74]} color="#9bd8ca" intensity={.92} distance={5.6} decay={2}/>
    <spotLight position={[.25,3.55,1.0]} target-position={[0,1.4,-1]} color="#9fc7d8" intensity={.72} distance={9} angle={.40} penumbra={.92} decay={2}/>
  </group>
}

const stateIntensity: Record<OrbState, number> = {
  dormant:.06,idle:.18,attention:.34,listening:.26,thinking:.30,speaking:.38,guiding:.28,reflecting:.22,calming:.16,privacy:.24,warning:.44,transition:.30,
}

function OrbSurfaceMemory({ state, reducedMotion }: { state: OrbState; reducedMotion: boolean }) {
  const root = useRef<THREE.Group>(null)
  const y = height(ORB.x, ORB.z)
  const lobes = useMemo(() => [heartLobe(17,-1), heartLobe(29,1)], [])
  const plates = useMemo(() => Array.from({ length: 8 }, (_, index) => membrane([
    new THREE.Vector3(-.03 + index * .022,-.66 + index * .075,.42),
    new THREE.Vector3(-.42 - index * .018,-.20 + index * .045,.53 + index * .014),
    new THREE.Vector3(-.46 + index * .032,.30 + index * .035,.45 - index * .014),
    new THREE.Vector3(-.25 + index * .045,.70 - index * .018,.25 - index * .024),
  ], .058 + index * .006, .016, 60 + index)), [])
  const veins = useMemo(() => Array.from({ length: 7 }, (_, index) => {
    const side = index % 2 ? -1 : 1
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(side * .10,-.42,.44),
      new THREE.Vector3(side * (.26 + index * .012),-.10 + index * .045,.55),
      new THREE.Vector3(side * (.36 + index * .015),.25 + index * .035,.48),
      new THREE.Vector3(side * (.24 + index * .02),.58 + index * .025,.30),
    ], false, 'centripetal', .45)
    return new THREE.TubeGeometry(curve,42,.012 + (index % 3) * .002,7,false)
  }), [])
  useEffect(() => () => { lobes.forEach(g=>g.dispose()); plates.forEach(g=>g.dispose()); veins.forEach(g=>g.dispose()) }, [lobes,plates,veins])
  useFrame(({clock}) => {
    if (!root.current || reducedMotion) return
    const t = clock.elapsedTime
    root.current.rotation.y = -.24 + Math.sin(t * .32) * .045
    root.current.rotation.z = .08 + Math.sin(t * .47) * .018
    root.current.position.y = y + 1.12 + Math.sin(t * .72) * .035
  })
  const emission = reducedMotion ? stateIntensity[state] * .82 : stateIntensity[state]
  const warning = state === 'warning', privacy = state === 'privacy'
  const glow = warning ? '#9b4130' : privacy ? '#3d7286' : '#3b7768'
  const skin = warning ? '#c98970' : privacy ? '#8bb7c5' : '#9fb7a7'
  return <group ref={root} position={[ORB.x, y + 1.12, ORB.z]} rotation={[.03,-.24,.08]} scale={1.34} name="home-current-orb-surface-memory" userData={{ artRevision:'v233-asymmetric-living-memory-heart', semantic:'surface-bound-nervature' }}>
    {lobes.map((geometry,index)=><mesh key={`lobe-${index}`} geometry={geometry} position={[index ? .04 : -.04,.12,index ? .015 : -.015]} rotation={[index ? -.04 : .04,index ? -.08 : .08,index ? -.08 : .08]} castShadow receiveShadow>
      <meshPhysicalMaterial color={skin} emissive={glow} emissiveIntensity={emission * .62} roughness={.44} metalness={.03} clearcoat={.24} clearcoatRoughness={.36} transparent opacity={.9}/>
    </mesh>)}
    <mesh position={[0,-.55,.01]} rotation={[0,0,Math.PI/4]} scale={[.52,.82,.42]} castShadow receiveShadow>
      <octahedronGeometry args={[.72,3]}/>
      <meshPhysicalMaterial color={skin} emissive={glow} emissiveIntensity={emission * .55} roughness={.48} clearcoat={.18} clearcoatRoughness={.42}/>
    </mesh>
    {plates.map((geometry,index)=><mesh key={`plate-${index}`} geometry={geometry} position={[index*.012,-.02,.14+index*.006]}>
      <meshPhysicalMaterial side={THREE.DoubleSide} color={index % 2 ? '#bdc8ae' : '#c1a99b'} emissive={glow} emissiveIntensity={emission * (1.0 + index * .04)} roughness={.38} clearcoat={.24} transparent opacity={.48 - index * .025} depthWrite={false}/>
    </mesh>)}
    {veins.map((geometry,index)=><mesh key={`vein-${index}`} geometry={geometry}>
      <meshStandardMaterial color={index % 2 ? '#c4d1bd' : '#aa897c'} emissive={glow} emissiveIntensity={emission * 1.35} roughness={.35} metalness={.08}/>
    </mesh>)}
    <pointLight color={warning ? '#d36e51' : privacy ? '#79bad0' : '#82c8b4'} intensity={.64 + emission * .9} distance={5.4} decay={2}/>
  </group>
}

function CinematicAtmosphere({ reducedMotion }: { reducedMotion: boolean }) {
  const root = useRef<THREE.Points>(null)
  const geometry = useMemo(() => {
    const count = 180
    const positions = new Float32Array(count * 3)
    const colors = new Float32Array(count * 3)
    const warm = new THREE.Color('#d4ad7d'), cool = new THREE.Color('#82bdb2')
    for (let i=0;i<count;i++) {
      const t = i / count
      const angle = i * 2.39996323
      const radius = 2.2 + Math.sqrt(t) * 9.8
      const x = Math.cos(angle) * radius
      const z = 2.8 - t * 21 + Math.sin(i * .73) * .8
      const y = height(x,z) + .55 + (i % 17) * .15
      positions.set([x,y,z],i*3)
      const c = warm.clone().lerp(cool,.35 + .45 * ((i % 9)/8))
      colors.set([c.r,c.g,c.b],i*3)
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position',new THREE.BufferAttribute(positions,3))
    g.setAttribute('color',new THREE.BufferAttribute(colors,3))
    return g
  }, [])
  useEffect(() => () => geometry.dispose(), [geometry])
  useFrame(({clock}) => {
    if (!root.current || reducedMotion) return
    root.current.rotation.y = Math.sin(clock.elapsedTime * .035) * .008
    root.current.position.y = Math.sin(clock.elapsedTime * .16) * .035
  })
  return <points ref={root} geometry={geometry} frustumCulled={false} name="home-current-atmospheric-depth-field" userData={{ artRevision:'v233-bounded-depth-motes', reducedMotion }}>
    <pointsMaterial size={.035} sizeAttenuation transparent opacity={.34} vertexColors depthWrite={false} blending={THREE.AdditiveBlending}/>
  </points>
}

export function HomeCurrentArtRepair({ orbState, reducedMotion }: { orbState: OrbState; reducedMotion: boolean }) {
  return <group name="home-current-authority-art-repair" userData={{ artRevision:'v233-cinematic-geology-lineage-heart-depth-pass' }}>
    <RetireRejectedThresholdShells/>
    <ForegroundGeology/>
    <GeologicalGroundThreshold/>
    <RootedLifeMapThreshold/>
    <OrbSurfaceMemory state={orbState} reducedMotion={reducedMotion}/>
    <CinematicAtmosphere reducedMotion={reducedMotion}/>
  </group>
}
