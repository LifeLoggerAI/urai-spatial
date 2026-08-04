'use client'

import { useFrame, type ThreeEvent } from '@react-three/fiber'
import { useMemo, useRef, type MutableRefObject } from 'react'
import * as THREE from 'three'

type MemoryKind = 'home' | 'ride' | 'family' | 'music' | 'tree'

type MemoryVignetteSpec = {
  id: string
  kind: MemoryKind
  position: [number, number, number]
  color: string
  scale: number
}

type HomeSanctuaryWorldProps = {
  reducedMotion: boolean
  walkTarget: MutableRefObject<THREE.Vector3 | null>
  playerPosition: MutableRefObject<THREE.Vector3>
  onMemoryOpen: (memoryId: string) => void
}

const MEMORY_VIGNETTES: MemoryVignetteSpec[] = [
  { id: 'place-loved', kind: 'home', position: [-4.75, 0.02, 3.05], color: '#eecb92', scale: 1 },
  { id: 'ride-home', kind: 'ride', position: [4.72, 0.02, 1.15], color: '#78d8df', scale: .94 },
  { id: 'voices-dinner', kind: 'family', position: [-4.78, 0.02, -1.2], color: '#b9a8e8', scale: .98 },
  { id: 'song-returned', kind: 'music', position: [4.72, 0.02, -3.9], color: '#dfa1c8', scale: .92 },
  { id: 'quiet-growth', kind: 'tree', position: [-4.5, 0.02, -6.55], color: '#91d2a4', scale: 1 },
]

const FLOOR_STONES = [
  { z: 6.2, x: -.08, width: 2.5, depth: 1.05, turn: -.015 },
  { z: 4.8, x: .12, width: 2.8, depth: 1.08, turn: .02 },
  { z: 3.35, x: -.12, width: 2.62, depth: 1.04, turn: -.018 },
  { z: 1.88, x: .08, width: 2.92, depth: 1.08, turn: .014 },
  { z: .38, x: -.08, width: 2.68, depth: 1.06, turn: -.012 },
  { z: -1.12, x: .1, width: 2.95, depth: 1.07, turn: .015 },
  { z: -2.64, x: -.11, width: 2.72, depth: 1.04, turn: -.012 },
  { z: -4.18, x: .08, width: 2.9, depth: 1.08, turn: .012 },
  { z: -5.74, x: -.08, width: 2.66, depth: 1.04, turn: -.01 },
  { z: -7.35, x: .06, width: 2.84, depth: 1.08, turn: .01 },
]

function seeded(index: number, salt: number) {
  const value = Math.sin(index * 91.733 + salt * 17.117) * 43758.5453
  return value - Math.floor(value)
}

function approachPoint(spec: MemoryVignetteSpec) {
  const side = Math.sign(spec.position[0]) || 1
  return new THREE.Vector3(spec.position[0] - side * 1.75, 0, spec.position[2] + .28)
}

function SanctuarySky({ reducedMotion }: { reducedMotion: boolean }) {
  const material = useRef<THREE.ShaderMaterial>(null)
  const uniforms = useMemo(() => ({ uTime: { value: 0 } }), [])

  useFrame(({ clock }) => {
    if (!material.current || reducedMotion) return
    material.current.uniforms.uTime.value = clock.elapsedTime
  })

  return (
    <mesh name="home-living-sky-dome" scale={[42, 24, 42]}>
      <sphereGeometry args={[1, 64, 36]} />
      <shaderMaterial
        ref={material}
        side={THREE.BackSide}
        depthWrite={false}
        uniforms={uniforms}
        vertexShader={`
          varying vec2 vUv;
          varying vec3 vPosition;
          void main() {
            vUv = uv;
            vPosition = position;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `}
        fragmentShader={`
          uniform float uTime;
          varying vec2 vUv;
          varying vec3 vPosition;

          float hash(vec2 p) {
            return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
          }

          void main() {
            float horizon = smoothstep(0.02, 0.96, vUv.y);
            vec3 low = vec3(0.006, 0.025, 0.052);
            vec3 mid = vec3(0.018, 0.082, 0.105);
            vec3 high = vec3(0.035, 0.028, 0.105);
            vec3 color = mix(low, mid, smoothstep(0.02, 0.55, horizon));
            color = mix(color, high, smoothstep(0.58, 1.0, horizon));

            float ribbonA = sin(vUv.x * 16.0 + vUv.y * 9.0 + uTime * 0.035) * 0.5 + 0.5;
            float ribbonB = sin(vUv.x * 9.0 - vUv.y * 13.0 - uTime * 0.025) * 0.5 + 0.5;
            float aurora = smoothstep(0.76, 1.0, ribbonA * ribbonB) * smoothstep(0.25, 0.88, vUv.y);
            color += vec3(0.035, 0.17, 0.17) * aurora * 0.42;
            color += vec3(0.10, 0.045, 0.17) * aurora * 0.26;

            vec2 starCell = floor(vUv * vec2(560.0, 280.0));
            float star = step(0.9974, hash(starCell));
            float starMask = smoothstep(0.34, 0.9, vUv.y);
            color += vec3(0.72, 0.92, 1.0) * star * starMask * 0.65;

            float zenith = pow(max(vPosition.y, 0.0), 4.0);
            color += vec3(0.04, 0.055, 0.12) * zenith;
            gl_FragColor = vec4(color, 1.0);
          }
        `}
      />
    </mesh>
  )
}

function SanctuaryRib({ z, intensity = .24 }: { z: number; intensity?: number }) {
  const geometry = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-7.2, .12, z),
      new THREE.Vector3(-6.7, 3.25, z),
      new THREE.Vector3(-3.55, 5.28, z),
      new THREE.Vector3(0, 5.78, z),
      new THREE.Vector3(3.55, 5.28, z),
      new THREE.Vector3(6.7, 3.25, z),
      new THREE.Vector3(7.2, .12, z),
    ], false, 'catmullrom', .42)
    return new THREE.TubeGeometry(curve, 96, .055, 8, false)
  }, [z])

  return (
    <group>
      <mesh geometry={geometry}>
        <meshStandardMaterial color="#18364a" emissive="#74dce4" emissiveIntensity={intensity} roughness={.34} metalness={.58} />
      </mesh>
      <mesh position={[0, 5.54, z]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.02, .022, 8, 96]} />
        <meshBasicMaterial color="#b7a8e9" transparent opacity={.18} depthWrite={false} toneMapped={false} />
      </mesh>
    </group>
  )
}

function ArchitecturalShell({ reducedMotion }: { reducedMotion: boolean }) {
  return (
    <group name="home-sanctuary-spatial-architecture">
      <fog attach="fog" args={['#06111f', 9.5, 34]} />
      <SanctuarySky reducedMotion={reducedMotion} />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -.115, -1.1]} receiveShadow>
        <planeGeometry args={[20, 22]} />
        <meshStandardMaterial color="#06131d" roughness={.76} metalness={.16} />
      </mesh>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -.075, -1.25]} receiveShadow>
        <planeGeometry args={[3.65, 20.5]} />
        <meshPhysicalMaterial color="#0b3442" roughness={.24} metalness={.36} clearcoat={.84} clearcoatRoughness={.28} />
      </mesh>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -.064, -1.25]}>
        <planeGeometry args={[2.62, 20.35]} />
        <meshBasicMaterial color="#0b4350" transparent opacity={.22} depthWrite={false} toneMapped={false} />
      </mesh>

      {FLOOR_STONES.map((stone, index) => (
        <group key={stone.z} position={[stone.x, -.012 + index * .0008, stone.z]} rotation={[0, stone.turn, 0]}>
          <mesh receiveShadow scale={[1, 1, stone.depth / stone.width]}>
            <cylinderGeometry args={[stone.width * .51, stone.width * .55, .105, 48]} />
            <meshStandardMaterial color={index % 2 ? '#0c2230' : '#102b38'} roughness={.52} metalness={.3} />
          </mesh>
          <mesh position={[0, .058, -.22]} rotation={[-Math.PI / 2, 0, 0]} scale={[1, stone.depth / stone.width, 1]}>
            <ringGeometry args={[stone.width * .31, stone.width * .325, 64, 1, .15, Math.PI * .7]} />
            <meshBasicMaterial color={index % 3 === 1 ? '#b4a6e4' : '#6cd8df'} transparent opacity={.32} depthWrite={false} toneMapped={false} side={THREE.DoubleSide} />
          </mesh>
        </group>
      ))}

      {[-1, 1].map((side) => (
        <group key={side} name={`home-sanctuary-${side < 0 ? 'west' : 'east'}-garden-wall`}>
          <mesh position={[side * 7.35, 1.15, -1.2]} rotation={[0, side * -.025, 0]} receiveShadow>
            <boxGeometry args={[.28, 2.45, 20.2]} />
            <meshStandardMaterial color="#07131f" roughness={.72} metalness={.22} />
          </mesh>
          <mesh position={[side * 6.82, .18, -1.2]} receiveShadow>
            <boxGeometry args={[1.12, .36, 20.2]} />
            <meshStandardMaterial color="#0a1b25" roughness={.64} metalness={.24} />
          </mesh>
          {[-7.5, -4.5, -1.5, 1.5, 4.5].map((z, index) => (
            <group key={z} position={[side * 6.72, .38, z]}>
              <mesh position={[0, .26, 0]}>
                <cylinderGeometry args={[.28, .42, .72, 16]} />
                <meshStandardMaterial color="#112c2e" roughness={.72} />
              </mesh>
              <mesh position={[-side * .05, .9, 0]} scale={[.72, .42, .72]}>
                <icosahedronGeometry args={[.62, 2]} />
                <meshStandardMaterial color={index % 2 ? '#183c36' : '#14383d'} emissive={index % 2 ? '#70b88a' : '#69c6ca'} emissiveIntensity={.08} roughness={.88} />
              </mesh>
            </group>
          ))}
        </group>
      ))}

      {[-6.8, -2.8, 1.2, 5.2].map((z, index) => (
        <SanctuaryRib key={z} z={z} intensity={index === 1 || index === 2 ? .22 : .14} />
      ))}

      <mesh position={[0, .02, -1.15]} receiveShadow>
        <cylinderGeometry args={[2.08, 2.32, .18, 72]} />
        <meshPhysicalMaterial color="#0b2733" roughness={.3} metalness={.42} clearcoat={.82} />
      </mesh>
      <mesh position={[0, .125, -1.15]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.38, 1.47, 96]} />
        <meshBasicMaterial color="#78d8df" transparent opacity={.46} toneMapped={false} side={THREE.DoubleSide} />
      </mesh>

      <mesh position={[0, 2.45, -10.05]} receiveShadow>
        <boxGeometry args={[15.2, 5.1, .38]} />
        <meshStandardMaterial color="#040b13" roughness={.72} metalness={.2} />
      </mesh>
      <mesh position={[0, 2.3, -9.81]}>
        <ringGeometry args={[1.68, 1.79, 96]} />
        <meshBasicMaterial color="#75dce3" transparent opacity={.52} toneMapped={false} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 2.3, -9.86]}>
        <circleGeometry args={[1.68, 96]} />
        <meshPhysicalMaterial color="#071a26" emissive="#1b5360" emissiveIntensity={.16} transparent opacity={.94} roughness={.28} metalness={.28} side={THREE.DoubleSide} />
      </mesh>
      <pointLight position={[0, 2.3, -8.9]} color="#78d8df" intensity={2.65} distance={11} decay={2} />
      <pointLight position={[0, 4.9, -1.4]} color="#a99be4" intensity={1.1} distance={16} decay={2} />
    </group>
  )
}

function MemoryObject({ kind, color }: { kind: MemoryKind; color: string }) {
  const shared = <meshStandardMaterial color={color} emissive={color} emissiveIntensity={.27} roughness={.4} metalness={.1} />
  if (kind === 'home') return (
    <group position={[0, .82, .02]}>
      <mesh><boxGeometry args={[.92, .58, .62]} />{shared}</mesh>
      <mesh position={[0, .52, 0]} rotation={[0, Math.PI / 4, 0]}><coneGeometry args={[.65, .55, 4]} />{shared}</mesh>
      <mesh position={[0, -.06, .34]}><boxGeometry args={[.2, .36, .04]} /><meshStandardMaterial color="#071018" roughness={.9} /></mesh>
    </group>
  )
  if (kind === 'ride') return (
    <group position={[0, .76, 0]}>
      {[-.43, .43].map((x) => <mesh key={x} position={[x, -.18, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[.29, .05, 12, 32]} />{shared}</mesh>)}
      <mesh rotation={[0, 0, -.08]}><boxGeometry args={[1.02, .07, .07]} />{shared}</mesh>
      <mesh position={[-.14, .25, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[.04, .04, .62, 10]} />{shared}</mesh>
    </group>
  )
  if (kind === 'family') return (
    <group position={[0, .62, 0]}>
      {[-.42, 0, .42].map((x, index) => <group key={x} position={[x, index === 1 ? .1 : 0, 0]}>
        <mesh position={[0, .4, 0]}><sphereGeometry args={[.145, 18, 18]} />{shared}</mesh>
        <mesh><capsuleGeometry args={[.14, .42, 8, 14]} />{shared}</mesh>
      </group>)}
    </group>
  )
  if (kind === 'music') return (
    <group position={[0, .72, 0]}>
      <mesh position={[-.24, -.18, 0]}><sphereGeometry args={[.2, 20, 20]} />{shared}</mesh>
      <mesh position={[.25, -.08, 0]}><sphereGeometry args={[.17, 20, 20]} />{shared}</mesh>
      <mesh position={[.02, .27, 0]}><boxGeometry args={[.075, .84, .075]} />{shared}</mesh>
      <mesh position={[.31, .66, 0]}><boxGeometry args={[.62, .075, .075]} />{shared}</mesh>
    </group>
  )
  return (
    <group position={[0, .62, 0]}>
      <mesh><cylinderGeometry args={[.09, .15, .92, 12]} /><meshStandardMaterial color="#6f5543" roughness={.78} /></mesh>
      {[[-.22, .58, 0], [.24, .57, -.03], [0, .87, 0], [-.06, 1.08, -.05]].map(([x, y, z], index) => <mesh key={index} position={[x, y, z]}><icosahedronGeometry args={[index === 2 ? .34 : .27, 1]} />{shared}</mesh>)}
    </group>
  )
}

function MemoryVignette({ spec, reducedMotion, walkTarget, playerPosition, onMemoryOpen }: {
  spec: MemoryVignetteSpec
  reducedMotion: boolean
  walkTarget: MutableRefObject<THREE.Vector3 | null>
  playerPosition: MutableRefObject<THREE.Vector3>
  onMemoryOpen: (memoryId: string) => void
}) {
  const group = useRef<THREE.Group>(null)
  const halo = useRef<THREE.Mesh>(null)
  const haloMaterial = useRef<THREE.MeshBasicMaterial>(null)
  const lensMaterial = useRef<THREE.MeshPhysicalMaterial>(null)
  const nearRef = useRef(false)
  const color = useMemo(() => new THREE.Color(spec.color), [spec.color])

  useFrame(({ clock }, delta) => {
    if (!group.current || !halo.current || !haloMaterial.current || !lensMaterial.current) return
    const dx = playerPosition.current.x - spec.position[0]
    const dz = playerPosition.current.z - spec.position[2]
    const near = Math.hypot(dx, dz) < 2.15
    nearRef.current = near
    const pulse = reducedMotion ? 1 : 1 + Math.sin(clock.elapsedTime * .48 + spec.position[0]) * .012
    const targetScale = spec.scale * pulse * (near ? 1.045 : 1)
    const current = group.current.scale.x
    group.current.scale.setScalar(THREE.MathUtils.damp(current, targetScale, 5.5, delta))
    if (!reducedMotion) halo.current.rotation.z += delta * (near ? .11 : .035)
    haloMaterial.current.opacity = THREE.MathUtils.damp(haloMaterial.current.opacity, near ? .74 : .34, 6, delta)
    lensMaterial.current.emissiveIntensity = THREE.MathUtils.damp(lensMaterial.current.emissiveIntensity, near ? .22 : .08, 6, delta)
  })

  const activate = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation()
    if (nearRef.current) onMemoryOpen(spec.id)
    else walkTarget.current = approachPoint(spec)
  }

  const side = Math.sign(spec.position[0]) || 1
  return (
    <group ref={group} position={spec.position} name={`home-memory-vignette-${spec.id}`} data-memory-id={spec.id}>
      <mesh position={[0, .02, 0]} receiveShadow onClick={activate}>
        <cylinderGeometry args={[1.08, 1.28, .12, 56]} />
        <meshStandardMaterial color="#0a1c25" emissive={color} emissiveIntensity={.08} roughness={.48} metalness={.34} />
      </mesh>
      <mesh position={[0, 1.22, .04]} onClick={activate}>
        <circleGeometry args={[1.02, 64]} />
        <meshPhysicalMaterial ref={lensMaterial} color="#0a1a25" emissive={color} emissiveIntensity={.08} transparent opacity={.52} transmission={.18} roughness={.24} metalness={.18} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      <mesh ref={halo} position={[0, 1.22, .08]} onClick={activate}>
        <torusGeometry args={[1.04, .035, 10, 96]} />
        <meshBasicMaterial ref={haloMaterial} color={color} transparent opacity={.34} depthWrite={false} toneMapped={false} />
      </mesh>
      <mesh position={[-side * 1.02, 1.04, -.08]} rotation={[0, 0, side * -.13]}>
        <capsuleGeometry args={[.055, 1.82, 8, 14]} />
        <meshStandardMaterial color="#183342" emissive={color} emissiveIntensity={.16} roughness={.36} metalness={.52} />
      </mesh>
      <mesh position={[side * 1.02, 1.04, -.08]} rotation={[0, 0, side * .13]}>
        <capsuleGeometry args={[.055, 1.82, 8, 14]} />
        <meshStandardMaterial color="#183342" emissive={color} emissiveIntensity={.16} roughness={.36} metalness={.52} />
      </mesh>
      <MemoryObject kind={spec.kind} color={spec.color} />
      <pointLight position={[0, 1.35, .62]} color={color} intensity={1.55} distance={4.8} decay={2} />
    </group>
  )
}

function SanctuaryDust({ reducedMotion }: { reducedMotion: boolean }) {
  const points = useRef<THREE.Points>(null)
  const positions = useMemo(() => {
    const data = new Float32Array(220 * 3)
    for (let index = 0; index < 220; index += 1) {
      data[index * 3] = (seeded(index, 1) - .5) * 17
      data[index * 3 + 1] = .35 + seeded(index, 2) * 5.1
      data[index * 3 + 2] = -10.2 + seeded(index, 3) * 19.5
    }
    return data
  }, [])
  useFrame((_, delta) => { if (points.current && !reducedMotion) points.current.rotation.y += delta * .0035 })
  return (
    <points ref={points} name="home-sanctuary-memory-dust">
      <bufferGeometry><bufferAttribute attach="attributes-position" args={[positions, 3]} /></bufferGeometry>
      <pointsMaterial color="#d7f6f7" size={.026} sizeAttenuation transparent opacity={.34} depthWrite={false} blending={THREE.AdditiveBlending} />
    </points>
  )
}

export default function HomeSanctuaryWorld({ reducedMotion, walkTarget, playerPosition, onMemoryOpen }: HomeSanctuaryWorldProps) {
  return (
    <group name="home-visible-navigable-sanctuary-world" data-testid="urai-home-visible-world">
      <ArchitecturalShell reducedMotion={reducedMotion} />
      <SanctuaryDust reducedMotion={reducedMotion} />
      {MEMORY_VIGNETTES.map((spec) => (
        <MemoryVignette
          key={spec.id}
          spec={spec}
          reducedMotion={reducedMotion}
          walkTarget={walkTarget}
          playerPosition={playerPosition}
          onMemoryOpen={onMemoryOpen}
        />
      ))}
    </group>
  )
}
