import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const schema = JSON.parse(readFileSync(new URL('../docs/contracts/URAI_ECOSYSTEM_SCHEMA_V1.json', import.meta.url), 'utf8'))

test('ecosystem V1 schema retains canonical URAI identity and all entities', () => {
  assert.equal(schema.$id, 'urai://contracts/ecosystem-schema-v1')
  assert.equal(schema.$schema, 'https://json-schema.org/draft/2020-12/schema')
  const required=['users','memories','emotionalFields','lifeMapNodes','generatedAssets','spatialScenes','jobs','contentPacks','b2bAccounts','xrSceneObjects']
  assert.deepEqual(schema.required,required)
  for (const key of required) {
    assert.equal(schema.properties[key].type,'array')
    assert.match(schema.properties[key].items.$ref,/^#\/\$defs\//)
  }
})

test('RuAi and Spatial V1 record type bounds remain explicit rather than shallow arrays', () => {
  assert.deepEqual(schema.$defs.b2bAccount.required,['id','name','status','createdAt'])
  assert.deepEqual(schema.$defs.b2bAccount.properties.status.enum,['lead','active','paused','closed'])
  assert.deepEqual(schema.$defs.job.properties.status.enum,['PENDING','LEASED','RUNNING','SUCCESS','FAILED','DEAD','CANCELLED'])
  assert.equal(schema.$defs.emotionalField.properties.valence.minimum,-1)
  assert.equal(schema.$defs.emotionalField.properties.valence.maximum,1)
  assert.equal(schema.$defs.emotionalField.properties.intensity.minimum,0)
  assert.equal(schema.$defs.emotionalField.properties.intensity.maximum,1)
  assert.equal(schema.$defs.generatedAsset.properties.status.enum.includes('published'),true)
  assert.equal(schema.$defs.xrSceneObject.properties.transform.required.includes('scale'),true)
})

test('all declared nested references resolve within the shipped schema', () => {
  const refs=[]
  const visit=(x)=>{
    if(Array.isArray(x))return x.forEach(visit)
    if(!x||typeof x!=='object')return
    if(typeof x.$ref==='string')refs.push(x.$ref)
    Object.values(x).forEach(visit)
  }
  visit(schema)
  for(const ref of refs) {
    assert.ok(ref.startsWith('#/$defs/'),`unexpected external ref ${ref}`)
    assert.ok(Object.hasOwn(schema.$defs,ref.slice('#/$defs/'.length)),`unresolved ref ${ref}`)
  }
})
