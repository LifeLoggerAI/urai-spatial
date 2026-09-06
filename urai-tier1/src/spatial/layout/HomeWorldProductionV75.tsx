'use client'

import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Environment, useGLTF, useTexture } from '@react-three/drei'
import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'

const ROCK_DIFFUSE = '/assets/urai/home-production/cc0/rock-tile-floor/rock-tile-floor-diff-1k.webp'
const ROCK_NORMAL = '/assets/urai/home-production/cc0/rock-tile-floor/rock-tile-floor-normal-gl-1k.webp'
const ROCK_ARM = '/assets/urai/home-production/cc0/rock-tile-floor/rock-tile-floor-arm-1k.webp'
const HOME_HDR = '/assets/urai/home-production/cc0/environment/studio-small-08-1k.hdr'
const PIPE_SYSTEM = '/assets/urai/home-production/cc0/polyhaven-v48/modular_industrial_pipes_01/asset.gltf'

type Vec3 = readonly [number, number, number]
type TextureSet = { color: THREE.Texture; normal: THREE.Texture; arm: THREE.Texture }

function useStoneTextures(): TextureSet {
  const [colorSource, normalSource, armSource] = useTexture([ROCK_DIFFUSE, ROCK_NORMAL, ROCK_ARM])
  return useMemo(() => {
    const clone = (source: THREE.Texture, color = false) => {
      const texture = source.clone()
      texture.wrapS = THREE.RepeatWrapping
      texture.wrapT = THREE.RepeatWrapping
      texture.repeat.set(4.0, 4.8)
      texture.anisotropy = 4
      texture.colorSpace = color ? THREE.SRGBColorSpace : THREE.NoColorSpace
      texture.needsUpdate = true
      return texture
    }
    return { color: clone(colorSource, true), normal: clone(normalSource), arm: clone(armSource) }
  }, [armSource, colorSource, normalSource])
}

function prepareMetalAsset(source: THREE.Object3D, span: number) {
  const root = source.clone(true)
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return
    const originals = Array.isArray(object.material) ? object.material : [object.material]
    const materials = originals.map((entry) => {
      const clone = entry.clone()
      if (clone instanceof THREE.MeshStandardMaterial) {
        clone.roughness = Math.max(clone.roughness, 0.52)
        clone.metalness = Math.min(Math.max(clone.metalness, 0.22), 0.58)
        clone.envMapIntensity = 0.70
        if ('transmission' in clone) (clone as THREE.MeshPhysicalMaterial).transmission = 0
      }
      return clone
    })
    object.material = Array.isArray(object.material) ? materials : materials[0]
    object.castShadow = true
    object.receiveShadow = true
  })
  const box = new THREE.Box3().setFromObject(root)
  const center = box.getCenter(new THREE.Vector3())
  const size = box.getSize(new THREE.Vector3())
  root.position.sub(center)
  root.scale.setScalar(span / Math.max(size.x, size.y, size.z, 0.001))
  return root
}

function PipeAsset({ name, position, rotation = [0, 0, 0], scale = [1, 1, 1], span }: { name: string; position: Vec3; rotation?: Vec3; scale?: Vec3; span: number }) {
  const gltf = useGLTF(PIPE_SYSTEM)
  const model = useMemo(() => prepareMetalAsset(gltf.scene, span), [gltf.scene, span])
  return <group name={name} position={position as [number, number, number]} rotation={rotation as [number, number, number]} scale={scale as [number, number, number]} userData={{ productionAsset: PIPE_SYSTEM, retainedPixelAuthority: 'v75' }}><primitive object={model} /></group>
}

function RuntimeCameraSync({ reducedMotion }: { reducedMotion: boolean }) {
  const { camera, size } = useThree()
  const yaw = useRef(0)
  const pitch = useRef(0.015)
  const dragging = useRef(false)
  const last = useRef({ x: 0, y: 0 })

  useEffect(() => {
    const down = (event: PointerEvent) => {
      if (event.button === 0 || event.pointerType === 'touch') {
        dragging.current = true
        last.current = { x: event.clientX, y: event.clientY }
      }
    }
    const move = (event: PointerEvent) => {
      if (!dragging.current || reducedMotion) return
      const dx = event.clientX - last.current.x
      const dy = event.clientY - last.current.y
      last.current = { x: event.clientX, y: event.clientY }
      yaw.current += dx * 0.003
      pitch.current = THREE.MathUtils.clamp(pitch.current + dy * 0.0024, -0.30, 0.30)
    }
    const up = () => { dragging.current = false }
    window.addEventListener('pointerdown', down, true)
    window.addEventListener('pointermove', move, true)
    window.addEventListener('pointerup', up, true)
    window.addEventListener('pointercancel', up, true)
    return () => {
      window.removeEventListener('pointerdown', down, true)
      window.removeEventListener('pointermove', move, true)
      window.removeEventListener('pointerup', up, true)
      window.removeEventListener('pointercancel', up, true)
    }
  }, [reducedMotion])

  useFrame(() => {
    const world = document.querySelector<HTMLElement>('[data-urai-home-production]')
    const x = Number.parseFloat(world?.dataset.homePlayerX ?? '0')
    const z = Number.parseFloat(world?.dataset.homePlayerZ ?? '4.6')
    const portrait = size.height > size.width
    if (camera instanceof THREE.PerspectiveCamera) {
      const fov = portrait ? 56 : 44
      if (camera.fov !== fov) {
        camera.fov = fov
        camera.updateProjectionMatrix()
      }
    }
    camera.position.set(Number.isFinite(x) ? x : 0, portrait ? 1.50 : 1.60, Number.isFinite(z) ? z : 4.6)
    const direction = new THREE.Vector3(-Math.sin(yaw.current), pitch.current, -Math.cos(yaw.current)).normalize()
    camera.lookAt(camera.position.clone().add(direction.multiplyScalar(16)))
  })
  return null
}

function StoneMaterial({ textures, tint, side = THREE.FrontSide }: { textures: TextureSet; tint: string; side?: THREE.Side }) {
  return <meshPhysicalMaterial color={tint} map={textures.color} normalMap={textures.normal} normalScale={new THREE.Vector2(0.36, 0.36)} roughnessMap={textures.arm} roughness={0.91} metalness={0.01} envMapIntensity={0.62} side={side} />
}

function VaultShell({ textures }: { textures: TextureSet }) {
  const geometry = useMemo(() => {
    const xSegments = 30
    const zSegments = 34
    const positions: number[] = []
    const uvs: number[] = []
    const indices: number[] = []
    for (let zIndex = 0; zIndex <= zSegments; zIndex += 1) {
      const tz = zIndex / zSegments
      const z = 5.8 - tz * 18.2
      for (let xIndex = 0; xIndex <= xSegments; xIndex += 1) {
        const tx = xIndex / xSegments
        const x = -5.9 + tx * 11.8
        const normalized = x / 6.0
        const arch = Math.sqrt(Math.max(0, 1 - normalized * normalized))
        const depthLift = 0.14 * Math.sin((z + 8.0) * 0.58)
        const relief = 0.045 * Math.sin(x * 2.2 + z * 0.36) + 0.026 * Math.cos(z * 1.1 - x * 0.7)
        const y = 3.05 + arch * 3.12 + depthLift + relief
        positions.push(x, y, z)
        uvs.push(tx * 4.4, tz * 6.6)
      }
    }
    for (let zIndex = 0; zIndex < zSegments; zIndex += 1) {
      for (let xIndex = 0; xIndex < xSegments; xIndex += 1) {
        const a = zIndex * (xSegments + 1) + xIndex
        const b = a + 1
        const c = a + (xSegments + 1)
        const d = c + 1
        indices.push(a, c, b, b, c, d)
      }
    }
    const result = new THREE.BufferGeometry()
    result.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    result.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
    result.setIndex(indices)
    result.computeVertexNormals()
    return result
  }, [])
  return <mesh name="home-v75-continuous-vault" geometry={geometry} receiveShadow castShadow><StoneMaterial textures={textures} tint="#343a34" side={THREE.DoubleSide} /></mesh>
}

function CantedWall({ side, textures }: { side: 'port' | 'starboard'; textures: TextureSet }) {
  const geometry = useMemo(() => {
    const ySegments = 12
    const zSegments = 32
    const positions: number[] = []
    const uvs: number[] = []
    const indices: number[] = []
    const sign = side === 'port' ? -1 : 1
    for (let zIndex = 0; zIndex <= zSegments; zIndex += 1) {
      const tz = zIndex / zSegments
      const z = 5.8 - tz * 18.2
      for (let yIndex = 0; yIndex <= ySegments; yIndex += 1) {
        const ty = yIndex / ySegments
        const y = -0.08 + ty * 3.55
        const taper = 5.55 + ty * 0.35
        const relief = 0.06 * Math.sin(z * 0.86 + ty * 3.0) + 0.025 * Math.cos(z * 1.9)
        const x = sign * (taper + relief)
        positions.push(x, y, z)
        uvs.push(tz * 6.4, ty * 2.2)
      }
    }
    for (let zIndex = 0; zIndex < zSegments; zIndex += 1) {
      for (let yIndex = 0; yIndex < ySegments; yIndex += 1) {
        const a = zIndex * (ySegments + 1) + yIndex
        const b = a + 1
        const c = a + (ySegments + 1)
        const d = c + 1
        if (side === 'port') indices.push(a, b, c, b, d, c)
        else indices.push(a, c, b, b, c, d)
      }
    }
    const result = new THREE.BufferGeometry()
    result.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    result.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
    result.setIndex(indices)
    result.computeVertexNormals()
    return result
  }, [side])
  return <mesh name={`home-v75-${side}-continuous-wall`} geometry={geometry} receiveShadow castShadow><StoneMaterial textures={textures} tint={side === 'port' ? '#393d36' : '#303832'} side={THREE.DoubleSide} /></mesh>
}

function ConcaveApse({ textures }: { textures: TextureSet }) {
  const geometry = useMemo(() => {
    const xSegments = 28
    const ySegments = 18
    const positions: number[] = []
    const uvs: number[] = []
    const indices: number[] = []
    for (let yIndex = 0; yIndex <= ySegments; yIndex += 1) {
      const ty = yIndex / ySegments
      const y = -0.10 + ty * 6.2
      for (let xIndex = 0; xIndex <= xSegments; xIndex += 1) {
        const tx = xIndex / xSegments
        const x = -5.8 + tx * 11.6
        const z = -11.82 + 0.078 * x * x + 0.045 * Math.sin(x * 1.8 + y * 0.7)
        positions.push(x, y, z)
        uvs.push(tx * 4.4, ty * 3.2)
      }
    }
    for (let yIndex = 0; yIndex < ySegments; yIndex += 1) {
      for (let xIndex = 0; xIndex < xSegments; xIndex += 1) {
        const a = yIndex * (xSegments + 1) + xIndex
        const b = a + 1
        const c = a + (xSegments + 1)
        const d = c + 1
        indices.push(a, b, c, b, d, c)
      }
    }
    const result = new THREE.BufferGeometry()
    result.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    result.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
    result.setIndex(indices)
    result.computeVertexNormals()
    return result
  }, [])
  return <mesh name="home-v75-concave-apse" geometry={geometry} receiveShadow castShadow><StoneMaterial textures={textures} tint="#3c4138" side={THREE.DoubleSide} /></mesh>
}

function ExtrudedPlate({ name, points, position, rotation = [0, 0, 0], scale = [1, 1, 1], color = '#35483f', depth = 0.28, metalness = 0.48 }: { name: string; points: readonly (readonly [number, number])[]; position: Vec3; rotation?: Vec3; scale?: Vec3; color?: string; depth?: number; metalness?: number }) {
  const geometry = useMemo(() => {
    const shape = new THREE.Shape()
    shape.moveTo(points[0][0], points[0][1])
    for (const [x, y] of points.slice(1)) shape.lineTo(x, y)
    shape.closePath()
    const result = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelSegments: 5, bevelSize: 0.065, bevelThickness: 0.075, curveSegments: 12 })
    result.center()
    result.computeVertexNormals()
    return result
  }, [depth, points])
  return <mesh name={name} geometry={geometry} position={position as [number, number, number]} rotation={rotation as [number, number, number]} scale={scale as [number, number, number]} castShadow receiveShadow><meshPhysicalMaterial color={color} roughness={0.52} metalness={metalness} clearcoat={0.08} clearcoatRoughness={0.66} envMapIntensity={0.84} /></mesh>
}

const WEDGE_POINTS = [[-0.82, -1.7], [0.55, -1.55], [0.80, 1.36], [0.15, 1.78], [-0.68, 1.18]] as const
const MACHINE_BACK_POINTS = [[-2.2, -2.45], [2.15, -2.30], [2.35, 1.55], [1.35, 2.50], [-1.05, 2.62], [-2.35, 1.42]] as const
const LEFT_BODY_POINTS = [[-0.98, -1.45], [-0.16, -1.24], [-0.08, 1.26], [-0.54, 1.58], [-1.16, 1.08], [-1.30, -0.36]] as const
const RIGHT_BODY_POINTS = [[0.12, -1.28], [0.94, -1.42], [1.22, -0.58], [1.12, 0.96], [0.58, 1.46], [0.12, 1.12]] as const
const SHOULDER_POINTS = [[-0.70, -0.56], [0.54, -0.48], [0.72, 0.26], [0.24, 0.72], [-0.58, 0.54]] as const

function ServiceRecess({ side, textures }: { side: 'ground' | 'life-map'; textures: TextureSet }) {
  const sign = side === 'ground' ? -1 : 1
  const tone = side === 'ground' ? '#91a983' : '#8c9fc3'
  return <group name={`home-v75-${side}-integrated-recess`} position={[sign * 4.30, 1.42, -9.55]} rotation={[0, sign * -0.28, 0]}>
    <ExtrudedPlate name={`${side}-outer-wedge`} points={WEDGE_POINTS} position={[0, 0.14, 0]} scale={[1.22, 0.96, 1]} color="#44483f" depth={0.52} metalness={0.14} />
    <mesh position={[0.02, 0.02, 0.34]} scale={[1.14, 2.70, 1]}><planeGeometry args={[1, 1]} /><meshBasicMaterial color="#07100e" /></mesh>
    <ExtrudedPlate name={`${side}-service-cheek`} points={SHOULDER_POINTS} position={[sign * -0.75, 0.20, 0.55]} rotation={[0, 0, sign * -0.18]} scale={[0.52, 1.15, 0.66]} color="#46554c" />
    <mesh position={[sign * -0.49, 0.10, 0.69]} scale={[0.030, 1.05, 0.030]}><boxGeometry args={[1, 1, 1]} /><meshBasicMaterial color={tone} toneMapped={false} /></mesh>
    <pointLight position={[sign * -0.34, 0.22, 0.88]} color={tone} intensity={0.82} distance={4.6} decay={2} />
  </group>
}

function Conduit({ name, points, radius = 0.052, color = '#46574e' }: { name: string; points: Vec3[]; radius?: number; color?: string }) {
  const curve = useMemo(() => new THREE.CatmullRomCurve3(points.map(([x, y, z]) => new THREE.Vector3(x, y, z))), [points])
  return <mesh name={name} castShadow receiveShadow><tubeGeometry args={[curve, 32, radius, 10, false]} /><meshPhysicalMaterial color={color} roughness={0.44} metalness={0.56} envMapIntensity={0.78} /></mesh>
}

function ApseRelicMachine() {
  return <group name="home-v75-apse-integrated-relic-machine" userData={{ treatment: 'v75-apse-embedded-armored-companion', noSphere: true, noCage: true, connectedLoadPaths: true }}>
    <ExtrudedPlate name="home-v75-machine-rear-architecture" points={MACHINE_BACK_POINTS} position={[0, 2.36, -10.92]} scale={[1.0, 1.0, 1]} color="#202f2a" depth={0.58} metalness={0.36} />
    <ExtrudedPlate name="home-v75-machine-port-body" points={LEFT_BODY_POINTS} position={[-0.12, 2.28, -10.48]} rotation={[0.02, -0.05, -0.03]} scale={[1.03, 1.04, 1]} color="#2d4a3f" depth={0.42} />
    <ExtrudedPlate name="home-v75-machine-starboard-body" points={RIGHT_BODY_POINTS} position={[0.08, 2.24, -10.44]} rotation={[-0.02, 0.05, 0.03]} scale={[1.02, 1.02, 1]} color="#3d5449" depth={0.44} />
    <ExtrudedPlate name="home-v75-machine-port-shoulder" points={SHOULDER_POINTS} position={[-1.08, 3.18, -10.31]} rotation={[0, -0.08, -0.20]} scale={[0.82, 0.68, 1]} color="#44584e" />
    <ExtrudedPlate name="home-v75-machine-starboard-shoulder" points={SHOULDER_POINTS} position={[1.04, 2.98, -10.30]} rotation={[0, 0.08, 0.18]} scale={[0.76, 0.64, 1]} color="#33493f" />
    <ExtrudedPlate name="home-v75-machine-crown" points={SHOULDER_POINTS} position={[-0.10, 3.82, -10.37]} rotation={[0, 0, 1.48]} scale={[0.62, 0.88, 1]} color="#526057" />
    <ExtrudedPlate name="home-v75-machine-keel" points={SHOULDER_POINTS} position={[0.04, 0.92, -10.42]} rotation={[0, 0, -1.52]} scale={[0.58, 0.92, 1]} color="#263d34" />
    <mesh name="home-v75-machine-recess" position={[0, 2.26, -10.16]} scale={[0.44, 1.72, 0.16]}><boxGeometry args={[1, 1, 1]} /><meshPhysicalMaterial color="#06100d" roughness={0.34} metalness={0.58} envMapIntensity={0.56} /></mesh>
    <mesh name="home-v75-machine-vertical-aperture" position={[0, 2.26, -9.96]} scale={[0.055, 1.30, 0.045]}><boxGeometry args={[1, 1, 1]} /><meshPhysicalMaterial color="#ffe6ae" emissive="#d6a963" emissiveIntensity={1.46} roughness={0.10} metalness={0.05} toneMapped={false} /></mesh>
    <mesh name="home-v75-machine-floor-cradle" position={[0, 0.42, -10.52]} scale={[2.86, 0.24, 1.24]} castShadow receiveShadow><boxGeometry args={[1, 1, 1]} /><meshPhysicalMaterial color="#283830" roughness={0.62} metalness={0.30} envMapIntensity={0.70} /></mesh>
    <mesh name="home-v75-machine-overhead-crosshead" position={[0, 4.74, -10.70]} scale={[3.30, 0.24, 0.70]} castShadow receiveShadow><boxGeometry args={[1, 1, 1]} /><meshPhysicalMaterial color="#3c4840" roughness={0.55} metalness={0.42} envMapIntensity={0.76} /></mesh>
    <Conduit name="home-v75-port-machine-feed" points={[[-3.52, 1.42, -10.10], [-2.82, 1.64, -10.42], [-2.02, 2.10, -10.56], [-1.20, 2.56, -10.45]]} radius={0.075} />
    <Conduit name="home-v75-starboard-machine-feed" points={[[3.48, 1.40, -10.08], [2.78, 1.72, -10.40], [2.04, 2.20, -10.54], [1.18, 2.46, -10.43]]} radius={0.072} color="#526158" />
    <Conduit name="home-v75-port-floor-feed" points={[[-2.65, 0.08, -5.8], [-2.42, 0.12, -7.2], [-1.88, 0.18, -8.8], [-1.12, 0.42, -10.1]]} radius={0.064} color="#344a40" />
    <Conduit name="home-v75-starboard-floor-feed" points={[[2.76, 0.08, -5.7], [2.48, 0.13, -7.2], [1.92, 0.20, -8.8], [1.14, 0.42, -10.1]]} radius={0.064} color="#40564b" />
    <pointLight position={[0, 2.30, -9.45]} color="#a0cabb" intensity={1.05} distance={5.8} decay={2} />
    <pointLight position={[0.4, 3.62, -9.72]} color="#d9aa68" intensity={0.58} distance={4.3} decay={2} />
  </group>
}

function ForegroundArchitecture() {
  return <>
    <ExtrudedPlate name="home-v75-port-foreground-buttress" points={WEDGE_POINTS} position={[-4.55, 1.54, 1.20]} rotation={[0.03, 0.40, -0.05]} scale={[1.20, 1.18, 1]} color="#3d433b" depth={0.90} metalness={0.08} />
    <ExtrudedPlate name="home-v75-starboard-foreground-buttress" points={WEDGE_POINTS} position={[4.55, 1.45, 0.55]} rotation={[-0.02, -0.38, 0.04]} scale={[1.12, 1.12, 1]} color="#343c35" depth={0.88} metalness={0.08} />
    <ExtrudedPlate name="home-v75-port-mid-load-pier" points={WEDGE_POINTS} position={[-4.70, 1.72, -4.10]} rotation={[0, 0.25, -0.06]} scale={[0.72, 1.04, 1]} color="#444940" depth={0.72} metalness={0.12} />
    <ExtrudedPlate name="home-v75-starboard-mid-load-pier" points={WEDGE_POINTS} position={[4.82, 1.62, -5.02]} rotation={[0, -0.22, 0.05]} scale={[0.68, 1.00, 1]} color="#343e36" depth={0.70} metalness={0.12} />
  </>
}

function FloorSystem({ textures }: { textures: TextureSet }) {
  return <group name="home-v75-floor-system">
    <mesh position={[0, -0.12, -2.8]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[11.2, 18.6, 40, 54]} /><StoneMaterial textures={textures} tint="#42423b" /></mesh>
    <mesh name="home-v75-central-inset" position={[0.25, -0.075, -4.60]} rotation={[-Math.PI / 2, 0, -0.018]} receiveShadow><planeGeometry args={[3.2, 12.0]} /><meshPhysicalMaterial color="#242d29" roughness={0.78} metalness={0.12} envMapIntensity={0.60} /></mesh>
    {[-1.62, 1.82].map((x, index) => <mesh key={x} name={`home-v75-floor-service-inlay-${index}`} position={[x, -0.048, -4.7]} rotation={[-Math.PI / 2, 0, index ? -0.04 : 0.04]} receiveShadow><planeGeometry args={[0.10, 11.8]} /><meshPhysicalMaterial color="#607168" emissive="#365048" emissiveIntensity={0.08} roughness={0.45} metalness={0.48} /></mesh>)}
  </group>
}

function DustField({ reducedMotion }: { reducedMotion: boolean }) {
  const points = useRef<THREE.Points>(null)
  const geometry = useMemo(() => {
    const data: number[] = []
    for (let index = 0; index < 120; index += 1) {
      const x = ((index * 37) % 101) / 101 * 10.4 - 5.2
      const y = 0.38 + (((index * 53) % 97) / 97) * 5.3
      const z = 4.6 - (((index * 71) % 113) / 113) * 16.2
      data.push(x, y, z)
    }
    const result = new THREE.BufferGeometry()
    result.setAttribute('position', new THREE.Float32BufferAttribute(data, 3))
    return result
  }, [])
  useFrame(({ clock }) => {
    if (!points.current || reducedMotion) return
    points.current.rotation.y = Math.sin(clock.elapsedTime * 0.07) * 0.008
  })
  return <points ref={points} geometry={geometry}><pointsMaterial color="#bdc9c0" size={0.014} transparent opacity={0.24} depthWrite={false} /></points>
}

function V75Scene({ reducedMotion }: { reducedMotion: boolean }) {
  const textures = useStoneTextures()
  return <>
    <RuntimeCameraSync reducedMotion={reducedMotion} />
    <color attach="background" args={['#0a100e']} />
    <fogExp2 attach="fog" args={['#18201c', 0.018]} />
    <Environment files={HOME_HDR} background={false} environmentIntensity={0.68} />
    <ambientLight intensity={0.42} color="#d3d7cf" />
    <hemisphereLight args={['#aebdb4', '#2e241b', 0.62]} />
    <directionalLight position={[-4.6, 7.6, 3.8]} intensity={1.22} color="#e0c99f" castShadow shadow-mapSize-width={768} shadow-mapSize-height={768} />
    <directionalLight position={[4.8, 4.8, -6]} intensity={0.32} color="#799a8e" />
    <pointLight position={[-3.7, 2.1, -6.6]} color="#d5a264" intensity={0.76} distance={6.2} decay={2} />
    <pointLight position={[3.8, 2.0, -7.4]} color="#86aa9d" intensity={0.62} distance={6.4} decay={2} />
    <VaultShell textures={textures} />
    <CantedWall side="port" textures={textures} />
    <CantedWall side="starboard" textures={textures} />
    <ConcaveApse textures={textures} />
    <FloorSystem textures={textures} />
    <ForegroundArchitecture />
    <ServiceRecess side="ground" textures={textures} />
    <ServiceRecess side="life-map" textures={textures} />
    <PipeAsset name="home-v75-port-service-manifold" position={[-3.52, 1.34, -9.92]} rotation={[0.04, 0.28, 0.03]} scale={[0.54, 0.64, 0.54]} span={1.58} />
    <PipeAsset name="home-v75-starboard-service-manifold" position={[3.50, 1.38, -9.96]} rotation={[-0.04, -0.28, -0.03]} scale={[0.52, 0.62, 0.52]} span={1.54} />
    <ApseRelicMachine />
    <DustField reducedMotion={reducedMotion} />
  </>
}

export function HomeV75RetainedPixelWorld() {
  const [reducedMotion, setReducedMotion] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const apply = () => setReducedMotion(mq.matches)
    apply()
    mq.addEventListener?.('change', apply)
    return () => mq.removeEventListener?.('change', apply)
  }, [])
  return <div aria-hidden="true" data-home-v75-retained-pixel-world="continuous-vaulted-relic-sanctuary" data-home-v75-reduced-motion={reducedMotion ? 'true' : 'false'} style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 4, background: '#0a100e' }}>
    <Canvas dpr={1} shadows camera={{ position: [0, 1.60, 4.6], fov: 44, near: 0.1, far: 120 }} gl={{ alpha: false, antialias: true, powerPreference: 'high-performance' }} onCreated={({ gl }) => {
      gl.outputColorSpace = THREE.SRGBColorSpace
      gl.toneMapping = THREE.ACESFilmicToneMapping
      gl.toneMappingExposure = 1.30
      gl.shadowMap.type = THREE.PCFSoftShadowMap
    }}>
      <V75Scene reducedMotion={reducedMotion} />
    </Canvas>
  </div>
}

useGLTF.preload(PIPE_SYSTEM)
