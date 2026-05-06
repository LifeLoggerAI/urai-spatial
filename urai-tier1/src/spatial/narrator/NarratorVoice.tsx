'use client'

import { useEffect, useRef } from 'react'
import { buildNarrationSequence, NarrationLine, NarratorContext } from './buildNarration'
import { SpatialAssetManifest } from '../assets/manifestTypes'
import { setNarratorLine, setNarratorSpeaking } from './narratorStore'

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function canSpeak() {
  return (
    typeof window !== 'undefined' &&
    'speechSynthesis' in window &&
    'SpeechSynthesisUtterance' in window
  )
}

function speakLine(line: NarrationLine, signal: AbortSignal) {
  return new Promise<void>((resolve) => {
    if (signal.aborted || !canSpeak()) return resolve()

    const utterance = new SpeechSynthesisUtterance(line.text)

    utterance.rate = line.rate
    utterance.pitch = line.pitch
    utterance.volume = line.volume

    utterance.onstart = () => setNarratorSpeaking(true)

    utterance.onend = () => {
      setNarratorSpeaking(false)
      resolve()
    }

    utterance.onerror = () => {
      setNarratorSpeaking(false)
      resolve()
    }

    window.speechSynthesis.speak(utterance)
  })
}

export default function NarratorVoice({
  manifest,
  context = 'arrival',
}: {
  manifest: SpatialAssetManifest | null
  context?: NarratorContext
}) {
  const spokenRef = useRef<string | null>(null)

  useEffect(() => {
    if (!manifest) return

    const speechKey = `${manifest.manifestId}:${context}`
    if (spokenRef.current === speechKey) return

    const controller = new AbortController()
    const sequence = buildNarrationSequence(manifest, context)

    async function runSequence() {
      if (canSpeak()) window.speechSynthesis.cancel()

      setNarratorLine(null)
      setNarratorSpeaking(false)

      for (const line of sequence) {
        if (controller.signal.aborted) break

        await wait(line.pauseMs)

        if (controller.signal.aborted) break

        setNarratorLine(line.text)

        if (!canSpeak()) setNarratorSpeaking(true)

        await speakLine(line, controller.signal)

        if (!canSpeak()) setNarratorSpeaking(false)
      }

      setNarratorLine(null)
      setNarratorSpeaking(false)
    }

    void runSequence()
    spokenRef.current = speechKey

    return () => {
      controller.abort()

      if (canSpeak()) window.speechSynthesis.cancel()

      setNarratorLine(null)
      setNarratorSpeaking(false)
    }
  }, [manifest, context])

  return null
}