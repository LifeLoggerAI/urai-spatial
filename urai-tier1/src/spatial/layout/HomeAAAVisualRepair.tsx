'use client'

import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { GROUND, LIFE_MAP, ORB, height } from './HomeWorldProductionV223Geometry'

function buildCelestialVolume() {
  const count = 1680, positions = new Float32Array(count * 3), colors = new Float32Array(count * 3)
  const pearl = new THREE.Color('#e9fbf3'), jade = new THREE.Color('#7fc5b5'), violet = new THREE.Color('#b8a8d8'), warm = new THREE.Color('#e2c998')
  for (let index = 0; index < count; index += 1) {
    const t = (index + .5) / count, angle = index * 2.39996323 + Math.sin(index * .17) * .31
    const radius = (.08 + Math.pow(t, .72) * 2.18) * (.56 + .44 * (.5 + .5 * Math.sin(index * 1.91 + .4)))
    positions.set([Math.cos(angle) * radius * (.82 + .22 * Math.sin(index * .31)) + Math.sin(t * 7.1) * .14 + (t - .5) * .12, .08 + t * 5.15 + .14 * Math.sin(index * .43), -.62 - t * 2.68 + Math.sin(angle) * radius * .88 + .14 * Math.cos(index * .23)], index * 3)
    const color = pearl.clone().lerp(jade, .12 + .55 * t); if (index % 8 === 0) color.lerp(violet, .42); if (index % 19 === 0) color.lerp(warm, .34)
    colors.set([color.r, color.g, color.b], index * 3)
  }
  const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3)); geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3)); return geometry
}

function buildConstellationBranches(side: -1 | 1) {
  const points: THREE.Vector3[] = []
  for (let branch = 0; branch < (side < 0 ? 7 : 6); branch += 1) {
    let previous = new THREE.Vector3(side * (.10 + branch * .048), .04 + branch * .012, -.64)
    for (let step = 1; step <= 20; step += 1) {
      const t = step / 20, spread = (.14 + branch * .13) * Math.pow(t, 1.18), drift = Math.sin(step * .57 + branch * .91 + (side < 0 ? .4 : 1.7)) * (.026 + t * .040)
      const current = new THREE.Vector3(side * (.10 + spread) + drift, .05 + t * (3.72 + branch * .14) + Math.sin(t * 5.2 + branch) * .04, -.68 - t * (1.10 + branch * .056) + Math.cos(step * .47 + branch) * .05)
      points.push(previous, current); previous = current
    }
  }
  return new THREE.BufferGeometry().setFromPoints(points)
}

function firstStandardMaterial(mesh: THREE.Mesh) {
  const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
  return materials.find((material): material is THREE.MeshStandardMaterial => material instanceof THREE.MeshStandardMaterial) ?? null
}

function TerrainNaturalismRepair() {
  const { scene } = useThree(), restoreRef = useRef<(() => void) | null>(null)
  useFrame(() => {
    if (restoreRef.current) return
    const terrain = scene.getObjectByName('home-v229-textured-inhabited-valley-and-distant-ridge'); if (!terrain) return
    const meshes = terrain.children.filter((child): child is THREE.Mesh => child instanceof THREE.Mesh); if (meshes.length < 2) return
    const [surface, ridge] = meshes, positions = surface.geometry.getAttribute('position'), surfaceMaterial = firstStandardMaterial(surface), ridgeMaterial = firstStandardMaterial(ridge)
    if (!(positions instanceof THREE.BufferAttribute) || !surfaceMaterial || !ridgeMaterial) return
    const originalPositions = Float32Array.from(positions.array as ArrayLike<number>), surfaceColor = surfaceMaterial.color.clone(), ridgeColor = ridgeMaterial.color.clone(), surfaceNormal = surfaceMaterial.normalScale.clone(), ridgeNormal = ridgeMaterial.normalScale.clone(), surfaceRoughness = surfaceMaterial.roughness, ridgeRoughness = ridgeMaterial.roughness, surfaceEnv = surfaceMaterial.envMapIntensity, ridgeEnv = ridgeMaterial.envMapIntensity, marker = terrain.userData.uraiTerrainNaturalism
    for (let index = 0; index < positions.count; index += 1) {
      const x = positions.getX(index), z = positions.getZ(index), pathX = .30 * Math.sin((z + 2.4) * .22) + .09 * Math.sin((z - 1) * .63), lane = Math.abs(x - pathX), shoulder = THREE.MathUtils.smoothstep(lane, .90, 4.8)
      const broad = .026 * Math.sin(x * .61 + z * .27) + .017 * Math.cos(x * .43 - z * .52), mineral = .010 * Math.sin(x * 1.37 + z * .83) + .007 * Math.cos(x * 2.08 - z * 1.19), wear = Math.exp(-lane * lane / 1.7) * (-.014 + .006 * Math.sin(z * 1.22))
      positions.setY(index, height(x, z) + .030 + shoulder * (broad + mineral) + wear)
    }
    positions.needsUpdate = true; surface.geometry.computeVertexNormals(); surface.geometry.computeBoundingBox(); surface.geometry.computeBoundingSphere()
    surfaceMaterial.color.set('#918a77'); surfaceMaterial.normalScale.set(.34, .34); surfaceMaterial.roughness = .92; surfaceMaterial.envMapIntensity = .48; surfaceMaterial.needsUpdate = true
    ridgeMaterial.color.set('#5d6a62'); ridgeMaterial.normalScale.set(.30, .30); ridgeMaterial.roughness = .95; ridgeMaterial.envMapIntensity = .42; ridgeMaterial.needsUpdate = true
    terrain.userData.uraiTerrainNaturalism = 'aaa-v280-weathered-mineral-ground-readable-microrelief'
    restoreRef.current = () => { (positions.array as Float32Array).set(originalPositions); positions.needsUpdate = true; surface.geometry.computeVertexNormals(); surfaceMaterial.color.copy(surfaceColor); surfaceMaterial.normalScale.copy(surfaceNormal); surfaceMaterial.roughness = surfaceRoughness; surfaceMaterial.envMapIntensity = surfaceEnv; ridgeMaterial.color.copy(ridgeColor); ridgeMaterial.normalScale.copy(ridgeNormal); ridgeMaterial.roughness = ridgeRoughness; ridgeMaterial.envMapIntensity = ridgeEnv; if (marker === undefined) delete terrain.userData.uraiTerrainNaturalism; else terrain.userData.uraiTerrainNaturalism = marker }
  })
  useEffect(() => () => { restoreRef.current?.(); restoreRef.current = null }, []); return null
}

function ForegroundVegetationCleanup() {
  const { scene } = useThree(), hidden = useRef(new Set<THREE.Object3D>())
  useFrame(() => scene.traverse((object) => { if (!/^home-scanned-fern-\d+$/.test(object.name) || hidden.current.has(object) || !object.visible || object.position.z <= -10.6) return; object.visible = false; hidden.current.add(object) }))
  useEffect(() => () => { hidden.current.forEach((object) => { object.visible = true }); hidden.current.clear() }, []); return null
}

function pointField(count: number, seed: number, span: number, vertical: number) {
  const positions = new Float32Array(count * 3), colors = new Float32Array(count * 3), cool = new THREE.Color('#96cabb'), warm = new THREE.Color('#d4b88a')
  for (let i = 0; i < count; i += 1) { const a = i * 2.39996323 + seed, t = (i + .5) / count, r = .12 + Math.sqrt(t) * span; positions.set([Math.cos(a) * r, (Math.sin(i * 1.37 + seed) * .5 + .5) * vertical, Math.sin(a) * r * .55], i * 3); const c = cool.clone().lerp(warm, (i % 7) / 9); colors.set([c.r,c.g,c.b],i*3) }
  const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3)); geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3)); return geometry
}

function VisualMemoryFields() {
  const orb = useMemo(() => pointField(190, .4, .62, 1.45), []), ground = useMemo(() => pointField(96, 1.7, .72, .34), [])
  useEffect(() => () => { orb.dispose(); ground.dispose() }, [ground, orb])
  const orbY = height(ORB.x, ORB.z), groundY = height(GROUND.x, GROUND.z)
  return <group name="home-aaa-v280-non-interactive-memory-fields" userData={{ visualOnly: true, interactionOwner: false }} raycast={() => null}>
    <points geometry={orb} position={[ORB.x, orbY + .20, ORB.z + .12]} raycast={() => null}><pointsMaterial vertexColors size={.024} transparent opacity={.72} depthWrite={false} blending={THREE.AdditiveBlending}/></points>
    <points geometry={ground} position={[GROUND.x, groundY - .04, GROUND.z - .12]} raycast={() => null}><pointsMaterial vertexColors size={.018} transparent opacity={.64} depthWrite={false} blending={THREE.AdditiveBlending}/></points>
    <pointLight position={[ORB.x, orbY + 1.0, ORB.z + .35]} color="#a6d4c3" intensity={.28} distance={2.4} decay={2}/>
    <pointLight position={[GROUND.x, groundY + .14, GROUND.z - .45]} color="#bd7655" intensity={.40} distance={3.2} decay={2}/>
  </group>
}

function ValleyMicroDetail() {
  const stones = useMemo(() => Array.from({ length: 34 }, (_, i) => ({ x: (i % 2 ? -1 : 1) * (2.25 + (i % 7) * .55 + Math.sin(i * .87) * .18), z: 3 - i / 33 * 18.8 + Math.sin(i * 1.73) * .28, s: .075 + (i % 6) * .027 })), [])
  return <group name="home-aaa-v280-weathered-micro-detail" userData={{ visualOnly: true, interactionOwner: false }} raycast={() => null}>{stones.map((stone, i) => <mesh key={i} position={[stone.x,height(stone.x,stone.z)+.025,stone.z]} rotation={[.08*Math.sin(i),i*.83,.05*Math.cos(i*.7)]} scale={[stone.s*1.35,stone.s*.72,stone.s]} raycast={() => null} receiveShadow><icosahedronGeometry args={[1,1]}/><meshStandardMaterial color={i%4===0?'#756b59':i%3===0?'#55655a':'#67685b'} roughness={.98}/></mesh>)}</group>
}

function CelestialAscent() {
  const stars = useMemo(buildCelestialVolume, []), left = useMemo(() => buildConstellationBranches(-1), []), right = useMemo(() => buildConstellationBranches(1), [])
  useEffect(() => () => { stars.dispose(); left.dispose(); right.dispose() }, [left, right, stars]); const baseY = height(LIFE_MAP.x, LIFE_MAP.z)
  return <group position={[LIFE_MAP.x, baseY + .08, LIFE_MAP.z]} rotation={[0,.08,0]} name="home-aaa-life-map-celestial-ascent" userData={{ artRevision: 'aaa-celestial-ascent-v3-gold-master-depth', predecessorInvariant: 'aaa-celestial-ascent-v2-open-volume', visualIntent: 'rooted-threshold-expanding-upward-into-open-deep-personal-constellation-space', semanticOwner: 'home-current-life-map-rooted-ascent', constructionPlane: 'none', visualOnly: true, interactionOwner: false }} raycast={() => null}>
    <points geometry={stars} frustumCulled={false} raycast={() => null}><pointsMaterial vertexColors size={.034} sizeAttenuation transparent opacity={.90} depthWrite={false} blending={THREE.AdditiveBlending}/></points>
    <lineSegments geometry={left} frustumCulled={false} raycast={() => null}><lineBasicMaterial color="#8ac4b4" transparent opacity={.24} blending={THREE.AdditiveBlending}/></lineSegments>
    <lineSegments geometry={right} frustumCulled={false} raycast={() => null}><lineBasicMaterial color="#b3a2d0" transparent opacity={.20} blending={THREE.AdditiveBlending}/></lineSegments>
    <pointLight position={[-.18,1.18,-1.06]} color="#91cabb" intensity={.86} distance={5.8} decay={2}/><pointLight position={[.52,3.18,-2.10]} color="#b0a8d3" intensity={.60} distance={5.4} decay={2}/><pointLight position={[-.72,2.48,-2.48]} color="#d4c79d" intensity={.28} distance={4.2} decay={2}/>
  </group>
}

export function HomeAAAVisualRepair() {
  return <group name="home-aaa-visual-repair-v2-open-celestial-volume" userData={{ goldMasterRevision: 'v280-literal-pixel-convergence' }}>
    <hemisphereLight color="#a7c2b8" groundColor="#18201c" intensity={.20}/><directionalLight position={[-5.5,7.2,3.6]} color="#c7d2c3" intensity={.30}/>
    <TerrainNaturalismRepair/><ForegroundVegetationCleanup/><ValleyMicroDetail/><VisualMemoryFields/><CelestialAscent/>
  </group>
}
