'use client'

import { useTexture } from '@react-three/drei'
import { useFrame, useLoader } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { resolveReadyUraiSensoryAssetPath } from '../assets/sensoryAssetManifest'

type MaterialPack = {
  materials: {
    portalEnergy: { baseColor: string; emissive: string; emissiveIntensity: number }
    memoryViolet: { baseColor: string; emissive: string; emissiveIntensity: number }
  }
}

type LoadingSequence = { durationMs: number }

type PromotedSpatialSensoryLayerProps = {
  materialPath: string
  particlePath: string
  loadingPath: string
}

function PromotedSpatialSensoryLayer({
  materialPath,
  particlePath,
  loadingPath,
}: PromotedSpatialSensoryLayerProps) {
  const points = useRef<THREE.Points>(null)
  const loadingRing = useRef<THREE.Mesh>(null)
  const particleTexture = useTexture(particlePath)
  const materialSource = useLoader(THREE.FileLoader, materialPath) as string
  const loadingSource = useLoader(THREE.FileLoader, loadingPath) as string
  const materialPack = useMemo(() => JSON.parse(materialSource) as MaterialPack, [materialSource])
  const loadingSequence = useMemo(() => JSON.parse(loadingSource) as LoadingSequence, [loadingSource])
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

  useEffect(() => () => geometry.dispose(), [geometry])

  useFrame(({ clock }) => {
    if (points.current) points.current.rotation.y = clock.elapsedTime * 0.018
    if (loadingRing.current) {
      const progress = Math.min(1, (clock.elapsedTime * 1000) / loadingSequence.durationMs)
      loadingRing.current.scale.setScalar(0.7 + progress * 0.45)
      const material = loadingRing.current.material as THREE.MeshBasicMaterial
      material.opacity = Math.max(0, 0.34 * (1 - progress))
      loadingRing.current.visible = progress < 1
    }
  })

  return (
    <group name="urai-promoted-sensory-layer" data-urai-material-pack={materialPath} data-urai-particle-atlas={particlePath} data-urai-loading-sequence={loadingPath}>
      <points ref={points} geometry={geometry}>
        <pointsMaterial map={particleTexture} size={0.42} color={materialPack.materials.memoryViolet.baseColor} transparent opacity={0.34} depthWrite={false} blending={THREE.AdditiveBlending} />
      </points>
      <mesh ref={loadingRing} rotation={[Math.PI / 2, 0, 0]} position={[0, -0.72, 0]}>
        <ringGeometry args={[1.2, 1.34, 96]} />
        <meshBasicMaterial color={materialPack.materials.portalEnergy.emissive} transparent opacity={0.34} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
    </group>
  )
}

export default function SpatialSensoryLayer() {
  const materialPath = resolveReadyUraiSensoryAssetPath('materials')
  const particlePath = resolveReadyUraiSensoryAssetPath('particles')
  const loadingPath = resolveReadyUraiSensoryAssetPath('loading')

  if (!materialPath || !particlePath || !loadingPath) {
    return null
  }

  return (
    <PromotedSpatialSensoryLayer
      materialPath={materialPath}
      particlePath={particlePath}
      loadingPath={loadingPath}
    />
  )
}
