import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const functionsSource=fs.readFileSync(new URL('../../apps/functions/src/lifeModelFunctions.ts',import.meta.url),'utf8')
const core=fs.readFileSync(new URL('../src/spatial/life-model/lifeModel.ts',import.meta.url),'utf8')
const privacy=fs.readFileSync(new URL('../../apps/functions/src/privacyOperations.ts',import.meta.url),'utf8')

test('Life Causal Graph has first-class evidence-backed non-synthetic edges',()=>{
  assert.match(core,/export type LifeCausalEdge/)
  assert.match(functionsSource,/upsertLifeCausalEdge/)
  assert.match(functionsSource,/SYNTHETIC_OUTPUT_CANNOT_ENTER_LIFE_CAUSAL_GRAPH/)
  assert.match(functionsSource,/Causal edges require source IDs/)
})

test('graph snapshot compiles exact entity, claim and edge dependencies with a stable hash',()=>{
  assert.match(functionsSource,/compileLifeCausalGraphSnapshot/)
  assert.match(functionsSource,/lifeGraphSnapshots/)
  assert.match(functionsSource,/graphHash = stableDigest/)
  assert.match(functionsSource,/syntheticOutputMayBecomeHistoricalSource: false/)
})

test('SceneTruth cannot compile outside a current canonical Life Causal Graph snapshot',()=>{
  assert.match(functionsSource,/graphSnapshotId/)
  assert.match(functionsSource,/Current Life Causal Graph snapshot is required/)
  assert.match(functionsSource,/dependencyIds\.add\(String\(dependency\)\)/)
})

test('causal graph data is portable and deletable',()=>{
  assert.match(privacy,/lifeCausalEdges/)
  assert.match(privacy,/lifeGraphSnapshots/)
})
