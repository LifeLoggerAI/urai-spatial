import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import assert from 'node:assert/strict'

const root = process.cwd()
const realmPath = path.join(root, 'src/spatial/council/CouncilRealm.tsx')
const presencePath = path.join(root, 'src/spatial/components/PresenceRig.tsx')
const schemaPath = path.join(root, 'src/spatial/council/councilAgentSchema.ts')
const source = fs.readFileSync(realmPath, 'utf8')
const presenceSource = fs.readFileSync(presencePath, 'utf8')
const schemaSource = fs.readFileSync(schemaPath, 'utf8')

const councilModels = [
  'council-guide-human-rigged-v3.glb',
  'council-archivist-human-rigged-v3.glb',
  'council-guardian-human-rigged-v3.glb',
  'council-builder-human-rigged-v3.glb',
  'council-mirror-human-rigged-v3.glb',
  'council-trickster-human-rigged-v3.glb',
]
const homeModel = 'home-human-rigged-v3.glb'

function assertRuntimeAsset(filename) {
  const asset = path.join(root, 'public/assets/urai/generated/human-rig-v3', filename)
  assert.ok(fs.existsSync(asset), `${filename} must exist as a committed runtime GLB`)
  assert.ok(fs.statSync(asset).size > 1_000_000, `${filename} must be a real binary model, not a placeholder`)
}

test('Council uses all six committed skinned V3 human models', () => {
  for (const filename of councilModels) {
    assert.match(source, new RegExp(filename.replaceAll('.', '\\.')))
    assertRuntimeAsset(filename)
  }
  for (const id of ['council-builder', 'council-mirror', 'council-trickster']) {
    assert.match(schemaSource, new RegExp(id))
  }
  assert.match(source, /useAnimations\(/)
  assert.match(source, /idle_breath/)
  assert.match(source, /listen_acknowledge/)
  assert.match(source, /skinned-animated-human-v3/)
})

test('Home consumes the seventh rigged V3 human under canonical Home lighting', () => {
  assertRuntimeAsset(homeModel)
  assert.match(presenceSource, /home-human-rigged-v3\.glb/)
  assert.match(presenceSource, /useAnimations\(/)
  assert.match(presenceSource, /idle_breath/)
  assert.match(presenceSource, /castShadow/)
  assert.match(presenceSource, /receiveShadow/)
  assert.match(presenceSource, /skinned-animated-home-human-v3/)
  assert.match(presenceSource, /canonical-home-physical/)
})

test('Council keeps physical lighting and shadow response', () => {
  assert.match(source, /<Canvas shadows/)
  assert.match(source, /castShadow/)
  assert.match(source, /receiveShadow/)
  assert.match(source, /shadow-mapSize-width=\{2048\}/)
  assert.match(source, /<directionalLight/)
  assert.match(source, /<pointLight/)
  assert.match(source, /<Environment preset="apartment"/)
  assert.match(source, /<ContactShadows/)
  assert.match(source, /physical-pbr-v1/)
})
