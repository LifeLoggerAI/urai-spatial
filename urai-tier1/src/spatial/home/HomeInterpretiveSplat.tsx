'use client'

import { useEffect, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Vector4 } from 'three'
import { createCapturedRealitySplatSession } from '@/spatial/captured-reality/capturedRealitySplatSession'
import type { CapturedSplatResources } from '@/spatial/captured-reality/capturedRealitySplatResources'

export const HOME_INTERPRETIVE_SPLAT_PREFIX = '/assets/urai/home-production/interpretive/'

export function resolveHomeInterpretiveSplatAsset(value?: string | null) {
  const candidate = value?.trim()
  if (!candidate) return null
  const forbidden = candidate.includes('..') || candidate.includes('\\') || candidate.includes('?') || candidate.includes('#')
  if (forbidden || !candidate.startsWith(HOME_INTERPRETIVE_SPLAT_PREFIX) || !candidate.endsWith('.splat')) {
    throw new Error('HOME_INTERPRETIVE_SPLAT_ASSET_NOT_APPROVED')
  }
  return candidate
}

const MiB = 1024 * 1024

export function HomeInterpretiveSplatEnvironment({
  src,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = 1,
}: {
  src: string
  position?: [number, number, number]
  rotation?: [number, number, number]
  scale?: number | [number, number, number]
}) {
  const approvedSrc = resolveHomeInterpretiveSplatAsset(src)
  const gl = useThree((state) => state.gl)
  const [resource, setResource] = useState<CapturedSplatResources | null>(null)
  const [failed, setFailed] = useState(false)
  const viewport = useRef(new Vector4())

  useEffect(() => {
    if (!approvedSrc) return
    let active = true
    setResource(null)
    setFailed(false)
    const mobile = typeof navigator !== 'undefined' && /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent)
    const session = createCapturedRealitySplatSession({
      url: approvedSrc,
      maxBytes: (mobile ? 64 : 160) * MiB,
      chunkSize: mobile ? 16_000 : 25_000,
      alphaHash: true,
      maxTextureSize: gl.capabilities.maxTextureSize,
      onResource(next) { if (active) setResource(next) },
      onFailure() { if (active) setFailed(true) },
    })
    void session.completion.catch((error) => {
      if (active && error?.name !== 'AbortError') setFailed(true)
    })
    return () => {
      active = false
      session.dispose()
      setResource(null)
    }
  }, [approvedSrc, gl])

  useFrame(({ camera }) => {
    if (!resource || resource.disposed) return
    gl.getCurrentViewport(viewport.current)
    resource.update(camera, viewport.current)
  })

  if (!approvedSrc || failed || !resource || resource.disposed) return null

  return (
    <group
      name="home-interpretive-gaussian-environment"
      position={position}
      rotation={rotation}
      scale={scale}
      userData={{
        uraiHomeInterpretiveEnvironment: true,
        truthClass: 'INTERPRETIVE',
        autobiographical: false,
        collisionOwner: 'conventional-home-proxies',
        interactionOwner: 'react-r3f-home-runtime',
        provenanceOwner: 'asset-factory',
      }}
    >
      <primitive object={resource.mesh} dispose={null} />
    </group>
  )
}

export default HomeInterpretiveSplatEnvironment
