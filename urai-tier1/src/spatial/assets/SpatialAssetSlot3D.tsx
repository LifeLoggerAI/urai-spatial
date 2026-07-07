'use client'

import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { getUraiSpatialAsset, getUraiSpatialFallbackAsset, type UraiSpatialAssetManifestEntry } from './assetManifest'

type Vec3 = readonly [number, number, number]

export interface SpatialAssetSlot3DProps {
  readonly assetId: string
  readonly position?: Vec3
  readonly rotation?: Vec3
  readonly scale?: number | Vec3
  readonly reducedMotion?: boolean
}

function PortalFallback({ reducedMotion = false }: { readonly reducedMotion?: boolean }) {
  const group = useRef<THREE.Group>(null)
  useFrame(({ clock }) => {
    if (!group.current || reducedMotion) return
    group.current.rotation.z = clock.elapsedTime * 0.07
  })
  return (
    <group ref={group}>
      <mesh>
        <torusGeometry args={[1.15, 0.035, 18, 144]} />
        <meshStandardMaterial color="#07111f" emissive="#67e8f9" emissiveIntensity={2.2} roughness={0.28} metalness={0.42} />
      </mesh>
      <mesh scale={1.18}>
        <torusGeometry args={[1.15, 0.018, 18, 144]} />
        <meshBasicMaterial color="#a78bfa" transparent opacity={0.28} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
    </group>
  )
}

function GroundFallback() {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[6.8, 160]} />
        <meshStandardMaterial color="#061425" roughness={0.86} metalness={0.12} emissive="#0b2a3f" emissiveIntensity={0.28} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.035, 0]}>
        <ringGeometry args={[1.55, 6.45, 192]} />
        <meshBasicMaterial color="#67e8f9" transparent opacity={0.08} depthWrite={false} blending={THREE.AdditiveBlending} side={THREE.DoubleSide} />
      </mesh>
    </group>
  )
}

function StarfieldFallback({ reducedMotion = false }: { readonly reducedMotion?: boolean }) {
  const points = useRef<THREE.Points>(null)
  const geometry = useMemo(() => {
    const count = 420
    const positions = new Float32Array(count * 3)
    for (let i = 0; i < count; i += 1) {
      const radius = 5 + (i % 89) * 0.12
      const angle = i * 2.399963
      positions[i * 3] = Math.cos(angle) * radius
      positions[i * 3 + 1] = -0.4 + ((i * 31) % 180) / 24
      positions[i * 3 + 2] = Math.sin(angle) * radius - 1.8
    }
    const result = new THREE.BufferGeometry()
    result.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    return result
  }, [])
  useFrame(({ clock }) => {
    if (!points.current || reducedMotion) return
    points.current.rotation.y = clock.elapsedTime * 0.018
  })
  return (
    <points ref={points} geometry={geometry}>
      <pointsMaterial size={0.034} color="#bae6fd" transparent opacity={0.5} depthWrite={false} blending={THREE.AdditiveBlending} />
    </points>
  )
}

function ChamberFallback() {
  return (
    <group>
      {[0, 1, 2, 3, 4, 5].map((index) => {
        const angle = (index / 6) * Math.PI * 2
        return (
          <mesh key={index} position={[Math.cos(angle) * 3.2, 0.78, Math.sin(angle) * 3.2]} castShadow>
            <cylinderGeometry args={[0.06, 0.1, 1.8, 18]} />
            <meshStandardMaterial color="#07111f" emissive="#67e8f9" emissiveIntensity={0.58} roughness={0.32} metalness={0.38} />
          </mesh>
        )
      })}
      <mesh position={[0, 1.35, 0]}>
        <sphereGeometry args={[0.42, 48, 48]} />
        <meshStandardMaterial color="#07111f" emissive="#8b5cf6" emissiveIntensity={2.35} roughness={0.14} metalness={0.18} />
      </mesh>
    </group>
  )
}

function GenericFallback() {
  return (
    <mesh>
      <icosahedronGeometry args={[0.8, 2]} />
      <meshStandardMaterial color="#07111f" emissive="#67e8f9" emissiveIntensity={1.15} roughness={0.32} metalness={0.22} />
    </mesh>
  )
}

function pickFallback(asset: UraiSpatialAssetManifestEntry, reducedMotion: boolean) {
  if (asset.id.includes('portal')) return <PortalFallback reducedMotion={reducedMotion} />
  if (asset.id.includes('ground')) return <GroundFallback />
  if (asset.id.includes('starfield') || asset.id.includes('life-map')) return <StarfieldFallback reducedMotion={reducedMotion} />
  if (asset.id.includes('chamber') || asset.id.includes('home-entry')) return <ChamberFallback />
  return <GenericFallback />
}

export function SpatialAssetSlot3D({ assetId, position = [0, 0, 0], rotation = [0, 0, 0], scale = 1, reducedMotion = false }: SpatialAssetSlot3DProps) {
  const asset = getUraiSpatialAsset(assetId)
  const fallback = getUraiSpatialFallbackAsset(assetId)
  const renderAsset = fallback ?? asset

  return <group position={position} rotation={rotation} scale={scale}>{renderAsset ? pickFallback(renderAsset, reducedMotion) : <GenericFallback />}</group>
}

export default SpatialAssetSlot3D
