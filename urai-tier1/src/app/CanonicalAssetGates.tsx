'use client'

import { useEffect } from 'react'

type AssetRecord = {
  status?: unknown
  renderer?: unknown
  name?: unknown
  canonicalPath?: unknown
  sha256?: unknown
  bytes?: unknown
}

type ManifestRecord = {
  schemaVersion?: unknown
  version?: unknown
  expectedOutputs?: unknown
  ready?: unknown
  missing?: unknown
  assets?: unknown
}

const handoffName = 'asset' + '-factory-spatial-handoff.json'
const checks = [
  ['v1', 53, `/assets/urai/final/manifests/v1-${handoffName}`, 'urai-v1-assets-ready', 'assets/urai/'],
  ['v2', 80, `/assets/urai/final/manifests/v2-${handoffName}`, 'urai-v2-assets-ready', 'assets/urai/v2/'],
  ['v3', 14, `/assets/urai/final/manifests/v3-${handoffName}`, 'urai-v3-relationship-assets-ready', 'assets/urai/v3/'],
  ['v4', 39, `/assets/urai/final/manifests/v4-${handoffName}`, 'urai-v4-assets-ready', 'assets/urai/xr/'],
  ['v5', 27, `/assets/urai/final/manifests/v5-${handoffName}`, 'urai-v5-assets-ready', 'assets/urai/v5/'],
] as const

function variable(name: string) {
  return `--urai-asset-${name.toLowerCase().replace(/[^a-z0-9-]+/g, '-')}`
}

export default function CanonicalAssetGates() {
  useEffect(() => {
    const root = document.documentElement
    const controller = new AbortController()
    const injected = new Set<string>()

    for (const [version, count, href, className, prefix] of checks) {
      root.classList.remove(className)
      void fetch(href, { cache: 'no-store', signal: controller.signal })
        .then((response) => response.ok ? response.json() : Promise.reject(new Error('manifest unavailable')))
        .then((manifest: ManifestRecord) => {
          const assets = Array.isArray(manifest.assets) ? manifest.assets as AssetRecord[] : []
          const expectedMatches = manifest.expectedOutputs === undefined || manifest.expectedOutputs === count
          const ready = manifest.schemaVersion === '3.0.0'
            && manifest.version === version
            && expectedMatches
            && manifest.ready === count
            && manifest.missing === 0
            && assets.length === count
            && assets.every((asset) => asset.status === 'ready'
              && asset.renderer === 'provider'
              && typeof asset.name === 'string'
              && typeof asset.canonicalPath === 'string'
              && asset.canonicalPath.startsWith(prefix)
              && typeof asset.sha256 === 'string'
              && /^[a-f0-9]{64}$/i.test(asset.sha256)
              && typeof asset.bytes === 'number'
              && asset.bytes > 0)
          if (!ready) return
          for (const asset of assets) {
            const name = asset.name as string
            const canonicalPath = (asset.canonicalPath as string).replace(/^\/+/, '')
            const key = variable(name)
            root.style.setProperty(key, `url('/${canonicalPath}')`)
            injected.add(key)
          }
          root.classList.add(className)
        })
        .catch(() => root.classList.remove(className))
    }

    return () => {
      controller.abort()
      for (const key of injected) root.style.removeProperty(key)
    }
  }, [])
  return null
}
