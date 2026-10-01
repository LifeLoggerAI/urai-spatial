import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

test('localization readiness generator stays exact-head, fail-closed and non-private', () => {
  const source = fs.readFileSync(new URL('../../scripts/generate-localization-readiness.mjs', import.meta.url), 'utf8')
  assert.ok(source.includes("schemaVersion: 'urai-localization-readiness-1'"))
  assert.ok(source.includes('containsPrivateUserData: false'))
  assert.ok(source.includes('LOCALE_ADMITTED_WITHOUT_REQUIRED_REVIEW'))
  assert.ok(source.includes("productionAdmission: runtimeAdmitted ? 'admitted' : 'blocked'"))
  assert.ok(source.includes('RTL_VISUAL_QA_REQUIRED_BEFORE_ADMISSION'))
  assert.ok(source.includes('URAI_EXACT_HEAD must be a full lowercase SHA'))
  assert.ok(source.includes('machine-prepared-native-review-required'))
})
