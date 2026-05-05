'use client'

import { useEffect, useRef } from 'react'
import { buildNarrationSequence, NarrationLine, NarratorContext } from './buildNarration'
import { SpatialAssetManifest } from '../assets/manifestTypes'
import { setNarratorLine } from './narratorStore'

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

export default function NarratorVoice({ manifest, context = 'arrival' }: { manifest: SpatialAssetManifest | null; context?: NarratorContext }) {
  const spokenRef = useRef<string | null>(null)

  useEffect(() => {
    if (!manifest) return

    const speechKey = `${manifest.manifestId}:${context}`
    if (spokenRef.current === speechKey) return

    const controller = new AbortController()
    const sequence = buildNarrationSequence(manifest, context)

    async function runSequence() {
      speechSynthesis.cancel()
      setNarratorLine(null)

      for (const line of sequence) {
        if (controller.signal.aborted) break
        await wait(line.pauseMs)
        if (controller.signal.aborted) break

        setNarratorLine(line.text)
        await speakLine(line, controller.signal)
      }

      setNarratorLine(null)
    }

    void runSequence()
    spokenRef.current = speechKey

    return () => {
      controller.abort()
      speechSynthesis.cancel()
      setNarratorLine(null)
    }
  }, [manifest, context])

  return null
}
