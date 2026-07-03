import type { ImageAsset } from './uraiAssets'

export type V2AssetGroup = Readonly<Record<string, ImageAsset>>

type StateSpec = readonly [slug: string, alt: string, fallback: string]

const v2Root = '/assets/urai/v2'
const v1Root = '/assets/urai'

const makeGroup = (folder: string, specs: readonly StateSpec[]): V2AssetGroup =>
  Object.freeze(
    Object.fromEntries(
      specs.map(([slug, alt, fallback]) => [
        slug,
        {
          src: `${v2Root}/${folder}/${slug}.webp`,
          fallback: `${v1Root}${fallback}`,
          alt,
        } satisfies ImageAsset,
      ]),
    ),
  )

const helperSpecs = [
  ['welcome-guide-idle', 'Welcome Guide calm idle presence', '/avatars/receptionist.webp'],
  ['welcome-guide-working', 'Welcome Guide actively helping', '/avatars/receptionist.webp'],
  ['privacy-steward-protecting', 'Privacy Steward protecting a consent boundary', '/avatars/privacy-steward.webp'],
  ['schedule-steward-approval', 'Schedule Steward waiting for approval', '/avatars/schedule-steward.webp'],
  ['wellness-guide-complete', 'Wellness Guide completion state', '/avatars/wellness-guide.webp'],
  ['relationship-liaison-blocked', 'Relationship Liaison waiting at a protected boundary', '/avatars/relationship-liaison.webp'],
  ['logistics-helper-working', 'Logistics Helper working state', '/avatars/logistics-helper.webp'],
  ['archivist-protected', 'Memory Archivist protected-memory state', '/avatars/archivist.webp'],
  ['operator-warning', 'Operator gentle warning state', '/avatars/operator.webp'],
  ['trust-steward-mobile', 'Trust Steward mobile portrait', '/avatars/protector.webp'],
  ['mirror-guide-mobile', 'Mirror Guide mobile portrait', '/avatars/mirror.webp'],
] as const satisfies readonly StateSpec[]

const objectSpecs = [
  ['keys-idle', 'Keys object idle state', '/ground/ground-world-fallback.svg'],
  ['keys-inspect', 'Keys object inspect state', '/ground/ground-world-fallback.svg'],
  ['kitchen-table-active', 'Kitchen table active life context', '/ground/ground-reception-fallback.svg'],
  ['work-console-approval', 'Work console approval state', '/ground/ground-reception-fallback.svg'],
  ['memory-case-protected', 'Protected memory case state', '/ground/ground-memory-archive-fallback.svg'],
  ['calendar-tower-complete', 'Calendar tower completion state', '/ground/ground-reception-fallback.svg'],
  ['body-signal-warning', 'Body signal soft warning state', '/ground/ground-wellness-fallback.svg'],
  ['privacy-lock-active', 'Privacy lock active state', '/ground/ground-privacy-fallback.svg'],
  ['consent-key-requested', 'Consent key requested state', '/ground/ground-privacy-fallback.svg'],
] as const satisfies readonly StateSpec[]

const starSpecs = [
  ['star-base', 'Base image-bearing memory star', '/life-map/life-map-node-fallback.svg'],
  ['star-hover', 'Hover memory star', '/life-map/life-map-node-fallback.svg'],
  ['star-selected', 'Selected memory star', '/life-map/life-map-node-fallback.svg'],
  ['star-focus-ready', 'Focus-ready memory star', '/life-map/life-map-node-fallback.svg'],
  ['star-replay-ready', 'Replay-ready memory star', '/life-map/life-map-node-fallback.svg'],
  ['star-protected', 'Protected memory star', '/life-map/life-map-node-fallback.svg'],
  ['star-shared-consent', 'Shared-with-consent memory star', '/life-map/life-map-node-fallback.svg'],
  ['star-archived', 'Archived memory star', '/life-map/life-map-node-fallback.svg'],
  ['star-new', 'New memory star', '/life-map/life-map-node-fallback.svg'],
  ['recovery-star', 'Recovery memory category star', '/life-map/life-map-node-threshold.webp'],
  ['relationship-star', 'Relationship memory category star', '/life-map/life-map-node-becoming.webp'],
  ['family-star', 'Family memory category star', '/life-map/life-map-node-studio.webp'],
  ['legacy-star', 'Legacy memory category star', '/life-map/life-map-node-threshold.webp'],
  ['place-star', 'Place memory category star', '/life-map/life-map-node-becoming.webp'],
  ['body-star', 'Body memory category star', '/life-map/life-map-node-studio.webp'],
  ['work-star', 'Work memory category star', '/life-map/life-map-node-threshold.webp'],
  ['creation-star', 'Creation memory category star', '/life-map/life-map-node-becoming.webp'],
  ['grief-star', 'Grief memory category star', '/life-map/life-map-node-studio.webp'],
  ['milestone-star', 'Milestone memory category star', '/life-map/life-map-node-threshold.webp'],
] as const satisfies readonly StateSpec[]

const focusSpecs = [
  ['recovery-focus-chamber', 'Recovery Focus chamber', '/focus/focus-memory-chamber-main.webp'],
  ['relationship-focus-chamber', 'Relationship Focus chamber', '/focus/focus-memory-chamber-main.webp'],
  ['family-focus-chamber', 'Family Focus chamber', '/focus/focus-memory-chamber-main.webp'],
  ['legacy-focus-chamber', 'Legacy Focus chamber', '/focus/focus-memory-chamber-main.webp'],
  ['place-focus-chamber', 'Place Focus chamber', '/focus/focus-memory-chamber-main.webp'],
  ['body-focus-chamber', 'Body Focus chamber', '/focus/focus-memory-chamber-main.webp'],
  ['work-focus-chamber', 'Work Focus chamber', '/focus/focus-memory-chamber-main.webp'],
  ['grief-focus-chamber', 'Grief Focus chamber', '/focus/focus-memory-chamber-main.webp'],
  ['missing-image-focus-fallback', 'Missing-image Focus fallback chamber', '/focus/focus-memory-chamber-fallback.svg'],
] as const satisfies readonly StateSpec[]

const replaySpecs = [
  ['recovery-replay-template', 'Recovery Replay cinematic environment', '/replay/replay-memory-film-main.webp'],
  ['relationship-replay-template', 'Relationship Replay cinematic environment', '/replay/replay-memory-film-main.webp'],
  ['legacy-replay-template', 'Legacy Replay cinematic environment', '/replay/replay-memory-film-main.webp'],
  ['place-replay-template', 'Place Replay cinematic environment', '/replay/replay-memory-film-main.webp'],
  ['body-replay-template', 'Body Replay cinematic environment', '/replay/replay-memory-film-main.webp'],
  ['work-replay-template', 'Work Replay cinematic environment', '/replay/replay-memory-film-main.webp'],
  ['milestone-replay-template', 'Milestone Replay cinematic environment', '/replay/replay-memory-film-main.webp'],
  ['grief-replay-template', 'Grief Replay cinematic environment', '/replay/replay-memory-film-main.webp'],
  ['daily-reset-replay-template', 'Daily reset Replay cinematic environment', '/replay/replay-memory-film-main.webp'],
] as const satisfies readonly StateSpec[]

const mirrorSpecs = [
  ['body-pattern-glyph', 'Body pattern glyph', '/mirror/mirror-pattern-glyph.webp'],
  ['relationship-pattern-glyph', 'Relationship pattern glyph', '/mirror/mirror-pattern-glyph.webp'],
  ['place-pattern-glyph', 'Place pattern glyph', '/mirror/mirror-pattern-glyph.webp'],
  ['work-pattern-glyph', 'Work pattern glyph', '/mirror/mirror-pattern-glyph.webp'],
  ['pressure-pattern-glyph', 'Pressure pattern glyph', '/mirror/mirror-pattern-glyph.webp'],
  ['growth-pattern-state', 'Growth pattern state', '/mirror/mirror-pattern-glyph.webp'],
  ['soft-warning-pattern-state', 'Soft warning pattern state', '/mirror/mirror-pattern-glyph.webp'],
] as const satisfies readonly StateSpec[]

const passportSpecs = [
  ['passport-private', 'Passport private state', '/passport/passport-ownership-seal.webp'],
  ['passport-consent-requested', 'Passport consent requested state', '/passport/passport-ownership-seal.webp'],
  ['passport-consent-granted', 'Passport consent granted state', '/passport/passport-ownership-seal.webp'],
  ['passport-consent-revoked', 'Passport consent revoked state', '/passport/passport-ownership-seal.webp'],
  ['passport-export-ready', 'Passport export-ready state', '/passport/passport-ownership-seal.webp'],
  ['passport-delete-ready', 'Passport delete-ready state', '/passport/passport-ownership-seal.webp'],
  ['passport-provenance-visible', 'Passport provenance-visible state', '/passport/passport-ownership-seal.webp'],
  ['passport-shared-expired', 'Passport expired shared-access state', '/passport/passport-ownership-seal.webp'],
] as const satisfies readonly StateSpec[]

const onboardingSpecs = [
  ['first-run-home-card', 'Home first-run teaching scene', '/home/home-threshold-mobile.webp'],
  ['first-run-ground-card', 'Ground first-run teaching scene', '/ground/ground-world-mobile.webp'],
  ['first-run-life-map-card', 'Life Map first-run teaching scene', '/life-map/life-map-galaxy-mobile.webp'],
  ['first-run-privacy-card', 'Privacy first-run teaching scene', '/privacy-controls/privacy-controls-mobile.webp'],
] as const satisfies readonly StateSpec[]

const accessibilitySpecs = [
  ['reduced-motion-equivalent', 'Reduced-motion visual equivalent', '/ui/orb-idle.webp'],
  ['high-contrast-equivalent', 'High-contrast visual equivalent', '/ui/privacy-lock.svg'],
  ['caption-card', 'Caption-safe cinematic visual system', '/replay/replay-memory-film-fallback.svg'],
  ['haptic-waveform-visual', 'Haptic waveform visual alternative', '/ui/orb-active.webp'],
] as const satisfies readonly StateSpec[]

export const v2HelperStates = makeGroup('helpers', helperSpecs)
export const v2GroundObjects = makeGroup('objects', objectSpecs)
export const v2MemoryStars = makeGroup('stars', starSpecs)
export const v2FocusVariants = makeGroup('focus', focusSpecs)
export const v2ReplayTemplates = makeGroup('replay', replaySpecs)
export const v2MirrorPatterns = makeGroup('mirror', mirrorSpecs)
export const v2PassportStates = makeGroup('passport', passportSpecs)
export const v2Onboarding = makeGroup('onboarding', onboardingSpecs)
export const v2Accessibility = makeGroup('accessibility', accessibilitySpecs)

export const v2Assets = Object.freeze({
  helpers: v2HelperStates,
  objects: v2GroundObjects,
  stars: v2MemoryStars,
  focus: v2FocusVariants,
  replay: v2ReplayTemplates,
  mirror: v2MirrorPatterns,
  passport: v2PassportStates,
  onboarding: v2Onboarding,
  accessibility: v2Accessibility,
})

export const V2_ASSET_COUNT = [
  helperSpecs,
  objectSpecs,
  starSpecs,
  focusSpecs,
  replaySpecs,
  mirrorSpecs,
  passportSpecs,
  onboardingSpecs,
  accessibilitySpecs,
].reduce((total, group) => total + group.length, 0)

export function withV2Fallback(asset: ImageAsset) {
  return `${asset.src}, ${asset.fallback}`
}
