import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
import { auditMemoryWorldCoverage } from '../src/spatial/memory-world/coverageAudit.ts'
import { FOUNDATIONAL_SCENE_ARCHETYPES } from '../src/spatial/memory-world/sceneOntology.ts'

const packages=JSON.parse(fs.readFileSync(new URL('../../operations/memory-world/world-packages-v1.json',import.meta.url),'utf8'))
const catalog=JSON.parse(fs.readFileSync(new URL('../../operations/memory-world/reference-source-catalog-v1.json',import.meta.url),'utf8'))

test('coverage audit exposes real gaps instead of claiming the 25-world QA set is globally complete', () => {
  const audit=auditMemoryWorldCoverage(packages.worlds,FOUNDATIONAL_SCENE_ARCHETYPES)
  assert.equal(audit.worldCount,25)
  assert.ok(audit.missingDomains.length>0)
  assert.equal(audit.productionReadyWorlds,0)
  assert.equal(audit.unresolvedSourceBoards,25)
  assert.ok(audit.signals.includes('REFERENCE_SOURCE_GAP'))
  assert.ok(audit.remediationTasks.length>0)
})

test('reference source catalog fails closed by institution default and records item-level review', () => {
  assert.equal(catalog.sources.length,6)
  const smithsonian=catalog.sources.find((source)=>source.id==='smithsonian-open-access')
  assert.equal(smithsonian.defaultUse,'production-candidate')
  assert.equal(smithsonian.itemLevelRightsCheck,true)
  assert.equal(smithsonian.thirdPartyRightsReview,true)

  const loc=catalog.sources.find((source)=>source.id==='library-of-congress')
  assert.equal(loc.defaultUse,'reference-only')
  assert.equal(loc.itemLevelRightsCheck,true)

  const osm=catalog.sources.find((source)=>source.id==='openstreetmap')
  assert.equal(osm.attributionRequiredByCopyright,true)
  assert.equal(osm.shareAlikeOrDatabaseObligations,true)
})

test('reference authority documentation explicitly rejects public-visibility-as-permission', () => {
  const content=fs.readFileSync(new URL('../../docs/MEMORY_WORLD_REFERENCE_AUTHORITY_V1.md',import.meta.url),'utf8')
  assert.match(content,/visible on the public internet does not make it a production asset/)
  assert.match(content,/item-level review/)
  assert.match(content,/No reference may enter GOLD or GOLD MASTER/)
})
