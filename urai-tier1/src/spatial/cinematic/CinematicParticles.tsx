'use client'

import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import { AdditiveBlending, BufferAttribute, BufferGeometry, Points, Vector3 } from 'three'
import { SpatialRenderBudget } from '../visual/aaaMaterials'

function seeded(index: number) {
  const x = Math.sin(index * 127.13) * 10000
  return x - Math.floor(x)
}

type AtmosphericLayer = {
  name: string
  countRatio: number
  radius: number
  height: number
  depth: number
  size: number
  opacity: number
  color: string
  yOffset: number
  rotationSpeed: number
}

const ATMOSPHERIC_LAYERS: AtmosphericLayer[] = [
  {
    name: 'moon-dust',
    countRatio: 0.52,
    radius: 6.4,
    height: 3.2,
    depth: 0.52,
    size: 0.012,
    opacity: 0.42,
    color: '#c7d7ff',
    yOffset: 0.25,
    rotationSpeed: 0.016,
  },
  {
    name: 'low-mist',
    countRatio: 0.34,
    radius: 8.8,
    height: 1.1,
    depth: 0.74,
    size: 0.026,
    opacity: 0.16,
    color: '#8fb7ff',
    yOffset: -0.8,
    rotationSpeed: -0.006,
  },
  {
    name: 'rare-sacred-motes',
    countRatio: 0.14,
    radius: 4.2,
    height: 4.2,
    depth: 0.42,
    size: 0.018,
    opacity: 0.62,
    color: '#e7d59d',
    yOffset: 0.6,
    rotationSpeed: 0.028,
  },
]

function buildLayerGeometry(layer: AtmosphericLayer, totalBudget: number, layerIndex: number, reducedMotion: boolean) {
  const count = Math.max(24, Math.floor(totalBudget * layer.countRatio))
  const positions = new Float32Array(count * 3)
  const seed = new Float32Array(count)

  for (let i = 0; i < count; i += 1) {
    const radius = 1.6 + seeded(i + 7 + layerIndex * 111) * layer.radius
    const angle = seeded(i + 21 + layerIndex * 73) * Math.PI * 2
    const height = -0.9 + seeded(i + 42 + layerIndex * 37) * layer.height

    positions[i * 3] = Math.cos(angle) * radius
    positions[i * 3 + 1] = layer.yOffset + height
    positions[i * 3 + 2] = -3.8 + Math.sin(angle) * radius * layer.depth
    seed[i] = seeded(i + 99 + layerIndex * 131) * Math.PI * 2
  }

  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new BufferAttribute(positions, 3))
  geometry.setAttribute('seed', new BufferAttribute(seed, 1))
  if (!reducedMotion) geometry.computeBoundingSphere()
  return geometry
}

function AtmosphericPoints({
  active,
  reducedMotion,
  layer,
  layerIndex,
  totalBudget,
}: {
  active: boolean
  reducedMotion: boolean
  layer: AtmosphericLayer
  layerIndex: number
  totalBudget: number
}) {
  const ref = useRef<Points>(null)
  const geometry = useMemo(() => buildLayerGeometry(layer, totalBudget, layerIndex, reducedMotion), [layer, layerIndex, reducedMotion, totalBudget])

  useFrame(({ clock }) => {
    if (!ref.current) return
    const t = clock.elapsedTime
    ref.current.visible = active

    if (!reducedMotion) {
      ref.current.rotation.y = t * layer.rotationSpeed
      ref.current.rotation.z = Math.sin(t * 0.11 + layerIndex) * 0.018
    }

    const scale = active ? (reducedMotion ? 1 : 1 + Math.sin(t * 0.7 + layerIndex) * 0.015) : 0.001
    ref.current.scale.lerp(new Vector3(scale, scale, scale), reducedMotion ? 0.12 : 0.045)
  })

  return (
    <points ref={ref} geometry={geometry} position={[0, 0.3, -0.6]} frustumCulled={layer.name !== 'low-mist'}>
      <pointsMaterial
        color={layer.color}
        size={reducedMotion ? layer.size * 1.1 : layer.size}
        transparent
        opacity={reducedMotion ? layer.opacity * 0.72 : layer.opacity}
        depthWrite={false}
        blending={AdditiveBlending}
      />
    </points>
  )
}

export default function CinematicParticles({
  active,
  reducedMotion = false,
  budget,
}: {
  active: boolean
  reducedMotion?: boolean
  budget?: SpatialRenderBudget
}) {
  const particleBudget = budget?.particleBudget ?? (reducedMotion ? 220 : 940)
  const layers = budget?.atmosphereMode === 'minimal' ? ATMOSPHERIC_LAYERS.slice(0, 1) : ATMOSPHERIC_LAYERS

  return (
    <group data-testid="urai-atmospheric-field">
      {layers.map((layer, index) => (
        <AtmosphericPoints
          key={layer.name}
          active={active}
          reducedMotion={reducedMotion}
          layer={layer}
          layerIndex={index}
          totalBudget={particleBudget}
        />
      ))}
    </group>
  )
}
