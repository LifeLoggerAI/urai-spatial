'use client'

import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Stars } from '@react-three/drei'
import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'

export type LocationAtlasCamera = { x: number; y: number; zoom: number }
export type LocationAtlasWorldPoint = {
  id: string
  x: number
  y: number
  depth: number
  color: string
  intensity: number
  selected: boolean
}

type Props = {
  camera: LocationAtlasCamera
  points: LocationAtlasWorldPoint[]
  selectedColor: string
  reducedMotion: boolean
}

function seeded(index: number, salt = 0) {
  const value = Math.sin(index * 73.197 + salt * 19.913) * 43758.5453
  return value - Math.floor(value)
}

function terrainHeight(x: number, z: number) {
  const broad = Math.sin(x * .24) * .48 + Math.cos(z * .21) * .38 + Math.sin((x + z) * .13) * .2
  const basin = -Math.exp(-((x / 8.8) ** 2 + (z / 7.2) ** 2)) * .62
  return broad + basin - .5
}

function makeTerrainGeometry() {
  const geometry = new THREE.PlaneGeometry(34, 27, 92, 72)
  geometry.rotateX(-Math.PI / 2)
  const position = geometry.attributes.position as THREE.BufferAttribute
  const colors = new Float32Array(position.count * 3)
  const low = new THREE.Color('#102924')
  const mid = new THREE.Color('#274b43')
  const high = new THREE.Color('#52685d')
  const color = new THREE.Color()
  for (let index = 0; index < position.count; index += 1) {
    const x = position.getX(index)
    const z = position.getZ(index)
    const y = terrainHeight(x, z)
    position.setY(index, y)
    const lift = THREE.MathUtils.clamp((y + 1.2) / 2.3, 0, 1)
    color.copy(low).lerp(mid, Math.min(1, lift * 1.45)).lerp(high, Math.max(0, lift - .55) * .6)
    colors[index * 3] = color.r
    colors[index * 3 + 1] = color.g
    colors[index * 3 + 2] = color.b
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  geometry.computeVertexNormals()
  return geometry
}

function makeWaterGeometry() {
  const shape = new THREE.Shape()
  const segments = 48
  for (let index = 0; index < segments; index += 1) {
    const angle = index / segments * Math.PI * 2
    const radial = 1 + (seeded(index, 51) - .5) * .12
    const x = Math.cos(angle) * 6.7 * radial
    const y = Math.sin(angle) * 4.2 * radial
    if (index === 0) shape.moveTo(x, y)
    else shape.lineTo(x, y)
  }
  shape.closePath()
  const geometry = new THREE.ShapeGeometry(shape, 4)
  geometry.rotateX(-Math.PI / 2)
  return geometry
}

function makePathGeometry(points: LocationAtlasWorldPoint[]) {
  if (points.length < 2) return new THREE.BufferGeometry()
  const ordered = [...points].sort((a, b) => a.depth - b.depth)
  const curve = new THREE.CatmullRomCurve3(ordered.map((point) => {
    const x = (point.x - 50) * .22
    const z = (point.y - 50) * .17
    return new THREE.Vector3(x, terrainHeight(x, z) + .055, z)
  }), false, 'catmullrom', .25)
  return new THREE.TubeGeometry(curve, Math.max(24, ordered.length * 10), .018, 5, false)
}

const TERRAIN = makeTerrainGeometry()
const WATER = makeWaterGeometry()

function AtlasCameraRig({ camera }: { camera: LocationAtlasCamera }) {
  const { camera: threeCamera, size } = useThree()
  const desired = useRef(new THREE.Vector3())
  const look = useRef(new THREE.Vector3())
  useFrame((_, delta) => {
    const portrait = size.height > size.width
    const panX = -camera.x / Math.max(52, size.width * .07)
    const panZ = camera.y / Math.max(60, size.height * .075)
    const distance = (portrait ? 18.5 : 16.2) / Math.max(.72, camera.zoom)
    desired.current.set(panX, portrait ? 10.8 : 9.1, distance + panZ * .22)
    look.current.set(panX * .58, -.35, panZ * .72 - 1.1)
    const smoothing = 1 - Math.pow(.0012, Math.min(.05, delta))
    threeCamera.position.lerp(desired.current, smoothing)
    threeCamera.lookAt(look.current)
  })
  return null
}

function PlaceWeather({ point, reducedMotion }: { point: LocationAtlasWorldPoint; reducedMotion: boolean }) {
  const root = useRef<THREE.Group>(null)
  const x = (point.x - 50) * .22
  const z = (point.y - 50) * .17
  const y = terrainHeight(x, z)
  useFrame(({ clock }) => {
    if (!root.current || reducedMotion) return
    root.current.position.y = y + .03 + Math.sin(clock.elapsedTime * .55 + point.depth * 8) * .025
  })
  const strength = .65 + point.intensity * 1.35 + (point.selected ? .65 : 0)
  return <group ref={root} name={`location-place-field-${point.id}`} position={[x, y + .03, z]} userData={{ role: 'grounded-emotional-place-field', selected: point.selected }}>
    <pointLight color={point.color} intensity={strength * 2.4} distance={point.selected ? 8.5 : 5.8} decay={2} position={[0, .62, 0]} />
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, .018, 0]}>
      <circleGeometry args={[point.selected ? .62 : .34, 48]} />
      <meshBasicMaterial color={point.color} transparent opacity={point.selected ? .2 : .085} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
    </mesh>
    <mesh position={[0, .16, 0]} scale={[point.selected ? .15 : .09, point.selected ? .42 : .24, point.selected ? .15 : .09]}>
      <sphereGeometry args={[1, 24, 20]} />
      <meshBasicMaterial color={point.color} transparent opacity={point.selected ? .42 : .22} depthWrite={false} toneMapped={false} />
    </mesh>
  </group>
}

function AtlasWorld({ camera, points, selectedColor, reducedMotion }: Props) {
  const path = useMemo(() => makePathGeometry(points), [points])
  return <>
    <color attach="background" args={['#06110f']} />
    <fogExp2 attach="fog" args={['#0a1c1b', .035]} />
    <ambientLight intensity={.34} color="#c5e2dc" />
    <hemisphereLight args={['#bde4df', '#07110d', .78]} />
    <directionalLight position={[8, 14, 8]} intensity={1.45} color="#dce9df" castShadow />
    <pointLight position={[0, 7, -3]} intensity={1.8} distance={24} color={selectedColor} />
    <Stars radius={84} depth={36} count={reducedMotion ? 150 : 420} factor={1.4} fade speed={reducedMotion ? 0 : .012} />
    <AtlasCameraRig camera={camera} />
    <mesh geometry={TERRAIN} receiveShadow name="location-map-spatial-terrain">
      <meshStandardMaterial vertexColors roughness={.96} metalness={0} />
    </mesh>
    <mesh geometry={WATER} position={[2.2, -.78, -1.4]} name="location-map-reflecting-basin">
      <meshPhysicalMaterial color="#28585a" roughness={.22} clearcoat={.55} clearcoatRoughness={.2} transparent opacity={.68} />
    </mesh>
    <mesh geometry={path} name="location-map-memory-route-thread">
      <meshBasicMaterial color="#b5ebe3" transparent opacity={.16} toneMapped={false} />
    </mesh>
    {points.map((point) => <PlaceWeather key={point.id} point={point} reducedMotion={reducedMotion} />)}
  </>
}

function supportsWebGL() {
  try {
    const canvas = document.createElement('canvas')
    return Boolean(canvas.getContext('webgl2') || canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
  } catch {
    return false
  }
}

function AuthoredLocationFallback({ selectedColor }: { selectedColor: string }) {
  return <div
    className="locationAtlasWorldCanvas locationAtlasWorldCanvas--fallback"
    aria-hidden="true"
    data-testid="location-map-no-webgl-fallback"
    data-location-world-owner="authored-two-dimensional-emotional-geography"
    data-webgl-state="unavailable"
    style={{
      background: `radial-gradient(circle at 52% 48%, ${selectedColor}33 0 3%, transparent 18%), radial-gradient(ellipse at 58% 68%, #28585a99 0 12%, transparent 30%), linear-gradient(165deg, #102924 0%, #1f4038 38%, #071511 72%, #020907 100%)`,
      boxShadow: 'inset 0 -10vh 16vh rgba(0,0,0,.44)',
    }}
  >
    <div style={{ position: 'absolute', inset: '10% 8% 8%', borderRadius: '50%', border: '1px solid rgba(181,235,227,.12)', transform: 'perspective(800px) rotateX(58deg)', boxShadow: '0 0 80px rgba(142,234,255,.08) inset' }} />
    <div style={{ position: 'absolute', left: '14%', right: '10%', top: '46%', height: '1px', background: 'linear-gradient(90deg, transparent, rgba(181,235,227,.22), transparent)', transform: 'rotate(-7deg)' }} />
  </div>
}

export function LocationMapSpatialWorld(props: Props) {
  const [webglAvailable, setWebglAvailable] = useState<boolean | null>(null)
  useEffect(() => { setWebglAvailable(supportsWebGL()) }, [])

  if (webglAvailable !== true) return <AuthoredLocationFallback selectedColor={props.selectedColor} />

  return <div className="locationAtlasWorldCanvas" aria-hidden="true" data-testid="location-map-r3f-world" data-location-world-owner="react-three-fiber-terrain" data-webgl-state="ready">
    <Canvas shadows dpr={[1, 1.35]} camera={{ position: [0, 9.1, 16.2], fov: 48, near: .1, far: 120 }} gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }} onCreated={({ gl }) => {
      gl.outputColorSpace = THREE.SRGBColorSpace
      gl.toneMapping = THREE.ACESFilmicToneMapping
      gl.toneMappingExposure = 1.12
      gl.shadowMap.type = THREE.PCFSoftShadowMap
    }}>
      <AtlasWorld {...props} />
    </Canvas>
  </div>
}
