import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const root = process.cwd()
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8')

const onboarding = read('src/app/UraiV2OnboardingLayer.tsx')
const onboardingModel = read('src/app/onboardingModel.ts')
const onboardingCss = read('src/app/v2-onboarding.css')
const settings = read('src/app/settings/DeviceSettingsClient.tsx')
const layout = read('src/app/layout.tsx')
const bootstrap = read('src/spatial/settings/SpatialSettingsBootstrap.tsx')
const settingsIo = read('src/spatial/settings/spatialSettingsIO.ts')
const settingsStore = read('src/spatial/settings/spatialSettingsStore.ts')
const reducedMotionHook = read('src/spatial/hooks/useReducedMotion.ts')
const accessibilityCss = read('src/app/accessibility.css')

test('first-run setup is resumable, skippable and truthfully scoped to existing authorities', () => {
  assert.match(onboardingModel, /ONBOARDING_SETUP_STEPS = \['welcome', 'privacy', 'comfort', 'orb'\]/)
  assert.match(onboarding, /ONBOARDING_SETUP_STEP_KEY/)
  assert.match(onboarding, /Skip setup/)
  assert.match(onboarding, /Consent Sanctuary/)
  assert.match(onboarding, /Global Emotional Field contribution starts Off/)
  assert.match(onboarding, /World audio/)
  assert.match(onboarding, /Haptic cues/)
  assert.match(onboarding, /MEET THE ORB/)
  assert.doesNotMatch(onboarding, /getUserMedia|Notification\.requestPermission|navigator\.permissions\.request/)
  assert.match(onboardingCss, /env\(safe-area-inset-bottom\)/)
  assert.match(onboardingCss, /focus-visible/)
  assert.match(onboardingCss, /prefers-reduced-motion/)
})

test('reduced motion uses one persisted settings authority and remains additive to the OS preference', () => {
  assert.match(settingsIo, /SPATIAL_SETTINGS_KEY = 'urai\.spatial\.settings\.v1'/)
  assert.match(settingsIo, /normalizeSpatialSettings/)
  assert.match(settingsStore, /setReducedMotion/)
  assert.match(layout, /<SpatialSettingsBootstrap \/>/)
  assert.match(bootstrap, /data.*uraiReducedMotion|dataset\.uraiReducedMotion/)
  assert.match(bootstrap, /urai:spatial-settings/)
  assert.match(settings, /Reduce motion/)
  assert.match(settings, /setReducedMotion/)
  assert.match(reducedMotionHook, /systemReducedMotion \|\| userReducedMotion/)
  assert.match(accessibilityCss, /data-urai-reduced-motion="true"/)
  assert.match(accessibilityCss, /prefers-reduced-motion: reduce/)
})

test('sensory setup reuses production audio and haptic authorities instead of decorative state', () => {
  assert.match(onboarding, /setHapticsEnabled/)
  assert.match(onboarding, /urai:audio-consent/)
  assert.match(onboarding, /urai:audio-mute/)
  assert.match(settings, /setHapticsEnabled/)
  assert.match(settings, /urai:audio-consent/)
  assert.match(settings, /urai:audio-mute/)
})
