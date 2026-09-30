import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
import { buildNamedExplicitDemoMemory } from '../src/spatial/memory/explicitDemoMemory.ts'
import { buildBoundedTemplateMemoryWorld, selectBoundedTemplateArchetype } from '../src/spatial/memory-world/templateWorld.ts'
import { buildMemoryWorldRuntimePlan } from '../src/spatial/memory-world/runtimePlan.ts'
import { memoryWorldReplayHref } from '../src/spatial/memory-world/memoryWorldReplay.ts'
import { capturedRealityMemoryWorldLayer, memoryTruthFromCapturedReality } from '../src/spatial/memory-world/capturedRealityAdapter.ts'

test('bounded template world never promotes contextual geometry to autobiography', () => {
  const memory = buildNamedExplicitDemoMemory('demo:quiet-reset')
  const world = buildBoundedTemplateMemoryWorld(memory, '0123456789012345678901234567890123456789')
  assert.equal(world.governance.privateByDefault, true)
  assert.ok(world.layers.some((layer) => layer.truthClass === 'T4_CONTEXT_TEMPLATE'))
  assert.ok(world.layers.every((layer) => layer.autobiographical === false))
  assert.match(buildMemoryWorldRuntimePlan(world).truthLabel, /not recorded history/i)
})

test('unrecognized place context resolves to neutral threshold rather than fabricated culture or location', () => {
  const memory = buildNamedExplicitDemoMemory('demo:unknown-context')
  assert.equal(selectBoundedTemplateArchetype({...memory, title:'Unspecified memory', place:{label:'Somewhere'}}), 'scene:everydayTransitional:hallway-transition')
})

test('runtime plan supplies canonical system layers and bounded navigation', () => {
  const world = buildBoundedTemplateMemoryWorld(buildNamedExplicitDemoMemory('demo:runtime'))
  const plan = buildMemoryWorldRuntimePlan(world)
  assert.equal(plan.valid, true)
  assert.equal(plan.navigation, 'bounded-orbit')
  for (const kind of ['world-coordinates','lighting','accessibility','semantic-metadata','provenance','truth','interaction-navigation','runtime-optimization']) {
    assert.ok(plan.layers.some((layer) => layer.kind === kind), kind)
  }
})

test('captured reality adapter preserves reconstruction truth and does not turn a splat into source capture', () => {
  const asset = {
    schemaVersion:'urai-captured-reality-1', id:'capture-1', label:'Room', ownerId:'owner', anchorEntityId:'room-1',
    truthClass:'spatially-reconstructable', sourceIds:['source-1'], sourceEvidence:[{sourceId:'source-1',sourceType:'video'}],
    reconstruction:{method:'3dgs',inputFormats:['video'],runtime:{artifactId:'runtime-1',format:'splat',delivery:'server-authorized'},collisionProxy:{artifactId:'collision-1',format:'glb'}},
    privacy:{visibility:'private',requiredPurposes:['location.context'],exactLocationEmbedded:false,thirdPartyPresent:false,biometricOrLikenessPresent:false},
    qa:{sourceVsReconstructionReviewed:true,heldOutViewCount:4,knownArtifactCount:0,reviewState:'accepted'},
    provenance:{transformations:['frames','3dgs'],toolchain:['test'],userCorrectionRevision:0,createdAt:'2026-09-30T00:00:00Z',mustShowTruthLabel:true},
    release:{state:'private-beta',browserCertified:true,mobileCertified:false,xrCertified:false},
  }
  const decision={mode:'gaussian-splat',reasons:[],truthLabel:'Spatial reconstruction from recorded sources',assetUrl:'https://example.invalid/a.splat',fallbackMeshArtifactId:null,collisionArtifactId:'collision-1',allowedSourceIds:['source-1'],autobiographical:true}
  assert.equal(memoryTruthFromCapturedReality(asset), 'T2_SPATIALLY_RECONSTRUCTED')
  const layer=capturedRealityMemoryWorldLayer(asset,decision)
  assert.deepEqual(layer.representation,['gaussian-splat'])
  assert.equal(layer.truthClass,'T2_SPATIALLY_RECONSTRUCTED')
  assert.equal(layer.autobiographical,true)
  assert.ok(layer.notes.includes('collision:collision-1'))
})

test('Replay Memory World href preserves selected identity and disclosed demo state', () => {
  const memory=buildNamedExplicitDemoMemory('demo:quiet-reset')
  const href=memoryWorldReplayHref(memory)
  const url=new URL(href,'https://example.test')
  assert.equal(url.pathname,'/spatial/memory-world')
  assert.equal(url.searchParams.get('memoryId'),memory.id)
  assert.equal(url.searchParams.get('manifestId'),memory.replayManifest.id)
  assert.equal(url.searchParams.get('returnNode'),memory.star.id)
  assert.equal(url.searchParams.get('demo'),'1')
})

test('runtime source mounts actual Canvas and Replay uses captured-place-first Memory World fallback', () => {
  const runtime=fs.readFileSync(new URL('../src/spatial/memory-world/MemoryWorldRuntime.tsx',import.meta.url),'utf8')
  const replay=fs.readFileSync(new URL('../src/app/replay/CinematicReplayClient.tsx',import.meta.url),'utf8')
  assert.match(runtime, /<Canvas/)
  assert.match(runtime, /Context template/)
  assert.match(runtime, /Truth & provenance/)
  assert.match(runtime, /enablePan=\{false\}/)
  assert.match(replay, /memoryWorldReplayHref/)
  assert.match(replay, /capturedRealityEntry\?\.href \?\? memoryWorldHref/)
  assert.match(replay, /Enter Memory World/)
})
