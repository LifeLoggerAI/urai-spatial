'use client'

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { publishOrbState } from '@/app/home/orbStateController'
import OrbConversationPanel from '@/spatial/orb/OrbConversationPanel'
import {
  publishUraiWorldOrbClose,
  requestUraiWorldReturn,
  takePendingUraiWorldOrbOpen,
  URAI_WORLD_ORB_OPEN_EVENT,
  type UraiWorldOrbOpenDetail,
} from './worldEvents'
import { useUraiWorldState } from './WorldStateProvider'

const AUDIO_CONSENT_KEY = 'urai:spatial-audio-consent-v1'
const AUDIO_MUTE_KEY = 'urai:spatial-audio-muted-v1'

export function PersistentWorldCompanion() {
  const { world, phase } = useUraiWorldState()
  const [open, setOpen] = useState(false)
  const [hydrated, setHydrated] = useState(false)
  const [audioEnabled, setAudioEnabled] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const orbRef = useRef<HTMLButtonElement>(null)
  const externalActivatorRef = useRef<HTMLElement | null>(null)
  const restoreFocusRef = useRef(false)

  const closeCompanion = useCallback((restoreFocus = true) => {
    restoreFocusRef.current = restoreFocus
    setOpen(false)
    publishOrbState('idle', 'companion')
    publishUraiWorldOrbClose()
  }, [])

  useEffect(() => {
    setHydrated(true)
    try { setAudioEnabled(sessionStorage.getItem(AUDIO_CONSENT_KEY) === 'true' && sessionStorage.getItem(AUDIO_MUTE_KEY) === 'false') }
    catch { setAudioEnabled(false) }
  }, [])

  const publishCompanionAttention = useCallback(() => {
    window.queueMicrotask(() => {
      publishOrbState('attention', 'companion')
      window.dispatchEvent(new CustomEvent('urai:audio-cue', { detail: { cue: 'orb-confirm' } }))
    })
  }, [])

  const toggleCompanion = useCallback(() => {
    if (open) closeCompanion(true)
    else { externalActivatorRef.current = null; setOpen(true); publishCompanionAttention() }
  }, [closeCompanion, open, publishCompanionAttention])

  const toggleAudio = useCallback(() => {
    const enabled = !audioEnabled
    setAudioEnabled(enabled)
    window.dispatchEvent(new CustomEvent('urai:audio-consent', { detail: { enabled } }))
    window.dispatchEvent(new CustomEvent('urai:audio-mute', { detail: { muted: !enabled } }))
  }, [audioEnabled])

  useLayoutEffect(() => {
    const openCompanion = (event: CustomEvent<UraiWorldOrbOpenDetail>) => {
      const request = takePendingUraiWorldOrbOpen() ?? event.detail
      externalActivatorRef.current = request.returnFocusTo ?? null
      flushSync(() => setOpen(true))
      publishCompanionAttention()
    }
    window.addEventListener(URAI_WORLD_ORB_OPEN_EVENT, openCompanion)
    const pending = takePendingUraiWorldOrbOpen()
    if (pending) { externalActivatorRef.current = pending.returnFocusTo ?? null; setOpen(true); publishCompanionAttention() }
    return () => window.removeEventListener(URAI_WORLD_ORB_OPEN_EVENT, openCompanion)
  }, [publishCompanionAttention])

  useEffect(() => { if (phase !== 'idle') closeCompanion(false) }, [closeCompanion, phase])

  useLayoutEffect(() => {
    if (open) {
      restoreFocusRef.current = false
      const firstControl = menuRef.current?.querySelector<HTMLElement>('button:not([disabled])')
      if (firstControl) {
        firstControl.focus()
        if (document.activeElement !== firstControl) window.requestAnimationFrame(() => firstControl.focus({ preventScroll: true }))
      }
      return
    }
    if (restoreFocusRef.current) {
      restoreFocusRef.current = false
      const activator = externalActivatorRef.current
      externalActivatorRef.current = null
      if (activator?.isConnected) activator.focus()
      else orbRef.current?.focus()
      const focusTarget = activator?.isConnected ? activator : orbRef.current
      if (focusTarget && document.activeElement !== focusTarget) window.requestAnimationFrame(() => focusTarget.focus({ preventScroll: true }))
    }
  }, [hydrated, open, phase])

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.preventDefault(); event.stopImmediatePropagation(); closeCompanion(true)
    }
    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [closeCompanion, open])

  const returnThroughWorld = useCallback(() => {
    if (phase !== 'idle' || world.destination === 'home') { closeCompanion(true); return }
    closeCompanion(false); publishOrbState('transition', 'companion'); requestUraiWorldReturn()
  }, [closeCompanion, phase, world.destination])

  return (
    <aside className="urai-world-companion" data-open={open ? 'true' : 'false'} data-phase={phase} data-destination={world.destination} data-spatial-audio={audioEnabled ? 'on' : 'off'}>
      <div ref={menuRef} id="urai-world-companion-menu" className="urai-world-companion__menu" aria-hidden={open ? 'false' : 'true'} inert={!open ? true : undefined}>
        <p>UrAi Orb</p>
        <p className="urai-world-companion__purpose">Private companion conversation and sensory controls. World travel stays in the world.</p>
        {world.destination !== 'home' ? <button type="button" className="urai-world-companion__return" aria-label="Return through the world" disabled={!hydrated || phase !== 'idle'} data-return="true" onClick={returnThroughWorld}>Return</button> : null}
        <button type="button" aria-pressed={audioEnabled} aria-label={audioEnabled ? 'Mute spatial sound' : 'Enable spatial sound'} data-world-target="spatial-audio-toggle" disabled={!hydrated} onClick={toggleAudio}>{audioEnabled ? 'Sound on' : 'Sound off'}</button>
        <OrbConversationPanel />
      </div>
      <button ref={orbRef} type="button" className="urai-world-companion__orb" aria-label={open ? 'Close UrAi Orb companion' : 'Open UrAi Orb companion'} aria-expanded={open} aria-controls="urai-world-companion-menu" data-world-target="orb-controls" data-urai-audit-action="orb-controls" disabled={!hydrated || phase !== 'idle'} onClick={toggleCompanion}>
        <svg viewBox="0 0 48 48" aria-hidden="true" focusable="false"><path d="M23 40C8 33 7 16 15 8C24 11 28 24 23 40Z" fill="#82b4a3" fillOpacity=".5" stroke="#c8e5d6" strokeWidth="1.2" /><path d="M23 40C35 34 42 19 35 12C25 15 22 27 23 40Z" fill="#aa929e" fillOpacity=".48" stroke="#e0bbc2" strokeWidth="1.2" /><path d="M23 39C25 27 16 24 17 14M24 35C28 27 33 24 33 18" fill="none" stroke="#e9e4ca" strokeWidth="1.1" strokeLinecap="round" /></svg>
      </button>
    </aside>
  )
}

export default PersistentWorldCompanion
