'use client'

import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { GROUND, LIFE_MAP, ORB, height } from './HomeWorldProductionV223Geometry'

function buildCelestialVolume() {
  const count = 1560, positions = new Float32Array(count * 3), colors = new Float32Array(count * 3)
  const pearl = new THREE.Color('#eefcf6'), jade = new THREE.Color('#7bc7b5'), violet = new THREE.Color('#b7a7d8'), warm = new THREE.Color('#e6ca92')
  for (let index = 0; index < count; index += 1) {
    const t = (index + .5) / count, angle = index * 2.39996323 + Math.sin(index * .17) * .31
    const lane = .48 + .52 * (.5 + .5 * Math.sin(index * 1.91 + .4))
    const radius = (.10 + Math.pow(t, .68) * 3.18) * lane
    const split = Math.sin(t * Math.PI) * (.26 + .44 * t) * Math.sin(index * .113)
    positions.set([
      Math.cos(angle) * radius * (.88 + .24 * Math.sin(index * .31)) + Math.sin(t * 7.1) * .18 + split,
      .08 + t * 5.85 + .18 * Math.sin(index * .43),
      -.72 - t * 3.26 + Math.sin(angle) * radius * .92 + .18 * Math.cos(index * .23),
    ], index * 3)
    const color = pearl.clone().lerp(jade, .10 + .54 * t)
    if (index % 8 === 0) color.lerp(violet, .44)
    if (index % 19 === 0) color.lerp(warm, .36)
    colors.set([color.r, color.g, color.b], index * 3)
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  return geometry
}

function buildConstellationBranches(side: -1 | 1) {
  const points: THREE.Vector3[] = []
  for (let branch = 0; branch < (side < 0 ? 7 : 6); branch += 1) {
    let previous = new THREE.Vector3(side * (.10 + branch * .048), .04 + branch * .012, -.64)
    for (let step = 1; step <= 20; step += 1) {
      const t = step / 20, spread = (.14 + branch * .13) * Math.pow(t, 1.18), drift = Math.sin(step * .57 + branch * .91 + (side < 0 ? .4 : 1.7)) * (.026 + t * .040)
      const current = new THREE.Vector3(side * (.10 + spread) + drift, .05 + t * (3.72 + branch * .14) + Math.sin(t * 5.2 + branch) * .04, -.68 - t * (1.10 + branch * .056) + Math.cos(step * .47 + branch) * .05)
      points.push(previous, current)
      previous = current
    }
  }
  return new THREE.BufferGeometry().setFromPoints(points)
}

function buildAscentRibbon(side: -1 | 1, lane: number) {
  const points = Array.from({ length: 8 }, (_, index) => {
    const t = index / 7
    const bow = Math.sin(t * Math.PI)
    return new THREE.Vector3(
      side * (.10 + t * (1.05 + lane * .34)) + side * bow * (.14 + lane * .05),
      .06 + t * (4.30 + lane * .30),
      -.70 - t * (1.42 + lane * .24) - bow * (.18 + lane * .04),
    )
  })
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points, false, 'centripetal', .42), 56, .018 + lane * .003, 7, false)
}

function buildAscentRoot(side: -1 | 1, lane: number) {
  const points = Array.from({ length: 9 }, (_, index) => {
    const t = index / 8, bow = Math.sin(t * Math.PI)
    return new THREE.Vector3(
      side * (.22 + lane * .12 + t * (.74 + lane * .24)) + side * bow * (.18 + lane * .04),
      -.04 + t * (3.72 + lane * .30) + Math.sin(t * Math.PI * 2 + lane) * .045,
      .28 - t * (1.86 + lane * .22) - bow * (.14 + lane * .05),
    )
  })
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points, false, 'centripetal', .45), 56, .052 - lane * .004, 8, false)
}

function buildGroundRavine() {
  const rows = 52, columns = 16, positions: number[] = [], colors: number[] = [], indices: number[] = []
  const baseY = height(GROUND.x, GROUND.z), deep = new THREE.Color('#111611'), mineral = new THREE.Color('#4c4b3d'), ember = new THREE.Color('#694536')
  for (let row = 0; row <= rows; row += 1) {
    const t = row / rows, z = 1.65 - t * 4.45
    const bend = .10 * Math.sin(t * 5.1) - .05 * Math.sin(t * 11.4)
    const halfWidth = .44 + t * .60 + .08 * Math.sin(t * Math.PI * 3.4)
    for (let column = 0; column <= columns; column += 1) {
      const cross = column / columns * 2 - 1, x = bend + cross * halfWidth
      const worldY = height(GROUND.x + x, GROUND.z + z) - baseY
      const center = 1 - Math.pow(Math.abs(cross), 1.52)
      const descent = (.12 + t * .52) * center
      const rim = Math.pow(Math.abs(cross), 4) * (.08 + .12 * t)
      const irregular = .018 * Math.sin(row * 1.37 + column * 2.11)
      positions.push(x, worldY - descent + rim + irregular, z)
      const color = deep.clone().lerp(mineral, .18 + .46 * Math.abs(cross)).lerp(ember, .05 + .14 * center * t)
      colors.push(color.r, color.g, color.b)
    }
  }
  const stride = columns + 1
  for (let row = 0; row < rows; row += 1) for (let column = 0; column < columns; column += 1) {
    const a = row * stride + column, b = a + 1, c = a + stride, d = c + 1
    indices.push(a, c, b, b, c, d)
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}

function buildGroundFissures() {
  const points: THREE.Vector3[] = []
  for (let trace = 0; trace < 4; trace += 1) {
    let previous: THREE.Vector3 | null = null
    for (let step = 0; step <= 20; step += 1) {
      const t = step / 20, side = trace < 2 ? -1 : 1, lane = trace % 2
      const z = .92 - t * 3.20, center = .08 * Math.sin(t * 6.4 + trace)
      const current = new THREE.Vector3(side * (.09 + lane * .11 + t * (.10 + lane * .05)) + center, -.08 - t * .34 - lane * .025, z)
      if (previous) points.push(previous, current)
      previous = current
    }
  }
  return new THREE.BufferGeometry().setFromPoints(points)
}

function buildValleyShoulder(side: -1 | 1) {
  const rows = 42, columns = 8, positions: number[] = [], colors: number[] = [], indices: number[] = []
  const moss = new THREE.Color('#45574b'), mineral = new THREE.Color('#766f5d'), deep = new THREE.Color('#303b35')
  for (let row = 0; row <= rows; row += 1) {
    const t = row / rows, z = 3.5 - t * 22.5
    for (let column = 0; column <= columns; column += 1) {
      const cross = column / columns, distance = 2.15 + cross * 3.75, x = side * distance
      const ridge = Math.pow(Math.sin(cross * Math.PI), .78) * (.32 + .22 * Math.sin(t * Math.PI * 2.4 + (side < 0 ? .8 : 1.9)))
      const terrace = .07 * Math.sin(t * 21 + cross * 5 + side) + .035 * Math.cos(t * 41 - cross * 7)
      const y = height(x, z) + .045 + Math.max(0, ridge + terrace)
      positions.push(x, y, z)
      const color = moss.clone().lerp(mineral, .20 + cross * .42).lerp(deep, .18 * (1 - cross))
      colors.push(color.r, color.g, color.b)
    }
  }
  const stride = columns + 1
  for (let row = 0; row < rows; row += 1) for (let column = 0; column < columns; column += 1) {
    const a = row * stride + column, b = a + 1, c = a + stride, d = c + 1
    indices.push(a, c, b, b, c, d)
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}

function buildCleftWall(side: -1 | 1) {
  const rows = 30, levels = 6, positions: number[] = [], colors: number[] = [], indices: number[] = []
  const stone = new THREE.Color('#3e4338'), mineral = new THREE.Color('#75634f'), ember = new THREE.Color('#7b4938')
  for (let row = 0; row <= rows; row += 1) {
    const t = row / rows, z = 1.18 - t * 4.05, half = .52 + t * .66
    for (let level = 0; level <= levels; level += 1) {
      const v = level / levels
      const x = side * (half + .04 + v * (.26 + .12 * t)) + Math.sin(row * 1.17 + level * 2.3) * .025
      const y = .09 - v * (.68 + .52 * t) + Math.sin(row * .83 + level) * .025
      positions.push(x, y, z)
      const c = stone.clone().lerp(mineral, .16 + .42 * v).lerp(ember, .08 + .18 * t * (1 - v))
      colors.push(c.r, c.g, c.b)
    }
  }
  const stride = levels + 1
  for (let row = 0; row < rows; row += 1) for (let level = 0; level < levels; level += 1) {
    const a = row * stride + level, b = a + 1, c = a + stride, d = c + 1
    indices.push(a, c, b, b, c, d)
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}

function firstStandardMaterial(mesh: THREE.Mesh) {
  const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
  return materials.find((material): material is THREE.MeshStandardMaterial => material instanceof THREE.MeshStandardMaterial) ?? null
}

function TerrainNaturalismRepair() {
  const { scene } = useThree(), restoreRef = useRef<(() => void) | null>(null)
  useFrame(() => {
    if (restoreRef.current) return
    const terrain = scene.getObjectByName('home-v229-textured-inhabited-valley-and-distant-ridge')
    if (!terrain) return
    const meshes = terrain.children.filter((child): child is THREE.Mesh => child instanceof THREE.Mesh)
    if (meshes.length < 2) return
    const [surface, ridge] = meshes, positions = surface.geometry.getAttribute('position'), surfaceMaterial = firstStandardMaterial(surface), ridgeMaterial = firstStandardMaterial(ridge)
    if (!(positions instanceof THREE.BufferAttribute) || !surfaceMaterial || !ridgeMaterial) return
    const originalPositions = Float32Array.from(positions.array as ArrayLike<number>), surfaceColor = surfaceMaterial.color.clone(), ridgeColor = ridgeMaterial.color.clone(), surfaceNormal = surfaceMaterial.normalScale.clone(), ridgeNormal = ridgeMaterial.normalScale.clone(), surfaceRoughness = surfaceMaterial.roughness, ridgeRoughness = ridgeMaterial.roughness, surfaceEnv = surfaceMaterial.envMapIntensity, ridgeEnv = ridgeMaterial.envMapIntensity, marker = terrain.userData.uraiTerrainNaturalism
    for (let index = 0; index < positions.count; index += 1) {
      const x = positions.getX(index), z = positions.getZ(index), pathX = .30 * Math.sin((z + 2.4) * .22) + .09 * Math.sin((z - 1) * .63), lane = Math.abs(x - pathX), shoulder = THREE.MathUtils.smoothstep(lane, .90, 4.8)
      const broad = .046 * Math.sin(x * .61 + z * .27) + .032 * Math.cos(x * .43 - z * .52), mineral = .022 * Math.sin(x * 1.37 + z * .83) + .014 * Math.cos(x * 2.08 - z * 1.19), wear = Math.exp(-lane * lane / 1.7) * (-.024 + .010 * Math.sin(z * 1.22))
      positions.setY(index, height(x, z) + .034 + shoulder * (broad + mineral) + wear)
    }
    positions.needsUpdate = true
    surface.geometry.computeVertexNormals(); surface.geometry.computeBoundingBox(); surface.geometry.computeBoundingSphere()
    surfaceMaterial.color.set('#887f69'); surfaceMaterial.normalScale.set(.50, .50); surfaceMaterial.roughness = .92; surfaceMaterial.envMapIntensity = .46; surfaceMaterial.needsUpdate = true
    ridgeMaterial.color.set('#526258'); ridgeMaterial.normalScale.set(.46, .46); ridgeMaterial.roughness = .95; ridgeMaterial.envMapIntensity = .38; ridgeMaterial.needsUpdate = true
    terrain.userData.uraiTerrainNaturalism = 'aaa-v281-weathered-mineral-ground-readable-microrelief'
    restoreRef.current = () => {
      (positions.array as Float32Array).set(originalPositions); positions.needsUpdate = true; surface.geometry.computeVertexNormals()
      surfaceMaterial.color.copy(surfaceColor); surfaceMaterial.normalScale.copy(surfaceNormal); surfaceMaterial.roughness = surfaceRoughness; surfaceMaterial.envMapIntensity = surfaceEnv
      ridgeMaterial.color.copy(ridgeColor); ridgeMaterial.normalScale.copy(ridgeNormal); ridgeMaterial.roughness = ridgeRoughness; ridgeMaterial.envMapIntensity = ridgeEnv
      if (marker === undefined) delete terrain.userData.uraiTerrainNaturalism; else terrain.userData.uraiTerrainNaturalism = marker
    }
  })
  useEffect(() => () => { restoreRef.current?.(); restoreRef.current = null }, [])
  return null
}

function ForegroundVegetationCleanup() {
  const { scene } = useThree(), hidden = useRef(new Set<THREE.Object3D>()), world = useMemo(() => new THREE.Vector3(), [])
  useFrame(() => scene.traverse((object) => {
    if (!/^home-scanned-fern-\d+$/.test(object.name) || hidden.current.has(object) || !object.visible) return
    object.getWorldPosition(world)
    const groundDistance = Math.hypot(world.x - GROUND.x, world.z - GROUND.z)
    const lifeMapDistance = Math.hypot(world.x - LIFE_MAP.x, world.z - LIFE_MAP.z)
    const blocksDestination = groundDistance < 4.15 || lifeMapDistance < 4.15
    const crowdsForeground = world.z > -11.6
    if (!blocksDestination && !crowdsForeground) return
    object.visible = false
    hidden.current.add(object)
  }))
  useEffect(() => () => { hidden.current.forEach((object) => { object.visible = true }); hidden.current.clear() }, [])
  return null
}

function pointField(count: number, seed: number, span: number, vertical: number) {
  const positions = new Float32Array(count * 3), colors = new Float32Array(count * 3), cool = new THREE.Color('#96cabb'), warm = new THREE.Color('#d4b88a')
  for (let i = 0; i < count; i += 1) {
    const a = i * 2.39996323 + seed, t = (i + .5) / count, r = .12 + Math.sqrt(t) * span
    positions.set([Math.cos(a) * r, (Math.sin(i * 1.37 + seed) * .5 + .5) * vertical, Math.sin(a) * r * .55], i * 3)
    const c = cool.clone().lerp(warm, (i % 7) / 9); colors.set([c.r,c.g,c.b],i*3)
  }
  const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3)); geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3)); return geometry
}

function VisualMemoryFields() {
  const orb = useMemo(() => pointField(190, .4, .62, 1.45), []), ground = useMemo(() => pointField(70, 1.7, .58, .26), [])
  useEffect(() => () => { orb.dispose(); ground.dispose() }, [ground, orb])
  const orbY = height(ORB.x, ORB.z), groundY = height(GROUND.x, GROUND.z)
  return <group name="home-aaa-v281-non-interactive-memory-fields" userData={{ visualOnly: true, interactionOwner: false }} raycast={() => null}>
    <points geometry={orb} position={[ORB.x, orbY + .20, ORB.z + .12]} raycast={() => null}><pointsMaterial vertexColors size={.024} transparent opacity={.62} depthWrite={false} blending={THREE.AdditiveBlending}/></points>
    <points geometry={ground} position={[GROUND.x, groundY - .04, GROUND.z - .12]} raycast={() => null}><pointsMaterial vertexColors size={.016} transparent opacity={.42} depthWrite={false} blending={THREE.AdditiveBlending}/></points>
    <pointLight position={[ORB.x, orbY + 1.0, ORB.z + .35]} color="#a6d4c3" intensity={.24} distance={2.4} decay={2}/>
    <pointLight position={[GROUND.x, groundY + .10, GROUND.z - .55]} color="#b96d51" intensity={.52} distance={3.5} decay={2}/>
  </group>
}

function ValleyMicroDetail() {
  const stones = useMemo(() => Array.from({ length: 24 }, (_, i) => ({ x: (i % 2 ? -1 : 1) * (2.45 + (i % 6) * .62 + Math.sin(i * .87) * .20), z: 3 - i / 23 * 18.8 + Math.sin(i * 1.73) * .34, s: .08 + (i % 5) * .035 })), [])
  return <group name="home-aaa-v281-weathered-micro-detail" userData={{ visualOnly: true, interactionOwner: false }} raycast={() => null}>{stones.map((stone, i) => <mesh key={i} position={[stone.x,height(stone.x,stone.z)+.025,stone.z]} rotation={[.11*Math.sin(i),i*.83,.08*Math.cos(i*.7)]} scale={[stone.s*1.55,stone.s*.68,stone.s]} raycast={() => null} receiveShadow><icosahedronGeometry args={[1,2]}/><meshStandardMaterial color={i%4===0?'#706450':i%3===0?'#4e5d52':'#5e6054'} roughness={.99}/></mesh>)}</group>
}

function SanctuaryLandformDetail() {
  const left = useMemo(() => buildValleyShoulder(-1), []), right = useMemo(() => buildValleyShoulder(1), [])
  useEffect(() => () => { left.dispose(); right.dispose() }, [left, right])
  return <group name="home-aaa-v281-authored-valley-shoulders" userData={{ visualOnly: true, interactionOwner: false, visualIntent: 'weathered-side-banks-frame-path-without-blocking-navigation' }} raycast={() => null}>
    <mesh geometry={left} receiveShadow raycast={() => null}><meshStandardMaterial vertexColors roughness={.98} metalness={0}/></mesh>
    <mesh geometry={right} receiveShadow raycast={() => null}><meshStandardMaterial vertexColors roughness={.98} metalness={0}/></mesh>
  </group>
}

function GroundDescentEnhancement() {
  const ravine = useMemo(buildGroundRavine, []), fissures = useMemo(buildGroundFissures, []), leftWall = useMemo(() => buildCleftWall(-1), []), rightWall = useMemo(() => buildCleftWall(1), [])
  useEffect(() => () => { ravine.dispose(); fissures.dispose(); leftWall.dispose(); rightWall.dispose() }, [fissures, leftWall, ravine, rightWall])
  const baseY = height(GROUND.x, GROUND.z)
  return <group position={[GROUND.x, baseY + .055, GROUND.z]} rotation={[0,-.10,0]} name="home-aaa-v281-ground-recessed-geological-descent" userData={{ visualOnly: true, interactionOwner: false, morphology: 'low-recessed-eroded-descent-cleft' }} raycast={() => null}>
    <mesh geometry={ravine} receiveShadow raycast={() => null}><meshStandardMaterial vertexColors roughness={1} metalness={0}/></mesh>
    <mesh geometry={leftWall} receiveShadow raycast={() => null}><meshStandardMaterial vertexColors roughness={.98} metalness={0}/></mesh>
    <mesh geometry={rightWall} receiveShadow raycast={() => null}><meshStandardMaterial vertexColors roughness={.98} metalness={0}/></mesh>
    <lineSegments geometry={fissures} position={[0,.015,0]} raycast={() => null}><lineBasicMaterial color="#b76f4e" transparent opacity={.56}/></lineSegments>
    <mesh position={[0,-.38,-2.25]} scale={[.96,.56,1.18]} raycast={() => null}><sphereGeometry args={[1,32,18]}/><meshBasicMaterial color="#070b09" transparent opacity={.82} depthWrite={false}/></mesh>
    <mesh position={[-.32,-.20,-1.55]} rotation={[.04,.3,-.2]} scale={[.10,.48,.08]} raycast={() => null}><icosahedronGeometry args={[1,1]}/><meshStandardMaterial color="#8a553d" emissive="#6b3022" emissiveIntensity={.68} roughness={.82}/></mesh>
    <mesh position={[.27,-.27,-1.92]} rotation={[-.2,.1,.22]} scale={[.08,.38,.07]} raycast={() => null}><icosahedronGeometry args={[1,1]}/><meshStandardMaterial color="#6f4c39" emissive="#53281d" emissiveIntensity={.56} roughness={.84}/></mesh>
    <pointLight position={[0,-.02,-1.28]} color="#b86b4d" intensity={.88} distance={4.6} decay={2}/>
  </group>
}

const ASCENT_VERTEX = `varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`
const ASCENT_FRAGMENT = `uniform vec3 colorA;uniform vec3 colorB;uniform float seed;uniform float opacity;varying vec2 vUv;float h(vec2 p){p=fract(p*vec2(123.34,345.45));p+=dot(p,p+34.345);return fract(p.x*p.y);}float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1)),f.x),f.y);}float f(vec2 p){float v=0.,a=.5;for(int i=0;i<5;i++){v+=n(p)*a;p=p*2.03+vec2(6.7,4.1);a*=.5;}return v;}void main(){vec2 p=(vUv-.5)*2.;float radial=smoothstep(1.18,.05,length(p*vec2(.74,1.04)));float cloud=f(p*1.35+seed)+.62*f(p*3.1-seed)+.20*f(p*7.0+seed);float a=radial*smoothstep(.30,1.03,cloud)*opacity;vec3 c=mix(colorA,colorB,smoothstep(.22,.98,cloud));gl_FragColor=vec4(c,a);}`

function AscentVeil({ position, scale, rotation, colors, opacity, seed }: { position: [number,number,number]; scale: [number,number]; rotation: number; colors: [string,string]; opacity: number; seed: number }) {
  const uniforms = useMemo(() => ({ colorA:{value:new THREE.Color(colors[0])}, colorB:{value:new THREE.Color(colors[1])}, seed:{value:seed}, opacity:{value:opacity} }), [colors, opacity, seed])
  return <mesh position={position} rotation={[0,0,rotation]} scale={[scale[0],scale[1],1]} renderOrder={-1} raycast={() => null}><planeGeometry args={[1,1]}/><shaderMaterial vertexShader={ASCENT_VERTEX} fragmentShader={ASCENT_FRAGMENT} uniforms={uniforms} transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false}/></mesh>
}

function CelestialAscent() {
  const stars = useMemo(buildCelestialVolume, []), left = useMemo(() => buildConstellationBranches(-1), []), right = useMemo(() => buildConstellationBranches(1), [])
  const ribbons = useMemo(() => [-1,1].flatMap((side) => Array.from({length:4},(_,lane)=>buildAscentRibbon(side as -1|1,lane))), [])
  const roots = useMemo(() => [-1,1].flatMap((side) => Array.from({length:3},(_,lane)=>buildAscentRoot(side as -1|1,lane))), [])
  useEffect(() => () => { stars.dispose(); left.dispose(); right.dispose(); ribbons.forEach((geometry)=>geometry.dispose()); roots.forEach((geometry)=>geometry.dispose()) }, [left, right, ribbons, roots, stars])
  const baseY = height(LIFE_MAP.x, LIFE_MAP.z)
  return <group position={[LIFE_MAP.x, baseY + .08, LIFE_MAP.z]} rotation={[0,.08,0]} name="home-aaa-life-map-celestial-ascent" userData={{ artRevision: 'aaa-celestial-ascent-v281-open-volumetric-crown', predecessorInvariant: 'aaa-celestial-ascent-v3-gold-master-depth', visualIntent: 'rooted-threshold-expanding-upward-into-open-deep-personal-constellation-space', semanticOwner: 'home-current-life-map-rooted-ascent', constructionPlane: 'none', visualOnly: true, interactionOwner: false }} raycast={() => null}>
    <group name="home-aaa-v281-rooted-ascent-structure" userData={{ visualRole: 'asymmetric-living-lineage-roots', interactionOwner: false }} raycast={() => null}>
      {roots.map((geometry,index)=><mesh key={index} geometry={geometry} raycast={() => null}><meshStandardMaterial color={index%3===0?'#6f877a':index%2?'#66778b':'#776b83'} emissive={index%3===0?'#315f54':index%2?'#30485c':'#493d58'} emissiveIntensity={.46} roughness={.74} metalness={0} transparent opacity={.84}/></mesh>)}
      <mesh position={[-.28,.04,.26]} rotation={[.18,.2,.38]} scale={[.42,.18,.72]} raycast={() => null}><dodecahedronGeometry args={[1,1]}/><meshStandardMaterial color="#53665b" emissive="#27453d" emissiveIntensity={.32} roughness={.9}/></mesh>
      <mesh position={[.36,.08,.10]} rotation={[-.1,-.4,-.32]} scale={[.34,.16,.58]} raycast={() => null}><dodecahedronGeometry args={[1,1]}/><meshStandardMaterial color="#5b5d66" emissive="#303746" emissiveIntensity={.28} roughness={.9}/></mesh>
    </group>
    <group name="home-aaa-v281-celestial-weather-depth" raycast={() => null}>
      <AscentVeil position={[-.45,1.45,-1.35]} scale={[3.7,3.3]} rotation={-.24} colors={['#245e62','#67576f']} opacity={.30} seed={1.2}/>
      <AscentVeil position={[.72,2.55,-2.08]} scale={[4.7,3.8]} rotation={.22} colors={['#1d6664','#81624f']} opacity={.28} seed={2.1}/>
      <AscentVeil position={[-1.02,3.55,-2.86]} scale={[5.4,4.2]} rotation={-.14} colors={['#284f67','#66567d']} opacity={.25} seed={3.4}/>
      <AscentVeil position={[.62,4.55,-3.72]} scale={[6.6,4.8]} rotation={.10} colors={['#174c62','#6a5c68']} opacity={.22} seed={4.7}/>
    </group>
    <points geometry={stars} frustumCulled={false} raycast={() => null}><pointsMaterial vertexColors size={.030} sizeAttenuation transparent opacity={.78} depthWrite={false} blending={THREE.AdditiveBlending}/></points>
    <lineSegments geometry={left} frustumCulled={false} raycast={() => null}><lineBasicMaterial color="#8ac4b4" transparent opacity={.17} blending={THREE.AdditiveBlending}/></lineSegments>
    <lineSegments geometry={right} frustumCulled={false} raycast={() => null}><lineBasicMaterial color="#b3a2d0" transparent opacity={.15} blending={THREE.AdditiveBlending}/></lineSegments>
    <group name="home-aaa-v281-rooted-ascent-ribbons" raycast={() => null}>{ribbons.map((geometry,index)=><mesh key={index} geometry={geometry} raycast={() => null}><meshBasicMaterial color={index%3===0?'#c4d6bd':index%2?'#9eb9c7':'#a997bc'} transparent opacity={.17-index%4*.014} depthWrite={false} blending={THREE.AdditiveBlending}/></mesh>)}</group>
    <pointLight position={[-.18,1.18,-1.06]} color="#91cabb" intensity={1.08} distance={6.8} decay={2}/><pointLight position={[.52,3.18,-2.10]} color="#b0a8d3" intensity={.72} distance={6.2} decay={2}/><pointLight position={[-.72,2.48,-2.48]} color="#d4c79d" intensity={.38} distance={5.2} decay={2}/>
  </group>
}

export function HomeAAAVisualRepair() {
  return <group name="home-aaa-visual-repair-v281-authored-threshold-convergence" userData={{ goldMasterRevision: 'v281-literal-pixel-convergence' }}>
    <hemisphereLight color="#aec9be" groundColor="#18231d" intensity={.23}/><directionalLight position={[-5.5,7.2,3.6]} color="#d0d8ca" intensity={.38}/><directionalLight position={[5.2,3.8,-8]} color="#7e9d91" intensity={.14}/>
    <TerrainNaturalismRepair/><ForegroundVegetationCleanup/><ValleyMicroDetail/><SanctuaryLandformDetail/><VisualMemoryFields/><GroundDescentEnhancement/><CelestialAscent/>
  </group>
}
