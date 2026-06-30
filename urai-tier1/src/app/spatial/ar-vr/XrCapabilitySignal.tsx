'use client'

import { useEffect, useState } from 'react'

type XrSignal = {
  label: string
  title: string
  copy: string
}

const checking: XrSignal = {
  label: 'Capability detection',
  title: 'Checking this browser…',
  copy: 'URAI is looking for navigator.xr support. If it is missing, the Quest instructions and spatial fallback stay visible.',
}

const unsupported: XrSignal = {
  label: 'Fallback active',
  title: 'No immersive WebXR reported here.',
  copy: 'This browser can still open the Life Map and XR portal. Quest proof must happen on actual headset hardware.',
}

const supported: XrSignal = {
  label: 'WebXR available',
  title: 'Immersive session support detected.',
  copy: 'Use Quest Browser to verify drag, zoom, star select, Focus, Replay, and XR readability before marking headset proof complete.',
}

const unknown: XrSignal = {
  label: 'Manual proof required',
  title: 'Capability check could not finish.',
  copy: 'Keep the fallback path visible and record Quest hardware proof only after a real headset session.',
}

export default function XrCapabilitySignal() {
  const [signal, setSignal] = useState<XrSignal>(checking)

  useEffect(() => {
    let cancelled = false

    async function checkSupport() {
      const xr = (navigator as Navigator & {
        xr?: { isSessionSupported?: (mode: 'immersive-vr' | 'immersive-ar') => Promise<boolean> }
      }).xr

      if (!xr?.isSessionSupported) {
        if (!cancelled) setSignal(unsupported)
        return
      }

      try {
        const [vr, ar] = await Promise.all([
          xr.isSessionSupported('immersive-vr').catch(() => false),
          xr.isSessionSupported('immersive-ar').catch(() => false),
        ])

        if (!cancelled) setSignal(vr || ar ? supported : unsupported)
      } catch {
        if (!cancelled) setSignal(unknown)
      }
    }

    checkSupport()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <aside data-xr-capability-signal="true" aria-live="polite">
      <span>{signal.label}</span>
      <strong>{signal.title}</strong>
      <p>{signal.copy}</p>
    </aside>
  )
}
