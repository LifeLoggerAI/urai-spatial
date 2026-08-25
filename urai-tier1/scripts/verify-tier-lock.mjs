import fs from 'node:fs'

const checks = [
  'src/spatial/canon/tierLockState.ts',
  'src/spatial/hud/CanonicalTierLockHud.tsx',
  'src/app/page.tsx',
  'src/app/home/page.tsx',
  'src/app/FinalHomeThreshold.tsx',
  'src/app/HomeSpatialRuntimeLayer.tsx',
  'src/spatial/lifemap/SpatialLifeMapCanonical.tsx',
  'src/app/focus/page.tsx',
  'src/app/replay/page.tsx',
  'docs/audits/TIER_LOCK_VISUAL_CLOSEOUT.md',
]

const fileNeedles = {
  'src/spatial/canon/tierLockState.ts': [
    'URAI_SPATIAL_TIER_LOCKS',
    'CANON_TIER_LOCK_LINE',
    'CANON_SEQUENCE_LINE',
    "tier: 1",
    "tier: 2",
    "tier: 3",
    "tier: 4",
    "status: 'locked'",
    "status: 'completed locked'",
  ],
  'src/spatial/hud/CanonicalTierLockHud.tsx': [
    'data-urai-canon-tier-lock',
    'CANON_TIER_LOCK_LINE',
    'URAI_SPATIAL_TIER_LOCKS',
  ],
  'src/app/page.tsx': ['FinalHomeThreshold'],
  'src/app/home/page.tsx': ['FinalHomeThreshold'],
  'src/app/FinalHomeThreshold.tsx': ['HomeSpatialWorldFinal'],
  'src/app/HomeSpatialRuntimeLayer.tsx': [
    "normalizedPathname === '/' || normalizedPathname === '/home'",
    'data-urai-home-runtime=',
    'data-testid="urai-home-accessible-fallback"',
    'aria-label="Open Life Map directly"',
    "href: '/life-map/'",
  ],
  'src/spatial/lifemap/SpatialLifeMapCanonical.tsx': [
    'data-testid="urai-r3f-canonical-lifemap"',
    'useWebGLCapability',
    'LifeMapRouteBoundary',
  ],
  'src/app/focus/page.tsx': ['FinalFocusChamber'],
  'src/app/replay/page.tsx': ['FinalReplayFilm'],
  'docs/audits/TIER_LOCK_VISUAL_CLOSEOUT.md': [
    'Tier-1 locked',
    'Tier-2 completed locked',
    'Tier-3 locked',
    'Tier-4 locked',
  ],
}

let failed = false

for (const file of checks) {
  if (!fs.existsSync(file)) {
    console.error(`[tier-lock] missing file: ${file}`)
    failed = true
    continue
  }

  const text = fs.readFileSync(file, 'utf8')
  for (const needle of fileNeedles[file] ?? []) {
    if (!text.includes(needle)) {
      console.error(`[tier-lock] missing ${JSON.stringify(needle)} in ${file}`)
      failed = true
    }
  }
}

for (const retired of [
  'src/spatial/layout/TierOneExperience.tsx',
  'src/components/urai/UraiV1Experience.tsx',
  'src/app/RootModeExperience.tsx',
]) {
  if (fs.existsSync(retired)) {
    console.error(`[tier-lock] retired parallel runtime still exists: ${retired}`)
    failed = true
  }
}

const home = fs.existsSync('src/app/page.tsx') ? fs.readFileSync('src/app/page.tsx', 'utf8') : ''
for (const forbidden of ['CanonicalTierLockHud', '<CanonicalTierLockHud />', 'Loading URAI Spatial', '@/spatial/scene/SpatialScene', 'UraiV1Experience', 'TierOneExperience']) {
  if (home.includes(forbidden)) {
    console.error(`[tier-lock] home invariant violation: ${forbidden}`)
    failed = true
  }
}

const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'))
if (!pkg.scripts || pkg.scripts['verify:tier-lock'] !== 'node scripts/verify-tier-lock.mjs') {
  console.error('[tier-lock] package.json missing verify:tier-lock script')
  failed = true
}

if (failed) process.exit(1)

console.log('[tier-lock] verified: canonical Home, Life Map, Focus, and Replay owners are converged with legacy multi-mode runtimes retired')
