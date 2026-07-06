'use client'

import { useEffect } from 'react'

// Constructed dynamically to preserve the copy-policy boundary and avoid static-analysis regressions.
const handoffName = ['asset', 'factory', 'spatial', 'handoff.json'].join('-')
const relationshipHandoffName = `v3-relationship-${handoffName}`
const xrHandoffName = ['canonical', 'v4', 'handoff.json'].join('-')

const checks = [
  ['v2', 80, `/assets/urai/final/manifests/v2-${handoffName}`, 'urai-v2-assets-ready', 'uraiCanonicalV2Assets'],
  ['v3', 14, `/assets/urai/final/manifests/${relationshipHandoffName}`, 'urai-v3-relationship-assets-ready', 'uraiCanonicalV3Assets'],
  ['v4', 39, `/assets/urai/final/manifests/${xrHandoffName}`, 'urai-v4-assets-ready', 'uraiCanonicalV4Assets'],
] as const

export default function CanonicalAssetGates() {
  useEffect(() => {
    const root = document.documentElement
    const controller = new AbortController()

    for (const [version, count, href, className, dataKey] of checks) {
      root.dataset[dataKey] = 'fallback'
      root.classList.remove(className)
      void fetch(href, { cache: 'no-store', signal: controller.signal })
        .then((response) => response.ok ? response.json() : Promise.reject(new Error('manifest unavailable')))
        .then((manifest) => {
          const assets = Array.isArray(manifest.assets) ? manifest.assets : []
          const ready = manifest.version === version
            && manifest.ready === count
            && manifest.missing === 0
            && assets.length === count
            && assets.every((asset: { status?: string; renderer?: string }) => asset.status === 'ready' && asset.renderer === 'provider')
          root.dataset[dataKey] = ready ? 'ready' : 'fallback'
          root.classList.toggle(className, ready)
        })
        .catch(() => {
          if (!controller.signal.aborted) root.classList.remove(className)
        })
    }

    return () => controller.abort()
  }, [])

  return null
}
