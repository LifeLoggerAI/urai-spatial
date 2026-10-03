import { createHash } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import path from 'node:path'

const requireFromTierOne = createRequire(new URL('../urai-tier1/package.json', import.meta.url))
const { chromium } = requireFromTierOne('playwright')
const base = process.env.URAI_PROOF_BASE || 'http://127.0.0.1:4173'
const exactHead = process.env.URAI_EXACT_HEAD || 'local'
const outputDir = path.resolve(process.env.URAI_PROOF_DIR || 'artifacts/home-state-proof')
const ownerSelector = '.urai-asset-home-world[data-home-primary-owner="asset-driven"]'
const states = [
  { id: 'permission-limited', query: 'homeState=permission-limited' },
  { id: 'unavailable', query: 'homeState=unavailable' },
  { id: 'offline', query: 'homeState=offline' },
]

await mkdir(outputDir, { recursive: true })
const receipt = {
  schemaVersion: 'urai-home-state-proof-6',
  exactHead,
  capturedAt: new Date().toISOString(),
  runtimeContract: 'natural-home-live-owner-orb-lifecycle-stability-accessibility-and-retained-canvas-evidence',
  visualGate: {
    source: 'retained-canvas-png',
    sampling: 'distributed-3x3-neighborhood',
    minimumViewportCoverage: 0.82,
    minimumLuminanceRange: 12,
    minimumVisibleSamples: 3,
  },
  captures: [],
  voiceQualifications: [],
  launchAudioQualification: 'pending-accepted-provider-and-device-evidence',
  assetFailureContract: 'real-loader-http-503-degraded-unready-native-retry-and-fresh-successful-load',
  errors: [],
}

async function settleAnimationFrames(page, frameCount, timeoutMs = 15_000) {
  return page.evaluate(({ frames, timeoutMs }) => new Promise((resolve) => {
    let completed = 0
    let settled = false
    const finish = (timedOut) => {
      if (settled) return
      settled = true
      window.clearTimeout(timer)
      resolve({ completed, requested: frames, timedOut })
    }
    const timer = window.setTimeout(() => finish(true), timeoutMs)
    const advance = () => {
      if (settled) return
      completed += 1
      if (completed >= frames) finish(false)
      else window.requestAnimationFrame(advance)
    }
    window.requestAnimationFrame(advance)
  }), { frames: frameCount, timeoutMs })
}

async function readVisualEvidence(page) {
  const canvas = page.locator('.urai-asset-home-world canvas').first()
  await canvas.waitFor({ state: 'visible', timeout: 45_000 })
  const bounds = await page.evaluate(() => {
    const element = document.querySelector('.urai-asset-home-world canvas')
    if (!element) return null
    const rect = element.getBoundingClientRect()
    return { x: rect.x, y: rect.y, width: rect.width, height: rect.height }
  })
  const viewport = page.viewportSize()
  if (!bounds || !viewport) return { available: false, reason: 'missing-canvas-bounds' }
  const clipX = Math.max(0, bounds.x)
  const clipY = Math.max(0, bounds.y)
  const visibleWidth = Math.max(0, Math.min(bounds.x + bounds.width, viewport.width) - clipX)
  const visibleHeight = Math.max(0, Math.min(bounds.y + bounds.height, viewport.height) - clipY)
  const viewportCoverage = visibleWidth * visibleHeight / Math.max(1, viewport.width * viewport.height)
  if (visibleWidth < 1 || visibleHeight < 1) return { available: false, reason: 'canvas-outside-viewport', viewportCoverage }
  const png = await page.screenshot({
    animations: 'disabled',
    caret: 'hide',
    timeout: 90_000,
    clip: { x: clipX, y: clipY, width: visibleWidth, height: visibleHeight },
  })
  const dataUrl = `data:image/png;base64,${png.toString('base64')}`
  const sample = await page.evaluate(async ({ dataUrl }) => {
    const image = new Image()
    const loaded = new Promise((resolve, reject) => {
      image.onload = resolve
      image.onerror = () => reject(new Error('retained canvas PNG could not be decoded'))
    })
    image.src = dataUrl
    await loaded
    const surface = document.createElement('canvas')
    surface.width = Math.max(1, image.naturalWidth)
    surface.height = Math.max(1, image.naturalHeight)
    const context = surface.getContext('2d', { willReadFrequently: true })
    if (!context) return { available: false, reason: 'missing-2d-sampler' }
    context.drawImage(image, 0, 0)
    const points = [
      [0.18, 0.2], [0.5, 0.2], [0.82, 0.2],
      [0.18, 0.5], [0.5, 0.5], [0.82, 0.5],
      [0.18, 0.8], [0.5, 0.8], [0.82, 0.8],
    ]
    const luminance = points.map(([xRatio, yRatio]) => {
      const x = Math.max(0, Math.min(surface.width - 3, Math.round(surface.width * xRatio) - 1))
      const y = Math.max(0, Math.min(surface.height - 3, Math.round(surface.height * yRatio) - 1))
      const pixels = context.getImageData(x, y, Math.min(3, surface.width), Math.min(3, surface.height)).data
      let total = 0
      let count = 0
      for (let index = 0; index < pixels.length; index += 4) {
        total += pixels[index] * 0.2126 + pixels[index + 1] * 0.7152 + pixels[index + 2] * 0.0722
        count += 1
      }
      return Math.round(total / Math.max(1, count))
    })
    return {
      available: true,
      pngWidth: surface.width,
      pngHeight: surface.height,
      luminance,
      luminanceRange: Math.max(...luminance) - Math.min(...luminance),
      visibleSamples: luminance.filter((value) => value >= 8).length,
    }
  }, { dataUrl })
  return { ...sample, viewportCoverage, bounds: { width: bounds.width, height: bounds.height }, canvasPngBytes: png.length }
}

async function waitForVisualEvidence(page, frameBudget = 240) {
  let evidence = null
  const sampleInterval = Math.max(1, Math.ceil(frameBudget / 2))
  for (let elapsed = 0; elapsed < frameBudget; elapsed += sampleInterval) {
    const frames = Math.min(sampleInterval, frameBudget - elapsed)
    await settleAnimationFrames(page, frames)
    evidence = await readVisualEvidence(page)
    if (evidence.available === true
      && evidence.viewportCoverage >= receipt.visualGate.minimumViewportCoverage
      && evidence.luminanceRange >= receipt.visualGate.minimumLuminanceRange
      && evidence.visibleSamples >= receipt.visualGate.minimumVisibleSamples) return evidence
  }
  return evidence ? { ...evidence, available: false, reason: 'visual-gate-not-met' } : evidence
}

async function waitForHomeReady(page) {
  const owner = page.locator(ownerSelector)
  await owner.waitFor({ state: 'visible', timeout: 45_000 })
  await page.waitForFunction(
    (selector) => document.querySelector(selector)?.getAttribute('data-home-assets-ready') === 'true',
    ownerSelector,
    { timeout: 45_000 },
  )
  return owner
}

async function capture(state, options = {}) {
  const browser = await chromium.launch({ headless: true, args: ['--enable-unsafe-swiftshader'] })
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    reducedMotion: options.reducedMotion,
    forcedColors: options.forcedColors,
  })
  const page = await context.newPage()
  const pageErrors = []
  page.on('pageerror', (error) => pageErrors.push(String(error)))
  const query = `homeAssetReview=1&${state.query}`
  const record = { id: state.id, query, pageErrors, passed: false }
  try {
    const response = await page.goto(`${base}/home/?${query}`, { waitUntil: 'domcontentloaded', timeout: 60_000 })
    const owner = await waitForHomeReady(page)
    await settleAnimationFrames(page, options.forcedColors === 'active' ? 24 : 60)

    record.status = response?.status()
    record.canvasReady = await owner.getAttribute('data-home-assets-ready')
    record.primaryOwner = await owner.getAttribute('data-home-primary-owner')
    record.visibleWorld = await owner.getAttribute('data-home-visible-world')
    record.movement = await owner.getAttribute('data-home-movement')
    record.runtimeAssets = await owner.getAttribute('data-home-runtime-assets')
    record.pointerLock = await page.evaluate(() => document.pointerLockElement === null)
    record.accessibleRuntimeText = (await owner.textContent()) || ''
    record.semanticControls = await page.locator('.home-semantic-navigation :is(button,a)').evaluateAll((buttons) => buttons.map((button) => ({
      label: button.getAttribute('aria-label'),
      text: button.textContent,
    })))
    record.accessibilityPassed = record.semanticControls.length >= 3
      && record.semanticControls.some((control) => control.label === 'Open URAI Orb companion')
      && record.semanticControls.some((control) => control.label === 'Open Ground directly')
      && record.semanticControls.some((control) => control.label === 'Open Life Map directly' || control.label === 'Ascend to Life Map')

    const visualRequired = options.forcedColors !== 'active'
    record.visualRequired = visualRequired
    record.visual = visualRequired ? await waitForVisualEvidence(page) : { available: false, reason: 'forced-colors-accessibility-path' }
    record.visualPassed = !visualRequired || (
      record.visual?.available === true
      && record.visual.viewportCoverage >= receipt.visualGate.minimumViewportCoverage
      && record.visual.luminanceRange >= receipt.visualGate.minimumLuminanceRange
      && record.visual.visibleSamples >= receipt.visualGate.minimumVisibleSamples
    )

    record.screenshot = `${state.id}-${exactHead.slice(0, 12)}.png`
    const screenshot = await page.screenshot({ path: path.join(outputDir, record.screenshot), fullPage: false, animations: 'disabled', caret: 'hide', timeout: 90_000 })
    record.screenshotBytes = screenshot.length
    record.screenshotSha256 = createHash('sha256').update(screenshot).digest('hex')

    record.passed = record.status === 200
      && record.canvasReady === 'true'
      && record.primaryOwner === 'asset-driven'
      && record.visibleWorld === 'authored-coherent-three-dimensional-sanctuary'
      && record.movement === 'walk-keyboard-click-touch'
      && record.runtimeAssets?.includes('home-entry-chamber-v1.glb')
      && record.runtimeAssets?.includes('living-orb')
      && record.runtimeAssets?.includes('reflecting-water')
      && record.pointerLock
      && record.accessibilityPassed
      && record.visualPassed
      && record.screenshotBytes > 12_000
      && pageErrors.length === 0
  } catch (error) {
    record.error = String(error)
  } finally {
    receipt.captures.push(record)
    if (!record.passed) receipt.errors.push(record)
    await context.close().catch(() => {})
    await browser.close().catch(() => {})
  }
}

async function captureOrbLifecycle({ reducedMotion = 'no-preference' } = {}) {
  const browser = await chromium.launch({ headless: true, args: ['--enable-unsafe-swiftshader'] })
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion })
  const page = await context.newPage()
  const pageErrors = []
  page.on('pageerror', (error) => pageErrors.push(String(error)))
  const id = reducedMotion === 'reduce' ? 'orb-lifecycle-reduced-motion' : 'orb-lifecycle-production-ui'
  const record = { id, pageErrors, passed: false, reducedMotion }
  const voiceProviderRequests = []
  page.on('request', (request) => {
    if (new URL(request.url()).pathname === '/api/urai/narrator/elevenlabs') voiceProviderRequests.push(request.url())
  })
  let stage = 'initialize'
  try {
    await page.addInitScript(() => {
      window.__uraiObservedOrbStates = []
      window.__uraiObservedOrbEventSnapshots = []
      window.addEventListener('urai:orb-state', (event) => {
        const state = event?.detail?.state ?? 'unknown'
        window.__uraiObservedOrbStates.push(state)
        const retain = (phase) => {
          const owner = document.querySelector('.urai-asset-home-world[data-home-primary-owner="asset-driven"]')
          window.__uraiObservedOrbEventSnapshots.push({
            state,
            phase,
            ownerState: owner?.getAttribute('data-home-orb-state') ?? null,
            clip: owner?.getAttribute('data-home-orb-clip') ?? null,
            animation: owner?.getAttribute('data-home-orb-animation') ?? null,
            at: performance.now(),
          })
        }
        queueMicrotask(() => retain('microtask'))
        window.requestAnimationFrame(() => retain('animation-frame'))
      })
    })
    stage = 'home-ready'
    const response = await page.goto(`${base}/home/?homeAssetReview=1`, { waitUntil: 'domcontentloaded', timeout: 60_000 })
    const owner = await waitForHomeReady(page)
    await page.waitForFunction(
      (selector) => Boolean(document.querySelector(selector)?.getAttribute('data-home-orb-state')),
      ownerSelector,
      { timeout: 20_000 },
    )
    await page.evaluate((selector) => {
      const owner = document.querySelector(selector)
      if (!(owner instanceof HTMLElement)) throw new Error('Home Orb lifecycle owner is missing')
      window.__uraiObservedOrbLifecycle = []
      const recordLifecycle = () => {
        const snapshot = {
          state: owner.getAttribute('data-home-orb-state'),
          clip: owner.getAttribute('data-home-orb-clip'),
          animation: owner.getAttribute('data-home-orb-animation'),
        }
        const history = window.__uraiObservedOrbLifecycle
        const previous = history.at(-1)
        if (!previous || previous.state !== snapshot.state || previous.clip !== snapshot.clip || previous.animation !== snapshot.animation) history.push(snapshot)
      }
      recordLifecycle()
      const observer = new MutationObserver(recordLifecycle)
      observer.observe(owner, {
        attributes: true,
        attributeFilter: ['data-home-orb-state', 'data-home-orb-clip', 'data-home-orb-animation'],
      })
      window.__uraiOrbLifecycleObserver = observer
    }, ownerSelector)

    const openOrb = page.getByRole('navigation', { name: 'Accessible Home destinations' }).getByTestId('home-semantic-orb')
    await openOrb.waitFor({ state: 'attached', timeout: 20_000 })
    await openOrb.focus()
    stage = 'open-companion'
    await page.keyboard.press('Enter')
    await page.locator('#urai-world-companion-menu[aria-hidden="false"]').waitFor({ state: 'visible', timeout: 20_000 })
    await page.waitForFunction(
      (selector) => document.querySelector(selector)?.getAttribute('data-home-orb-state') === 'attention',
      ownerSelector,
      { timeout: 20_000 },
    )

    stage = 'open-conversation'
    const talk = page.locator('summary').filter({ hasText: 'Talk with Orb' }).first()
    await talk.waitFor({ state: 'visible', timeout: 20_000 })
    await talk.focus()
    await page.keyboard.press('Enter')
    const message = page.getByLabel('Message for Orb').first()
    await message.waitFor({ state: 'visible', timeout: 20_000 })
    stage = 'focus-message'
    await message.focus()
    await page.waitForFunction(
      (selector) => document.querySelector(selector)?.getAttribute('data-home-orb-state') === 'attention',
      ownerSelector,
      { timeout: 20_000 },
    )
    record.inputMode = 'typed-text'
    record.inputState = await owner.getAttribute('data-home-orb-state')
    record.inputClip = await owner.getAttribute('data-home-orb-clip')
    record.inputAnimation = await owner.getAttribute('data-home-orb-animation')
    record.microphoneQualification = 'not-implemented-or-certified-by-typed-input'

    // Exercise the text completion first, with speech explicitly muted. A completed
    // response must never be accepted as evidence that a microphone or voice ran.
    const voiceToggle = page.getByRole('button', { name: 'Voice on', exact: true })
    await voiceToggle.focus()
    await page.keyboard.press('Enter')
    const panel = page.locator('details[data-orb-voice-phase]').first()
    await page.getByRole('button', { name: 'Voice muted', exact: true }).waitFor({ state: 'visible' })
    const consent = page.getByLabel('Allow this message and bounded recent context to be processed by OpenAI.').first()
    stage = 'grant-consent-keyboard'
    await consent.focus()
    await page.keyboard.press('Space')
    if (!await consent.isChecked()) throw new Error('Native keyboard consent grant did not check the checkbox')
    record.consentInput = 'native-keyboard'
    record.consentGranted = true
    await message.fill('Give me a short grounded reflection.')
    await message.focus()
    stage = 'send-text-response'
    await page.getByRole('button', { name: 'Send' }).focus()
    await page.keyboard.press('Enter')
    await page.locator('section[aria-label="Orb response"]').waitFor({ state: 'visible', timeout: 20_000 })
    await page.waitForFunction((selector) => document.querySelector(selector)?.getAttribute('data-home-orb-state') === 'attention', ownerSelector)
    record.textReadyState = await owner.getAttribute('data-home-orb-state')
    record.textReadyClip = await owner.getAttribute('data-home-orb-clip')
    record.textReadyAnimation = await owner.getAttribute('data-home-orb-animation')
    record.textOnlyVoicePhase = await panel.getAttribute('data-orb-voice-phase')
    const textStates = await page.evaluate(() => window.__uraiObservedOrbStates || [])
    record.textDidNotClaimListeningOrSpeaking = !textStates.includes('listening') && !textStates.includes('speaking')

    stage = 'enable-low-stimulation-settings'
    const settingsPage = await context.newPage()
    settingsPage.on('pageerror', (error) => pageErrors.push(`settings: ${String(error)}`))
    const settingsResponse = await settingsPage.goto(`${base}/settings/`, { waitUntil: 'domcontentloaded', timeout: 60_000 })
    if (settingsResponse?.status() !== 200) throw new Error('Device settings did not load for the low-stimulation interaction proof')
    const comfortToggle = settingsPage.getByRole('checkbox', { name: 'Low stimulation', exact: true })
    await comfortToggle.waitFor({ state: 'visible', timeout: 20_000 })
    await comfortToggle.focus()
    await settingsPage.keyboard.press('Space')
    if (!await comfortToggle.isChecked()) throw new Error('Native keyboard low-stimulation enable did not check the control')
    await page.bringToFront()
    await page.waitForFunction((selector) => document.querySelector(selector)?.getAttribute('data-home-orb-reduced-stimulation') === 'true', ownerSelector)
    const requestsBeforeComfortAttempt = voiceProviderRequests.length
    const statesBeforeComfortAttempt = await page.evaluate(() => window.__uraiObservedOrbStates.length)
    const mutedVoice = page.getByRole('button', { name: 'Voice muted', exact: true })
    await mutedVoice.focus()
    await page.keyboard.press('Enter')
    await page.waitForFunction(() => document.querySelector('details[data-orb-voice-phase] [role="status"]')?.textContent?.includes('turn low stimulation off before enabling voice'))
    record.lowStimulationBlockedUnmute = await mutedVoice.getAttribute('aria-pressed') === 'false'
      && await page.getByRole('button', { name: 'Replay', exact: true }).isDisabled()
      && await panel.getAttribute('data-orb-voice-phase') === 'idle'
      && await owner.getAttribute('data-home-orb-playback') === 'stopped'
      && voiceProviderRequests.length === requestsBeforeComfortAttempt
    record.lowStimulationInput = 'native-keyboard-device-setting-and-voice-toggle'
    record.lowStimulationVoiceAttempts = voiceProviderRequests.length - requestsBeforeComfortAttempt
    record.lowStimulationScreenshot = `${id}-low-stimulation-${exactHead.slice(0, 12)}.png`
    const comfortScreenshot = await page.screenshot({ path: path.join(outputDir, record.lowStimulationScreenshot), animations: 'disabled', caret: 'hide', timeout: 90_000 })
    record.lowStimulationScreenshotBytes = comfortScreenshot.length
    record.lowStimulationScreenshotSha256 = createHash('sha256').update(comfortScreenshot).digest('hex')
    await settingsPage.bringToFront()
    await comfortToggle.focus()
    await settingsPage.keyboard.press('Space')
    if (await comfortToggle.isChecked()) throw new Error('Native keyboard low-stimulation disable left the control checked')
    await page.bringToFront()
    await page.waitForFunction((selector) => document.querySelector(selector)?.getAttribute('data-home-orb-reduced-stimulation') === 'false', ownerSelector)
    await page.waitForFunction(() => document.querySelector('details[data-orb-voice-phase] [role="status"]')?.textContent?.includes('voice remains muted until you choose Voice on'))
    record.lowStimulationOffRemainedMuted = await mutedVoice.getAttribute('aria-pressed') === 'false'
      && await page.getByRole('button', { name: 'Replay', exact: true }).isDisabled()
      && await panel.getAttribute('data-orb-voice-phase') === 'idle'
      && voiceProviderRequests.length === requestsBeforeComfortAttempt
    record.lowStimulationDidNotClaimSpeech = await page.evaluate((start) => !window.__uraiObservedOrbStates.slice(start).includes('speaking'), statesBeforeComfortAttempt)
    await settingsPage.close()

    stage = 'voice-replay'
    await page.getByRole('button', { name: 'Voice muted', exact: true }).focus()
    await page.keyboard.press('Enter')
    await page.getByRole('button', { name: 'Replay', exact: true }).focus()
    await page.keyboard.press('Enter')
    const voiceSnapshotHandle = await page.waitForFunction((selector) => {
      const panel = document.querySelector('details[data-orb-voice-phase]')
      const owner = document.querySelector(selector)
      if (panel?.getAttribute('data-orb-voice-phase') === 'speaking' && owner?.getAttribute('data-home-orb-state') === 'speaking') {
        return {
          available: true,
          phase: 'speaking',
          state: owner.getAttribute('data-home-orb-state'),
          clip: owner.getAttribute('data-home-orb-clip'),
          animation: owner.getAttribute('data-home-orb-animation'),
        }
      }
      const status = panel?.querySelector('[role="status"]')?.textContent || ''
      if (panel?.getAttribute('data-orb-voice-phase') === 'idle' && status.includes('Voice playback is unavailable')) {
        return { available: false, phase: 'idle', reason: 'No local device voice started; text remains available.' }
      }
      return false
    }, ownerSelector, { timeout: 20_000 })
    const voiceSnapshot = await voiceSnapshotHandle.jsonValue()
    await voiceSnapshotHandle.dispose()
    record.voicePlayback = voiceSnapshot
    record.respondingState = voiceSnapshot.state ?? null
    record.respondingClip = voiceSnapshot.clip ?? null
    record.respondingAnimation = voiceSnapshot.animation ?? null
    record.voiceAcceptance = 'actual-media-start-and-rendered-speaking-state'
    record.observedLifecycle = await page.evaluate(() => window.__uraiObservedOrbLifecycle || [])
    record.observedEventSnapshots = await page.evaluate(() => window.__uraiObservedOrbEventSnapshots || [])
    record.observedStates = await page.evaluate(() => window.__uraiObservedOrbStates || [])
    record.lifecyclePassed = ['attention', 'thinking'].every((state) => record.observedStates.includes(state))
    record.voiceQualification = {
      status: voiceSnapshot.available ? 'native-playback-observed' : 'unavailable-local-voice',
      playback: voiceSnapshot,
      externalNaturalVoice: 'not-exercised-with-provider-admission',
      microphone: 'not-exercised-no-capture-path',
    }

    // Stop must remain available after the text provider finishes, and must end
    // voice playback without an old completion callback restoring another state.
    if (voiceSnapshot.available) {
      stage = 'stop-voice'
      await page.getByRole('button', { name: 'Stop', exact: true }).focus()
      await page.keyboard.press('Enter')
      await page.waitForFunction((selector) => document.querySelector(selector)?.getAttribute('data-home-orb-state') === 'idle', ownerSelector)
    }
    record.stoppedVoicePhase = await panel.getAttribute('data-orb-voice-phase')

    stage = 'revoke-consent'
    await consent.focus()
    await page.keyboard.press('Space')
    if (await consent.isChecked()) throw new Error('Native keyboard consent revocation left the checkbox checked')
    record.consentRevoked = true
    await page.waitForFunction((selector) => document.querySelector(selector)?.getAttribute('data-home-orb-state') === 'privacy', ownerSelector)
    record.privacyState = await owner.getAttribute('data-home-orb-state')
    record.privacyClip = await owner.getAttribute('data-home-orb-clip')
    record.privacyAnimation = await owner.getAttribute('data-home-orb-animation')

    record.visual = await waitForVisualEvidence(page)
    record.screenshot = `${id}-${exactHead.slice(0, 12)}.png`
    const screenshot = await page.screenshot({ path: path.join(outputDir, record.screenshot), fullPage: false, animations: 'disabled', caret: 'hide', timeout: 90_000 })
    record.screenshotBytes = screenshot.length
    record.screenshotSha256 = createHash('sha256').update(screenshot).digest('hex')

    stage = 'close-companion'
    await page.keyboard.press('Escape')
    await page.waitForFunction((selector) => document.querySelector(selector)?.getAttribute('data-home-orb-state') === 'idle', ownerSelector)
    record.closedState = await owner.getAttribute('data-home-orb-state')
    record.closedClip = await owner.getAttribute('data-home-orb-clip')
    record.closedAnimation = await owner.getAttribute('data-home-orb-animation')

    const expectedAnimation = reducedMotion === 'reduce' ? 'orb-state-static' : null
    record.voiceQualificationPassed = record.voicePlayback?.available === true
      && record.respondingState === 'speaking'
      && record.respondingClip === 'Orb_Speaking'
      && record.respondingAnimation === (expectedAnimation ?? 'orb-speaking')
    record.voiceBoundaryPassed = record.voiceQualificationPassed
      || (record.voicePlayback?.available === false && record.voicePlayback.phase === 'idle'
        && !record.observedStates.includes('speaking') && record.textOnlyVoicePhase === 'idle')
    record.passed = response?.status() === 200
      && record.inputState === 'attention'
      && record.inputClip === 'Orb_Attention'
      && record.inputAnimation === (expectedAnimation ?? 'orb-attention')
      && record.textReadyState === 'attention'
      && record.textReadyClip === 'Orb_Attention'
      && record.textReadyAnimation === (expectedAnimation ?? 'orb-attention')
      && record.textOnlyVoicePhase === 'idle'
      && record.textDidNotClaimListeningOrSpeaking
      && record.lowStimulationBlockedUnmute && record.lowStimulationOffRemainedMuted
      && record.lowStimulationDidNotClaimSpeech && record.lowStimulationScreenshotBytes > 12_000
      && record.voiceBoundaryPassed
      && record.stoppedVoicePhase === 'idle'
      && record.privacyState === 'privacy'
      && record.privacyClip === 'Orb_Privacy'
      && record.privacyAnimation === (expectedAnimation ?? 'orb-privacy')
      && record.closedState === 'idle'
      && record.closedClip === 'Orb_Idle'
      && record.closedAnimation === (expectedAnimation ?? 'orb-breathe')
      && record.lifecyclePassed
      && record.visual?.available === true
      && record.visual.viewportCoverage >= receipt.visualGate.minimumViewportCoverage
      && record.visual.luminanceRange >= receipt.visualGate.minimumLuminanceRange
      && record.visual.visibleSamples >= receipt.visualGate.minimumVisibleSamples
      && record.screenshotBytes > 12_000
      && pageErrors.length === 0
  } catch (error) {
    record.error = String(error)
    record.failedStage = stage
    record.observedStates = await page.evaluate(() => window.__uraiObservedOrbStates || []).catch(() => [])
    record.ownerState = await page.locator(ownerSelector).getAttribute('data-home-orb-state').catch(() => null)
    record.ownerClip = await page.locator(ownerSelector).getAttribute('data-home-orb-clip').catch(() => null)
    record.errorStack = error instanceof Error ? error.stack : null
    record.failureScreenshot = `${id}-failure-${exactHead.slice(0, 12)}.png`
    await page.screenshot({ path: path.join(outputDir, record.failureScreenshot), timeout: 30_000 }).catch(() => {})
  } finally {
    receipt.captures.push(record)
    receipt.voiceQualifications.push({
      id,
      technicalTextLifecyclePassed: record.passed,
      nativeVoiceQualificationPassed: record.voiceQualificationPassed === true,
      qualification: record.voiceQualification ?? { status: 'not-observed', failedStage: stage },
    })
    if (!record.passed) receipt.errors.push(record)
    await context.close().catch(() => {})
    await browser.close().catch(() => {})
  }
}

async function captureHomeAssetFailure(fixture) {
  const browser = await chromium.launch({ headless: true, args: ['--enable-unsafe-swiftshader'] })
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await context.newPage()
  const targetUrl = new URL(fixture.asset, base).toString()
  const pageErrors = []
  const consoleErrors = []
  const loaderRequests = []
  const loaderResponses = []
  let failureFixtureActive = true
  let stage = 'blocked-loader'
  const record = { id: `home-asset-failure-${fixture.id}`, asset: fixture.asset, failureMechanism: 'real-loader-http-503', loaderRequests, loaderResponses, pageErrors, consoleErrors, passed: false }
  page.on('pageerror', (error) => pageErrors.push(String(error)))
  page.on('console', (message) => {
    if (message.type() !== 'error') return
    const text = message.text()
    const location = message.location()
    const intentionalAssetFailure = failureFixtureActive && (
      (text.includes(fixture.asset) && /Could not load|Failed to load resource/.test(text))
      || (location.url === targetUrl && /Failed to load resource/.test(text) && text.includes('503'))
    )
    consoleErrors.push({ text, location, intentionalAssetFailure })
  })
  page.on('request', (request) => {
    if (request.url() === targetUrl) loaderRequests.push({ url: request.url(), phase: failureFixtureActive ? 'failure' : 'retry', resourceType: request.resourceType() })
  })
  page.on('response', (response) => {
    if (response.url() === targetUrl) loaderResponses.push({ url: response.url(), phase: failureFixtureActive ? 'failure' : 'retry', status: response.status() })
  })
  const blockActualAssetRequest = (route) => route.fulfill({ status: 503, contentType: 'text/plain', body: 'Intentional Home asset failure proof fixture' })
  await page.route(targetUrl, blockActualAssetRequest)
  try {
    // The query identifies the retained evidence only. The runtime does not read
    // homeAssetFailure; the real useGLTF request is blocked above before preload.
    const query = `homeAssetReview=1&homeAssetFailure=${fixture.id}`
    const response = await page.goto(`${base}/home/?${query}`, { waitUntil: 'domcontentloaded', timeout: 60_000 })
    record.status = response?.status()
    const fallback = page.getByTestId('urai-home-accessible-fallback')
    await fallback.waitFor({ state: 'visible', timeout: 45_000 })
    record.failureRuntime = await fallback.getAttribute('data-urai-home-runtime')
    record.failedAssetsReady = await fallback.getAttribute('data-home-assets-ready')
    record.failedWebglReady = await fallback.getAttribute('data-webgl-ready')
    record.primaryOwnersDuringFailure = await page.locator(ownerSelector).count()
    record.loadingOverlaysDuringFailure = await page.locator('.home-runtime-loading').count()
    record.failedPointerLock = await page.evaluate(() => document.pointerLockElement === null)
    const navigation = page.getByRole('navigation', { name: 'Accessible Home destinations' })
    record.fallbackControls = await navigation.locator('button,a').evaluateAll((controls) => controls.map((control) => ({
      label: control.getAttribute('aria-label'), href: control.getAttribute('href'), disabled: control.hasAttribute('disabled'),
      width: control.getBoundingClientRect().width, height: control.getBoundingClientRect().height,
    })))
    record.semanticDestinationsPassed = record.fallbackControls.length === 3
      && record.fallbackControls.every((control) => !control.disabled && control.width >= 48 && control.height >= 48)
      && record.fallbackControls.some((control) => control.label === 'Open URAI Orb companion')
      && record.fallbackControls.some((control) => control.label === 'Open Ground directly' && control.href === '/ground/?entryPortal=home-ground&cameraCheckpoint=home-ground-descent')
      && record.fallbackControls.some((control) => control.label === 'Open Life Map directly' && control.href === '/life-map/?from=home-sky&entryPortal=home-sky&cameraCheckpoint=home-sky-ascent-complete')
    stage = 'fallback-orb-access'
    await navigation.getByTestId('home-semantic-orb').focus()
    await page.keyboard.press('Enter')
    await page.locator('#urai-world-companion-menu[aria-hidden="false"]').waitFor({ state: 'visible', timeout: 20_000 })
    record.fallbackOrbOpened = true
    await page.keyboard.press('Escape')
    await page.locator('#urai-world-companion-menu[aria-hidden="true"]').waitFor({ state: 'attached', timeout: 20_000 })

    stage = 'fallback-direct-travel'
    const travelLink = navigation.getByTestId(fixture.travelTestId)
    await travelLink.focus()
    const destinationPagePromise = context.waitForEvent('page', { timeout: 20_000 })
    await page.keyboard.press('Control+Enter')
    const destinationPage = await destinationPagePromise
    await destinationPage.waitForURL((url) => url.pathname.replace(/\/$/, '') === fixture.destination, { timeout: 45_000 })
    await destinationPage.waitForLoadState('domcontentloaded')
    record.fallbackDirectTravel = { input: 'native-keyboard-control-enter', destination: new URL(destinationPage.url()).pathname }
    await destinationPage.close()
    await page.bringToFront()
    record.failureScreenshot = `${record.id}-${exactHead.slice(0, 12)}.png`
    const failedScreenshot = await page.screenshot({ path: path.join(outputDir, record.failureScreenshot), animations: 'disabled', caret: 'hide', timeout: 90_000 })
    record.failureScreenshotBytes = failedScreenshot.length
    record.failureScreenshotSha256 = createHash('sha256').update(failedScreenshot).digest('hex')

    stage = 'native-retry'
    await page.unroute(targetUrl, blockActualAssetRequest)
    failureFixtureActive = false
    const retry = page.getByTestId('home-retry-assets')
    await retry.focus()
    await page.keyboard.press('Enter')
    const owner = await waitForHomeReady(page)
    await page.getByTestId('urai-home-accessible-fallback').waitFor({ state: 'detached', timeout: 20_000 })
    record.retryInput = 'native-keyboard-enter'
    record.recoveredAssetsReady = await owner.getAttribute('data-home-assets-ready')
    record.recoveredOwner = await owner.getAttribute('data-home-primary-owner')
    record.recoveredPointerLock = await page.evaluate(() => document.pointerLockElement === null)
    record.recoveredVisual = await waitForVisualEvidence(page)
    record.retryScreenshot = `${record.id}-retry-${exactHead.slice(0, 12)}.png`
    const retryScreenshot = await page.screenshot({ path: path.join(outputDir, record.retryScreenshot), animations: 'disabled', caret: 'hide', timeout: 90_000 })
    record.retryScreenshotBytes = retryScreenshot.length
    record.retryScreenshotSha256 = createHash('sha256').update(retryScreenshot).digest('hex')
    record.actualBlockedRequestObserved = loaderRequests.some((request) => request.phase === 'failure')
      && loaderResponses.some((response) => response.phase === 'failure' && response.status === 503)
    record.freshSuccessfulRetryObserved = loaderRequests.some((request) => request.phase === 'retry')
      && loaderResponses.some((response) => response.phase === 'retry' && response.status === 200)
    record.unexpectedConsoleErrors = consoleErrors.filter((error) => !error.intentionalAssetFailure)
    record.unexpectedPageErrors = pageErrors.filter((error) => !(
      error.includes(fixture.asset)
      && /Could not load|503|Service Unavailable/.test(error)
    ))
    record.passed = record.status === 200 && record.actualBlockedRequestObserved
      && record.failureRuntime === 'accessible-fallback-after-asset-load-failure'
      && record.failedAssetsReady === 'false' && record.failedWebglReady === 'false'
      && record.primaryOwnersDuringFailure === 0 && record.loadingOverlaysDuringFailure === 0
      && record.failedPointerLock && record.semanticDestinationsPassed && record.fallbackOrbOpened
      && record.fallbackDirectTravel?.destination.replace(/\/$/, '') === fixture.destination
      && record.failureScreenshotBytes > 0 && record.freshSuccessfulRetryObserved
      && record.recoveredAssetsReady === 'true' && record.recoveredOwner === 'asset-driven'
      && record.recoveredPointerLock && record.recoveredVisual?.available === true
      && record.recoveredVisual.viewportCoverage >= receipt.visualGate.minimumViewportCoverage
      && record.recoveredVisual.luminanceRange >= receipt.visualGate.minimumLuminanceRange
      && record.recoveredVisual.visibleSamples >= receipt.visualGate.minimumVisibleSamples
      && record.retryScreenshotBytes > 12_000 && record.unexpectedPageErrors.length === 0 && record.unexpectedConsoleErrors.length === 0
  } catch (error) {
    record.error = String(error)
    record.failedStage = stage
    record.failureScreenshot = `${record.id}-harness-failure-${exactHead.slice(0, 12)}.png`
    await page.screenshot({ path: path.join(outputDir, record.failureScreenshot), timeout: 30_000 }).catch(() => {})
  } finally {
    receipt.captures.push(record)
    if (!record.passed) receipt.errors.push(record)
    await context.close().catch(() => {})
    await browser.close().catch(() => {})
  }
}

for (const fixture of [
  { id: 'sanctuary', asset: '/assets/urai/generated/models/home-entry-chamber-v1.glb', travelTestId: 'home-semantic-ground', destination: '/ground' },
  { id: 'orb', asset: '/assets/urai/generated/models/urai-orb-avatar-v1.glb', travelTestId: 'home-semantic-ground', destination: '/ground' },
  { id: 'fern', asset: '/assets/urai/home-production/cc0/polyhaven-fern-02-geometry-v1.glb', travelTestId: 'home-semantic-life-map', destination: '/life-map' },
]) await captureHomeAssetFailure(fixture)

for (const state of states) await capture(state)
await capture({ id: 'reduced-motion', query: 'homePrivateFixture=1' }, { reducedMotion: 'reduce' })
await capture({ id: 'forced-colors', query: 'homePrivateFixture=1' }, { forcedColors: 'active' })
await captureOrbLifecycle()
await captureOrbLifecycle({ reducedMotion: 'reduce' })

const transitionBrowser = await chromium.launch({ headless: true, args: ['--enable-unsafe-swiftshader'] })
const transitionContext = await transitionBrowser.newContext({ viewport: { width: 1440, height: 900 } })
const transitionPage = await transitionContext.newPage()
const transitionErrors = []
transitionPage.on('pageerror', (error) => transitionErrors.push(String(error)))
const transition = { id: 'home-real-offline-transition', pageErrors: transitionErrors, passed: false }
try {
  const response = await transitionPage.goto(`${base}/home/?homeAssetReview=1`, { waitUntil: 'domcontentloaded', timeout: 60_000 })
  const owner = await waitForHomeReady(transitionPage)
  await transitionContext.setOffline(true)
  await transitionPage.evaluate(() => window.dispatchEvent(new Event('offline')))
  await settleAnimationFrames(transitionPage, 30)
  transition.status = response?.status()
  transition.canvasReady = await owner.getAttribute('data-home-assets-ready')
  transition.primaryOwner = await owner.getAttribute('data-home-primary-owner')
  transition.visibleWorld = await owner.getAttribute('data-home-visible-world')
  transition.pointerLock = await transitionPage.evaluate(() => document.pointerLockElement === null)
  transition.passed = transition.status === 200
    && transition.canvasReady === 'true'
    && transition.primaryOwner === 'asset-driven'
    && transition.visibleWorld === 'authored-coherent-three-dimensional-sanctuary'
    && transition.pointerLock
    && transitionErrors.length === 0
} catch (error) {
  transition.error = String(error)
} finally {
  await transitionContext.setOffline(false).catch(() => {})
  await transitionContext.close().catch(() => {})
  await transitionBrowser.close().catch(() => {})
  receipt.captures.push(transition)
  if (!transition.passed) receipt.errors.push(transition)
}

await writeFile(path.join(outputDir, 'receipt.json'), `${JSON.stringify(receipt, null, 2)}\n`)
if (receipt.errors.length) process.exit(1)
