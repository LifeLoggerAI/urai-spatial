'use client'

import { useState } from 'react'

type XrMode = 'immersive-vr'

type QuestSession = {
  end?: () => Promise<void>
}

type QuestXrNavigator = Navigator & {
  xr?: {
    isSessionSupported?: (mode: XrMode) => Promise<boolean>
    requestSession?: (mode: XrMode, init?: { optionalFeatures?: string[] }) => Promise<QuestSession>
  }
}

const idleCopy = 'On Quest Browser, press this to request immersive VR. On phone or desktop, it will keep the honest fallback visible.'

export default function QuestVrEntryButton() {
  const [copy, setCopy] = useState(idleCopy)
  const [busy, setBusy] = useState(false)

  async function enterQuestVr() {
    setBusy(true)
    setCopy('Checking this browser for immersive VR support…')

    const xr = (navigator as QuestXrNavigator).xr

    if (!xr?.requestSession) {
      setBusy(false)
      setCopy('No WebXR VR session API here. Open this route in Quest Browser, then press Enter VR from the headset.')
      return
    }

    try {
      const supported = await xr.isSessionSupported?.('immersive-vr').catch(() => false)

      if (supported === false) {
        setBusy(false)
        setCopy('This browser does not report immersive-vr support. Quest Browser manual proof is still required.')
        return
      }

      const session = await xr.requestSession('immersive-vr', {
        optionalFeatures: ['local-floor', 'bounded-floor', 'hand-tracking', 'layers'],
      })

      setCopy('Immersive VR session requested. Confirm readability, Life Map entry, Focus, Replay, and then record Quest proof honestly.')
      await session.end?.().catch(() => undefined)
    } catch {
      setCopy('VR request was blocked or cancelled. In Quest Browser, allow immersive mode and try again from this button.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="urai-xr-portal__quest-entry" data-testid="urai-quest-vr-entry-control">
      <button type="button" onClick={enterQuestVr} disabled={busy}>
        {busy ? 'Checking VR…' : 'Enter VR in Quest'}
      </button>
      <p>{copy}</p>
    </div>
  )
}
