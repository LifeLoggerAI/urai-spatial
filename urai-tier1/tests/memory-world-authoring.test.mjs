import assert from 'node:assert/strict'
import test from 'node:test'
import { MEMORY_WORLD_ERA_PACKS, memoryWorldEraPack } from '../src/spatial/memory-world/eraPacks.ts'
import { GUIDED_CAPTURE_PROFILES } from '../src/spatial/memory-world/guidedCapture.ts'
import { applyMemoryWorldCorrection } from '../src/spatial/memory-world/userCorrection.ts'
import { assembleMemoryWorld } from '../src/spatial/memory-world/assembleMemoryWorld.ts'

test('era system contains pre-1900 plus every decade pack through the 2020s', () => {
  assert.equal(MEMORY_WORLD_ERA_PACKS.length, 14)
  assert.equal(memoryWorldEraPack('era:1990s')?.label, '1990s')
  assert.equal(memoryWorldEraPack('era:2020s')?.endsAt, '2029-12-31')
  for (const pack of MEMORY_WORLD_ERA_PACKS) assert.equal(pack.requiredDimensions.length, 15)
})

test('guided capture has explicit profiles for every required capture family', () => {
  const required = ['small-room','large-room','multi-room-home','building-exterior','yard','street','large-outdoor','vehicle-interior','object','furniture','person','archival-photo-reconstruction']
  for (const id of required) {
    const profile = GUIDED_CAPTURE_PROFILES[id]
    assert.ok(profile, id)
    assert.ok(profile.requiredPasses.length > 0)
    assert.ok(profile.qualityChecks.length > 0)
    assert.ok(profile.privacyChecks.length > 0)
  }
  assert.equal(GUIDED_CAPTURE_PROFILES.person.dynamicSubjectPolicy, 'motion-required')
  assert.ok(GUIDED_CAPTURE_PROFILES['multi-room-home'].privacyChecks.includes('family-media'))
})

test('user correction replaces matching semantic layer, increments provenance revision, and invalidates certification', () => {
  const sourceRegistry = {
    'statement-1': {
      sourceId:'statement-1', authority:'user-owned', permissions:{
        referenceOnly:false, trainingPermitted:null, derivativeWorkPermitted:true, productionAssetPermitted:true,
        commercialUsePermitted:null, redistributionPermitted:false, attributionRequired:false, reviewRequired:false,
      },
    },
  }
  const assetRegistry = {
    'template-wall': { assetId:'template-wall', assetType:'material', name:'Template wall', version:'1', semanticTags:['wall-color'], representation:['mesh'], truthClass:'T4_CONTEXT_TEMPLATE', confidence:.6, sourceIds:[], dependencies:[], status:'silver' },
    'blue-wall': { assetId:'blue-wall', assetType:'material', name:'User-confirmed blue wall', version:'1', semanticTags:['wall-color'], representation:['mesh'], truthClass:'T3_EVIDENCE_INFERRED', confidence:1, sourceIds:['statement-1'], dependencies:[], status:'silver' },
  }
  const base = assembleMemoryWorld({
    worldId:'w', ownerId:'o', archetypeId:'scene:residential:kitchen', label:'Kitchen',
    context:{culturalContext:[],languages:['en']}, sourceRegistry, assetRegistry,
    templateAssetIds:['template-wall'], evidence:[], createdAt:'2026-09-30T00:00:00Z',
  })
  const verified = {...base, release:{state:'private-beta',desktopVerified:true,mobileVerified:true,xrVerified:false}}
  const corrected = applyMemoryWorldCorrection(verified, {
    correctionId:'c1', targetSemanticTag:'wall-color', replacementAssetId:'blue-wall', sourceId:'statement-1', confirmedAt:'2026-09-30T20:00:00Z',
  })
  assert.deepEqual(corrected.layers.flatMap((layer) => layer.assetIds), ['blue-wall'])
  assert.equal(corrected.provenance.userCorrectionRevision, 1)
  assert.equal(corrected.release.state, 'draft')
  assert.equal(corrected.release.desktopVerified, false)
  assert.equal(corrected.release.mobileVerified, false)
})

test('user correction refuses non-user authority and non-evidentiary replacements', () => {
  const world = assembleMemoryWorld({
    worldId:'w2', ownerId:'o', archetypeId:'scene:residential:kitchen', label:'Kitchen',
    context:{culturalContext:[],languages:['en']},
    sourceRegistry:{
      ref:{sourceId:'ref',authority:'reference-only',permissions:{referenceOnly:true,trainingPermitted:null,derivativeWorkPermitted:null,productionAssetPermitted:false,commercialUsePermitted:null,redistributionPermitted:null,attributionRequired:null,reviewRequired:true}},
    },
    assetRegistry:{
      x:{assetId:'x',assetType:'material',name:'x',version:'1',semanticTags:['wall-color'],representation:['mesh'],truthClass:'T4_CONTEXT_TEMPLATE',confidence:.5,sourceIds:['ref'],dependencies:[],status:'reference'},
    },
    templateAssetIds:['x'], evidence:[], createdAt:'2026-09-30T00:00:00Z',
  })
  assert.throws(() => applyMemoryWorldCorrection(world,{correctionId:'bad',targetSemanticTag:'wall-color',replacementAssetId:'x',sourceId:'ref',confirmedAt:'2026-09-30T20:00:00Z'}), /CORRECTION_SOURCE_NOT_USER_AUTHORITY/)
})
