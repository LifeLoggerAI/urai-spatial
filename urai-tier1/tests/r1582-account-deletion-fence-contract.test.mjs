import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
const ops=fs.readFileSync(new URL('../../apps/functions/src/privacyOperations.ts',import.meta.url),'utf8')
const index=fs.readFileSync(new URL('../../apps/functions/src/index.ts',import.meta.url),'utf8')
const rules=fs.readFileSync(new URL('../../firebase/firestore.rules',import.meta.url),'utf8')

test('Privacy timestamps use the modular Admin Firestore runtime surface',()=>{
  assert.match(ops,/import \{ FieldValue, Timestamp \} from 'firebase-admin\/firestore'/)
  assert.doesNotMatch(ops,/const fieldValue = admin\.firestore\.FieldValue/)
  assert.doesNotMatch(ops,/const timestamp = admin\.firestore\.Timestamp/)
})

test('account deletion fences before destructive user and auth deletion',()=>{
  const processStart=ops.indexOf('async function processDeletion')
  const start=ops.indexOf("if (scope === 'account')",processStart)
  const block=ops.slice(start,start+900)
  const fence=block.indexOf('await fenceAccountDeletion')
  const recursive=block.indexOf('await db.recursiveDelete(userRef)')
  const auth=block.indexOf('await admin.auth().deleteUser(uid)')
  assert.ok(start>=0&&fence>=0&&recursive>fence&&auth>recursive)
})

test('auth deletion independently writes the same durable access fence',()=>{
  assert.match(ops,/export const fenceOperationalPrivacyAccessOnAuthDelete = functions\.auth\.user\(\)\.onDelete/)
  assert.match(ops,/accountDeletionFenceRef\(user\.uid\)\.set/)
  assert.match(index,/fenceOperationalPrivacyAccessOnAuthDelete/)
})

test('client user reads require active parent and absence of deletion fence',()=>{
  assert.match(rules,/function hasActiveUserRecord\(uid\)/)
  assert.match(rules,/function hasNoAccountDeletionFence\(uid\)[\s\S]*?deletionFenceInactive\(uid\)/)
  assert.match(rules,/function isSelf\(uid\) \{ return isIdentitySelf\(uid\) && hasActiveUserRecord\(uid\) && hasNoAccountDeletionFence\(uid\) && deletionFenceInactive\(uid\); \}/)
  assert.match(rules,/allow create: if isIdentitySelf\(uid\)[\s\S]*?hasNoAccountDeletionFence\(uid\)[\s\S]*?deletionFenceInactive\(uid\)/)
  assert.match(rules,/match \/accountDeletionFences\/\{docId\} \{ allow read, write: if false; \}/)
})
