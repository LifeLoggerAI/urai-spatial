#!/usr/bin/env node
import fs from 'node:fs'

const rulesPath = 'firebase/firestore.rules'
if (!fs.existsSync(rulesPath)) {
  console.error('Missing firebase/firestore.rules')
  process.exit(1)
}

const rules = fs.readFileSync(rulesPath, 'utf8')

const requiredSnippets = [
  'function isSignedIn()',
  'function isSelf(uid)',
  'function isAdmin()',
  'match /features/{flagId}',
  'allow write: if isAdmin();',
  'match /users/{uid}',
  'entitlementTier',
  'founderOverride',
  'match /tierLockAudit/{auditId}',
  'allow write: if false;',
  'function hasOnlyHomeWorldStateFields()',
  'function hasOnlyHomeWorldExplanationFields()',
  'function isValidHomeWorldStateWrite(uid)',
  'function isValidHomeWorldExplanationWrite(uid)',
  'match /homeWorld/{docId}',
  "docId == 'state'",
  'match /homeWorldExplainability/{docId}',
  "docId == 'latest'",
  'match /history/{historyId}',
  'rawSignalsStored == false',
  'usedRawAudio == false',
  'usedContactIdentity == false',
  'match /spatial/{doc=**}',
]

const forbiddenPatterns = [
  /allow\s+read\s*,\s*write\s*:\s*if\s+true\s*;/i,
  /allow\s+write\s*:\s*if\s+true\s*;/i,
  /allow\s+create\s*,\s*update\s*,\s*delete\s*:\s*if\s+true\s*;/i,
  /request\.resource\.data\.entitlementTier\s*==/i,
  /request\.resource\.data\.isAdmin\s*==\s*true/i,
  /request\.resource\.data\.founderOverride\s*==\s*true/i,
]

for (const snippet of requiredSnippets) {
  if (!rules.includes(snippet)) {
    console.error(`Firestore Tier-1 boundary missing required snippet: ${snippet}`)
    process.exit(1)
  }
}

for (const pattern of forbiddenPatterns) {
  if (pattern.test(rules)) {
    console.error(`Firestore Tier-1 boundary violation: ${pattern}`)
    process.exit(1)
  }
}

console.log('Firestore Tier-1 boundaries passed.')
