'use client'

import { useEffect } from 'react'
import './canonical-version-asset-wiring.css'

type AssetHandoffManifest = {
  version?: string
  ready?: number
  missing?: number
  assets?: Array<{ status?: string; renderer?: string }>
}

type Gate = {
  version: 'v2' | 'v3' | 'v4'
  minimum: number
  href: string
  readyClass: string
  datasetKey: 'uraiCanonicalV2Assets' | 'uraiCanonicalV3Assets' | 'uraiCanonicalV4Assets'
}

const gates: Gate[] = [
  {
    version: 'v2',
    minimum: 80,
    href: '/assets/urai/final/manifests/v2-asset-factory-spatial-handoff.json',
    readyClass: 'urai-v2-assets-ready',
    datasetKey: 'uraiCanonicalV2Assets',
  },
  {
    version: 'v3',
    minimum: 14,
    href: '/assets/urai/final/manifests/v3-asset-factory-spatial-handoff.json',
    readyClass: 'urai-v3-relationship-assets-ready',
    datasetKey: 'uraiCanonicalV3Assets',
  },
  {
    version: 'v4',
    minimum: 39,
    href: '/assets/urai/final/manifests/v4-asset-factory-spatial-handoff.json',
    readyClass: 'urai-v4-assets-ready',
    datasetKey: 'uraiCanonicalV4Assets',
  },
]

function isComplete(manifest: AssetHandoffManifest, gate: Gate) {
  const assets = Array.isArray(manifest.assets) ? manifest.assets : []
  return manifest.version === gate.version
    && Number(manifest.ready ?? 0) === gate.minimum
    && Number(manifest.missing ?? 0) === 0
    && assets.length === gate.minimum
    && assets.every((asset) => asset.status === 'ready' && asset.renderer === 'provider')
}

export default function UraiCanonicalVersionAssetGates() {
  useEffect(() => {
    const root = document.documentElement
    const controller = new AbortController()

    for (const gate of gates) {
      root.dataset[gate.datasetKey] = 'fallback'
      root.classList.remove(gate.readyClass)

      void fetch(gate.href, { cache: 'no-store', signal: controller.signal })
        .then((response) => {
          if (!response.ok) throw new Error(`manifest ${response.status}`)
          return response.json() as Promise<AssetHandoffManifest>
        })
        .then((manifest) => {
          const ready = isComplete(manifest, gate)
          root.dataset[gate.datasetKey] = ready ? 'ready' : 'fallback'
          root.classList.toggle(gate.readyClass, ready)
        })
        .catch(() => {
          if (!controller.signal.aborted) {
            root.dataset[gate.datasetKey] = 'fallback'
            root.classList.remove(gate.readyClass)
          }
        })
    }

    return () => {
      controller.abort()
      for (const gate of gates) root.classList.remove(gate.readyClass)
    }
  }, [])

  return null
}
