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
}

const MEMORY_VIGNETTES: MemoryVignetteSpec[] = [
  { id: 'place-loved', kind: 'home', position: [-5.3, 0.02, 3.2], color: '#f6c889', scale: 1 },
  { id: 'ride-home', kind: 'ride', position: [5.25, 0.02, 1.15], color: '#7cecf2', scale: .96 },
  { id: 'voices-dinner', kind: 'family', position: [-5.3, 0.02, -2.25], color: '#c4b5fd', scale: 1 },
  { id: 'song-returned', kind: 'music', position: [5.25, 0.02, -4.25], color: '#f4a8d8', scale: .94 },
  { id: 'quiet-growth', kind: 'tree', position: [-4.55, 0.02, -7.15], color: '#9de4b1', scale: 1.02 },
]

const WALL_BAYS = [5.6, 2.1, -1.4, -4.9, -8.2]
const FLOOR_BAYS = [6.1, 4.6, 3.1, 1.6, .1, -1.4, -2.9, -4.4, -5.9, -7.4]

function approachPoint(spec: MemoryVignetteSpec) {
  const side = Math.sign(spec.position[0]) || 1
  return new THREE.Vector3(spec.position[0] - side * 1.7, 0, spec.position[2] + .2)
}

function ArchitecturalShell() {
  return (
    <group name="home-sanctuary-spatial-architecture">
      <fog attach="fog" args={['#030913', 8, 31]} />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -.11, -1.15]} receiveShadow>
        <planeGeometry args={[18, 20]} />
        <meshStandardMaterial color="#020812" roughness={.72} metalness={.2} />
      </mesh>

      {FLOOR_BAYS.map((z, index) => (
        <group key={z} position={[0, -.045 + index * .002, z]}>
          <mesh receiveShadow>
            <boxGeometry args={[4.15, .09, 1.18]} />
            <meshStandardMaterial color={index % 2 ? '#071723' : '#091d2b'} roughness={.48} metalness={.28} />
          </mesh>
          <mesh position={[0, .052, -.48]}>
            <boxGeometry args={[3.35, .015, .025]} />
            <meshBasicMaterial color={index % 2 ? '#a78bfa' : '#67e8f9'} transparent opacity={.58} toneMapped={false} />
          </mesh>
        </group>
      ))}

      {[-1, 1].map((side) => (
        <group key={side} name={`home-sanctuary-${side < 0 ? 'west' : 'east'}-gallery`}>
          <mesh position={[side * 7.65, 2.35, -1.1]} receiveShadow>
            <boxGeometry args={[.44, 4.8, 19.2]} />
            <meshStandardMaterial color="#06111d" roughness={.66} metalness={.22} />
          </mesh>
          <mesh position={[side * 6.55, 4.62, -1.1]} rotation={[0, 0, side * .22]} receiveShadow>
            <boxGeometry args={[2.25, .24, 19.2]} />
            <meshStandardMaterial color="#081827" roughness={.55} metalness={.34} />
          </mesh>
          {WALL_BAYS.map((z, index) => (
            <group key={z} position={[side * 6.45, 2.12, z]}>
              <mesh castShadow receiveShadow>
                <boxGeometry args={[.46, 4.25, .54]} />
                <meshStandardMaterial color="#0a1b29" emissive={index % 2 ? '#4c3a7d' : '#164d5b'} emissiveIntensity={.11} roughness={.38} metalness={.46} />
              </mesh>
              <mesh position={[-side * .28, 2.02, 0]} rotation={[0, Math.PI / 2, 0]}>
                <ringGeometry args={[.36, .43, 40]} />
                <meshBasicMaterial color={index % 2 ? '#a78bfa' : '#67e8f9'} transparent opacity={.44} toneMapped={false} side={THREE.DoubleSide} />
              </mesh>
              <pointLight position={[-side * .7, 1.25, 0]} color={index % 2 ? '#a78bfa' : '#67e8f9'} intensity={.42} distance={4.2} />
            </group>
          ))}
        </group>
      ))}

      {[-5.3, 5.3].map((x) => (
        <mesh key={x} position={[x, 4.38, -1.15]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[.055, .055, 18.5, 12]} />
          <meshStandardMaterial color="#173144" emissive="#67e8f9" emissiveIntensity={.12} roughness={.35} metalness={.55} />
        </mesh>
      ))}

      {[2.7, 4.9, 7.1].map((radius, index) => (
        <mesh key={radius} position={[0, 5.05 + index * .08, -2.1]} rotation={[Math.PI / 2, 0, index * .08]}>
          <torusGeometry args={[radius, .035, 10, 128]} />
          <meshBasicMaterial color={index % 2 ? '#a78bfa' : '#67e8f9'} transparent opacity={.2 - index * .035} depthWrite={false} toneMapped={false} />
        </mesh>
      ))}

      <mesh position={[0, 2.4, -10.2]} receiveShadow>
        <boxGeometry args={[15.7, 5, .42]} />
        <meshStandardMaterial color="#040b15" roughness={.68} metalness={.22} />
      </mesh>
      <mesh position={[0, 2.25, -9.93]}>
        <ringGeometry args={[1.72, 1.84, 96]} />
        <meshBasicMaterial color="#67e8f9" transparent opacity={.5} toneMapped={false} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 2.25, -9.98]}>
        <circleGeometry args={[1.72, 96]} />
        <meshBasicMaterial color="#071827" transparent opacity={.86} side={THREE.DoubleSide} />
      </mesh>
      <pointLight position={[0, 2.25, -8.7]} color="#67e8f9" intensity={2.2} distance={9} decay={2} />

      <mesh position={[-8.35, 1.35, 2.9]} rotation={[0, .08, 0]}>
        <boxGeometry args={[1.2, 2.7, 7.5]} />
        <meshStandardMaterial color="#020712" roughness={.88} />
      </mesh>
      <mesh position={[8.35, 1.35, -3.9]} rotation={[0, -.08, 0]}>
        <boxGeometry args={[1.2, 2.7, 7.5]} />
        <meshStandardMaterial color="#020712" roughness={.88} />
      </mesh>
    </group>
  )
}

function MemoryObject({ kind, color }: { kind: MemoryKind; color: string }) {
  const material = <meshStandardMaterial color={color} emissive={color} emissiveIntensity={.35} roughness={.36} metalness={.12} />
  if (kind === 'home') return (
    <group position={[0, .8, 0]}>
      <mesh><boxGeometry args={[1.1, .72, .8]} />{material}</mesh>
      <mesh position={[0, .62, 0]} rotation={[0, Math.PI / 4, 0]}><coneGeometry args={[.78, .66, 4]} />{material}</mesh>
      <mesh position={[0, -.12, .42]}><boxGeometry args={[.24, .46, .05]} /><meshStandardMaterial color="#06101a" /></mesh>
    </group>
  )
  if (kind === 'ride') return (
    <group position={[0, .82, 0]}>
      {[-.52, .52].map((x) => <mesh key={x} position={[x, -.22, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[.34, .065, 12, 32]} />{material}</mesh>)}
      <mesh rotation={[0, 0, -.08]}><boxGeometry args={[1.2, .08, .08]} />{material}</mesh>
      <mesh position={[-.16, .3, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[.045, .045, .72, 10]} />{material}</mesh>
    </group>
  )
  if (kind === 'family') return (
    <group position={[0, .66, 0]}>
      {[-.48, 0, .48].map((x, index) => <group key={x} position={[x, index === 1 ? .12 : 0, 0]}>
        <mesh position={[0, .46, 0]}><sphereGeometry args={[.17, 18, 18]} />{material}</mesh>
        <mesh><capsuleGeometry args={[.17, .5, 8, 14]} />{material}</mesh>
      </group>)}
    </group>
  )
  if (kind === 'music') return (
    <group position={[0, .78, 0]}>
      <mesh position={[-.28, -.2, 0]}><sphereGeometry args={[.23, 20, 20]} />{material}</mesh>
      <mesh position={[.28, -.08, 0]}><sphereGeometry args={[.2, 20, 20]} />{material}</mesh>
      <mesh position={[.02, .32, 0]}><boxGeometry args={[.09, 1, .09]} />{material}</mesh>
      <mesh position={[.35, .78, 0]}><boxGeometry args={[.72, .09, .09]} />{material}</mesh>
    </group>
  )
  return (
    <group position={[0, .68, 0]}>
      <mesh><cylinderGeometry args={[.1, .18, 1.1, 12]} /><meshStandardMaterial color="#765844" roughness={.75} /></mesh>
      {[[-.25, .72, 0], [.28, .7, -.04], [0, 1.02, 0], [-.08, 1.28, -.06]].map(([x, y, z], index) => <mesh key={index} position={[x, y, z]}><icosahedronGeometry args={[index === 2 ? .4 : .31, 1]} />{material}</mesh>)}
    </group>
  )
}

function MemoryVignette({ spec, reducedMotion, walkTarget }: {
  spec: MemoryVignetteSpec
  reducedMotion: boolean
  walkTarget: MutableRefObject<THREE.Vector3 | null>
}) {
  const group = useRef<THREE.Group>(null)
  const halo = useRef<THREE.Mesh>(null)
  const color = useMemo(() => new THREE.Color(spec.color), [spec.color])

  useFrame(({ clock }, delta) => {
    if (!group.current || !halo.current) return
    const pulse = reducedMotion ? 1 : 1 + Math.sin(clock.elapsedTime * .55 + spec.position[0]) * .018
    group.current.scale.setScalar(THREE.MathUtils.damp(group.current.scale.x, spec.scale * pulse, 5, delta))
    if (!reducedMotion) halo.current.rotation.z += delta * .06
  })

  const approach = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation()
    walkTarget.current = approachPoint(spec)
  }

  const side = Math.sign(spec.position[0]) || 1
  return (
    <group ref={group} position={spec.position} name={`home-memory-vignette-${spec.id}`}>
      <mesh position={[0, 1.35, 0]} onClick={approach}>
        <boxGeometry args={[2.35, 2.7, 2.25]} />
        <meshPhysicalMaterial color="#07131f" emissive={color} emissiveIntensity={.08} roughness={.32} metalness={.26} transparent opacity={.94} />
      </mesh>
      <mesh position={[-side * 1.14, 1.35, 0]} onClick={approach}>
        <boxGeometry args={[.12, 2.7, 2.25]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={.3} roughness={.3} metalness={.45} />
      </mesh>
      <mesh position={[0, .04, 0]} receiveShadow>
        <cylinderGeometry args={[1.02, 1.18, .1, 48]} />
        <meshStandardMaterial color="#0a1b27" emissive={color} emissiveIntensity={.12} roughness={.42} metalness={.36} />
      </mesh>
      <mesh ref={halo} position={[0, 1.25, .92]} rotation={[0, 0, Math.PI / 2]} onClick={approach}>
        <torusGeometry args={[.92, .035, 10, 80]} />
        <meshBasicMaterial color={color} transparent opacity={.62} toneMapped={false} />
      </mesh>
      <MemoryObject kind={spec.kind} color={spec.color} />
      <pointLight position={[0, 1.55, .5]} color={color} intensity={2.2} distance={6} decay={2} />
    </group>
  )
}

function SanctuaryDust({ reducedMotion }: { reducedMotion: boolean }) {
  const points = useRef<THREE.Points>(null)
  const positions = useMemo(() => {
    const data = new Float32Array(180 * 3)
    for (let index = 0; index < 180; index += 1) {
      data[index * 3] = (Math.random() - .5) * 16
      data[index * 3 + 1] = .25 + Math.random() * 4.4
      data[index * 3 + 2] = -10 + Math.random() * 19
    }
    return data
  }, [])
  useFrame((_, delta) => { if (points.current && !reducedMotion) points.current.rotation.y += delta * .006 })
  return (
    <points ref={points} name="home-sanctuary-memory-dust">
      <bufferGeometry><bufferAttribute attach="attributes-position" args={[positions, 3]} /></bufferGeometry>
      <pointsMaterial color="#d9fbff" size={.028} sizeAttenuation transparent opacity={.42} depthWrite={false} blending={THREE.AdditiveBlending} />
    </points>
  )
}

function SanctuaryArchitecture() {
  return <ArchitecturalShell />
}

export default function HomeSanctuaryWorld({ reducedMotion, walkTarget }: HomeSanctuaryWorldProps) {
  return (
    <group name="home-visible-navigable-sanctuary-world" data-testid="urai-home-visible-world">
      <SanctuaryArchitecture />
      <SanctuaryDust reducedMotion={reducedMotion} />
      {MEMORY_VIGNETTES.map((spec) => <MemoryVignette key={spec.id} spec={spec} reducedMotion={reducedMotion} walkTarget={walkTarget} />)}
    </group>
  )
}
