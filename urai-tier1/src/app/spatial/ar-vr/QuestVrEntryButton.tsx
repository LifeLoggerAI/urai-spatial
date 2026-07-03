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
}

const idleCopy = 'On Quest Browser, enter the live 3D chamber. Desktop and mobile keep the truthful interactive fallback visible.'

export default function QuestVrEntryButton({ onSessionRequested, onSessionEnded }: Props) {
  const [copy, setCopy] = useState(idleCopy)
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
      await onSessionRequested?.(session)
      session.addEventListener?.('end', () => {
        setActive(false)
        setCopy('Immersive session ended safely. The chamber remains available.')
        onSessionEnded?.()
      }, { once: true })
      setActive(true)
      setCopy('Immersive world active. Select a portal or select the floor to teleport.')
    } catch {
      setCopy('VR entry was cancelled or rejected. The non-XR world is still active.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="urai-xr-portal__quest-entry" data-testid="urai-quest-vr-entry-control">
      <button type="button" onClick={enterQuestVr} disabled={busy || active}>
        {busy ? 'Entering VR…' : active ? 'VR active' : 'Enter VR in Quest'}
      </button>
      <p aria-live="polite">{copy}</p>
    </div>
  )
}
