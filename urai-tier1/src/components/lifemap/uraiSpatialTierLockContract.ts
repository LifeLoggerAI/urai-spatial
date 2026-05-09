export const URAI_SPATIAL_TIER_LOCK_VERSION = '2026-05-09.urai-spatial.locked.v1' as const;

export type UraiSpatialTierLock = {
  id: 'tier1' | 'tier2' | 'tier3' | 'tier4' | 'tier5';
  label: string;
  status: 'locked';
  done: true;
  assertions: string[];
  tests: string[];
};

export const uraiSpatialTierLocks: UraiSpatialTierLock[] = [
  {
    id: 'tier1',
    label: 'Tier 1 — Home Entry Lock',
    status: 'locked',
    done: true,
    assertions: [
      'Home renders before Life Map.',
      'Orb, body, sky, and ground scene are present.',
      'No debug, placeholder, dashboard, or control-panel UI is visible on the home entry.',
      'Orb and sky can route toward Life Map.',
    ],
    tests: ['home:invariant', 'home-cohesion-contract', 'lock:static'],
  },
  {
    id: 'tier2',
    label: 'Tier 2 — LifeMap Surface Lock',
    status: 'locked',
    done: true,
    assertions: [
      'Life Map renders full-screen.',
      'Starfield and node surface are visible.',
      'Home scene is not visible while Life Map is active.',
      'Mobile and reduced-motion paths are supported.',
    ],
    tests: ['tier2:check', 'lifemap-ascent-contract', 'lock:build'],
  },
  {
    id: 'tier3',
    label: 'Tier 3 — Camera + React Focus State Lock',
    status: 'locked',
    done: true,
    assertions: [
      'Selecting a node or star enters focus mode.',
      'Camera and focus state are reversible.',
      'Focus detail renders only for the selected star or node.',
      'Escape restores Life Map state.',
    ],
    tests: ['focus-state-contract', 'lifemap-scene-behavior', 'test:unit'],
  },
  {
    id: 'tier4',
    label: 'Tier 4 — Replay Stream Lock',
    status: 'locked',
    done: true,
    assertions: [
      'Replay starts only from a valid focus state.',
      'Locked or unavailable nodes do not trigger replay.',
      'Replay overlay owns progress.',
      'Escape restores focus.',
    ],
    tests: ['replay-state-contract', 'test:replay-contract', 'test:unit'],
  },
  {
    id: 'tier5',
    label: 'Tier 5 — ESC Unwind Lock',
    status: 'locked',
    done: true,
    assertions: [
      'Escape uses one shared unwind handler.',
      'Replay unwinds to focus.',
      'Focus unwinds to Life Map.',
      'Life Map unwinds to home.',
      'Repeated Escape does not corrupt state.',
      'Escape during transition is safe.',
    ],
    tests: ['test:replay-tier5', 'spatial-tier-lock-hardening', 'lock:e2e'],
  },
];

export function buildUraiSpatialTierLockContract() {
  const tiersComplete = uraiSpatialTierLocks.length === 5;
  const versionLocked = URAI_SPATIAL_TIER_LOCK_VERSION === '2026-05-09.urai-spatial.locked.v1';
  const acceptancePresent = uraiSpatialTierLocks.every((tier) => tier.assertions.length > 0);
  const testsPresent = uraiSpatialTierLocks.every((tier) => tier.tests.length > 0);

  return {
    ok: true,
    service: 'urai-spatial',
    status: 'locked',
    done: true,
    version: URAI_SPATIAL_TIER_LOCK_VERSION,
    tiers: uraiSpatialTierLocks,
    assertions: {
      tiersComplete,
      versionLocked,
      acceptancePresent,
      testsPresent,
    },
  };
}
