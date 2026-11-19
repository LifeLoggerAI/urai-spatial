'use client'

import { useEffect, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Vector4 } from 'three'
import { createCapturedRealitySplatSession } from '@/spatial/captured-reality/capturedRealitySplatSession'
import type { CapturedSplatResources } from '@/spatial/captured-reality/capturedRealitySplatResources'

import { resolveHomeInterpretiveSplatAsset } from './homeInterpretiveSplatPolicy'

export { HOME_INTERPRETIVE_SPLAT_PREFIX, resolveHomeInterpretiveSplatAsset } from './homeInterpretiveSplatPolicy'

const MiB = 1024 * 1024
// Exact R1535 synthetic review asset only; never inferred from private URLs.
const SYNTHETIC_HOME_ASSET = '/assets/urai/home-production/interpretive/sanctuary-golden-grove-v1.splat'
const SYNTHETIC_HOME_DECODED_BYTES = 2_667_520

const fetchHomeStaticSplat: typeof fetch = async (input, init) => {
  const response = await fetch(input, { ...init, credentials: 'same-origin' })
  if (input !== SYNTHETIC_HOME_ASSET || response.status !== 200 || !response.body) return response
  const headers = new Headers(response.headers)
  const encoding = (headers.get('content-encoding') || 'identity').toLowerCase()
  if (!['br', 'gzip', 'identity'].includes(encoding)) throw new Error('HOME_STATIC_SPLAT_ENCODING_DENIED')
  // Browsers decompress Brotli/gzip automatically but Vercel omits the decoded
  // Content-Length. Preserve the original strict stream byte-count check by
  // specifying the verified deterministic decoded length for this one asset.
  if (encoding === 'identity' && headers.has('content-length') &&
    Number(headers.get('content-length')) !== SYNTHETIC_HOME_DECODED_BYTES) {
    throw new Error('HOME_STATIC_SPLAT_SIZE_DENIED')
  }
  headers.delete('content-encoding')
  headers.delete('transfer-encoding')
  headers.set('content-length', String(SYNTHETIC_HOME_DECODED_BYTES))
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers })
}

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
    // Keep incremental updates on full texture-row boundaries. Arbitrary
    // 16k/25k splat chunks produced invalid texSubImage2D regions on WebGL2.
    const textureWidth = Math.min(gl.capabilities.maxTextureSize, 16_384)
    const session = createCapturedRealitySplatSession({
      url: approvedSrc,
      // Public, allowlisted Home asset may use the same-origin SSO cookie.
      // Private Captured Reality fetches remain credential-free elsewhere.
      fetcher: fetchHomeStaticSplat,
      maxBytes: (mobile ? 64 : 160) * MiB,
      chunkSize: textureWidth,
      alphaHash: true,
      maxTextureSize: textureWidth,
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
