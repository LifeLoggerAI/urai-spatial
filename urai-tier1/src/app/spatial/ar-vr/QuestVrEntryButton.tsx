'use client'

import { useState } from 'react'

type XrMode = 'immersive-vr'
type QuestSession = {
  end?: () => Promise<void>
  addEventListener?: (
    type: string,
    listener: () => void,
    options?: { once?: boolean },
  ) => void
}
type QuestXrNavigator = Navigator & {
  xr?: {
    isSessionSupported?: (mode: XrMode) => Promise<boolean>
    requestSession?: (
      mode: XrMode,
      init?: { requiredFeatures?: string[]; optionalFeatures?: string[] },
    ) => Promise<QuestSession>
  }
}
type Props = {
  onSessionRequested?: (session: QuestSession) => Promise<void> | void
  onSessionEnded?: () => void
}

export default function QuestVrEntryButton({ onSessionRequested, onSessionEnded }: Props) {
  const [copy, setCopy] = useState('Enter the living spatial threshold in Quest Browser.')
  const [busy, setBusy] = useState(false)
  const [active, setActive] = useState(false)

  async function enterQuestVr() {
    setBusy(true)
    setCopy('Checking this browser for immersive VR support…')
    const xr = (navigator as QuestXrNavigator).xr
    if (!xr?.requestSession) {
      setBusy(false)
      setCopy('No WebXR VR session API here. The desktop and touch world remains explorable.')
      return
    }
    let requestedSession: QuestSession | null = null
    try {
      const supported = await xr.isSessionSupported?.('immersive-vr').catch(() => false)
      if (supported === false) {
        setCopy('Open this route in Quest Browser for immersive VR.')
        return
      }
      const session = await xr.requestSession('immersive-vr', {
        requiredFeatures: ['local-floor'],
        optionalFeatures: ['bounded-floor', 'hand-tracking'],
      })
      requestedSession = session
      let sessionEnded = false
      session.addEventListener?.('end', () => {
        sessionEnded = true
        setActive(false)
        setCopy('Immersive session ended safely. The threshold remains available.')
        onSessionEnded?.()
      }, { once: true })
      await onSessionRequested?.(session)
      if (sessionEnded) {
        onSessionEnded?.()
        return
      }
      setActive(true)
      setCopy('Immersive world active. Select the sky to ascend or the ground to descend.')
    } catch {
      await requestedSession?.end?.().catch(() => undefined)
      setActive(false)
      setCopy('VR entry was cancelled. The non-XR world is still active.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="urai-xr-portal__quest-entry" data-testid="urai-quest-vr-entry-control">
      <button type="button" onClick={enterQuestVr} disabled={busy || active} title={copy}>
        {busy ? 'Entering VR…' : active ? 'VR active' : 'Enter VR in Quest'}
      </button>
      <p className="sr-only" aria-live="polite">{copy}</p>
    </div>
  )
}
