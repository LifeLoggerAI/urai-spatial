import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
const events = readFileSync(new URL('../urai-tier1/src/components/lifemap/useLifeMapEvents.ts', import.meta.url), 'utf8')

test('Firestore events normalize legacy hidden privacy before mapping to a star', () => {
  assert.match(events, /import \{ normalizeLifeMapEventPrivacy, lifeMapOwnerDocumentAllowed, projectLifeMapOwnerSnapshot \} from "\.\/lifeMapEventPrivacy\.mjs"/)
  assert.match(events, /privacyLevel: normalizeLifeMapEventPrivacy\(data\)/)
  assert.doesNotMatch(events, /privacyLevel: data\.privacyLevel === "hidden"/)
})
test('private constellation filtering uses the same hidden-node predicate', () => {
  assert.match(events, /import \{ lifeMapNodeIsHidden \} from "\.\/lifeMapPhysicalStarAction\.mjs"/)
  assert.match(events, /if \(lifeMapNodeIsHidden\(node\)\) return \[\]/)
})

test('both Firestore event and era snapshots reject explicit foreign owner metadata', () => {
  assert.match(events, /import \{ normalizeLifeMapEventPrivacy, lifeMapOwnerDocumentAllowed, projectLifeMapOwnerSnapshot \} from "\.\/lifeMapEventPrivacy\.mjs"/)
  assert.match(events, /setNodes\(projection\.items\)/)
  assert.match(events, /setEras\(projection\.items\)/)
  assert.equal((events.match(/projectLifeMapOwnerSnapshot\(snapshot\.docs, resolvedUserId/g) || []).length, 2)
})

test('invalid snapshots clear prior private items and report failure',()=>{
  for(const clause of ['setNodes([]);','setEras([]);','setEventsError("Private Life Map events could not be verified.");','setErasError("Private Life Map eras could not be verified.");'])
    assert.ok(events.includes(clause),clause)
})
