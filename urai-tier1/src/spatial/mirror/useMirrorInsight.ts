'use client'

import { useMemo } from 'react'
import { getDemoSpatialManifest, useManifest } from '../assets/useManifest'
import { buildMemoryMorphology } from '../memory/memoryMorphology'

export type MirrorInsightSource = 'life-map' | 'replay' | 'manifest' | 'fallback'
export type MirrorPrivacyState = 'local' | 'synced' | 'shared' | 'unknown'

export type MirrorSignal = {
  label: string
  value: string
  confidence: 'low' | 'medium' | 'high'
}

export type MirrorInsight = {
  source: MirrorInsightSource
  manifestId?: string
  memoryTitle?: string
  emotionalTone?: string
  morphologyState?: string
  privacyState: MirrorPrivacyState
  signals: MirrorSignal[]
  isFallback: boolean
}

export function useMirrorInsight({
  manifestId,
  source = 'fallback',
}: {
  manifestId?: string
  source?: MirrorInsightSource
}): MirrorInsight {
  const { manifest, loading, error } = useManifest(manifestId ?? null)

  return useMemo(() => {
    const resolvedManifest = manifest ?? (manifestId ? getDemoSpatialManifest(manifestId) : null)
    const morphology = buildMemoryMorphology(resolvedManifest, 'mirror')
    const isFallback = !manifestId || loading || Boolean(error) || !manifest
    const privacyState: MirrorPrivacyState = resolvedManifest?.ownerId === 'launch-demo' ? 'local' : manifest ? 'synced' : 'unknown'

    return {
      source: isFallback ? 'fallback' : source,
      manifestId: resolvedManifest?.manifestId ?? manifestId,
      memoryTitle: morphology.title,
      emotionalTone: morphology.tone,
      morphologyState: morphology.state,
      privacyState,
      isFallback,
      signals: [
        {
          label: 'Field',
          value: morphology.systemLabel,
          confidence: manifest || resolvedManifest ? 'high' : 'medium',
        },
        {
          label: 'Tone',
          value: morphology.tone,
          confidence: 'medium',
        },
        {
          label: 'Privacy',
          value: privacyState === 'local' ? 'Local-safe' : privacyState,
          confidence: privacyState === 'unknown' ? 'low' : 'high',
        },
      ],
    }
  }, [error, loading, manifest, manifestId, source])
}
