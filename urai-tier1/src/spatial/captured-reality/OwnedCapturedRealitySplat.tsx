'use client'

import { useEffect, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import { Vector4 } from 'three'
import { createCapturedRealitySplatSession } from './capturedRealitySplatSession'
import type { CapturedSplatResources } from './capturedRealitySplatResources'

/** Private splat renderer: every mount owns and releases its complete session. */
export function OwnedCapturedRealitySplat({
  src, maxBytes, chunkSize = 25_000, alphaHash = true,
}: { src: string; maxBytes: number; chunkSize?: number; alphaHash?: boolean }) {
  const gl = useThree((state) => state.gl)
  const [loaded, setLoaded] = useState<{ src: string; resource: CapturedSplatResources } | null>(null)
  const [progress, setProgress] = useState(0)
  const [complete, setComplete] = useState(false)
  const [failure, setFailure] = useState<{ src: string; error: Error } | null>(null)
  const viewport = useRef(new Vector4())
  useEffect(() => {
    let active = true
    setLoaded(null)
    setFailure(null)
    setComplete(false)
    setProgress(0)
    const session = createCapturedRealitySplatSession({
      url: src, maxBytes, chunkSize, alphaHash, maxTextureSize: gl.capabilities.maxTextureSize,
      onResource(resource) { if (active) setLoaded({ src, resource }) },
      onProgress(bytes, total) { if (active) setProgress(Math.floor(bytes / total * 100)) },
      onFailure() { if (active) setFailure({ src, error: new Error('Captured place rendering stopped.') }) },
    })
    void session.completion.then(() => {
      if (active) setComplete(true)
    }).catch((error) => {
      if (active && error.name !== 'AbortError') setFailure({ src, error })
    })
    return () => {
      active = false
      session.dispose()
    }
  }, [src, maxBytes, chunkSize, alphaHash, gl])
  useFrame(({ camera }) => {
    if (loaded?.src === src && !loaded.resource.disposed) {
      gl.getCurrentViewport(viewport.current)
      loaded.resource.update(camera, viewport.current)
    }
  })
  if (failure?.src === src) throw failure.error
  return (
    <>
      {loaded?.src === src && !loaded.resource.disposed ? <primitive object={loaded.resource.mesh} dispose={null} /> : null}
      {!complete ? <Html center><p role="status" style={{ color: '#f7f7f5', whiteSpace: 'nowrap' }}>Loading captured place… {progress}%</p></Html> : null}
    </>
  )
}
