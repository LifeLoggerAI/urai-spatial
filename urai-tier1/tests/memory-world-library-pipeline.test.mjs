import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
import { validateMemoryWorldAssetRegistry } from '../src/spatial/memory-world/assetRegistry.ts'
import { decideReferenceUse } from '../src/spatial/memory-world/referenceAuthority.ts'
import { MEMORY_WORLD_COMPOSITE_EVENTS, MEMORY_WORLD_EVENT_PRIMITIVES, validateCompositeEvent } from '../src/spatial/memory-world/eventGrammar.ts'

const packages=JSON.parse(fs.readFileSync(new URL('../../operations/memory-world/world-packages-v1.json',import.meta.url),'utf8'))

function permissions(overrides={}) {
  return {referenceOnly:false,trainingPermitted:false,derivativeWorkPermitted:false,productionAssetPermitted:false,commercialUsePermitted:false,redistributionPermitted:false,attributionRequired:false,reviewRequired:false,...overrides}
}

test('asset registry rejects duplicate IDs, unresolved production rights, broken dependencies and bad checksums', () => {
  const manifest={
    schemaVersion:'urai-memory-world-asset-registry-1',
    sources:[
      {sourceId:'ref',authority:'reference-only',permissions:permissions({referenceOnly:true})},
      {sourceId:'ref',authority:'reference-only',permissions:permissions({referenceOnly:true})},
    ],
    assets:[
      {assetId:'a',assetType:'object',name:'a',version:'1',semanticTags:['chair'],representation:['mesh'],truthClass:'T1_SOURCE_DERIVED',confidence:1,sourceIds:['ref'],dependencies:['missing'],checksum:'bad',status:'gold'},
      {assetId:'a',assetType:'object',name:'duplicate',version:'1',semanticTags:['chair'],representation:['mesh'],truthClass:'T4_CONTEXT_TEMPLATE',confidence:1,sourceIds:[],dependencies:[],status:'reference'},
    ],
  }
  const errors=validateMemoryWorldAssetRegistry(manifest)
  assert.ok(errors.some((e)=>e.startsWith('DUPLICATE_OR_MISSING_SOURCE_ID')))
  assert.ok(errors.some((e)=>e.startsWith('DUPLICATE_OR_MISSING_ASSET_ID')))
  assert.ok(errors.includes('INVALID_ASSET_CHECKSUM:a'))
  assert.ok(errors.includes('ASSET_DEPENDENCY_MISSING:a:missing'))
  assert.ok(errors.includes('REFERENCE_ONLY_SOURCE_PROMOTED:a:ref'))
})

test('reference authority fails closed by intended use instead of treating public visibility as reuse permission', () => {
  const source={sourceId:'archive',authority:'reference-only',permissions:permissions({referenceOnly:true,attributionRequired:true})}
  assert.equal(decideReferenceUse(source,'research-reference').allowed,true)
  const production=decideReferenceUse(source,'production-runtime')
  assert.equal(production.allowed,false)
  assert.ok(production.reasons.includes('REFERENCE_ONLY_SOURCE'))
  assert.equal(production.attributionRequired,true)
})

test('event grammar uses only declared primitives and cultural composites require explicit context', () => {
  const allowed=new Set(MEMORY_WORLD_EVENT_PRIMITIVES)
  assert.ok(allowed.size>=28)
  for(const event of MEMORY_WORLD_COMPOSITE_EVENTS){
    assert.deepEqual(validateCompositeEvent(event),[])
    for(const primitive of event.primitives) assert.ok(allowed.has(primitive))
    if(event.culturalParametersRequired) assert.equal(event.requiresExplicitContext,true)
  }
})

test('all 25 QA worlds are governed reference packages rather than falsely promoted production scenes', () => {
  assert.equal(packages.worlds.length,25)
  for(const world of packages.worlds){
    assert.equal(world.status,'reference')
    assert.equal(world.productionReady,false)
    assert.ok(world.localityScope)
    assert.ok(world.referenceRequirements.length>=8)
    assert.ok(world.knownUnknowns.length>0)
    assert.deepEqual(world.sourceReferenceIds,[])
  }
})

test('runtime documentation states source, template and certification boundaries', () => {
  const content=fs.readFileSync(new URL('../../docs/MEMORY_WORLD_RUNTIME_V1.md',import.meta.url),'utf8')
  assert.match(content,/T4 CONTEXT_TEMPLATE/)
  assert.match(content,/Gaussian splat maps to T2 SPATIALLY_RECONSTRUCTED/)
  assert.match(content,/does not claim/)
  assert.match(content,/25 QA worlds/)
})
