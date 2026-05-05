'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame, useLoader } from '@react-three/fiber'
import { TextureLoader, VideoTexture, DoubleSide, Mesh } from 'three'
import { GLTFLoader } from 'three-stdlib'
import { SpatialAssetManifest, isSpatialAssetManifest } from './manifestTypes'

function AuraRing() {
  const ref = useRef<Mesh>(null)

  useFrame(({ clock }) => {
    if (!ref.current) return
    const pulse = 1 + Math.sin(clock.elapsedTime * 2.4) * 0.06
    ref.current.scale.setScalar(pulse)
    ref.current.rotation.z = clock.elapsedTime * 0.18
  })

  return (
    <mesh ref={ref} position={[0, 1.5, -2.06]}>
      <ringGeometry args={[1.48, 1.62, 96]} />
      <meshBasicMaterial color="#8b5cf6" transparent opacity={0.38} side={DoubleSide} />
    </mesh>
  )
}

function ImageOverlay({ url }: { url: string }) {
  const texture = useLoader(TextureLoader, url)
  const ref = useRef<Mesh>(null)

  useFrame(({ clock }) => {
    if (!ref.current) return
    const t = Math.min(clock.elapsedTime / 1.1, 1)
    ref.current.scale.setScalar(0.82 + t * 0.18)
    ref.current.position.y = 1.5 + Math.sin(clock.elapsedTime * 1.1) * 0.025
  })

  return (
    <group>
      <AuraRing />
      <mesh ref={ref} position={[0, 1.5, -2]}>
        <planeGeometry args={[2.15, 2.15]} />
        <meshBasicMaterial map={texture} toneMapped={false} side={DoubleSide} />
      </mesh>
    </group>
  )
}

function VideoPanel({ url }: { url: string }) {
  const [texture, setTexture] = useState<VideoTexture | null>(null)
  const ref = useRef<Mesh>(null)

  useEffect(() => {
    const video = document.createElement('video')
    video.src = url
    video.crossOrigin = 'anonymous'
    video.loop = true
    video.muted = true
    video.playsInline = true
    void video.play().catch(() => undefined)

    const nextTexture = new VideoTexture(video)
    setTexture(nextTexture)

    return () => {
      video.pause()
      nextTexture.dispose()
    }
  }, [url])

  useFrame(({ clock }) => {
    if (!ref.current) return
    ref.current.rotation.y = Math.sin(clock.elapsedTime * 0.6) * 0.04
  })

  if (!texture) return null

  return (
    <group>
      <AuraRing />
      <mesh ref={ref} position={[0, 1.5, -2]}>
        <planeGeometry args={[2.4, 1.35]} />
        <meshBasicMaterial map={texture} toneMapped={false} side={DoubleSide} />
      </mesh>
    </group>
  )
}

function ModelPanel({ url }: { url: string }) {
  const gltf = useLoader(GLTFLoader, url)
  const ref = useRef<any>(null)

  useFrame(({ clock }) => {
    if (!ref.current) return
    ref.current.rotation.y = clock.elapsedTime * 0.28
    ref.current.position.y = 1.15 + Math.sin(clock.elapsedTime * 1.2) * 0.04
  })

  return <primitive ref={ref} object={gltf.scene} position={[0, 1.15, -2]} scale={0.85} />
}

function ManifestHud({ manifest }: { manifest: SpatialAssetManifest }) {
  return (
    <group position={[-1.45, 2.65, -2]}>
      <mesh>
        <planeGeometry args={[0.62, 0.08]} />
        <meshBasicMaterial color="#22d3ee" transparent opacity={0.45} />
      </mesh>
    </group>
  )
}

export default function ManifestRenderer({ manifest }: { manifest: SpatialAssetManifest | null }) {
  if (!manifest || !isSpatialAssetManifest(manifest)) return null

  const asset = manifest.artifacts[0]
  if (!asset) return null

  return (
    <group>
      <ManifestHud manifest={manifest} />
      {asset.mimeType.startsWith('image/') ? <ImageOverlay url={asset.url} /> : null}
      {asset.mimeType.startsWith('video/') ? <VideoPanel url={asset.url} /> : null}
      {asset.mimeType.includes('gltf') || asset.mimeType.includes('glb') || asset.type === 'model3d' ? (
        <ModelPanel url={asset.url} />
      ) : null}
    </group>
  )
}
