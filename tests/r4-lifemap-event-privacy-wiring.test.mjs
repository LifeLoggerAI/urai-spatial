import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
const events = readFileSync(new URL('../urai-tier1/src/components/lifemap/useLifeMapEvents.ts', import.meta.url), 'utf8')

test('Firestore events normalize legacy hidden privacy before mapping to a star', () => {
  assert.match(events, /import \{ normalizeLifeMapEventPrivacy, lifeMapOwnerDocumentAllowed \} from "\.\/lifeMapEventPrivacy\.mjs"/)
  assert.match(events, /privacyLevel: normalizeLifeMapEventPrivacy\(data\)/)
  assert.doesNotMatch(events, /privacyLevel: data\.privacyLevel === "hidden"/)
})
test('private constellation filtering uses the same hidden-node predicate', () => {
  assert.match(events, /import \{ lifeMapNodeIsHidden \} from "\.\/lifeMapPhysicalStarAction\.mjs"/)
  assert.match(events, /if \(lifeMapNodeIsHidden\(node\)\) return \[\]/)
})

test('both Firestore event and era snapshots reject explicit foreign owner metadata', () => {
  assert.match(events, /import \{ normalizeLifeMapEventPrivacy, lifeMapOwnerDocumentAllowed \} from "\.\/lifeMapEventPrivacy\.mjs"/)
  assert.match(events, /setNodes\(snapshot\.docs\.flatMap\(/)
  assert.match(events, /setEras\(snapshot\.docs\.flatMap\(/)
  assert.equal((events.match(/lifeMapOwnerDocumentAllowed\(data, resolvedUserId\)/g) || []).length, 2)
})
