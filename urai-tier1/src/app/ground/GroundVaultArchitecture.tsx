'use client'

import { useEffect, useMemo, useRef } from 'react'
import { Html, useGLTF, useTexture } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { T } from '@/spatial/layout/HomeWorldProductionV223Geometry'
import { DESTINATIONS, type GroundDestination } from './GroundWorldModel'

function seeded(seed: number, salt: number) {
  const value = Math.sin(seed * 83.17 + salt * 19.31) * 43758.5453
  return value - Math.floor(value)
}

// One weathered, drifting vault rather than a perfectly repeated barrel tunnel.
function vaultSurface(width: number, rise: number, length: number, columns = 80, bays = 40, seed = 17) {
  const positions: number[] = [], uv: number[] = [], indices: number[] = [], colors: number[] = []
  const tint = new THREE.Color()
  for (let j = 0; j <= bays; j++) for (let i = 0; i <= columns; i++) {
    const t = j / bays
    const a = i / columns * Math.PI
    const z = t * length
    const lateral = Math.cos(a)
    const centerDrift = Math.sin(z * .071 + seed) * .52 + Math.sin(z * .173 - seed * .3) * .16
    const widthDrift = 1 + .038 * Math.sin(z * .113 + seed * .7) + .018 * Math.sin(z * .37)
    const riseDrift = 1 + .045 * Math.sin(z * .083 - seed * .22)
    const asymmetry = 1 + lateral * .026 * Math.sin(z * .19 + seed)
    const ripple = (.065 * Math.sin(a * 9 + z * .16) + .028 * Math.sin(a * 17 - z * .11)) * Math.sin(a)
    const x = centerDrift + lateral * (width * widthDrift * asymmetry + ripple)
    const y = Math.sin(a) * rise * riseDrift - .09 + .035 * Math.sin(z * .29 + a * 5)
    positions.push(x, y, -z)
    uv.push(a * width / 5.4 + .025 * Math.sin(z * .13), z / 5.2)
    const shade = .56 + .10 * Math.sin(z * .095 + a * 2.4) + .035 * Math.sin(z * .42 - a * 7)
    tint.setRGB(shade * .77, shade * .86, shade * .80)
    colors.push(tint.r, tint.g, tint.b)
  }
  for (let j = 0; j < bays; j++) for (let i = 0; i < columns; i++) {
    const a = j * (columns + 1) + i, b = a + columns + 1
    indices.push(a, b, a + 1, b, b + 1, a + 1)
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}

const CHAMBER_PROFILE: Record<GroundDestination['chamberForm'], { width: number; rise: number; shoulder: number; crown: number; depth: number }> = {
  pavilion: { width: 2.62, rise: 1.82, shoulder: .72, crown: .72, depth: 4.2 },
  sanctuary: { width: 1.38, rise: 3.72, shoulder: .46, crown: 1.32, depth: 5.0 },
  council: { width: 2.86, rise: 2.28, shoulder: 1.08, crown: .62, depth: 4.5 },
  transit: { width: 1.26, rise: 3.62, shoulder: .42, crown: 1.42, depth: 5.1 },
  restorative: { width: 2.36, rise: 1.88, shoulder: 1.02, crown: .60, depth: 3.8 },
  archive: { width: 1.62, rise: 3.16, shoulder: .56, crown: 1.14, depth: 5.0 },
  reflection: { width: 2.22, rise: 2.48, shoulder: .84, crown: .84, depth: 4.2 },
  vault: { width: 1.78, rise: 2.92, shoulder: .62, crown: 1.16, depth: 5.2 },
  observatory: { width: 2.48, rise: 2.68, shoulder: .96, crown: .88, depth: 4.1 },
  aperture: { width: 1.18, rise: 3.82, shoulder: .38, crown: 1.48, depth: 5.4 },
  theater: { width: 2.88, rise: 1.96, shoulder: 1.12, crown: .56, depth: 4.4 },
}

function chamberArch(destination: GroundDestination, index: number) {
  const profile = CHAMBER_PROFILE[destination.chamberForm]
  const width = profile.width, rise = profile.rise
  const shape = new THREE.Shape()
  shape.moveTo(-width - .46, 0)
  for (let i = 0; i <= 72; i++) {
    const a = Math.PI - i / 72 * Math.PI
    const shoulder = Math.sign(Math.cos(a)) * Math.pow(Math.abs(Math.cos(a)), profile.shoulder)
    const crown = Math.pow(Math.sin(a), profile.crown)
    const strata = (Math.sin(a * (4 + index % 5) + index) * .075 + Math.sin(a * 11 - index) * .025) * Math.sin(a)
    shape.lineTo(shoulder * (width + .46 + strata), .54 + crown * (rise + .42) + strata * .32)
  }
  shape.lineTo(width + .34, 0); shape.lineTo(width, 0)
  for (let i = 0; i <= 72; i++) {
    const a = i / 72 * Math.PI
    const shoulder = Math.sign(Math.cos(a)) * Math.pow(Math.abs(Math.cos(a)), profile.shoulder)
    const crown = Math.pow(Math.sin(a), profile.crown)
    const weather = Math.sin(a * 7 + index * .8) * .035 * Math.sin(a)
    shape.lineTo(shoulder * width + weather, .54 + crown * rise + weather * .4)
  }
  shape.lineTo(-width, 0); shape.closePath()
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: profile.depth, bevelEnabled: true, bevelSegments: 5, steps: 2, bevelSize: .15, bevelThickness: .13, curveSegments: 42 })
  const positions = geometry.getAttribute('position') as THREE.BufferAttribute
  for (let vertex = 0; vertex < positions.count; vertex++) {
    const x = positions.getX(vertex), y = positions.getY(vertex), z = positions.getZ(vertex)
    const erosion = .018 * Math.sin(x * 7.1 + y * 5.3 + index) + .009 * Math.sin(z * 9.4 - y * 3.1)
    positions.setXYZ(vertex, x + erosion, y + erosion * .7, z + erosion * .45)
  }
  geometry.computeVertexNormals()
  return geometry
}

function carvedWingGeometry(index: number, side: number) {
  const shape = new THREE.Shape()
  const lean = side * (.08 + seeded(index, 2) * .12)
  shape.moveTo(-.54, 0)
  shape.lineTo(.62, 0)
  shape.bezierCurveTo(.72 + lean, .65, .55 + lean, 1.55, .28 + lean, 2.22 + seeded(index, 3) * .65)
  shape.bezierCurveTo(-.05 + lean, 2.68, -.42, 2.34, -.58, 1.76)
  shape.lineTo(-.54, 0)
  shape.closePath()
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: 4.8 + seeded(index, 5) * 1.2, steps: 2, bevelEnabled: true, bevelSegments: 3, bevelSize: .09, bevelThickness: .08, curveSegments: 24 })
  geometry.rotateY(side * (.04 + seeded(index, 7) * .06))
  return geometry
}

function thresholdPathGeometry(index: number, width: number, depth: number) {
  const segments = 16
  const positions: number[] = [], indices: number[] = [], colors: number[] = []
  const dark = new THREE.Color('#384942'), light = new THREE.Color('#657269')
  for (let step = 0; step <= segments; step++) {
    const t = step / segments
    const z = .45 - t * depth
    const center = Math.sin(t * 4.2 + index) * .12 * t
    const half = THREE.MathUtils.lerp(width * .76, width * .48, t) * (1 + .055 * Math.sin(step * 1.7 + index))
    const y = .008 + .014 * Math.sin(step * 1.31 + index)
    positions.push(center - half, y, z, center + half, y + .002, z)
    const color = dark.clone().lerp(light, .22 + .24 * Math.sin(t * Math.PI))
    colors.push(color.r, color.g, color.b, color.r, color.g, color.b)
    if (step < segments) {
      const a = step * 2, b = a + 1, c = a + 2, d = a + 3
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

function weatheredFloorGeometry() {
  const geometry = new THREE.PlaneGeometry(32, 54, 32, 54)
  const position = geometry.getAttribute('position') as THREE.BufferAttribute
  const uv = geometry.getAttribute('uv') as THREE.BufferAttribute
  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i), y = position.getY(i)
    const wear = .018 * Math.sin(x * .62 + y * .31) + .009 * Math.sin(x * 1.7 - y * .83)
    position.setZ(i, wear)
    uv.setXY(i, uv.getX(i) * 4.8 + .018 * Math.sin(y * .12), uv.getY(i) * 8.2)
  }
  geometry.computeVertexNormals()
  return geometry
}

function GroundSconce({ index }: { index: number }) {
  const asset = useGLTF('/assets/urai/home-production/cc0/polyhaven-v48/industrial_caged_sconce/asset.gltf')
  const fixture = useMemo(() => {
    const source = asset.scene.getObjectByName('industrial_caged_sconce_a')
    if (!source) throw new Error('Governed Ground sconce mesh is missing')
    const copy = source.clone(true)
    copy.position.set(0, 0, 0)
    return copy
  }, [asset.scene])
  const x = -1.72 - (index % 3) * .11
  return <group position={[x, 1.46 + (index % 2) * .18, -.44]} scale={1.18} name="ground-governed-caged-wall-sconce">
    <primitive object={fixture} />
    <mesh position={[0, .075, .11]}><cylinderGeometry args={[.025,.025,.19,12]} /><meshStandardMaterial color="#f7e7c2" emissive="#f2d2a0" emissiveIntensity={1.1} /></mesh>
  </group>
}

function StoneSeat({ position, rotation = 0 }: { position: [number, number, number]; rotation?: number }) {
  return <group position={position} rotation={[0, rotation, 0]}>
    <mesh position={[0,.36,0]} castShadow receiveShadow><cylinderGeometry args={[.42,.48,.16,16]}/><meshStandardMaterial color="#58675f" roughness={.9}/></mesh>
    <mesh position={[0,.16,0]} castShadow receiveShadow><cylinderGeometry args={[.22,.30,.32,14]}/><meshStandardMaterial color="#344a44" roughness={.84}/></mesh>
  </group>
}

function ChamberFurnishing({ form, maps }: { form: GroundDestination['chamberForm']; maps: THREE.Texture[] }) {
  const desk = useMemo(() => {
    const shape = new THREE.Shape()
    shape.moveTo(-1.15, -.30)
    shape.bezierCurveTo(-.62, -.68, .62, -.68, 1.15, -.30)
    shape.lineTo(1.15, .18)
    shape.bezierCurveTo(.62, -.10, -.62, -.10, -1.15, .18)
    shape.closePath()
    return new THREE.ExtrudeGeometry(shape, { depth: .14, bevelEnabled: true, bevelSegments: 3, bevelSize: .055, bevelThickness: .035, steps: 1, curveSegments: 36 })
  }, [])
  const pedestal = useMemo(() => new THREE.LatheGeometry([[.22,0],[.26,.05],[.18,.12],[.12,.66],[.22,.72]].map(([x,y])=>new THREE.Vector2(x,y)),32),[])
  useEffect(() => () => { desk.dispose(); pedestal.dispose() },[desk,pedestal])

  if (form === 'sanctuary') return <group position={[0,0,-4.8]} name="ground-authored-sanctuary-interior">
    {Array.from({length:7},(_,i)=><mesh key={i} position={[-.84+i*.28,1.15,-.52-Math.abs(3-i)*.06]} rotation={[0,0,.045*Math.sin(i*1.7)]} castShadow>
      <cylinderGeometry args={[.018,.045,2.15-(Math.abs(3-i)*.11),12]}/><meshStandardMaterial color="#7c988b" emissive="#486a60" emissiveIntensity={.08} metalness={.16} roughness={.7}/>
    </mesh>)}
    <mesh position={[0,.74,.08]} rotation={[-Math.PI/2,0,0]} castShadow receiveShadow geometry={desk}><meshStandardMaterial map={maps[0]} normalMap={maps[1]} color="#687970" roughness={.82}/></mesh>
  </group>

  if (form === 'council') return <group position={[0,0,-4.45]} name="ground-authored-council-interior">
    <mesh geometry={desk} position={[0,.82,0]} rotation={[-Math.PI/2,0,0]} scale={[1.36,1.9,1]} castShadow receiveShadow><meshStandardMaterial map={maps[0]} normalMap={maps[1]} color="#8b816d" roughness={.72}/></mesh>
    {Array.from({length:5},(_,i)=>{const a=-1.75+i*.88;return <StoneSeat key={i} position={[Math.sin(a)*1.32,.02,Math.cos(a)*.86+.55]} rotation={-a}/>})}
  </group>

  if (form === 'pavilion') return <group position={[0,0,-4.15]} name="ground-authored-reception-interior">
    <mesh geometry={desk} position={[-.18,.82,0]} rotation={[-Math.PI/2,0,-.05]} scale={[1.15,1.62,1]} castShadow receiveShadow><meshStandardMaterial map={maps[0]} normalMap={maps[1]} color="#9b8667" roughness={.68}/></mesh>
    <mesh geometry={pedestal} position={[-.95,.04,-.08]} castShadow receiveShadow><meshStandardMaterial color="#2f4d47" metalness={.3} roughness={.5}/></mesh>
    <mesh position={[1.08,.72,-.35]} rotation={[0,-.18,0]} castShadow receiveShadow><boxGeometry args={[.58,1.15,.16]}/><meshStandardMaterial color="#52665d" roughness={.86}/></mesh>
  </group>

  return <group position={[0,0,-4.35]} name={`ground-authored-${form}-interior`}>
    <StoneSeat position={[-.7,.02,.15]} rotation={.25}/><StoneSeat position={[.65,.02,-.2]} rotation={-.35}/>
    <mesh geometry={pedestal} position={[0,.04,-.82]} scale={[.82,.82,.82]} castShadow receiveShadow><meshStandardMaterial color="#334a45" metalness={.22} roughness={.62}/></mesh>
  </group>
}

export default function GroundVaultArchitecture({ activeId, onSelect, onReady }: {
  activeId: string | null
  onReady: () => void
  onSelect: (destination: GroundDestination) => void
}) {
  const { size } = useThree()
  const portrait = size.height > size.width * 1.08
  const renderedFrames = useRef(0)
  useFrame(({ gl }) => {
    if (renderedFrames.current < 2 && gl.info.render.calls > 0) {
      renderedFrames.current++
      if (renderedFrames.current === 2) onReady()
    }
  })
  const originals = useTexture(T as unknown as string[]) as THREE.Texture[]
  const maps = useMemo(() => originals.map((source, index) => {
    const texture = source.clone()
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping
    texture.colorSpace = index === 0 ? THREE.SRGBColorSpace : THREE.NoColorSpace
    texture.anisotropy = 4
    texture.repeat.set(index === 0 ? .86 : 1.08, index === 0 ? .86 : 1.08)
    texture.needsUpdate = true
    return texture
  }), [originals])
  const shell = useMemo(() => vaultSurface(16, 10, 54, 84, 44, 23), [])
  const endWall = useMemo(() => {
    const outline = new THREE.Shape()
    outline.moveTo(-16, 0)
    for (let i = 0; i <= 80; i++) {
      const angle = Math.PI - i / 80 * Math.PI
      outline.lineTo(Math.cos(angle) * 16, Math.sin(angle) * 10 - .09)
    }
    outline.closePath()
    return new THREE.ShapeGeometry(outline, 80)
  }, [])
  const arches = useMemo(() => DESTINATIONS.map((destination, index) => chamberArch(destination, index)), [])
  const chamberRoofs = useMemo(() => DESTINATIONS.map((destination, index) => {
    const profile = CHAMBER_PROFILE[destination.chamberForm]
    return vaultSurface(profile.width + .34, profile.rise + .38, profile.depth + 3.6, 48, 14, 70 + index)
  }), [])
  const leftWings = useMemo(() => DESTINATIONS.map((_, index) => carvedWingGeometry(index, -1)), [])
  const rightWings = useMemo(() => DESTINATIONS.map((_, index) => carvedWingGeometry(index, 1)), [])
  const paths = useMemo(() => DESTINATIONS.map((destination, index) => {
    const profile = CHAMBER_PROFILE[destination.chamberForm]
    return thresholdPathGeometry(index, Math.min(1.45, profile.width * .72), profile.depth + 2.3)
  }), [])
  const floor = useMemo(weatheredFloorGeometry, [])
  useEffect(() => () => {
    shell.dispose(); endWall.dispose(); floor.dispose()
    arches.forEach(g => g.dispose()); chamberRoofs.forEach(g => g.dispose())
    leftWings.forEach(g => g.dispose()); rightWings.forEach(g => g.dispose()); paths.forEach(g => g.dispose())
    maps.forEach(t => t.dispose())
  }, [shell, endWall, floor, arches, chamberRoofs, leftWings, rightWings, paths, maps])

  return <group name="ground-authored-walkable-vault-and-chambers" userData={{ artRevision:'v235-weathered-asymmetric-institutional-ground' }}>
    <mesh geometry={shell} position={[0, 0, 13]} receiveShadow>
      <meshStandardMaterial map={maps[0]} normalMap={maps[1]} roughnessMap={maps[2]} vertexColors normalScale={new THREE.Vector2(.42, .42)} color="#708078" roughness={.94} side={THREE.DoubleSide} />
    </mesh>
    <mesh geometry={endWall} position={[0, 0, -41]} receiveShadow>
      <meshStandardMaterial color="#425750" roughness={.98} side={THREE.DoubleSide} />
    </mesh>
    <mesh geometry={floor} position={[0, -.09, -14]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <meshStandardMaterial map={maps[0]} normalMap={maps[1]} roughnessMap={maps[2]} color="#676b62" normalScale={new THREE.Vector2(.26, .26)} roughness={.84} metalness={.025} />
    </mesh>
    {DESTINATIONS.map((destination, index) => {
      const [x, , z] = destination.position
      const profile = CHAMBER_PROFILE[destination.chamberForm]
      const facing = x < -4 ? .44 + (index % 2) * .035 : x > 4 ? -.44 - (index % 2) * .035 : (index % 2 ? -.035 : .035)
      const active = activeId === destination.id
      const warm = destination.chamberForm === 'pavilion' || destination.chamberForm === 'council'
      const stoneColor = warm ? '#8d816a' : destination.chamberForm === 'sanctuary' ? '#627a71' : index % 2 ? '#657870' : '#756f63'
      return <group key={destination.id} position={[x, 0, z]} rotation={[0, facing, 0]} name={`ground-enterable-threshold-${destination.id}`} userData={{ destinationHref: destination.href, artRevision:'v235-carved-distinct-chamber' }} onClick={event => { event.stopPropagation(); onSelect(destination) }}>
        {(active || (!portrait && index < 3)) && <Html center position={[0, profile.rise + 1.22, -1.65]} distanceFactor={portrait ? 28 : 24} style={{ pointerEvents: 'none' }}>
          <div style={{ whiteSpace: 'nowrap', color: '#e9f4ed', font: '650 12px/1.3 system-ui', letterSpacing: '.055em', textShadow: '0 2px 9px #071210', padding: '4px 8px', background: 'linear-gradient(135deg,rgba(8,23,23,.78),rgba(8,23,23,.34))', border: '1px solid rgba(222,244,235,.12)', borderRadius: 999 }}>{destination.label}</div>
        </Html>}
        <GroundSconce index={index} />
        <ChamberFurnishing form={destination.chamberForm} maps={maps} />
        <mesh geometry={arches[index]} position={[0, 0, -3.15]} receiveShadow castShadow>
          <meshStandardMaterial map={maps[0]} normalMap={maps[1]} roughnessMap={maps[2]} color={stoneColor} roughness={.9} normalScale={new THREE.Vector2(.32, .32)} />
        </mesh>
        <mesh geometry={chamberRoofs[index]} position={[0, .76, -.55]} receiveShadow castShadow>
          <meshStandardMaterial map={maps[0]} normalMap={maps[1]} vertexColors color={stoneColor} roughness={.94} side={THREE.DoubleSide} />
        </mesh>
        <mesh geometry={leftWings[index]} position={[-profile.width-.64, .02, -2.8]} receiveShadow castShadow>
          <meshStandardMaterial map={maps[0]} normalMap={maps[1]} color={index % 2 ? '#65736a' : '#746e60'} roughness={.95}/>
        </mesh>
        <mesh geometry={rightWings[index]} position={[profile.width+.64, .02, -2.7]} rotation={[0,Math.PI,0]} receiveShadow castShadow>
          <meshStandardMaterial map={maps[0]} normalMap={maps[1]} color={index % 2 ? '#596d65' : '#6e695d'} roughness={.95}/>
        </mesh>
        <mesh geometry={paths[index]} position={[0,.01,-.72]} receiveShadow>
          <meshStandardMaterial vertexColors color="#718078" roughness={.96} polygonOffset polygonOffsetFactor={-1}/>
        </mesh>
        <pointLight position={[-1.65 - (index % 3) * .10, 1.55, -.28]} color={warm ? '#efd0a0' : '#9cc8bd'} intensity={active ? 7.2 : 2.0} distance={active ? 7.4 : 5.0} decay={2} />
        <pointLight position={[.35, profile.rise * .58, -profile.depth - 2.3]} color={destination.color} intensity={active ? 2.6 : .72} distance={5.8} decay={2}/>
      </group>
    })}
    <hemisphereLight args={['#c3d3c8', '#22342e', .36]} />
    <pointLight position={[-4.4, 6.5, 2]} intensity={24} distance={26} decay={2} color="#e9c99f" />
    <pointLight position={[6.8, 5.8, -18]} intensity={15} distance={22} decay={2} color="#7fa9a7" />
  </group>
}
