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

type CanonicalCheck = {
  version: 'v1' | 'v2' | 'v3' | 'v4' | 'v5'
  expectedOutputs: number
  href: string
  className: string
  dataKey: string
  canonicalPrefix: string
}

const handoffName = 'asset' + '-factory-spatial-handoff.json'
const safeCanonicalPath = /^[A-Za-z0-9_./-]+$/
const checks: readonly CanonicalCheck[] = [
  {
    version: 'v1',
    expectedOutputs: 53,
    href: `/assets/urai/final/manifests/v1-${handoffName}`,
    className: 'urai-v1-assets-ready',
    dataKey: 'uraiCanonicalV1Assets',
    canonicalPrefix: 'assets/urai/',
  },
  {
    version: 'v2',
    expectedOutputs: 80,
    href: `/assets/urai/final/manifests/v2-${handoffName}`,
    className: 'urai-v2-assets-ready',
    dataKey: 'uraiCanonicalV2Assets',
    canonicalPrefix: 'assets/urai/v2/',
  },
  {
    version: 'v3',
    expectedOutputs: 14,
    href: `/assets/urai/final/manifests/v3-${handoffName}`,
    className: 'urai-v3-relationship-assets-ready',
    dataKey: 'uraiCanonicalV3Assets',
    canonicalPrefix: 'assets/urai/v3/',
  },
  {
    version: 'v4',
    expectedOutputs: 39,
    href: `/assets/urai/final/manifests/v4-${handoffName}`,
    className: 'urai-v4-assets-ready',
    dataKey: 'uraiCanonicalV4Assets',
    canonicalPrefix: 'assets/urai/xr/',
  },
  {
    version: 'v5',
    expectedOutputs: 27,
    href: `/assets/urai/final/manifests/v5-${handoffName}`,
    className: 'urai-v5-assets-ready',
    dataKey: 'uraiCanonicalV5Assets',
    canonicalPrefix: 'assets/urai/v5/',
  },
] as const

function variable(name: string) {
  return `--urai-asset-${name.toLowerCase().replace(/[^a-z0-9-]+/g, '-')}`
}

function validateReadyManifest(check: CanonicalCheck, manifest: unknown) {
  if (!manifest || typeof manifest !== 'object') {
    return { ready: false, assets: [] as AssetRecord[] }
  }

  const record = manifest as ManifestRecord
  const assets = Array.isArray(record.assets) ? record.assets as AssetRecord[] : []
  const expectedMatches = record.expectedOutputs === undefined
    || record.expectedOutputs === check.expectedOutputs
  const variableKeys = new Set<string>()

  const ready = record.schemaVersion === '3.0.0'
    && record.version === check.version
    && expectedMatches
    && record.ready === check.expectedOutputs
    && record.missing === 0
    && assets.length === check.expectedOutputs
    && assets.every((asset) => {
      if (!asset || typeof asset !== 'object') return false
      if (asset.status !== 'ready' || asset.renderer !== 'provider') return false
      if (typeof asset.name !== 'string' || asset.name.trim().length === 0) return false
      if (typeof asset.canonicalPath !== 'string') return false
      if (!safeCanonicalPath.test(asset.canonicalPath)) return false
      if (asset.canonicalPath.startsWith('/') || asset.canonicalPath.includes('..')) return false
      if (asset.canonicalPath.split('/').some((part) => part.length === 0)) return false
      if (!asset.canonicalPath.startsWith(check.canonicalPrefix)) return false
      if (typeof asset.sha256 !== 'string' || !/^[a-f0-9]{64}$/i.test(asset.sha256)) return false
      if (typeof asset.bytes !== 'number' || !Number.isSafeInteger(asset.bytes) || asset.bytes <= 0) return false

      const key = variable(asset.name)
      if (key === '--urai-asset-' || variableKeys.has(key)) return false
      variableKeys.add(key)
      return true
    })

  return { ready, assets: ready ? assets : [] }
}

export default function CanonicalAssetGates() {
  useEffect(() => {
    const root = document.documentElement
    const controller = new AbortController()
    const injectedVariables = new Set<string>()

    for (const check of checks) {
      root.dataset[check.dataKey] = 'fallback'
      root.classList.remove(check.className)

      void fetch(check.href, { cache: 'no-store', signal: controller.signal })
        .then((response) => response.ok
          ? response.json()
          : Promise.reject(new Error('manifest unavailable')))
        .then((manifest: unknown) => {
          if (controller.signal.aborted) return

          const result = validateReadyManifest(check, manifest)
          if (!result.ready) {
            root.dataset[check.dataKey] = 'fallback'
            root.classList.remove(check.className)
            return
          }

          for (const asset of result.assets) {
            const name = asset.name as string
            const canonicalPath = asset.canonicalPath as string
            const key = variable(name)
            root.style.setProperty(key, `url('/${canonicalPath}')`)
            injectedVariables.add(key)
          }

          root.dataset[check.dataKey] = 'ready'
          root.classList.add(check.className)
        })
        .catch(() => {
          if (controller.signal.aborted) return
          root.dataset[check.dataKey] = 'fallback'
          root.classList.remove(check.className)
        })
    }

    return () => {
      controller.abort()
      for (const key of injectedVariables) root.style.removeProperty(key)
      for (const check of checks) {
        root.classList.remove(check.className)
        delete root.dataset[check.dataKey]
      }
    }
  }, [])

  return null
}
