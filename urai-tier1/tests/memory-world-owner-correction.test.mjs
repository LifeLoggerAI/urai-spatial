import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
import { buildNamedExplicitDemoMemory } from '../src/spatial/memory/explicitDemoMemory.ts'
import { buildBoundedTemplateMemoryWorld } from '../src/spatial/memory-world/templateWorld.ts'
import { applyMemoryWorldOwnerCorrection } from '../src/spatial/memory-world/ownerCorrectionAuthority.ts'

test('owner correction becomes structured T3 authority, increments revision, and invalidates verification', () => {
  const world=buildBoundedTemplateMemoryWorld(buildNamedExplicitDemoMemory('demo:correction'))
  const corrected=applyMemoryWorldOwnerCorrection(world,{
    correctionId:'c1',
    targetSemanticTag:'surface:wall',
    action:'replace',
    value:'blue painted wall',
    confirmedAt:'2026-09-30T21:00:00.000Z',
    sourceId:'owner-statement:c1',
  })
  assert.equal(corrected.provenance.userCorrectionRevision,world.provenance.userCorrectionRevision+1)
  assert.equal(corrected.release.state,'draft')
  assert.equal(corrected.release.desktopVerified,false)
  assert.equal(corrected.release.mobileVerified,false)
  const layer=corrected.layers.find((candidate)=>candidate.id==='layer:owner-correction:c1')
  assert.equal(layer?.truthClass,'T3_EVIDENCE_INFERRED')
  assert.equal(layer?.autobiographical,true)
  assert.equal(layer?.visible,false)
  assert.equal(corrected.sourceRegistry['owner-statement:c1'].authority,'user-owned')
  assert.equal(corrected.assetRegistry['owner-correction:c1'].metadata?.targetSemanticTag,'surface:wall')
})

test('latest correction for the same semantic target replaces the active correction layer without deleting history assets', () => {
  const world=buildBoundedTemplateMemoryWorld(buildNamedExplicitDemoMemory('demo:correction-history'))
  const first=applyMemoryWorldOwnerCorrection(world,{correctionId:'c1',targetSemanticTag:'seating:sofa',action:'describe',value:'green sofa',confirmedAt:'2026-09-30T21:00:00.000Z',sourceId:'owner-statement:c1'})
  const second=applyMemoryWorldOwnerCorrection(first,{correctionId:'c2',targetSemanticTag:'seating:sofa',action:'replace',value:'blue loveseat',confirmedAt:'2026-09-30T21:01:00.000Z',sourceId:'owner-statement:c2'})
  assert.equal(second.layers.filter((layer)=>layer.kind==='personal-memory-overlay' && layer.notes?.includes('target:seating:sofa')).length,1)
  assert.ok(second.assetRegistry['owner-correction:c1'])
  assert.ok(second.assetRegistry['owner-correction:c2'])
})

test('Memory World authoring reuses authenticated Replay correction transport and exposes guided capture privacy checks', () => {
  const source=fs.readFileSync(new URL('../src/spatial/memory-world/MemoryWorldAuthoringTools.tsx',import.meta.url),'utf8')
  const route=fs.readFileSync(new URL('../src/app/spatial/memory-world/MemoryWorldRouteClient.tsx',import.meta.url),'utf8')
  assert.match(source,/createAuthenticatedReplayTransport/)
  assert.match(source,/reason: 'memory-world-owner-correction'/)
  assert.match(source,/applyMemoryWorldOwnerCorrection/)
  assert.match(source,/GUIDED_CAPTURE_PROFILES/)
  assert.match(source,/does not upload private media/)
  assert.match(route,/MemoryWorldAuthoringTools/)
  assert.match(route,/onWorldChange=\{setWorld\}/)
})
