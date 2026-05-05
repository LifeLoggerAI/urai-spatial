'use client'

import { useEffect, useRef } from 'react'
import { buildNarration } from './buildNarration'
import { SpatialAssetManifest } from '../assets/manifestTypes'

export default function NarratorVoice({ manifest }: { manifest: SpatialAssetManifest | null }) {
  const spokenRef = useRef<string | null>(null)

  useEffect(() => {
    if (!manifest) return

    if (spokenRef.current === manifest.manifestId) return

    const narration = buildNarration(manifest)

    const utterance = new SpeechSynthesisUtterance(narration.text)
    utterance.rate = narration.rate
    utterance.pitch = narration.pitch
    utterance.volume = narration.volume

    speechSynthesis.cancel()
    speechSynthesis.speak(utterance)

    spokenRef.current = manifest.manifestId
  }, [manifest])

  return null
}
