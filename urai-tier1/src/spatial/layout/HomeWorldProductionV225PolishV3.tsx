'use client'

import { Suspense, useEffect, useMemo, useRef } from 'react'
import { useGLTF, useTexture } from '@react-three/drei'
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'
import { createLivingMemoryMaterial } from '@/spatial/assets/livingMemoryMaterial'
import { createMineralMaps } from '@/spatial/assets/naturalSurfaceMaps'
import { useSanctuarySoilTexture } from '@/spatial/assets/useSanctuarySoilTexture'
import type { OrbState } from '@/app/home/orbStateController'
import { GROUND, LIFE_MAP, ORB, height } from './HomeWorldProductionV223Geometry'

type WalkHandler = (event: ThreeEvent<MouseEvent>) => void
type V3 = [number, number, number]

const FERN_MODEL = '/assets/urai/home-production/cc0/polyhaven-v48/fern_02/asset.gltf'

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
  const curve = new THREE.CatmullRomCurve3(points, false, 'centripetal', .42)
  const segments = Math.max(56, points.length * 5)
  const geometry = new THREE.TubeGeometry(curve, segments, radius, radial, false)
  const vertices = geometry.getAttribute('position')
  for (let ring = 0; ring <= segments; ring++) {
    const t = ring / segments, center = curve.getPointAt(t)
    const taper = .10 + .90 * Math.pow(1 - t, .62)
    for (let side = 0; side <= radial; side++) {
      const index = ring * (radial + 1) + side
      vertices.setXYZ(index, center.x + (vertices.getX(index) - center.x) * taper, center.y + (vertices.getY(index) - center.y) * taper, center.z + (vertices.getZ(index) - center.z) * taper)
    }
  }
  geometry.computeVertexNormals()
  return geometry
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
  const sourceAlpha = useTexture('/assets/urai/home-production/cc0/polyhaven-v48/fern_02/textures/fern_02_alpha_1k.png')
  const alpha = useMemo(() => { const map = sourceAlpha.clone(); map.flipY = false; map.colorSpace = THREE.NoColorSpace; map.needsUpdate = true; return map }, [sourceAlpha])
  useEffect(() => () => alpha.dispose(), [alpha])
  const materials = useMemo(() => {
    let source: THREE.MeshStandardMaterial | null = null
    fern.scene.traverse(child => { if (child instanceof THREE.Mesh && !source) source = child.material as THREE.MeshStandardMaterial })
    if (!source) throw new Error('Governed fern material is missing')
    return ['#d4d9c0','#b9cbb6','#e0dcc6'].map(color => {
      const material = (source as THREE.MeshStandardMaterial).clone()
      material.color.set(color)
      material.roughness = .88
      material.alphaMap = alpha
      material.alphaTest = .45
      return material
    })
  }, [fern.scene,alpha])
  useEffect(() => () => materials.forEach(material => material.dispose()), [materials])
  const plants = useMemo(() => Array.from({ length: 64 }, (_, index) => {
    const patches = [[-4.3,1.4],[5.9,-1.5],[-6.2,-5.4],[7.2,-8.9],[-5.8,-12.7],[5.6,-15.3],[-8.6,-18.0],[8.8,-18.8]]
    const [cx, cz] = patches[Math.floor(index / 8)]
    const angle = index * 2.39996323, radius = Math.sqrt((index % 8) + .35) * .49
    const x = cx + Math.cos(angle) * radius
    const z = cz + Math.sin(angle) * radius * .8
    const variant = fern.scene.getObjectByName(['fern_02_a','fern_02_b','fern_02_c','fern_02_d'][index % 4])
    if (!variant) throw new Error('Governed fern variant is missing')
    const object = variant.clone(true)
    object.name = `home-scanned-fern-${index + 1}`
    object.position.set(x, height(x,z) + .025, z)
    object.rotation.y = index * 1.41
    const scale = .60 + (index % 7) * .042
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
  const maps = useMemo(createMineralMaps, [])
  useEffect(() => () => maps.forEach(texture => texture.dispose()), [maps])
  return maps
}

function soilVariation(x: number, z: number) {
  const ix = Math.floor(x), iz = Math.floor(z)
  const hash = (a: number, b: number) => {
    const n = Math.sin(a * 127.1 + b * 311.7 + 19.19) * 43758.5453
    return n - Math.floor(n)
  }
  const smooth = (t: number) => t * t * (3 - 2 * t)
  const u = smooth(x - ix), v = smooth(z - iz)
  return THREE.MathUtils.lerp(
    THREE.MathUtils.lerp(hash(ix, iz), hash(ix + 1, iz), u),
    THREE.MathUtils.lerp(hash(ix, iz + 1), hash(ix + 1, iz + 1), u), v,
  )
}

function inhabitedSurfaceGeometry() {
  const nx=156,nz=210,positions:number[]=[],uvs:number[]=[],colors:number[]=[],indices:number[]=[]
  const moss=new THREE.Color('#658273'),loam=new THREE.Color('#b5a184'),lichen=new THREE.Color('#adae96')
  for(let iz=0;iz<=nz;iz++){
    const vz=iz/nz,z=6.4-vz*26.2
    for(let ix=0;ix<=nx;ix++){
      const vx=ix/nx,x=-13.5+vx*27
      const relief=.052*Math.sin(x*1.72+z*.91)+.034*Math.cos(x*3.86-z*1.54)+.017*Math.sin(x*7.1+z*4.3)
      const y=height(x,z)+relief*(.32+.68*Math.min(1,Math.abs(x)/7.5))+.032
      positions.push(x,y,z)
      // Smooth, bounded domain variation breaks identical tile alignment without
      // discontinuities, extra texture fetches, or animated shader work.
      const macro = soilVariation(x * .19, z * .19)
      const cross = soilVariation(x * .17 + 23.7, z * .17 - 11.4)
      uvs.push(vx*6.75 + .22*(macro-.5),vz*6.55 + .22*(cross-.5))
      const grain = .72 * macro + .28 * soilVariation(x * .73, z * .73)
      const center=.30*Math.sin((z+2.4)*.22)+.09*Math.sin((z-1)*.63)
      const trail=1-THREE.MathUtils.smoothstep(Math.abs(x-center + .16*(cross-.5)),.30,.88)
      const dry = THREE.MathUtils.smoothstep(grain,.36,.76)
      const c=moss.clone().lerp(lichen,.62*dry).lerp(loam,.82*trail)
      colors.push(c.r,c.g,c.b)
    }
  }
  const row=nx+1
  for(let iz=0;iz<nz;iz++)for(let ix=0;ix<nx;ix++){const a=iz*row+ix,b=a+1,c=a+row,d=c+1;indices.push(a,b,c,b,d,c)}
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geometry.setIndex(indices);geometry.computeVertexNormals();return geometry
}

function distantRidgeGeometry() {
  const nx=132,nz=34,positions:number[]=[],uvs:number[]=[],colors:number[]=[],indices:number[]=[]
  const shadow=new THREE.Color('#58674f'),stone=new THREE.Color('#8a977d'),warm=new THREE.Color('#908568')
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
    copy.updateMatrixWorld(true)
    const placement = new THREE.Matrix4().compose(new THREE.Vector3(x, height(x,z)-.45,z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),turn), new THREE.Vector3(scale,scale,scale))
    copy.traverse(object => {
      if (!(object instanceof THREE.Mesh)) return
      const geometry = object.geometry.clone()
      geometry.computeBoundingBox()
      const bounds = geometry.boundingBox!
      const span = bounds.getSize(new THREE.Vector3())
      const world = placement.clone().multiply(object.matrixWorld)
      const inverse = world.clone().invert()
      const positions = geometry.getAttribute('position')
      const point = new THREE.Vector3()
      // Seat the scan's cropped perimeter into the terrain while retaining its
      // interior relief and authored UV atlas. No floating rectangular cut edge.
      for (let i=0;i<positions.count;i++) {
        point.fromBufferAttribute(positions,i)
        const edge = Math.min((point.x-bounds.min.x)/span.x,(bounds.max.x-point.x)/span.x,(point.y-bounds.min.y)/span.y,(bounds.max.y-point.y)/span.y)
        const retain = THREE.MathUtils.smoothstep(edge,0,.17)
        point.applyMatrix4(world)
        point.y = THREE.MathUtils.lerp(height(point.x,point.z)-.07,point.y,retain)
        point.applyMatrix4(inverse)
        positions.setXYZ(i,point.x,point.y,point.z)
      }
      geometry.computeVertexNormals()
      object.geometry = geometry
      object.castShadow = true
      object.receiveShadow = true
    })
    return copy
  }, [asset.scene,scale,turn,x,z])
  useEffect(() => () => model.traverse(object => { if(object instanceof THREE.Mesh) object.geometry.dispose() }),[model])
  return <primitive object={model} position={[x, height(x, z) - .45, z]} rotation={[0,turn,0]} scale={scale}/>
}

function breakSoilRepetition(shader: Parameters<THREE.MeshStandardMaterial['onBeforeCompile']>[0]) {
  // Blend four deterministically offset samples across cell boundaries. UV
  // warping alone still repeats the same recognisable gravel patches.
  shader.fragmentShader = shader.fragmentShader.replace('#include <map_pars_fragment>', `
    #include <map_pars_fragment>
    #ifdef USE_MAP
    vec2 sanctuarySoilOffset(vec2 cell) {
      return fract(sin(vec2(dot(cell,vec2(127.1,311.7)),dot(cell,vec2(269.5,183.3))))*43758.5453);
    }
    vec4 sanctuarySoilSample(vec2 uv) {
      vec2 cell=floor(uv), blend=fract(uv);
      blend=blend*blend*(3.0-2.0*blend);
      vec4 a=texture2D(map,uv+sanctuarySoilOffset(cell));
      vec4 b=texture2D(map,uv+sanctuarySoilOffset(cell+vec2(1.0,0.0)));
      vec4 c=texture2D(map,uv+sanctuarySoilOffset(cell+vec2(0.0,1.0)));
      vec4 d=texture2D(map,uv+sanctuarySoilOffset(cell+vec2(1.0,1.0)));
      return mix(mix(a,b,blend.x),mix(c,d,blend.x),blend.y);
    }
    #endif
  `)
  shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>', `
    #ifdef USE_MAP
      diffuseColor *= sanctuarySoilSample(vMapUv);
    #endif
  `)
}

function TexturedMemoryTerrain() {
  const albedo = useSanctuarySoilTexture()
  const maps=useMemoryStoneMaps()
  const surface=useMemo(inhabitedSurfaceGeometry,[])
  const ridge=useMemo(distantRidgeGeometry,[])
  useEffect(() => () => { surface.dispose(); ridge.dispose() }, [surface, ridge])
  return <group name="home-v229-textured-inhabited-valley-and-distant-ridge">
    <mesh geometry={surface} receiveShadow><meshStandardMaterial map={albedo} normalMap={maps[1]} roughnessMap={maps[2]} onBeforeCompile={breakSoilRepetition} normalScale={new THREE.Vector2(.48,.48)} vertexColors roughness={.94}/></mesh>
    <mesh geometry={ridge} receiveShadow castShadow><meshStandardMaterial map={albedo} normalMap={maps[1]} roughnessMap={maps[2]} onBeforeCompile={breakSoilRepetition} normalScale={new THREE.Vector2(.38,.38)} vertexColors roughness={.97} side={THREE.DoubleSide}/></mesh>
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

function hearthStoneGeometry(seed: number) {
  const geometry = new THREE.SphereGeometry(1, 48, 28)
  const p = geometry.getAttribute('position')
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i)
    const contour = 1 + .10 * Math.sin(x * 4.8 + seed) * Math.cos(z * 3.4 - seed) + .045 * Math.sin(y * 8.1 + x * 6.3)
    p.setXYZ(i, x * contour, y * contour, z * contour)
  }
  geometry.computeVertexNormals()
  return geometry
}

function GroundSanctuary({ onGround }: { onGround: () => void }) {
  const y = height(GROUND.x, GROUND.z)
  const stones = useMemo(() => Array.from({length:4}, (_, index) => hearthStoneGeometry(index)), [])
  const threshold = useMemo(grownThresholdGeometry, [])
  const maps = useMemoryStoneMaps()
  const albedo = useSanctuarySoilTexture()
  useEffect(() => () => { threshold.dispose(); stones.forEach(geometry => geometry.dispose()) }, [stones,threshold])
  return <group position={[GROUND.x, y + .02, GROUND.z]} rotation={[0, -.08, 0]} name="home-v226-ground-inhabited-hearth" onClick={(event) => { event.stopPropagation(); onGround() }}>
    <mesh geometry={threshold} position={[0,-.02,-.74]} rotation={[0,.16,0]} scale={[.82,.78,.82]} castShadow receiveShadow name="home-v231-ground-weathered-threshold">
      <meshStandardMaterial map={albedo} normalMap={maps[1]} normalScale={new THREE.Vector2(.64,.64)} color="#62594b" emissive="#2f211b" emissiveIntensity={.10} roughness={.95}/>
    </mesh>
    {[[-1.35,.34,-1.1,.52],[1.18,.24,-1.28,.42],[-.86,.15,-1.72,.34],[.62,.18,-1.84,.38]].map(([x,stoneY,z,scale],index)=><mesh key={index} geometry={stones[index]} position={[x,stoneY,z]} rotation={[index*.17,index*.71,index*.11]} scale={[scale*1.25,scale*.72,scale]} castShadow receiveShadow><meshStandardMaterial map={albedo} normalMap={maps[1]} color={index%2?'#989b8c':'#87918b'} roughness={.98}/></mesh>)}
    {stones.slice(0,3).map((geometry,index)=><mesh key={index} geometry={geometry} position={[-.16+(index-1)*.20,.08,-.34+(index%2)*.13]} scale={[.19,.08,.15]}><meshStandardMaterial color="#302b28" map={albedo} normalMap={maps[1]} emissive="#a8441b" emissiveIntensity={.12} roughness={.76}/></mesh>)}
    <pointLight position={[-.16, .70, -.32]} color="#e59a6c" intensity={4.2} distance={6.2}/>
  </group>
}

function LifeMapSanctuary({ onLifeMap }: { onLifeMap: () => void }) {
  const y = height(LIFE_MAP.x, LIFE_MAP.z)
  const portalRoots = useMemo(() => Array.from({ length: 3 }, (_, index) => {
    const side = index % 2 ? -1 : 1
    const depth = -.24 - index * .13
    return tube([
      new THREE.Vector3(side*(1.02 + index*.09), -.14, depth + .25),
      new THREE.Vector3(side*(.96 + index*.07), .64, depth),
      new THREE.Vector3(side*(.65 + index*.03), 1.52 + index*.06, depth-.13),
      new THREE.Vector3(side*.18, 1.98 + index*.05, depth-.22),
      new THREE.Vector3(-side*.12, 2.05 + index*.04, depth-.28),
    ], .19 - index*.026, 16)
  }), [])
  const threads = useMemo(() => Array.from({ length: 11 }, (_, index) => {
    const a = index * .67 - 1.1
    const end = new THREE.Vector3(Math.cos(a) * (.28 + index * .025), Math.sin(a * 1.5) * .22, -.12 - Math.sin(a) * .12)
    return tube([new THREE.Vector3(0, 0, 0), end.clone().multiplyScalar(.48).add(new THREE.Vector3(0, .08, -.02)), end], .005, 6)
  }), [])
  const portalMaps = useMemoryStoneMaps()
  const stars = useMemo(() => {
    const positions: number[] = []
    for (let index = 0; index < 420; index++) {
      const t = (index + .5) / 420, angle = index * 2.39996323 + .23 * Math.sin(index * 1.73)
      const radius = .06 + Math.sqrt(t) * .92
      positions.push(Math.cos(angle) * radius, Math.sin(angle) * radius * .68, .22 * Math.sin(index * .37))
    }
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    return geometry
  }, [])
  useEffect(() => () => { portalRoots.forEach(geometry => geometry.dispose()); threads.forEach(geometry => geometry.dispose()); stars.dispose() }, [portalRoots,threads,stars])
  return <group position={[LIFE_MAP.x, y + .02, LIFE_MAP.z]} rotation={[0, .08, 0]} name="home-v226-life-map-lineage-observatory" onClick={(event) => { event.stopPropagation(); onLifeMap() }}>
    <group name="home-v228-life-map-rooted-branching-threshold" userData={{ artRevision:'home-v230-life-map-asymmetric-root-threshold' }}>
      {portalRoots.map((geometry,index)=><mesh key={index} geometry={geometry} castShadow><meshStandardMaterial map={portalMaps[0]} normalMap={portalMaps[1]} normalScale={new THREE.Vector2(.7,.7)} color={index%2?'#718878':'#867b79'} emissive={index%2?'#233f35':'#382b43'} emissiveIntensity={.06} roughness={.84}/></mesh>)}
    </group>
    <group position={[0, 1.22, -.42]} scale={[.82,.88,.82]} name="home-v226-life-map-contained-memory-field">
      <points geometry={stars} position={[0,0,.04]}><shaderMaterial transparent depthWrite={false} uniforms={{uColor:{value:new THREE.Color('#b7d8cd')}}} vertexShader={`void main(){ vec4 mv=modelViewMatrix*vec4(position,1.0); gl_Position=projectionMatrix*mv; gl_PointSize=clamp(8.0/max(1.0,-mv.z),1.2,3.5); }`} fragmentShader={`uniform vec3 uColor; void main(){ float r=length(gl_PointCoord-.5)*2.0; if(r>1.0) discard; gl_FragColor=vec4(uColor,pow(1.0-r,1.7)*.68);
 #include <colorspace_fragment>
 }`}/></points>
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
    const shoulder = 1 + .52 * upper * (bx < 0 ? 1.16 : .90) * (.36 + .64 * Math.abs(bx))
    const taper = 1 - .56 * Math.pow(lower, 1.08)
    const fold = 1 + .055 * Math.sin(angle * 3 + by * 7) + .024 * Math.sin(angle * 7 - by * 9)
    // Carry the cleft through the crown. A Gaussian centered below the pole
    // only dents the face and leaves an unbroken egg-shaped silhouette.
    const cleft = Math.exp(-Math.pow((bx + .035) / .25, 2)) * THREE.MathUtils.smoothstep(by, .48, .96)
    const x = bx * .88 * shoulder * taper * fold + .075 * (1 - by * by) + .045 * bz
    const z = bz * .48 * (1 + .08 * upper) * taper + .022 * Math.sin(angle * 3 + by * 6)
    const y = by * .91 - .38 * cleft - .24 * Math.pow(lower, 1.20) + .11 * Math.abs(bx) * upper
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
    const angle = .38 + index * 2.39996323
    const radius = 1.02 + (index % 2) * .22
    // tube() narrows toward its last point: grow from the mass into the soil,
    // not from a blunt exposed outer end back toward the mass.
    const start = new THREE.Vector3(Math.cos(angle) * .14, .34, Math.sin(angle) * .12)
    const mx = Math.cos(angle) * .46, mz = Math.sin(angle) * .42
    const middle = new THREE.Vector3(mx, height(ORB.x + mx, ORB.z + mz) - y + .08, mz)
    const ex = Math.cos(angle) * radius, ez = Math.sin(angle) * radius
    const end = new THREE.Vector3(ex, height(ORB.x + ex, ORB.z + ez) - y - .09, ez)
    return tube([start, middle, end], .09 + (index % 2) * .014, 11)
  }), [])
  useEffect(() => () => roots.forEach(geometry => geometry.dispose()), [roots])
  return <group position={[ORB.x, y + .015, ORB.z]} name="home-v226-root-cradle">
    {roots.map((geometry, index) => <mesh key={index} geometry={geometry} castShadow receiveShadow><meshStandardMaterial color={index % 2 ? '#375148' : '#584c42'} emissive={index % 2 ? '#142a24' : '#2d211d'} emissiveIntensity={.08} roughness={.96}/></mesh>)}
    <pointLight position={[.02,.32,.06]} color="#b88672" intensity={.42} distance={2.8}/>
  </group>
}

function LivingMemoryPresence({ state, reducedMotion, onOrb }: { state: OrbState; reducedMotion: boolean; onOrb: () => void }) {
  const root = useRef<THREE.Group>(null)
  const body = useMemo(organicOrbGeometry, [])
  useEffect(() => () => body.dispose(), [body])
  const coreMaterial = useMemo(() => {
    const created = createLivingMemoryMaterial(true)
    created.material.color.set('#456860')
    created.material.roughness = .68
    created.material.metalness = 0
    created.material.clearcoat = .08
    created.material.clearcoatRoughness = .76
    created.material.sheen = .22
    created.material.emissive.set('#173b35')
    created.material.emissiveIntensity = .055
    return created
  }, [])
  const branches = useMemo(() => Array.from({ length: 9 }, (_, index) => presenceBranch(index)), [])
  useEffect(() => {
    const material = coreMaterial.material
    // Important states must remain legible when breathing is reduced or stopped.
    material.color.set(state === 'warning' ? '#b68a62' : state === 'privacy' ? '#9bbac7' : state === 'dormant' ? '#3a514c' : '#638879')
    material.emissive.set(state === 'warning' ? '#9b5020' : state === 'privacy' ? '#32667a' : '#173b35')
    material.emissiveIntensity = state === 'warning' ? .24 : state === 'privacy' ? .18 : state === 'dormant' ? .015 : .055
  }, [coreMaterial, state])
  useEffect(() => () => coreMaterial.material.dispose(), [coreMaterial])
  useEffect(() => () => branches.forEach(geometry => geometry.dispose()), [branches])
  const pose = posture[state]
  const y = height(ORB.x, ORB.z)
  useFrame(({ clock }) => {
    if (!root.current) return
    const t = clock.elapsedTime * pose.speed, breath = reducedMotion ? 1 : 1 + Math.sin(t * .78) * .006
    root.current.scale.set(pose.s[0] * breath * 1.72, pose.s[1] * breath * 1.72, pose.s[2] * breath * 1.72)
    root.current.rotation.set(pose.r[0], pose.r[1] + (reducedMotion ? 0 : Math.sin(t * .70) * .014), pose.r[2])
  })
  useFrame(({ clock }) => { coreMaterial.time.value = reducedMotion ? 0 : clock.elapsedTime })
  const warning = state === 'warning'
  const activate = (event: ThreeEvent<MouseEvent>) => { event.stopPropagation(); onOrb() }
  return <group ref={root} position={[ORB.x, y + 1.08, ORB.z]} rotation={[0,-.10,-.10]} scale={1.28} name="home-v226-rooted-single-living-memory-presence" onClick={activate}>
    <group name="home-v227-branching-memory-nervature">
      <group name="home-v229-matter-anchored-branching-nervature" userData={{ artRevision:'home-v230-surface-bound-memory-nervature', silhouette:'anchored-not-jellyfish-tendril-halo' }}>
        {branches.map((geometry, index) => <mesh key={index} geometry={geometry} position={[index % 2 ? -.10 : .08, -.03 + (index % 3) * .025, -.09 + (index % 4) * .018]} rotation={[.10 - index * .012, index % 2 ? -.32 : .28, index % 3 ? .08 : -.10]} scale={[.58 + (index % 3) * .035, .46 + (index % 2) * .03, .50]} castShadow receiveShadow>
          <meshStandardMaterial color={warning ? '#7f3f39' : index % 2 ? '#546454' : '#6b5b50'} emissive={warning ? '#5b2421' : '#253a34'} emissiveIntensity={warning ? .16 : .10} roughness={.82} metalness={0}/>
        </mesh>)}
      </group>
    </group>
    <group name="home-v227-split-asymmetric-memory-bloom">
      <mesh geometry={body} position={[-.03,.08,.01]} rotation={[.08,-.42,.18]} scale={[.84,1.08,.78]} castShadow receiveShadow><primitive object={coreMaterial.material} attach="material"/></mesh>
      <mesh geometry={body} position={[.12,.14,-.20]} rotation={[-.12,.58,-.24]} scale={[.24,.34,.22]} castShadow><meshStandardMaterial color={warning?'#9d5149':'#9cb7a8'} emissive={warning?'#712d29':'#2b5148'} emissiveIntensity={.20} roughness={.78}/></mesh>
    </group>
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
    {/* Distinct scan silhouettes sit beyond the walkable valley boundary.
        Their cropped perimeters are seated by ScannedRockFace, not exposed. */}
    <ScannedRockFace variant="01" x={-6.9} z={-17.0} turn={.24} scale={1.12}/>
    <ScannedRockFace variant="02" x={6.5} z={-17.5} turn={-.40} scale={1.28}/>
    <RootedCanopy/>
    <GroundSanctuary onGround={onGround}/>
    <LifeMapSanctuary onLifeMap={onLifeMap}/>
    <RootCradle/>
    <LivingMemoryPresence state={orbState} reducedMotion={reducedMotion} onOrb={onOrb}/>
    <MemoryWisps/>
  </group>
}

useGLTF.preload(FERN_MODEL)
