'use client'

import { useEffect, useState } from 'react'
import { useLoader } from '@react-three/fiber'
import { TextureLoader } from 'three'
import { SpatialAssetManifest, isSpatialAssetManifest } from './manifestTypes'

function ImageOverlay({ url }: { url: string }) {
  const texture = useLoader(TextureLoader, url)
  return (
    <mesh position={[0, 1.5, -2]}>
      <planeGeometry args={[2, 2]} />
      <meshBasicMaterial map={texture} />
    </mesh>
  )
}

function VideoPanel({ url }: { url: string }) {
  return (
    <mesh position={[0, 1.5, -2]}>
      <planeGeometry args={[2, 2]} />
      <meshBasicMaterial>
        {/* placeholder – video texture wiring later */}
      </meshBasicMaterial>
    </mesh>
  )
}

export default function ManifestRenderer({ manifest }: { manifest: SpatialAssetManifest | null }) {
  if (!manifest || !isSpatialAssetManifest(manifest)) return null

  const asset = manifest.artifacts[0]
  if (!asset) return null

  if (asset.mimeType.startsWith('image/')) {
    return <ImageOverlay url={asset.url} />
  }

  if (asset.mimeType.startsWith('video/')) {
    return <VideoPanel url={asset.url} />
  }

  return null
}
