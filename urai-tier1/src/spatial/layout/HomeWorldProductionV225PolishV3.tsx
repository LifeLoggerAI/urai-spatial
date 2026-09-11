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
    const placement = new THREE.Matrix4().compose(new THREE.Vector3(x, height(x,z)-.72,z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),turn), new THREE.Vector3(scale,scale,scale))
    copy.traverse(object => {
      if (!(object instanceof THREE.Mesh)) return
      const geometry = object.geometry.clone()
      geometry.computeBoundingBox()
      const bounds = geometry.boundingBox!
      const span = bounds.getSize(new THREE.Vector3())
      const center = bounds.getCenter(new THREE.Vector3())
      const world = placement.clone().multiply(object.matrixWorld)
      const inverse = world.clone().invert()
      const positions = geometry.getAttribute('position')
      const point = new THREE.Vector3()
      // An elliptical shoulder avoids preserving a smaller rectangular plateau
      // inside the crop. Keep the central relief and the authored UV atlas.
      for (let i=0;i<positions.count;i++) {
        point.fromBufferAttribute(positions,i)
        const nx = 2*(point.x-center.x)/Math.max(span.x,.0001)
        const ny = 2*(point.y-center.y)/Math.max(span.y,.0001)
        const radius = Math.hypot(nx,ny)
        const retain = 1-THREE.MathUtils.smoothstep(radius,.48,.94)
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
  return <primitive object={model} position={[x, height(x, z) - .72, z]} rotation={[0,turn,0]} scale={scale}/>
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
    <mesh geometry={surface} receiveShadow><meshStandardMaterial map={albedo} normalMap={maps[1]} roughnessMap={maps[2]} onBeforeCompile={breakSoilRepetition} normalScale={new THREE.Vector2(.34,.34)} vertexColors roughness={.91} color="#b0a28b"/></mesh>
    <mesh geometry={ridge} receiveShadow castShadow><meshStandardMaterial map={albedo} normalMap={maps[1]} roughnessMap={maps[2]} onBeforeCompile={breakSoilRepetition} normalScale={new THREE.Vector2(.31,.31)} vertexColors roughness={.95} color="#778071" side={THREE.DoubleSide}/></mesh>
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
  const maps=useMemoryStoneMaps()
  const banks = useMemo(() => [
    terraceGeometry(-1, -2.0, 2.4, .32),
    terraceGeometry(1, -2.8, 2.1, .28),
    terraceGeometry(-1, -9.4, 1.8, .24),
    terraceGeometry(1, -10.2, 1.65, .22),
  ], [])
  useEffect(() => () => banks.forEach(geometry=>geometry.dispose()), [banks])
  return <group name="home-v226-weathered-memory-banks">
    {banks.map((geometry, index) => <mesh key={index} geometry={geometry} receiveShadow castShadow>
      <meshStandardMaterial map={maps[0]} normalMap={maps[1]} normalScale={new THREE.Vector2(.40,.40)} color={index % 2 ? '#59635a' : '#645b4f'} roughness={.96} metalness={0}/>
    </mesh>)}
  </group>
}

function grownThresholdGeometry() {
  const outline = new THREE.Shape()
  outline.moveTo(-2.12, -.18)
  outline.bezierCurveTo(-2.03, 1.42, -1.24, 3.12, -.32, 2.96)
  outline.bezierCurveTo(.76, 3.10, 1.86, 1.62, 1.94, -.18)
  outline.lineTo(1.24, -.1)
  outline.bezierCurveTo(1.18, 1.38, .65, 2.37, -.14, 2.4)
  outline.bezierCurveTo(-.64, 2.48, -1.25, 1.2, -1.25, -.1)
  outline.closePath()
  const geometry = new THREE.ExtrudeGeometry(outline, { depth: 1.8, bevelEnabled: true, bevelSegments: 4, bevelThickness: .08, bevelSize: .07, steps: 5, curveSegments: 48 })
  const positions = geometry.getAttribute('position')
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i), y = positions.getY(i), z = positions.getZ(i)
    const weather = .035 * Math.sin(x * 5.3 + y * 3.7 + z * 2.1) + .018 * Math.sin(x * 11.2 - y * 7.8)
    positions.setXYZ(i, x + weather, y + weather * .7, z)
  }
  geometry.computeVertexNormals()
  return geometry
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

function groundDescentGeometry() {
  const shape = new THREE.Shape()
  shape.moveTo(-1.22, -.10)
  shape.lineTo(-1.12, 1.15)
  shape.quadraticCurveTo(-.96, 2.06, -.14, 2.32)
  shape.quadraticCurveTo(.78, 2.12, 1.04, 1.16)
  shape.lineTo(1.12, -.10)
  shape.closePath()
  return new THREE.ShapeGeometry(shape, 40)
}

function emberFissure(index: number) {
  const side = index % 2 ? -1 : 1
  return tube([
    new THREE.Vector3(side * (.08 + index * .035), .015, .34 + index * .09),
    new THREE.Vector3(side * (.18 + index * .05), .008, -.08),
    new THREE.Vector3(side * (.10 + index * .04), -.025, -.56),
    new THREE.Vector3(side * (.24 + index * .03), -.13, -1.05),
  ], .009 + index * .002, 7)
}

function GroundSanctuary({ onGround }: { onGround: () => void }) {
  const y = height(GROUND.x, GROUND.z)
  const stones = useMemo(() => Array.from({length:14}, (_, index) => hearthStoneGeometry(index)), [])
  const threshold = useMemo(grownThresholdGeometry, [])
  const descent = useMemo(groundDescentGeometry, [])
  const fissures = useMemo(() => Array.from({ length: 3 }, (_, index) => emberFissure(index)), [])
  const maps = useMemoryStoneMaps()
  const albedo = useSanctuarySoilTexture()
  useEffect(() => () => { threshold.dispose(); descent.dispose(); stones.forEach(geometry => geometry.dispose()); fissures.forEach(geometry => geometry.dispose()) }, [descent,fissures,stones,threshold])
  return <group position={[GROUND.x, y + .02, GROUND.z]} rotation={[0, -.08, 0]} name="home-v226-ground-inhabited-hearth" onClick={(event) => { event.stopPropagation(); onGround() }}>
    <mesh geometry={descent} position={[-.03,-.08,-1.52]} rotation={[0,.12,0]} scale={[.96,.91,1]} name="home-ground-deep-traversable-entrance">
      <meshStandardMaterial color="#081413" emissive="#12201d" emissiveIntensity={.20} roughness={1}/>
    </mesh>
    <mesh geometry={threshold} position={[0,-.04,-1.74]} rotation={[0,.14,0]} scale={[1.05,.94,1.12]} castShadow receiveShadow name="home-v231-ground-weathered-threshold">
      <meshStandardMaterial map={maps[0]} normalMap={maps[1]} normalScale={new THREE.Vector2(.78,.78)} color="#595c51" emissive="#211a17" emissiveIntensity={.035} roughness={.98}/>
    </mesh>
    {stones.map((geometry,index)=>{
      const side=index%2?-1:1, course=Math.floor(index/2), crown=course>4
      const x=crown?(course-5)*.43-.43:side*(1.28+.08*Math.sin(index*1.7))
      const stoneY=crown?2.40-.12*Math.abs(course-6):.14+course*.42
      const z=-1.54-.10*(index%3)
      const scale=crown?.34:.38+.025*(index%4)
      return <mesh key={index} geometry={geometry} position={[x,stoneY,z]} rotation={[index*.21,index*.63,index*.09]} scale={[scale*(crown?1.18:1.04),scale*(crown?.62:.88),scale*.78]} castShadow receiveShadow>
        <meshStandardMaterial map={albedo} normalMap={maps[1]} color={index%3===0?'#777b6c':index%3===1?'#62695f':'#858173'} roughness={.97}/>
      </mesh>
    })}
    {Array.from({length:5},(_,index)=><mesh key={`step-${index}`} position={[-.04,-.08-index*.085,-1.18-index*.34]} rotation={[-.03,.10,0]} receiveShadow castShadow>
      <boxGeometry args={[1.42,.13,.38]}/><meshStandardMaterial map={albedo} normalMap={maps[1]} color={index%2?'#3f443e':'#4a4940'} roughness={.98}/>
    </mesh>)}
    {fissures.map((geometry,index)=><mesh key={`fissure-${index}`} geometry={geometry} position={[-.02,.01,-.72]} rotation={[0,.10,0]}>
      <meshStandardMaterial color="#b87552" emissive="#b54d25" emissiveIntensity={.88-index*.12} roughness={.62}/>
    </mesh>)}
    <pointLight position={[-.08, .62, -1.28]} color="#d58a63" intensity={2.15} distance={5.0}/>
    <pointLight position={[.48, 1.78, -1.12]} color="#7ea08f" intensity={.52} distance={4.4}/>
  </group>
}

function LifeMapSanctuary({ onLifeMap }: { onLifeMap: () => void }) {
  const y = height(LIFE_MAP.x, LIFE_MAP.z)
  const portalRoots = useMemo(() => [-1,1].flatMap(rawSide => Array.from({ length: 4 }, (_, tier) => {
    const side=rawSide as -1|1, depth=-.22-tier*.15
    return tube([
      new THREE.Vector3(side*(1.62+tier*.16),-.18,depth+.42),
      new THREE.Vector3(side*(1.38+tier*.13),.18,depth+.12),
      new THREE.Vector3(side*(1.20+tier*.10),.86+tier*.08,depth-.04),
      new THREE.Vector3(side*(.78+tier*.075),1.58+tier*.10,depth-.16),
      new THREE.Vector3(side*(.23+tier*.035),2.10+tier*.08,depth-.25),
      new THREE.Vector3(-side*(.20+tier*.025),2.25+tier*.045,depth-.31),
    ], .26-tier*.035, 14)
  })), [])
  const groundRoots = useMemo(() => [-1,1].flatMap(rawSide => Array.from({ length: 3 }, (_, index) => {
    const side=rawSide as -1|1
    return tube([
      new THREE.Vector3(side*(1.27+index*.13),.08,-.08-index*.08),
      new THREE.Vector3(side*(1.60+index*.28),-.02,.24+index*.08),
      new THREE.Vector3(side*(2.18+index*.38),-.13,.48+index*.13),
    ],.14-index*.018,11)
  })), [])
  const threads = useMemo(() => Array.from({ length: 15 }, (_, index) => {
    const a = index * .67 - 1.1
    const end = new THREE.Vector3(Math.cos(a) * (.32 + index * .026), Math.sin(a * 1.5) * .28, -.12 - Math.sin(a) * .16)
    return tube([new THREE.Vector3(0, 0, 0), end.clone().multiplyScalar(.48).add(new THREE.Vector3(0, .08, -.02)), end], .009+(index%3)*.0015, 7)
  }), [])
  const memoryContours = useMemo(() => [
    memoryLoop(.36,-.06,.3,.011), memoryLoop(.55,-.10,1.7,.008), memoryLoop(.74,-.14,2.6,.006),
  ], [])
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
  useEffect(() => () => { portalRoots.forEach(geometry => geometry.dispose()); groundRoots.forEach(geometry => geometry.dispose()); threads.forEach(geometry => geometry.dispose()); memoryContours.forEach(geometry => geometry.dispose()); stars.dispose() }, [groundRoots,memoryContours,portalRoots,threads,stars])
  return <group position={[LIFE_MAP.x, y + .02, LIFE_MAP.z]} rotation={[0, .08, 0]} name="home-v226-life-map-lineage-observatory" onClick={(event) => { event.stopPropagation(); onLifeMap() }}>
    <group name="home-v228-life-map-rooted-branching-threshold" userData={{ artRevision:'home-v230-life-map-asymmetric-root-threshold' }}>
      {portalRoots.map((geometry,index)=><mesh key={index} geometry={geometry} castShadow receiveShadow><meshStandardMaterial map={portalMaps[0]} normalMap={portalMaps[1]} normalScale={new THREE.Vector2(.82,.82)} color={index%2?'#5f756b':'#756a76'} emissive={index%2?'#193930':'#302239'} emissiveIntensity={.08} roughness={.88}/></mesh>)}
      {groundRoots.map((geometry,index)=><mesh key={`root-${index}`} geometry={geometry} castShadow receiveShadow><meshStandardMaterial map={portalMaps[0]} normalMap={portalMaps[1]} color={index%2?'#52685f':'#665b68'} roughness={.94}/></mesh>)}
    </group>
    <mesh position={[0,1.18,-.58]} scale={[1.10,1.40,1]} name="home-life-map-deep-celestial-aperture">
      <circleGeometry args={[1,64]}/><meshPhysicalMaterial color="#102927" emissive="#163c36" emissiveIntensity={.34} transparent opacity={.82} roughness={.38} clearcoat={.22} depthWrite={false}/>
    </mesh>
    <group position={[0, 1.25, -.42]} scale={[1.02,1.12,1.02]} name="home-v226-life-map-contained-memory-field">
      <points geometry={stars} position={[0,0,.04]}><shaderMaterial transparent depthWrite={false} uniforms={{uColor:{value:new THREE.Color('#b7d8cd')}}} vertexShader={`void main(){ vec4 mv=modelViewMatrix*vec4(position,1.0); gl_Position=projectionMatrix*mv; gl_PointSize=clamp(8.0/max(1.0,-mv.z),1.2,3.5); }`} fragmentShader={`uniform vec3 uColor; void main(){ float r=length(gl_PointCoord-.5)*2.0; if(r>1.0) discard; gl_FragColor=vec4(uColor,pow(1.0-r,1.7)*.68);
 #include <colorspace_fragment>
 }`}/></points>
      {threads.map((geometry, index) => <mesh key={index} geometry={geometry}><meshStandardMaterial color={index % 2 ? '#91bdae' : '#b9a6c3'} emissive={index % 2 ? '#355d50' : '#55455e'} emissiveIntensity={.72} roughness={.52}/></mesh>)}
      {memoryContours.map((geometry,index)=><mesh key={`contour-${index}`} geometry={geometry} rotation={[.08,index*.32,.05-index*.04]}><meshStandardMaterial color={index%2?'#b4a0c2':'#9ac6b6'} emissive={index%2?'#624f70':'#416e60'} emissiveIntensity={.54} roughness={.48}/></mesh>)}
      {[[.33,.38,.12],[-.46,.12,.08],[.18,-.34,.10],[-.18,.62,.07]].map(([x,z,s],index)=><mesh key={`memory-${index}`} position={[x,z,.16-index*.04]} scale={[s*.80,s*1.24,s*.68]} rotation={[index*.18,index*.41,index*.12]}><sphereGeometry args={[1,24,18]}/><meshPhysicalMaterial color={index%2?'#cbb7d6':'#b9d8cc'} emissive={index%2?'#725d82':'#4e7e6e'} emissiveIntensity={.78} roughness={.32} clearcoat={.28}/></mesh>)}
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
  }), .012 + (index % 3) * .0025, 8)
}

type Posture = { s: V3; r: V3; speed: number }
const posture: Record<OrbState, Posture> = {
  dormant:{s:[.92,.90,.91],r:[.03,-.06,-.03],speed:.10},idle:{s:[1,.99,.98],r:[-.03,.05,-.02],speed:.30},attention:{s:[1.035,1.04,.97],r:[-.08,.12,.04],speed:.62},listening:{s:[.98,1.03,.98],r:[.06,-.06,-.03],speed:.22},thinking:{s:[1.02,.99,1.01],r:[-.09,.14,.06],speed:.18},speaking:{s:[1.04,1.03,.97],r:[.03,-.02,-.06],speed:.80},guiding:{s:[.99,1.04,.97],r:[-.10,.02,.07],speed:.42},reflecting:{s:[.99,.98,1.02],r:[.08,.08,-.05],speed:.14},calming:{s:[1.01,.98,.99],r:[-.02,-.04,.02],speed:.12},privacy:{s:[.92,.92,.91],r:[.10,.08,.08],speed:.08},warning:{s:[1.04,1.04,.96],r:[-.11,-.06,-.08],speed:.95},transition:{s:[.96,1.05,.95],r:[-.11,.04,.08],speed:.65},
}

const ORB_BASE_SCALE = 1.48

const orbPalette: Record<OrbState,{shell:string;emissive:string;nerve:string;core:string;light:string;contours:number}> = {
  dormant:{shell:'#344b47',emissive:'#102421',nerve:'#50645e',core:'#6f786d',light:'#82978d',contours:1},
  idle:{shell:'#527a70',emissive:'#153e37',nerve:'#a99a80',core:'#d0a47f',light:'#d5a185',contours:2},
  attention:{shell:'#628a7d',emissive:'#245c4d',nerve:'#d4aa78',core:'#edb77e',light:'#efbb82',contours:3},
  listening:{shell:'#4f766f',emissive:'#174b45',nerve:'#8fcab7',core:'#8ed4bd',light:'#8ed7c0',contours:2},
  thinking:{shell:'#566d80',emissive:'#283b60',nerve:'#bea6ce',core:'#b79bd0',light:'#b69bd2',contours:4},
  speaking:{shell:'#6d776d',emissive:'#4c422d',nerve:'#e1ba7e',core:'#f0bd70',light:'#efbd72',contours:3},
  guiding:{shell:'#557b6e',emissive:'#1b5141',nerve:'#c8d09c',core:'#b9d981',light:'#c0dc87',contours:3},
  reflecting:{shell:'#5f6978',emissive:'#35334f',nerve:'#bea9c8',core:'#c1a9d0',light:'#bca5ce',contours:4},
  calming:{shell:'#587a72',emissive:'#244842',nerve:'#9bc2b7',core:'#9bc8bb',light:'#a1cbbf',contours:2},
  privacy:{shell:'#3c5c68',emissive:'#173b4a',nerve:'#93b8c9',core:'#6aa1b9',light:'#7fb3c6',contours:4},
  warning:{shell:'#78584d',emissive:'#6c2b20',nerve:'#efa06e',core:'#f06d48',light:'#e87456',contours:5},
  transition:{shell:'#5d6c72',emissive:'#354057',nerve:'#c4b5d0',core:'#bea4d0',light:'#baa3cb',contours:3},
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
  const initialPose = useRef(posture[state]).current
  const body = useMemo(organicOrbGeometry, [])
  const innerBody = useMemo(organicOrbGeometry, [])
  const surfaceVeins = useMemo(() => Array.from({ length: 9 }, (_, index) => vein(index)), [])
  const contours = useMemo(() => [memoryLoop(.28,.02,.2,.012),memoryLoop(.42,.01,1.4,.010),memoryLoop(.56,-.01,2.2,.008),memoryLoop(.68,-.02,3.1,.006),memoryLoop(.78,-.04,4.0,.005)], [])
  useEffect(() => () => { body.dispose(); innerBody.dispose(); surfaceVeins.forEach(geometry=>geometry.dispose()); contours.forEach(geometry=>geometry.dispose()) }, [body,contours,innerBody,surfaceVeins])
  const coreMaterial = useMemo(() => {
    const created = createLivingMemoryMaterial(false)
    created.material.color.set('#527a70')
    created.material.opacity = .88
    created.material.depthWrite = true
    created.material.roughness = .48
    created.material.metalness = 0
    created.material.clearcoat = .18
    created.material.clearcoatRoughness = .54
    created.material.sheen = .42
    created.material.emissive.set('#173b35')
    created.material.emissiveIntensity = .085
    return created
  }, [])
  const branches = useMemo(() => Array.from({ length: 9 }, (_, index) => presenceBranch(index)), [])
  useEffect(() => {
    const material = coreMaterial.material
    const palette=orbPalette[state]
    material.color.set(palette.shell)
    material.emissive.set(palette.emissive)
    material.emissiveIntensity = state === 'warning' ? .20 : state === 'privacy' ? .15 : state === 'dormant' ? .018 : .085
  }, [coreMaterial, state])
  useEffect(() => () => coreMaterial.material.dispose(), [coreMaterial])
  useEffect(() => () => branches.forEach(geometry => geometry.dispose()), [branches])
  const pose = posture[state]
  const y = height(ORB.x, ORB.z)
  useFrame(({ clock }, delta) => {
    if (!root.current) return
    const t = clock.elapsedTime * pose.speed, breath = reducedMotion ? 1 : 1 + Math.sin(t * .78) * .006
    const blend = reducedMotion ? 1 : 1 - Math.exp(-6 * Math.min(Math.max(delta, 0), .1))
    root.current.scale.set(
      THREE.MathUtils.lerp(root.current.scale.x, pose.s[0] * breath * ORB_BASE_SCALE, blend),
      THREE.MathUtils.lerp(root.current.scale.y, pose.s[1] * breath * ORB_BASE_SCALE, blend),
      THREE.MathUtils.lerp(root.current.scale.z, pose.s[2] * breath * ORB_BASE_SCALE, blend),
    )
    root.current.rotation.set(
      THREE.MathUtils.lerp(root.current.rotation.x, pose.r[0], blend),
      THREE.MathUtils.lerp(root.current.rotation.y, pose.r[1] + (reducedMotion ? 0 : Math.sin(t * .70) * .014), blend),
      THREE.MathUtils.lerp(root.current.rotation.z, pose.r[2], blend),
    )
  })
  useFrame(({ clock }) => { coreMaterial.time.value = reducedMotion ? 0 : clock.elapsedTime })
  const palette=orbPalette[state]
  const activate = (event: ThreeEvent<MouseEvent>) => { event.stopPropagation(); onOrb() }
  return <group ref={root} position={[ORB.x, y + 1.02, ORB.z]} rotation={initialPose.r} scale={[initialPose.s[0] * ORB_BASE_SCALE, initialPose.s[1] * ORB_BASE_SCALE, initialPose.s[2] * ORB_BASE_SCALE]} name="home-v226-rooted-single-living-memory-presence" onClick={activate}>
    <group name="home-v227-branching-memory-nervature">
      <group name="home-v229-matter-anchored-branching-nervature" userData={{ artRevision:'home-v230-surface-bound-memory-nervature', silhouette:'anchored-not-jellyfish-tendril-halo' }}>
        {branches.map((geometry, index) => <mesh key={index} geometry={geometry} position={[index % 2 ? -.10 : .08, -.03 + (index % 3) * .025, -.09 + (index % 4) * .018]} rotation={[.10 - index * .012, index % 2 ? -.32 : .28, index % 3 ? .08 : -.10]} scale={[.58 + (index % 3) * .035, .46 + (index % 2) * .03, .50]} castShadow receiveShadow>
          <meshStandardMaterial color={index%2?palette.nerve:palette.shell} emissive={palette.emissive} emissiveIntensity={state==='warning'?.24:.14} roughness={.76} metalness={0}/>
        </mesh>)}
      </group>
    </group>
    <group name="home-v227-split-asymmetric-memory-bloom">
      <mesh geometry={innerBody} position={[-.01,.08,-.08]} rotation={[.03,-.26,.14]} scale={[.56,.77,.51]} castShadow>
        <meshPhysicalMaterial color={palette.core} emissive={palette.core} emissiveIntensity={state==='dormant'?.12:.54} roughness={.31} clearcoat={.34}/>
      </mesh>
      <mesh geometry={body} position={[-.03,.08,.01]} rotation={[.08,-.42,.18]} scale={[.84,1.08,.78]} castShadow receiveShadow><primitive object={coreMaterial.material} attach="material"/></mesh>
      <mesh geometry={body} position={[.14,.13,-.20]} rotation={[-.12,.58,-.24]} scale={[.22,.32,.20]} castShadow><meshStandardMaterial color={palette.nerve} emissive={palette.emissive} emissiveIntensity={.25} roughness={.68}/></mesh>
      <group position={[-.03,.08,.36]} rotation={[0,0,.06]} scale={[.90,1.02,.58]} name="home-v226-physically-integrated-surface-nervature">
        {surfaceVeins.map((geometry,index)=><mesh key={index} geometry={geometry} rotation={[0,0,(index-4)*.055]}><meshStandardMaterial color={index%3===0?palette.core:palette.nerve} emissive={palette.emissive} emissiveIntensity={state==='dormant'?.10:.54} roughness={.48}/></mesh>)}
      </group>
      <group position={[-.03,.06,.43]} scale={[.82,.96,.58]} rotation={[0,0,state==='guiding'?.20:state==='warning'?-.18:.04]} name={`home-orb-${state}-static-signature`}>
        {contours.slice(0,palette.contours).map((geometry,index)=><mesh key={index} geometry={geometry} rotation={[.04,index*.24,.03*index]} scale={state==='privacy'?[.84,.96,1]:state==='warning'?[1.04,.90,1]:[1,1,1]}><meshStandardMaterial color={palette.nerve} emissive={palette.core} emissiveIntensity={.34+index*.06} transparent opacity={.42-index*.045} roughness={.36} depthWrite={false}/></mesh>)}
      </group>
    </group>
    <mesh scale={[.72,1.14,.76]} onClick={activate}><sphereGeometry args={[1,20,16]}/><meshBasicMaterial transparent opacity={0} depthWrite={false}/></mesh>
    <pointLight position={[.08,.04,.34]} color={palette.light} intensity={state === 'dormant' ? .10 : state==='warning' ? 1.18 : .72} distance={state==='warning'?4.6:3.8}/>
    <pointLight position={[-.26,.58,-.12]} color={palette.core} intensity={state==='dormant'?.04:.22} distance={2.6}/>
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
    {/* One continuous walkable surface carries the valley; seated terrace shoulders
        add macro erosion without becoming a second collision floor. */}
    <TexturedMemoryTerrain/>
    <WeatheredMemoryBanks/>
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
