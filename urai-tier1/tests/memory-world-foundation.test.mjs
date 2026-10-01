import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
import {
  FOUNDATIONAL_ARCHETYPE_COUNT,
  FOUNDATIONAL_ARCHETYPE_TARGET_RANGE,
  FOUNDATIONAL_SCENE_ARCHETYPES,
  MEMORY_WORLD_LIBRARY_TARGETS,
} from '../src/spatial/memory-world/sceneOntology.ts'
import { assembleMemoryWorld, chooseEvidenceWinner } from '../src/spatial/memory-world/assembleMemoryWorld.ts'
import { validateMemoryWorld } from '../src/spatial/memory-world/memoryWorld.ts'

const qa = JSON.parse(fs.readFileSync(new URL('../../operations/memory-world/reference-worlds-v1.json', import.meta.url), 'utf8'))

test('foundational ontology stays inside the declared 300-350 launch design range', () => {
  assert.equal(FOUNDATIONAL_ARCHETYPE_COUNT, 324)
  assert.ok(FOUNDATIONAL_ARCHETYPE_COUNT >= FOUNDATIONAL_ARCHETYPE_TARGET_RANGE.minimum)
  assert.ok(FOUNDATIONAL_ARCHETYPE_COUNT <= FOUNDATIONAL_ARCHETYPE_TARGET_RANGE.maximum)
  assert.equal(MEMORY_WORLD_LIBRARY_TARGETS.mature.sceneArchetypes, 324)
  assert.equal(new Set(FOUNDATIONAL_SCENE_ARCHETYPES.map((scene) => scene.id)).size, FOUNDATIONAL_ARCHETYPE_COUNT)
})

test('ontology avoids crude continent or socioeconomic stereotypes in identifiers', () => {
  const joined = FOUNDATIONAL_SCENE_ARCHETYPES.map((scene) => scene.id).join('\n').toLowerCase()
  for (const forbidden of ['africanhouse','asianvillage','poorneighborhood','indianwedding']) assert.doesNotMatch(joined, new RegExp(forbidden))
})

test('personal captured evidence deterministically outranks template and generated fill', () => {
  const winner = chooseEvidenceWinner([
    { candidateId:'template', targetSemanticTag:'wall', assetId:'template-wall', sourceIds:[], truthClass:'T4_CONTEXT_TEMPLATE', confidence:1, userConfirmed:false, captured:false },
    { candidateId:'generated', targetSemanticTag:'wall', assetId:'generated-wall', sourceIds:[], truthClass:'T5_GENERATED_FILL', confidence:1, userConfirmed:false, captured:false },
    { candidateId:'capture', targetSemanticTag:'wall', assetId:'captured-wall', sourceIds:['photo-1'], truthClass:'T1_SOURCE_DERIVED', confidence:.7, userConfirmed:false, captured:true },
  ])
  assert.equal(winner?.candidateId, 'capture')
})

test('assembly replaces matching template semantics with stronger personal evidence', () => {
  const sourceRegistry = {
    'photo-1': {
      sourceId:'photo-1', authority:'user-owned', permissions:{
        referenceOnly:false, trainingPermitted:true, derivativeWorkPermitted:true, productionAssetPermitted:true,
        commercialUsePermitted:null, redistributionPermitted:false, attributionRequired:false, reviewRequired:false,
      },
    },
  }
  const assetRegistry = {
    'template-wall': { assetId:'template-wall', assetType:'material', name:'Template wall', version:'1', semanticTags:['wall'], representation:['mesh'], truthClass:'T4_CONTEXT_TEMPLATE', confidence:1, sourceIds:[], dependencies:[], status:'silver' },
    'captured-wall': { assetId:'captured-wall', assetType:'material', name:'Captured wall', version:'1', semanticTags:['wall'], representation:['mesh'], truthClass:'T1_SOURCE_DERIVED', confidence:.9, sourceIds:['photo-1'], dependencies:[], status:'silver' },
  }
  const world = assembleMemoryWorld({
    worldId:'world-1', ownerId:'owner-1', archetypeId:'scene:residential:kitchen', label:'Kitchen',
    context:{ culturalContext:[], languages:['en'] }, sourceRegistry, assetRegistry,
    templateAssetIds:['template-wall'],
    evidence:[{ candidateId:'capture', targetSemanticTag:'wall', assetId:'captured-wall', sourceIds:['photo-1'], truthClass:'T1_SOURCE_DERIVED', confidence:.9, userConfirmed:false, captured:true }],
    createdAt:'2026-09-30T00:00:00Z',
  })
  assert.deepEqual(world.layers.flatMap((layer) => layer.assetIds), ['captured-wall'])
  assert.equal(world.governance.privateByDefault, true)
  assert.equal(world.release.state, 'draft')
})

test('gaussian reconstruction cannot be mislabeled as raw source capture', () => {
  const world = assembleMemoryWorld({
    worldId:'world-2', ownerId:'owner-1', archetypeId:'scene:residential:kitchen', label:'Kitchen',
    context:{ culturalContext:[], languages:['en'] }, sourceRegistry:{}, assetRegistry:{}, templateAssetIds:[], evidence:[], createdAt:'2026-09-30T00:00:00Z',
  })
  const candidate = {
    ...world,
    provenance:{...world.provenance, sourceLineageComplete:true},
    layers:[{id:'bad-splat', kind:'captured-reality', truthClass:'T0_SOURCE_CAPTURED', sourceIds:[], assetIds:[], representation:['gaussian-splat'], confidence:1, visible:true, autobiographical:true}],
  }
  assert.ok(validateMemoryWorld(candidate).includes('GAUSSIAN_SPLAT_CANNOT_BE_T0_SOURCE_CAPTURED:bad-splat'))
})

test('sensitive cultural assets escalate to cultural review instead of silently passing', () => {
  const sourceRegistry = {}
  const assetRegistry = {
    sacred: {
      assetId:'sacred', assetType:'scene', name:'Sensitive sacred context', version:'1', semanticTags:['sacred'],
      representation:['mesh'], truthClass:'T4_CONTEXT_TEMPLATE', confidence:.8, sourceIds:[], dependencies:[], status:'reference',
      sensitivity:{culturalAuthorityRequired:true, sacredContext:true},
    },
  }
  const world = assembleMemoryWorld({
    worldId:'world-3', ownerId:'owner-1', archetypeId:'scene:spiritual:temple-or-shrine', label:'Sensitive context',
    context:{culturalContext:['explicit-user-context'],languages:[]}, sourceRegistry, assetRegistry, templateAssetIds:['sacred'], evidence:[], createdAt:'2026-09-30T00:00:00Z',
  })
  assert.equal(world.governance.culturalReviewRequired, true)
  assert.equal(world.governance.culturalReviewState, 'pending')
  assert.ok(validateMemoryWorld({...world, provenance:{...world.provenance, sourceLineageComplete:true}}).includes('CULTURAL_REVIEW_REQUIRED'))
})

test('QA corpus contains 25 deliberately diverse validation worlds and every archetype exists', () => {
  assert.equal(qa.worlds.length, 25)
  const ids = new Set(FOUNDATIONAL_SCENE_ARCHETYPES.map((scene) => scene.id))
  for (const world of qa.worlds) assert.ok(ids.has(world.archetypeId), world.archetypeId)
})
