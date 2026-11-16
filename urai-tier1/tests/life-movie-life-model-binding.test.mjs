import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const movie = fs.readFileSync(new URL('../../apps/functions/src/lifeMovie.ts', import.meta.url), 'utf8')
const lifeModel = fs.readFileSync(new URL('../../apps/functions/src/lifeModelFunctions.ts', import.meta.url), 'utf8')

test('ready Life Movies require canonical SceneTruth for every chapter', () => {
  assert.match(movie, /READY_LIFE_MOVIE_REQUIRES_SCENE_TRUTH/)
  assert.match(movie, /sceneTruthPackets/)
  assert.match(movie, /urai-life-model-v1/)
  assert.match(movie, /READY_WITH_OCCLUSION/)
})

test('Life Movies bind current Person Model bundles and flatten their dependencies', () => {
  assert.match(movie, /personModelBundleIds/)
  assert.match(movie, /personModelBundles/)
  assert.match(movie, /bundle\.get\('state'\) !== 'current'/)
  assert.match(movie, /dependencyIds\.add\(String\(dependency\)\)/)
})

test('synthetic-memory firewall is retained on Life Movie manifests', () => {
  assert.match(movie, /syntheticOutputMayBecomeHistoricalSource: false/)
})

test('truth corrections can invalidate dependent Life Movies directly', () => {
  const authority=fs.readFileSync(new URL('../../apps/functions/src/personPresenceAuthority.ts',import.meta.url),'utf8')
  assert.match(lifeModel, /invalidateLifeModelDependencies\(db, uid, dependencyId, reasonId, revoked/)
  assert.match(authority, /'renderManifests','lifeMovies'/)
})
