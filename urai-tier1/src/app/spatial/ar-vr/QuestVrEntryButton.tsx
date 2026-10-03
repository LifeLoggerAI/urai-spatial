'use client'

import { useState } from 'react'

type XrMode = 'immersive-vr'
type QuestSession = { end?: () => Promise<void>; addEventListener?: (type: string, listener: () => void, options?: { once?: boolean }) => void }
type QuestXrNavigator = Navigator & {
  xr?: {
    isSessionSupported?: (mode: XrMode) => Promise<boolean>
    requestSession?: (mode: XrMode, init?: { requiredFeatures?: string[]; optionalFeatures?: string[] }) => Promise<QuestSession>
  }
}

type Props = {
  onSessionRequested?: (session: QuestSession) => Promise<void> | void
  onSessionEnded?: () => void
  disabled?: boolean
}

const idleCopy = 'On Quest Browser, enter the live 3D chamber. Desktop and mobile keep the truthful interactive fallback visible.'

export default function QuestVrEntryButton({ onSessionRequested, onSessionEnded, disabled = false }: Props) {
  const [copy, setCopy] = useState(idleCopy)
  const [busy, setBusy] = useState(false)
  const [active, setActive] = useState(false)
  const [sessionConsent, setSessionConsent] = useState(false)

  async function enterQuestVr() {
    if (disabled) {
      setCopy('Immersive VR entry is unavailable until the real-time renderer is ready. Accessible portals remain available.')
      return
    }
    if (!sessionConsent) {
      setCopy('Choose the session-consent checkbox before starting immersive VR.')
      return
    }
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
        setCopy('This browser does not report immersive VR support. Open this route in Quest Browser.')
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
        setSessionConsent(false)
        setCopy('Immersive session ended safely. Session consent was cleared; the chamber remains available.')
        onSessionEnded?.()
      }, { once: true })
      await onSessionRequested?.(session)
      if (sessionEnded) {
        onSessionEnded?.()
        return
      }
      setActive(true)
      setCopy('Immersive world active. Select a portal or select the floor to teleport.')
    } catch {
      await requestedSession?.end?.().catch(() => undefined)
      setActive(false)
      setCopy('VR entry was cancelled or rejected. The non-XR world is still active.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="urai-xr-portal__quest-entry" data-testid="urai-quest-vr-entry-control">
      <label>
        <input
          type="checkbox"
          checked={sessionConsent}
          onChange={(event) => setSessionConsent(event.currentTarget.checked)}
          disabled={disabled || busy || active}
        />
        I consent to start this browser-local immersive VR session. Headset pose and input remain session-scoped on this entry path; provider-backed recording or persistence is not enabled here.
      </label>
      <button type="button" onClick={enterQuestVr} disabled={disabled || busy || active}>
        {busy ? 'Entering VR…' : active ? 'VR active' : 'Enter VR in Quest'}
      </button>
      <p aria-live="polite">{copy}</p>
    </div>
  )
}
