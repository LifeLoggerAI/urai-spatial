'use client'

import { useEffect, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import { Color, Vector4 } from 'three'
import { createCapturedRealitySplatSession } from './capturedRealitySplatSession'
import type { CapturedSplatResources } from './capturedRealitySplatResources'
import { capturedRealityFrameHasMeaningfulPixels } from './capturedRealityRenderProof'

/** Private splat renderer: every mount owns and releases its complete session.
 * Readiness is emitted only after a completed splat draw produces meaningful
 * non-background framebuffer samples. This is technical render proof only,
 * never artistic/visual-fidelity acceptance.
 */
export function OwnedCapturedRealitySplat({
  src, maxBytes, chunkSize = 25_000, alphaHash = true, onRenderReady,
  loadingLabel = 'Loading captured place',
  failureMessage = 'Captured place rendering stopped.',
}: {
  src: string
  maxBytes: number
  chunkSize?: number
  alphaHash?: boolean
  onRenderReady?: (src: string) => void
  loadingLabel?: string
  failureMessage?: string
}) {
  const gl = useThree((state) => state.gl)
  const [loaded, setLoaded] = useState<{ src: string; resource: CapturedSplatResources } | null>(null)
  const [progress, setProgress] = useState(0)
  const [complete, setComplete] = useState(false)
  const [failure, setFailure] = useState<{ src: string; error: Error } | null>(null)
  const viewport = useRef(new Vector4())
  const clearColor = useRef(new Color())
  const renderReadySent = useRef(false)
  const onRenderReadyRef = useRef(onRenderReady)
  onRenderReadyRef.current = onRenderReady

  useEffect(() => {
    let active = true
    setLoaded(null)
    setFailure(null)
    setComplete(false)
    setProgress(0)
    renderReadySent.current = false
    const session = createCapturedRealitySplatSession({
      url: src, maxBytes, chunkSize, alphaHash, maxTextureSize: gl.capabilities.maxTextureSize,
      onResource(resource) { if (active) setLoaded({ src, resource }) },
      onProgress(bytes, total) { if (active) setProgress(Math.floor(bytes / total * 100)) },
      onFailure() { if (active) setFailure({ src, error: new Error(failureMessage) }) },
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
  }, [src, maxBytes, chunkSize, alphaHash, gl, failureMessage])

  useFrame(({ camera }) => {
    if (loaded?.src === src && !loaded.resource.disposed) {
      gl.getCurrentViewport(viewport.current)
      loaded.resource.update(camera, viewport.current)
    }
  })

  if (failure?.src === src) throw failure.error

  return (
    <>
      {loaded?.src === src && !loaded.resource.disposed ? (
        <primitive
          object={loaded.resource.mesh}
          dispose={null}
          onAfterRender={() => {
            const context = gl.getContext()
            if (!complete || renderReadySent.current || context.isContextLost()) return
            gl.getClearColor(clearColor.current)
            const background: [number, number, number, number] = [
              Math.round(clearColor.current.r * 255),
              Math.round(clearColor.current.g * 255),
              Math.round(clearColor.current.b * 255),
              Math.round(gl.getClearAlpha() * 255),
            ]
            if (!capturedRealityFrameHasMeaningfulPixels({
              context,
              width: gl.domElement.width,
              height: gl.domElement.height,
              background,
            })) return
            renderReadySent.current = true
            queueMicrotask(() => onRenderReadyRef.current?.(src))
          }}
        />
      ) : null}
      {!complete ? <Html center><p role="status" style={{ color: '#f7f7f5', whiteSpace: 'nowrap' }}>{loadingLabel}… {progress}%</p></Html> : null}
    </>
  )
}
