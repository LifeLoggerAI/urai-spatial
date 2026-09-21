'use client'

import { useMemo } from 'react'
import * as THREE from 'three'
import type { OrbState } from '@/app/home/orbStateController'
import { height } from './HomeWorldProductionV223Geometry'

type V3 = [number, number, number]

const STONE = '#5f635b'
const STONE_DARK = '#343b37'
const TIMBER = '#5a4535'
const TIMBER_LIGHT = '#8a6d52'
const FABRIC = '#8b806f'
const GREEN = '#4c5f51'

function Box({
  name,
  position,
  scale,
  color,
  roughness = .82,
  metalness = 0,
  rotation = [0, 0, 0],
}: {
  name: string
  position: V3
  scale: V3
  color: string
  roughness?: number
  metalness?: number
  rotation?: V3
}) {
  return (
    <mesh name={name} position={position} scale={scale} rotation={rotation} castShadow receiveShadow>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color={color} roughness={roughness} metalness={metalness} />
    </mesh>
  )
}

function TimberFrame() {
  const posts = useMemo(() => [
    [-4.15, 3.4], [4.15, 3.4], [-4.15, .3], [4.15, .3], [-4.15, -2.75], [4.15, -2.75],
  ] as Array<[number, number]>, [])

  return (
    <group name="home-current-inhabited-timber-frame">
      {posts.map(([x, z], index) => {
        const floor = height(x, z)
        return (
          <Box
            key={index}
            name={`home-current-timber-post-${index + 1}`}
            position={[x, floor + 1.82, z]}
            scale={[.19, 3.7, .19]}
            color={index % 2 ? TIMBER_LIGHT : TIMBER}
            roughness={.86}
          />
        )
      })}
      <Box name="home-current-beam-left" position={[-4.15, 3.08, .3]} scale={[.22, .22, 6.35]} color={TIMBER} roughness={.84} />
      <Box name="home-current-beam-right" position={[4.15, 3.08, .3]} scale={[.22, .22, 6.35]} color={TIMBER} roughness={.84} />
      <Box name="home-current-beam-back" position={[0, 3.08, 3.4]} scale={[8.45, .22, .22]} color={TIMBER} roughness={.84} />
      {[-3.3, -2.2, -1.1, 0, 1.1, 2.2, 3.3].map((x, index) => (
        <Box key={x} name={`home-current-roof-slat-${index + 1}`} position={[x, 3.28, .28]} scale={[.13, .13, 6.15]} color={TIMBER_LIGHT} roughness={.86} />
      ))}
    </group>
  )
}

function GlazedLivingWall() {
  const y = height(-4.05, 1.0) + 1.38
  return (
    <group name="home-current-glazed-living-wall">
      {[-1.7, .05, 1.8].map((z, index) => (
        <mesh key={z} name={`home-current-window-${index + 1}`} position={[-4.08, y, z]} rotation={[0, Math.PI / 2, 0]} receiveShadow>
          <planeGeometry args={[1.55, 2.4]} />
          <meshPhysicalMaterial
            color="#a9c1bd"
            roughness={.14}
            metalness={0}
            transmission={.52}
            transparent
            opacity={.32}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
      ))}
      <Box name="home-current-window-sill" position={[-4.0, height(-4, .05) + .18, .05]} scale={[.28, .18, 5.7]} color={STONE_DARK} roughness={.94} />
    </group>
  )
}

function HearthAndShelving() {
  const floor = height(3.65, 1.0)
  return (
    <group name="home-current-hearth-and-shelving">
      <Box name="home-current-hearth-mass" position={[3.58, floor + .72, 1.0]} scale={[.9, 1.5, 2.1]} color={STONE_DARK} roughness={.96} />
      <Box name="home-current-hearth-opening" position={[3.08, floor + .66, 1.0]} scale={[.08, .72, .9]} color="#131816" roughness={1} />
      <mesh name="home-current-hearth-coals" position={[3.0, floor + .34, 1.0]} rotation={[0, 0, Math.PI / 2]}>
        <planeGeometry args={[.58, .5]} />
        <meshStandardMaterial color="#7b4b35" emissive="#b86f45" emissiveIntensity={.34} roughness={.92} side={THREE.DoubleSide} />
      </mesh>
      <pointLight position={[2.72, floor + .7, 1.0]} color="#e3aa78" intensity={.58} distance={3.6} decay={2} />
      {[.15, .88, 1.61].map((dy, index) => (
        <Box key={dy} name={`home-current-shelf-${index + 1}`} position={[3.12, floor + dy + .4, -1.0]} scale={[1.25, .08, .38]} color={TIMBER_LIGHT} roughness={.84} />
      ))}
      {[
        [2.82, floor + .72, -1.0],
        [3.08, floor + 1.45, -1.0],
        [3.33, floor + 2.18, -1.0],
      ].map((position, index) => (
        <mesh key={index} name={`home-current-quiet-object-${index + 1}`} position={position as V3} castShadow>
          <cylinderGeometry args={[.09 + index * .015, .11 + index * .012, .26 + index * .04, 18]} />
          <meshStandardMaterial color={index === 1 ? '#6f766b' : '#88745f'} roughness={.88} />
        </mesh>
      ))}
    </group>
  )
}

function LivingFurniture() {
  const leftFloor = height(-1.65, 1.25)
  const rightFloor = height(1.25, .75)
  return (
    <group name="home-current-inhabited-furniture">
      <Box name="home-current-bench-seat" position={[-1.65, leftFloor + .43, 1.2]} scale={[2.15, .22, .72]} color={TIMBER} roughness={.9} rotation={[0, .08, 0]} />
      <Box name="home-current-bench-back" position={[-1.74, leftFloor + .86, 1.5]} scale={[2.15, .72, .16]} color={TIMBER_DARK} roughness={.9} rotation={[0, .08, 0]} />
      <Box name="home-current-bench-cushion" position={[-1.65, leftFloor + .58, 1.17]} scale={[1.96, .14, .62]} color={FABRIC} roughness={.98} rotation={[0, .08, 0]} />
      <mesh name="home-current-woven-rug" position={[.1, rightFloor + .045, .78]} rotation={[-Math.PI / 2, 0, -.06]} receiveShadow>
        <planeGeometry args={[3.7, 2.15, 1, 1]} />
        <meshStandardMaterial color="#746b5e" roughness={1} side={THREE.DoubleSide} />
      </mesh>
      <Box name="home-current-low-table" position={[.55, rightFloor + .38, .65]} scale={[1.55, .12, .78]} color={TIMBER_LIGHT} roughness={.9} rotation={[0, -.08, 0]} />
      {[-.52, .52].map((x, index) => (
        <Box key={x} name={`home-current-table-leg-${index + 1}`} position={[.55 + x, rightFloor + .18, .65]} scale={[.12, .4, .52]} color={TIMBER} roughness={.92} rotation={[0, -.08, 0]} />
      ))}
      <mesh name="home-current-table-vessel" position={[.48, rightFloor + .58, .62]} castShadow>
        <cylinderGeometry args={[.11, .15, .22, 24]} />
        <meshStandardMaterial color={GREEN} roughness={.8} />
      </mesh>
      <pointLight name="home-current-warm-reading-light" position={[-2.45, leftFloor + 2.0, 1.7]} color="#efc58f" intensity={.48} distance={4.2} decay={2} />
      <mesh name="home-current-reading-lamp" position={[-2.45, leftFloor + 1.75, 1.7]} castShadow>
        <cylinderGeometry args={[.08, .22, .34, 28, 1, true]} />
        <meshStandardMaterial color="#a49379" emissive="#c99d6b" emissiveIntensity={.12} roughness={.78} side={THREE.DoubleSide} />
      </mesh>
    </group>
  )
}

const TIMBER_DARK = '#3b3028'

function StoneThreshold() {
  return (
    <group name="home-current-stone-threshold">
      <Box name="home-current-back-wall-left" position={[-2.85, 1.12, 3.55]} scale={[2.55, 3.1, .28]} color={STONE} roughness={.96} />
      <Box name="home-current-back-wall-right" position={[2.85, 1.12, 3.55]} scale={[2.55, 3.1, .28]} color={STONE} roughness={.96} />
      <Box name="home-current-back-wall-header" position={[0, 2.6, 3.55]} scale={[3.15, .34, .28]} color={STONE_DARK} roughness={.95} />
      <Box name="home-current-entry-ledge" position={[0, height(0, 3.42) + .06, 3.42]} scale={[3.0, .1, .72]} color="#706759" roughness={.98} />
    </group>
  )
}

/**
 * Current architectural repair stays inside the existing Home owner. It does
 * not introduce a second Home runtime or change destination ownership.
 *
 * The pavilion is deliberately open toward the winding Home terrain and broad
 * sky so Home remains one continuous lived world. Stone, timber, glazing,
 * seating, shelving, a low table, woven floor textile and restrained practical
 * light make the opening read as an inhabited threshold rather than an outdoor
 * canyon or portal lobby. Objects are generic/non-autobiographical.
 */
export function HomeCurrentArtRepair(_props: {
  orbState: OrbState
  reducedMotion: boolean
  onOrb: () => void
  onGround: () => void
  onLifeMap: () => void
}) {
  return (
    <group
      name="home-current-inhabited-architectural-repair"
      userData={{
        visualAuthority: 'same-world-inhabited-home-threshold-v1',
        autobiographical: false,
        portal: false,
        destinationOwner: 'existing-home-world',
      }}
    >
      <StoneThreshold />
      <TimberFrame />
      <GlazedLivingWall />
      <HearthAndShelving />
      <LivingFurniture />
    </group>
  )
}
