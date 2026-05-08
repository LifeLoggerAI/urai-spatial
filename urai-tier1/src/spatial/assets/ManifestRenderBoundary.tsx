'use client'

import { Component, ErrorInfo, ReactNode, Suspense } from 'react'
import { DoubleSide } from 'three'
import ManifestRenderer from './ManifestRenderer'
import { SpatialAssetManifest } from './manifestTypes'

function ManifestFallbackMesh() {
  return (
    <group>
      <mesh position={[0, 1.5, -2]}>
        <planeGeometry args={[2.2, 1.34]} />
        <meshBasicMaterial color="#172554" transparent opacity={0.78} side={DoubleSide} />
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

class ManifestErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.warn('[URAI] Manifest render failed; showing fallback mesh.', error, info.componentStack)
  }

  render() {
    if (this.state.failed) return <ManifestFallbackMesh />
    return this.props.children
  }
}

export default function ManifestRenderBoundary({ manifest }: { manifest: SpatialAssetManifest | null }) {
  return (
    <ManifestErrorBoundary>
      <Suspense fallback={<ManifestFallbackMesh />}>
        <ManifestRenderer manifest={manifest} />
      </Suspense>
    </ManifestErrorBoundary>
  )
}
