'use client'

import { useEffect, useState } from 'react'
import { subscribeNarratorLine } from './narratorStore'

const DEFAULT_NARRATOR_LINE = 'URAI is mapping memory stars with voice safely off.'

export default function NarratorHud({ fallbackLine = DEFAULT_NARRATOR_LINE }: { fallbackLine?: string }) {
  const [line, setLine] = useState<string | null>(null)
  const [voiceEnabled, setVoiceEnabled] = useState(false)

  useEffect(() => {
    const unsubscribe = subscribeNarratorLine(setLine)

    return () => {
      unsubscribe()
    }
  }, [])

  const visibleLine = line || fallbackLine

  return (
    <aside className="urai-narrator-hud" data-testid="urai-narrator-hud" aria-label="URAI narrator text fallback" aria-live="polite">
      <div className="urai-narrator-hud__orb" aria-hidden="true" />
      <div className="urai-narrator-hud__copy">
        <strong>URAI</strong>
        <span>{visibleLine}</span>
        <button
          type="button"
          className="urai-narrator-hud__voice"
          aria-pressed={voiceEnabled}
          onClick={() => setVoiceEnabled((value) => !value)}
        >
          {voiceEnabled ? 'Voice ready · Text remains visible' : 'Voice off · Enable narration'}
        </button>
      </div>
    </aside>
  )
}
