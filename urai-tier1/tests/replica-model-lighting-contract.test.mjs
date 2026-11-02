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
  'council-guide-human-makehuman-v4.glb',
  'council-archivist-human-makehuman-v4.glb',
  'council-guardian-human-makehuman-v4.glb',
  'council-builder-human-makehuman-v4.glb',
  'council-mirror-human-makehuman-v4.glb',
  'council-trickster-human-makehuman-v4.glb',
]
const homeModel = 'home-human-makehuman-v4.glb'

function assertRuntimeAsset(filename) {
  const asset = path.join(root, 'public/assets/urai/generated/human-makehuman-v4', filename)
  assert.ok(fs.existsSync(asset), `${filename} must exist as a committed runtime GLB`)
  const bytes = fs.readFileSync(asset)
  assert.ok(bytes.length > 1_000_000, `${filename} must be a real binary model, not a placeholder`)
  assert.equal(bytes.readUInt32LE(0), 0x46546c67)
  assert.equal(bytes.readUInt32LE(4), 2)
  assert.equal(bytes.readUInt32LE(8), bytes.length)
  const document = JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)).toString())
  assert.ok(document.skins.some(skin => skin.joints.length > 0), 'actual skin joints required')
  for (const name of ['idle_breath', 'listen_acknowledge']) {
    assert.ok(document.animations.some(clip => clip.name === name && clip.channels.length > 0), name)
  }
}

test('Council uses all six committed skinned V4 preview human models', () => {
  for (const filename of councilModels) {
    assert.match(source, new RegExp(filename.replaceAll('.', '\\.')))
    assertRuntimeAsset(filename)
  }
  for (const id of ['council-builder', 'council-mirror', 'council-trickster']) {
    assert.match(schemaSource, new RegExp(id))
  }
  assert.match(source, /useAnimations\(/)
  const animationLayers = fs.readFileSync(path.join(root, 'src/spatial/council/CouncilAnimationLayers.ts'), 'utf8')
  assert.match(source, /playCouncilBodyIdle\(actions, reducedMotion\)/)
  assert.match(source, /playCouncilListening\(actions, selected, reducedMotion\)/)
  assert.match(animationLayers, /idle_breath/)
  assert.match(animationLayers, /listen_acknowledge/)
  assert.match(source, /skinned-animated-human-v4-preview/)
})

test('Home consumes the seventh V4 preview human under canonical Home lighting', () => {
  assertRuntimeAsset(homeModel)
  assert.match(presenceSource, /home-human-makehuman-v4\.glb/)
  assert.match(presenceSource, /useAnimations\(/)
  assert.match(presenceSource, /idle_breath/)
  assert.match(presenceSource, /castShadow/)
  assert.match(presenceSource, /receiveShadow/)
  assert.match(presenceSource, /skinned-animated-home-human-v4-preview/)
  assert.match(presenceSource, /canonical-home-physical/)
})

test('Council keeps physical lighting and shadow response', () => {
  assert.match(source, /<Canvas\s+shadows=\{quality\.shadows\}/)
  assert.match(source, /castShadow/)
  assert.match(source, /receiveShadow/)
  assert.match(source, /shadow-mapSize-width=\{shadowMapSize\}/)
  assert.match(source, /<directionalLight/)
  assert.match(source, /<pointLight/)
  assert.match(source, /const shadowMapSize = quality\.tier === 'high' \? 2048 : 1024/)
  assert.match(source, /<Environment resolution=\{128\} environmentIntensity=\{environmentIntensity\}/)
  assert.match(source, /<Lightformer/)
  assert.match(source, /<ContactShadows/)
  assert.match(source, /physical-pbr-v1/)
})
