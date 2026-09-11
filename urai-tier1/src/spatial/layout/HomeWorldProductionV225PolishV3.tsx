'use client'

import { Suspense, useEffect, useMemo, useRef } from 'react'
import { useGLTF } from '@react-three/drei'
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'
import { createMineralMaps } from '@/spatial/assets/naturalSurfaceMaps'
import type { OrbState } from '@/app/home/orbStateController'
import { GROUND, LIFE_MAP, ORB, height } from './HomeWorldProductionV223Geometry'

type WalkHandler = (event: ThreeEvent<MouseEvent>) => void
type V3 = [number, number, number]

const FERN_MODEL = '/assets/urai/home-production/cc0/polyhaven-fern-02-geometry-v1.glb'

const retiredExact = new Set([
  'home-v225-sculpted-sanctuary-floor',
  'home-v225-grown-winding-memory-path',
  'home-v225-v2-authored-valley-floor',
  'home-v225-v2-grown-memory-walk',
  'home-v225-v2-cathedral-memory-ribs',
  'home-v225-v2-weathered-memory-walls',
  'home-v225-v2-ground-memory-hearth',
  'home-v225-v2-life-map-lineage-observatory',
  'home-v225-v2-intimate-veined-living-memory-orb',
  'home-v225-ground-sheltered-memory-basin',
  'home-v225-life-map-rooted-memory-observatory',
  'home-v225-single-asymmetric-living-memory-presence',
  'home-v225-living-memory-grove',
])

function RetireRejectedLayers() {
  const { scene } = useThree()
  useEffect(() => {
    const changed: THREE.Object3D[] = []
    scene.traverse((object) => {
      const retired = retiredExact.has(object.name)
        || /^home-v225-rooted-memory-rib-/.test(object.name)
        || /^home-v225-(?:port|starboard)-overhanging-strata-/.test(object.name)
      if (retired && object.visible) {
        object.visible = false
        changed.push(object)
      }
    })
    return () => changed.forEach((object) => { object.visible = true })
  }, [scene])
  return null
}

function PortraitFraming() {
  const { camera, size } = useThree()
  useEffect(() => {
    if (!(camera instanceof THREE.PerspectiveCamera)) return
    const previous = camera.zoom
    camera.zoom = size.height > size.width ? .94 : 1
    camera.updateProjectionMatrix()
    return () => {
      camera.zoom = previous
      camera.updateProjectionMatrix()
    }
  }, [camera, size.height, size.width])
  return null
}

function tube(points: THREE.Vector3[], radius: number, radial = 9) {
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points, false, 'centripetal', .42), Math.max(56, points.length * 5), radius, radial, false)
}

function memoryLoop(radius: number, depth: number, phase: number, thickness: number) {
  const points = Array.from({ length: 72 }, (_, index) => {
    const angle = index / 72 * Math.PI * 2
    const contour = radius * (1 + .055 * Math.sin(angle * 3 + phase) + .025 * Math.sin(angle * 7 - phase))
    return new THREE.Vector3(
      Math.cos(angle) * contour,
      Math.sin(angle) * contour * (1 + .04 * Math.cos(angle * 2 - phase)),
      depth * Math.sin(angle * 2 + phase),
    )
  })
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points, true, 'centripetal', .42), 144, thickness, 10, true)
}

function RootedCanopy() {
  const fern = useGLTF(FERN_MODEL)
  const materials = useMemo(() => [
    new THREE.MeshStandardMaterial({ color:'#60745b', roughness:.96, side:THREE.DoubleSide }),
    new THREE.MeshStandardMaterial({ color:'#405a45', roughness:.98, side:THREE.DoubleSide }),
    new THREE.MeshStandardMaterial({ color:'#748369', roughness:.94, side:THREE.DoubleSide }),
  ], [])
  useEffect(() => () => materials.forEach((material) => material.dispose()), [materials])
  const plants = useMemo(() => Array.from({ length: 64 }, (_, index) => {
    const side = index % 2 ? -1 : 1
    const row = Math.floor(index / 2)
    const z = 3.4 - row * .64 + Math.sin(index * 1.73) * .38
    const edge = 3.55 + (index % 6) * .61 + .28 * Math.sin(index * .91)
    const x = side * edge
    const object = fern.scene.clone(true)
    object.name = `home-scanned-fern-${index + 1}`
    object.position.set(x, height(x,z) + .025, z)
    object.rotation.y = index * 1.41
    const scale = .30 + (index % 7) * .038
    object.scale.set(scale * (.88 + (index % 3) * .09), scale * (1.04 + (index % 4) * .08), scale)
    object.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.material = materials[index % materials.length]
        child.castShadow = index < 28
        child.receiveShadow = true
      }
    })
    return object
  }), [fern.scene, materials])
  return <group name="home-v226-rooted-inhabited-canopy" userData={{ artRevision:'home-v230-scanned-grounded-fern-grove', source:'Poly Haven fern_02 CC0', composition:'grounded-no-pole-canopy' }}>
    {plants.map((plant) => <primitive key={plant.name} object={plant}/>)}
  </group>
}

function useMemoryStoneMaps() {
  return useMemo(createMineralMaps, [])
}

function inhabitedSurfaceGeometry() {
  const nx=156,nz=210,positions:number[]=[],uvs:number[]=[],colors:number[]=[],indices:number[]=[]
  const moss=new THREE.Color('#52614d'),loam=new THREE.Color('#75614b'),lichen=new THREE.Color('#7c866c')
  for(let iz=0;iz<=nz;iz++){
    const vz=iz/nz,z=6.4-vz*26.2
    for(let ix=0;ix<=nx;ix++){
      const vx=ix/nx,x=-9.4+vx*18.8
      const relief=.052*Math.sin(x*1.72+z*.91)+.034*Math.cos(x*3.86-z*1.54)+.017*Math.sin(x*7.1+z*4.3)
      const y=height(x,z)+relief*(.32+.68*Math.min(1,Math.abs(x)/7.5))+.032
      positions.push(x,y,z);uvs.push(vx*1.25,vz*1.85)
      const grain=.5+.5*Math.sin(x*.82-z*.57)*Math.cos(x*1.31+z*.94)
      const center=.30*Math.sin((z+2.4)*.22)+.09*Math.sin((z-1)*.63)
      const trail=1-THREE.MathUtils.smoothstep(Math.abs(x-center),.34,.78)
      const c=moss.clone().lerp(loam,.18+.12*grain+.50*trail).lerp(lichen,.08*Math.max(0,-z/20))
      colors.push(c.r,c.g,c.b)
    }
  }
  const row=nx+1
  for(let iz=0;iz<nz;iz++)for(let ix=0;ix<nx;ix++){const a=iz*row+ix,b=a+1,c=a+row,d=c+1;indices.push(a,b,c,b,d,c)}
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geometry.setIndex(indices);geometry.computeVertexNormals();return geometry
}

function distantRidgeGeometry() {
  const nx=132,nz=34,positions:number[]=[],uvs:number[]=[],colors:number[]=[],indices:number[]=[]
  const shadow=new THREE.Color('#182921'),stone=new THREE.Color('#4c5e4c'),warm=new THREE.Color('#66533f')
  for(let iz=0;iz<=nz;iz++){
    const v=iz/nz,z=-14.8-v*12.8
    for(let ix=0;ix<=nx;ix++){
      const u=ix/nx,x=-13.5+u*27
      const peaks=2.25*Math.exp(-Math.pow((x+6.2)/3.0,2))+3.05*Math.exp(-Math.pow((x-2.4)/3.5,2))+1.55*Math.exp(-Math.pow((x-9.6)/2.0,2))
      const crags=.28*Math.sin(x*1.34)+.17*Math.sin(x*2.91+.8)+.09*Math.cos(x*5.2)
      const rise=Math.sin(v*Math.PI*.82)*(peaks+crags)+v*(1-v)*(.14+.12*Math.sin(x*.67))
      const y=height(x,z)+rise-.035+Math.sin(v*Math.PI)*(.14*Math.sin(x*.81+v*5.2)+.07*Math.cos(x*1.73-v*7.1))
      positions.push(x,y,z);uvs.push(u*7,v*5)
      const c=shadow.clone().lerp(stone,.22+.42*v).lerp(warm,.07*(.5+.5*Math.sin(x*.7+v*8)))
      colors.push(c.r,c.g,c.b)
    }
  }
  const row=nx+1
  for(let iz=0;iz<nz;iz++)for(let ix=0;ix<nx;ix++){const a=iz*row+ix,b=a+1,c=a+row,d=c+1;indices.push(a,b,c,b,d,c)}
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geometry.setIndex(indices);geometry.computeVertexNormals();return geometry
}

function ScannedRockFace({ variant, x, z, turn, scale }: { variant: '01' | '02'; x: number; z: number; turn: number; scale: number }) {
  const asset = useGLTF(`/assets/urai/home-production/cc0/polyhaven-v48/rock_face_${variant}/asset.gltf`)
  const model = useMemo(() => {
    const copy = asset.scene.clone(true)
    copy.traverse(object => { if (object instanceof THREE.Mesh) { object.castShadow = true; object.receiveShadow = true } })
    return copy
  }, [asset.scene])
  return <primitive object={model} position={[x, height(x, z) - .18, z]} rotation={[0,turn,0]} scale={scale}/>
}

function TexturedMemoryTerrain() {
  const maps=useMemoryStoneMaps()
  const surface=useMemo(inhabitedSurfaceGeometry,[])
  const ridge=useMemo(distantRidgeGeometry,[])
  return <group name="home-v229-textured-inhabited-valley-and-distant-ridge">
    <Suspense fallback={null}><ScannedRockFace variant="01" x={-5.8} z={-17.3} turn={.26} scale={1.35}/><ScannedRockFace variant="02" x={5.1} z={-19.3} turn={-.24} scale={1.3}/></Suspense>
    <mesh geometry={surface} receiveShadow><meshStandardMaterial map={maps[0]} normalMap={maps[1]} roughnessMap={maps[2]} normalScale={new THREE.Vector2(.48,.48)} vertexColors roughness={.94}/></mesh>
    <mesh geometry={ridge} receiveShadow castShadow><meshStandardMaterial map={maps[0]} normalMap={maps[1]} roughnessMap={maps[2]} normalScale={new THREE.Vector2(.38,.38)} vertexColors roughness={.97} side={THREE.DoubleSide}/></mesh>
  </group>
}

function terraceGeometry(side: -1 | 1, z: number, width: number, rise: number) {
  const vertices: number[] = []
  const indices: number[] = []
  const cols = 34
  const rows = 7
  for (let row = 0; row <= rows; row++) {
    const v = row / rows
    for (let col = 0; col <= cols; col++) {
      const u = col / cols
      const x = side * (2.7 + v * width + .18 * Math.sin(u * 8.4 + v * 3.1))
      const zz = z - u * 8.4 + .22 * Math.sin(u * 6.2 + v * 2.6)
      const y = height(x, zz) + .04 + rise * Math.sin(v * Math.PI) + .06 * Math.sin(u * 11 + v * 4)
      vertices.push(x, y, zz)
    }
  }
  const stride = cols + 1
  for (let row = 0; row < rows; row++) for (let col = 0; col < cols; col++) {
    const a = row * stride + col, b = a + 1, c = a + stride, d = c + 1
    indices.push(a, c, b, b, c, d)
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}

function WeatheredMemoryBanks() {
  const banks = useMemo(() => [
    terraceGeometry(-1, -2.0, 2.4, .32),
    terraceGeometry(1, -2.8, 2.1, .28),
    terraceGeometry(-1, -9.4, 1.8, .24),
    terraceGeometry(1, -10.2, 1.65, .22),
  ], [])
  return <group name="home-v226-weathered-memory-banks">
    {banks.map((geometry, index) => <mesh key={index} geometry={geometry} receiveShadow castShadow>
      <meshStandardMaterial color={index % 2 ? '#455046' : '#514d43'} roughness={.99} metalness={0}/>
    </mesh>)}
  </group>
}

function basinGeometry() {
  const nx = 52, nz = 40, positions: number[] = [], colors: number[] = [], indices: number[] = []
  const earth = new THREE.Color('#342f29'), warm = new THREE.Color('#66513f'), moss = new THREE.Color('#475444')
  for (let iz = 0; iz <= nz; iz++) {
    const vz = iz / nz, z = -1.55 + vz * 3.1
    for (let ix = 0; ix <= nx; ix++) {
      const vx = ix / nx, x = -2.05 + vx * 4.1
      const r = Math.min(1, Math.sqrt((x / 2.05) ** 2 + (z / 1.55) ** 2))
      const rim = .28 * Math.pow(r, 2.2)
      const shelter = .34 * Math.exp(-((x / .95) ** 2 + ((z + 1.10) / .52) ** 2))
      const y = -.16 + rim + shelter + .035 * Math.sin(x * 2.8 + z * 3.2)
      positions.push(x, y, z)
      const color = earth.clone().lerp(warm, .20 + .28 * (1 - r)).lerp(moss, .15 * r)
      colors.push(color.r, color.g, color.b)
    }
  }
  const row = nx + 1
  for (let iz = 0; iz < nz; iz++) for (let ix = 0; ix < nx; ix++) {
    const a = iz * row + ix, b = a + 1, c = a + row, d = c + 1
    indices.push(a, b, c, b, d, c)
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}

function grownThresholdGeometry() {
  const outline = new THREE.Shape()
  outline.moveTo(-1.58, -.10)
  outline.bezierCurveTo(-1.55, 1.3, -.85, 2.9, -.16, 2.74)
  outline.bezierCurveTo(.84, 2.77, 1.47, 1.54, 1.56, -.1)
  outline.lineTo(1.24, -.1)
  outline.bezierCurveTo(1.18, 1.38, .65, 2.37, -.14, 2.4)
  outline.bezierCurveTo(-.64, 2.48, -1.25, 1.2, -1.25, -.1)
  outline.closePath()
  return new THREE.ExtrudeGeometry(outline, { depth: .58, bevelEnabled: true, bevelSegments: 4, bevelThickness: .08, bevelSize: .07, steps: 1, curveSegments: 48 })
}

function GroundSanctuary({ onGround }: { onGround: () => void }) {
  const y = height(GROUND.x, GROUND.z)
  const basin = useMemo(basinGeometry, [])
  return <group position={[GROUND.x, y + .02, GROUND.z]} rotation={[0, -.08, 0]} name="home-v226-ground-inhabited-hearth" onClick={(event) => { event.stopPropagation(); onGround() }}>
    <mesh geometry={basin} receiveShadow castShadow><meshStandardMaterial vertexColors roughness={.98}/></mesh>
    {[[-1.35,.34,-1.1,.52],[1.18,.24,-1.28,.42],[-.86,.15,-1.72,.34],[.62,.18,-1.84,.38]].map(([x,stoneY,z,scale],index)=><mesh key={index} position={[x,stoneY,z]} rotation={[index*.17,index*.71,index*.11]} scale={[scale*1.25,scale*.72,scale]} castShadow receiveShadow><dodecahedronGeometry args={[1,2]}/><meshStandardMaterial color={index%2?'#4f574a':'#3c4d43'} roughness={.98}/></mesh>)}
    <mesh position={[0, .18, -1.38]} scale={[1.42, .72, .30]} castShadow receiveShadow><sphereGeometry args={[1, 48, 28, 0, Math.PI * 2, 0, Math.PI * .52]}/><meshStandardMaterial color="#303b34" roughness={.99} side={THREE.DoubleSide}/></mesh>
    <mesh position={[-.16, .035, -.32]} scale={[.44, .055, .34]} castShadow><capsuleGeometry args={[.65, .5, 12, 28]}/><meshStandardMaterial color="#a9684f" emissive="#633326" emissiveIntensity={.45} roughness={.78}/></mesh>
    <mesh position={[-.16, .28, -.34]} scale={[.17, .32, .14]}><sphereGeometry args={[1, 28, 20]}/><meshPhysicalMaterial color="#e3a079" emissive="#b65338" emissiveIntensity={1.35} roughness={.42}/></mesh>
    <pointLight position={[-.16, .70, -.32]} color="#e59a6c" intensity={4.2} distance={6.2}/>
  </group>
}

function observatoryShell() {
  const nu = 64, nv = 28, positions: number[] = [], colors: number[] = [], indices: number[] = []
  const deep = new THREE.Color('#273633'), jade = new THREE.Color('#4a675e'), dusk = new THREE.Color('#665b72')
  for (let iu = 0; iu <= nu; iu++) {
    const u = iu / nu, theta = THREE.MathUtils.lerp(-1.18, 1.18, u)
    for (let iv = 0; iv <= nv; iv++) {
      const v = iv / nv, crown = Math.sin(v * Math.PI), radius = 1.55 + .10 * Math.sin(u * 7)
      const x = Math.sin(theta) * radius * (.72 + .12 * v)
      const z = -.52 - Math.cos(theta) * radius * .56 - .16 * v
      const y = .02 + v * 1.72 + .42 * crown + .05 * Math.sin(u * 9 + v * 8)
      positions.push(x, y, z)
      const color = deep.clone().lerp(jade, .22 + .38 * v).lerp(dusk, .13 * crown)
      colors.push(color.r, color.g, color.b)
    }
  }
  const row = nv + 1
  for (let iu = 0; iu < nu; iu++) for (let iv = 0; iv < nv; iv++) {
    const a = iu * row + iv, b = a + 1, c = a + row, d = c + 1
    indices.push(a, c, b, b, c, d)
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}

function LifeMapSanctuary({ onLifeMap }: { onLifeMap: () => void }) {
  const y = height(LIFE_MAP.x, LIFE_MAP.z)
  const portalRoots = useMemo(() => Array.from({ length: 9 }, (_, index) => {
    const side = index % 2 ? -1 : 1
    const depth = -.24 - index * .07
    return tube([
      new THREE.Vector3(side*.14, .02, depth + .14),
      new THREE.Vector3(side*(.30+index*.035), .56+index*.055, depth),
      new THREE.Vector3(side*(.56+index*.070), 1.10+index*.065, depth-.12),
      new THREE.Vector3(side*(.82+index*.085), 1.42+(index%3)*.16, depth-.18),
    ], .064 - index*.0042, 8)
  }), [])
  const threads = useMemo(() => Array.from({ length: 11 }, (_, index) => {
    const a = index * .67 - 1.1
    const end = new THREE.Vector3(Math.cos(a) * (.28 + index * .025), Math.sin(a * 1.5) * .22, -.12 - Math.sin(a) * .12)
    return tube([new THREE.Vector3(0, 0, 0), end.clone().multiplyScalar(.48).add(new THREE.Vector3(0, .08, -.02)), end], .005, 6)
  }), [])
  const stars = useMemo(() => {
    const positions: number[] = []
    for (let index = 0; index < 420; index++) {
      const arm = index % 5, t = index / 420, angle = t * Math.PI * 11 + arm * 1.256
      const radius = .08 + Math.pow(t, .66) * 1.02
      positions.push(Math.cos(angle) * radius, Math.sin(angle) * radius * .62, .04 * Math.sin(index * .37))
    }
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    return geometry
  }, [])
  return <group position={[LIFE_MAP.x, y + .02, LIFE_MAP.z]} rotation={[0, .08, 0]} name="home-v226-life-map-lineage-observatory" onClick={(event) => { event.stopPropagation(); onLifeMap() }}>
    <group name="home-v228-life-map-rooted-branching-threshold" userData={{ artRevision:'home-v230-life-map-asymmetric-root-threshold' }}>
      {portalRoots.map((geometry,index)=><mesh key={index} geometry={geometry} castShadow><meshStandardMaterial color={index%2?'#597565':'#675d70'} emissive={index%2?'#233f35':'#382b43'} emissiveIntensity={.28} roughness={.84}/></mesh>)}
    </group>
    <group position={[0, 1.22, -.42]} scale={[.82,.88,.82]} name="home-v226-life-map-contained-memory-field">
      <points geometry={stars} position={[0,0,.04]}><pointsMaterial color="#d5eee5" size={.026} transparent opacity={.88} depthWrite={false} sizeAttenuation/></points>
      {threads.map((geometry, index) => <mesh key={index} geometry={geometry}><meshStandardMaterial color={index % 2 ? '#91bdae' : '#b9a6c3'} emissive={index % 2 ? '#355d50' : '#55455e'} emissiveIntensity={.52}/></mesh>)}
      <pointLight color="#b8d8cc" intensity={2.2} distance={4.2}/>
    </group>
    <pointLight position={[0, 1.35, -.64]} color="#8bc4b0" intensity={1.5} distance={5.4}/>
  </group>
}

function organicOrbGeometry() {
  const geometry = new THREE.SphereGeometry(1, 96, 64, .18 * Math.PI, 1.64 * Math.PI)
  const position = geometry.getAttribute('position') as THREE.BufferAttribute
  const colors = new Float32Array(position.count * 3)
  const shadow = new THREE.Color('#193b45'), plum = new THREE.Color('#697fa0'), jade = new THREE.Color('#89c1ad'), warm = new THREE.Color('#b4b99a'), pale = new THREE.Color('#d7eadc')
  for (let index = 0; index < position.count; index++) {
    const bx = position.getX(index), by = position.getY(index), bz = position.getZ(index), angle = Math.atan2(bz, bx)
    const upper = Math.max(0, by), lower = Math.max(0, -by)
    const shoulder = 1 + .34 * upper * (bx < 0 ? 1.18 : .88) * (.45 + .55 * Math.abs(bx))
    const taper = 1 - .38 * Math.pow(lower, 1.16)
    const fold = 1 + .055 * Math.sin(angle * 3 + by * 7) + .024 * Math.sin(angle * 7 - by * 9)
    const cleft = Math.exp(-Math.pow(bx / .17, 2) - Math.pow((by - .70) / .17, 2)) * Math.max(0, .76 + bz)
    const x = bx * .95 * shoulder * taper * fold + .10 * (1 - by * by) + .06 * bz
    const z = bz * .58 * (1 + .12 * upper) * taper + .026 * Math.sin(angle * 3 + by * 6)
    const y = by * .74 - .10 * cleft - .16 * Math.pow(lower, 1.34) + .07 * Math.abs(bx) * upper
    position.setXYZ(index, x, y, z)
    const edge = Math.min(1, Math.abs(bx) * 1.2), side = Math.max(0, Math.cos(angle - .45)) * (1 - Math.abs(by)), band = .5 + .5 * Math.sin(angle * 3.2 + by * 6.2)
    const color = shadow.clone().lerp(plum, .26 + .22 * band).lerp(jade, .24 * side).lerp(warm, .25 * Math.max(0, -Math.cos(angle + .2)) * (1 - Math.abs(by))).lerp(pale, .12 * edge * upper)
    colors[index * 3] = color.r; colors[index * 3 + 1] = color.g; colors[index * 3 + 2] = color.b
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  geometry.computeVertexNormals()
  return geometry
}

function vein(index: number) {
  const side = index % 2 ? -1 : 1
  return tube(Array.from({ length: 30 }, (_, point) => {
    const t = point / 29
    return new THREE.Vector3(side * (.07 + t * .36 + .025 * Math.sin(t * 8 + index)), .34 - t * .68 + .025 * Math.sin(t * 7 + index), .39 + .018 * Math.sin(t * 5 + index))
  }), .0048 + index * .00018, 5)
}

function presenceBranch(index: number) {
  const side = index % 2 ? -1 : 1
  const angle = -1.1 + index * .31
  return tube(Array.from({ length: 34 }, (_, point) => {
    const t = point / 33
    const reach = .10 + Math.sin(t * Math.PI) * (.34 + (index % 3) * .06)
    return new THREE.Vector3(
      side * (.035 + t * .22) + Math.cos(angle + t * .8) * reach,
      -.40 + t * 1.04 + .08 * Math.sin(t * Math.PI * 2 + index),
      -.04 + Math.sin(angle + t * .8) * reach * .52,
    )
  }), .006 + (index % 3) * .0015, 7)
}

type Posture = { s: V3; r: V3; speed: number }
const posture: Record<OrbState, Posture> = {
  dormant:{s:[.92,.90,.91],r:[.03,-.06,-.03],speed:.10},idle:{s:[1,.99,.98],r:[-.03,.05,-.02],speed:.30},attention:{s:[1.035,1.04,.97],r:[-.08,.12,.04],speed:.62},listening:{s:[.98,1.03,.98],r:[.06,-.06,-.03],speed:.22},thinking:{s:[1.02,.99,1.01],r:[-.09,.14,.06],speed:.18},speaking:{s:[1.04,1.03,.97],r:[.03,-.02,-.06],speed:.80},guiding:{s:[.99,1.04,.97],r:[-.10,.02,.07],speed:.42},reflecting:{s:[.99,.98,1.02],r:[.08,.08,-.05],speed:.14},calming:{s:[1.01,.98,.99],r:[-.02,-.04,.02],speed:.12},privacy:{s:[.92,.92,.91],r:[.10,.08,.08],speed:.08},warning:{s:[1.04,1.04,.96],r:[-.11,-.06,-.08],speed:.95},transition:{s:[.96,1.05,.95],r:[-.11,.04,.08],speed:.65},
}

function RootCradle() {
  const y = height(ORB.x, ORB.z)
  const roots = useMemo(() => Array.from({ length: 7 }, (_, index) => {
    const angle = -1.42 + index * .46
    const radius = 1.02 + (index % 2) * .22
    const start = new THREE.Vector3(Math.cos(angle) * radius, -.02, Math.sin(angle) * radius)
    const middle = new THREE.Vector3(Math.cos(angle) * .46, .18 + (index % 3) * .05, Math.sin(angle) * .42)
    const end = new THREE.Vector3(Math.cos(angle) * .14, .38, Math.sin(angle) * .12)
    return tube([start, middle, end], .040 + (index % 2) * .009, 9)
  }), [])
  return <group position={[ORB.x, y + .015, ORB.z]} name="home-v226-root-cradle">
    {roots.map((geometry, index) => <mesh key={index} geometry={geometry} castShadow receiveShadow><meshStandardMaterial color={index % 2 ? '#3d4b3f' : '#51463e'} roughness={.98}/></mesh>)}
    <pointLight position={[.02,.32,.06]} color="#b88672" intensity={.42} distance={2.8}/>
  </group>
}

function LivingMemoryPresence({ state, reducedMotion, onOrb }: { state: OrbState; reducedMotion: boolean; onOrb: () => void }) {
  const root = useRef<THREE.Group>(null)
  const body = useMemo(organicOrbGeometry, [])
  const veins = useMemo(() => Array.from({ length: 8 }, (_, index) => vein(index)), [])
  const branches = useMemo(() => Array.from({ length: 9 }, (_, index) => presenceBranch(index)), [])
  const roots = useMemo(() => Array.from({ length: 5 }, (_, index) => {
    const side = index % 2 ? -1 : 1
    const x = side * (.10 + index * .035)
    return tube([
      new THREE.Vector3(x, -.28 + index * .015, .02),
      new THREE.Vector3(x * 1.7, -.62, .03 + (index % 3) * .06),
      new THREE.Vector3(side * (.42 + index * .055), -.96 - (index % 2) * .08, .10 + (index % 3) * .12),
    ], .018 + index * .002, 8)
  }), [])
  const pose = posture[state]
  const y = height(ORB.x, ORB.z)
  useFrame(({ clock }) => {
    if (!root.current) return
    const t = clock.elapsedTime * pose.speed, breath = reducedMotion ? 1 : 1 + Math.sin(t * .78) * .006
    root.current.scale.set(pose.s[0] * breath * 1.34, pose.s[1] * breath * 1.34, pose.s[2] * breath * 1.34)
    root.current.rotation.set(pose.r[0], pose.r[1] + (reducedMotion ? 0 : Math.sin(t * .70) * .014), pose.r[2])
  })
  const warning = state === 'warning'
  const activate = (event: ThreeEvent<MouseEvent>) => { event.stopPropagation(); onOrb() }
  return <group ref={root} position={[ORB.x, y + 1.05, ORB.z]} rotation={[0,-.10,-.10]} scale={1.34} name="home-v226-rooted-single-living-memory-presence" onClick={activate}>
    <group name="home-v227-split-asymmetric-memory-bloom">
      <mesh geometry={body} position={[-.18,.05,.01]} rotation={[.08,-.42,.18]} scale={[.38,.76,.38]} castShadow><meshPhysicalMaterial vertexColors side={THREE.DoubleSide} roughness={.28} clearcoat={.55} clearcoatRoughness={.3} sheen={.35} sheenColor="#b49a9c" emissive="#4b8991" emissiveIntensity={.24}/></mesh>
      <mesh geometry={body} position={[.20,-.08,.05]} rotation={[-.12,.58,-.24]} scale={[.28,.58,.32]} castShadow><meshPhysicalMaterial vertexColors side={THREE.DoubleSide} roughness={.32} clearcoat={.5} clearcoatRoughness={.34} sheen={.3} sheenColor="#96b8a8" emissive="#518f79" emissiveIntensity={.22}/></mesh>
      <mesh geometry={body} position={[.01,.12,-.08]} rotation={[.2,.12,.06]} scale={[.19,.82,.24]} castShadow><meshPhysicalMaterial vertexColors side={THREE.DoubleSide} roughness={.25} clearcoat={.6} clearcoatRoughness={.28} sheen={.4} sheenColor="#c3a69b" emissive="#73999d" emissiveIntensity={.3}/></mesh>
    </group>
    <group name="home-v227-branching-memory-nervature">{branches.map((geometry,index)=><mesh key={index} geometry={geometry}><meshStandardMaterial color={warning?'#d57467':index%2?'#9bc9b5':'#d19a83'} emissive={warning?'#7d342d':index%2?'#3c7561':'#7d4d3e'} emissiveIntensity={.74} roughness={.58}/></mesh>)}</group>
    <group scale={[.46,.82,.52]}>{veins.map((geometry, index) => <mesh key={index} geometry={geometry}><meshStandardMaterial color={warning ? '#d57467' : index % 2 ? '#9bc9b5' : '#d19a83'} emissive={warning ? '#7d342d' : index % 2 ? '#3c7561' : '#7d4d3e'} emissiveIntensity={.72} roughness={.60}/></mesh>)}</group>
    <group name="home-v226-living-memory-root-tendrils">{roots.map((geometry,index)=><mesh key={index} geometry={geometry} castShadow><meshStandardMaterial color={index%2?'#668b78':'#8b6658'} emissive={index%2?'#294d40':'#59382f'} emissiveIntensity={.32} roughness={.78}/></mesh>)}</group>
    <mesh scale={[.72,1.14,.76]} onClick={activate}><sphereGeometry args={[1,20,16]}/><meshBasicMaterial transparent opacity={0} depthWrite={false}/></mesh>
    <pointLight position={[.08,.04,.34]} color={warning ? '#d36d60' : '#d3a18b'} intensity={state === 'dormant' ? .12 : .72} distance={3.8}/>
  </group>
}

function MemoryWisps() {
  const geometry = useMemo(() => {
    const points: number[] = []
    for (let index = 0; index < 260; index++) {
      const angle = index * 2.39996323, radius = 2.0 + ((index * 47) % 100) / 100 * 8.8
      points.push(Math.cos(angle) * radius, .52 + ((index * 31) % 100) / 100 * 3.8, 2.4 - ((index * 61) % 100) / 100 * 18.4)
    }
    const buffer = new THREE.BufferGeometry()
    buffer.setAttribute('position', new THREE.Float32BufferAttribute(points, 3))
    return buffer
  }, [])
  return <points geometry={geometry}><pointsMaterial color="#d8ddd2" size={.011} transparent opacity={.18} depthWrite={false}/></points>
}

export function HomeV225PolishV3({ orbState, reducedMotion, onOrb, onGround, onLifeMap, onWalk }: { orbState: OrbState; reducedMotion: boolean; onOrb: () => void; onGround: () => void; onLifeMap: () => void; onWalk: WalkHandler }) {
  return <group name="home-v226-production-rooted-memory-sanctuary" onClick={onWalk}>
    <RetireRejectedLayers/>
    <PortraitFraming/>
    {/* The continuous textured surface owns the ground; overlapping banks are retired. */}
    <TexturedMemoryTerrain/>
    <RootedCanopy/>
    <GroundSanctuary onGround={onGround}/>
    <LifeMapSanctuary onLifeMap={onLifeMap}/>
    <RootCradle/>
    <LivingMemoryPresence state={orbState} reducedMotion={reducedMotion} onOrb={onOrb}/>
    <MemoryWisps/>
  </group>
}

useGLTF.preload(FERN_MODEL)
