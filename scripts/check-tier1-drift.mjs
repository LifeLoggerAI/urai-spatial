#!/usr/bin/env node
import fs from 'node:fs'

const requiredFiles = [
  'src/canon/tier1.ts',
  'src/canon/foundation.ts',
  'src/canon/identity.ts',
  'src/canon/ontology.ts',
  'src/canon/privacy.ts',
  'src/canon/design.ts',
  'src/canon/invariants.ts',
  'src/canon/index.ts',
  'docs/canon/TIER_1_CANON_STANDARDS.md',
  'firebase/firestore.rules',
  'packages/tier-locks/src/index.ts',
  'apps/functions/src/tierLocks.ts',
]

for (const file of requiredFiles) {
  if (!fs.existsSync(file)) {
    console.error(`Tier-1 drift: missing required protected file ${file}`)
    process.exit(1)
  }
}

const tier1 = fs.readFileSync('src/canon/tier1.ts', 'utf8')
const index = fs.readFileSync('src/canon/index.ts', 'utf8')

const requiredTier1Tokens = [
  'URAI_TIER_1_CANON',
  'Immutable URAI Foundation Canon',
  'TIER_1_CANON_MIGRATION_APPROVED',
  'officialProductName',
  'protectedPrivacyPrinciples',
  'protectedConsentPrinciples',
  'protectedSpatialInvariants',
  'protectedFeatureFlagRules',
  'protectedReleaseRules',
]

for (const token of requiredTier1Tokens) {
  if (!tier1.includes(token)) {
    console.error(`Tier-1 drift: src/canon/tier1.ts missing ${token}`)
    process.exit(1)
  }
}

for (const token of ['foundation', 'identity', 'ontology', 'privacy', 'design', 'invariants', 'tier1']) {
  if (!index.includes(`'./${token}'`)) {
    console.error(`Tier-1 drift: src/canon/index.ts missing export for ${token}`)
    process.exit(1)
  }
}

const lowerTierFiles = ['src/canon/tier2.ts', 'src/canon/tier3.ts', 'src/canon/tier4.ts', 'src/canon/tier5.ts']
const forbiddenLowerTierPatterns = [
  /URAI_TIER_1_CANON\s*=/,
  /officialProductName\s*:\s*['"](?!URAI['"])/,
  /Immutable URAI Foundation Canon.*redefined/i,
  /mayBeRedefinedBy\s*:/,
]

for (const file of lowerTierFiles) {
  if (!fs.existsSync(file)) continue
  const text = fs.readFileSync(file, 'utf8')
  for (const pattern of forbiddenLowerTierPatterns) {
    if (pattern.test(text)) {
      console.error(`Tier-1 drift: lower-tier redefinition pattern in ${file}: ${pattern}`)
      process.exit(1)
    }
  }
}

console.log('Tier-1 drift check passed.')
