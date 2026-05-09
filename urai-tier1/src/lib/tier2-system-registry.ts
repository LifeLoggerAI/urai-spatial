export type Tier2SystemStatus = 'v1-locked' | 'tier2-ready' | 'provider-gated' | 'deferred';

export type Tier2System = {
  id: 'storytime' | 'spatial' | 'privacy' | 'admin' | 'companion' | 'memory';
  label: string;
  ownerRole: 'architecture' | 'privacy' | 'product' | 'platform';
  status: Tier2SystemStatus;
  tier1Dependency: 'URAI Spatial immutable foundation canon';
  publicSafe: boolean;
  routes: string[];
  api: string[];
  dataCollections: string[];
  guarantees: string[];
  deferredProviders?: string[];
};

export const tier2Systems: Tier2System[] = [
  {
    id: 'storytime',
    label: 'Storytime',
    ownerRole: 'product',
    status: 'tier2-ready',
    tier1Dependency: 'URAI Spatial immutable foundation canon',
    publicSafe: true,
    routes: ['/focus', '/replay', '/mirror', '/unwind'],
    api: [],
    dataCollections: ['lifemap_replays', 'storytime_sessions'],
    guarantees: ['Explicit user action before replay', 'Non-clinical reflection copy', 'Deterministic demo fallback when private memory is unavailable'],
  },
  {
    id: 'spatial',
    label: 'Spatial',
    ownerRole: 'architecture',
    status: 'v1-locked',
    tier1Dependency: 'URAI Spatial immutable foundation canon',
    publicSafe: true,
    routes: ['/', '/spatial', '/life-map', '/ascent', '/u/adamclamp'],
    api: ['/api/system/manifest', '/api/system/capabilities', '/api/system/integration-contract', '/api/system/launch-boundary'],
    dataCollections: ['spatial_sessions', 'spatial_nodes', 'spatial_anchors', 'spatial_assets'],
    guarantees: ['Tier-1 home remains spatial-only', 'Public demo handle exposes no private user data', 'Unavailable higher-tier features fall back to V1 baseline'],
  },
  {
    id: 'privacy',
    label: 'Privacy',
    ownerRole: 'privacy',
    status: 'tier2-ready',
    tier1Dependency: 'URAI Spatial immutable foundation canon',
    publicSafe: true,
    routes: ['/privacy', '/terms'],
    api: ['/api/entitlement'],
    dataCollections: ['consent_records', 'privacy_events', 'entitlement_checks'],
    guarantees: ['No raw private source signal exposure in public routes', 'Provider status must be explicit', 'Consent boundary required before live data grounding'],
  },
  {
    id: 'admin',
    label: 'Admin',
    ownerRole: 'platform',
    status: 'provider-gated',
    tier1Dependency: 'URAI Spatial immutable foundation canon',
    publicSafe: false,
    routes: ['/admin/invites', '/invite/[code]', '/internal/locks'],
    api: ['/api/stripe/create-checkout-session', '/api/stripe/webhook', '/api/stripe/webhook-v2'],
    dataCollections: ['invites', 'admin_events', 'billing_events'],
    guarantees: ['Mutation routes must remain guarded', 'Stripe routes must not expose secrets', 'Admin surfaces are not part of public demo mode'],
    deferredProviders: ['Stripe live billing', 'production invite issuance'],
  },
  {
    id: 'companion',
    label: 'Companion',
    ownerRole: 'product',
    status: 'tier2-ready',
    tier1Dependency: 'URAI Spatial immutable foundation canon',
    publicSafe: true,
    routes: ['/', '/life-map', '/focus', '/replay'],
    api: ['/api/orb-companion', '/api/urai/narrator/elevenlabs', '/api/voice/elevenlabs'],
    dataCollections: ['orb_companion_events', 'companion_narration_events'],
    guarantees: ['Fallback companion works without private memory', 'Narration provider is gated before live use', 'Companion copy must not diagnose or overclaim'],
    deferredProviders: ['ElevenLabs live voice', 'memory-grounded companion model'],
  },
  {
    id: 'memory',
    label: 'Memory',
    ownerRole: 'product',
    status: 'provider-gated',
    tier1Dependency: 'URAI Spatial immutable foundation canon',
    publicSafe: false,
    routes: ['/life-map', '/focus', '/replay', '/mirror'],
    api: ['/api/body-biometric'],
    dataCollections: ['lifemap_nodes', 'body_biometric_snapshots', 'memory_artifacts', 'user_spatial_preferences'],
    guarantees: ['Demo nodes are deterministic', 'Live memory requires auth and consent', 'Body and biometric language remains wellness-supportive and non-diagnostic'],
    deferredProviders: ['Firebase-backed personal memory', 'wearable data', 'biometric providers'],
  },
];

export function buildTier2SystemRegistry() {
  return {
    ok: true,
    service: 'urai-spatial',
    tier: 'Tier-2',
    officialLabel: 'Tier-2 System Canon',
    dependsOn: ['Tier-1'],
    systems: tier2Systems,
    lockBoundary: {
      mayExtendTier1: true,
      mayRedefineTier1: false,
      publicDemoMustStayPrivateDataFree: true,
      unavailableProvidersFallbackToTier1Baseline: true,
    },
    requiredChecks: ['pnpm tier2:check', 'pnpm test:canon', 'pnpm lock:static', 'pnpm lock:build'],
  };
}
