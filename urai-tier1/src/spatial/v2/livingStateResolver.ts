import type { ImageAsset } from '@/spatial/assets/uraiAssets'
import {
  v2Accessibility,
  v2FocusVariants,
  v2GroundObjects,
  v2HelperStates,
  v2MemoryStars,
  v2MirrorPatterns,
  v2Onboarding,
  v2PassportStates,
  v2ReplayTemplates,
} from '@/spatial/assets/uraiV2Assets'

export type MemoryKind = 'recovery' | 'relationship' | 'family' | 'legacy' | 'place' | 'body' | 'work' | 'creation' | 'grief' | 'milestone'
export type ConsentState = 'private' | 'requested' | 'granted' | 'revoked' | 'export-ready' | 'delete-ready' | 'provenance-visible' | 'shared-expired'

const star: Record<MemoryKind, string> = {
  recovery: 'recovery-star', relationship: 'relationship-star', family: 'family-star', legacy: 'legacy-star', place: 'place-star', body: 'body-star', work: 'work-star', creation: 'creation-star', grief: 'grief-star', milestone: 'milestone-star',
}
const focus: Record<MemoryKind, string> = {
  recovery: 'recovery-focus-chamber', relationship: 'relationship-focus-chamber', family: 'family-focus-chamber', legacy: 'legacy-focus-chamber', place: 'place-focus-chamber', body: 'body-focus-chamber', work: 'work-focus-chamber', creation: 'missing-image-focus-fallback', grief: 'grief-focus-chamber', milestone: 'missing-image-focus-fallback',
}
const replay: Record<MemoryKind, string> = {
  recovery: 'recovery-replay-template', relationship: 'relationship-replay-template', family: 'daily-reset-replay-template', legacy: 'legacy-replay-template', place: 'place-replay-template', body: 'body-replay-template', work: 'work-replay-template', creation: 'daily-reset-replay-template', grief: 'grief-replay-template', milestone: 'milestone-replay-template',
}
const mirror: Record<MemoryKind, string> = {
  recovery: 'pressure-pattern-glyph', relationship: 'relationship-pattern-glyph', family: 'relationship-pattern-glyph', legacy: 'growth-pattern-state', place: 'place-pattern-glyph', body: 'body-pattern-glyph', work: 'work-pattern-glyph', creation: 'growth-pattern-state', grief: 'soft-warning-pattern-state', milestone: 'growth-pattern-state',
}
const consent: Record<ConsentState, string> = {
  private: 'passport-private', requested: 'passport-consent-requested', granted: 'passport-consent-granted', revoked: 'passport-consent-revoked', 'export-ready': 'passport-export-ready', 'delete-ready': 'passport-delete-ready', 'provenance-visible': 'passport-provenance-visible', 'shared-expired': 'passport-shared-expired',
}

export function inferMemoryKind(value: string | null | undefined): MemoryKind {
  const normalized = (value || '').toLowerCase()
  for (const kind of ['relationship', 'family', 'legacy', 'place', 'body', 'work', 'creation', 'grief', 'milestone'] as const) {
    if (normalized.includes(kind)) return kind
  }
  return 'recovery'
}

export function resolveMemoryState(kind: MemoryKind) {
  return { star: v2MemoryStars[star[kind]], focus: v2FocusVariants[focus[kind]], replay: v2ReplayTemplates[replay[kind]], mirror: v2MirrorPatterns[mirror[kind]] }
}

export function resolveConsentState(state: ConsentState): ImageAsset {
  return v2PassportStates[consent[state]]
}

export function resolveGroundState(lane: 'welcome' | 'privacy' | 'schedule' | 'wellness' | 'memory' | 'logistics') {
  const helpers = { welcome: 'welcome-guide-working', privacy: 'privacy-steward-protecting', schedule: 'schedule-steward-approval', wellness: 'wellness-guide-complete', memory: 'archivist-protected', logistics: 'logistics-helper-working' } as const
  const objects = { welcome: 'keys-inspect', privacy: 'privacy-lock-active', schedule: 'calendar-tower-complete', wellness: 'body-signal-warning', memory: 'memory-case-protected', logistics: 'consent-key-requested' } as const
  return { helper: v2HelperStates[helpers[lane]], object: v2GroundObjects[objects[lane]] }
}

export const onboardingState = (route: 'home' | 'ground' | 'life-map' | 'privacy') => v2Onboarding[`first-run-${route}-card`]
export const accessibilityState = (key: 'reduced-motion-equivalent' | 'high-contrast-equivalent' | 'caption-card' | 'haptic-waveform-visual') => v2Accessibility[key]
