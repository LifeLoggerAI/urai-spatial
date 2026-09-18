'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { v2Onboarding } from '@/spatial/assets/uraiV2Assets'
import { setHapticsEnabled, URAI_HAPTICS_STORAGE_KEY } from '@/spatial/haptics/HapticRuntime'
import UraiCanonicalVersionAssetTemplate from './UraiCanonicalVersionAssetTemplate'
import {
  ONBOARDING_COMPLETION_KEY,
  ONBOARDING_SETUP_COMPLETE_KEY,
  ONBOARDING_SETUP_STEP_KEY,
  isOnboardingSetupStep,
  nextOnboardingSetupStep,
  onboardingSetupStepIndex,
  type OnboardingSetupStep,
} from './onboardingModel'
import './v2-ground-states.css'
import './v2-ground-council.css'
import './v2-ground-objects.css'
import './v2-ground-interaction.css'
import './v2-memory-states.css'
import './v2-realm-states.css'
import './v2-accessibility-states.css'
import './v2-state-controller.css'
import './v2-onboarding.css'

const AUDIO_CONSENT_KEY = 'urai:spatial-audio-consent-v1'
const AUDIO_MUTE_KEY = 'urai:spatial-audio-muted-v1'

const homeCard = {
  asset: v2Onboarding['first-run-home-card'],
  label: 'HOME THRESHOLD',
  title: 'Ground below. Life Map above.',
  href: '/ground?onboarding=1',
  action: 'Enter Ground',
} as const

const cards = {
  '/': homeCard,
  '/home': homeCard,
  '/ground': {
    asset: v2Onboarding['first-run-ground-card'],
    label: 'PRIVATE FLOOR',
    title: 'Inspect first. Approve second.',
    href: '/life-map?onboarding=1',
    action: 'Ascend to Life Map',
  },
  '/life-map': {
    asset: v2Onboarding['first-run-life-map-card'],
    label: 'MEMORY FIELD',
    title: 'Select a star. Enter its Focus.',
    href: '/focus?memoryId=quiet-reset&onboarding=1',
    action: 'Open Focus',
  },
  '/privacy-controls': {
    asset: v2Onboarding['first-run-privacy-card'],
    label: 'CONSENT LAYER',
    title: 'Permissions remain visible and reversible.',
    href: '/passport',
    action: 'Open Passport',
  },
} as const

const setupCopy: Record<OnboardingSetupStep, { eyebrow: string; title: string; body: string }> = {
  welcome: {
    eyebrow: 'WELCOME TO URAI',
    title: 'Your world begins with what you choose.',
    body: 'UrAi turns the signals and memories you choose to share into an explorable private world. You can enter Home before connecting optional data or permissions.',
  },
  privacy: {
    eyebrow: 'PRIVATE BY DEFAULT',
    title: 'Permission is part of the world, not a hidden switch.',
    body: 'Feature-level permissions stay reversible in the Consent Sanctuary. Global Emotional Field contribution starts Off and is controlled separately in Passport.',
  },
  comfort: {
    eyebrow: 'DEVICE FEEL',
    title: 'Choose the sensory cues that help you.',
    body: 'Audio and haptics use the same local runtime controls as the living world. Motion comfort follows your device or browser reduced-motion preference.',
  },
  orb: {
    eyebrow: 'MEET THE ORB',
    title: 'The Orb stays inside the world with you.',
    body: 'The Orb is your in-world companion for attention, conversation, navigation and governed cues. You can explore without opening it, and return to it when you want help.',
  },
}

function safeSet(key: string, value: string) {
  try { window.localStorage.setItem(key, value) } catch { /* local persistence is best effort */ }
}

function rememberCompletion() {
  safeSet(ONBOARDING_COMPLETION_KEY, '1')
  safeSet(ONBOARDING_SETUP_COMPLETE_KEY, '1')
  try { window.localStorage.removeItem(ONBOARDING_SETUP_STEP_KEY) } catch { /* best effort */ }
}

function rememberSetupComplete() {
  safeSet(ONBOARDING_SETUP_COMPLETE_KEY, '1')
  try { window.localStorage.removeItem(ONBOARDING_SETUP_STEP_KEY) } catch { /* best effort */ }
}

function readHapticsPreference() {
  try { return window.localStorage.getItem(URAI_HAPTICS_STORAGE_KEY) !== 'false' } catch { return true }
}

function readAudioPreference() {
  try {
    return window.sessionStorage.getItem(AUDIO_CONSENT_KEY) === 'true'
      && window.sessionStorage.getItem(AUDIO_MUTE_KEY) === 'false'
  } catch {
    return false
  }
}

function OnboardingCardContent() {
  const pathname = usePathname() || ''
  const searchParams = useSearchParams()
  const query = searchParams?.toString() ?? ''
  const [dismissed, setDismissed] = useState(false)
  const [automaticFirstRun, setAutomaticFirstRun] = useState(false)
  const [setupComplete, setSetupComplete] = useState(false)
  const [setupStep, setSetupStep] = useState<OnboardingSetupStep>('welcome')
  const [haptics, setHaptics] = useState(true)
  const [audioEnabled, setAudioEnabled] = useState(false)
  const setupHeadingRef = useRef<HTMLHeadingElement>(null)
  const card = cards[pathname as keyof typeof cards]
  const explicitSequence = searchParams?.get('onboarding') === '1' || searchParams?.get('firstRun') === '1'
  const homeRoute = pathname === '/' || pathname === '/home'

  useEffect(() => {
    setDismissed(false)
    if (!homeRoute) {
      setAutomaticFirstRun(false)
      return
    }
    try {
      const completed = window.localStorage.getItem(ONBOARDING_COMPLETION_KEY) === '1'
      const setupDone = window.localStorage.getItem(ONBOARDING_SETUP_COMPLETE_KEY) === '1'
      const storedStep = window.localStorage.getItem(ONBOARDING_SETUP_STEP_KEY)
      setSetupComplete(setupDone)
      setSetupStep(isOnboardingSetupStep(storedStep) ? storedStep : 'welcome')
      setAutomaticFirstRun(explicitSequence || !completed)
    } catch {
      setSetupComplete(false)
      setSetupStep('welcome')
      setAutomaticFirstRun(true)
    }
    setHaptics(readHapticsPreference())
    setAudioEnabled(readAudioPreference())
  }, [explicitSequence, homeRoute, pathname, query])

  useEffect(() => {
    if (!homeRoute || setupComplete || dismissed) return
    window.requestAnimationFrame(() => setupHeadingRef.current?.focus({ preventScroll: true }))
  }, [dismissed, homeRoute, setupComplete, setupStep])

  const shouldShow = explicitSequence || automaticFirstRun
  if (dismissed || !shouldShow) return null

  const dismiss = () => {
    rememberCompletion()
    setDismissed(true)
  }

  const finishIfLastGuidedStep = () => {
    if (pathname === '/life-map' || pathname === '/privacy-controls') rememberCompletion()
  }

  const advanceSetup = () => {
    const next = nextOnboardingSetupStep(setupStep)
    if (!next) {
      rememberSetupComplete()
      setSetupComplete(true)
      return
    }
    safeSet(ONBOARDING_SETUP_STEP_KEY, next)
    setSetupStep(next)
  }

  const retreatSetup = () => {
    const index = onboardingSetupStepIndex(setupStep)
    const previous = (['welcome', 'privacy', 'comfort', 'orb'] as const)[Math.max(0, index - 1)]
    safeSet(ONBOARDING_SETUP_STEP_KEY, previous)
    setSetupStep(previous)
  }

  const updateHaptics = (enabled: boolean) => {
    setHaptics(enabled)
    setHapticsEnabled(enabled)
  }

  const updateAudio = (enabled: boolean) => {
    setAudioEnabled(enabled)
    window.dispatchEvent(new CustomEvent('urai:audio-consent', { detail: { enabled } }))
    window.dispatchEvent(new CustomEvent('urai:audio-mute', { detail: { muted: !enabled } }))
  }

  if (homeRoute && !setupComplete) {
    const copy = setupCopy[setupStep]
    const stepIndex = onboardingSetupStepIndex(setupStep)
    return (
      <aside
        className="uraiV2OnboardingCard uraiV2OnboardingSetup"
        aria-labelledby="urai-onboarding-setup-title"
        aria-describedby="urai-onboarding-setup-body"
        data-first-run={automaticFirstRun ? 'automatic' : 'guided'}
        data-route={pathname}
        data-setup="true"
        data-setup-step={setupStep}
      >
        <div>
          <span>{copy.eyebrow}</span>
          <h2 id="urai-onboarding-setup-title" ref={setupHeadingRef} tabIndex={-1}>{copy.title}</h2>
          <p id="urai-onboarding-setup-body">{copy.body}</p>

          {setupStep === 'privacy' ? (
            <div className="uraiV2OnboardingLinks" aria-label="Privacy controls">
              <a href="/privacy-controls">Consent Sanctuary</a>
              <a href="/passport">Passport</a>
            </div>
          ) : null}

          {setupStep === 'comfort' ? (
            <div className="uraiV2OnboardingComfort" aria-label="Sensory preferences">
              <label><input type="checkbox" checked={audioEnabled} onChange={(event) => updateAudio(event.currentTarget.checked)} /> <span>World audio</span></label>
              <label><input type="checkbox" checked={haptics} onChange={(event) => updateHaptics(event.currentTarget.checked)} /> <span>Haptic cues</span></label>
              <small>These preferences stay local to this device or session. Accessible text remains available when sound is off.</small>
            </div>
          ) : null}

          <p className="uraiV2OnboardingProgress" aria-live="polite">Step {stepIndex + 1} of 4</p>
          <div className="uraiV2OnboardingActions">
            {stepIndex > 0 ? <button type="button" onClick={retreatSetup}>Back</button> : null}
            <button type="button" className="primary" onClick={advanceSetup}>{setupStep === 'orb' ? 'Begin guided tour' : 'Continue'}</button>
            <button type="button" onClick={dismiss}>Skip setup</button>
          </div>
        </div>
      </aside>
    )
  }

  if (!card) return null

  return (
    <aside className="uraiV2OnboardingCard" aria-label={`${card.label} first-run guide`} data-first-run={automaticFirstRun ? 'automatic' : 'guided'} data-route={pathname}>
      <img
        src={card.asset.src}
        alt={card.asset.alt}
        onError={(event) => {
          if (event.currentTarget.dataset.fallbackApplied === 'true') return
          event.currentTarget.dataset.fallbackApplied = 'true'
          event.currentTarget.src = card.asset.fallback
        }}
      />
      <div>
        <span>{card.label}</span>
        <strong>{card.title}</strong>
        <a href={card.href} onClick={finishIfLastGuidedStep}>{card.action}</a>
        <button type="button" onClick={dismiss}>Skip</button>
      </div>
    </aside>
  )
}

export default function UraiV2OnboardingLayer() {
  return (
    <>
      <UraiCanonicalVersionAssetTemplate />
      <Suspense fallback={null}>
        <OnboardingCardContent />
      </Suspense>
    </>
  )
}
