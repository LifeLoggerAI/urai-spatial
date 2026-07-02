export type V2AssetTier = 'helper-state' | 'ground-object' | 'memory-star' | 'focus-variant' | 'replay-template' | 'mirror-pattern' | 'passport-state' | 'onboarding' | 'accessibility';

export type V2AssetSpec = {
  readonly tier: V2AssetTier;
  readonly id: string;
  readonly path: string;
  readonly fallback?: string;
  readonly purpose: string;
  readonly requiredForPremier: boolean;
};

const root = '/assets/urai/v2' as const;
const asset = (tier: V2AssetTier, id: string, path: string, purpose: string, requiredForPremier = true, fallback?: string): V2AssetSpec => ({
  tier,
  id,
  path: `${root}${path}`,
  fallback,
  purpose,
  requiredForPremier,
});

export const helperStateAssets = [
  asset('helper-state', 'welcome-guide-idle', '/helpers/welcome-guide-idle.webp', 'Welcome Guide idle presence'),
  asset('helper-state', 'welcome-guide-working', '/helpers/welcome-guide-working.webp', 'Welcome Guide actively helping'),
  asset('helper-state', 'privacy-steward-protecting', '/helpers/privacy-steward-protecting.webp', 'Privacy Steward protection state'),
  asset('helper-state', 'schedule-steward-approval', '/helpers/schedule-steward-approval.webp', 'Schedule Steward waiting approval'),
  asset('helper-state', 'wellness-guide-complete', '/helpers/wellness-guide-complete.webp', 'Wellness Guide completion state'),
  asset('helper-state', 'relationship-liaison-blocked', '/helpers/relationship-liaison-blocked.webp', 'Relationship Liaison blocked/waiting state'),
  asset('helper-state', 'logistics-helper-working', '/helpers/logistics-helper-working.webp', 'Logistics Helper working state'),
  asset('helper-state', 'archivist-protected', '/helpers/archivist-protected.webp', 'Archivist protected memory state'),
  asset('helper-state', 'operator-warning', '/helpers/operator-warning.webp', 'Operator gentle warning state'),
  asset('helper-state', 'trust-steward-mobile', '/helpers/trust-steward-mobile.webp', 'Trust Steward mobile portrait'),
  asset('helper-state', 'mirror-guide-mobile', '/helpers/mirror-guide-mobile.webp', 'Mirror Guide mobile portrait'),
];

export const groundObjectStateAssets = [
  asset('ground-object', 'keys-idle', '/objects/keys-idle.webp', 'Keys object idle state'),
  asset('ground-object', 'keys-inspect', '/objects/keys-inspect.webp', 'Keys object inspect state'),
  asset('ground-object', 'kitchen-table-active', '/objects/kitchen-table-active.webp', 'Kitchen table active family/life context'),
  asset('ground-object', 'work-console-approval', '/objects/work-console-approval.webp', 'Work console approval state'),
  asset('ground-object', 'memory-case-protected', '/objects/memory-case-protected.webp', 'Memory case protected state'),
  asset('ground-object', 'calendar-tower-complete', '/objects/calendar-tower-complete.webp', 'Calendar tower complete state'),
  asset('ground-object', 'body-signal-warning', '/objects/body-signal-warning.webp', 'Body signal soft warning state'),
  asset('ground-object', 'privacy-lock-active', '/objects/privacy-lock-active.webp', 'Privacy lock active state'),
  asset('ground-object', 'consent-key-requested', '/objects/consent-key-requested.webp', 'Consent key requested state'),
];

export const memoryStarStateAssets = [
  asset('memory-star', 'star-base', '/stars/star-base.webp', 'Base memory star'),
  asset('memory-star', 'star-hover', '/stars/star-hover.webp', 'Hover memory star'),
  asset('memory-star', 'star-selected', '/stars/star-selected.webp', 'Selected memory star'),
  asset('memory-star', 'star-focus-ready', '/stars/star-focus-ready.webp', 'Focus-ready memory star'),
  asset('memory-star', 'star-replay-ready', '/stars/star-replay-ready.webp', 'Replay-ready memory star'),
  asset('memory-star', 'star-protected', '/stars/star-protected.webp', 'Protected memory star'),
  asset('memory-star', 'star-shared-consent', '/stars/star-shared-consent.webp', 'Shared-with-consent memory star'),
  asset('memory-star', 'star-archived', '/stars/star-archived.webp', 'Archived memory star'),
  asset('memory-star', 'star-new', '/stars/star-new.webp', 'New memory star'),
  asset('memory-star', 'recovery-star', '/stars/recovery-star.webp', 'Recovery memory category star'),
  asset('memory-star', 'relationship-star', '/stars/relationship-star.webp', 'Relationship memory category star'),
  asset('memory-star', 'family-star', '/stars/family-star.webp', 'Family memory category star'),
  asset('memory-star', 'legacy-star', '/stars/legacy-star.webp', 'Legacy memory category star'),
  asset('memory-star', 'place-star', '/stars/place-star.webp', 'Place memory category star'),
  asset('memory-star', 'body-star', '/stars/body-star.webp', 'Body memory category star'),
  asset('memory-star', 'work-star', '/stars/work-star.webp', 'Work memory category star'),
  asset('memory-star', 'creation-star', '/stars/creation-star.webp', 'Creation memory category star'),
  asset('memory-star', 'grief-star', '/stars/grief-star.webp', 'Grief memory category star'),
  asset('memory-star', 'milestone-star', '/stars/milestone-star.webp', 'Milestone memory category star'),
];

export const focusVariantAssets = [
  asset('focus-variant', 'recovery-focus-chamber', '/focus/recovery-focus-chamber.webp', 'Recovery Focus chamber'),
  asset('focus-variant', 'relationship-focus-chamber', '/focus/relationship-focus-chamber.webp', 'Relationship Focus chamber'),
  asset('focus-variant', 'family-focus-chamber', '/focus/family-focus-chamber.webp', 'Family Focus chamber'),
  asset('focus-variant', 'legacy-focus-chamber', '/focus/legacy-focus-chamber.webp', 'Legacy Focus chamber'),
  asset('focus-variant', 'place-focus-chamber', '/focus/place-focus-chamber.webp', 'Place Focus chamber'),
  asset('focus-variant', 'body-focus-chamber', '/focus/body-focus-chamber.webp', 'Body Focus chamber'),
  asset('focus-variant', 'work-focus-chamber', '/focus/work-focus-chamber.webp', 'Work Focus chamber'),
  asset('focus-variant', 'grief-focus-chamber', '/focus/grief-focus-chamber.webp', 'Grief Focus chamber'),
  asset('focus-variant', 'missing-image-focus-fallback', '/focus/missing-image-focus-fallback.webp', 'Beautiful missing-image Focus fallback'),
];

export const replayTemplateAssets = [
  asset('replay-template', 'recovery-replay-template', '/replay/recovery-replay-template.webp', 'Recovery Replay template'),
  asset('replay-template', 'relationship-replay-template', '/replay/relationship-replay-template.webp', 'Relationship Replay template'),
  asset('replay-template', 'legacy-replay-template', '/replay/legacy-replay-template.webp', 'Legacy Replay template'),
  asset('replay-template', 'place-replay-template', '/replay/place-replay-template.webp', 'Place Replay template'),
  asset('replay-template', 'body-replay-template', '/replay/body-replay-template.webp', 'Body Replay template'),
  asset('replay-template', 'work-replay-template', '/replay/work-replay-template.webp', 'Work Replay template'),
  asset('replay-template', 'milestone-replay-template', '/replay/milestone-replay-template.webp', 'Milestone Replay template'),
  asset('replay-template', 'grief-replay-template', '/replay/grief-replay-template.webp', 'Grief Replay template'),
  asset('replay-template', 'daily-reset-replay-template', '/replay/daily-reset-replay-template.webp', 'Daily reset Replay template'),
];

export const mirrorPatternAssets = [
  asset('mirror-pattern', 'body-pattern-glyph', '/mirror/body-pattern-glyph.webp', 'Body pattern glyph'),
  asset('mirror-pattern', 'relationship-pattern-glyph', '/mirror/relationship-pattern-glyph.webp', 'Relationship pattern glyph'),
  asset('mirror-pattern', 'place-pattern-glyph', '/mirror/place-pattern-glyph.webp', 'Place pattern glyph'),
  asset('mirror-pattern', 'work-pattern-glyph', '/mirror/work-pattern-glyph.webp', 'Work pattern glyph'),
  asset('mirror-pattern', 'pressure-pattern-glyph', '/mirror/pressure-pattern-glyph.webp', 'Pressure pattern glyph'),
  asset('mirror-pattern', 'growth-pattern-state', '/mirror/growth-pattern-state.webp', 'Growth pattern state'),
  asset('mirror-pattern', 'soft-warning-pattern-state', '/mirror/soft-warning-pattern-state.webp', 'Soft warning pattern state'),
];

export const passportStateAssets = [
  asset('passport-state', 'passport-private', '/passport/passport-private.webp', 'Passport private state'),
  asset('passport-state', 'passport-consent-requested', '/passport/passport-consent-requested.webp', 'Consent requested state'),
  asset('passport-state', 'passport-consent-granted', '/passport/passport-consent-granted.webp', 'Consent granted state'),
  asset('passport-state', 'passport-consent-revoked', '/passport/passport-consent-revoked.webp', 'Consent revoked state'),
  asset('passport-state', 'passport-export-ready', '/passport/passport-export-ready.webp', 'Export ready state'),
  asset('passport-state', 'passport-delete-ready', '/passport/passport-delete-ready.webp', 'Delete ready state'),
  asset('passport-state', 'passport-provenance-visible', '/passport/passport-provenance-visible.webp', 'Provenance visible state'),
  asset('passport-state', 'passport-shared-expired', '/passport/passport-shared-expired.webp', 'Expired shared access state'),
];

export const onboardingAssets = [
  asset('onboarding', 'first-run-home-card', '/onboarding/first-run-home-card.webp', 'Home first-run teaching card'),
  asset('onboarding', 'first-run-ground-card', '/onboarding/first-run-ground-card.webp', 'Ground first-run teaching card'),
  asset('onboarding', 'first-run-life-map-card', '/onboarding/first-run-life-map-card.webp', 'Life Map first-run teaching card'),
  asset('onboarding', 'first-run-privacy-card', '/onboarding/first-run-privacy-card.webp', 'Privacy first-run teaching card'),
];

export const accessibilityV2Assets = [
  asset('accessibility', 'reduced-motion-equivalent', '/accessibility/reduced-motion-equivalent.webp', 'Reduced-motion visual equivalent'),
  asset('accessibility', 'high-contrast-equivalent', '/accessibility/high-contrast-equivalent.webp', 'High-contrast visual equivalent'),
  asset('accessibility', 'caption-card', '/accessibility/caption-card.webp', 'Caption card visual system'),
  asset('accessibility', 'haptic-waveform-visual', '/accessibility/haptic-waveform-visual.webp', 'Haptic waveform visual alternative'),
];

export const v2Assets = [
  ...helperStateAssets,
  ...groundObjectStateAssets,
  ...memoryStarStateAssets,
  ...focusVariantAssets,
  ...replayTemplateAssets,
  ...mirrorPatternAssets,
  ...passportStateAssets,
  ...onboardingAssets,
  ...accessibilityV2Assets,
] as const;

export const v2AssetCount = v2Assets.length;
