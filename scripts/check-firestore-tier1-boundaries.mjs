#!/usr/bin/env node
import fs from 'node:fs'

const firebaseJsonPath = 'firebase.json'
if (!fs.existsSync(firebaseJsonPath)) {
  console.error('Missing firebase.json')
  process.exit(1)
}

const firebaseConfig = JSON.parse(fs.readFileSync(firebaseJsonPath, 'utf8'))
const rulesPath = firebaseConfig.firestore?.rules ?? 'firebase/firestore.rules'
if (rulesPath !== 'firebase/firestore.rules') {
  console.error(`Firebase deploy must use firebase/firestore.rules, found: ${rulesPath}`)
  process.exit(1)
}

if (!fs.existsSync(rulesPath)) {
  console.error(`Missing ${rulesPath}`)
  process.exit(1)
}

const rules = fs.readFileSync(rulesPath, 'utf8')
const contractPath = 'firebase/spatial-collection-contract.json'
if (!fs.existsSync(contractPath)) {
  console.error(`Missing ${contractPath}`)
  process.exit(1)
}

const spatialContract = JSON.parse(fs.readFileSync(contractPath, 'utf8'))

const requiredSnippets = [
  'function isSignedIn()',
  'function isSelf(uid)',
  'function isAdmin()',
  'function isUserOwnedCreate(uid)',
  'function isUserOwnedUpdate(uid)',
  'function isPrivateSpatialPayloadSafe()',
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
  'match /assetManifests/{manifestId}',
  'match /spatial/{doc=**}',
]

const forbiddenPatterns = [
  /allow\s+read\s*,\s*write\s*:\s*if\s+true\s*;/i,
  /allow\s+write\s*:\s*if\s+true\s*;/i,
  /allow\s+create\s*,\s*update\s*,\s*delete\s*:\s*if\s+true\s*;/i,
  /request\.resource\.data\.entitlementTier\s*==/i,
  /request\.resource\.data\.isAdmin\s*==\s*true/i,
  /request\.resource\.data\.founderOverride\s*==\s*true/i,
  /rawAudioUrl'\s*in\s*request\.resource\.data\)\s*\{\s*allow/i,
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

for (const collection of spatialContract.collections ?? []) {
  const anchors = collection.rulesAnchors ?? []
  const equivalent = collection.runtimeEquivalent
  const hasAnchor = anchors.some((anchor) => rules.includes(anchor))
  const hasEquivalent = typeof equivalent === 'string' && rules.includes(`match /${equivalent.split('/').slice(-2).join('/')}`)
  const hasAssetManifestEquivalent = equivalent === 'assetManifests/{manifestId}' && rules.includes('match /assetManifests/{manifestId}')

  if (!hasAnchor && !hasEquivalent && !hasAssetManifestEquivalent) {
    console.error(
      `Spatial contract collection ${collection.canonical} lacks explicit rule coverage. Expected one of: ${anchors.join(', ')} or runtime equivalent ${equivalent}`,
    )
    process.exit(1)
  }
}

console.log('Firestore Tier-1 and Spatial contract boundaries passed.')
