'use client'

import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { resolveReadyUraiSensoryAssetPath } from '../assets/sensoryAssetManifest'

type MaterialPack = {
  materials?: {
    portalEnergy?: { baseColor?: string; emissive?: string; emissiveIntensity?: number }
    memoryViolet?: { baseColor?: string; emissive?: string; emissiveIntensity?: number }
  }
}

type LoadingSequence = { durationMs?: number }

type ReadySensoryPaths = {
  materialPath: string
  particlePath: string
  loadingPath: string
}

const DEFAULT_PARTICLE_COLOR = '#7b42ff'
const DEFAULT_PORTAL_COLOR = '#00d9ff'
const DEFAULT_LOADING_DURATION_MS = 2200

function ReadySpatialSensoryLayer({ materialPath, particlePath, loadingPath }: ReadySensoryPaths) {
  const points = useRef<THREE.Points>(null)
  const loadingRing = useRef<THREE.Mesh>(null)
  const [particleTexture, setParticleTexture] = useState<THREE.Texture | null>(null)
  const [particleColor, setParticleColor] = useState(DEFAULT_PARTICLE_COLOR)
  const [portalColor, setPortalColor] = useState(DEFAULT_PORTAL_COLOR)
  const [loadingDurationMs, setLoadingDurationMs] = useState(DEFAULT_LOADING_DURATION_MS)

  const geometry = useMemo(() => {
    const positions = new Float32Array(144 * 3)
    for (let index = 0; index < 144; index += 1) {
      const radius = 3.2 + (index % 19) * 0.18
      const angle = index * 2.399963
      positions[index * 3] = Math.cos(angle) * radius
      positions[index * 3 + 1] = -0.4 + ((index * 11) % 72) / 16
      positions[index * 3 + 2] = Math.sin(angle) * radius
    }
    const next = new THREE.BufferGeometry()
    next.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    return next
  }, [])

  useEffect(() => {
    let active = true
    const controller = new AbortController()
    const { signal } = controller
    const loader = new THREE.TextureLoader()
    const texture = loader.load(
      particlePath,
      (loaded) => {
        loaded.colorSpace = THREE.SRGBColorSpace
        loaded.needsUpdate = true
        if (!active) {
          loaded.dispose()
          return
        }
        setParticleTexture(loaded)
      },
      undefined,
      () => {
        if (active) setParticleTexture(null)
      },
    )

    fetch(materialPath, { signal })
      .then((response) => response.ok
        ? response.json() as Promise<MaterialPack | null>
        : Promise.reject(new Error('material pack unavailable')))
      .then((materialPack) => {
        if (!active) return
        setParticleColor(materialPack?.materials?.memoryViolet?.baseColor ?? DEFAULT_PARTICLE_COLOR)
        setPortalColor(materialPack?.materials?.portalEnergy?.emissive ?? DEFAULT_PORTAL_COLOR)
      })
      .catch(() => {
        if (!active) return
        setParticleColor(DEFAULT_PARTICLE_COLOR)
        setPortalColor(DEFAULT_PORTAL_COLOR)
      })

    fetch(loadingPath, { signal })
      .then((response) => response.ok
        ? response.json() as Promise<LoadingSequence | null>
        : Promise.reject(new Error('loading sequence unavailable')))
      .then((loadingSequence) => {
        if (!active) return
        const duration = loadingSequence?.durationMs
        setLoadingDurationMs(
          typeof duration === 'number' && duration > 0
            ? duration
            : DEFAULT_LOADING_DURATION_MS,
        )
      })
      .catch(() => {
        if (!active) return
        setLoadingDurationMs(DEFAULT_LOADING_DURATION_MS)
      })

    return () => {
      active = false
      controller.abort()
      texture.dispose()
    }
  }, [loadingPath, materialPath, particlePath])

  useEffect(() => () => geometry.dispose(), [geometry])

  useFrame(({ clock }) => {
    if (points.current) points.current.rotation.y = clock.elapsedTime * 0.018
    if (loadingRing.current) {
      const progress = Math.min(1, (clock.elapsedTime * 1000) / loadingDurationMs)
      loadingRing.current.scale.setScalar(0.7 + progress * 0.45)
      const material = loadingRing.current.material as THREE.MeshBasicMaterial
      material.opacity = Math.max(0, 0.34 * (1 - progress))
      loadingRing.current.visible = progress < 1
    }
  })

  return (
    <group
      name="urai-promoted-sensory-layer"
      data-urai-material-pack={materialPath}
      data-urai-particle-atlas={particlePath}
      data-urai-loading-sequence={loadingPath}
      data-urai-fallback="procedural"
    >
      <points ref={points} geometry={geometry}>
        <pointsMaterial
          map={particleTexture ?? undefined}
          size={0.42}
          color={particleColor}
          transparent
          opacity={0.34}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>
      <mesh ref={loadingRing} rotation={[Math.PI / 2, 0, 0]} position={[0, -0.72, 0]}>
        <ringGeometry args={[1.2, 1.34, 96]} />
        <meshBasicMaterial color={portalColor} transparent opacity={0.34} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
    </group>
  )
}

export default function SpatialSensoryLayer() {
  const materialPath = resolveReadyUraiSensoryAssetPath('materials')
  const particlePath = resolveReadyUraiSensoryAssetPath('particles')
  const loadingPath = resolveReadyUraiSensoryAssetPath('loading')

  if (!materialPath || !particlePath || !loadingPath) return null

  return (
    <ReadySpatialSensoryLayer
      key={`${materialPath}|${particlePath}|${loadingPath}`}
      materialPath={materialPath}
      particlePath={particlePath}
      loadingPath={loadingPath}
    />
  )
}
