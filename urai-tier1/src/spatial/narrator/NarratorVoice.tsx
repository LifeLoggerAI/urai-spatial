'use client'

import { useEffect, useRef } from 'react'
import { buildNarrationSequence, NarrationLine } from './buildNarration'
import { SpatialAssetManifest } from '../assets/manifestTypes'

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function speakLine(line: NarrationLine, signal: AbortSignal) {
  return new Promise<void>((resolve) => {
    if (signal.aborted) return resolve()

    const utterance = new SpeechSynthesisUtterance(line.text)
    utterance.rate = line.rate
    utterance.pitch = line.pitch
    utterance.volume = line.volume
    utterance.onend = () => resolve()
    utterance.onerror = () => resolve()

    speechSynthesis.speak(utterance)
  })
}

export default function NarratorVoice({ manifest }: { manifest: SpatialAssetManifest | null }) {
  const spokenRef = useRef<string | null>(null)

  useEffect(() => {
    if (!manifest) return
    if (spokenRef.current === manifest.manifestId) return

    const controller = new AbortController()
    const sequence = buildNarrationSequence(manifest)

    async function runSequence() {
      speechSynthesis.cancel()

      for (const line of sequence) {
        if (controller.signal.aborted) break
        await wait(line.pauseMs)
        if (controller.signal.aborted) break
        await speakLine(line, controller.signal)
      }
    }

    void runSequence()
    spokenRef.current = manifest.manifestId

    return () => {
      controller.abort()
      speechSynthesis.cancel()
    }
  }, [manifest])

  return null
}
