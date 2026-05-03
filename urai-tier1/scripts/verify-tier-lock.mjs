import fs from 'node:fs'

const requiredStrings = [
  'Tier-1 locked',
  'Tier-2 completed locked',
  'Tier-3 locked',
  'Tier-4 locked',
  'Canon proof - Tier-1 locked / Tier-2 completed locked / Tier-3 locked / Tier-4 locked',
  'Home -> Ascent -> LifeMap -> Focus -> Replay -> Esc unwind -> Focus -> LifeMap -> Home',
]

const checks = [
  'src/spatial/canon/tierLockState.ts',
  'src/spatial/hud/CanonicalTierLockHud.tsx',
  'src/app/page.tsx',
  'docs/audits/TIER_LOCK_VISUAL_CLOSEOUT.md',
]

let failed = false

for (const file of checks) {
  if (!fs.existsSync(file)) {
    console.error(`[tier-lock] missing file: ${file}`)
    failed = true
    continue
  }

  const text = fs.readFileSync(file, 'utf8')

  if (file === 'src/spatial/canon/tierLockState.ts' || file === 'docs/audits/TIER_LOCK_VISUAL_CLOSEOUT.md') {
    for (const needle of requiredStrings) {
      if (!text.includes(needle)) {
        console.error(`[tier-lock] missing "${needle}" in ${file}`)
        failed = true
      }
    }
  }

  if (file === 'src/spatial/hud/CanonicalTierLockHud.tsx') {
    for (const needle of ['data-urai-canon-tier-lock', 'CANON_TIER_LOCK_LINE', 'URAI_SPATIAL_TIER_LOCKS']) {
      if (!text.includes(needle)) {
        console.error(`[tier-lock] missing "${needle}" in ${file}`)
        failed = true
      }
    }
  }

  if (file === 'src/app/page.tsx') {
    for (const needle of ['CanonicalTierLockHud', '<CanonicalTierLockHud />']) {
      if (!text.includes(needle)) {
        console.error(`[tier-lock] missing "${needle}" in ${file}`)
        failed = true
      }
    }
  }
}

const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'))
if (!pkg.scripts || pkg.scripts['verify:tier-lock'] !== 'node scripts/verify-tier-lock.mjs') {
  console.error('[tier-lock] package.json missing verify:tier-lock script')
  failed = true
}

if (failed) process.exit(1)

console.log('[tier-lock] verified: Tier-1 locked / Tier-2 completed locked / Tier-3 locked / Tier-4 locked')
