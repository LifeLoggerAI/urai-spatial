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

const idleCopy = 'Use Quest Browser to explore in VR. You can also explore this space with a mouse, keyboard, or touch.'

export default function QuestVrEntryButton({ onSessionRequested, onSessionEnded, disabled = false }: Props) {
  const [copy, setCopy] = useState(idleCopy)
  const [busy, setBusy] = useState(false)
  const [active, setActive] = useState(false)
  const [sessionConsent, setSessionConsent] = useState(false)

  async function enterQuestVr() {
    if (disabled) {
      setCopy('VR will be available when the space finishes loading. You can still use the destination links.')
      return
    }
    if (!sessionConsent) {
      setCopy('Check the consent box before starting VR.')
      return
    }
    setBusy(true)
    setCopy('Checking this browser for immersive VR support…')
    const xr = (navigator as QuestXrNavigator).xr
    if (!xr?.requestSession) {
      setBusy(false)
      setCopy('This browser cannot enter VR. You can still explore with a mouse, keyboard, or touch.')
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
        setCopy('Your VR session has ended. You can keep exploring here, or give consent to start another session.')
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
      setCopy('VR did not start. You can try again or keep exploring here.')
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
        I agree to use my headset movement and controls for this VR session. This page does not record or save them.
      </label>
      <button type="button" onClick={enterQuestVr} disabled={disabled || busy || active}>
        {busy ? 'Entering VR…' : active ? 'VR active' : 'Enter VR in Quest'}
      </button>
      <p aria-live="polite">{copy}</p>
    </div>
  )
}
