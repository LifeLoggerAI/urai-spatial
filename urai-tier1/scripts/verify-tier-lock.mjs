import fs from 'node:fs'

const checks = [
  'src/spatial/canon/tierLockState.ts',
  'src/spatial/hud/CanonicalTierLockHud.tsx',
  'src/app/page.tsx',
  'src/spatial/layout/TierOneExperience.tsx',
  'src/scene/HomeScene.tsx',
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
    'Home -> Ascent -> LifeMap -> Focus -> Replay -> Esc unwind -> Focus -> LifeMap -> Home',
  ],
  'src/spatial/hud/CanonicalTierLockHud.tsx': [
    'data-urai-canon-tier-lock',
    'CANON_TIER_LOCK_LINE',
    'URAI_SPATIAL_TIER_LOCKS',
  ],
  'src/app/page.tsx': [
    'TierOneExperience',
    'mode="home"',
  ],
  'src/spatial/layout/TierOneExperience.tsx': [
    '@/scene/HomeScene',
    '<HomeScene sceneMode={mode} />',
  ],
  'src/scene/HomeScene.tsx': [
    "type SceneMode = 'home' | 'ascent' | 'life-map' | 'demo' | 'replay' | 'focus' | 'unwind' | 'mirror'",
    "router.push('/ascent')",
    "router.push('/life-map')",
    'data-scene-mode={sceneMode}',
  ],
  'docs/audits/TIER_LOCK_VISUAL_CLOSEOUT.md': [
    'Tier-1 locked',
    'Tier-2 completed locked',
    'Tier-3 locked',
    'Tier-4 locked',
    'Canon proof - Tier-1 locked / Tier-2 completed locked / Tier-3 locked / Tier-4 locked',
    'Home -> Ascent -> LifeMap -> Focus -> Replay -> Esc unwind -> Focus -> LifeMap -> Home',
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
      console.error(`[tier-lock] missing "${needle}" in ${file}`)
      failed = true
    }
  }
}

const home = fs.existsSync('src/app/page.tsx') ? fs.readFileSync('src/app/page.tsx', 'utf8') : ''
for (const forbidden of ['CanonicalTierLockHud', '<CanonicalTierLockHud />', 'Loading URAI Spatial', '@/spatial/scene/SpatialScene']) {
  if (home.includes(forbidden)) {
    console.error(`[tier-lock] home invariant violation: ${forbidden} should not render in src/app/page.tsx`)
    failed = true
  }
}

const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'))
if (!pkg.scripts || pkg.scripts['verify:tier-lock'] !== 'node scripts/verify-tier-lock.mjs') {
  console.error('[tier-lock] package.json missing verify:tier-lock script')
  failed = true
}

if (failed) process.exit(1)

console.log('[tier-lock] verified: Tier locks preserved and canonical TierOneExperience -> HomeScene runtime remains no-HUD')
