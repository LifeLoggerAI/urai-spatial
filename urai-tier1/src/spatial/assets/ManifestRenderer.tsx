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

function FallbackPanel({ label = 'Memory asset unavailable' }: { label?: string }) {
  const ref = useRef<Mesh>(null)

  useFrame(({ clock }) => {
    if (!ref.current) return
    ref.current.rotation.z = Math.sin(clock.elapsedTime * 0.7) * 0.025
    ref.current.position.y = 1.5 + Math.sin(clock.elapsedTime * 0.85) * 0.025
  })

  return (
    <group>
      <AuraRing />
      <mesh ref={ref} position={[0, 1.5, -2]}>
        <planeGeometry args={[2.2, 1.34]} />
        <meshBasicMaterial color="#172554" transparent opacity={0.76} side={DoubleSide} />
      </mesh>
      <mesh position={[0, 1.5, -1.99]}>
        <planeGeometry args={[1.54, 0.08]} />
        <meshBasicMaterial color="#67e8f9" transparent opacity={0.55} side={DoubleSide} />
      </mesh>
      <mesh position={[0, 1.32, -1.99]}>
        <planeGeometry args={[1.12, 0.055]} />
        <meshBasicMaterial color="#a78bfa" transparent opacity={0.42} side={DoubleSide} />
      </mesh>
    </group>
  )
}

function SafeImageOverlay({ url }: { url: string }) {
  const [failed, setFailed] = useState(false)
  const texture = useLoader(TextureLoader, url, undefined, () => setFailed(true))
  const ref = useRef<Mesh>(null)

  useFrame(({ clock }) => {
    if (!ref.current) return
    const t = Math.min(clock.elapsedTime / 1.1, 1)
    ref.current.scale.setScalar(0.82 + t * 0.18)
    ref.current.position.y = 1.5 + Math.sin(clock.elapsedTime * 1.1) * 0.025
  })

  if (failed || !texture) return <FallbackPanel label="Image unavailable" />

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

function SafeVideoPanel({ url }: { url: string }) {
  const [texture, setTexture] = useState<VideoTexture | null>(null)
  const [failed, setFailed] = useState(false)
  const ref = useRef<Mesh>(null)

  useEffect(() => {
    const video = document.createElement('video')
    video.src = url
    video.crossOrigin = 'anonymous'
    video.loop = true
    video.muted = true
    video.playsInline = true

    const onError = () => setFailed(true)
    video.addEventListener('error', onError)

    void video.play().catch(() => {
      // Autoplay can fail on some devices; keep the fallback safe instead of breaking render.
      setFailed(true)
    })

    const nextTexture = new VideoTexture(video)
    setTexture(nextTexture)

    return () => {
      video.removeEventListener('error', onError)
      video.pause()
      nextTexture.dispose()
    }
  }, [url])

  useFrame(({ clock }) => {
    if (!ref.current) return
    ref.current.rotation.y = Math.sin(clock.elapsedTime * 0.6) * 0.04
  })

  if (failed || !texture) return <FallbackPanel label="Video unavailable" />

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

function SafeModelPanel({ url }: { url: string }) {
  const [failed, setFailed] = useState(false)
  const gltf = useLoader(GLTFLoader, url, undefined, () => setFailed(true))
  const ref = useRef<any>(null)

  useFrame(({ clock }) => {
    if (!ref.current) return
    ref.current.rotation.y = clock.elapsedTime * 0.28
    ref.current.position.y = 1.15 + Math.sin(clock.elapsedTime * 1.2) * 0.04
  })

  if (failed || !gltf?.scene) return <FallbackPanel label="3D model unavailable" />

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

function isSafeAssetUrl(url: string) {
  if (!url) return false
  if (url.startsWith('gs://')) return false
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'https:' || parsed.protocol === 'http:'
  } catch {
    return false
  }
}

export default function ManifestRenderer({ manifest }: { manifest: SpatialAssetManifest | null }) {
  if (!manifest || !isSpatialAssetManifest(manifest)) return null

  const asset = manifest.artifacts[0]
  if (!asset) return <FallbackPanel label="No asset attached" />
  if (!isSafeAssetUrl(asset.url)) return <FallbackPanel label="Asset URL unavailable" />

  const isImage = asset.mimeType.startsWith('image/')
  const isVideo = asset.mimeType.startsWith('video/')
  const isModel = asset.mimeType.includes('gltf') || asset.mimeType.includes('glb') || asset.type === 'model3d'

  return (
    <group>
      <ManifestHud manifest={manifest} />
      {isImage ? <SafeImageOverlay url={asset.url} /> : null}
      {isVideo ? <SafeVideoPanel url={asset.url} /> : null}
      {isModel ? <SafeModelPanel url={asset.url} /> : null}
      {!isImage && !isVideo && !isModel ? <FallbackPanel label="Unsupported asset type" /> : null}
    </group>
  )
}
