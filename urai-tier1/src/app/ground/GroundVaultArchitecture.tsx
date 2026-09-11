'use client'

import { useEffect, useMemo, useRef } from 'react'
import { Html, useGLTF, useTexture } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { T } from '@/spatial/layout/HomeWorldProductionV223Geometry'
import { DESTINATIONS, type GroundDestination } from './GroundWorldModel'

// The vault is a continuous surface, not a backdrop or a row of freestanding pipes.
function vaultSurface(width: number, rise: number, length: number, columns = 80, bays = 40) {
  const positions: number[] = [], uv: number[] = [], indices: number[] = []
  for (let j = 0; j <= bays; j++) for (let i = 0; i <= columns; i++) {
    const a = i / columns * Math.PI, z = j / bays * length
    const ripple = .055 * Math.sin(a * 11 + z * .16) * Math.sin(a)
    positions.push(Math.cos(a) * (width + ripple), Math.sin(a) * rise - .09, -z)
    uv.push(a * width / 4, z / 4)
  }
  for (let j = 0; j < bays; j++) for (let i = 0; i < columns; i++) {
    const a = j * (columns + 1) + i, b = a + columns + 1
    indices.push(a, b, a + 1, b, b + 1, a + 1)
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}

const CHAMBER_PROFILE: Record<GroundDestination['chamberForm'], { width: number; rise: number; shoulder: number; crown: number; depth: number }> = {
  pavilion: { width: 2.02, rise: 2.22, shoulder: .82, crown: .92, depth: 3.4 },
  sanctuary: { width: 1.48, rise: 3.15, shoulder: .58, crown: 1.15, depth: 4.1 },
  council: { width: 2.34, rise: 2.12, shoulder: .92, crown: .78, depth: 3.8 },
  transit: { width: 1.34, rise: 3.42, shoulder: .48, crown: 1.28, depth: 4.5 },
  restorative: { width: 2.16, rise: 1.96, shoulder: .96, crown: .68, depth: 3.25 },
  archive: { width: 1.55, rise: 3.02, shoulder: .62, crown: 1.02, depth: 4.3 },
  reflection: { width: 2.12, rise: 2.38, shoulder: .86, crown: .82, depth: 3.45 },
  vault: { width: 1.72, rise: 2.78, shoulder: .68, crown: 1.06, depth: 4.6 },
  observatory: { width: 2.26, rise: 2.54, shoulder: .9, crown: .96, depth: 3.55 },
  aperture: { width: 1.26, rise: 3.55, shoulder: .44, crown: 1.34, depth: 4.8 },
  theater: { width: 2.48, rise: 2.0, shoulder: 1, crown: .72, depth: 3.7 },
}

function chamberArch(destination: GroundDestination, index: number) {
  const profile = CHAMBER_PROFILE[destination.chamberForm]
  const width = profile.width, rise = profile.rise
  const shape = new THREE.Shape()
  shape.moveTo(-width - .34, 0)
  for (let i = 0; i <= 64; i++) {
    const a = Math.PI - i / 64 * Math.PI
    const shoulder = Math.sign(Math.cos(a)) * Math.pow(Math.abs(Math.cos(a)), profile.shoulder)
    const crown = Math.pow(Math.sin(a), profile.crown)
    const strata = Math.sin(a * (5 + index % 4)) * .045 * Math.sin(a)
    shape.lineTo(shoulder * (width + .34 + strata), .62 + crown * (rise + .3))
  }
  shape.lineTo(width + .28, 0); shape.lineTo(width, 0)
  for (let i = 0; i <= 64; i++) {
    const a = i / 64 * Math.PI
    const shoulder = Math.sign(Math.cos(a)) * Math.pow(Math.abs(Math.cos(a)), profile.shoulder)
    const crown = Math.pow(Math.sin(a), profile.crown)
    shape.lineTo(shoulder * width, .62 + crown * rise)
  }
  shape.lineTo(-width, 0); shape.closePath()
  return new THREE.ExtrudeGeometry(shape, { depth: profile.depth, bevelEnabled: true, bevelSegments: 4, steps: 1, bevelSize: .11, bevelThickness: .1, curveSegments: 32 })
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
  return <group position={[-1.84 - (index % 3) * .12, 1.35, -.20]} scale={1.35} name="ground-governed-caged-wall-sconce">
    <primitive object={fixture} />
    <mesh position={[0, .075, .11]}><cylinderGeometry args={[.025,.025,.19,12]} /><meshStandardMaterial color="#f7e7c2" emissive="#f2d2a0" emissiveIntensity={1.1} /></mesh>
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
  const base = useMemo(() => new THREE.LatheGeometry([[.22,0],[.26,.05],[.18,.12],[.12,.66],[.22,.72]].map(([x,y])=>new THREE.Vector2(x,y)),32),[])
  useEffect(() => () => { desk.dispose(); base.dispose() },[desk,base])
  return <group position={[0,0,-4.25]} name={`ground-authored-${form}-interior`}>
    <mesh geometry={desk} position={[0,.85,0]} rotation={[-Math.PI/2,0,0]} scale={form==='council'?[1.04,1.65,1]:[1,1,1]} castShadow receiveShadow>
      <meshStandardMaterial map={maps[0]} normalMap={maps[1]} color={form==='sanctuary'?'#6f8579':'#9c8c70'} roughness={.64} />
    </mesh>
    {[-.76,.76].map(x=><mesh key={x} geometry={base} position={[x,.06,-.05]} castShadow receiveShadow><meshStandardMaterial color="#344f4b" metalness={.4} roughness={.46}/></mesh>)}
    {form==='sanctuary' ? Array.from({length:9},(_,i)=><mesh key={i} position={[-1.1+i*.275,1.2,-.65]} rotation={[0,0,.025*Math.sin(i)]} castShadow><cylinderGeometry args={[.025,.04,1.9,12]}/><meshStandardMaterial color="#849b89" metalness={.25} roughness={.6}/></mesh>) : null}
    {form==='council' ? [-1,1].map(side=><group key={side}><mesh geometry={base} position={[side*1.05,.02,.6]} scale={[.75,.56,.75]} castShadow><meshStandardMaterial color="#344f4b" metalness={.4} roughness={.46}/></mesh><mesh geometry={desk} position={[side*1.05,.46,.6]} rotation={[-Math.PI/2,0,side*.7]} scale={[.43,.55,.7]} castShadow><meshStandardMaterial map={maps[0]} normalMap={maps[1]} color="#8a8974" roughness={.84}/></mesh></group>) : null}
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
    texture.anisotropy = 4; texture.needsUpdate = true
    return texture
  }), [originals])
  const shell = useMemo(() => vaultSurface(16, 10, 54), [])
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
  const chamberRoofs = useMemo(() => DESTINATIONS.map((destination) => {
    const profile = CHAMBER_PROFILE[destination.chamberForm]
    return vaultSurface(profile.width + .28, profile.rise + .34, profile.depth + 3.1, 48, 12)
  }), [])
  const floor = useMemo(() => {
    const g = new THREE.PlaneGeometry(32, 54, 1, 1)
    const uv = g.getAttribute('uv')
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 5.3, uv.getY(i) * 9.7)
    return g
  }, [])
  useEffect(() => () => { shell.dispose(); endWall.dispose(); floor.dispose(); arches.forEach(g => g.dispose()); chamberRoofs.forEach(g => g.dispose()); maps.forEach(t => t.dispose()) }, [shell, endWall, floor, arches, chamberRoofs, maps])
  return <group name="ground-authored-walkable-vault-and-chambers">
    <mesh geometry={shell} position={[0, 0, 13]} receiveShadow>
      <meshStandardMaterial map={maps[0]} normalMap={maps[1]} roughnessMap={maps[2]} normalScale={new THREE.Vector2(.35, .35)} color="#79867b" roughness={.88} side={THREE.DoubleSide} />
    </mesh>
    <mesh geometry={endWall} position={[0, 0, -41]} receiveShadow>
      <meshStandardMaterial color="#4f655e" roughness={.96} side={THREE.DoubleSide} />
    </mesh>
    <mesh geometry={floor} position={[0, -.09, -14]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <meshStandardMaterial map={maps[0]} normalMap={maps[1]} roughnessMap={maps[2]} color="#727369" normalScale={new THREE.Vector2(.22, .22)} roughness={.72} metalness={.08} />
    </mesh>
    {DESTINATIONS.map((destination, index) => {
      const [x, , z] = destination.position
      const facing = x < -4 ? .4 : x > 4 ? -.4 : 0
      const active = activeId === destination.id
      return <group key={destination.id} position={[x, 0, z]} rotation={[0, facing, 0]} name={`ground-enterable-threshold-${destination.id}`} userData={{ destinationHref: destination.href }} onClick={event => { event.stopPropagation(); onSelect(destination) }}>
        {(active || (!portrait && index < 3)) && <Html center position={[0, CHAMBER_PROFILE[destination.chamberForm].rise + 1.18, -1.5]} distanceFactor={portrait ? 28 : 24} style={{ pointerEvents: 'none' }}>
          <div style={{ whiteSpace: 'nowrap', color: '#e9f4ed', font: '650 12px/1.3 system-ui', letterSpacing: '.055em', textShadow: '0 2px 9px #071210', padding: '4px 8px', background: 'linear-gradient(135deg,rgba(8,23,23,.72),rgba(8,23,23,.36))', border: '1px solid rgba(222,244,235,.12)', borderRadius: 999 }}>{destination.label}</div>
        </Html>}
        <GroundSconce index={index} />
        {index < 3 ? <ChamberFurnishing form={destination.chamberForm} maps={maps} /> : null}
        <mesh geometry={arches[index]} position={[0, 0, -2.9]} receiveShadow castShadow>
          <meshStandardMaterial map={maps[0]} normalMap={maps[1]} color={index % 3 === 0 ? '#a3997d' : '#839991'} roughness={.8} normalScale={new THREE.Vector2(.25, .25)} />
        </mesh>
        <mesh geometry={chamberRoofs[index]} position={[0, .81, -.3]} receiveShadow castShadow>
          <meshStandardMaterial map={maps[0]} normalMap={maps[1]} color={index % 3 === 0 ? '#9d957f' : '#81928b'} roughness={.87} side={THREE.DoubleSide} />
        </mesh>
        {[-1, 1].map(side => <mesh key={side} position={[side * (1.84 + (index % 3) * .12), .32, -3.15]} receiveShadow castShadow>
          <boxGeometry args={[.28, .82, 5.7]} />
          <meshStandardMaterial map={maps[0]} normalMap={maps[1]} color="#7c897f" roughness={.88} />
        </mesh>)}
        <mesh position={[0, .015, -1.1]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <circleGeometry args={[1.5, 64]} /><meshStandardMaterial color="#435751" metalness={.18} roughness={.5} />
        </mesh>
        <mesh position={[0, .03, -1.1]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[1.34, 1.36, 80]} /><meshBasicMaterial color={destination.color} transparent opacity={active ? .7 : .3} />
        </mesh>
        <pointLight position={[-1.84 - (index % 3) * .12, 1.45, .12]} color={index % 3 ? '#b7d6cb' : '#efd5a3'} intensity={active ? 8.5 : 2.4} distance={active ? 7 : 4.8} decay={2} />
      </group>
    })}
    <hemisphereLight args={['#c9d8cb', '#263b34', .42]} />
    <pointLight position={[-3.5, 6.8, 1]} intensity={36} distance={27} decay={2} color="#efd1a4" />
    <pointLight position={[5.5, 6.2, -19]} intensity={22} distance={22} decay={2} color="#8eb6b4" />
  </group>
}
